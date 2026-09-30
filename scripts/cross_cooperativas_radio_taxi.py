# -*- coding: utf-8 -*-
"""
scripts/cross_cooperativas_radio_taxi.py
Cruzamento Territorial e Estratégico com as Cooperativas de Rádio-Táxi de São Paulo.

Mapeia as principais cooperativas de rádio-táxi da capital paulista
(Chame Táxi Butantã, Coopertax Planalto Paulista, Vermelho e Branco Vila Clementino,
Guarucoop Leste/Guarulhos, Central Rádio Táxi Centro), calculando a distância e afinidade
de cada um dos 16.863 motoristas e classificando-os para captação agressiva pela Chame Táxi.
"""

import math
import re
import sys
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
PJ_CSV = BASE_DIR / "data" / "processed" / "empresas_taxi_pj_ativas_sp.csv"
OUT_CSV = BASE_DIR / "data" / "processed" / "cruzamento_cooperativas_taxi_sp.csv"
OUT_XLSX = BASE_DIR / "Novos Alvarás 2026" / "mapa_estrategico_cooperativas_chame_taxi.xlsx"

# Coordenadas geográficas das sedes das principais cooperativas de SP
COOPERATIVAS = {
    'Chame Táxi (Nossa Sede)': {
        'cnpj': '47.136.430/0001-07',
        'endereco': 'Av. Vital Brasil, Butantã, São Paulo - SP',
        'lat': -23.5714,
        'lon': -46.7081,
        'zona': 'Zona Oeste',
        'posicionamento': 'Base Local / Fidelidade Máxima'
    },
    'Coopertax': {
        'cnpj': '48.549.331/0001-01',
        'endereco': 'Al. dos Tupinás, 275, Planalto Paulista, São Paulo - SP',
        'lat': -23.6120,
        'lon': -46.6530,
        'zona': 'Zona Sul (Aeroporto Congonhas / Planalto)',
        'posicionamento': 'Concorrente Direto (Frota Ampla)'
    },
    'Rádio Táxi Vermelho e Branco': {
        'cnpj': '60.841.675/0001-31',
        'endereco': 'Av. Onze de Junho, Vila Clementino, São Paulo - SP',
        'lat': -23.5980,
        'lon': -46.6430,
        'zona': 'Zona Sul / Centro-Sul',
        'posicionamento': 'Concorrente Tradicional (Hospitalar/Vila Mariana)'
    },
    'Guarucoop / Guarucooper': {
        'cnpj': '42.332.474/0001-80',
        'endereco': 'Rua São Donaciano, 126, Cidade Patriarca / GRU',
        'lat': -23.5280,
        'lon': -46.4950,
        'zona': 'Zona Leste / Aeroporto Guarulhos',
        'posicionamento': 'Concorrente Focado em Aeroporto GRU'
    },
    'Central Rádio Táxi': {
        'cnpj': '59.290.320/0001-76',
        'endereco': 'Centro Histórico / Bela Vista, São Paulo - SP',
        'lat': -23.5510,
        'lon': -46.6410,
        'zona': 'Centro Expandido',
        'posicionamento': 'Concorrente Corporativo Centro'
    }
}

def haversine(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def main():
    print("=" * 80)
    print("CRUZAMENTO ESTRATÉGICO COM COOPERATIVAS DE RÁDIO-TÁXI DE SÃO PAULO")
    print("=" * 80)

    if not MASTER_CSV.exists():
        print(f"Erro: {MASTER_CSV} não encontrado.")
        return

    df_m = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    print(f"Total de motoristas na base: {len(df_m):,}")

    chame_lat = COOPERATIVAS['Chame Táxi (Nossa Sede)']['lat']
    chame_lon = COOPERATIVAS['Chame Táxi (Nossa Sede)']['lon']

    resultados = []
    for _, r in df_m.iterrows():
        did = r.get('ID_Master', '')
        nome = r.get('Nome_Completo', '')
        status = r.get('Status_Sorteio_2026', '')
        edital = r.get('Edital_Numero', '')
        tel1 = r.get('Telefone_Celular_1', '')
        wpp = r.get('WhatsApp_Ativo', '')
        ponto_vinc = str(r.get('Vinculo_Ponto_Privativo', ''))
        regiao = str(r.get('MEI_Regiao_Macro', ''))

        # Distância calculada da Chame Táxi
        dist_raw = str(r.get('MEI_Distancia_Sede_Chame_Taxi_km', '')).replace(',', '.')
        dist_chame = None
        try:
            dist_chame = float(dist_raw)
        except Exception:
            pass

        # Análise de Afinidade Territorial
        if dist_chame is not None:
            if dist_chame <= 5.0:
                dominio_territorial = "Território Núcleo Chame Táxi (Butantã/Pinheiros/USP)"
                fit_coop = "Prioridade Máxima de Conversão Chame Táxi"
            elif dist_chame <= 10.0:
                dominio_territorial = "Raio Imediato Zona Oeste / Lapa"
                fit_coop = "Alta Afinidade Chame Táxi"
            elif dist_chame <= 18.0:
                dominio_territorial = "Centro Expandido / Zona Sul Próxima"
                fit_coop = "Zona de Disputa (Chame Táxi vs Concorrentes)"
            else:
                dominio_territorial = "Região Periférica / Leste / Extremo Sul"
                fit_coop = "Conversão via Aplicativo / Foco Digital"
        else:
            if "Oeste" in regiao or "Butantã" in regiao:
                dominio_territorial = "Território Núcleo Chame Táxi (Zona Oeste)"
                fit_coop = "Alta Afinidade Chame Táxi"
            else:
                dominio_territorial = "São Paulo / Capital Ampla"
                fit_coop = "Conversão via Aplicativo / Foco Digital"

        # Dependência de Rádio Táxi
        if any(k in ponto_vinc.upper() for k in ['ÓRFÃO', 'ORFAO', 'LIVRE', 'SEM PONTO']):
            perfil_despacho = "Ponto Livre / Sem Ponto (100% Dependente de Rádio Táxi/App)"
            urgencia_adesao = "Crítica (Precisa de Rádio Imediato)"
        else:
            perfil_despacho = "Ponto Privativo Vinculado"
            urgencia_adesao = "Complementar (Busca Corridas Corporativas)"

        resultados.append({
            'ID_Master': did,
            'Nome_Motorista': nome,
            'Status_Sorteio_2026': status,
            'Edital_Numero': edital,
            'Telefone_Contato': tel1,
            'WhatsApp_Ativo': wpp,
            'Distancia_Sede_Chame_Taxi_km': r.get('MEI_Distancia_Sede_Chame_Taxi_km', '—'),
            'Regiao_Macro': regiao,
            'Dominio_Territorial': dominio_territorial,
            'Fit_Comercial_Chame_Taxi': fit_coop,
            'Perfil_Despacho_Radio': perfil_despacho,
            'Urgencia_Adesao_Cooperativa': urgencia_adesao,
            'Vinculo_Ponto': ponto_vinc,
            'Vantagem_Competitiva_Chame_Taxi': "Sede própria no Butantã, isenção inicial de taxa, convênios corporativos B2B exclusivos e apoio na vistoria DTP"
        })

    df_res = pd.DataFrame(resultados)
    df_res.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
    print(f"Arquivo CSV salvo: {OUT_CSV}")

    # Exportar Excel com abas estratégicas
    with pd.ExcelWriter(OUT_XLSX, engine='openpyxl') as writer:
        df_res.to_excel(writer, sheet_name='Geral_16k_Motoristas', index=False)
        
        # Aba 1: Núcleo Chame Táxi (Zona Oeste / até 10km)
        nucleo = df_res[df_res['Dominio_Territorial'].str.contains('Núcleo|Zona Oeste', na=False)]
        nucleo.to_excel(writer, sheet_name='Nucleo_Zona_Oeste', index=False)
        
        # Aba 2: Contemplados Ponto Livre (Órfãos com urgência crítica)
        orfaos_contemp = df_res[df_res['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False) & df_res['Urgencia_Adesao_Cooperativa'].str.contains('Crítica', na=False)]
        orfaos_contemp.to_excel(writer, sheet_name='Contemplados_Orfaos_Criticos', index=False)
        
        # Aba 3: Cooperativas Mapeadas em SP
        df_coops = pd.DataFrame([
            {
                'Cooperativa': k,
                'CNPJ': v['cnpj'],
                'Endereco': v['endereco'],
                'Zona_Atuacao': v['zona'],
                'Posicionamento_Mercado': v['posicionamento']
            }
            for k, v in COOPERATIVAS.items()
        ])
        df_coops.to_excel(writer, sheet_name='Cooperativas_Mapeadas_SP', index=False)

    print(f"Arquivo Excel estratégico salvo: {OUT_XLSX}")
    print("\nResumo do Cruzamento Territorial:")
    print(df_res['Dominio_Territorial'].value_counts().to_string())

if __name__ == '__main__':
    main()
