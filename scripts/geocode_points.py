# -*- coding: utf-8 -*-
"""
=============================================================================
GEOCODIFICADOR ABERTO DOS PONTOS DE TÁXI DTP (OPENSTREETMAP / NOMINATIM)
=============================================================================
Autor: Senior Data Scientist
Objetivo: Obter coordenadas geográficas oficiais (Latitude e Longitude) para
os pontos de táxi do DTP vinculados aos motoristas do sorteio de 2026,
utilizando o motor aberto Nominatim/OSM com cache persistente e respeito às
políticas de uso (rate limit de 1 req/s).
=============================================================================
"""

import os
import sys
import io
import re
import json
import time
import urllib.request
import urllib.parse
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CACHE_FILE = r'data\processed\geocache_pontos_dtp.json'
CATALOGO_FILE = r'Novos Alvarás 2026\catalogo_pontos_completo.csv'
USER_AGENT = 'Mapeamento-TaxiSP-OpenData/1.0 (pesquisa-urbana-sp; contato: local)'

def clean_address(addr):
    if not addr or pd.isna(addr):
        return ""
    s = str(addr).strip()
    
    # Casos especiais conhecidos
    if "CONGONHAS" in s.upper():
        return "Aeroporto de Congonhas, Sao Paulo, Brasil"
    if "TIETE" in s.upper() or "TIETÊ" in s.upper():
        return "Terminal Rodoviario Tiete, Sao Paulo, Brasil"
    if "BARRA FUNDA" in s.upper() and ("TERMINAL" in s.upper() or "METRO" in s.upper()):
        return "Terminal Barra Funda, Sao Paulo, Brasil"
    if "JABAQUARA" in s.upper() and ("TERMINAL" in s.upper() or "METRO" in s.upper()):
        return "Terminal Jabaquara, Sao Paulo, Brasil"
    if "MORUMBI SHOPPING" in s.upper():
        return "Morumbi Shopping, Sao Paulo, Brasil"
    if "ANHEMBI" in s.upper() or "ANHEMBÍ" in s.upper():
        return "Pavilhao do Anhembi, Santana, Sao Paulo, Brasil"

    # Desinversão padrão DTP: "NOME, R." -> "Rua NOME"
    m = re.match(r'^(.*?),\s*(R\.|AV\.|AL\.|PCA\.|PÇA\.|EST\.|ROD\.|TR\.|VD\.|R|AV|AL|PCA)\.?(\s*\(.*?\))?$', s, re.IGNORECASE)
    if m:
        base = m.group(1).strip()
        stype = m.group(2).strip().upper().rstrip('.')
        paren = m.group(3) or ''
        type_map = {
            'R': 'Rua', 'AV': 'Avenida', 'AL': 'Alameda',
            'PCA': 'Praça', 'PÇA': 'Praça', 'EST': 'Estrada',
            'ROD': 'Rodovia', 'TR': 'Travessa', 'VD': 'Viaduto'
        }
        full_type = type_map.get(stype, stype.title())
        # Limpar complementos entre parênteses para busca mais limpa
        clean_base = re.sub(r'\(.*?\)', '', base).strip()
        s = f"{full_type} {clean_base}".strip()

    s = s.replace('PROFº', 'Professor').replace('PROFª', 'Professora').replace('MJ', 'Major')
    s = re.sub(r'\(.*?\)', '', s).strip()
    s = re.sub(r'\s{2,}', ' ', s)
    return f"{s}, Sao Paulo, SP, Brasil"

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def geocode_query(query, cache):
    if query in cache:
        return cache[query]

    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                res = {
                    "lat": float(data[0]['lat']),
                    "lon": float(data[0]['lon']),
                    "display_name": data[0].get('display_name', '')
                }
                cache[query] = res
                save_cache(cache)
                return res
            else:
                cache[query] = None
                save_cache(cache)
                return None
    except Exception as e:
        print(f"   Aviso: erro na geocodificação de '{query}': {e}")
        return None

def main():
    print("=" * 70)
    print("INICIANDO GEOCODIFICAÇÃO DOS PONTOS DE TÁXI DO DTP VIA OPEN DATA (OSM)")
    print("=" * 70)

    if not os.path.exists(CATALOGO_FILE):
        print(f"Erro: {CATALOGO_FILE} não encontrado.")
        return 1

    cat = pd.read_csv(CATALOGO_FILE, sep=';', encoding='utf-8-sig')
    master_csv = 'planilha_mestre_taxistas_sp_2026.csv'
    df_m = pd.read_csv(master_csv, sep=';', encoding='utf-8-sig', low_memory=False)

    cat['p_id'] = pd.to_numeric(cat['ponto_id'], errors='coerce')
    cat_geo = set(cat[cat['latitude'].notna()]['p_id'])
    driver_pts = set(pd.to_numeric(df_m['Ponto_Numero'], errors='coerce').dropna())
    needs_geo = driver_pts - cat_geo

    print(f"Pontos vinculados a motoristas: {len(driver_pts)}")
    print(f"Pontos já com coordenadas: {len(cat_geo.intersection(driver_pts))}")
    print(f"Pontos a geocodificar nesta execução: {len(needs_geo)}")

    cache = load_cache()
    print(f"Cache local existente: {len(cache)} consultas salvas.")

    geocoded_count = 0
    failed_count = 0

    indices_to_update = cat[cat['p_id'].isin(needs_geo)].index

    for idx in indices_to_update:
        row = cat.loc[idx]
        pid = row['ponto_id']
        raw_addr = row['endereco']
        query = clean_address(raw_addr)

        coords = geocode_query(query, cache)
        if not coords:
            # Fallback mais simples: sem o tipo de logradouro se falhar
            fallback_query = f"{re.sub(r'^(Rua|Avenida|Alameda|Praça)\s+', '', query.split(',')[0])}, Sao Paulo, Brasil"
            if fallback_query != query:
                time.sleep(1.0)
                coords = geocode_query(fallback_query, cache)

        if coords:
            cat.loc[idx, 'latitude'] = coords['lat']
            cat.loc[idx, 'longitude'] = coords['lon']
            geocoded_count += 1
            print(f"   [OK] Ponto {pid} ({raw_addr}) -> Lat: {coords['lat']:.5f}, Lon: {coords['lon']:.5f}")
        else:
            failed_count += 1
            print(f"   [FALHA] Ponto {pid} ({raw_addr}) -> não localizado no Nominatim")

        time.sleep(1.05)  # Respeito ao rate limit do Nominatim (1 req/s)

    print(f"\nGeocodificação concluída: {geocoded_count} pontos geocodificados, {failed_count} falhas.")
    print(f"Salvando catálogo atualizado em {CATALOGO_FILE}...")
    cat.drop(columns=['p_id'], inplace=True, errors='ignore')
    cat.to_csv(CATALOGO_FILE, sep=';', encoding='utf-8-sig', index=False)
    print("Catálogo de pontos atualizado com sucesso!")
    return 0

if __name__ == '__main__':
    main()
