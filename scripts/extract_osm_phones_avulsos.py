import pandas as pd
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN_CSV = ROOT / "data" / "processed" / "osm_pontos_sem_dtp.csv"
OUT_CSV = ROOT / "data" / "processed" / "pontos_taxis_avulsos_com_telefone_osm.csv"
OUT_EXCEL = ROOT / "Novos Alvarás 2026" / "pontos_taxis_avulsos_com_telefone_osm.xlsx"

df_osm = pd.read_csv(IN_CSV, sep=';', encoding='utf-8')
osm_ph = df_osm[df_osm['phone'].notna()].copy()

valid = []
for _, r in osm_ph.iterrows():
    p = str(r['phone']).strip()
    dig = re.sub(r'\D', '', p)
    if len(dig) >= 10:
        valid.append({
            'OSM_ID': r['osm_id'],
            'Nome_Ponto': r['name'] if pd.notna(r['name']) else 'Ponto de Táxi',
            'Telefone_Totem': p,
            'Logradouro': r['addr_street'] if pd.notna(r['addr_street']) else '',
            'Numero': r['addr_housenumber'] if pd.notna(r['addr_housenumber']) else '',
            'Subprefeitura': r['geosampa_subprefeitura'] if pd.notna(r['geosampa_subprefeitura']) else '',
            'Distrito': r['geosampa_distrito'] if pd.notna(r['geosampa_distrito']) else '',
            'Latitude': r['latitude'],
            'Longitude': r['longitude'],
            'Capacidade_Vagas': r['capacity'] if pd.notna(r['capacity']) else ''
        })

df_valid = pd.DataFrame(valid)
df_valid.sort_values(by=['Subprefeitura', 'Distrito', 'Nome_Ponto'], inplace=True)
df_valid.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
df_valid.to_excel(OUT_EXCEL, index=False, engine='openpyxl')
print(f"Exportados {len(df_valid)} pontos com telefone válido do OSM para {OUT_CSV.name} e {OUT_EXCEL.name}")
