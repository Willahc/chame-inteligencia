# -*- coding: utf-8 -*-
"""
scripts/fetch_detran_frota.py

Alvo B — frota ativa do Detran-SP (dados abertos do Estado de Sao Paulo).

Baixa o CSV mensal "Frota Ativa" do conjunto frota-ativa e gera uma tabela
agregada por municipio (645 municipios de SP) com a frota total, automoveis e
motocicletas, anotada com a mesorregiao do IBGE (metropolitana = territorio de
interesse de expansao da marca).

Limitacao registrada: a base aberta do Detran nao expoe a categoria de servico
TAXI (as categorias sao PARTICULAR/ALUGUEL/OFICIAL/APRENDIZAGEM etc.), logo o
servico e' medido pela serie de licencas do SGTP (fetch_smt_open_data.py) e a
frota entra apenas como dimensionamento de mercado por municipio.

O bruto (~355 MB por mes) fica em data/raw/detran/ (gitignorado) e o resumo
agregado (~70 KB) e' versionado em data/processed/.

Uso:
  python scripts/fetch_detran_frota.py            # baixa (se preciso) e agrega
  python scripts/fetch_detran_frota.py --dry-run   # so' mostra o plano
  python scripts/fetch_detran_frota.py --agora     # rebaixa mesmo com arquivo local
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "detran"
PROC = ROOT / "data" / "processed"
LOGS = ROOT / "logs"

BRT = timezone(timedelta(hours=-3))
USER_AGENT = "Mapeamento-TaxiSP/1.0 (projeto de dados abertos; contato: local)"
CKAN = "https://dadosabertos.sp.gov.br/api/3/action/package_show"
IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios"

SAO_PAULO_IBGE = 3550308

# Grafias do Detran que nao batem com o nome oficial do IBGE (7 de 645).
ALIASES = {
    "APARECIDA DO OESTE": "APARECIDA D OESTE",
    "BOM SUCESSO DO ITARARE": "BOM SUCESSO DE ITARARE",
    "GUARANI DO OESTE": "GUARANI D OESTE",
    "LUISIANIA": "LUIZIANIA",
    "SANTA BARBARA DO OESTE": "SANTA BARBARA D OESTE",
    "SANTO ANTONIO ARACANGUA": "SANTO ANTONIO DO ARACANGUA",
    "SAO LUIS DO PARAITINGA": "SAO LUIZ DO PARAITINGA",
}


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def latest_resource() -> dict:
    r = requests.get(CKAN, params={"id": "frota-ativa"},
                     headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    res = r.json()["result"]["resources"]
    csvs = [x for x in res if (x.get("format") or "").upper() == "CSV"]
    if not csvs:
        raise SystemExit("nenhum recurso CSV no conjunto frota-ativa")
    return csvs[-1]


def period_from_name(name: str) -> str:
    # "Frota Ativa - Agosto de 2026" -> "2026-08"
    meses = {"janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
             "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
             "outubro": 10, "novembro": 11, "dezembro": 12}
    low = name.lower()
    ano = None
    for tok in low.replace("-", " ").split():
        if tok.isdigit() and len(tok) == 4:
            ano = int(tok)
    for key, num in meses.items():
        if key in low:
            return f"{ano or 0:04d}-{num:02d}"
    raise SystemExit(f"nao consegui extrair o periodo de {name!r}")


def download(url: str, dest: Path) -> int:
    """Baixa via curl.exe (cadeia do Windows, revogacao desligada) ou requests."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if curl:
        p = subprocess.run(
            [curl, "-sS", "-L", "--ssl-no-revoke", "--max-time", "1200",
             "-o", str(dest), "-w", "%{http_code}", "-A", USER_AGENT, url],
            capture_output=True, text=True, timeout=1300)
        if p.returncode == 0 and dest.exists() and dest.stat().st_size > 0:
            return int(p.stdout.strip() or 200)
        print(f"[aviso] curl falhou ({p.stderr.strip()[:200]}); usando requests")
    import urllib3
    urllib3.disable_warnings()
    r = requests.get(url, headers={"User-Agent": USER_AGENT},
                     timeout=(30, 900), verify=False)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return r.status_code


def mesorregioes_ibge() -> dict[str, tuple[int, str, str]]:
    """Retorna nome_sem_acento -> (id IBGE, nome oficial, mesorregiao).

    O Detran usa ID_MUNICIPIO proprio (7107 = Sao Paulo), nao o codigo IBGE,
    entao o casamento e' feito pelo nome sem acento/maiusculas.
    """
    r = requests.get(IBGE, headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    by_name: dict[str, tuple[int, str, str]] = {}
    for m in r.json():
        meso = ((m.get("microrregiao") or {}).get("mesorregiao") or {}).get("nome", "")
        by_name[sem_acento(m["nome"])] = (m["id"], m["nome"], meso)
    return by_name


def sem_acento(texto: str) -> str:
    """Normaliza nome de municipio para casamento Detran <-> IBGE."""
    texto = "".join(c for c in unicodedata.normalize("NFKD", texto)
                    if not unicodedata.combining(c))
    texto = re.sub(r"[^A-Za-z0-9]+", " ", texto).upper()
    return " ".join(texto.split())


def agregar(src: Path, periodo: str) -> Path:
    """Agrega o CSV bruto (uma linha por combo municipio/categoria/tipo/...)."""
    by_name = mesorregioes_ibge()
    acc: dict[str, dict] = {}
    nao_casados: set[str] = set()
    with src.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            nome = row["NOME_MUNICIPIO"]
            key = ALIASES.get(sem_acento(nome), sem_acento(nome))
            ibge_id, nome_ibge, meso = by_name.get(key, (0, nome, ""))
            if key not in by_name:
                nao_casados.add(nome)
            bucket = acc.setdefault(key, {
                "nome": nome_ibge, "id_ibge": ibge_id, "mesorregiao": meso,
                "total": 0, "automovel": 0, "motocicleta": 0, "onibus": 0,
                "carga": 0, "especial": 0})
            qtd = int(row["QTD_VEICULOS"] or 0)
            bucket["total"] += qtd
            tipo = row["TIPO_VEICULO"]
            if tipo == "AUTOMOVEL":
                bucket["automovel"] += qtd
            elif tipo in ("MOTOCICLO", "MOTONETA", "CICLOMOTO"):
                bucket["motocicleta"] += qtd
            if tipo in ("ONIBUS", "MICROONIB"):
                bucket["onibus"] += qtd
            especie = row["ESPECIE"]
            if especie == "CARGA":
                bucket["carga"] += qtd
            elif especie in ("ESPECIAL", "COMPETICAO", "COLECAO"):
                bucket["especial"] += qtd

    if nao_casados:
        print(f"[aviso] {len(nao_casados)} municipios sem match IBGE: "
              f"{sorted(nao_casados)[:8]}")

    dest = PROC / f"frota_ativa_sp_por_municipio_{periodo}.csv"
    PROC.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id_ibge", "municipio", "mesorregiao_ibge", "e_capital",
                    "frota_total", "automoveis", "motocicletas", "onibus",
                    "veiculos_carga", "veiculos_especiais", "periodo"])
        for b in sorted(acc.values(), key=lambda b: -b["total"]):
            w.writerow([b["id_ibge"], b["nome"], b["mesorregiao"],
                        "sim" if b["id_ibge"] == SAO_PAULO_IBGE else "nao",
                        b["total"], b["automovel"], b["motocicleta"], b["onibus"],
                        b["carga"], b["especial"], periodo])
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--agora", action="store_true", help="rebaixa mesmo com arquivo local")
    args = ap.parse_args()

    res = latest_resource()
    periodo = period_from_name(res["name"])
    url = res["url"]
    dest = RAW / f"frota_ativa_sp_{periodo}.csv"
    print(f"recurso: {res['name']}  periodo={periodo}")
    if args.dry_run:
        print(f"[dry-run] {dest.name} <- {url}")
        return 0

    status = "skip"
    if dest.exists() and dest.stat().st_size > 0 and not args.agora:
        print(f"[skip] {dest.name} ja existe ({dest.stat().st_size} bytes)")
    else:
        status = download(url, dest)
        print(f"[ok] {dest.name}  {dest.stat().st_size} bytes  http={status}")

    out = agregar(dest, periodo)
    print(f"[agregado] {out.relative_to(ROOT)}  ({sum(1 for _ in out.open(encoding='utf-8')) - 1} municipios)")

    LOGS.mkdir(parents=True, exist_ok=True)
    mpath = LOGS / f"manifesto_detran_{datetime.now(BRT):%Y%m%d}.csv"
    row = {
        "arquivo": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "fonte": "Frota Ativa (mensal)",
        "orgao": "Detran-SP (Portal de Dados Abertos do Estado de Sao Paulo)",
        "url": url,
        "data_hora_consulta_brt": datetime.now(BRT).isoformat(timespec="seconds"),
        "data_publicacao": res.get("last_modified") or "",
        "formato": "CSV",
        "tamanho_bytes": dest.stat().st_size,
        "sha256": sha256_of(dest),
        "cobertura": f"SP estado, {periodo}; 645 municipios",
        "licenca": "Dado aberto estadual (Lei 12.527/2011)",
        "status_http": status,
        "observacoes": "Bruto gitignorado (355 MB); agregado por municipio em data/processed/",
    }
    fields = list(row)
    mpath.parent.mkdir(parents=True, exist_ok=True)
    new = not mpath.exists()
    with mpath.open("a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        if new:
            w.writeheader()
        w.writerow(row)
    print(f"manifesto: {mpath.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
