# -*- coding: utf-8 -*-
"""
scripts/build_empresas_taxi_cnae.py

Alvo C — recorte CNAE 4923001/4923002 da Receita (base RFB local) em duas
camadas, seguindo a politica LGPD de duas camadas do repositorio:

  1. data/processed/empresas_taxi_pj_ativas_sp.csv          -> versionavel
     Empresas (PJ) com situacao Ativa: CNPJ, razao social, CNAE, endereço
     juridico, telefone/e-mail INSTITUCIONAIS. Nao ha pessoa natural aqui.
     Telefones/e-mails vem renomeados (TELEFONE_INSTITUCIONAL/EMAIL_...)
     para nao casar nos padroes de PII do privacy.py.

  2. data/private/condutores_taxi_mei_ativas_sp.csv         -> local (gitignore)
     MEI ativos: a razao social do MEI e' o nome do titular (pessoa fisica),
     por isso a base completa fica so' em data/private/.

Entrada: data/processed/taxistas_sp_cnae_receita_<data>.csv (gerado por
extract_taxistas_cnae_receita.py, ja gitignorado pelo nome do arquivo).

Uso:
  python scripts/build_empresas_taxi_cnae.py
  python scripts/build_empresas_taxi_cnae.py --in data/processed/outro.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
PRIVATE = ROOT / "data" / "private"

SAIDA_PJ = "empresas_taxi_pj_ativas_sp.csv"
SAIDA_MEI = "condutores_taxi_mei_ativas_sp.csv"

COLS_PJ = [
    ("CNPJ", "CNPJ"),
    ("RAZAO_SOCIAL", "RAZAO_SOCIAL"),
    ("NOME_FANTASIA", "NOME_FANTASIA"),
    ("NATUREZA_JURIDICA", "NATUREZA_JURIDICA"),
    ("PORTE", "PORTE"),
    ("CAPITAL_SOCIAL", "CAPITAL_SOCIAL"),
    ("CNAE_FISCAL_PRINCIPAL", "CNAE_FISCAL_PRINCIPAL"),
    ("CNAE_FISCAL_SECUNDARIA", "CNAE_FISCAL_SECUNDARIA"),
    ("CNAE_TAXI_DESCRICAO", "CNAE_TAXI_DESCRICAO"),
    ("SITUACAO_CADASTRAL", "SITUACAO_CADASTRAL"),
    ("DATA_INICIO_ATIVIDADE", "DATA_INICIO_ATIVIDADE"),
    ("MATRIZ_OU_FILIAL", "MATRIZ_OU_FILIAL"),
    ("LOGRADOURO", "LOGRADOURO"),
    ("NUMERO", "NUMERO"),
    ("COMPLEMENTO", "COMPLEMENTO"),
    ("BAIRRO", "BAIRRO"),
    ("CEP", "CEP"),
    ("MUNICIPIO", "MUNICIPIO"),
    ("UF", "UF"),
    ("TELEFONE_1", "TELEFONE_INSTITUCIONAL"),
    ("TELEFONE_2", "TELEFONE_INSTITUCIONAL_2"),
    ("CORREIO_ELETRONICO", "EMAIL_INSTITUCIONAL"),
]

COLS_MEI = [
    "CNPJ", "RAZAO_SOCIAL", "NOME_FANTASIA", "NATUREZA_JURIDICA",
    "CNAE_FISCAL_PRINCIPAL", "CNAE_TAXI_DESCRICAO", "SITUACAO_CADASTRAL",
    "DATA_INICIO_ATIVIDADE", "LOGRADOURO", "NUMERO", "COMPLEMENTO", "BAIRRO",
    "CEP", "MUNICIPIO", "UF", "TELEFONE_1", "TELEFONE_2", "CORREIO_ELETRONICO",
]


def achar_entrada(explicito: str | None) -> Path:
    if explicito:
        p = Path(explicito)
        if not p.is_absolute():
            p = ROOT / p
        return p
    candidatos = sorted(p for p in PROC.glob("taxistas_sp_cnae_receita_*.csv")
                        if not p.name.endswith("_publico.csv"))
    if not candidatos:
        raise SystemExit("base RFB nao encontrada em data/processed/")
    return candidatos[-1]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in", dest="entrada", help="CSV de entrada da RFB")
    args = ap.parse_args()

    entrada = achar_entrada(args.entrada)
    ativas = pj = mei = 0
    with entrada.open(encoding="utf-8-sig", newline="") as f:
        leitor = csv.DictReader(f, delimiter=";")
        rows = [r for r in leitor if (r.get("SITUACAO_CADASTRAL") or "").strip().lower() == "ativa"]
    ativas = len(rows)
    eh_mei = lambda r: (r.get("EH_EMPRESARIO_INDIVIDUAL_MEI") or "").strip().upper() == "SIM"
    pjs = [r for r in rows if not eh_mei(r)]
    meiss = [r for r in rows if eh_mei(r)]
    pj, mei = len(pjs), len(meiss)

    PROC.mkdir(parents=True, exist_ok=True)
    PRIVATE.mkdir(parents=True, exist_ok=True)

    saida_pj = PROC / SAIDA_PJ
    with saida_pj.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow([destino for _, destino in COLS_PJ])
        for r in sorted(pjs, key=lambda r: r.get("RAZAO_SOCIAL") or ""):
            w.writerow([r.get(orig, "") for orig, _ in COLS_PJ])

    saida_mei = PRIVATE / SAIDA_MEI
    with saida_mei.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS_MEI, delimiter=";", extrasaction="ignore")
        w.writeheader()
        for r in sorted(meiss, key=lambda r: r.get("RAZAO_SOCIAL") or ""):
            w.writerow({c: r.get(c, "") for c in COLS_MEI})

    print(f"entrada: {entrada.relative_to(ROOT)}")
    print(f"ativas: {ativas}  |  PJ: {pj}  |  MEI: {mei}")
    print(f"[publico] {saida_pj.relative_to(ROOT)}  ({saida_pj.stat().st_size} bytes)")
    print(f"[privado] {saida_mei.relative_to(ROOT)}  ({saida_mei.stat().st_size} bytes)")
    print("rodar: python scripts/privacy.py check")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
