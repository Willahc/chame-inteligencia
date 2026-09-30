# -*- coding: utf-8 -*-
"""
scripts/fetch_tse_taxistas.py
Baixa dados abertos de candidaturas do TSE (Eleições Municipais 2024 - SP),
extrai candidatos com ocupação declarada no setor de transporte/táxi
e correlaciona com a base de motoristas da capital para enriquecimento de
data de nascimento exata, nome de urna, ocupação e redes sociais públicas.
"""

import os
import io
import re
import csv
import zipfile
import hashlib
import unicodedata
import urllib.request
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parent.parent
RAW_TSE = ROOT / "data" / "raw" / "tse"
PROC = ROOT / "data" / "processed"
LOGS = ROOT / "logs"

TSE_CAND_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2024.zip"
TSE_REDE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/rede_social_candidato_2024.zip"

BRT = timezone(timedelta(hours=-3))
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MapeamentoTaxiSP/1.0"

RMSP_MUNICIPIOS = {
    "SÃO PAULO", "GUARULHOS", "OSASCO", "SANTO ANDRÉ", "SÃO BERNARDO DO CAMPO",
    "SÃO CAETANO DO SUL", "DIADEMA", "TABOÃO DA SERRA", "BARUERI", "CARAPICUÍBA",
    "MAUÁ", "MOGI DAS CRUZES", "SUZANO", "COTIA", "EMBU DAS ARTES", "ITAPECERICA DA SERRA",
    "FERRAZ DE VASCONCELOS", "POÁ", "RIBEIRÃO PIRES", "SANTANA DE PARNAÍBA", "ITAQUAQUECETUBA"
}

def norm_name(s):
    if not isinstance(s, str):
        return ""
    t = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    t = re.sub(r'[^A-Z\s]', '', t.upper())
    return " ".join(t.split())

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()

def main():
    print("=" * 80)
    print("INGESTÃO DE DADOS ABERTOS DO TSE (ELEIÇÕES 2024 - CANDIDATOS SP)")
    print("=" * 80)

    RAW_TSE.mkdir(parents=True, exist_ok=True)
    PROC.mkdir(parents=True, exist_ok=True)
    LOGS.mkdir(parents=True, exist_ok=True)

    # 1. Download do pacote de candidatos
    print("[1/3] Baixando pacote oficial de candidatos do TSE (63 MB)...")
    req = urllib.request.Request(TSE_CAND_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        cand_bytes = resp.read()
    
    hash_cand = sha256_bytes(cand_bytes)
    print(f"  -> Baixado com sucesso ({len(cand_bytes):,} bytes | SHA256: {hash_cand[:12]}...)")

    # Extrair SP
    cand_zf = zipfile.ZipFile(io.BytesIO(cand_bytes))
    with cand_zf.open("consulta_cand_2024_SP.csv") as f:
        df_tse = pd.read_csv(f, sep=";", encoding="latin-1", low_memory=False)
    print(f"  -> {len(df_tse):,} candidaturas em SP carregadas.")

    # 2. Download das redes sociais
    print("\n[2/3] Baixando redes sociais de candidatos do TSE...")
    redes_map = {}
    try:
        req_rede = urllib.request.Request(TSE_REDE_URL, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req_rede, timeout=40) as resp_rede:
            rede_bytes = resp_rede.read()
        rede_zf = zipfile.ZipFile(io.BytesIO(rede_bytes))
        with rede_zf.open("rede_social_candidato_2024_SP.csv") as rf:
            df_redes = pd.read_csv(rf, sep=";", encoding="latin-1", low_memory=False)
        for _, r in df_redes.iterrows():
            sq = str(r.get("SQ_CANDIDATO", ""))
            url = str(r.get("DS_URL", "")).strip()
            if sq and url:
                if sq not in redes_map:
                    redes_map[sq] = []
                redes_map[sq].append(url)
        print(f"  -> {len(df_redes):,} perfis de redes sociais mapeados.")
    except Exception as e:
        print(f"  -> Aviso ao baixar redes sociais: {e}")

    # 3. Cruzamento com a base de motoristas
    print("\n[3/3] Cruzando com a Base de Candidatos de Alvarás e Táxi...")
    master_csv = ROOT / "planilha_mestre_taxistas_sp_2026.csv"
    if not master_csv.exists():
        master_csv = ROOT / "Novos Alvarás 2026" / "alvaras_taxi_sp_2026_consolidado.csv"
    
    df_master = pd.read_csv(master_csv, sep=";", low_memory=False)
    name_col = "Nome_Completo" if "Nome_Completo" in df_master.columns else "Nome_Candidato"
    df_master["nome_norm"] = df_master[name_col].apply(norm_name)
    names_master_set = set(df_master["nome_norm"].unique())

    df_tse["nome_norm"] = df_tse["NM_CANDIDATO"].apply(norm_name)

    # Filtrar candidatos relevantes: na capital ou RMSP ou com ocupação transporte/táxi
    matches = []
    for _, r in df_tse.iterrows():
        nm = r["nome_norm"]
        if nm in names_master_set and len(nm.split()) >= 2:
            mun = str(r.get("NM_UE", "")).upper()
            ocup = str(r.get("DS_OCUPACAO", "")).upper()
            
            # Bloqueio de homônimo: aceita se for na RMSP OU se tiver ocupação no setor de transporte
            eh_rmsp = mun in RMSP_MUNICIPIOS
            eh_transporte = any(k in ocup for k in ["TAXI", "TÁXI", "MOTORISTA", "CONDUTOR", "TRANSPORTE"])
            
            if eh_rmsp or eh_transporte:
                sq = str(r.get("SQ_CANDIDATO", ""))
                sociais = " | ".join(redes_map.get(sq, []))
                matches.append({
                    "Nome_Motorista": r["NM_CANDIDATO"],
                    "Nome_Urna_TSE": r["NM_URNA_CANDIDATO"],
                    "Municipio_Candidatura": r["NM_UE"],
                    "Cargo_Disputado": r["DS_CARGO"],
                    "Partido": r["SG_PARTIDO"],
                    "Ocupacao_Declarada_TSE": r["DS_OCUPACAO"],
                    "Data_Nascimento_Exata": r["DT_NASCIMENTO"],
                    "Genero_TSE": r["DS_GENERO"],
                    "Grau_Instrucao": r["DS_GRAU_INSTRUCAO"],
                    "Estado_Civil": r["DS_ESTADO_CIVIL"],
                    "Redes_Sociais_Publicas": sociais,
                    "Eh_Transporte_Confirmado": "Sim" if eh_transporte else "Não (Candidato RMSP)",
                })

    df_out = pd.DataFrame(matches)
    df_out.drop_duplicates(subset=["Nome_Motorista", "Municipio_Candidatura"], inplace=True)
    df_out.sort_values(by=["Eh_Transporte_Confirmado", "Nome_Motorista"], ascending=[False, True], inplace=True)

    out_csv = PROC / "taxistas_candidatos_tse_2024.csv"
    df_out.to_csv(out_csv, sep=";", index=False, encoding="utf-8-sig")

    out_xlsx = ROOT / "Novos Alvarás 2026" / "taxistas_candidatos_tse_2024.xlsx"
    df_out.to_excel(out_xlsx, index=False, engine="openpyxl")

    # Registrar manifesto
    now_str = datetime.now(BRT).strftime("%Y-%m-%d %H:%M:%S")
    manifesto_path = LOGS / "manifesto_tse_2024.csv"
    with open(manifesto_path, "a", newline="", encoding="utf-8") as mf:
        w = csv.writer(mf, delimiter=";")
        if manifesto_path.stat().st_size == 0:
            w.writerow(["data_consulta", "fonte", "url", "sha256", "registros_tse", "matches_motoristas"])
        w.writerow([now_str, "TSE - Candidatos 2024", TSE_CAND_URL, hash_cand, len(df_tse), len(df_out)])

    print(f"\nSucesso! {len(df_out)} motoristas/taxistas identificados com dados oficiais do TSE.")
    print(f"-> CSV: {out_csv.name}")
    print(f"-> Excel: {out_xlsx.name}")

if __name__ == "__main__":
    main()
