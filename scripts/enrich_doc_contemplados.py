# -*- coding: utf-8 -*-
"""
scripts/enrich_doc_contemplados.py
Consulta automática em lote no Diário Oficial da Cidade de São Paulo (DOC)
para os motoristas contemplados nos Alvarás de 2026.
Salva incrementalmente os resultados em data/processed/doc_contemplados_cache.json
"""

import csv
import html
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_FILE = BASE_DIR / "data" / "processed" / "doc_contemplados_cache.json"
MASTER_CSV = BASE_DIR / "Novos Alvarás 2026" / "planilha_mestre_taxistas_sp_2026.csv"

DOC_URL = "https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=materias_pesquisar"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://diariooficial.prefeitura.sp.gov.br/",
}

# Configuração de Sessão com Connection Pooling e Keep-Alive
session = requests.Session()
retries = Retry(total=2, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(pool_connections=25, pool_maxsize=25, max_retries=retries)
session.mount("https://", adapter)
session.mount("http://", adapter)

def load_cache():
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def clean_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()

def query_driver_doc(name: str):
    """Consulta o Diário Oficial para um nome exato usando pooling de conexões."""
    data = {
        "hdnTermoPesquisa": f'"{name}"',
        "hdnTipoPesquisa": "Q",
        "hdnVersaoDiario": "A",
        "hdnOndePesquisa": "C",
        "hdnTipoDataPesquisa": "I",
        "hdnVisualizacao": "L",
        "hdnModoPesquisa": "AVANCADA",
        "hdnInicio": "0",
    }
    try:
        r = session.post(DOC_URL, data=data, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return name, []
        
        blocks = re.findall(
            r'<div class="dadosDocumento">(.*?)</div>(?=<div class="dadosDocumento">|<div class="col-xs-12 col-sm-12)',
            r.text,
            re.DOTALL,
        )
        
        extracted = []
        for b in blocks:
            raw_text = clean_html(b)
            # Extrair Processo SEI
            proc_match = re.search(r'class="nroSei">([^<]+)</a>\s*-\s*([^<]+)', b)
            proc_num = clean_html(proc_match.group(1)) if proc_match else ""
            assunto = clean_html(proc_match.group(2)) if proc_match else ""
            
            # Extrair Documento ID e Status
            doc_match = re.search(
                r'href="([^"]*md_epubli_visualizar\.php[^"]*)"[^>]*class="nroSei">([^<]+)</a>\s*<span>\s*-\s*([^<]+)</span>',
                b,
            )
            doc_id = clean_html(doc_match.group(2)) if doc_match else ""
            status = clean_html(doc_match.group(3)) if doc_match else ""
            doc_url = doc_match.group(1) if doc_match else ""
            
            # Extrair Data Publicação
            data_match = re.search(r'class="dataPublicacao">Publicado em ([^<]+)</span>', b)
            pub_date = clean_html(data_match.group(1)) if data_match else ""
            
            # Verificar se é SMT / DTP / Táxi
            upper_raw = raw_text.upper()
            is_dtp = any(k in upper_raw for k in ["SMT", "DTP", "TAXI", "TÁXI", "CONDUTAX", "ALVARÁ", "ALVARA"])
            
            extracted.append({
                "processo_sei": proc_num,
                "assunto": assunto,
                "documento_id": doc_id,
                "status": status,
                "doc_url": doc_url,
                "data_publicacao": pub_date,
                "is_dtp": is_dtp,
                "resumo": raw_text[:300]
            })
        return name, extracted
    except Exception as e:
        return name, []

def run_enrichment(limit=None, max_workers=6):
    print("=" * 80)
    print("ENRIQUECIMENTO AUTOMATIZADO DOS CONTEMPLADOS NO DIÁRIO OFICIAL (DOC-SP)")
    print("=" * 80)
    
    cache = load_cache()
    print(f"-> Cache carregado com {len(cache):,} motoristas já consultados.")
    
    # Carregar contemplados da planilha mestre
    import pandas as pd
    df = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    contemplados = df[df['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False)].copy()
    
    # Ordenar por Tier de Prioridade Comercial para priorizar quem mais importa
    tier_order = {
        'Tier 1 (Prioridade Máxima / Score >= 80)': 1,
        'Tier 2 (Prioridade Alta / Score 65-79)': 2,
        'Tier 3 (Prioridade Média / Score < 65)': 3
    }
    contemplados['tier_rank'] = contemplados['Tier_Prioridade_Comercial'].map(tier_order).fillna(9)
    contemplados.sort_values(by=['tier_rank', 'Score_Chame_Taxi'], ascending=[True, False], inplace=True)
    
    names_to_query = []
    for n in contemplados['Nome_Completo'].dropna().unique():
        if n not in cache:
            names_to_query.append(n)
            
    print(f"-> Total de contemplados no lote: {len(contemplados):,}")
    print(f"-> Motoristas pendentes de consulta no DOC: {len(names_to_query):,}")
    
    if limit:
        names_to_query = names_to_query[:limit]
        print(f"-> Limitando execução atual aos primeiros {limit} motoristas prioritários.")
        
    if not names_to_query:
        print("Todos os motoristas contemplados já estão no cache do DOC!")
        return
        
    total = len(names_to_query)
    completed = 0
    hits_dtp = 0
    hits_total = 0
    t0 = time.time()
    
    print(f"\nIniciando consultas concorrentes com {max_workers} threads...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(query_driver_doc, name): name for name in names_to_query}
        for future in as_completed(futures):
            name, results = future.result()
            cache[name] = results
            completed += 1
            
            if results:
                hits_total += 1
                dtp_recs = [r for r in results if r.get('is_dtp')]
                if dtp_recs:
                    hits_dtp += 1
                    proc = dtp_recs[0].get('processo_sei', '—')
                    assunto = dtp_recs[0].get('assunto', '—')
                    print(f"[{completed}/{total}] MATCH DTP: {name} -> Proc: {proc} | {assunto}")
                    
            if completed % 20 == 0 or completed == total:
                save_cache(cache)
                elapsed = time.time() - t0
                rate = completed / elapsed if elapsed > 0 else 0
                print(f"   Progresso: {completed}/{total} ({completed/total*100:.1f}%) | Hits DOC: {hits_total} | Hits DTP: {hits_dtp} | {rate:.1f} req/s")
                
    save_cache(cache)
    print("\n" + "=" * 80)
    print(f"CONCLUÍDO! {completed} motoristas consultados em {time.time()-t0:.1f}s.")
    print(f"Total no cache atualizado: {len(cache):,} motoristas.")
    print(f"Hits totais no DOC: {hits_total} | Hits específicos DTP/SMT: {hits_dtp}")
    print(f"Cache salvo em: {CACHE_FILE}")
    print("=" * 80)

if __name__ == "__main__":
    import sys
    limit_arg = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
    workers_arg = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 10
    run_enrichment(limit=limit_arg, max_workers=workers_arg)
