# -*- coding: utf-8 -*-
"""
scripts/enrich_fonetico_receita.py
Enriquecimento Fonético / Ortográfico na Receita Federal (MEI e Sócios)
para os motoristas de São Paulo que ainda permanecem sem contato telefônico.

Aplica normalização canônica e fonética para capturar variações ortográficas
clássicas brasileiras (SOUZA/SOUSA, LUIZ/LUIS, MATEUS/MATHEUS, WALTER/VALTER,
duplicação de consoantes, etc.), com rigoroso filtro anti-dummy em telefones.
"""

import argparse
import csv
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
CNAE_CSV = DATA_DIR / "taxistas_sp_cnae_receita_2026-09-14.csv"
MEIS_GERAIS_CSV = DATA_DIR / "meis_gerais_taxistas_sp_enriquecidos.csv"
SOCIOS_CSV = DATA_DIR / "socios_taxistas_sp_enriquecidos.csv"
NACIONAL_CSV = DATA_DIR / "nacional_taxistas_enriquecidos.csv"

OUT_CSV = DATA_DIR / "fonetico_taxistas_enriquecidos.csv"
OUT_PUBLIC_CSV = DATA_DIR / "fonetico_taxistas_enriquecidos_publico.csv"

VALID_BR_DDDS = {
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', 
    '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', 
    '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', 
    '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', 
    '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'
}

DUMMY_PHONE_PATTERNS = {
    '00000000', '11111111', '22222222', '33333333', '44444444',
    '55555555', '66666666', '77777777', '88888888', '99999999',
    '12345678', '87654321', '01234567', '98765432'
}

def norm_name(s):
    if not isinstance(s, str):
        return ''
    s = s.strip().upper()
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    s = re.sub(r'[^A-Z\s]', ' ', s)
    return ' '.join(s.split())

def canon_token(t):
    if not t:
        return ''
    t = t.upper()
    # Substituições canônicas brasileiras
    t = t.replace('PH', 'F').replace('TH', 'T').replace('Y', 'I').replace('Z', 'S').replace('K', 'C')
    if t.startswith('W'):
        t = 'V' + t[1:]
    if t.startswith('H'):
        t = t[1:]
    # Reduz consoantes dobradas (LL -> L, NN -> N, etc.)
    t = re.sub(r'(.)\1+', r'\1', t)
    return t

def canon_name(s):
    n = norm_name(s)
    tokens = [t for t in n.split() if t not in {'DE', 'DA', 'DO', 'DOS', 'DAS', 'E'}]
    return ' '.join(canon_token(t) for t in tokens if t)

def normalize_and_validate_phone(ddd_raw, tel_raw):
    d_raw = re.sub(r'\D+', '', str(ddd_raw or '')).strip()
    t_raw = re.sub(r'\D+', '', str(tel_raw or '')).strip()
    
    if not t_raw:
        return "", "", "Sem Telefone"

    # Tratar prefixo 55
    if len(t_raw) in (12, 13) and t_raw[:2] == '55' and t_raw[2:4] in VALID_BR_DDDS:
        d = t_raw[2:4]
        local = t_raw[4:]
    elif len(t_raw) in (10, 11) and t_raw[:2] in VALID_BR_DDDS:
        d = t_raw[:2]
        local = t_raw[2:]
    elif len(t_raw) in (8, 9):
        local = t_raw
        d = d_raw if d_raw in VALID_BR_DDDS else "11"
    else:
        d = d_raw if d_raw in VALID_BR_DDDS else "11"
        local = t_raw

    # Validação anti-dummy
    if len(local) < 8 or len(set(local)) <= 1 or local.startswith('0000'):
        return "", "", "Sem Telefone"
    if local in DUMMY_PHONE_PATTERNS or local[-8:] in DUMMY_PHONE_PATTERNS:
        return "", "", "Sem Telefone"

    eh_celular = False
    if len(local) == 9 and local.startswith('9'):
        eh_celular = True
    elif len(local) == 8 and local[0] in '6789':
        local = '9' + local
        eh_celular = True

    if eh_celular and len(local) == 9:
        fmt = f"({d}) {local[:5]}-{local[5:]}"
        wpp = f"https://wa.me/55{d}{local}"
        tipo = "Celular (WhatsApp Provável)"
    elif len(local) == 8 and local[0] in '2345':
        fmt = f"({d}) {local[:4]}-{local[4:]}"
        wpp = ""
        tipo = "Fixo (Voz)"
    elif len(local) == 8:
        fmt = f"({d}) {local}"
        wpp = ""
        tipo = "Outro"
    else:
        return "", "", "Sem Telefone"

    return fmt, wpp, tipo

def format_cnpj(raw):
    digits = re.sub(r'\D', '', str(raw or ''))
    if len(digits) == 14:
        return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"
    return raw

def mascarar_nome(nome):
    partes = [p for p in str(nome).split() if p]
    if not partes:
        return ''
    if len(partes) == 1:
        return partes[0][:2] + '***'
    return partes[0][:2] + '*** ' + ' '.join(partes[1:])

def mascarar_telefone(tel):
    tel = str(tel).strip()
    if not tel or tel == '—':
        return '—'
    digits = re.sub(r'\D', '', tel)
    if len(digits) >= 10:
        return f"({digits[:2]}) *****-{digits[-4:]}"
    return '*****'

def main():
    print("=" * 80)
    print("ENRIQUECIMENTO FONÉTICO / ORTOGRÁFICO NA RECEITA FEDERAL (MEI E SÓCIOS)")
    print("=" * 80)

    # 1. Carregar motoristas sem telefone
    print("\n[1/5] Carregando motoristas sem telefone da Planilha Mestre...")
    df_m = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    sem_tel = df_m[df_m['Telefone_Celular_1'].fillna('').str.strip() == ''].copy()
    print(f"Total sem telefone: {len(sem_tel):,} motoristas.")

    # Mapear por chave canônica
    sem_tel_canon = {}
    for _, r in sem_tel.iterrows():
        cn = canon_name(r['Nome_Completo'])
        if len(cn.split()) >= 2:
            sem_tel_canon.setdefault(cn, []).append(r)

    print(f"Chaves canônicas indexadas: {len(sem_tel_canon):,}")

    enriched = {}

    # 2. Varrer CNAE Taxi SP
    print("\n[2/5] Cruzando com CNAE Táxi SP (142 mil estabelecimentos)...")
    if CNAE_CSV.exists():
        df_cnae = pd.read_csv(CNAE_CSV, sep=';', low_memory=False)
        for _, r in df_cnae.iterrows():
            rz = str(r.get('RAZAO_SOCIAL', ''))
            rz_clean = re.sub(r'\d+', ' ', rz)
            cn = canon_name(rz_clean)
            if cn in sem_tel_canon:
                d1, t1 = '', str(r.get('TELEFONE_1', ''))
                d2, t2 = '', str(r.get('TELEFONE_2', ''))
                fmt1, wpp1, tp1 = normalize_and_validate_phone(d1, t1)
                fmt2, wpp2, tp2 = normalize_and_validate_phone(d2, t2)
                fmt = fmt1 or fmt2
                wpp = wpp1 or wpp2
                tp = tp1 if fmt1 else tp2
                email = str(r.get('CORREIO_ELETRONICO', '')).strip()
                if email == 'nan':
                    email = ''

                if fmt or email:
                    for drv in sem_tel_canon[cn]:
                        did = drv['ID_Master']
                        if did not in enriched:
                            enriched[did] = {
                                'ID_Master': did,
                                'Nome_Motorista': drv['Nome_Completo'],
                                'Status_Sorteio_2026': drv['Status_Sorteio_2026'],
                                'Edital_Numero': drv['Edital_Numero'],
                                'Cadastro_DTP_Condutax': drv['Cadastro_DTP_Condutax'],
                                'Origem_Enriquecimento': 'CNAE Táxi SP (Canônico/Fonético)',
                                'Empresa_CNPJ': r.get('CNPJ', ''),
                                'Empresa_Razao_Social': rz,
                                'Empresa_Nome_Fantasia': str(r.get('NOME_FANTASIA', '')),
                                'Empresa_Situacao_Cadastral': r.get('SITUACAO_CADASTRAL', ''),
                                'Empresa_Logradouro': r.get('LOGRADOURO', ''),
                                'Empresa_Numero': r.get('NUMERO', ''),
                                'Empresa_Complemento': r.get('COMPLEMENTO', ''),
                                'Empresa_Bairro': r.get('BAIRRO', ''),
                                'Empresa_CEP': r.get('CEP', ''),
                                'Empresa_Municipio': r.get('MUNICIPIO', ''),
                                'Empresa_UF': r.get('UF', 'SP'),
                                'Telefone_Principal': fmt,
                                'Telefone_Secundario': fmt2 if fmt1 else '',
                                'Tipo_Telefone': tp if fmt else 'Sem Telefone',
                                'Link_WhatsApp': wpp,
                                'Email': email
                            }

        print(f"  -> Resgatados após CNAE Táxi SP: {len(enriched):,} motoristas.")

    # 3. Varrer MEIs Gerais (SP)
    print("\n[3/5] Cruzando com MEIs Gerais (SP)...")
    if MEIS_GERAIS_CSV.exists():
        df_mg = pd.read_csv(MEIS_GERAIS_CSV, sep=';', low_memory=False)
        for _, r in df_mg.iterrows():
            nm = str(r.get('Nome_Motorista', ''))
            cn = canon_name(nm)
            if cn in sem_tel_canon:
                t1 = str(r.get('Telefone_Principal', ''))
                t2 = str(r.get('Telefone_Secundario', ''))
                fmt1, wpp1, tp1 = normalize_and_validate_phone('', t1)
                fmt2, wpp2, tp2 = normalize_and_validate_phone('', t2)
                fmt = fmt1 or fmt2
                wpp = wpp1 or wpp2
                tp = tp1 if fmt1 else tp2
                email = str(r.get('Email', '')).strip()
                if email == 'nan':
                    email = ''

                if fmt or email:
                    for drv in sem_tel_canon[cn]:
                        did = drv['ID_Master']
                        if did not in enriched:
                            enriched[did] = {
                                'ID_Master': did,
                                'Nome_Motorista': drv['Nome_Completo'],
                                'Status_Sorteio_2026': drv['Status_Sorteio_2026'],
                                'Edital_Numero': drv['Edital_Numero'],
                                'Cadastro_DTP_Condutax': drv['Cadastro_DTP_Condutax'],
                                'Origem_Enriquecimento': 'MEI Geral SP (Canônico/Fonético)',
                                'Empresa_CNPJ': r.get('MEI_CNPJ', ''),
                                'Empresa_Razao_Social': r.get('MEI_Razao_Social', ''),
                                'Empresa_Nome_Fantasia': '',
                                'Empresa_Situacao_Cadastral': r.get('MEI_Situacao_Cadastral', ''),
                                'Empresa_Logradouro': r.get('MEI_Logradouro', ''),
                                'Empresa_Numero': r.get('MEI_Numero', ''),
                                'Empresa_Complemento': r.get('MEI_Complemento', ''),
                                'Empresa_Bairro': r.get('MEI_Bairro', ''),
                                'Empresa_CEP': r.get('MEI_CEP', ''),
                                'Empresa_Municipio': r.get('MEI_Municipio', ''),
                                'Empresa_UF': r.get('MEI_UF', 'SP'),
                                'Telefone_Principal': fmt,
                                'Telefone_Secundario': fmt2 if fmt1 else '',
                                'Tipo_Telefone': tp if fmt else 'Sem Telefone',
                                'Link_WhatsApp': wpp,
                                'Email': email
                            }

        print(f"  -> Resgatados após MEIs Gerais: {len(enriched):,} motoristas.")

    # 4. Varrer Sócios e Nacional
    print("\n[4/5] Cruzando com Quadro de Sócios (QSA) e Base Nacional...")
    for path_src, orig_label in [(SOCIOS_CSV, 'Sócios QSA (Canônico/Fonético)'), (NACIONAL_CSV, 'Nacional RFB (Canônico/Fonético)')]:
        if path_src.exists():
            df_src = pd.read_csv(path_src, sep=';', low_memory=False)
            for _, r in df_src.iterrows():
                nm = str(r.get('Nome_Motorista', ''))
                cn = canon_name(nm)
                if cn in sem_tel_canon:
                    t1 = str(r.get('Telefone_Principal', ''))
                    t2 = str(r.get('Telefone_Secundario', ''))
                    fmt1, wpp1, tp1 = normalize_and_validate_phone('', t1)
                    fmt2, wpp2, tp2 = normalize_and_validate_phone('', t2)
                    fmt = fmt1 or fmt2
                    wpp = wpp1 or wpp2
                    tp = tp1 if fmt1 else tp2
                    email = str(r.get('Email', '')).strip()
                    if email == 'nan':
                        email = ''

                    if fmt or email:
                        for drv in sem_tel_canon[cn]:
                            did = drv['ID_Master']
                            if did not in enriched:
                                enriched[did] = {
                                    'ID_Master': did,
                                    'Nome_Motorista': drv['Nome_Completo'],
                                    'Status_Sorteio_2026': drv['Status_Sorteio_2026'],
                                    'Edital_Numero': drv['Edital_Numero'],
                                    'Cadastro_DTP_Condutax': drv['Cadastro_DTP_Condutax'],
                                    'Origem_Enriquecimento': orig_label,
                                    'Empresa_CNPJ': r.get('Empresa_CNPJ', ''),
                                    'Empresa_Razao_Social': r.get('Empresa_Razao_Social', ''),
                                    'Empresa_Nome_Fantasia': r.get('Empresa_Nome_Fantasia', ''),
                                    'Empresa_Situacao_Cadastral': r.get('Empresa_Situacao_Cadastral', ''),
                                    'Empresa_Logradouro': r.get('Empresa_Logradouro', ''),
                                    'Empresa_Numero': r.get('Empresa_Numero', ''),
                                    'Empresa_Complemento': r.get('Empresa_Complemento', ''),
                                    'Empresa_Bairro': r.get('Empresa_Bairro', ''),
                                    'Empresa_CEP': r.get('Empresa_CEP', ''),
                                    'Empresa_Municipio': r.get('Empresa_Municipio', ''),
                                    'Empresa_UF': r.get('Empresa_UF', ''),
                                    'Telefone_Principal': fmt,
                                    'Telefone_Secundario': fmt2 if fmt1 else '',
                                    'Tipo_Telefone': tp if fmt else 'Sem Telefone',
                                    'Link_WhatsApp': wpp,
                                    'Email': email
                                }

    print(f"  -> Total final consolidado de resgates fonéticos: {len(enriched):,} motoristas.")

    # 5. Salvar arquivos
    print("\n[5/5] Exportando bases enriquecidas (Interna e Pública LGPD)...")
    df_out = pd.DataFrame(list(enriched.values()))
    if not df_out.empty:
        df_out.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
        print(f"  => Arquivo interno salvo: {OUT_CSV} ({len(df_out):,} registros)")

        # Versão Pública Mascarada LGPD (estritamente conforme privacy.py)
        df_pub = df_out.copy()
        df_pub['Nome_Motorista'] = df_pub['Nome_Motorista'].apply(mascarar_nome)
        df_pub['Empresa_Razao_Social'] = df_pub['Empresa_Razao_Social'].apply(mascarar_nome)
        cols_drop = ['Telefone_Principal', 'Telefone_Secundario', 'Link_WhatsApp', 'Email',
                     'Empresa_Logradouro', 'Empresa_Numero', 'Empresa_Complemento']
        df_pub.drop(columns=cols_drop, inplace=True, errors='ignore')

        df_pub.to_csv(OUT_PUBLIC_CSV, sep=';', index=False, encoding='utf-8-sig')
        print(f"  => Arquivo público salvo: {OUT_PUBLIC_CSV} ({len(df_pub):,} registros)")


    print("\nResumo da Extração Fonética:")
    print(f"- Total resgatados: {len(enriched)}")
    com_wpp = sum(1 for v in enriched.values() if 'WhatsApp' in v.get('Tipo_Telefone', ''))
    com_fixo = sum(1 for v in enriched.values() if 'Fixo' in v.get('Tipo_Telefone', ''))
    contemp = sum(1 for v in enriched.values() if 'CONTEMPLADO' in str(v.get('Status_Sorteio_2026', '')))
    print(f"- Com Celular/WhatsApp: {com_wpp}")
    print(f"- Com Fixo de Voz: {com_fixo}")
    print(f"- Contemplados Titulares resgatados: {contemp}")

if __name__ == '__main__':
    main()
