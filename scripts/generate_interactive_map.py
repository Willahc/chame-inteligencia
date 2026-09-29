#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/generate_interactive_map.py.

Gera visualização geoespacial interativa (HTML via Folium) a partir dos dados do Gate 5 e Gate 6:
- 261 pontos DTP <-> OSM consolidados (diferenciados por nível de confiança).
- Mapa de calor (HeatMap) ponderado pelo saldo/capacidade de vagas do DTP.
- Polígonos das 14 subprefeituras com 0% de cobertura (vazios cartográficos do mapeamento voluntário).
- Métricas executivas integradas diretamente no layout.
"""

import json
from pathlib import Path
import folium
from folium.plugins import Fullscreen, HeatMap, MiniMap
import pyproj

# Definição de caminhos
BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR = BASE_DIR / "data" / "raw"
OUTPUT_HTML = PROCESSED_DIR / "mapa_interativo_pontos_taxi_sp.html"

# 14 Subprefeituras com 0% de cobertura identificadas no Gate 6
SUBPREFEITURAS_VAZIO = {
    "ARICANDUVA-FORMOSA-CARRAO", "PENHA", "CAMPO LIMPO", "PIRITUBA-JARAGUA",
    "CAPELA DO SOCORRO", "ITAQUERA", "SAO MIGUEL PAULISTA", "SAO MIGUEL", "ITAIM PAULISTA",
    "GUAIANASES", "CIDADE TIRADENTES", "ERMELINO MATARAZZO", "M'BOI MIRIM", "M BOI MIRIM",
    "CIDADE ADEMAR", "PERUS-ANHANGUERA"
}


def normalizar_texto(texto: str) -> str:
    """Normaliza texto para conferência de nomes sem acentuação."""
    import unicodedata
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).upper().strip()


def main():
    print("[1/5] Carregando arquivos de dados consolidados e limites...")

    geojson_path = PROCESSED_DIR / "pontos_taxi_sp_consolidado.geojson"
    subpref_candidates = [
        RAW_DIR / "geosampa" / "subprefeituras" / "subprefeitura_geosampa_20260923T1045.geojson",
        RAW_DIR / "subprefeituras" / "subprefeitura_geosampa_20260923T1045.geojson",
        RAW_DIR / "subprefeitura_geosampa_20260923T1045.geojson"
    ]
    subpref_path = next((p for p in subpref_candidates if p.exists()), subpref_candidates[0])

    if not geojson_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {geojson_path}")

    with open(geojson_path, "r", encoding="utf-8") as f:
        pontos_data = json.load(f)

    # Coordenadas centrais de São Paulo (Praça da Sé)
    sp_center = [-23.5505, -46.6333]
    m = folium.Map(
        location=sp_center,
        zoom_start=11,
        tiles=None,
        control_scale=True
    )
    # Provedores 100% livres, sem restrição de API key
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        attr="Esri World Street Map",
        name="Esri Ruas (Padrão - Sem API)",
        overlay=False,
        control=True
    ).add_to(m)
    folium.TileLayer(
        tiles="https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attr="&copy; OpenStreetMap contributors",
        name="OpenStreetMap Oficial",
        overlay=False,
        control=True
    ).add_to(m)
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr="Esri World Imagery",
        name="Esri Satélite / Aérea",
        overlay=False,
        control=True
    ).add_to(m)

    # 1. Camada de Vazios Cartográficos (14 Subprefeituras sem nenhum ponto mapeado no OSM)
    if subpref_path.exists():
        print(f"[2/5] Processando polígonos das subprefeituras ({subpref_path.name}) e isolando vazios cartográficos...")
        with open(subpref_path, "r", encoding="utf-8") as f:
            subpref_geo = json.load(f)

        # Reprojeta geometrias de EPSG:31983 para EPSG:4326 se necessário
        transformer = pyproj.Transformer.from_crs("EPSG:31983", "EPSG:4326", always_xy=True)

        vazios_features = []
        for feature in subpref_geo.get("features", []):
            props = feature.get("properties", {})
            nome_sub = props.get("sp_nome") or props.get("nm_subprefeitura", "")
            if normalizar_texto(nome_sub) in SUBPREFEITURAS_VAZIO:
                feat_copy = json.loads(json.dumps(feature))
                coords = feat_copy["geometry"]["coordinates"]
                gtype = feat_copy["geometry"]["type"]

                # Verifica se está em coordenadas métricas (UTM EPSG:31983)
                sample_pt = coords[0][0] if gtype == "Polygon" else coords[0][0][0]
                if abs(sample_pt[0]) > 180 or abs(sample_pt[1]) > 90:
                    if gtype == "Polygon":
                        new_coords = [[list(transformer.transform(x, y)) for x, y in ring] for ring in coords]
                    elif gtype == "MultiPolygon":
                        new_coords = [[[list(transformer.transform(x, y)) for x, y in ring] for ring in poly] for poly in coords]
                    feat_copy["geometry"]["coordinates"] = new_coords

                feat_copy["properties"]["sp_nome"] = nome_sub
                vazios_features.append(feat_copy)

        vazios_geojson = {
            "type": "FeatureCollection",
            "features": vazios_features
        }

        fg_vazios = folium.FeatureGroup(
            name="Vazios Cartográficos (14 Subprefeituras com 0% OSM)",
            show=True
        )

        folium.GeoJson(
            vazios_geojson,
            style_function=lambda x: {
                "fillColor": "#ff4d4f",
                "color": "#cf1322",
                "weight": 2,
                "fillOpacity": 0.25,
                "dashArray": "5, 5"
            },
            tooltip=folium.GeoJsonTooltip(
                fields=["sp_nome"],
                aliases=["Subprefeitura (Vazio OSM):"],
                localize=True
            )
        ).add_to(fg_vazios)
        fg_vazios.add_to(m)
        print(f"      -> {len(vazios_features)} subprefeituras em vazio cartográfico renderizadas.")
    else:
        print(f"Aviso: Camada {subpref_path} não encontrada. Ignorando polígonos de vazio.")

    # 2. Camada de Pontos Consolidados (Marcadores Individuais com Tooltips Técnicos)
    print("[3/5] Gerando marcadores dos 261 pontos consolidados...")
    fg_alta = folium.FeatureGroup(name="Pontos Consolidados - Alta Confiança (ID Checado)", show=True)
    fg_media = folium.FeatureGroup(name="Pontos Consolidados - Média Confiança (Fuzzy/Região)", show=True)

    heat_data = []

    for feature in pontos_data.get("features", []):
        props = feature.get("properties", {})
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]

        # Suporte a ambos os schemas de atributos DTP e OSM
        dtp_ponto = props.get("dtp_ponto") or props.get("dtp_ponto_id", "S/N")
        dtp_end = props.get("dtp_logradouro") or props.get("dtp_endereco", "Não informado")
        dtp_cap = props.get("dtp_capacidade") if props.get("dtp_capacidade") is not None else props.get("dtp_vagas_capacidade", 0)
        dtp_saldo = props.get("dtp_saldo") if props.get("dtp_saldo") is not None else props.get("dtp_vagas_saldo", 0)
        dtp_sub = props.get("dtp_subprefeitura") or props.get("geosampa_subprefeitura", "")
        osm_name = props.get("osm_name") or props.get("osm_official_name") or "Ponto de Táxi"
        osm_cap = props.get("osm_capacity") or "N/D"
        match_tier = props.get("match_tier") or props.get("matching_confidence", "HIGH")
        match_status = props.get("match_status") or props.get("matching_status", "")

        # Ponderação para o mapa de calor (latitude, longitude, peso=capacidade regulamentada)
        heat_data.append([lat, lon, float(dtp_cap) if dtp_cap else 1.0])

        popup_html = f"""
        <div style="font-family: Arial, sans-serif; width: 280px; font-size: 12px;">
            <h4 style="margin: 0 0 5px 0; color: #1f1f1f; border-bottom: 2px solid #0958d9;">
                Ponto DTP #{dtp_ponto}
            </h4>
            <b>Nome OSM:</b> {osm_name}<br>
            <b>Logradouro DTP:</b> {dtp_end}<br>
            <b>Subprefeitura:</b> {dtp_sub}<br>
            <hr style="margin: 5px 0; border: 0; border-top: 1px solid #e8e8e8;">
            <b>Capacidade DTP:</b> {dtp_cap} vagas (Saldo Edital: {dtp_saldo})<br>
            <b>Baias OSM (Físicas):</b> {osm_cap}<br>
            <b>Nível de Confiança:</b> <span style="color: {'#389e0d' if match_tier == 'HIGH' else '#d48806'}; font-weight: bold;">{match_tier}</span><br>
            <span style="font-size: 10px; color: #8c8c8c;">Status: {match_status}</span>
        </div>
        """

        if match_tier == "HIGH":
            folium.CircleMarker(
                location=[lat, lon],
                radius=6,
                color="#0958d9",
                fill=True,
                fill_color="#1677ff",
                fill_opacity=0.85,
                weight=1.5,
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"Ponto DTP #{dtp_ponto} ({dtp_cap} vagas)"
            ).add_to(fg_alta)
        else:
            folium.CircleMarker(
                location=[lat, lon],
                radius=6,
                color="#d46b08",
                fill=True,
                fill_color="#fa8c16",
                fill_opacity=0.85,
                weight=1.5,
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"Ponto DTP #{dtp_ponto} [Fuzzy] ({dtp_cap} vagas)"
            ).add_to(fg_media)

    fg_alta.add_to(m)
    fg_media.add_to(m)

    # 3. Mapa de Calor (HeatMap) Ponderado pelas Vagas Regulamentares
    print("[4/5] Gerando mapa de calor de concentração de vagas...")
    fg_heat = folium.FeatureGroup(name="Concentração de Vagas (Heatmap DTP)", show=False)
    HeatMap(
        heat_data,
        radius=18,
        blur=14,
        max_zoom=13,
        min_opacity=0.3
    ).add_to(fg_heat)
    fg_heat.add_to(m)

    # 4. Plugins e Controles
    Fullscreen(position="topright").add_to(m)
    MiniMap(toggle_display=True, position="bottomright").add_to(m)
    folium.LayerControl(position="topright", collapsed=False).add_to(m)

    # 5. Card Flutuante de Indicadores Executivos
    legenda_html = """
    <div style="
        position: fixed; 
        bottom: 25px; 
        left: 25px; 
        z-index: 1000; 
        background: rgba(255, 255, 255, 0.95);
        padding: 14px 18px; 
        border-radius: 8px; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 18px;
        max-width: 320px;
    ">
        <b style="font-size: 13px; color: #1f1f1f;">Consolidação DTP ↔ OSM (Gates 5 & 6)</b><br>
        <div style="margin-top: 6px;">
            <i style="background: #1677ff; width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></i>
            &nbsp;Alta Confiança (ID checado): <b>195</b> (74,7%)<br>
            <i style="background: #fa8c16; width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></i>
            &nbsp;Média Confiança (Fuzzy): <b>66</b> (25,3%)<br>
            <i style="background: rgba(255, 77, 79, 0.35); border: 1px dashed #cf1322; width: 12px; height: 10px; display: inline-block;"></i>
            &nbsp;Vazio OSM (0% cobertura): <b>14 subprefeituras</b>
        </div>
        <hr style="margin: 8px 0; border: 0; border-top: 1px solid #f0f0f0;">
        <span style="font-size: 11px; color: #595959;">
            <b>Relação Spot Balance:</b> 3,6 vagas de direito (DTP) para cada baia física sinalizada (OSM).
        </span>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legenda_html))

    print(f"[5/5] Salvando mapa em {OUTPUT_HTML}...")
    m.save(str(OUTPUT_HTML))
    print(f"Sucesso: Mapa HTML gerado em: {OUTPUT_HTML}")


if __name__ == "__main__":
    main()
