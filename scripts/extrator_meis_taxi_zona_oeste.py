# -*- coding: utf-8 -*-
"""
scripts/extrator_meis_taxi_zona_oeste.py
Extrator e Estruturador de MEIs de Táxi (CNAE 4923-0/01) para a Cooperativa Chame Táxi (Butantã)

Objetivo:
  Mapear, filtrar e qualificar taxistas formalizados como MEI (Microempreendedor Individual)
  no município de São Paulo (com foco em Butantã e Zona Oeste) e cidades conurbadas
  (Osasco, Taboão da Serra, Cotia, Carapicuíba, Barueri).

Atributos de Qualificação:
  - CNAE Principal: 4923-0/01 (Serviço de táxi)
  - Natureza Jurídica: 213-5 (Empresário Individual / MEI)
  - Situação Cadastral: ATIVA
  - Geo-localização em relação à sede da Chame Táxi (Butantã / Av. Vital Brasil)
  - Canais de Contato: Telefones comerciais/celulares, e-mails, CEP e bairro.
"""

import sys
import os
import json
import re
import math
import pandas as pd
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Coordenadas de referência da Sede Chame Táxi (Butantã, São Paulo - SP)
CHAME_TAXI_LAT = -23.5715
CHAME_TAXI_LON = -46.7082

# Bairros estratégicos da Zona Oeste / Butantã
BAIRROS_ZONA_OESTE = {
    'BUTANTA', 'BUTANTÃ', 'RIO PEQUENO', 'JARDIM BONFIGLIOLI', 'BONFIGLIOLI',
    'VILA SONIA', 'VILA SÔNIA', 'CAXINGUI', 'JARDIM PERI PERI', 'JARDIM GUEDALA',
    'CIDADE UNIVERSITARIA', 'CIDADE UNIVERSITÁRIA', 'JAGUARE', 'JAGUARÉ',
    'PINHEIROS', 'VILA MADALENA', 'SUMAREZINHO', 'ALTO DE PINHEIROS',
    'LAPA', 'VILA LEOPOLDINA', 'VILA ROMANA', 'PERDIZES', 'BARRA FUNDA',
    'MORUMBI', 'VILA ANDRADE', 'PANAMBY', 'REAL PARQUE', 'PORTAL DO MORUMBI',
    'RAPOSO TAVARES', 'JARDIM D ABRIL', 'JARDIM SARAH', 'VILA SAO FRANCISCO'
}

MUNICIPIOS_CORREDOR_OESTE = {
    'SAO PAULO', 'SÃO PAULO', 'OSASCO', 'TABOAO DA SERRA', 'TABOÃO DA SERRA',
    'COTIA', 'CARAPICUIBA', 'CARAPICUÍBA', 'BARUERI', 'EMBU DAS ARTES', 'ITAPECERICA DA SERRA'
}

FONTE_MEIS = Path(__file__).resolve().parent.parent / "data" / "private" / "base_meis_zona_oeste_fonte.json"
SAIDA_DIR = Path(__file__).resolve().parent.parent / "Novos Alvarás 2026"


def load_fonte_meis() -> list:
    """Carrega a base-fonte de MEIs (contém dado pessoal) de data/private/."""
    if not FONTE_MEIS.exists():
        raise SystemExit(
            "ERRO: base-fonte de MEIs não encontrada: "
            f"{FONTE_MEIS}\n"
            "Os dados dos titulares são mantidos fora do versionamento (LGPD)."
        )
    with open(FONTE_MEIS, encoding="utf-8") as fh:
        return json.load(fh)


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calcula a distância aproximada em km entre duas coordenadas geográficas."""
    if pd.isna(lat1) or pd.isna(lon1) or pd.isna(lat2) or pd.isna(lon2):
        return None
    R = 6371.0 # Raio da Terra em km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def classify_proximity_tier(bairro, municipio, dist_km=None):
    """Classifica o MEI em faixas de conveniência logística até o Butantã."""
    m_norm = str(municipio).upper().strip()
    b_norm = str(bairro).upper().strip()
    
    if dist_km is not None:
        if dist_km <= 5.0:
            return "Raio 1 - Imediato (0 a 5 km da Sede Chame Táxi)"
        elif dist_km <= 10.0:
            return "Raio 2 - Curto (5 a 10 km da Sede Chame Táxi)"
        elif dist_km <= 18.0:
            return "Raio 3 - Metropolitano Oeste (10 a 18 km)"
        else:
            return "Raio 4 - Expandido (> 18 km)"
            
    # Fallback por bairro/cidade
    if any(b in b_norm for b in ['BUTANTA', 'BUTANTÃ', 'BONFIGLIOLI', 'RIO PEQUENO', 'CAXINGUI', 'VILA SONIA', 'PERI PERI']):
        return "Raio 1 - Imediato (0 a 5 km da Sede Chame Táxi)"
    elif any(b in b_norm for b in ['PINHEIROS', 'JAGUARE', 'JAGUARÉ', 'MORUMBI', 'LAPA', 'VILA MADALENA', 'RAPOSO TAVARES']):
        return "Raio 2 - Curto (5 a 10 km da Sede Chame Táxi)"
    elif m_norm in ['OSASCO', 'TABOAO DA SERRA', 'TABOÃO DA SERRA', 'COTIA']:
        return "Raio 3 - Metropolitano Oeste (10 a 18 km)"
    else:
        return "Raio 4 - Município Geral de São Paulo"

def build_chame_taxi_mei_registry():
    """
    Estrutura a base analítica de MEIs de Táxi da Zona Oeste e Capital.
    Integra amostras reais de MEIs de táxi registrados com o schema canônico
    da Receita Federal para enriquecimento comercial da Chame Táxi.
    """
    print("[1/3] Estruturando schema canônico de MEIs (CNAE 4923-0/01) para a Chame Táxi...")
    
    # Amostra representativa com casos reais extraídos da base do DTP e da Receita Federal
    # cruzando com taxistas que operam em pontos e no Butantã
    # Dados pessoais dos titulares (nome, endereço residencial, telefone,
    # e-mail) ficam em data/private/, fora do versionamento — ver
    # scripts/privacy.py.
    sample_meis = load_fonte_meis()

    df_meis = pd.DataFrame(sample_meis)
    
    print("[2/3] Calculando geodistâncias e clusters de proximidade da Chame Táxi (Butantã)...")
    df_meis['Distancia_Sede_Chame_Taxi_km'] = df_meis.apply(
        lambda r: haversine_distance(CHAME_TAXI_LAT, CHAME_TAXI_LON, r['Latitude'], r['Longitude']),
        axis=1
    )
    
    df_meis['Cluster_Proximidade'] = df_meis.apply(
        lambda r: classify_proximity_tier(r['Bairro'], r['Municipio'], r['Distancia_Sede_Chame_Taxi_km']),
        axis=1
    )
    
    # Priorização comercial Chame Táxi
    def calc_mei_score(row):
        score = 60
        if "Raio 1" in row['Cluster_Proximidade']:
            score += 25
        elif "Raio 2" in row['Cluster_Proximidade']:
            score += 20
        elif "Raio 3" in row['Cluster_Proximidade']:
            score += 15
        else:
            score += 10
            
        if row['WhatsApp_Provavel'] == 'Sim':
            score += 10
        if 'SIM' in row['Alvara_Prefeitura']:
            score += 5
        return min(100, score)
        
    df_meis['Score_Conversao_Chame_Taxi'] = df_meis.apply(calc_mei_score, axis=1)
    df_meis = df_meis.sort_values(by=['Score_Conversao_Chame_Taxi', 'Distancia_Sede_Chame_Taxi_km'], ascending=[False, True])

    print("[3/3] Exportando artefatos de inteligência de MEIs...")
    workspace_dir = SAIDA_DIR
    out_csv = workspace_dir / "base_meis_taxi_butanta_zona_oeste.csv"
    out_xlsx = workspace_dir / "base_meis_taxi_butanta_zona_oeste.xlsx"
    
    df_meis.to_csv(out_csv, sep=';', index=False, encoding='utf-8-sig')
    df_meis.to_excel(out_xlsx, index=False)
    
    print(f"-> Arquivo CSV gerado: {out_csv}")
    print(f"-> Arquivo XLSX gerado: {out_xlsx}")
    print(f"\nResumo da Base de MEIs Próximos ao Butantã:")
    print(df_meis[['CNPJ', 'Titular_Nome', 'Bairro', 'Municipio', 'Distancia_Sede_Chame_Taxi_km', 'Score_Conversao_Chame_Taxi']].to_string())
    return df_meis

if __name__ == '__main__':
    build_chame_taxi_mei_registry()
