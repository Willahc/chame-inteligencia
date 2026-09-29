# -*- coding: utf-8 -*-
"""
scripts/fetch_infosiga_taxistas.py

Alvo E — sinistros do Infosiga (Detran-SP / ITDP-SP) com recorte em taxistas.

O pacote aberto "pessoas-envolvidas-em-sinistros" expoe uma linha por vitima,
incluindo profissao declarada. Isso permite medir, por mes, quantas vitimas de
sinistros na sao profissionais de taxi (profissao TAXISTA / MOTOTAXISTA) -
proxy publico do "acidente com taxista", ja que o pacote de veiculos aberto
nao traz categoria de servico TAXI.

Leva dos recursos mensais (default: ultimos 12 meses), grava o bruto em
data/raw/infosiga/ (gitignorado, ~4 MB por mes), a serie agregada em
data/processed/ e o manifesto em logs/ (sha256 de cada download).

Uso:
  python scripts/fetch_infosiga_taxistas.py                # ultimos 12 meses
  python scripts/fetch_infosiga_taxistas.py --meses 6
  python scripts/fetch_infosiga_taxistas.py --dry-run
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "infosiga"
PROC = ROOT / "data" / "processed"
LOGS = ROOT / "logs"

BRT = timezone(timedelta(hours=-3))
USER_AGENT = "Mapeamento-TaxiSP/1.0 (projeto de dados abertos; contato: local)"
CKAN = "https://dadosabertos.sp.gov.br/api/3/action/package_show"
CONJUNTO = "pessoas-envolvidas-em-sinistros"

PROFISSOES_TAXI = ("TAXISTA", "MOTOTAXISTA")
MUNICIPIO_SP = "SAO PAULO"
SEPARADOR = ";"


def norm(texto: str) -> str:
    """Maiuscula sem acento, para municipio/profissao estaveis entre meses."""
    texto = "".join(c for c in unicodedata.normalize("NFKD", texto or "")
                    if not unicodedata.combining(c))
    return " ".join(texto.upper().split())


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def recursos(meses: int) -> list[dict]:
    r = requests.get(CKAN, params={"id": CONJUNTO},
                     headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    res = r.json()["result"]["resources"]
    csvs = [x for x in res
            if (x.get("format") or "").upper() == "CSV"
            or ".csv" in (x.get("url") or "").split("?")[0].lower()]
    return csvs[-meses:]


def baixar(url: str, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"[skip] {dest.name} ({dest.stat().st_size} bytes)")
        return "skip"
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=300)
    r.raise_for_status()
    dest.write_bytes(r.content)
    print(f"[ok] {dest.name} ({len(r.content)} bytes)")
    return r.status_code


def ler_csv(dest: Path) -> list[dict]:
    """Le um CSV mensal do Infosiga (meses vem em UTF-8 ou CP1252)."""
    raw = dest.read_bytes()
    texto = None
    for enc in ("utf-8-sig", "cp1252"):
        try:
            texto = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if texto is None:
        texto = raw.decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(texto), delimiter=SEPARADOR))


def acumular(rows: list[dict], acc: dict, totais: Counter) -> None:
    for row in rows:
        prof = norm(row.get("profissao") or "")
        mes = (row.get("ano_mes_sinistro") or "").strip()
        municipio = norm(row.get("municipio") or "")
        if not mes:
            continue
        if prof not in PROFISSOES_TAXI:
            continue
        grav = (row.get("gravidade_lesao") or "").strip().upper()
        bucket = acc[(mes, municipio, prof)]
        bucket["vitimas"] += 1
        if "MORTE" in grav or "OBITO" in grav or grav == "FATAL":
            bucket["fatais"] += 1
        elif "GRAVE" in grav:
            bucket["graves"] += 1
        else:
            bucket["leves"] += 1
        bucket["total_mes_estado"] = totais[mes]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--meses", type=int, default=12, help="quantidade de meses (default 12)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    lista = recursos(args.meses)
    print(f"recursos selecionados: {len(lista)}")
    if not lista:
        return 1

    if args.dry_run:
        for x in lista:
            print(f"[dry-run] {x['name']} <- {x['url'][:100]}")
        return 0

    acc: dict[tuple[str, str, str], Counter] = defaultdict(Counter)
    totais: Counter = Counter()  # vitimas no estado por mes (denominador)
    linhas_csv: dict[str, int] = {}
    rows_manifesto = []
    baixados = 0

    for x in lista:
        nome = (x.get("name") or "sinistro").lower().replace(" ", "_")
        url = x["url"]
        dest = RAW / (url.split("/")[-1].split("?")[0] or f"{nome}.csv")
        status = baixar(url, dest)
        if status == "skip" or isinstance(status, int):
            rows_manifesto.append({
                "arquivo": str(dest.relative_to(ROOT)).replace("\\", "/"),
                "fonte": "Pessoas Envolvidas em Sinistros (Infosiga)",
                "orgao": "Detran-SP (Portal de Dados Abertos do Estado de SP)",
                "url": url,
                "data_hora_consulta_brt": datetime.now(BRT).isoformat(timespec="seconds"),
                "data_publicacao": x.get("last_modified") or "",
                "formato": "CSV",
                "tamanho_bytes": dest.stat().st_size,
                "sha256": sha256_of(dest),
                "cobertura": x.get("name") or "",
                "licenca": "Dado aberto estadual (Lei 12.527/2011)",
                "status_http": 200 if status != "skip" else "skip",
                "observacoes": "Bruto em data/raw/infosiga/ (gitignorado); agregado por mes",
            })
            baixados += 1
        rows = ler_csv(dest)
        linhas_csv[dest.name] = len(rows)
        for row in rows:
            mes = (row.get("ano_mes_sinistro") or "").strip()
            if mes:
                totais[mes] += 1
        acumular(rows, acc, totais)

    dest_out = PROC / "sinistros_vitimas_taxistas_infosiga_mensal.csv"
    PROC.mkdir(parents=True, exist_ok=True)
    with dest_out.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ano_mes", "municipio", "profissao", "vitimas_taxista",
                    "graves", "fatais", "outras_gravidades",
                    "total_vitimas_estado_no_mes", "arquivos_fonte"])
        for (mes, municipio, prof), b in sorted(acc.items()):
            w.writerow([mes, municipio, prof, b["vitimas"], b["graves"],
                        b["fatais"], b["leves"], b["total_mes_estado"], baixados])
    print(f"[agregado] {dest_out.relative_to(ROOT)}  ({len(acc)} linhas)")

    sp = sum(b["vitimas"] for (m, mun, p), b in acc.items() if mun == MUNICIPIO_SP)
    print(f"vitimas taxista/mototaxista em SAO PAULO: {sp}")

    LOGS.mkdir(parents=True, exist_ok=True)
    mpath = LOGS / f"manifesto_infosiga_{datetime.now(BRT):%Y%m%d}.csv"
    fields = list(rows_manifesto[0]) if rows_manifesto else []
    if fields:
        new = not mpath.exists()
        with mpath.open("a", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            if new:
                w.writeheader()
            for row in rows_manifesto:
                w.writerow(row)
        print(f"manifesto: {mpath.relative_to(ROOT)}")

    return 0 if baixados == len(lista) else 1


if __name__ == "__main__":
    raise SystemExit(main())
