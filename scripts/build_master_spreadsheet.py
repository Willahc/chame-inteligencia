# -*- coding: utf-8 -*-
"""
=============================================================================
PIPELINE DE CONSOLIDAÇÃO DA PLANILHA MESTRE DE MOTORISTAS DE TÁXI SP
COM DADOS MÁXIMOS DE LOCALIZAÇÃO E ENRIQUECIMENTO CADASTRAL
=============================================================================
Autor: Senior Data Scientist
Objetivo: Integrar e estruturar todos os dados disponíveis sobre motoristas
de táxi no município de São Paulo, maximizando os atributos de identificação,
desambiguação de homônimos e rastreamento em ferramentas de bureau de dados,
Receita Federal, Diário Oficial da Cidade e sistemas municipais da PMSP.
=============================================================================
"""

import os
import sys
import io
import re
import math
import json
import urllib.parse
import unicodedata
import pandas as pd
import numpy as np
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def clean_val(val):
    if pd.isna(val):
        return ""
    s = str(val).strip()
    return "" if s in ["—", "nan", "None", "null", "NaN", "Não localizado"] else s

def norm_name(s):
    if not isinstance(s, str):
        return ""
    s = s.strip().upper()
    s = "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return " ".join(s.split())

def norm_digits(s):
    if pd.isna(s):
        return ""
    return re.sub(r'\D', '', str(s))

def clean_mei_thorough(s):
    s = norm_name(s)
    s = re.sub(r'^[0-9\.\-\/\s]+', '', s)
    s = re.sub(r'[0-9\.\-\/\s]+$', '', s)
    sufs = [
        ' TRANSPORTE DE TAXI', ' SERVICOS DE TAXI', ' AUTO TAXI', ' TAXISTA', ' TAXIS',
        ' TRANSPORTES', ' TRANSPORTE', ' TAXI', ' LOCACAO', ' EIRELI', ' LTDA', ' ME', ' MEI', ' EPP'
    ]
    changed = True
    while changed:
        changed = False
        s = s.strip()
        for suf in sufs:
            if s.endswith(suf):
                s = s[:-len(suf)].strip()
                changed = True
    return s.strip()

def clean_mei_name(s):
    return clean_mei_thorough(s)

def format_cpf(digits):
    d = re.sub(r'\D', '', str(digits))
    if len(d) == 11:
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"
    return ""

CHAME_TAXI_LAT = -23.5715
CHAME_TAXI_LON = -46.7082

CEP_GEO_MAP = {
    '01': (-23.5505, -46.6333, 'Centro'),
    '020': (-23.4980, -46.6260, 'Zona Norte (Santana)'),
    '021': (-23.4980, -46.6260, 'Zona Norte (Vila Maria)'),
    '022': (-23.4980, -46.6260, 'Zona Norte (Tucuruvi)'),
    '023': (-23.4700, -46.6000, 'Zona Norte (Tremembé)'),
    '024': (-23.4800, -46.6400, 'Zona Norte (Mandaqui)'),
    '025': (-23.4900, -46.6700, 'Zona Norte (Casa Verde)'),
    '026': (-23.4600, -46.6600, 'Zona Norte (Cachoeirinha)'),
    '027': (-23.4900, -46.6900, 'Zona Norte (Freguesia do Ó)'),
    '028': (-23.4600, -46.7000, 'Zona Norte (Brasilândia)'),
    '029': (-23.4700, -46.7400, 'Zona Norte (Pirituba)'),
    '030': (-23.5350, -46.6000, 'Zona Leste (Brás/Pari)'),
    '031': (-23.5600, -46.5900, 'Zona Leste (Mooca)'),
    '032': (-23.5900, -46.5600, 'Zona Leste (Vila Prudente)'),
    '033': (-23.5500, -46.5600, 'Zona Leste (Tatuapé)'),
    '034': (-23.5400, -46.5300, 'Zona Leste (Carrão)'),
    '035': (-23.5400, -46.5000, 'Zona Leste (Aricanduva)'),
    '036': (-23.5200, -46.5100, 'Zona Leste (Penha)'),
    '037': (-23.5000, -46.5000, 'Zona Leste (Cangaíba)'),
    '038': (-23.4900, -46.4700, 'Zona Leste (Ermelino Matarazzo)'),
    '039': (-23.5800, -46.4900, 'Zona Leste (São Mateus)'),
    '040': (-23.5950, -46.6500, 'Zona Sul (Vila Mariana/Moema)'),
    '041': (-23.6100, -46.6200, 'Zona Sul (Saúde/Ipiranga)'),
    '042': (-23.6000, -46.5900, 'Zona Sul (Sacomã)'),
    '043': (-23.6500, -46.6400, 'Zona Sul (Jabaquara)'),
    '044': (-23.6800, -46.6400, 'Zona Sul (Cidade Ademar)'),
    '045': (-23.5900, -46.6800, 'Zona Sul (Itaim Bibi/Brooklin)'),
    '046': (-23.6300, -46.6800, 'Zona Sul (Campo Belo)'),
    '047': (-23.6500, -46.7000, 'Zona Sul (Santo Amaro)'),
    '048': (-23.7300, -46.6900, 'Zona Sul (Grajaú/Interlagos)'),
    '049': (-23.7000, -46.7500, 'Zona Sul (M\'Boi Mirim)'),
    '050': (-23.5250, -46.6850, 'Zona Oeste (Lapa/Perdizes)'),
    '051': (-23.5000, -46.7300, 'Zona Oeste (Pirituba/Jaraguá)'),
    '052': (-23.4300, -46.7800, 'Zona Oeste (Perus/Anhanguera)'),
    '053': (-23.5500, -46.7400, 'Zona Oeste (Butantã/Jaguaré)'),
    '054': (-23.5600, -46.6900, 'Zona Oeste (Pinheiros)'),
    '055': (-23.5750, -46.7200, 'Zona Oeste (Butantã)'),
    '056': (-23.6000, -46.7200, 'Zona Oeste (Morumbi)'),
    '057': (-23.6200, -46.7500, 'Zona Oeste (Campo Limpo)'),
    '058': (-23.6500, -46.7700, 'Zona Oeste (Capão Redondo)'),
    '06': (-23.5320, -46.7920, 'Metropolitana Oeste (Osasco/Região)'),
    '08': (-23.5400, -46.4200, 'Extremo Leste (Itaquera/Tiradentes)')
}

def haversine_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_mei_geo_info(cep_str, bairro_str):
    cep_digits = re.sub(r'\D', '', str(cep_str or ''))
    b_norm = norm_name(str(bairro_str or ''))
    
    lat, lon, reg = None, None, "São Paulo / Capital"
    for pref_len in [3, 2]:
        p = cep_digits[:pref_len]
        if p in CEP_GEO_MAP:
            lat, lon, reg = CEP_GEO_MAP[p]
            break
            
    if any(k in b_norm for k in ['BUTANTA', 'BONFIGLIOLI', 'RIO PEQUENO', 'CAXINGUI', 'VILA SONIA']):
        lat, lon = -23.5730, -46.7150
        reg = "Zona Oeste (Butantã)"
    elif any(k in b_norm for k in ['PINHEIROS', 'VILA MADALENA', 'SUMAREZINHO']):
        lat, lon = -23.5610, -46.6920
        reg = "Zona Oeste (Pinheiros)"
    elif any(k in b_norm for k in ['MORUMBI', 'PANAMBY', 'REAL PARQUE']):
        lat, lon = -23.6020, -46.7120
        reg = "Zona Oeste (Morumbi)"

    dist = haversine_distance(CHAME_TAXI_LAT, CHAME_TAXI_LON, lat, lon) if (lat and lon) else None
    return dist, reg

def get_vehicle_rules(edital_num, categoria_str=""):
    ed = str(edital_num or "").replace('.0', '').strip()
    cat = str(categoria_str or "").upper()
    
    if ed == "4" or "HÍBRIDO" in cat or "ELETRICO" in cat or "ELÉTRICO" in cat:
        return (
            "Obrigatório: Motorização 100% Elétrica (BEV) ou Híbrida (HEV / PHEV) homologada pelo DTP. Zero ou baixas emissões.",
            "Toyota Corolla Hybrid, Corolla Cross Hybrid, BYD Dolphin, BYD Dolphin Plus, BYD Yuan Pro, Nissan Leaf, GWM Haval H6 HEV, Renault Megane E-Tech",
            "90 dias corridos após publicação da homologação definitiva DTP"
        )
    elif ed in ["6", "7", "8"] or "ACESSÍVEL" in cat or "ACESSIBEL" in cat:
        return (
            "Obrigatório: Veículo Táxi Acessível com rampa ou elevador veicular para cadeira de rodas, certificado Inmetro e homologação DTP.",
            "Chevrolet Spin Adaptada Acessível, Fiat Doblò Acessível, Renault Kangoo Acessível, Renault Master Acessível",
            "120 dias corridos para apresentação e vistoria do laudo de acessibilidade Inmetro"
        )
    elif ed == "1":
        return (
            "Táxi Comum PcD: 4 portas, ar-condicionado, até 10 anos de fabricação, com adaptação veicular de direção homologada Detran/DTP.",
            "Chevrolet Spin, Toyota Corolla, Nissan Versa, Fiat Cronos, VW Virtus, Honda City",
            "90 dias corridos após convocação DTP"
        )
    elif ed in ["2", "3", "5"]:
        return (
            "Táxi Comum: Mínimo 4 portas, ar-condicionado, capacidade mínima para 5 ocupantes, até 10 anos de fabricação.",
            "Chevrolet Spin, Toyota Corolla, Nissan Versa, Fiat Cronos, VW Virtus, Renault Logan",
            "90 dias corridos a contar da publicação do termo de outorga"
        )
    else:
        return (
            "Conforme regras da categoria pretendida (Portaria DTP 038/2018).",
            "Veículos homologados DTP com até 10 anos de fabricação",
            "Prazo regulatório padrão DTP"
        )

def compute_conversion_score(status_sorteio, edital_num, categoria_veic, suplencia_status,
                             pos_fila_num, dist_km, regiao_macro, vinculo_ponto,
                             tel1, tel2, cpf, cnpj, proc_sei, possui_doc,
                             tempo_anos, decada_entrada, tipo_ato=""):
    score = 0
    reasons = []

    st_upper = str(status_sorteio or "").upper()
    ed_str = str(edital_num or "").replace('.0', '').strip()
    cat_upper = str(categoria_veic or "").upper()
    supl_str = str(suplencia_status or "")
    
    # 1. Momento & Urgência DTP (Até 35 pts)
    if "CONTEMPLADO" in st_upper:
        if ed_str == "4" or "HÍBRIDO" in cat_upper or "ELETRIC" in cat_upper or "ELÉTRIC" in cat_upper:
            score += 35
            reasons.append("Contemplado Ed.4 Híbrido/Elétrico (Alta Dor Compra/DTP)")
        elif ed_str in ["6", "7", "8"] or "ACESS" in cat_upper:
            score += 35
            reasons.append("Contemplado Acessível PcD (Demanda Vouchers Especiais)")
        elif ed_str == "3":
            score += 33
            reasons.append("Contemplada Ed.3 Mulheres (Adesão a Rádio/App Seguro)")
        else:
            score += 30
            reasons.append(f"Contemplado Titular Ed.{ed_str or 'Geral'} (Prazo 90 dias ativo)")
    elif "Alta Probabilidade" in supl_str:
        score += 25
        reasons.append("Suplente Alta Probabilidade (Dentro da Margem de Desistência DTP)")
    elif "Média Probabilidade" in supl_str or "Media Probabilidade" in supl_str:
        score += 15
        reasons.append("Suplente Média Probabilidade de Convocação")
    elif st_upper == "ESPERA":
        score += 8
        reasons.append("Inscrito na Fila Geral de Espera")
    elif "TRANSFERÊNCIA" in str(tipo_ato).upper():
        score += 20
        reasons.append("Processo de Transferência no DTP (Ativo)")
    elif "DOC" in st_upper:
        score += 12
        reasons.append("Taxista com publicação oficial recente no DOC")
    else:
        score += 5
        reasons.append("Cadastro Regular")

    # 2. Proximidade Sede Butantã (Até 25 pts)
    dist_val = None
    if dist_km is not None and str(dist_km).strip() not in ['', '—', 'nan']:
        try:
            dist_val = float(str(dist_km).replace(',', '.'))
        except Exception:
            pass

    if dist_val is not None:
        if dist_val <= 3.5:
            score += 25
            reasons.append(f"Raio Imediato Sede ({dist_val:.1f} km - Butantã/Pinheiros/USP)")
        elif dist_val <= 7.0:
            score += 20
            reasons.append(f"Raio Curto ({dist_val:.1f} km - Zona Oeste/Lapa)")
        elif dist_val <= 12.0:
            score += 14
            reasons.append(f"Raio Médio ({dist_val:.1f} km - Centro Expandido/Sudoeste)")
        elif dist_val <= 20.0:
            score += 8
            reasons.append(f"Raio Amplo ({dist_val:.1f} km da Sede)")
        else:
            score += 3
            reasons.append(f"Distância > 20 km ({dist_val:.1f} km)")
    else:
        reg_upper = str(regiao_macro or "").upper()
        if "OESTE" in reg_upper:
            score += 18
            reasons.append("Pólo Zona Oeste / Butantã")
        elif "CENTRO" in reg_upper or "SUL" in reg_upper:
            score += 10
            reasons.append(f"Pólo {regiao_macro}")
        else:
            score += 2

    # 3. Dependência de Rádio Táxi / Ponto (Até 20 pts)
    vinc_upper = str(vinculo_ponto or "").upper()
    if any(k in vinc_upper for k in ['ÓRFÃO', 'ORFAO', 'TENTOU', 'PONTO LIVRE']):
        score += 20
        reasons.append("Ponto Livre / Órfão de Sorteio (Necessita 100% de App e Rádio)")
    elif vinc_upper and vinc_upper != '—' and 'SEM' not in vinc_upper and 'NÃO' not in vinc_upper:
        score += 12
        reasons.append("Ponto Privativo (Busca faturamento complementar corporativo)")
    else:
        score += 8

    # 4. Acionabilidade do Contato & Documentação (Até 15 pts)
    t1_clean = re.sub(r'\D', '', str(tel1 or ''))
    t2_clean = re.sub(r'\D', '', str(tel2 or ''))
    has_cel = len(t1_clean) in [10, 11] or len(t2_clean) in [10, 11]
    if has_cel:
        score += 10
        reasons.append("WhatsApp/Celular direto validado em 1 clique")

    has_cpf = cpf and str(cpf).strip() not in ['', '—', 'nan']
    has_cnpj = cnpj and str(cnpj).strip() not in ['', '—', 'nan']
    if has_cpf or has_cnpj:
        score += 3
        reasons.append("MEI/CPF formalizado na Receita Federal")

    has_sei = proc_sei and str(proc_sei).strip() not in ['', '—', 'nan']
    has_doc = str(possui_doc or '').upper() == 'SIM' or 'SIM' in str(possui_doc or '').upper()
    if has_sei or has_doc:
        score += 2
        reasons.append("Processo SEI / Diário Oficial localizado")

    # 5. Experiência e Fit Cultural (Até 5 pts)
    anos_val = None
    if tempo_anos is not None and str(tempo_anos).strip() not in ['', '—', 'nan']:
        try:
            anos_val = float(str(tempo_anos).replace(',', '.'))
        except Exception:
            pass

    if anos_val is not None:
        if anos_val >= 15:
            score += 5
            reasons.append(f"Veterano Sênior ({anos_val:.0f} anos de praça)")
        elif anos_val >= 5:
            score += 3
            reasons.append(f"Motorista Experiente ({anos_val:.0f} anos de praça)")
        else:
            score += 2
    else:
        dec = str(decada_entrada or '')
        if any(d in dec for d in ['1980', '1990', '2000']):
            score += 4
            reasons.append(f"Início histórico ({dec})")
        else:
            score += 2

    # Clamping 0 a 100
    score = min(100, max(0, score))

    if score >= 80:
        tier = "Tier 1 (Prioridade Máxima / Score >= 80)"
    elif score >= 65:
        tier = "Tier 2 (Prioridade Alta / Score 65-79)"
    elif score >= 50:
        tier = "Tier 3 (Prioridade Média / Score 50-64)"
    else:
        tier = "Tier 4 (Base Ampla / Score < 50)"

    justificativa = " | ".join(reasons)
    return score, tier, justificativa

def build_master():
    print("=" * 80)
    print("INICIANDO CONSTRUÇÃO DA PLANILHA MESTRE COM DADOS MÁXIMOS DE LOCALIZAÇÃO")
    print("=" * 80)

    # 1. Caminhos das Bases
    path_alv = r'Novos Alvarás 2026\alvaras_taxi_sp_2026_consolidado.csv'
    path_layout = r'Novos Alvarás 2026\layout_enriquecimento_contemplados_2140.csv'
    path_ranking = r'Novos Alvarás 2026\ranking_alvos_chame_taxi_contemplados.csv'
    path_meis_butanta = r'Novos Alvarás 2026\base_meis_taxi_butanta_zona_oeste.csv'
    path_rf = r'data\processed\taxistas_sp_cnae_receita_2026-09-14.csv'
    path_do = r'data\processed\diario_oficial_taxistas_sp_2026.csv'
    path_cat_pontos = r'Novos Alvarás 2026\catalogo_pontos_completo.csv'
    path_pontos_geo = r'data\processed\pontos_taxi_sp_consolidado.csv'
    path_insc_pontos = r'Novos Alvarás 2026\inscritos_sorteios_pontos_consolidado.csv'
    path_res_pontos = r'Novos Alvarás 2026\resultados_sorteios_pontos.csv'
    path_polos = r'data\processed\polos_formacao_taxistas_cfc_dtp.csv'
    path_plano = r'Novos Alvarás 2026\plano_prospeccao_territorial_taxistas_2026.csv'
    path_osm_sem_dtp = r'data\processed\osm_pontos_sem_dtp.csv'

    print("Carregando bases do projeto...")
    alv = pd.read_csv(path_alv, sep=';', encoding='utf-8-sig', low_memory=False)
    layout = pd.read_csv(path_layout, sep=';', encoding='utf-8-sig', low_memory=False)
    ranking = pd.read_csv(path_ranking, sep=';', encoding='utf-8-sig', low_memory=False)
    meis_butanta = pd.read_csv(path_meis_butanta, sep=';', encoding='utf-8-sig', low_memory=False)
    do_df = pd.read_csv(path_do, sep=';', encoding='utf-8-sig', low_memory=False)
    cat_pontos = pd.read_csv(path_cat_pontos, sep=';', encoding='utf-8-sig', low_memory=False)
    pontos_geo = pd.read_csv(path_pontos_geo, sep=';', encoding='utf-8-sig', low_memory=False)
    insc_pontos = pd.read_csv(path_insc_pontos, sep=';', encoding='utf-8-sig', low_memory=False)
    res_pontos = pd.read_csv(path_res_pontos, sep=';', encoding='utf-8-sig', low_memory=False)
    polos_df = pd.read_csv(path_polos, sep=';', encoding='utf-8-sig', low_memory=False)
    plano_df = pd.read_csv(path_plano, sep=';', encoding='utf-8-sig', low_memory=False)
    osm_sem_dtp = pd.read_csv(path_osm_sem_dtp, sep=';', encoding='utf-8-sig', low_memory=False)

    print(f"-> Alvarás 2026: {len(alv):,} registros")
    print(f"-> Contemplados 2026: {len(layout):,} registros")
    print(f"-> Ranking Alvos Comerciais: {len(ranking):,} registros")
    print(f"-> MEIs Butantã: {len(meis_butanta):,} registros")
    print(f"-> Diário Oficial DOC: {len(do_df):,} despachos")
    print(f"-> Catálogo de Pontos: {len(cat_pontos):,} pontos")
    print(f"-> Histórico Sorteio Pontos: {len(insc_pontos):,} registros")

    # 2. Indexando dados da Receita Federal (MEIs com e sem sufixo)
    print("\nIndexando base do CNPJ da Receita Federal para cruzamento...")
    rf_map = {}
    cpf_pattern = re.compile(r'\b(\d{11})\b')
    if os.path.exists(path_rf):
        df_rf = pd.read_csv(path_rf, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, r in df_rf.iterrows():
            raw_rz = str(r.get('RAZAO_SOCIAL', ''))
            raw_nf = str(r.get('NOME_FANTASIA', ''))
            c1 = clean_mei_thorough(raw_rz)
            c2 = clean_mei_thorough(raw_nf)
            n1 = norm_name(raw_rz)
            n2 = norm_name(raw_nf)
            
            m = cpf_pattern.search(raw_rz)
            r_data = r.to_dict()
            r_data['CPF_EXTRAIDO'] = m.group(1) if m else ""

            for k in [c1, c2, n1, n2]:
                if k and len(k.split()) >= 2 and k not in rf_map:
                    rf_map[k] = r_data
        print(f"-> CNPJs da Receita Federal mapeados (Razão + Fantasia): {len(rf_map):,} empresas.")

    # 3. Indexando tabelas auxiliares
    print("\nIndexando tabelas auxiliares...")
    layout_map = {}
    for _, r in layout.iterrows():
        k = (int(r['Edital_Numero']), int(r['Numero_Protocolo']))
        layout_map[k] = r

    ranking_map = {}
    for _, r in ranking.iterrows():
        k = (int(r['Edital_Numero']), int(r['Numero_Protocolo']))
        ranking_map[k] = r

    meis_butanta_map = {}
    for _, r in meis_butanta.iterrows():
        k = norm_name(r['Titular_Nome'])
        if k:
            meis_butanta_map[k] = r

    pontos_map = {}
    for _, r in cat_pontos.iterrows():
        pid = norm_digits(r['ponto_id'])
        if pid:
            pontos_map[pid] = r

    # Histórico de Sorteio de Pontos Privativos (por condutax)
    pontos_sorteio_merged = pd.merge(
        insc_pontos, res_pontos,
        on=['edital_ponto', 'protocolo_ponto', 'numero_ponto'],
        how='left', suffixes=('', '_res')
    )
    if 'numero_alvara_res' in pontos_sorteio_merged.columns and 'numero_alvara' in pontos_sorteio_merged.columns:
        pontos_sorteio_merged['numero_alvara'] = pontos_sorteio_merged['numero_alvara'].combine_first(pontos_sorteio_merged['numero_alvara_res'])
        pontos_sorteio_merged.drop(columns=['numero_alvara_res'], inplace=True, errors='ignore')

    pontos_sorteio_by_condutax = {}
    for _, r in pontos_sorteio_merged.iterrows():
        c_raw = norm_digits(r['condutax_raw'])
        if c_raw and c_raw not in pontos_sorteio_by_condutax:
            pontos_sorteio_by_condutax[c_raw] = r

    # Diário Oficial indexado por nome e condutax
    do_by_name = {}
    do_by_condutax = {}
    for _, r in do_df.iterrows():
        n = norm_name(r['nome_motorista'])
        c = norm_digits(r['condutax_num'])
        if n and n not in do_by_name:
            do_by_name[n] = r
        if c and c not in do_by_condutax:
            do_by_condutax[c] = r

    # Diário Oficial: Cache de Varredura em Lote (Contemplados 2026)
    path_doc_cache = r'data\processed\doc_contemplados_cache.json'
    doc_cache = {}
    if os.path.exists(path_doc_cache):
        try:
            with open(path_doc_cache, 'r', encoding='utf-8') as f:
                doc_cache = json.load(f)
            print(f"-> Cache de varredura do DOC carregado: {len(doc_cache):,} motoristas consultados.")
        except Exception:
            pass

    # 4. Construindo Registros Mestre com Identificadores Máximos
    print("\nConsolidando motoristas e gerando identificadores e atributos de localização...")
    master_rows = []
    seen_alv_names = set()
    seen_alv_condutax = set()

    for idx, row in alv.iterrows():
        edital_num = int(row['Edital_Numero'])
        protocolo = int(row['Numero_Protocolo'])
        nome_cand = str(row['Nome_Candidato']).strip()
        nome_norm = norm_name(nome_cand)
        condutax_orig = clean_val(row.get('Cadastro_DTP_Condutax', ''))
        condutax_dig = norm_digits(condutax_orig)

        if nome_norm:
            seen_alv_names.add(nome_norm)
        if condutax_dig:
            seen_alv_condutax.add(condutax_dig)

        lk_key = (edital_num, protocolo)
        lay_rec = layout_map.get(lk_key)
        rnk_rec = ranking_map.get(lk_key)
        mei_bt_rec = meis_butanta_map.get(nome_norm)
        mei_rf_rec = rf_map.get(nome_norm) if mei_bt_rec is None else None
        do_rec = do_by_name.get(nome_norm)
        if do_rec is None and condutax_dig:
            do_rec = do_by_condutax.get(condutax_dig)
        doc_cached_list = doc_cache.get(nome_cand) or doc_cache.get(nome_norm)
        ponto_sort_rec = pontos_sorteio_by_condutax.get(condutax_dig) if condutax_dig else None

        id_master = f"MST-ALV-{idx+1:05d}"
        origem_principal = "Sorteio de Alvarás 2026"

        bases_presentes = ["Alvarás 2026"]
        if lay_rec is not None:
            bases_presentes.append("Contemplados 2026")
        if rnk_rec is not None:
            bases_presentes.append("Ranking Comercial Chame Táxi")
        if mei_bt_rec is not None:
            bases_presentes.append("MEI Zona Oeste (Butantã)")
        elif mei_rf_rec is not None:
            bases_presentes.append("MEI Receita Federal (CNAE SP)")
        if do_rec is not None or (doc_cached_list and len(doc_cached_list) > 0):
            bases_presentes.append("Diário Oficial 2026")
        if ponto_sort_rec is not None or clean_val(row.get('Vinculo_Ponto_Privativo', '')) != "Ponto Livre / Sem Ponto Privativo":
            bases_presentes.append("Sorteio de Pontos DTP")

        # Particionamento de Nomes
        partes = nome_cand.split()
        primeiro_nome = partes[0] if partes else ""
        sobrenome_restante = " ".join(partes[1:]) if len(partes) > 1 else ""
        ultimo_sobrenome = partes[-1] if len(partes) > 1 else ""

        # Tempo de serviço e estimativa de idade
        ts_val = clean_val(row.get('Tempo_Servico_Anos', ''))
        ts = float(ts_val) if ts_val and ts_val != '—' else 0.0

        if ts > 0:
            idade_min = int(21 + ts)
            ano_max = int(2026 - ts - 21)
            ano_min = int(max(ano_max - 35, 1935))
        else:
            idade_min = 21
            ano_max = 2003
            ano_min = 1945

        # Dados de Contato e Enriquecimento
        segmento_comercial = ""
        tel_1 = ""
        tel_2 = ""
        whatsapp_ativo = "Não verificado"
        email_principal = ""
        bairro_res = ""
        cep = ""
        municipio = "São Paulo"
        uf = "SP"
        status_enriq = "Base Pública Bruta"

        if lay_rec is not None:
            segmento_comercial = clean_val(lay_rec.get('Segmento_Comercial', ''))
            tel_1 = clean_val(lay_rec.get('Telefone_Celular_1', ''))
            tel_2 = clean_val(lay_rec.get('Telefone_Celular_2', ''))
            whatsapp_ativo = clean_val(lay_rec.get('WhatsApp_Ativo', 'Não verificado'))
            email_principal = clean_val(lay_rec.get('Email_Principal', ''))
            bairro_res = clean_val(lay_rec.get('Bairro_Residencial', ''))
            cep = clean_val(lay_rec.get('CEP', ''))
            status_enriq = "Pendente Bureau (Layout Pronto)"

        # Enriquecimento com MEI / Receita Federal
        possui_mei = "Não"
        mei_origem = "Não localizado"
        mei_cnpj = ""
        mei_razao = ""
        mei_fantasia = ""
        mei_situacao = ""
        mei_abertura = ""
        dist_calc = None
        reg_calc = "Não aplicável"
        mei_distancia = ""
        mei_regiao_macro = "Não aplicável"
        mei_logradouro = ""
        mei_numero = ""
        mei_bairro = ""
        mei_cep = ""

        if mei_bt_rec is not None:
            possui_mei = "Sim"
            mei_origem = "Zona Oeste Butantã (Presencial)"
            mei_cnpj = clean_val(mei_bt_rec.get('CNPJ', ''))
            mei_razao = clean_val(mei_bt_rec.get('Razao_Social', ''))
            mei_fantasia = clean_val(mei_bt_rec.get('Nome_Fantasia', ''))
            mei_situacao = clean_val(mei_bt_rec.get('Situacao_Cadastral', ''))
            mei_abertura = clean_val(mei_bt_rec.get('Data_Abertura', ''))
            mei_distancia = clean_val(mei_bt_rec.get('Distancia_Sede_Chame_Taxi_km', ''))
            try:
                dist_calc = float(mei_distancia.replace(',', '.'))
            except Exception:
                dist_calc = None
            mei_regiao_macro = "Zona Oeste (Butantã)"
            mei_logradouro = clean_val(mei_bt_rec.get('Logradouro', ''))
            mei_numero = clean_val(mei_bt_rec.get('Numero', ''))
            mei_bairro = clean_val(mei_bt_rec.get('Bairro', ''))
            mei_cep = clean_val(mei_bt_rec.get('CEP', ''))
            if not tel_1:
                tel_1 = f"({clean_val(mei_bt_rec.get('DDD_1','11'))}) {clean_val(mei_bt_rec.get('Telefone_1',''))}"
            whatsapp_ativo = clean_val(mei_bt_rec.get('WhatsApp_Provavel', 'Sim'))
            if not email_principal:
                email_principal = clean_val(mei_bt_rec.get('Email', ''))
            if not bairro_res:
                bairro_res = mei_bairro
            if not cep:
                cep = mei_cep
            status_enriq = "Enriquecido (MEI Zona Oeste / Butantã)"
        elif mei_rf_rec is not None:
            eh_mei = mei_rf_rec.get('EH_EMPRESARIO_INDIVIDUAL_MEI') == 'SIM'
            possui_mei = "Sim" if eh_mei else "Sim (LTDA/Empresa)"
            mei_origem = "Receita Federal CNPJ Aberto (MEI)" if eh_mei else "Receita Federal CNPJ Aberto (LTDA/Outros)"
            mei_cnpj = clean_val(mei_rf_rec.get('CNPJ', ''))
            mei_razao = clean_val(mei_rf_rec.get('RAZAO_SOCIAL', ''))
            mei_fantasia = clean_val(mei_rf_rec.get('NOME_FANTASIA', ''))
            mei_situacao = clean_val(mei_rf_rec.get('SITUACAO_CADASTRAL', ''))
            mei_abertura = clean_val(mei_rf_rec.get('DATA_INICIO_ATIVIDADE', ''))
            mei_logradouro = clean_val(mei_rf_rec.get('LOGRADOURO', ''))
            mei_numero = clean_val(mei_rf_rec.get('NUMERO', ''))
            mei_bairro = clean_val(mei_rf_rec.get('BAIRRO', ''))
            mei_cep = clean_val(mei_rf_rec.get('CEP', ''))
            dist_calc, reg_calc = get_mei_geo_info(mei_cep, mei_bairro)
            if dist_calc is not None:
                mei_distancia = f"{dist_calc:.2f}".replace('.', ',')
            mei_regiao_macro = reg_calc
            t1 = clean_val(mei_rf_rec.get('TELEFONE_1', ''))
            if t1 and not tel_1:
                tel_1 = t1
            t2 = clean_val(mei_rf_rec.get('TELEFONE_2', ''))
            if t2 and not tel_2:
                tel_2 = t2
            em = clean_val(mei_rf_rec.get('CORREIO_ELETRONICO', ''))
            if em and not email_principal:
                email_principal = em
            if not bairro_res and mei_bairro:
                bairro_res = mei_bairro
            if not cep and mei_cep:
                cep = mei_cep
            status_enriq = "Enriquecido (Receita Federal CNAE)"

        # Extração de CPF se identificado
        cpf_identificado = ""
        if mei_rf_rec is not None:
            cpf_raw = clean_val(mei_rf_rec.get('CPF_EXTRAIDO', ''))
            if cpf_raw:
                cpf_identificado = format_cpf(cpf_raw)

        # Diário Oficial
        possui_doc = "Sim" if do_rec is not None else "Não"
        doc_data_pub = ""
        doc_tipo_ato = ""
        doc_categoria = ""
        doc_status = ""
        doc_cedente = ""
        doc_alvara = ""
        doc_url = ""
        doc_resumo = ""
        proc_sei_dtp = clean_val(row.get('Processo_SEI_DTP', ''))

        if do_rec is not None:
            doc_data_pub = clean_val(do_rec.get('data_publicacao', ''))
            doc_tipo_ato = clean_val(do_rec.get('tipo_ato', ''))
            doc_categoria = clean_val(do_rec.get('categoria', ''))
            doc_status = clean_val(do_rec.get('status', ''))
            doc_cedente = clean_val(do_rec.get('cedente_anterior', ''))
            doc_alvara = clean_val(do_rec.get('alvara_num', ''))
            doc_url = clean_val(do_rec.get('doc_url', ''))
            doc_resumo = clean_val(do_rec.get('resumo_texto', ''))
            if not status_enriq.startswith("Enriquecido"):
                status_enriq = "Enriquecido (Publicação DOC 2026)"
        elif doc_cached_list and isinstance(doc_cached_list, list) and len(doc_cached_list) > 0:
            dtp_acts = [x for x in doc_cached_list if x.get('is_dtp')]
            chosen_act = dtp_acts[0] if dtp_acts else doc_cached_list[0]
            possui_doc = "Sim (Consulta DOC)"
            doc_data_pub = clean_val(chosen_act.get('data_publicacao', ''))
            doc_tipo_ato = clean_val(chosen_act.get('assunto', ''))
            doc_status = clean_val(chosen_act.get('status', ''))
            doc_url = clean_val(chosen_act.get('doc_url', ''))
            doc_resumo = clean_val(chosen_act.get('resumo', ''))
            if chosen_act.get('processo_sei') and not proc_sei_dtp:
                proc_sei_dtp = chosen_act.get('processo_sei')
            if not status_enriq.startswith("Enriquecido"):
                status_enriq = "Enriquecido (Despacho DOC Encontrado)"

        # Histórico de Sorteio de Pontos / Alvará e Termo de Permissão
        part_sort_pontos = "Sim" if ponto_sort_rec is not None else ("Sim" if "Tentou Sorteio" in clean_val(row.get('Vinculo_Ponto_Privativo', '')) else "Não")
        sort_alvara_hist = ""
        sort_protocolo = ""
        sort_status = ""
        sort_ranking_nf = ""
        sort_ranking_ponto = ""
        sort_tp = ""
        if ponto_sort_rec is not None:
            sort_alvara_hist = clean_val(ponto_sort_rec.get('numero_alvara', ''))
            sort_protocolo = clean_val(ponto_sort_rec.get('protocolo_ponto', ''))
            sort_status = clean_val(ponto_sort_rec.get('status_ponto', ''))
            sort_ranking_nf = clean_val(ponto_sort_rec.get('ranking_nf', ''))
            sort_ranking_ponto = clean_val(ponto_sort_rec.get('ranking_ponto', ''))
            sort_tp = clean_val(ponto_sort_rec.get('termo_permissao', ''))

        # Alvará consolidado (DOC ou Sorteio)
        num_alvara_final = doc_alvara if doc_alvara else sort_alvara_hist

        # Melhor Identificador para Localização na Ferramenta
        if cpf_identificado:
            melhor_dado = f"CPF: {cpf_identificado} (Receita Federal)"
        elif mei_cnpj:
            melhor_dado = f"CNPJ MEI: {mei_cnpj} (Receita Federal)"
        elif condutax_orig:
            melhor_dado = f"Condutax: {condutax_orig} (DTP - {ts:.1f} anos praça)"
        elif num_alvara_final:
            melhor_dado = f"Alvará DTP: {num_alvara_final}"
        elif proc_sei_dtp:
            melhor_dado = f"Processo SEI: {proc_sei_dtp}"
        else:
            melhor_dado = f"Protocolo Ed.{edital_num}: {protocolo} (Nasc. aprox. {ano_min}-{ano_max})"

        # Chaves de Busca Prontas para Consulta em Ferramentas
        gen = clean_val(row.get('Genero', 'Masculino'))
        if cpf_identificado:
            chave_bureau = f"{nome_cand} | CPF: {cpf_identificado} | SAO PAULO - SP | NASC: {ano_min}-{ano_max}"
        else:
            chave_bureau = f"{nome_cand} | SAO PAULO - SP | NASC: {ano_min}-{ano_max} | SEXO: {gen}"
            if condutax_orig:
                chave_bureau += f" | CONDUTAX: {condutax_orig}"
            if mei_cnpj:
                chave_bureau += f" | CNPJ: {mei_cnpj}"

        query_google = f'"{nome_cand}" ("DTP" OR "CONDUTAX" OR "ALVARA" OR "TAXI") "SAO PAULO"'
        enc_name = urllib.parse.quote_plus(nome_cand)
        link_doc = f"https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=termo_pesquisar&txtTermo={enc_name}"
        link_sei = "https://sei.prefeitura.sp.gov.br/sei/controlador_externo.php?acao=usuario_externo_pesquisa_processo"

        # Vínculo Territorial
        vinculo_ponto = clean_val(row.get('Vinculo_Ponto_Privativo', ''))
        ponto_num = clean_val(row.get('Ponto_Numero', ''))
        ponto_end = clean_val(row.get('Ponto_Endereco', ''))
        ponto_reg = clean_val(row.get('Ponto_Regiao', ''))
        ponto_tel = clean_val(row.get('Ponto_Telefone', ''))
        ponto_subprefeitura = ""
        ponto_capacidade = ""
        ponto_saldo = ""
        ponto_lat = ""
        ponto_lon = ""

        ponto_dig = norm_digits(ponto_num)
        if ponto_dig and ponto_dig in pontos_map:
            p_info = pontos_map[ponto_dig]
            ponto_subprefeitura = clean_val(p_info.get('subprefeitura', ''))
            ponto_capacidade = clean_val(p_info.get('capacidade', ''))
            ponto_saldo = clean_val(p_info.get('saldo', ''))
            ponto_lat = clean_val(p_info.get('latitude', ''))
            ponto_lon = clean_val(p_info.get('longitude', ''))

        sit_final = clean_val(row.get('Situacao_Final', ''))
        if sit_final in ['CONTEMPLADO', 'CONTEMPLADO (JUDICIAL)']:
            if edital_num in [4]:
                acao_com = "Apresentar condições especiais de eletrificação e captação para frotas corporativas limpas."
            elif edital_num in [3]:
                acao_com = "Convidar para o Programa Mulheres Taxistas Chame Táxi (segurança, suporte e corridas executivas)."
            elif edital_num in [2, 7]:
                acao_com = "Abordagem sênior: apresentar plano de fidelização para taxistas tradicionais de longo tempo de praça."
            elif edital_num in [6, 8]:
                acao_com = "Integrar à rede de Táxi Acessível para contratos corporativos e hospitalares da cooperativa."
            else:
                acao_com = "Apresentar pacote de boas-vindas com isenção temporária de mensalidade para novos alvarás."
        # Classificação de Suplência e Fila de Espera
        pos_fila_val = row.get('Posicao_Fila_Espera')
        pos_fila_num = None
        if pd.notna(pos_fila_val):
            try:
                pos_fila_num = int(float(pos_fila_val))
            except Exception:
                pass

        cortes_desistencia = {
            1: (20, "15% (~19 desistências estimadas)"),
            2: (50, "10% a 15% (~37 a 56 desistências estimadas)"),
            3: (75, "15% a 20% (~56 a 75 desistências estimadas)"),
            4: (150, "20% a 30% (~150 a 225 desistências estimadas por custo de híbrido/elétrico)"),
            5: (50, "10% a 15% (~37 a 56 desistências estimadas)"),
            6: (20, "25% a 35% (~25 a 35 desistências estimadas por custo de adaptação Inmetro)"),
            7: (20, "25% a 35% (~25 a 35 desistências estimadas por custo de adaptação Inmetro)"),
            8: (25, "25% a 35% (~25 a 35 desistências estimadas por custo de adaptação Inmetro)")
        }

        corte_ed, estim_desist = cortes_desistencia.get(edital_num, (30, "10% a 15%"))

        if "CONTEMPLADO" in sit_final:
            suplencia_status = "Titular Contemplado 2026"
            previsao_suplencia = "Alvará Garantido (Cumprir prazo regulatório de vistoria e documentação no DTP)"
        elif sit_final == 'ESPERA' and pos_fila_num is not None:
            if pos_fila_num <= corte_ed:
                suplencia_status = "Suplente Alta Probabilidade (Dentro da Margem de Desistência DTP)"
                previsao_suplencia = f"Alta Probabilidade de Chamada: Posição {pos_fila_num} está dentro da margem de {corte_ed} vagas remanescentes estimadas para o Edital {edital_num}."
                acao_com = f"Suplente Alta Probabilidade (Posição {pos_fila_num}): Pré-cadastrar na Chame Táxi e preparar documentação DTP antecipadamente."
            elif pos_fila_num <= corte_ed * 2:
                suplencia_status = "Suplente Média Probabilidade (Segunda Rodada de Chamamento)"
                previsao_suplencia = f"Média Probabilidade: Posição {pos_fila_num}. Pode ser chamado caso haja prorrogação ou segunda chamada do DTP."
                acao_com = f"Suplente Média Probabilidade (Posição {pos_fila_num}): Manter contato e orientar sobre documentação para eventual segunda convocação."
            else:
                suplencia_status = "Suplente Fila Geral (Posição de Reserva)"
                previsao_suplencia = f"Fila Geral: Posição {pos_fila_num}. Chamada improvável na primeira fase regulatória."
                acao_com = "Cadastrar como segundo motorista / preposto e ofertar corridas no aplicativo."
        elif sit_final.startswith('INABILITADO'):
            suplencia_status = "Inabilitado na Fase Documental"
            previsao_suplencia = "Inabilitado (Recurso Administrativo DTP cabível)"
            acao_com = "Apoio jurídico e documental para eventual recurso ou regularização de cadastro DTP."
        else:
            suplencia_status = "Não Aplicável"
            previsao_suplencia = "Não participante ou ato avulso do Diário Oficial"
            acao_com = "Relacionamento institucional."

        veic_exigencia, veic_modelos, veic_prazo = get_vehicle_rules(edital_num, row.get('Categoria_Veiculo', ''))

        # Scoring Comercial Preditivo de Conversão (0 a 100 pontos para 100% da base)
        score_chame_taxi, tier_comercial, justificativa_score = compute_conversion_score(
            status_sorteio=sit_final,
            edital_num=edital_num,
            categoria_veic=row.get('Categoria_Veiculo', ''),
            suplencia_status=suplencia_status,
            pos_fila_num=pos_fila_num,
            dist_km=dist_calc,
            regiao_macro=mei_regiao_macro,
            vinculo_ponto=vinculo_ponto,
            tel1=tel_1,
            tel2=tel_2,
            cpf=cpf_identificado,
            cnpj=mei_cnpj,
            proc_sei=proc_sei_dtp,
            possui_doc=possui_doc,
            tempo_anos=row.get('Tempo_Servico_Anos'),
            decada_entrada=row.get('Decada_Entrada_Praca')
        )

        master_rows.append({
            'ID_Master': id_master,
            'Nome_Completo': nome_cand,
            'Nome_Limpo_Sem_Acento': nome_norm,
            'Primeiro_Nome': primeiro_nome,
            'Sobrenome_Restante': sobrenome_restante,
            'Ultimo_Sobrenome': ultimo_sobrenome,
            'Genero': gen,
            'Municipio': municipio,
            'UF': uf,
            'Pais': "Brasil",
            'Idade_Minima_Estimada': idade_min,
            'Ano_Nascimento_Estimado_Min': ano_min,
            'Ano_Nascimento_Estimado_Max': ano_max,
            'Melhor_Identificador_Busca': melhor_dado,
            'Cadastro_DTP_Condutax': condutax_orig,
            'Condutax_Digitos': condutax_dig,
            'CPF_Identificado': cpf_identificado,
            'Numero_Protocolo_Inscricao': protocolo,
            'Processo_SEI_DTP': proc_sei_dtp,
            'Numero_Alvara_DTP': num_alvara_final,
            'Termo_Permissao_TP': sort_tp,
            'Possui_MEI_Ativo': possui_mei,
            'MEI_Origem_Match': mei_origem,
            'MEI_CNPJ': mei_cnpj,
            'MEI_Razao_Social': mei_razao,
            'MEI_Nome_Fantasia': mei_fantasia,
            'MEI_Situacao_Cadastral': mei_situacao,
            'MEI_Data_Abertura': mei_abertura,
            'MEI_Logradouro': mei_logradouro,
            'MEI_Numero': mei_numero,
            'MEI_Bairro': mei_bairro,
            'MEI_CEP': mei_cep,
            'MEI_Distancia_Sede_Chame_Taxi_km': mei_distancia,
            'MEI_Regiao_Macro': mei_regiao_macro,
            'Telefone_Celular_1': tel_1,
            'Telefone_Celular_2': tel_2,
            'WhatsApp_Ativo': whatsapp_ativo,
            'Email_Principal': email_principal,
            'Bairro_Residencial': bairro_res,
            'CEP': cep,
            'Status_Sorteio_2026': sit_final,
            'Edital_Numero': edital_num,
            'Edital_Descricao': clean_val(row.get('Edital_Descricao', '')),
            'Categoria_Veiculo': clean_val(row.get('Categoria_Veiculo', '')),
            'Exigencia_Veiculo_DTP': veic_exigencia,
            'Modelos_Homologados_Recomendados': veic_modelos,
            'Prazo_Estimado_Vistoria_DTP': veic_prazo,
            'Modalidade_Cota': clean_val(row.get('Modalidade_Cota', '')),
            'Metodo_Selecao': clean_val(row.get('Metodo_Selecao', '')),
            'Vagas_Ofertadas': clean_val(row.get('Vagas_Ofertadas', '')),
            'Data_Inscricao': clean_val(row.get('Data_Inscricao', '')),
            'Classificacao_Definitiva': clean_val(row.get('Classificacao_Definitiva', '')),
            'Posicao_Sorteio_NF': clean_val(row.get('Posicao_Sorteio_NF_Paulistana', '')),
            'Posicao_Fila_Espera': clean_val(row.get('Posicao_Fila_Espera', '')),
            'Classificacao_Suplencia_Fila': suplencia_status,
            'Previsao_Convocacao_Suplente': previsao_suplencia,
            'Estimativa_Desistencias_Edital': estim_desist if ("CONTEMPLADO" in sit_final or sit_final == "ESPERA") else "Não Aplicável",
            'Tempo_Servico_Anos': clean_val(row.get('Tempo_Servico_Anos', '')),
            'Tempo_Servico_Dias': clean_val(row.get('Tempo_Servico_Dias', '')),
            'Ano_Inicio_Carreira_Estimado': clean_val(row.get('Ano_Inicio_Carreira_Estimado', '')),
            'Decada_Entrada_Praca': clean_val(row.get('Decada_Entrada_Praca', '')),
            'Safra_Cadastro_DTP': clean_val(row.get('Safra_Cadastro_DTP', '')),
            'Score_Chame_Taxi': score_chame_taxi,
            'Tier_Prioridade_Comercial': tier_comercial,
            'Justificativa_Score': justificativa_score,
            'Segmento_Comercial': segmento_comercial,
            'Acao_Comercial_Recomendada': acao_com,
            'Vinculo_Ponto_Privativo': vinculo_ponto,
            'Ponto_Numero': ponto_num,
            'Ponto_Endereco': ponto_end,
            'Ponto_Regiao': ponto_reg,
            'Ponto_Subprefeitura': ponto_subprefeitura,
            'Ponto_Capacidade_Vagas': ponto_capacidade,
            'Ponto_Saldo_Vagas': ponto_saldo,
            'Ponto_Telefone': ponto_tel,
            'Ponto_Latitude': ponto_lat,
            'Ponto_Longitude': ponto_lon,
            'Chave_Busca_Bureau_Pessoa': chave_bureau,
            'Query_Busca_Google_DTP': query_google,
            'Link_Pesquisa_DOC_SP': link_doc,
            'Link_Pesquisa_SEI_PMSP': link_sei,
            'Origem_Principal': origem_principal,
            'Bases_Identificadas': " | ".join(bases_presentes),
            'Possui_Publicacao_DOC_2026': possui_doc,
            'DOC_Data_Publicacao': doc_data_pub,
            'DOC_Tipo_Ato': doc_tipo_ato,
            'DOC_Categoria_Veiculo': doc_categoria,
            'DOC_Status_Despacho': doc_status,
            'DOC_Cedente_Anterior': doc_cedente,
            'DOC_Alvara_Numero': doc_alvara,
            'DOC_URL_Publicacao': doc_url,
            'DOC_Resumo_Texto': doc_resumo,
            'Participou_Sorteio_Pontos_2024': part_sort_pontos,
            'Sorteio_Pontos_Alvara_Historico': sort_alvara_hist,
            'Sorteio_Pontos_Protocolo': sort_protocolo,
            'Sorteio_Pontos_Status': sort_status,
            'Sorteio_Pontos_Ranking_NF': sort_ranking_nf,
            'Sorteio_Pontos_Ranking_Ponto': sort_ranking_ponto,
            'Status_Enriquecimento': status_enriq
        })

    # 5. Adicionando Motoristas do DOC sem inscrição nos Editais de Alvará
    print("\nIdentificando motoristas adicionais do Diário Oficial DOC 2026...")
    doc_add_count = 0
    for idx, r in do_df.iterrows():
        nome_motorista = clean_val(r.get('nome_motorista', ''))
        nome_norm = norm_name(nome_motorista)
        cond_dig = norm_digits(r.get('condutax_num', ''))

        if nome_norm in seen_alv_names or (cond_dig and cond_dig in seen_alv_condutax):
            continue

        doc_add_count += 1
        id_master = f"MST-DOC-{doc_add_count:04d}"
        origem_principal = "Diário Oficial da Cidade (DOC 2026)"

        partes = nome_motorista.split()
        pri_nome = partes[0] if partes else ""
        sob_nome = " ".join(partes[1:]) if len(partes) > 1 else ""
        ult_sob = partes[-1] if len(partes) > 1 else ""

        ponto_sort_rec = pontos_sorteio_by_condutax.get(cond_dig) if cond_dig else None
        part_sort_pontos = "Sim" if ponto_sort_rec is not None else "Não"
        sort_alvara_hist = ""
        sort_protocolo = ""
        sort_status = ""
        sort_ranking_nf = ""
        sort_ranking_ponto = ""
        sort_tp = ""
        if ponto_sort_rec is not None:
            sort_alvara_hist = clean_val(ponto_sort_rec.get('numero_alvara', ''))
            sort_protocolo = clean_val(ponto_sort_rec.get('protocolo_ponto', ''))
            sort_status = clean_val(ponto_sort_rec.get('status_ponto', ''))
            sort_ranking_nf = clean_val(ponto_sort_rec.get('ranking_nf', ''))
            sort_ranking_ponto = clean_val(ponto_sort_rec.get('ranking_ponto', ''))
            sort_tp = clean_val(ponto_sort_rec.get('termo_permissao', ''))

        tipo_ato = clean_val(r.get('tipo_ato', ''))
        cat_veic = clean_val(r.get('categoria', 'Táxi Comum'))
        doc_alv = clean_val(r.get('alvara_num', ''))
        num_alvara_final = doc_alv if doc_alv else sort_alvara_hist

        if "TRANSFERÊNCIA" in tipo_ato:
            acao_com = "Motorista cessionário recente: ofertar migração de aplicativo e boas-vindas à cooperativa."
        elif "REGULAÇÃO" in tipo_ato:
            acao_com = "Motorista ativo em regulação DTP: manter relacionamento institucional."
        else:
            acao_com = "Apresentar serviços corporativos da Chame Táxi."

        mei_rf_rec = rf_map.get(nome_norm)
        possui_mei = "Sim" if mei_rf_rec is not None else "Não"
        mei_origem = "Receita Federal CNPJ Aberto (Municipal)" if mei_rf_rec is not None else "Não localizado"
        mei_cnpj = clean_val(mei_rf_rec.get('CNPJ', '')) if mei_rf_rec is not None else ""
        mei_razao = clean_val(mei_rf_rec.get('RAZAO_SOCIAL', '')) if mei_rf_rec is not None else ""
        mei_fantasia = clean_val(mei_rf_rec.get('NOME_FANTASIA', '')) if mei_rf_rec is not None else ""
        mei_situacao = clean_val(mei_rf_rec.get('SITUACAO_CADASTRAL', '')) if mei_rf_rec is not None else ""
        mei_abertura = clean_val(mei_rf_rec.get('DATA_INICIO_ATIVIDADE', '')) if mei_rf_rec is not None else ""
        mei_logradouro = clean_val(mei_rf_rec.get('LOGRADOURO', '')) if mei_rf_rec is not None else ""
        mei_numero = clean_val(mei_rf_rec.get('NUMERO', '')) if mei_rf_rec is not None else ""
        mei_bairro = clean_val(mei_rf_rec.get('BAIRRO', '')) if mei_rf_rec is not None else ""
        mei_cep = clean_val(mei_rf_rec.get('CEP', '')) if mei_rf_rec is not None else ""

        tel1_doc = ""
        em_doc = ""
        cpf_identificado_doc = ""
        dist_calc, reg_calc = (None, "Não aplicável")
        if mei_rf_rec is not None:
            t1 = clean_val(mei_rf_rec.get('TELEFONE_1', ''))
            tel1_doc = t1
            em_doc = clean_val(mei_rf_rec.get('CORREIO_ELETRONICO', ''))
            cpf_raw = clean_val(mei_rf_rec.get('CPF_EXTRAIDO', ''))
            if cpf_raw:
                cpf_identificado_doc = format_cpf(cpf_raw)
            dist_calc, reg_calc = get_mei_geo_info(mei_cep, mei_bairro)

        mei_distancia_doc = f"{dist_calc:.2f}".replace('.', ',') if dist_calc is not None else ""
        mei_regiao_macro_doc = reg_calc
        veic_exigencia_doc, veic_modelos_doc, veic_prazo_doc = get_vehicle_rules("", cat_veic)

        ano_min = 1945
        ano_max = 2003
        idade_min = 21

        cond_orig = clean_val(r.get('condutax_num', ''))
        proc_sei = clean_val(r.get('processo_sei', ''))

        if cpf_identificado_doc:
            melhor_dado = f"CPF: {cpf_identificado_doc} (Receita Federal)"
        elif mei_cnpj:
            melhor_dado = f"CNPJ MEI: {mei_cnpj} (Receita Federal)"
        elif cond_orig:
            melhor_dado = f"Condutax: {cond_orig} (DTP - Diário Oficial 2026)"
        elif num_alvara_final:
            melhor_dado = f"Alvará DTP: {num_alvara_final}"
        elif proc_sei:
            melhor_dado = f"Processo SEI: {proc_sei} (Publicação DOC 2026)"
        else:
            melhor_dado = f"Nome Completo + Diário Oficial 2026"

        if cpf_identificado_doc:
            chave_bureau = f"{nome_motorista} | CPF: {cpf_identificado_doc} | SAO PAULO - SP | NASC: {ano_min}-{ano_max}"
        else:
            chave_bureau = f"{nome_motorista} | SAO PAULO - SP | NASC: {ano_min}-{ano_max} | SEXO: Não informado"
            if cond_orig:
                chave_bureau += f" | CONDUTAX: {cond_orig}"
            if mei_cnpj:
                chave_bureau += f" | CNPJ: {mei_cnpj}"

        query_google = f'"{nome_motorista}" ("DTP" OR "CONDUTAX" OR "ALVARA" OR "TAXI") "SAO PAULO"'
        enc_name = urllib.parse.quote_plus(nome_motorista)
        link_doc = f"https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=termo_pesquisar&txtTermo={enc_name}"
        link_sei = "https://sei.prefeitura.sp.gov.br/sei/controlador_externo.php?acao=usuario_externo_pesquisa_processo"

        # Scoring Comercial Preditivo de Conversão para Motoristas DOC
        score_doc, tier_doc, just_doc = compute_conversion_score(
            status_sorteio="NÃO PARTICIPOU / APENAS DOC",
            edital_num="",
            categoria_veic=cat_veic,
            suplencia_status="Não Aplicável",
            pos_fila_num=None,
            dist_km=dist_calc,
            regiao_macro=mei_regiao_macro_doc,
            vinculo_ponto="Ponto Livre",
            tel1=tel1_doc,
            tel2="",
            cpf=cpf_identificado_doc,
            cnpj=mei_cnpj,
            proc_sei=proc_sei,
            possui_doc="Sim",
            tempo_anos=None,
            decada_entrada=None,
            tipo_ato=tipo_ato
        )

        master_rows.append({
            'ID_Master': id_master,
            'Nome_Completo': nome_motorista,
            'Nome_Limpo_Sem_Acento': nome_norm,
            'Primeiro_Nome': pri_nome,
            'Sobrenome_Restante': sob_nome,
            'Ultimo_Sobrenome': ult_sob,
            'Genero': "Não informado",
            'Municipio': "São Paulo",
            'UF': "SP",
            'Pais': "Brasil",
            'Idade_Minima_Estimada': idade_min,
            'Ano_Nascimento_Estimado_Min': ano_min,
            'Ano_Nascimento_Estimado_Max': ano_max,
            'Melhor_Identificador_Busca': melhor_dado,
            'Cadastro_DTP_Condutax': cond_orig,
            'Condutax_Digitos': cond_dig,
            'CPF_Identificado': cpf_identificado_doc,
            'Numero_Protocolo_Inscricao': "",
            'Processo_SEI_DTP': proc_sei,
            'Numero_Alvara_DTP': num_alvara_final,
            'Termo_Permissao_TP': sort_tp,
            'Possui_MEI_Ativo': possui_mei,
            'MEI_Origem_Match': mei_origem,
            'MEI_CNPJ': mei_cnpj,
            'MEI_Razao_Social': mei_razao,
            'MEI_Nome_Fantasia': mei_fantasia,
            'MEI_Situacao_Cadastral': mei_situacao,
            'MEI_Data_Abertura': mei_abertura,
            'MEI_Logradouro': mei_logradouro,
            'MEI_Numero': mei_numero,
            'MEI_Bairro': mei_bairro,
            'MEI_CEP': mei_cep,
            'MEI_Distancia_Sede_Chame_Taxi_km': mei_distancia_doc,
            'MEI_Regiao_Macro': mei_regiao_macro_doc,
            'Telefone_Celular_1': tel1_doc,
            'Telefone_Celular_2': "",
            'WhatsApp_Ativo': "Não verificado",
            'Email_Principal': em_doc,
            'Bairro_Residencial': mei_bairro,
            'CEP': mei_cep,
            'Status_Sorteio_2026': "NÃO PARTICIPOU / APENAS DOC",
            'Edital_Numero': "",
            'Edital_Descricao': "Não aplicável (Atos Diário Oficial)",
            'Categoria_Veiculo': cat_veic,
            'Exigencia_Veiculo_DTP': veic_exigencia_doc,
            'Modelos_Homologados_Recomendados': veic_modelos_doc,
            'Prazo_Estimado_Vistoria_DTP': veic_prazo_doc,
            'Modalidade_Cota': "Não aplicável",
            'Metodo_Selecao': "Processo Administrativo DTP",
            'Vagas_Ofertadas': "",
            'Data_Inscricao': "",
            'Classificacao_Definitiva': "",
            'Posicao_Sorteio_NF': "",
            'Posicao_Fila_Espera': "",
            'Classificacao_Suplencia_Fila': "Não Aplicável",
            'Previsao_Convocacao_Suplente': "Motorista identificado via publicação oficial do Diário Oficial (sem registro de sorteio 2026)",
            'Estimativa_Desistencias_Edital': "Não Aplicável",
            'Tempo_Servico_Anos': "",
            'Tempo_Servico_Dias': "",
            'Ano_Inicio_Carreira_Estimado': "",
            'Decada_Entrada_Praca': "Não aplicável",
            'Safra_Cadastro_DTP': "Safra Diário Oficial 2026",
            'Score_Chame_Taxi': score_doc,
            'Tier_Prioridade_Comercial': tier_doc,
            'Justificativa_Score': just_doc,
            'Segmento_Comercial': f"Regularização / {tipo_ato}",
            'Acao_Comercial_Recomendada': acao_com,
            'Vinculo_Ponto_Privativo': "Ponto Livre / Sem Ponto Privativo",
            'Ponto_Numero': "",
            'Ponto_Endereco': "",
            'Ponto_Regiao': "",
            'Ponto_Subprefeitura': "",
            'Ponto_Capacidade_Vagas': "",
            'Ponto_Saldo_Vagas': "",
            'Ponto_Telefone': "",
            'Ponto_Latitude': "",
            'Ponto_Longitude': "",
            'Chave_Busca_Bureau_Pessoa': chave_bureau,
            'Query_Busca_Google_DTP': query_google,
            'Link_Pesquisa_DOC_SP': link_doc,
            'Link_Pesquisa_SEI_PMSP': link_sei,
            'Origem_Principal': origem_principal,
            'Bases_Identificadas': "Diário Oficial 2026" + (" | MEI Receita Federal" if mei_rf_rec is not None else "") + (" | Sorteio de Pontos DTP" if ponto_sort_rec is not None else ""),
            'Possui_Publicacao_DOC_2026': "Sim",
            'DOC_Data_Publicacao': clean_val(r.get('data_publicacao', '')),
            'DOC_Tipo_Ato': tipo_ato,
            'DOC_Categoria_Veiculo': cat_veic,
            'DOC_Status_Despacho': clean_val(r.get('status', '')),
            'DOC_Cedente_Anterior': clean_val(r.get('cedente_anterior', '')),
            'DOC_Alvara_Numero': doc_alv,
            'DOC_URL_Publicacao': clean_val(r.get('doc_url', '')),
            'DOC_Resumo_Texto': clean_val(r.get('resumo_texto', '')),
            'Participou_Sorteio_Pontos_2024': part_sort_pontos,
            'Sorteio_Pontos_Alvara_Historico': sort_alvara_hist,
            'Sorteio_Pontos_Protocolo': sort_protocolo,
            'Sorteio_Pontos_Status': sort_status,
            'Sorteio_Pontos_Ranking_NF': sort_ranking_nf,
            'Sorteio_Pontos_Ranking_Ponto': sort_ranking_ponto,
            'Status_Enriquecimento': "Enriquecido (Publicação DOC 2026)" if not tel1_doc else "Enriquecido (DOC + Receita Federal)"
        })

    df_master = pd.DataFrame(master_rows)
    print(f"-> Base Mestre de Motoristas consolidada: {len(df_master):,} registros e {len(df_master.columns)} colunas.")

    # 6. Preparando Abas Especializadas
    print("\nPreparando abas temáticas e estruturadas...")

    # Aba 2: Contemplados Novos Alvarás 2026 (2.140)
    df_contemplados = df_master[df_master['Status_Sorteio_2026'].str.startswith('CONTEMPLADO')].copy()
    df_contemplados.sort_values(by=['Edital_Numero', 'Classificacao_Definitiva'], inplace=True)

    # Aba 3: Catálogo Geral de Pontos de Táxi (1.188 pontos DTP + OSM)
    cat_pontos_copy = cat_pontos.copy()
    cat_pontos_copy['ponto_num'] = pd.to_numeric(cat_pontos_copy['ponto_id'], errors='coerce')
    pontos_geo_copy = pontos_geo.copy()
    pontos_geo_copy['ponto_num'] = pd.to_numeric(pontos_geo_copy['dtp_ponto_id'], errors='coerce')
    df_pontos_final = pd.merge(
        cat_pontos_copy,
        pontos_geo_copy[['ponto_num', 'osm_id', 'osm_type', 'osm_capacity', 'osm_shelter', 'osm_bench', 'osm_phone', 'matching_confidence', 'matching_status', 'geosampa_distrito', 'discrepancy_flags']],
        on='ponto_num',
        how='left'
    )
    df_pontos_final.drop(columns=['ponto_num'], inplace=True, errors='ignore')
    df_pontos_final['Georreferenciado_OSM'] = np.where(df_pontos_final['osm_id'].notna(), 'Sim', 'Não (Pendente)')
    df_pontos_final.rename(columns={
        'ponto_id': 'Ponto_ID',
        'endereco': 'Endereco_Oficial_DTP',
        'capacidade': 'Capacidade_Vagas_DTP',
        'ocupada': 'Vagas_Ocupadas_DTP',
        'saldo': 'Saldo_Vagas_DTP',
        'regiao': 'Regiao_Macro',
        'subprefeitura': 'Subprefeitura',
        'telefone_ponto': 'Telefone_Ponto_DTP',
        'latitude': 'Latitude_WGS84',
        'longitude': 'Longitude_WGS84',
        'osm_id': 'OSM_ID',
        'osm_type': 'OSM_Tipo',
        'osm_capacity': 'Baias_Fisicas_Solo_OSM',
        'osm_shelter': 'Possui_Abrigo_OSM',
        'osm_bench': 'Possui_Banco_OSM',
        'osm_phone': 'Telefone_OSM',
        'matching_confidence': 'Nivel_Confianca_Matching',
        'matching_status': 'Status_Algoritmo_Matching',
        'geosampa_distrito': 'Distrito_GeoSampa',
        'discrepancy_flags': 'Observacoes_Discrepancias'
    }, inplace=True)

    # Aba 4: Atos Diário Oficial 2026 (94)
    df_do_final = do_df.copy()

    # Aba 5: MEIs Zona Oeste Butantã (10)
    df_meis_final = meis_butanta.copy()

    # Aba 6: Polos Institucionais CFC / DTP / IPEM (26)
    df_polos_final = polos_df.copy()

    # Aba 7: Sorteios de Pontos Privativos (10.350)
    df_sort_final = pontos_sorteio_merged.copy()

    # Aba 8: Plano de Prospecção Territorial (90)
    df_plano_final = plano_df.copy()

    # Aba 9: Feições OSM Avulsas (332)
    df_osm_final = osm_sem_dtp.copy()

    # Aba 10: Resumo Executivo e KPIs
    kpi_editais = []
    ed_names = {
        1: "Edital 1: PcD Comum",
        2: "Edital 2: Tempo de Exercício",
        3: "Edital 3: Mulheres Taxistas",
        4: "Edital 4: Elétrico / Híbrido",
        5: "Edital 5: Ampla Concorrência",
        6: "Edital 6: PcD Acessível",
        7: "Edital 7: Tempo Acessível",
        8: "Edital 8: Ampla Acessível"
    }
    for ed_num in range(1, 9):
        sub = df_master[df_master['Edital_Numero'] == ed_num]
        tot = len(sub)
        vagas = int(sub['Vagas_Ofertadas'].iloc[0]) if tot > 0 and pd.notna(sub['Vagas_Ofertadas'].iloc[0]) and str(sub['Vagas_Ofertadas'].iloc[0]) != '' else 0
        cont = int(sub['Status_Sorteio_2026'].str.startswith('CONTEMPLADO').sum())
        esp = int((sub['Status_Sorteio_2026'] == 'ESPERA').sum())
        taxa = round(cont / tot * 100, 2) if tot > 0 else 0
        rel = round(tot / vagas, 2) if vagas > 0 else 0
        fem = int((sub['Genero'] == 'Feminino').sum())
        masc = int((sub['Genero'] == 'Masculino').sum())
        kpi_editais.append({
            'Edital_Numero': ed_num,
            'Nome_Edital': ed_names.get(ed_num, f"Edital {ed_num}"),
            'Inscritos_Totais': tot,
            'Vagas_Ofertadas': vagas,
            'Contemplados': cont,
            'Fila_Espera': esp,
            'Taxa_Contemplacao_Pct': taxa,
            'Candidatos_Por_Vaga': rel,
            'Mulheres_Inscritas': fem,
            'Homens_Inscritos': masc
        })
    df_kpi_editais = pd.DataFrame(kpi_editais)

    # 7. Exportando para CSV (Delimitador ';' e codificação 'utf-8-sig')
    output_csv_root = 'planilha_mestre_taxistas_sp_2026.csv'
    output_csv_folder = r'Novos Alvarás 2026\planilha_mestre_taxistas_sp_2026.csv'

    print(f"\nExportando Master CSV no diretório raiz: {output_csv_root}...")
    df_master.to_csv(output_csv_root, sep=';', encoding='utf-8-sig', index=False)

    print(f"Exportando Master CSV na pasta 'Novos Alvarás 2026': {output_csv_folder}...")
    df_master.to_csv(output_csv_folder, sep=';', encoding='utf-8-sig', index=False)

    # 8. Exportando Super Pasta de Trabalho Excel (.xlsx) com Todas as Abas e Estilos
    output_xlsx_root = 'planilha_mestre_taxistas_sp_2026.xlsx'
    output_xlsx_folder = r'Novos Alvarás 2026\planilha_mestre_taxistas_sp_2026.xlsx'

    path_crm = r'Novos Alvarás 2026\fila_prospeccao_crm_taxistas_2026.csv'
    df_crm_export = None
    if os.path.exists(path_crm):
        try:
            df_crm_export = pd.read_csv(path_crm, sep=';', encoding='utf-8-sig', low_memory=False)
        except Exception:
            pass

    path_roteiro = r'Novos Alvarás 2026\roteiro_tatico_visitas_pontos_2026.csv'
    df_roteiro_export = None
    if os.path.exists(path_roteiro):
        try:
            df_roteiro_export = pd.read_csv(path_roteiro, sep=';', encoding='utf-8-sig', low_memory=False)
        except Exception:
            pass

    path_hosp = r'Novos Alvarás 2026\clientes_corporativos_hospitais_5km.csv'
    df_hosp_export = None
    if os.path.exists(path_hosp):
        try:
            df_hosp_export = pd.read_csv(path_hosp, sep=';', encoding='utf-8-sig', low_memory=False)
        except Exception:
            pass

    # Aba 15: Clientes Corporativos B2B - Empresas Não-Hospitalares (Raio 5 km, 100+ Colaboradores)
    path_emp = r'Novos Alvarás 2026\clientes_corporativos_empresas_5km.csv'
    if not os.path.exists(path_emp):
        path_emp = 'clientes_corporativos_empresas_5km.csv'
    df_emp_export = None
    if os.path.exists(path_emp):
        try:
            df_emp_export = pd.read_csv(path_emp, sep=';', encoding='utf-8-sig', low_memory=False)
        except Exception:
            pass

    # Aba 12: Suplentes Prioritários da Fila de Espera (Dentro da Margem de Desistência DTP)
    df_suplentes_prioritarios = df_master[
        df_master['Classificacao_Suplencia_Fila'].str.contains('Alta Probabilidade', na=False)
    ].copy()

    sheets_to_export = [
        ('01_Base_Mestre_Motoristas', df_master),
        ('02_Contemplados_Alvaras_2026', df_contemplados),
        ('03_Catalogo_Pontos_Taxi_SP', df_pontos_final),
        ('04_Diario_Oficial_Atos_2026', df_do_final),
        ('05_MEIs_Zona_Oeste_Butanta', df_meis_final),
        ('06_Polos_CFC_DTP_IPEM', df_polos_final),
        ('07_Sorteios_Pontos_DTP', df_sort_final),
        ('08_Plano_Prospeccao_Tatico', df_plano_final),
        ('09_Feicoes_OSM_Avulsas', df_osm_final),
        ('10_Resumo_Executivo_KPIs', df_kpi_editais)
    ]
    if df_crm_export is not None:
        sheets_to_export.append(('11_Fila_Prospeccao_CRM', df_crm_export))
    sheets_to_export.append(('12_Suplentes_Prioritarios', df_suplentes_prioritarios))
    if df_roteiro_export is not None:
        sheets_to_export.append(('13_Roteiro_Visitas_Pontos', df_roteiro_export))
    if df_hosp_export is not None:
        sheets_to_export.append(('14_Clientes_Corp_Hospitais_5km', df_hosp_export))
    if df_emp_export is not None:
        sheets_to_export.append(('15_Empresas_Corp_100_Mais_5km', df_emp_export))

    print(f"\nGerando Super Pasta de Trabalho Excel Multi-Abas: {output_xlsx_root}...")
    with pd.ExcelWriter(output_xlsx_root, engine='openpyxl') as writer:
        for sname, sdf in sheets_to_export:
            print(f"  -> Escrevendo aba '{sname}' ({len(sdf):,} registros)...")
            sdf.to_excel(writer, sheet_name=sname, index=False)

        header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        thin_border = Border(
            left=Side(style='thin', color='D1D5DB'),
            right=Side(style='thin', color='D1D5DB'),
            top=Side(style='thin', color='D1D5DB'),
            bottom=Side(style='thin', color='D1D5DB')
        )

        for sname in writer.sheets:
            ws = writer.sheets[sname]
            ws.freeze_panes = 'A2'
            ws.auto_filter.ref = ws.dimensions
            ws.views.sheetView[0].showGridLines = True

            for cell in ws[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=False)
                cell.border = thin_border

            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col[:50])
                col_letter = get_column_letter(col[0].column)
                ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 48)

    print(f"Super Excel gerado com sucesso no diretório raiz!")

    # Copiando também para a pasta 'Novos Alvarás 2026'
    import shutil
    shutil.copy2(output_xlsx_root, output_xlsx_folder)
    print(f"Super Excel copiado com sucesso para '{output_xlsx_folder}'.")

    # Exibição de Métricas Finais
    sz_csv = os.path.getsize(output_csv_root) / (1024 * 1024)
    sz_xlsx = os.path.getsize(output_xlsx_root) / (1024 * 1024)
    print("\n" + "=" * 80)
    print("CONSOLIDAÇÃO FINALIZADA COM ÊXITO!")
    print(f"-> Arquivo CSV Mestre: {output_csv_root} ({sz_csv:.2f} MB - {len(df_master.columns)} colunas)")
    print(f"-> Arquivo Excel Mestre: {output_xlsx_root} ({sz_xlsx:.2f} MB - {len(sheets_to_export)} Abas)")
    print("=" * 80)

    return df_master

if __name__ == '__main__':
    build_master()
