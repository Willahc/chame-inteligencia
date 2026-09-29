# -*- coding: utf-8 -*-
"""
scripts/fetch_smt_open_data.py

Baixa dados abertos da Secretaria Municipal de Mobilidade (SMT/DTP) no Portal
CKAN da Prefeitura de Sao Paulo:

  1. SGTP | Taxi - Licencas (CSV + PDF + dicionario de dados)
     Conjunto: sistema-de-gerenciamento-de-transporte-publico-sgtp-taxi
     Serie mensal de licencas de taxi cadastradas no municipio, por tipo de
     veiculo (C/S-CARRO), titulacao (AUTONOMO/EMPRESA) e categoria.

  2. CMTT - Conselheiros por mandato (CSV + dicionario de dados)
     Representantes por segmento no Conselho Municipal de Transito e
     Transporte de Sao Paulo (cargos institucionais publicos).

Todas as licencas sao Creative Commons (CCZero / CC BY), conforme metadados do
CKAN. Cada download e' registrado em logs/manifesto_smt_<data>.csv com sha256.

Uso:
  python scripts/fetch_smt_open_data.py            # baixa tudo
  python scripts/fetch_smt_open_data.py --dry-run   # so' mostra o plano
"""

import argparse
import csv
import hashlib
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "smt"
PROC_SMT = ROOT / "data" / "processed"
LOGS = ROOT / "logs"

BRT = timezone(timedelta(hours=-3))
USER_AGENT = "Mapeamento-TaxiSP/1.0 (projeto de dados abertos; contato: local)"

RESOURCES = [
    {
        "dest": "sgtp_licencas_taxi_05.2026.csv",
        "url": "https://dados.prefeitura.sp.gov.br/dataset/4a785a59-14f9-4f65-a28f-a9f543b55f2e/resource/86e511fe-31d8-4fb6-9373-5f42ae2e5cbd/download/taxi_licencas_05.2026.csv",
        "fonte": "SGTP | Taxi - Licencas",
        "orgao": "SMT/DTP - Prefeitura de Sao Paulo (Portal CKAN)",
        "formato": "CSV",
        "licenca": "CCZero",
        "publicacao": "2026-06-25 (metadado CKAN)",
        "cobertura": "Municipio de Sao Paulo; serie mensal Jan-Mai/2026",
        "observacoes": "Serie de licencas por tipo (C/S-CARRO), titulacao e categoria; separador ';'",
    },
    {
        "dest": "sgtp7r12a_taxi.pdf",
        "url": "https://dados.prefeitura.sp.gov.br/dataset/4a785a59-14f9-4f65-a28f-a9f543b55f2e/resource/5c30c799-400f-483d-9cab-a93c4259b2c8/download/sgtp7r12a_taxi.pdf",
        "fonte": "SGTP | Taxi - Licencas (PDF)",
        "orgao": "SMT/DTP - Prefeitura de Sao Paulo (Portal CKAN)",
        "formato": "PDF",
        "licenca": "CCZero",
        "publicacao": "2026-06-25 (metadado CKAN)",
        "cobertura": "Municipio de Sao Paulo; serie mensal Jan-Mai/2026",
        "observacoes": "Versao em PDF da mesma tabela do CSV",
    },
    {
        "dest": "dicionario_dados_taxi_licencas.csv",
        "url": "https://dados.prefeitura.sp.gov.br/dataset/4a785a59-14f9-4f65-a28f-a9f543b55f2e/resource/fb26b4de-c9d6-4f1e-ab1d-a258f3cd79cf/download/dicionario-de-dados-taxi.csv",
        "fonte": "SGTP | Taxi - Dicionario de dados",
        "orgao": "SMT/DTP - Prefeitura de Sao Paulo (Portal CKAN)",
        "formato": "CSV",
        "licenca": "CCZero",
        "publicacao": "2025-11-14 (metadado CKAN)",
        "cobertura": "Municipio de Sao Paulo",
        "observacoes": "Dicionario dos campos da tabela de licencas",
    },
    {
        "dest": "cmtt_conselheiros_mandatos_2024mar_2026jan.csv",
        "url": "https://dados.prefeitura.sp.gov.br/dataset/f2263b9b-c736-45f9-a58f-c5f83a8608bc/resource/2f880d8e-7f4a-4b3b-b8d0-476d36bd8e78/download/base_mandatos-cmtt-2024mar-2026jan.csv",
        "fonte": "Conselheiros por mandato do CMTT 2024mar-2026jan",
        "orgao": "SMT/AT - Prefeitura de Sao Paulo (Portal CKAN)",
        "formato": "CSV",
        "licenca": "CC BY 4.0",
        "publicacao": "2026-06-23 (metadado CKAN)",
        "cobertura": "CMTT - mandato vigente ate jan/2026",
        "observacoes": "Nomes, cargos e segmentos de conselheiros (cargo publico/institucional); inclui gênero declarado",
    },
    {
        "dest": "dicionario_conselheiros_cmtt.csv",
        "url": "https://dados.prefeitura.sp.gov.br/dataset/f2263b9b-c736-45f9-a58f-c5f83a8608bc/resource/c5ff7f99-fcd5-48e4-9a2c-f556dad0d4df/download/conselheiros-por-mandato-do-cmtt-dicionario.csv",
        "fonte": "Conselheiros CMTT - Dicionario de dados",
        "orgao": "SMT/AT - Prefeitura de Sao Paulo (Portal CKAN)",
        "formato": "CSV",
        "licenca": "CC BY 4.0",
        "publicacao": "2026-06-23 (metadado CKAN)",
        "cobertura": "CMTT",
        "observacoes": "Dicionario dos campos da base de mandatos",
    },
]


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def gerar_licencas_tidy() -> Path | None:
    """Reorganiza o CSV de licencas (layout em blocos) em tabela retangular.

    Original: uma linha por (tipo, titulacao, categoria) com uma coluna por mes
    alternando quantidade e percentual. Saida: uma linha por combinacao com as
    quantidades mensais.
    """
    origem = RAW / "sgtp_licencas_taxi_05.2026.csv"
    if not origem.exists():
        return None
    with origem.open(encoding="utf-8-sig", newline="") as f:
        linhas = [l for l in csv.reader(f, delimiter=";") if any(c.strip() for c in l)]
    if not linhas:
        return None

    cab = linhas[0]
    colunas_mes = [(i, c.strip()) for i, c in enumerate(cab)
                   if c.strip().rstrip(" ") in MESES]
    if not colunas_mes:
        print("[aviso] nao consegui identificar as colunas de mes do SGTP")
        return None
    ano_match = re.search(r"(\d{4})", origem.stem)
    ano = ano_match.group(1) if ano_match else "2026"

    def inteiro(v: str) -> str:
        v = (v or "").strip().replace(".", "")
        return v if v.isdigit() else ""

    registros = []
    for linha in linhas[1:]:
        def cel(i: int) -> str:
            return linha[i].strip() if i < len(linha) else ""
        titul = cel(2)
        cat = cel(3) or "(subtotal)"
        valores = {mes: inteiro(cel(i)) for i, mes in colunas_mes}
        if not any(valores.values()):
            continue
        registros.append({
            "tipo_veiculo": cel(0),
            "titulacao": titul or "(total)",
            "categoria": cat,
            **{f"{mes.lower()}_{ano}": v for mes, v in valores.items()},
        })

    destino = PROC_SMT
    destino.mkdir(parents=True, exist_ok=True)
    saida = destino / "sgtp_licencas_taxi_mensal.csv"
    campos = ["tipo_veiculo", "titulacao", "categoria"] + \
             [f"{mes.lower()}_{ano}" for _, mes in colunas_mes]
    with saida.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";", extrasaction="ignore")
        w.writeheader()
        for r in registros:
            w.writerow(r)
    print(f"[agregado] {saida.relative_to(ROOT)} ({len(registros)} linhas)")
    return saida


def fetch(res: dict, dry: bool) -> dict:
    dest = RAW / res["dest"]
    RAW.mkdir(parents=True, exist_ok=True)
    if dry:
        print(f"[dry-run] {res['dest']} <- {res['url']}")
        return {"status_http": "dry-run"}
    if dest.exists() and dest.stat().st_size > 0:
        print(f"[skip] {res['dest']} ja existe ({dest.stat().st_size} bytes)")
        return {"status_http": "skip"}

    r = requests.get(res["url"], headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    dest.write_bytes(r.content)

    row = {
        "arquivo": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "fonte": res["fonte"],
        "orgao": res["orgao"],
        "url": res["url"],
        "data_hora_consulta_brt": datetime.now(BRT).isoformat(timespec="seconds"),
        "data_publicacao": res["publicacao"],
        "formato": res["formato"],
        "tamanho_bytes": dest.stat().st_size,
        "sha256": sha256_of(dest),
        "cobertura": res["cobertura"],
        "licenca": res["licenca"],
        "status_http": r.status_code,
        "observacoes": res["observacoes"],
    }
    print(f"[ok] {res['dest']}  {row['tamanho_bytes']} bytes  sha256={row['sha256'][:12]}")
    return row


def write_manifest(rows: list) -> Path:
    LOGS.mkdir(parents=True, exist_ok=True)
    day = datetime.now(BRT).strftime("%Y%m%d")
    path = LOGS / f"manifesto_smt_{day}.csv"
    fields = [
        "arquivo", "fonte", "orgao", "url", "data_hora_consulta_brt",
        "data_publicacao", "formato", "tamanho_bytes", "sha256", "cobertura",
        "licenca", "status_http", "observacoes",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    existentes = set()
    if path.exists():
        with path.open(encoding="utf-8", newline="") as f:
            existentes = {r.get("url", "") for r in csv.DictReader(f)}
    novos = [r for r in rows
             if r.get("status_http") in (200, "dry-run") and r.get("url") not in existentes]
    if novos:
        precisa_header = not path.exists() or path.stat().st_size == 0
        with path.open("a", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            if precisa_header:
                w.writeheader()
            for row in novos:
                w.writerow(row)
    return path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="nao baixa, so mostra")
    ap.add_argument("--only", help="filtra pelo nome do arquivo de destino")
    args = ap.parse_args()

    rows = []
    for res in RESOURCES:
        if args.only and args.only not in res["dest"]:
            continue
        try:
            rows.append(fetch(res, args.dry_run))
        except Exception as exc:  # noqa: BLE001 - reporta e segue
            print(f"[erro] {res['dest']}: {exc}")
            rows.append({"status_http": f"erro: {exc}"})

    if not args.dry_run:
        path = write_manifest([r for r in rows if r.get("status_http") == 200])
        print(f"manifesto: {path.relative_to(ROOT)}")
        gerar_licencas_tidy()

    ok = sum(1 for r in rows if r.get("status_http") in (200, "dry-run", "skip"))
    print(f"recursos ok: {ok}/{len(rows)}")
    return 0 if ok == len(rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
