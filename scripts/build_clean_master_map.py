# -*- coding: utf-8 -*-
import os
import re
import sys
import json
import pandas as pd

def build_clean_master_map():
    # 1. Carregar mapa original / processado
    source_map = r'data\processed\mapa_interativo_pontos_taxi_sp.html'
    if not os.path.exists(source_map):
        print(f"Erro: mapa de origem não encontrado: {source_map}")
        sys.exit(1)
    with open(source_map, 'r', encoding='utf-8') as f:
        html = f.read()

    # Ponto de corte inicial: logo após o MiniMap
    cut_start_marker = "map_80bf05ff3b688bb597cf3cb0f80601e8.addControl(mini_map_d3bfa71941b03c49ef9acaf513169460);"
    idx_start = html.find(cut_start_marker)
    if idx_start == -1:
        print("Erro: cut_start_marker não encontrado.")
        sys.exit(1)

    insert_point = idx_start + len(cut_start_marker)

    # Ponto de corte final: onde começa o layer_control
    cut_end_marker = "var layer_control_3ec3a973265a83a563457e8a3c2e15e5_layers"
    idx_end = html.find(cut_end_marker, insert_point)
    if idx_end == -1:
        print("Erro: cut_end_marker não encontrado.")
        sys.exit(1)

    # Extrair prefixo (onde estão o mapa, camadas base e controles iniciais)
    prefix = html[:insert_point]

    # CORREÇÃO CRÍTICA DE TILES E BASE LAYERS NO PREFIXO:
    # 1. Remover .addTo() duplicados que forçavam todas as base layers a carregarem ao mesmo tempo
    prefix = prefix.replace("tile_layer_dac86240bbe1a5948a684d8a315526d4.addTo(map_80bf05ff3b688bb597cf3cb0f80601e8);", "// tile_layer_dac862 (desativado no boot)")
    prefix = prefix.replace("tile_layer_db84e99aea2aedf1ba9ce0708884a9a5.addTo(map_80bf05ff3b688bb597cf3cb0f80601e8);", "// tile_layer_db84 (desativado no boot)")

    # 2. Substituir OpenStreetMap por Esri Topo e Esri Street para erradicar 403 e requisição de API
    prefix = prefix.replace(
        "tile_layer_dac86240bbe1a5948a684d8a315526d4 = L.tileLayer(\n                \"https://tile.openstreetmap.org/{z}/{x}/{y}.png\",",
        "tile_layer_dac86240bbe1a5948a684d8a315526d4 = L.tileLayer(\n                \"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}\","
    )
    prefix = prefix.replace(
        "tile_layer_d48f005b0aeef28d8e83bf8ec31b0bea = L.tileLayer(\n                \"https://tile.openstreetmap.org/{z}/{x}/{y}.png\",",
        "tile_layer_d48f005b0aeef28d8e83bf8ec31b0bea = L.tileLayer(\n                \"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}\","
    )

    # Carregar MEIs
    meis_csv = r'Novos Alvarás 2026\base_meis_taxi_butanta_zona_oeste.csv'
    df_meis = pd.read_csv(meis_csv, sep=';', encoding='utf-8-sig') if os.path.exists(meis_csv) else pd.DataFrame()

    # Carregar Polos
    polos_csv = r'data\processed\polos_formacao_taxistas_cfc_dtp.csv'
    df_polos = pd.read_csv(polos_csv, sep=';', encoding='utf-8-sig') if os.path.exists(polos_csv) else pd.DataFrame()

    js_code = "\n\n            // CAMADA MEIs ZONA OESTE (10 EMPRESAS)\n"
    js_code += "            var feature_group_meis = L.featureGroup().addTo(map_80bf05ff3b688bb597cf3cb0f80601e8);\n"

    for _, r in df_meis.iterrows():
        lat = r.get('Latitude')
        lon = r.get('Longitude')
        if pd.notna(lat) and pd.notna(lon):
            titular = str(r.get('Titular_Nome', ''))
            razao = str(r.get('Razao_Social', ''))
            cnpj = str(r.get('CNPJ', ''))
            tel = f"({r.get('DDD_1','11')}) {r.get('Telefone_1','')}"
            end = f"{r.get('Logradouro','')}, {r.get('Numero','')}"
            bairro = str(r.get('Bairro', ''))
            dist = str(r.get('Distancia_Sede_Chame_Taxi_km', ''))

            popup = (
                f'<div style="font-family: Arial, sans-serif; width: 280px; font-size: 12px;">'
                f'<h4 style="margin: 0 0 5px 0; color: #4338ca; border-bottom: 2px solid #6366f1;">MEI ATIVO: {titular}</h4>'
                f'<b>Razão:</b> {razao}<br>'
                f'<b>CNPJ:</b> {cnpj}<br>'
                f'<b>Endereço:</b> {end} - {bairro}<br>'
                f'<b>Distância Chame Táxi:</b> {dist} km<br>'
                f'<hr style="margin: 5px 0; border: 0; border-top: 1px solid #e8e8e8;">'
                f'<b>Contato:</b> <a href="https://wa.me/55{tel.replace("(","").replace(")","").replace("-","").replace(" ","")}" target="_blank" style="color:#059669;font-weight:bold;">WhatsApp: {tel}</a>'
                f'</div>'
            )

            js_code += f"""
            L.circleMarker([{lat}, {lon}], {{
                radius: 8,
                fillColor: '#6366f1',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }}).bindPopup({json.dumps(popup)}).addTo(feature_group_meis);
            """

    js_code += "\n            // CAMADA POLOS INSTITUCIONAIS DTP / CFC / IPEM (26 POLOS)\n"
    js_code += "            var feature_group_polos = L.featureGroup().addTo(map_80bf05ff3b688bb597cf3cb0f80601e8);\n"

    for _, r in df_polos.iterrows():
        lat = r.get('lat')
        lon = r.get('lon')
        if pd.notna(lat) and pd.notna(lon):
            nome = str(r.get('nome', ''))
            tipo = str(r.get('tipo', ''))
            end = str(r.get('endereco', ''))
            bairro = str(r.get('bairro', ''))
            tel = str(r.get('telefone', ''))

            color = '#ef4444' if 'REGULADOR' in tipo else ('#f97316' if 'AFERICAO' in tipo else '#10b981')

            popup = (
                f'<div style="font-family: Arial, sans-serif; width: 280px; font-size: 12px;">'
                f'<h4 style="margin: 0 0 5px 0; color: #1e293b; border-bottom: 2px solid {color};">{nome}</h4>'
                f'<b>Tipo:</b> {tipo}<br>'
                f'<b>Endereço:</b> {end} - {bairro}<br>'
                f'<b>Telefone:</b> {tel}<br>'
                f'</div>'
            )

            js_code += f"""
            L.circleMarker([{lat}, {lon}], {{
                radius: 9,
                fillColor: '{color}',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }}).bindPopup({json.dumps(popup)}).addTo(feature_group_polos);
            """

    # Reconstruir o layer_control_overlays limpo com 100% Esri (sem API)
    layer_control_clean = """var layer_control_3ec3a973265a83a563457e8a3c2e15e5_layers = {
                base_layers : {
                    "Esri Ruas (Padrão Oficial - Sem API)" : tile_layer_d2c9505104ccf84ee7f2d4ab708d1f74,
                    "Esri Satélite / Aérea" : tile_layer_db84e99aea2aedf1ba9ce0708884a9a5,
                    "Esri Topográfico & Relevo" : tile_layer_dac86240bbe1a5948a684d8a315526d4,
                },
                overlays :  {
                    "MEIs Zona Oeste - Butantã (10)" : feature_group_meis,
                    "Polos DTP / CFC / IPEM (26)" : feature_group_polos,
                    "Vazios Cartográficos (14 Subprefeituras com 0% OSM)" : feature_group_a85683c5acbb7ed0f2cb867920bb2baf,
                    "Pontos Consolidados - Alta Confiança (ID Checado)" : feature_group_60a831e513c026287a434699c8ddbc7e,
                    "Pontos Consolidados - Média Confiança (Fuzzy/Região)" : feature_group_e9a008f61d93ead2e2f376f4e5a0e7e2,
                    "Concentração de Vagas (Heatmap DTP)" : feature_group_ea327bc36ef639adce4863f5d54e725d,
                },
            };
            let layer_control_3ec3a973265a83a563457e8a3c2e15e5 = L.control.layers(
                layer_control_3ec3a973265a83a563457e8a3c2e15e5_layers.base_layers,
                layer_control_3ec3a973265a83a563457e8a3c2e15e5_layers.overlays,
                {
  "position": "topright",
  "collapsed": false,
  "autoZIndex": true,
}
            ).addTo(map_80bf05ff3b688bb597cf3cb0f80601e8);
</script>
</html>"""

    full_clean_map = prefix + js_code + "\n            " + layer_control_clean

    out_paths = [
        r'data\processed\mapa_interativo_pontos_taxi_sp.html',
        'mapa_interativo_pontos_taxi_sp.html',
        r'Novos Alvarás 2026\mapa_interativo_pontos_taxi_sp.html'
    ]

    for p in out_paths:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(full_clean_map)
        print(f"Salvo mapa mestre perfeito: {p} ({len(full_clean_map):,} bytes)")

if __name__ == '__main__':
    build_clean_master_map()
