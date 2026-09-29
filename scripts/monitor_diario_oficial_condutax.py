# -*- coding: utf-8 -*-
"""
scripts/monitor_diario_oficial_condutax.py
Robô Autônomo de Monitoramento Diário do Diário Oficial da Cidade de São Paulo (DOC-SP):
Varre continuamente publicações do DTP / SMT, identifica despachos de alvarás de táxi,
convocações, cassações, transferências e recursos, cruzando em tempo real com a base
de 2.140 contemplados e os 370 suplentes prioritários da Cooperativa Chame Táxi.
"""

import argparse
import datetime
import html
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
LOGS_DIR = BASE_DIR / "logs"
CACHE_FILE = DATA_DIR / "doc_contemplados_cache.json"
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
ALERT_JSON = LOGS_DIR / "alertas_novas_publicacoes_doc.json"
ALERT_TXT = LOGS_DIR / "alertas_novas_publicacoes_doc.txt"
LOG_FILE = LOGS_DIR / "monitor_doc.log"

DOC_URL = "https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=materias_pesquisar"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://diariooficial.prefeitura.sp.gov.br/",
}

# Configuração de Logs
LOGS_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DOC_Monitor")

# Configuração de Sessão HTTP com pooling
session = requests.Session()
retries = Retry(total=2, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(pool_connections=15, pool_maxsize=15, max_retries=retries)
session.mount("https://", adapter)
session.mount("http://", adapter)

def clean_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()

def load_cache():
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Erro ao ler cache do DOC: {e}")
            return {}
    return {}

def save_cache(cache):
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def search_doc_term(term: str, page_start=0):
    """Consulta matérias no Diário Oficial por termo chave."""
    data = {
        "hdnTermoPesquisa": term,
        "hdnTipoPesquisa": "Q",
        "hdnVersaoDiario": "A",
        "hdnOndePesquisa": "C",
        "hdnTipoDataPesquisa": "I",
        "hdnVisualizacao": "L",
        "hdnModoPesquisa": "AVANCADA",
        "hdnInicio": str(page_start),
    }
    try:
        r = session.post(DOC_URL, data=data, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return []
        
        blocks = re.findall(
            r'<div class="dadosDocumento">(.*?)</div>(?=<div class="dadosDocumento">|<div class="col-xs-12 col-sm-12)',
            r.text,
            re.DOTALL,
        )
        
        extracted = []
        for b in blocks:
            raw_text = clean_html(b)
            proc_match = re.search(r'class="nroSei">([^<]+)</a>\s*-\s*([^<]+)', b)
            proc_num = clean_html(proc_match.group(1)) if proc_match else ""
            assunto = clean_html(proc_match.group(2)) if proc_match else ""
            
            doc_match = re.search(
                r'href="([^"]*md_epubli_visualizar\.php[^"]*)"[^>]*class="nroSei">([^<]+)</a>\s*<span>\s*-\s*([^<]+)</span>',
                b,
            )
            doc_id = clean_html(doc_match.group(2)) if doc_match else ""
            status = clean_html(doc_match.group(3)) if doc_match else ""
            doc_url = doc_match.group(1) if doc_match else ""
            
            data_match = re.search(r'class="dataPublicacao">Publicado em ([^<]+)</span>', b)
            pub_date = clean_html(data_match.group(1)) if data_match else ""
            
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
                "resumo": raw_text[:400],
                "texto_integral": raw_text
            })
        return extracted
    except Exception as e:
        logger.error(f"Erro na consulta do termo '{term}': {e}")
        return []

def run_monitor(max_pages=5, specific_driver=None):
    logger.info("=" * 80)
    logger.info("INICIANDO EXECUÇÃO DO MONITOR DO DIÁRIO OFICIAL (DOC-SP / DTP)")
    logger.info("=" * 80)
    
    # 1. Carregar Contemplados e Suplentes da Base Mestre
    if not MASTER_CSV.exists():
        logger.error(f"Base mestre não encontrada em: {MASTER_CSV}")
        return
        
    import pandas as pd
    import unicodedata
    
    def norm_name(s):
        if not isinstance(s, str): return ''
        s = s.strip().upper()
        s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
        return ' '.join(s.split())
        
    df = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    
    # Dicionário de motoristas monitorados
    monitored_drivers = {}
    for _, r in df.iterrows():
        nome = str(r.get('Nome_Completo', '')).strip()
        nome_norm = norm_name(nome)
        st = str(r.get('Status_Sorteio_2026', ''))
        supl = str(r.get('Classificacao_Suplencia_Fila', ''))
        
        is_target = "CONTEMPLADO" in st or "Alta Probabilidade" in supl or "Média Probabilidade" in supl
        if is_target and nome_norm and len(nome_norm.split()) >= 2:
            monitored_drivers[nome_norm] = {
                'id_master': r.get('ID_Master', ''),
                'nome_original': nome,
                'status': st,
                'edital': r.get('Edital_Numero', ''),
                'pos_fila': r.get('Posicao_Fila_Espera', ''),
                'suplencia': supl,
                'telefone': r.get('Telefone_Celular_1', '—'),
                'cpf': r.get('CPF_Identificado', '—')
            }
            
    logger.info(f"Monitorando {len(monitored_drivers):,} motoristas estratégicos (Contemplados + Suplentes Prioritários).")
    
    cache = load_cache()
    logger.info(f"Cache de motoristas previamente consultados: {len(cache):,} registros.")
    
    novos_alertas = []
    
    # Caso seja consulta individual por nome
    if specific_driver:
        logger.info(f"Modo On-Demand: Consultando motorista específico: '{specific_driver}'...")
        norm_spec = norm_name(specific_driver)
        termo = f'"{specific_driver}"'
        materias = search_doc_term(termo, page_start=0)
        logger.info(f"Matérias encontradas para '{specific_driver}': {len(materias)}")
        for m in materias:
            logger.info(f"  -> Data: {m['data_publicacao']} | Proc: {m['processo_sei']} | {m['assunto']}")
        return
        
    # Varredura por Termos Institucionais do DTP
    search_queries = [
        ('"DTP" "ALVARÁ" "TÁXI"', 3),
        ('"DTP" "CONDUTAX"', 2),
        ('"DEPARTAMENTO DE TRANSPORTES PÚBLICOS" "SORTEIO"', 2),
        ('"SMT.DTP" "HOMOLOGAÇÃO"', 2)
    ]
    
    logger.info(f"Iniciando varredura por termos institucionais regulatórios...")
    total_materias_capturadas = 0
    
    for query, pages in search_queries:
        logger.info(f"Varrendo query: {query} ({pages} páginas)...")
        for p in range(pages):
            start = p * 10
            items = search_doc_term(query, page_start=start)
            total_materias_capturadas += len(items)
            
            for item in items:
                txt_upper = norm_name(item['texto_integral'])
                for m_norm, m_info in monitored_drivers.items():
                    if m_norm in txt_upper:
                        alerta = {
                            "data_deteccao": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "motorista_nome": m_info['nome_original'],
                            "id_master": m_info['id_master'],
                            "status_sorteio": m_info['status'],
                            "edital": m_info['edital'],
                            "posicao_fila": m_info['pos_fila'],
                            "telefone": m_info['telefone'],
                            "processo_sei": item['processo_sei'],
                            "assunto": item['assunto'],
                            "data_publicacao": item['data_publicacao'],
                            "doc_url": item['doc_url'],
                            "resumo_publicacao": item['resumo']
                        }
                        novos_alertas.append(alerta)
                        logger.info(f"!!! ALERTA DE NOVO DESPACHO IDENTIFICADO: {m_info['nome_original']} | Proc: {item['processo_sei']}")
            time.sleep(0.5)
            
    logger.info(f"Total de matérias institucionais analisadas: {total_materias_capturadas}")
    logger.info(f"Total de alertas com correspondência direta em motoristas monitorados: {len(novos_alertas)}")
    
    # Salvar Relatórios de Alertas
    if ALERT_JSON.exists():
        try:
            with open(ALERT_JSON, "r", encoding="utf-8") as f:
                hist_alertas = json.load(f)
        except Exception:
            hist_alertas = []
    else:
        hist_alertas = []
        
    # Unificar alertas sem duplicar processo_sei + motorista
    seen_keys = {(a.get('motorista_nome'), a.get('processo_sei')) for a in hist_alertas}
    count_novos = 0
    for na in novos_alertas:
        key = (na.get('motorista_nome'), na.get('processo_sei'))
        if key not in seen_keys:
            hist_alertas.append(na)
            seen_keys.add(key)
            count_novos += 1
            
    with open(ALERT_JSON, "w", encoding="utf-8") as f:
        json.dump(hist_alertas, f, ensure_ascii=False, indent=2)
        
    # Gerar Resumo TXT Executivo
    with open(ALERT_TXT, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("RELATÓRIO DO MONITOR DE PUBLICACÕES DO DIÁRIO OFICIAL (DOC-SP / DTP)\n")
        f.write(f"Data da Varredura: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
        f.write(f"Total de Alertas Acumulados no Sistema: {len(hist_alertas):,}\n")
        f.write(f"Novos Despachos Detectados Nesta Rodada: {count_novos:,}\n")
        f.write("=" * 80 + "\n\n")
        
        if hist_alertas:
            for idx, a in enumerate(hist_alertas[-20:], 1):
                f.write(f"[{idx}] {a['motorista_nome']} (Edital {a['edital']} - {a['status_sorteio']})\n")
                f.write(f"    Telefone: {a['telefone']} | Posição Fila: {a['posicao_fila']}\n")
                f.write(f"    Processo SEI: {a['processo_sei']} | Data Pub: {a['data_publicacao']}\n")
                f.write(f"    Assunto: {a['assunto']}\n")
                f.write(f"    Link: {a['doc_url']}\n")
                f.write(f"    Resumo: {a['resumo_publicacao']}\n\n")
        else:
            f.write("Nenhum despacho novo pendente de ação nesta rodada de monitoramento.\n")
            
    logger.info(f"Relatório de Alertas atualizado com sucesso em: {ALERT_TXT}")
    logger.info(f"Base de Alertas JSON atualizada em: {ALERT_JSON}")
    logger.info("=" * 80)
    logger.info("MONITORAMENTO FINALIZADO COM ÊXITO.")
    logger.info("=" * 80)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Robô Monitor do Diário Oficial DTP/SMT")
    parser.add_argument("--pages", type=int, default=3, help="Número de páginas a varrer por termo")
    parser.add_argument("--driver", type=str, default=None, help="Consultar motorista específico por nome")
    args = parser.parse_args()
    
    run_monitor(max_pages=args.pages, specific_driver=args.driver)
