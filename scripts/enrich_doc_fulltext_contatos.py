# -*- coding: utf-8 -*-
"""
scripts/enrich_doc_fulltext_contatos.py
Minera o texto integral das publicações e despachos do Diário Oficial da Cidade de SP (DOC)
para os taxistas contemplados de 2026 que estão sem telefone na Planilha Mestre.
Extrai telefones, e-mails, endereços, procuradores e dados complementares de processos SEI/DTP.
"""

import html
import json
import os
import re
import sys
import time
from pathlib import Path
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
CACHE_FILE = DATA_DIR / "doc_contemplados_cache.json"
OUT_CSV = DATA_DIR / "doc_contatos_extraidos.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://diariooficial.prefeitura.sp.gov.br/",
}

session = requests.Session()
retries = Retry(total=2, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(pool_connections=15, pool_maxsize=15, max_retries=retries)
session.mount("https://", adapter)
session.mount("http://", adapter)


def clean_html_full(raw_html: str) -> str:
    if not raw_html:
        return ""
    # Remove scripts e estilos
    s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', raw_html, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    return ' '.join(s.split())


def extract_contacts_from_text(text: str):
    """Extrai telefones, emails e CEPs de um despacho administrativo."""
    phones = []
    emails = []
    ceps = []
    
    # 1. Emails
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    for em in re.findall(email_pattern, text):
        em_clean = em.strip('.').lower()
        if not any(ign in em_clean for ign in ['prefeitura.sp.gov.br', 'smdu', 'cetsp', 'imprensaoficial']):
            emails.append(em_clean)

    # 2. Telefones (padrão Brasil DDD 11 a 19 ou geral)
    # Ex: (11) 98765-4321, 11 98765-4321, 98765-4321, 2345-6789
    tel_pattern = r'(?:\b(?:\(?([1-9][0-9])\)?\s*)?([2-9][0-9]{3,4})[-.\s]?([0-9]{4})\b)'
    for m in re.finditer(tel_pattern, text):
        ddd = m.group(1) or "11"
        part1 = m.group(2)
        part2 = m.group(3)
        num = f"{part1}{part2}"
        if len(num) in (8, 9):
            # Filtra números que se parecem com CEP ou leis/decretos/datas
            context = text[max(0, m.start()-20):min(len(text), m.end()+20)].lower()
            if any(k in context for k in ['lei', 'decreto', 'artigo', 'art.', 'portaria', 'processo', 'sei', 'exercício', 'exercicio', 'ano']):
                continue
            if len(set(num)) <= 2:
                continue
            fmt = f"({ddd}) {part1}-{part2}"
            phones.append(fmt)

    # 3. CEPs
    for c in re.findall(r'\b[0-9]{5}[-.]?[0-9]{3}\b', text):
        c_clean = c.replace('.', '').replace('-', '')
        if c_clean.startswith('0'):  # CEPs de SP iniciam com 0
            ceps.append(f"{c_clean[:5]}-{c_clean[5:]}")

    # Remove duplicatas preservando ordem
    phones = list(dict.fromkeys(phones))
    emails = list(dict.fromkeys(emails))
    ceps = list(dict.fromkeys(ceps))
    
    return phones, emails, ceps


def main():
    print("=" * 80)
    print("MINERAÇÃO DE CONTATOS NO TEXTO INTEGRAL DO DIÁRIO OFICIAL (DOC-SP)")
    print("=" * 80)

    if not CACHE_FILE.exists():
        print(f"Erro: Arquivo {CACHE_FILE} não encontrado.")
        return

    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        doc_cache = json.load(f)

    print(f"-> Base de cache do DOC carregada: {len(doc_cache):,} motoristas.")

    df_m = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    cont_sem = df_m[(df_m['Status_Sorteio_2026'].astype(str).str.contains('CONTEMPLADO', na=False)) & 
                    (df_m['WhatsApp_Ativo'] == 'Não verificado')].copy()

    print(f"-> Contemplados 2026 atualmente sem telefone: {len(cont_sem):,}")

    targets = []
    for _, r in cont_sem.iterrows():
        mid = r['ID_Master']
        nome = r['Nome_Completo']
        if nome in doc_cache and len(doc_cache[nome]) > 0:
            for item in doc_cache[nome]:
                u = item.get('doc_url')
                if u:
                    targets.append({
                        'id_master': mid,
                        'nome': nome,
                        'condutax': r.get('Cadastro_DTP_Condutax', ''),
                        'processo_sei': item.get('processo_sei', ''),
                        'assunto': item.get('assunto', ''),
                        'status': item.get('status', ''),
                        'data_pub': item.get('data_publicacao', ''),
                        'is_dtp': item.get('is_dtp', False),
                        'doc_url': u
                    })

    print(f"-> Despachos oficiais do DOC identificados para análise textual: {len(targets)}")
    if not targets:
        print("Nenhum despacho pendente para análise.")
        return

    extracted_records = []
    t0 = time.time()
    success_fetches = 0
    phones_found = 0

    for i, t in enumerate(targets):
        url = t['doc_url']
        try:
            r = session.get(url, headers=HEADERS, timeout=12)
            if r.status_code == 200:
                success_fetches += 1
                full_text = clean_html_full(r.text)
                p_list, e_list, c_list = extract_contacts_from_text(full_text)
                
                if p_list or e_list or c_list:
                    rec = {
                        'ID_Master': t['id_master'],
                        'Nome_Motorista': t['nome'],
                        'Condutax': t['condutax'],
                        'Processo_SEI': t['processo_sei'],
                        'Assunto': t['assunto'],
                        'Data_Publicacao': t['data_pub'],
                        'Telefones_Extraidos': " | ".join(p_list),
                        'Emails_Extraidos': " | ".join(e_list),
                        'CEPs_Extraidos': " | ".join(c_list),
                        'URL_DOC': url
                    }
                    extracted_records.append(rec)
                    if p_list:
                        phones_found += 1
                        print(f"  [{i+1}/{len(targets)}] ACHADO: {t['nome']} -> Tel: {p_list}")
            else:
                pass
        except Exception as e:
            pass
        time.sleep(0.1)

    print(f"\nVarredura textual concluída em {time.time()-t0:.1f}s!")
    print(f"Páginas analisadas com sucesso: {success_fetches}/{len(targets)}")
    print(f"Despachos com dados de contato/endereço: {len(extracted_records)}")
    print(f"Despachos com telefones novos: {phones_found}")

    if extracted_records:
        df_out = pd.DataFrame(extracted_records)
        df_out.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
        print(f"-> Relatório exportado com sucesso: {OUT_CSV}")


if __name__ == '__main__':
    main()
