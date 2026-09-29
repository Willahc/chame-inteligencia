# -*- coding: utf-8 -*-
"""
scripts/build_field_route_pontos.py
Gera o Roteiro Tático Operacional de Visitas a Pontos de Táxi:
Prioriza os pontos próximos à sede da Cooperativa Chame Táxi (Butantã),
cruza com os motoristas mapeados na Base Mestre, analisa saldo de vagas
e define rotas por cluster com horários e estratégias de abordagem de campo.
"""

import os
import re
import pandas as pd
import numpy as np
from pathlib import Path
from math import radians, sin, cos, sqrt, atan2

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "Novos Alvarás 2026"
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
PONTOS_CSV = OUTPUT_DIR / "catalogo_pontos_completo.csv"

OUT_CSV = OUTPUT_DIR / "roteiro_tatico_visitas_pontos_2026.csv"
OUT_XLSX = OUTPUT_DIR / "roteiro_tatico_visitas_pontos_2026.xlsx"

CHAME_TAXI_LAT = -23.5715
CHAME_TAXI_LON = -46.7082

def haversine(lat1, lon1, lat2, lon2):
    if pd.isna(lat1) or pd.isna(lon1) or pd.isna(lat2) or pd.isna(lon2):
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except Exception:
        return None
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return round(R * c, 2)

def define_rota(row):
    dist = row.get('Distancia_Sede_Chame_Taxi_km')
    sub = str(row.get('subprefeitura', '')).upper()
    end = str(row.get('endereco', '')).upper()
    pid = str(row.get('ponto_id', ''))
    
    # Pólos Estratégicos Especiais
    if pid == '606' or 'CONGONHAS' in end:
        return "Rota 6 - Eixo Terminais e Aeroporto Congonhas (Pólo de Altíssimo Volume)"
    elif pid in ['763', '1543'] or 'TIETÊ' in end or 'BARRA FUNDA' in end or 'RODOVIÁRIO' in end:
        return "Rota 6 - Eixo Terminais e Aeroporto Congonhas (Pólo de Altíssimo Volume)"
    
    # Rotas Territoriais
    if dist is not None and dist <= 4.0:
        return "Rota 1 - Eixo Butantã, USP & Vital Brasil (Raio Imediato < 4 km)"
    elif any(b in sub or b in end for b in ['PINHEIROS', 'FARIA LIMA', 'REBOUÇAS', 'ITAIM']):
        return "Rota 2 - Eixo Pinheiros, Faria Lima & Rebouças (Comercial / Alta Renda)"
    elif any(b in sub or b in end for b in ['LAPA', 'PERDIZES', 'LEOPOLDINA', 'JAGUARÉ', 'VILA MADALENA']):
        return "Rota 3 - Eixo Lapa, Perdizes & Leopoldina (Zona Oeste Tradicional)"
    elif any(b in sub or b in end for b in ['MORUMBI', 'VILA SÔNIA', 'CAMPO LIMPO', 'BERRINI', 'SANTO AMARO']):
        return "Rota 4 - Eixo Morumbi, Vila Sônia & Berrini (Zona Sudoeste / Corporativo)"
    elif any(b in sub or b in end for b in ['SÉ', 'PAULISTA', 'BELA VISTA', 'JARDINS', 'CONSOLAÇÃO']):
        return "Rota 5 - Eixo Paulista, Jardins & Centro Expandido (Pólo de Alta Circulação)"
    elif dist is not None and dist <= 10.0:
        return "Rota 3 - Eixo Lapa, Perdizes & Leopoldina (Zona Oeste Tradicional)"
    else:
        return "Demais Regiões e Periferias da Capital SP"

def define_estrategia(row):
    qtd_mot = row.get('Qtd_Motoristas_Mapeados', 0)
    saldo = row.get('Saldo_Vagas_Disponiveis', 0)
    rota = row.get('Cluster_Rota', '')
    
    if "Rota 1" in rota:
        return "Visita Presencial Prioritária: Convidar pessoalmente os taxistas para café de integração na sede da Chame Táxi e cadastrar prepostos no app."
    elif qtd_mot > 0 and "Rota 6" in rota:
        return f"Ação Frotista ({qtd_mot} motoristas da base): Apresentar vantagens corporativas do rádio táxi e aplicativo para corridas de longa distância."
    elif qtd_mot > 0:
        return f"Abordagem Dirigida: Procurar diretamente os motoristas mapeados ({row.get('Nomes_Motoristas_Mapeados')}) e propor pacote de migração para a cooperativa."
    elif saldo > 0:
        return f"Captação por Vaga ({saldo} vagas livres no DTP): Oferecer assessoria para novos alvarás 2026 ocuparem o ponto oficial com apoio da cooperativa."
    else:
        return "Panfletagem de Ponto: Apresentação institucional da Chame Táxi, redução de taxas e facilidades de adesão."

def define_horario(row):
    rota = row.get('Cluster_Rota', '')
    if "Rota 6" in rota:
        return "Pico Tarde/Noite (15h às 19h) - Grande fluxo de desembarque de passageiros"
    elif "Rota 2" in rota or "Rota 5" in rota:
        return "Almoço e Tarde (11h às 15h) - Pausa entre corridas corporativas"
    else:
        return "Manhã (07h às 10h) - Troca de turno, abastecimento e café dos taxistas"

def main():
    print("=" * 80)
    print("GERANDO ROTEIRO TÁTICO OPERACIONAL DE VISITAS A PONTOS DE TÁXI")
    print("=" * 80)
    
    pontos = pd.read_csv(PONTOS_CSV, sep=';', low_memory=False)
    print(f"Total de pontos carregados: {len(pontos):,}")
    
    mestre = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    print(f"Base mestre carregada: {len(mestre):,} motoristas.")
    
    # Cruzamento com motoristas vinculados a pontos
    p_drivers = mestre[mestre['Ponto_Numero'].notna() & (mestre['Ponto_Numero'] != '') & (mestre['Ponto_Numero'] != '—')].copy()
    p_drivers['ponto_int'] = p_drivers['Ponto_Numero'].astype(str).str.replace('.0', '', regex=False).str.strip()
    
    grouped = p_drivers.groupby('ponto_int').agg(
        qtd_mot=('Nome_Completo', 'count'),
        nomes_mot=('Nome_Completo', lambda s: ' | '.join(s.dropna().unique()[:4])),
        telefones_mot=('Telefone_Celular_1', lambda s: ' | '.join([str(x) for x in s.dropna().unique()[:3] if str(x) != 'nan']))
    ).reset_index()
    
    pontos['ponto_str'] = pontos['ponto_id'].astype(str).str.strip()
    df = pd.merge(pontos, grouped, left_on='ponto_str', right_on='ponto_int', how='left')
    
    df['qtd_mot'] = df['qtd_mot'].fillna(0).astype(int)
    df['nomes_mot'] = df['nomes_mot'].fillna('—')
    df['telefones_mot'] = df['telefones_mot'].replace('', '—').fillna('—')
    
    # Calcular distância até a sede
    df['dist_km'] = df.apply(lambda r: haversine(CHAME_TAXI_LAT, CHAME_TAXI_LON, r['latitude'], r['longitude']), axis=1)
    
    # Tratar colunas numéricas
    df['capacidade_num'] = pd.to_numeric(df['capacidade'], errors='coerce').fillna(0).astype(int)
    df['ocupada_num'] = pd.to_numeric(df['ocupada'], errors='coerce').fillna(0).astype(int)
    df['saldo_num'] = pd.to_numeric(df['saldo'], errors='coerce').fillna(0).astype(int)
    
    # Renomear e estruturar
    df['Ponto_Numero'] = df['ponto_id']
    df['Endereco_Completo'] = df['endereco']
    df['Subprefeitura'] = df['subprefeitura']
    df['Regiao'] = df['regiao']
    df['Telefone_Ponto'] = df['telefone_ponto'].fillna('—')
    df['Distancia_Sede_Chame_Taxi_km'] = df['dist_km']
    df['Qtd_Motoristas_Mapeados'] = df['qtd_mot']
    df['Nomes_Motoristas_Mapeados'] = df['nomes_mot']
    df['Telefones_Motoristas_Ponto'] = df['telefones_mot']
    df['Capacidade_Total_Vagas'] = df['capacidade_num']
    df['Vagas_Ocupadas'] = df['ocupada_num']
    df['Saldo_Vagas_Disponiveis'] = df['saldo_num']
    
    # Definir Rota, Horário e Estratégia
    df['Cluster_Rota'] = df.apply(define_rota, axis=1)
    df['Horario_Ideal_Visita'] = df.apply(define_horario, axis=1)
    df['Estrategia_Abordagem_Campo'] = df.apply(define_estrategia, axis=1)
    
    # Score de Prioridade de Visita (0 a 100)
    def calc_score_visita(row):
        sc = 30
        dist = row['Distancia_Sede_Chame_Taxi_km']
        if dist is not None:
            if dist <= 3.0: sc += 35
            elif dist <= 6.0: sc += 25
            elif dist <= 10.0: sc += 15
        if row['Qtd_Motoristas_Mapeados'] >= 5: sc += 25
        elif row['Qtd_Motoristas_Mapeados'] >= 1: sc += 15
        if row['Saldo_Vagas_Disponiveis'] > 0: sc += 10
        if "Terminais" in row['Cluster_Rota']: sc += 15
        return min(sc, 100)
        
    df['Score_Prioridade_Visita'] = df.apply(calc_score_visita, axis=1)
    
    # Tier de Visita
    def calc_tier_visita(sc):
        if sc >= 75: return "Prioridade 1 (Visita Imediata - Semana 1)"
        elif sc >= 55: return "Prioridade 2 (Visita Curto Prazo - Semanas 2 e 3)"
        else: return "Prioridade 3 (Visita de Expansão - Semana 4+)"
        
    df['Tier_Visita_Campo'] = df['Score_Prioridade_Visita'].apply(calc_tier_visita)
    
    # Ordenar por Prioridade e Distância
    df.sort_values(by=['Score_Prioridade_Visita', 'Qtd_Motoristas_Mapeados', 'Distancia_Sede_Chame_Taxi_km'], ascending=[False, False, True], inplace=True)
    
    cols_export = [
        'Ponto_Numero', 'Cluster_Rota', 'Tier_Visita_Campo', 'Score_Prioridade_Visita',
        'Endereco_Completo', 'Subprefeitura', 'Regiao', 'Distancia_Sede_Chame_Taxi_km',
        'Horario_Ideal_Visita', 'Estrategia_Abordagem_Campo',
        'Qtd_Motoristas_Mapeados', 'Nomes_Motoristas_Mapeados', 'Telefones_Motoristas_Ponto',
        'Telefone_Ponto', 'Capacidade_Total_Vagas', 'Vagas_Ocupadas', 'Saldo_Vagas_Disponiveis',
        'latitude', 'longitude'
    ]
    
    df_export = df[cols_export].copy()
    
    print(f"\nResumo por Rota Tática de Visitas:")
    print(df_export['Cluster_Rota'].value_counts())
    
    print(f"\nResumo por Tier de Visita:")
    print(df_export['Tier_Visita_Campo'].value_counts())
    
    print(f"\nSalvando CSV: {OUT_CSV}")
    df_export.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
    
    print(f"Salvando Excel: {OUT_XLSX}")
    with pd.ExcelWriter(OUT_XLSX, engine='openpyxl') as writer:
        df_export.to_excel(writer, sheet_name='Roteiro_Visitas_Pontos', index=False)
        
    print("=" * 80)
    print("ROTEIRO TÁTICO DE CAMPO GERADO COM SUCESSO!")
    print(f"-> CSV: {OUT_CSV}")
    print(f"-> Excel: {OUT_XLSX}")
    print("=" * 80)

if __name__ == "__main__":
    main()
