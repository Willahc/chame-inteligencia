# -*- coding: utf-8 -*-
"""scripts/generate_dashboard_app.py.

Gera ferramenta web interativa completa (Dashboard analítico, filtros reativos em tempo real,
mapa Leaflet OpenStreetMap/Esri sem necessidade de API key, heatmap, polígonos de vazios,
Radar de Prospecção & Recrutamento Comercial para a Cooperativa Chame Táxi,
    e Módulo de Atos DOC com os polos cadastrados, Sede do DTP e Monitor do Diário Oficial).

Entradas:
  - data/processed/pontos_taxi_sp_consolidado.geojson
  - data/processed/dtp_pontos_sem_osm.csv
  - data/processed/osm_pontos_sem_dtp.csv
  - data/processed/ranking_prospeccao_taxistas_chame_taxi.csv
  - data/processed/polos_formacao_taxistas_cfc_dtp.json
  - data/processed/diario_oficial_taxistas_sp_2026.json
  - docs/metricas_analise_gate6.json
  - data/raw/geosampa/subprefeituras/subprefeitura_geosampa_20260923T1045.geojson

Saída:
  - data/processed/dashboard_pontos_taxi_sp.html
"""

import argparse
import csv
import html
import json
import os
from pathlib import Path
import pyproj

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR = BASE_DIR / "data" / "raw"
DOCS_DIR = BASE_DIR / "docs"

GEOJSON_CONSOLIDADO = PROCESSED_DIR / "pontos_taxi_sp_consolidado.geojson"
METRICAS_JSON = DOCS_DIR / "metricas_analise_gate6.json"
DTP_SEM_OSM_CSV = PROCESSED_DIR / "dtp_pontos_sem_osm.csv"
OSM_SEM_DTP_CSV = PROCESSED_DIR / "osm_pontos_sem_dtp.csv"
RECRUITMENT_CSV = PROCESSED_DIR / "ranking_prospeccao_taxistas_chame_taxi.csv"
POLOS_JSON = PROCESSED_DIR / "polos_formacao_taxistas_cfc_dtp.json"
DOC_JSON = PROCESSED_DIR / "diario_oficial_taxistas_sp_2026.json"
SUBPREF_GEOJSON = RAW_DIR / "geosampa" / "subprefeituras" / "subprefeitura_geosampa_20260923T1045.geojson"

OUTPUT_HTML = PROCESSED_DIR / "dashboard_pontos_taxi_sp.html"

SUBPREFEITURAS_VAZIO = {
    "ARICANDUVA-FORMOSA-CARRAO", "PENHA", "CAMPO LIMPO", "PIRITUBA-JARAGUA",
    "CAPELA DO SOCORRO", "ITAQUERA", "SAO MIGUEL", "ITAIM PAULISTA",
    "GUAIANASES", "CIDADE TIRADENTES", "ERMELINO MATARAZZO", "M BOI MIRIM",
    "CIDADE ADEMAR", "PERUS-ANHANGUERA"
}


def format_number(value) -> str:
    return f"{int(value):,}".replace(",", ".")


def html_text(value) -> str:
    return html.escape(str(value or ""), quote=True)


def json_for_script(value) -> str:
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        .replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def normalize_identifier(value) -> str:
    text = str(value or "").strip()
    return text if text and text not in {"...", ".", "-"} else "—"


def normalize_doc_data(records: list, include_personal_data: bool = False) -> list[dict]:
    normalized = []
    for item in records or []:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        row["nome_motorista"] = str(row.get("nome_motorista") or "Não identificado")
        row["condutax_num"] = normalize_identifier(row.get("condutax_num"))
        row["alvara_num"] = normalize_identifier(row.get("alvara_num"))
        row["processo_sei"] = str(row.get("processo_sei") or "—")
        row["tipo_ato"] = str(row.get("tipo_ato") or "Não identificado")
        row["status"] = str(row.get("status") or "Não identificado")
        row["categoria"] = str(row.get("categoria") or "Não informada")
        row["acao_chame_taxi"] = str(row.get("acao_chame_taxi") or "")
        row["data_publicacao"] = str(row.get("data_publicacao") or "—")
        row["doc_id"] = str(row.get("doc_id") or "—")
        row["doc_url"] = str(row.get("doc_url") or "")
        if not include_personal_data:
            row["nome_motorista"] = "Omitido"
            row["condutax_num"] = "—"
            row["alvara_num"] = "—"
            row["processo_sei"] = "—"
            row["doc_id"] = ""
            row["doc_url"] = ""
        row.pop("resumo_texto", None)
        row.pop("cedente_anterior", None)
        normalized.append(row)
    return normalized


def normalize_polos(records: list) -> list[dict]:
    normalized = []
    for item in records or []:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        row["id"] = str(row.get("id") or "")
        row["tipo"] = str(row.get("tipo") or "")
        row["nome"] = str(row.get("nome") or "Não identificado")
        row["endereco"] = str(row.get("endereco") or "")
        row["bairro"] = str(row.get("bairro") or "")
        row["cep"] = str(row.get("cep") or "")
        row["subprefeitura"] = str(row.get("subprefeitura") or "")
        row["regiao"] = str(row.get("regiao") or "")
        row["telefone"] = str(row.get("telefone") or "")
        row["servicos"] = str(row.get("servicos") or "")
        row["estrategia_chame_taxi"] = str(row.get("estrategia_chame_taxi") or "")
        normalized.append(row)
    return normalized


def load_reprojected_vazios():
    """Carrega os polígonos das subprefeituras em vazio e reprojeta para WGS 84."""
    if not SUBPREF_GEOJSON.exists():
        return {"type": "FeatureCollection", "features": []}

    with open(SUBPREF_GEOJSON, "r", encoding="utf-8-sig") as f:
        gj = json.load(f)

    transformer = pyproj.Transformer.from_crs("EPSG:31983", "EPSG:4326", always_xy=True)
    vazios_features = []

    for feat in gj.get("features", []):
        props = feat.get("properties", {})
        nome = props.get("nm_subprefeitura") or props.get("sp_nome", "")
        if nome in SUBPREFEITURAS_VAZIO or nome.replace("'", "") in SUBPREFEITURAS_VAZIO:
            coords = feat["geometry"]["coordinates"]
            gtype = feat["geometry"]["type"]
            sample_pt = coords[0][0] if gtype == "Polygon" else coords[0][0][0]

            if abs(sample_pt[0]) > 180 or abs(sample_pt[1]) > 90:
                if gtype == "Polygon":
                    new_coords = [[list(transformer.transform(x, y)) for x, y in ring] for ring in coords]
                elif gtype == "MultiPolygon":
                    new_coords = [[[list(transformer.transform(x, y)) for x, y in ring] for ring in poly] for poly in coords]
            else:
                new_coords = coords

            vazios_features.append({
                "type": "Feature",
                "geometry": {"type": gtype, "coordinates": new_coords},
                "properties": {
                    "nm_subprefeitura": nome,
                    "regiao": props.get("nm_regiao_05", ""),
                    "area_km2": props.get("qt_area_quilometro", 0)
                }
            })

    return {"type": "FeatureCollection", "features": vazios_features}


def main(include_doc_personal_data: bool = False):
    print("[1/4] Carregando bases consolidadas, métricas e polos de formação...")

    with open(GEOJSON_CONSOLIDADO, "r", encoding="utf-8") as f:
        pontos_geojson = json.load(f)

    with open(METRICAS_JSON, "r", encoding="utf-8") as f:
        metricas = json.load(f)

    vazios_geojson = load_reprojected_vazios()

    # Carrega polos de formação, documentação e aferição
    polos_data = []
    if POLOS_JSON.exists():
        with open(POLOS_JSON, "r", encoding="utf-8") as f:
            polos_data = json.load(f)

    # Carrega monitor do Diário Oficial
    doc_data = []
    if DOC_JSON.exists():
        with open(DOC_JSON, "r", encoding="utf-8") as f:
            doc_data = json.load(f)
    doc_data = normalize_doc_data(doc_data, include_personal_data=include_doc_personal_data)
    doc_privacy_notice = (
        "Atenção: este HTML inclui dados pessoais do Diário Oficial; mantenha-o em ambiente protegido."
        if include_doc_personal_data
        else "Modo público: nomes, Condutax, alvará, SEI e URL do DOC foram omitidos."
    )
    polos_data = normalize_polos(polos_data)

    # Mapeamento de coordenadas por ID e endereço normalizado dos pontos consolidados
    coords_by_id = {}
    coords_by_addr = {}
    for feat in pontos_geojson["features"]:
        props = feat["properties"]
        pid = str(props.get("dtp_ponto_id") or "")
        addr = (props.get("dtp_endereco") or "").strip().upper()
        c = feat["geometry"]["coordinates"]
        if pid:
            coords_by_id[pid] = c
        if addr:
            coords_by_addr[addr] = c

    # Monta lista completa de prospecção dos pontos oficiais
    recruitment_targets = []
    if RECRUITMENT_CSV.exists():
        with open(RECRUITMENT_CSV, "r", encoding="utf-8-sig") as f:
            for r in csv.DictReader(f, delimiter=";"):
                pid = str(r.get("ponto_id") or "")
                addr = (r.get("endereco") or "").strip().upper()
                c = coords_by_id.get(pid)
                c_by_address = coords_by_addr.get(addr)
                recruitment_targets.append({
                    "ponto_id": pid,
                    "endereco": r.get("endereco", ""),
                    "subprefeitura": r.get("subprefeitura", ""),
                    "distrito": r.get("distrito", ""),
                    "regiao": r.get("regiao", ""),
                    "taxistas_vinculados": int(r.get("taxistas_vinculados") or 0),
                    "capacidade_vagas": int(r.get("capacidade_vagas") or 0),
                    "telefone": r.get("telefone_ponto", ""),
                    "origem": r.get("origem", ""),
                    "lat": c[1] if c else None,
                    "lon": c[0] if c else None,
                    "geolocalizado": bool(c),
                    "localizado_por_endereco": bool(c_by_address and not c)
                })
    else:
        for feat in pontos_geojson["features"]:
            p = feat["properties"]
            c = feat["geometry"]["coordinates"]
            recruitment_targets.append({
                "ponto_id": str(p.get("dtp_ponto_id") or ""),
                "endereco": p.get("dtp_endereco", ""),
                "subprefeitura": p.get("geosampa_subprefeitura") or p.get("dtp_regiao", ""),
                "distrito": p.get("geosampa_distrito", ""),
                "regiao": p.get("dtp_regiao", ""),
                "taxistas_vinculados": int(p.get("dtp_vagas_ocupadas") or 0),
                "capacidade_vagas": int(p.get("dtp_vagas_capacidade") or 0),
                "telefone": p.get("osm_phone", ""),
                "lat": c[1],
                "lon": c[0],
                "geolocalizado": True,
                "localizado_por_endereco": False
            })

    recruitment_targets.sort(key=lambda x: x["taxistas_vinculados"], reverse=True)
    pontos_com_telefone = [t for t in recruitment_targets if t["telefone"]]
    total_pontos = len(pontos_geojson["features"])
    total_alvos = len(recruitment_targets)
    total_taxistas = sum(t["taxistas_vinculados"] for t in recruitment_targets)
    total_vagas = sum(t["capacidade_vagas"] for t in recruitment_targets)
    matched_vagas = sum(t["capacidade_vagas"] for t in recruitment_targets if t["geolocalizado"])
    total_telefones = len(pontos_com_telefone)
    total_cfcs = sum(p.get("tipo") == "CFC_TAXISTA" for p in polos_data)
    total_dtps = sum(p.get("tipo") == "ORGAO_REGULADOR" for p in polos_data)
    total_vazios_subpref = len(metricas.get("subprefeituras_cobertura_zero", []))
    confidence_counts = {
        "HIGH": sum(
            f.get("properties", {}).get("matching_confidence") == "HIGH"
            for f in pontos_geojson["features"]
        ),
        "MEDIUM": sum(
            f.get("properties", {}).get("matching_confidence") != "HIGH"
            for f in pontos_geojson["features"]
        ),
    }
    high_confidence = confidence_counts["HIGH"]
    medium_confidence = confidence_counts["MEDIUM"]

    print(f"[2/4] Preparando dados: {total_pontos} consolidados, {total_alvos} alvos, {len(polos_data)} polos de formação...")

    regioes = sorted(list(set(f["properties"].get("dtp_regiao", "") for f in pontos_geojson["features"] if f["properties"].get("dtp_regiao"))))
    subprefeituras = sorted(list(set(f["properties"].get("geosampa_subprefeitura", "") for f in pontos_geojson["features"] if f["properties"].get("geosampa_subprefeitura"))))

    # Serializa dados para injeção JS
    data_points_json = json_for_script(pontos_geojson["features"])
    vazios_json = json_for_script(vazios_geojson)
    metricas_json_str = json_for_script(metricas)
    recruitment_json_str = json_for_script(recruitment_targets)
    polos_json_str = json_for_script(polos_data)
    doc_json_str = json_for_script(doc_data)

    print("[3/4] Montando template HTML da aplicação interativa...")

    html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Observatório & Radar de Afiliação • Chame Táxi Intelligence</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Leaflet CSS & JS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  
  <!-- Leaflet Heatmap Plugin -->
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  
  <!-- FontAwesome Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
  
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <style>
    body {{
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc;
    }}
    #map {{
      height: 100%;
      min-height: 480px;
      width: 100%;
      border-radius: 0.75rem;
      z-index: 10;
    }}
    .custom-scrollbar::-webkit-scrollbar {{
      width: 6px;
      height: 6px;
    }}
    .custom-scrollbar::-webkit-scrollbar-track {{
      background: #f1f5f9;
    }}
    .custom-scrollbar::-webkit-scrollbar-thumb {{
      background: #cbd5e1;
      border-radius: 3px;
    }}
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {{
      background: #94a3b8;
    }}
    .tab-btn.active {{
      background-color: #0284c7;
      color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.25);
    }}
    .subtab-btn.active {{
      background-color: #0f172a;
      color: #ffffff;
    }}
  </style>
</head>
<body class="text-slate-800 flex flex-col h-screen overflow-hidden">

  <!-- 1. HEADER PRINCIPAL -->
  <header class="bg-slate-900 text-white px-6 py-3 flex flex-wrap items-center justify-between border-b border-slate-800 shadow-md flex-shrink-0 z-30">
    <div class="flex items-center space-x-3">
      <div class="bg-amber-400 text-slate-950 p-2 rounded-xl font-black text-xl flex items-center justify-center w-10 h-10 shadow-lg shadow-amber-400/20">
        <i class="fa-solid fa-taxi"></i>
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-base font-bold tracking-tight text-white">Observatório & Radar de Afiliação • São Paulo</h1>
          <span class="bg-amber-400/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-400/30">Chame Táxi Intelligence</span>
        </div>
        <p class="text-xs text-slate-400">Inteligência Territorial DTP (Edital de Vagas) ↔ OpenStreetMap + Expansão Comercial</p>
      </div>
    </div>

    <!-- Navegação de Abas -->
    <div class="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 text-xs">
      <button onclick="switchTab('mapa')" id="btn-tab-mapa" class="tab-btn active px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5">
        <i class="fa-solid fa-map-location-dot"></i>
        <span>Mapa & Pontos</span>
      </button>
      
      <button onclick="switchTab('recrutamento')" id="btn-tab-recrutamento" class="tab-btn px-3.5 py-1.5 rounded-lg font-bold text-amber-400 hover:text-white transition flex items-center space-x-1.5 bg-amber-400/10 border border-amber-400/30">
        <i class="fa-solid fa-bullseye text-amber-400"></i>
        <span>🎯 Prospecção & Afiliação</span>
      </button>

      <button onclick="switchTab('analytics')" id="btn-tab-analytics" class="tab-btn px-3.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white transition flex items-center space-x-1.5">
        <i class="fa-solid fa-chart-pie"></i>
        <span>Dashboards</span>
      </button>
      <button onclick="switchTab('vazios')" id="btn-tab-vazios" class="tab-btn px-3.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white transition flex items-center space-x-1.5">
        <i class="fa-solid fa-triangle-exclamation text-rose-400"></i>
        <span>Diagnóstico de Vazios</span>
      </button>
    </div>

    <!-- Ações e Contagem -->
    <div class="flex items-center space-x-3">
        <div class="text-right">
          <span class="text-[11px] text-slate-400">Pontos Georreferenciados</span>
          <div class="text-sm font-bold text-sky-400" id="header-counter">{total_pontos} de {total_alvos} pontos</div>
        </div>
      <button onclick="downloadRecruitmentCSV()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-3.5 py-2 rounded-lg font-bold shadow-md transition flex items-center space-x-1.5">
        <i class="fa-solid fa-file-arrow-down"></i>
        <span>Planilha de Prospecção</span>
      </button>
    </div>
  </header>

  <!-- 2. RIBBON DE KPIS -->
  <div class="bg-white border-b border-slate-200 px-6 py-2 grid grid-cols-2 md:grid-cols-6 gap-3 flex-shrink-0 z-20 text-xs shadow-sm">
    <div class="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-center justify-between">
      <div>
        <p class="text-slate-500 font-medium text-[11px]">Pontos Georreferenciados</p>
        <h3 class="text-base font-bold text-slate-900" id="kpi-pontos">{total_pontos} <span class="text-[10px] font-normal text-slate-500">/ {total_alvos}</span></h3>
      </div>
      <div class="w-7 h-7 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
        <i class="fa-solid fa-location-dot"></i>
      </div>
    </div>

    <div class="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-center justify-between">
      <div>
        <p class="text-slate-500 font-medium text-[11px]">Vagas Reguladas</p>
        <h3 class="text-base font-bold text-slate-900" id="kpi-vagas">{format_number(matched_vagas)} <span class="text-[10px] font-normal text-slate-500">vagas</span></h3>
      </div>
      <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
        <i class="fa-solid fa-square-parking"></i>
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between">
      <div>
        <p class="text-amber-800 font-bold text-[11px]">Telefones de Ponto</p>
        <h3 class="text-base font-bold text-amber-700" id="kpi-telefones">{total_telefones} <span class="text-[10px] font-normal text-slate-500">pontos</span></h3>
      </div>
      <div class="w-7 h-7 rounded-full bg-amber-200/70 text-amber-800 flex items-center justify-center font-bold text-xs">
        <i class="fa-solid fa-phone-volume"></i>
      </div>
    </div>

    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-2 flex items-center justify-between">
      <div>
        <p class="text-indigo-800 font-bold text-[11px]">CFCs Formadores</p>
        <h3 class="text-base font-bold text-indigo-700">{total_cfcs} <span class="text-[10px] font-normal text-slate-500">centros</span></h3>
      </div>
      <div class="w-7 h-7 rounded-full bg-indigo-200/70 text-indigo-800 flex items-center justify-center font-bold text-xs">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
    </div>

    <div class="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center justify-between">
      <div>
        <p class="text-rose-800 font-bold text-[11px]">Sede Central DTP</p>
        <h3 class="text-base font-bold text-rose-700">Pari <span class="text-[10px] font-normal text-slate-500">(100% novos)</span></h3>
      </div>
      <div class="w-7 h-7 rounded-full bg-rose-200/70 text-rose-800 flex items-center justify-center font-bold text-xs">
        <i class="fa-solid fa-building-columns"></i>
      </div>
    </div>

    <div class="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-center justify-between">
      <div>
        <p class="text-slate-500 font-medium text-[11px]">Vazios OSM</p>
         <h3 class="text-base font-bold text-slate-700">{total_vazios_subpref} <span class="text-[10px] font-normal text-slate-500">subprefs</span></h3>
      </div>
      <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
        <i class="fa-solid fa-map"></i>
      </div>
    </div>
  </div>

  <!-- 3. ÁREA DE CONTEÚDO PRINCIPAL -->
  <div class="flex flex-1 overflow-hidden">
    
    <!-- SIDEBAR DE FILTROS INTERATIVOS -->
    <aside class="w-72 bg-white border-r border-slate-200 p-4 flex flex-col space-y-4 flex-shrink-0 overflow-y-auto custom-scrollbar z-10 text-xs shadow-sm">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <h2 class="font-bold text-slate-900 flex items-center space-x-1.5 text-sm">
          <i class="fa-solid fa-filter text-sky-600"></i>
          <span>Filtros Dinâmicos</span>
        </h2>
        <button onclick="resetFilters()" class="text-sky-600 hover:text-sky-800 font-medium hover:underline text-[11px]">
          Resetar
        </button>
      </div>

      <!-- RADAR CHAME TÁXI (DESTAQUE COMERCIAL) -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
        <label class="font-bold text-amber-900 flex items-center space-x-1.5 text-xs">
          <i class="fa-solid fa-bullseye text-amber-600"></i>
          <span>Radar de Afiliação Chame Táxi</span>
        </label>
        <div class="space-y-1.5 text-slate-800">
          <label class="flex items-center space-x-2 cursor-pointer font-medium">
            <input type="checkbox" id="filter-com-telefone" onchange="applyFilters()" class="rounded text-amber-600 focus:ring-amber-500">
            <span>📞 Apenas com Telefone ({len(pontos_com_telefone)})</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer font-medium">
            <input type="checkbox" id="filter-mega-pontos" onchange="applyFilters()" class="rounded text-amber-600 focus:ring-amber-500">
            <span>🏆 Mega-Pontos (≥ 20 vagas)</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer font-medium">
            <input type="checkbox" id="filter-saldo-aberto" onchange="applyFilters()" class="rounded text-amber-600 focus:ring-amber-500">
            <span>⏳ Com Saldo Aberto no Sorteio</span>
          </label>
        </div>
      </div>

      <!-- Campo de Busca Textual -->
      <div>
        <label class="font-semibold text-slate-700 block mb-1">Buscar Ponto / Logradouro / Tel</label>
        <div class="relative">
          <input type="text" id="filter-search" oninput="applyFilters()" placeholder="Nº do ponto, rua, telefone..." 
                 class="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition">
          <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400"></i>
        </div>
      </div>

      <!-- Filtro por Macrorregião -->
      <div>
        <label class="font-semibold text-slate-700 block mb-1">Macrorregião</label>
        <select id="filter-regiao" onchange="onRegiaoChange()" class="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition">
          <option value="">Todas as Regiões</option>
           {''.join(f'<option value="{html_text(r)}">{html_text(r)}</option>' for r in regioes)}
        </select>
      </div>

      <!-- Filtro por Subprefeitura -->
      <div>
        <label class="font-semibold text-slate-700 block mb-1">Subprefeitura</label>
        <select id="filter-subpref" onchange="applyFilters()" class="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition">
          <option value="">Todas as Subprefeituras</option>
           {''.join(f'<option value="{html_text(s)}">{html_text(s)}</option>' for s in subprefeituras)}
        </select>
      </div>

      <!-- Filtro Nível de Confiança -->
      <div>
        <label class="font-semibold text-slate-700 block mb-1">Nível de Confiança</label>
        <div class="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button type="button" onclick="setConfidenceFilter('')" id="btn-conf-all" class="conf-btn active py-1 rounded font-medium bg-white text-slate-800 shadow-sm text-center">Todos</button>
          <button type="button" onclick="setConfidenceFilter('HIGH')" id="btn-conf-high" class="conf-btn py-1 rounded font-medium text-slate-600 hover:text-slate-900 text-center">Alta</button>
          <button type="button" onclick="setConfidenceFilter('MEDIUM')" id="btn-conf-med" class="conf-btn py-1 rounded font-medium text-slate-600 hover:text-slate-900 text-center">Média</button>
        </div>
      </div>

      <!-- Controles de Camadas no Mapa -->
      <div class="pt-2 border-t border-slate-100 space-y-2">
        <label class="font-semibold text-slate-700 block mb-1">Camadas do Mapa</label>
        
        <label class="flex items-center justify-between text-slate-700 cursor-pointer">
          <span class="flex items-center space-x-1.5">
            <i class="fa-solid fa-graduation-cap text-indigo-600"></i>
            <span class="font-medium">CFCs & Sede DTP ({len(polos_data)})</span>
          </span>
          <input type="checkbox" id="layer-polos" checked onchange="togglePolos()" class="toggle-checkbox rounded text-indigo-600 focus:ring-indigo-500">
        </label>

        <label class="flex items-center justify-between text-slate-700 cursor-pointer">
          <span class="flex items-center space-x-1.5">
            <i class="fa-solid fa-fire text-amber-500"></i>
            <span>Mapa de Calor (Vagas)</span>
          </span>
          <input type="checkbox" id="layer-heatmap" onchange="toggleHeatmap()" class="toggle-checkbox rounded text-amber-600 focus:ring-amber-500">
        </label>

        <label class="flex items-center justify-between text-slate-700 cursor-pointer">
          <span class="flex items-center space-x-1.5">
            <i class="fa-solid fa-draw-polygon text-rose-500"></i>
            <span>Vazios Cartográficos (14)</span>
          </span>
          <input type="checkbox" id="layer-vazios" checked onchange="toggleVazios()" class="toggle-checkbox rounded text-rose-600 focus:ring-rose-500">
        </label>
      </div>

      <!-- Resumo -->
      <div class="mt-auto pt-4 border-t border-slate-100 text-[11px] text-slate-500">
        <i class="fa-solid fa-circle-info text-sky-600 mr-1"></i>
        Clique em qualquer ponto ou polo no mapa para ver dados comerciais e contatos.
      </div>
    </aside>

    <!-- PAINEL CENTRAL (CONTEÚDO DINÂMICO DAS ABAS) -->
    <main class="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
      
      <!-- ABA 1: MAPA & LISTA INTEGRADA -->
      <section id="tab-mapa" class="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          
          <!-- MAPA LEAFLET -->
          <div class="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-col relative overflow-hidden">
            <div id="map"></div>
            
            <!-- Legenda Flutuante -->
            <div class="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-md z-[400] text-[11px] space-y-1">
              <div class="font-bold text-slate-800 border-b pb-1 mb-1">Legenda Territorial</div>
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                <span>Ponto DTP Consolidado (Alta Confiança)</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span>Ponto DTP Consolidado (Média Confiança)</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="w-3.5 h-3.5 rounded-full bg-indigo-600 inline-block text-white text-[8px] flex items-center justify-center font-bold">C</span>
                 <span class="font-bold text-indigo-900">CFCs Credenciados ({total_cfcs} Escolas de Taxista)</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="w-3.5 h-3.5 rounded-full bg-rose-600 inline-block text-white text-[8px] flex items-center justify-center font-bold">★</span>
                <span class="font-bold text-rose-900">Sede DTP Pari (Emissão de Condutax)</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="w-3.5 h-3 bg-rose-500/20 border border-dashed border-rose-600 inline-block"></span>
                 <span>{total_vazios_subpref} Subprefeituras em Vazio OSM</span>
              </div>
            </div>
          </div>

          <!-- LISTA / TABELA REATIVA -->
          <div class="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div class="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 class="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <i class="fa-solid fa-list-ol text-slate-500"></i>
                <span>Pontos Encontrados (<span id="table-count">{total_pontos}</span>)</span>
              </h3>
              <span class="text-[11px] text-slate-400">Clique para localizar</span>
            </div>

            <div class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar" id="points-list">
              <!-- Injetado dinamicamente via JS -->
            </div>
          </div>

        </div>
      </section>

      <!-- ABA 2: PROSPECÇÃO & RECRUTAMENTO CHAME TÁXI -->
      <section id="tab-recrutamento" class="flex-1 p-6 overflow-y-auto custom-scrollbar hidden space-y-6">
        
        <!-- BANNER DE CABEÇALHO -->
        <div class="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-6 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="inline-flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              <i class="fa-solid fa-bullseye text-amber-300"></i>
              <span>Inteligência Comercial Chame Táxi</span>
            </div>
            <h2 class="text-2xl font-black tracking-tight">Radar de Recrutamento & Afiliação de Motoristas</h2>
            <p class="text-amber-100 text-xs max-w-2xl leading-relaxed">
               Mapeamento dos {format_number(total_taxistas)} taxistas vinculados aos pontos oficiais: {total_telefones} telefones de ponto mapeados, {total_cfcs} CFCs cadastrados, sede central do DTP e monitor de despachos do Diário Oficial.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="downloadRecruitmentCSV()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-md transition flex items-center space-x-1.5 border border-slate-700">
              <i class="fa-solid fa-file-arrow-down text-amber-400"></i>
               <span>Planilha Pontos ({format_number(total_alvos)})</span>
            </button>
            <button onclick="downloadPolosCSV()" class="bg-indigo-900 hover:bg-indigo-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-md transition flex items-center space-x-1.5 border border-indigo-700">
              <i class="fa-solid fa-graduation-cap text-indigo-300"></i>
              <span>Lista CFCs & DTP (CSV)</span>
            </button>
          </div>
        </div>

        <!-- KPIS ESTRATÉGICOS DE PROSPECÇÃO -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Universo Taxistas</p>
               <h3 class="text-lg font-black text-slate-900 mt-0.5">{format_number(total_taxistas)} <span class="text-[10px] font-normal text-slate-500">oficiais</span></h3>
              <p class="text-[10px] text-emerald-600 font-semibold mt-0.5"><i class="fa-solid fa-check mr-0.5"></i>Alvarás em pontos</p>
            </div>
            <div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-users"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between bg-amber-50/40">
            <div>
              <p class="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Telemarketing</p>
               <h3 class="text-lg font-black text-amber-700 mt-0.5">{total_telefones} <span class="text-[10px] font-normal text-slate-500">pontos</span></h3>
              <p class="text-[10px] text-amber-700 font-semibold mt-0.5"><i class="fa-solid fa-phone mr-0.5"></i>Telefones fixos</p>
            </div>
            <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-phone-volume"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between bg-indigo-50/30">
            <div>
              <p class="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">CFCs Formadores</p>
               <h3 class="text-lg font-black text-indigo-700 mt-0.5">{total_cfcs} <span class="text-[10px] font-normal text-slate-500">escolas</span></h3>
              <p class="text-[10px] text-indigo-600 font-semibold mt-0.5"><i class="fa-solid fa-id-card mr-0.5"></i>Cursos de Condutax</p>
            </div>
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between bg-rose-50/30">
            <div>
              <p class="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Gargalo do DTP</p>
               <h3 class="text-lg font-black text-rose-700 mt-0.5">{total_dtps} Sede <span class="text-[10px] font-normal text-slate-500">Pari</span></h3>
              <p class="text-[10px] text-rose-600 font-semibold mt-0.5"><i class="fa-solid fa-building mr-0.5"></i>100% dos novos</p>
            </div>
            <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-building-columns"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prepostos / Frota</p>
               <h3 class="text-lg font-black text-slate-800 mt-0.5">N/D</h3>
               <p class="text-[10px] text-slate-500 font-semibold mt-0.5"><i class="fa-solid fa-gas-pump mr-0.5"></i>Não quantificado</p>
            </div>
            <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-car-side"></i>
            </div>
          </div>
        </div>

        <!-- NAVEGAÇÃO DE SUB-VISÕES -->
        <div class="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 text-xs">
          <button onclick="switchRecruitmentSubtab('cfcs')" id="subtab-btn-cfcs" class="subtab-btn active px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5">
            <i class="fa-solid fa-graduation-cap"></i>
             <span>Atos e Polos ({total_cfcs} CFCs & DTP)</span>
          </button>

          <button onclick="switchRecruitmentSubtab('doc')" id="subtab-btn-doc" class="subtab-btn bg-white hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 border border-slate-200">
            <i class="fa-solid fa-newspaper"></i>
            <span>Monitor Diário Oficial (DOC)</span>
          </button>

          <button onclick="switchRecruitmentSubtab('telemarketing')" id="subtab-btn-telemarketing" class="subtab-btn bg-white hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 border border-slate-200">
            <i class="fa-solid fa-phone"></i>
            <span>Telemarketing ({total_telefones} Pontos)</span>
          </button>

          <button onclick="switchRecruitmentSubtab('megapontos')" id="subtab-btn-megapontos" class="subtab-btn bg-white hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 border border-slate-200">
            <i class="fa-solid fa-street-view"></i>
            <span>Rota de Campo: Mega-Polos</span>
          </button>

          <button onclick="switchRecruitmentSubtab('periferias')" id="subtab-btn-periferias" class="subtab-btn bg-white hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 border border-slate-200">
            <i class="fa-solid fa-compass"></i>
            <span>Oceano Azul Periférico</span>
          </button>

          <button onclick="switchRecruitmentSubtab('pitch')" id="subtab-btn-pitch" class="subtab-btn bg-white hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 border border-slate-200">
            <i class="fa-solid fa-comments"></i>
            <span>Pitch Comercial</span>
          </button>
        </div>

        <!-- SUB-VISÃO: NOVOS ENTRANTES (CFCs & SEDE DTP) -->
        <div id="subtab-cfcs" class="space-y-4">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <i class="fa-solid fa-graduation-cap text-indigo-600"></i>
                  <span>Centros de Formação de Condutores ({total_cfcs} CFCs de Táxi) e Sede Central do DTP</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                   Seleção operacional baseada na relação institucional de 2024; a vigência e os serviços atuais devem ser confirmados antes de uso.
                </p>
              </div>
              <div class="relative w-72">
                <input type="text" id="cfc-search" oninput="filterPolosTable()" placeholder="Filtrar por nome, bairro, região..." 
                       class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
              </div>
            </div>

            <!-- Destaque Sede DTP Pari -->
            <div class="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                   <span class="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Referência institucional</span>
                  <h4 class="font-black text-rose-950 text-sm">Sede Central do DTP • Rua Joaquim Carlos, 655 (Pari)</h4>
                </div>
                <p class="text-xs text-rose-800 leading-relaxed">
                   <strong>Referência institucional</strong> para emissão do Condutax, vistorias de alvará e transferências conforme os serviços publicados. A vigência e a exigência de comparecimento devem ser confirmadas na fonte oficial antes de qualquer ação.
                </p>
              </div>
               <div class="flex items-center space-x-2">
                 <span class="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2.5 py-2 rounded-lg">Telefone publicado; contato não acionado</span>
                 <button onclick="focusOnMap('DTP_SEDE_CENTRAL', [-46.6180, -23.5265])" class="bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center space-x-1.5">
                  <i class="fa-solid fa-location-dot"></i><span>Ver no Mapa</span>
                </button>
              </div>
            </div>

            <!-- Tabela dos polos de formação -->
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Centro de Formação / Órgão</th>
                    <th class="py-2.5 px-3">Endereço e Bairro</th>
                    <th class="py-2.5 px-3">Região</th>
                    <th class="py-2.5 px-3">Telefone(s)</th>
                    <th class="py-2.5 px-3 text-right">Ações após validação</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100" id="polos-table-body">
                  <!-- Injetado dinamicamente -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- SUB-VISÃO: MONITOR DO DIÁRIO OFICIAL (DOC) -->
        <div id="subtab-doc" class="space-y-4 hidden">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <i class="fa-solid fa-newspaper text-sky-600"></i>
                  <span>Monitor de Despachos Oficiais do DTP • Diário Oficial da Cidade (DOC)</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                   Publicações de atos do Diário Oficial, incluindo transferências, alvarás e registros de condutores no município.
                 </p>
                 <p class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">{doc_privacy_notice}</p>
              </div>
              <button onclick="downloadDocCSV()" class="bg-sky-700 hover:bg-sky-600 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5">
                <i class="fa-solid fa-file-csv"></i><span>Baixar Publicações DOC</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Data DOC</th>
                    <th class="py-2.5 px-3">Tipo de Ato</th>
                    <th class="py-2.5 px-3">Motorista Requerente</th>
                    <th class="py-2.5 px-3">Nº Condutax / Alvará</th>
                    <th class="py-2.5 px-3">Status do Processo</th>
                    <th class="py-2.5 px-3 text-right">Estratégia Chame Táxi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100" id="doc-table-body">
                  <!-- Injetado dinamicamente -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- SUB-VISÃO: TELEMARKETING DIRETO (PONTOS COM TELEFONE) -->
        <div id="subtab-telemarketing" class="space-y-4 hidden">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <i class="fa-solid fa-phone-volume text-amber-600"></i>
                   <span>Pontos com Telefone Fixo Mapeado (Contato Institucional Não Validado)</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                   Telefones publicados para consulta; o dashboard não aciona chamadas, WhatsApp ou agendamentos.
                </p>
              </div>
              <div class="relative w-72">
                <input type="text" id="telemarketing-search" oninput="filterTelemarketingTable()" placeholder="Filtrar por logradouro, bairro..." 
                       class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none">
                <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Ponto / Logradouro</th>
                    <th class="py-2.5 px-3">Subprefeitura / Região</th>
                    <th class="py-2.5 px-3 text-center">Taxistas</th>
                    <th class="py-2.5 px-3">Telefone(s)</th>
                    <th class="py-2.5 px-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100" id="telemarketing-table-body">
                  <!-- Injetado dinamicamente -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- SUB-VISÃO: TOP MEGA-POLOS DE CAMPO -->
        <div id="subtab-megapontos" class="space-y-4 hidden">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 class="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <i class="fa-solid fa-users-viewfinder text-indigo-600"></i>
                 <span>Pontos com Maior Ocupação Declarada (Hipótese para Pesquisa de Campo)</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                 Critério ranking por ocupação declarada; não confirma o tempo parado, demanda ou propensão comercial.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="megapontos-grid">
              <!-- Injetado dinamicamente -->
            </div>
          </div>
        </div>

        <!-- SUB-VISÃO: OCEANO AZUL PERIFÉRICO -->
        <div id="subtab-periferias" class="space-y-4 hidden">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 class="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <i class="fa-solid fa-compass text-emerald-600"></i>
                 <span>Oceano Azul: Hipóteses Territoriais para Pesquisa</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                 Hipóteses de concentração territorial e demanda a validar; o dashboard não mede ociosidade nem comprova propensão à afiliação.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">Zona Leste 2</span>
                <h4 class="font-bold text-slate-900 text-sm">Itaquera, Guaianases, São Miguel & Tiradentes</h4>
                <p class="text-xs text-slate-600 leading-relaxed">
                   Hipótese de demanda a validar em campo; não há medição de ociosidade ou de deslocamentos.
                </p>
                <button onclick="filterMapByRegion('LESTE')" class="w-full mt-2 bg-white hover:bg-slate-100 border text-slate-800 font-semibold py-1.5 rounded-lg text-xs transition">
                  Explorar Pontos no Mapa
                </button>
              </div>

              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">Zona Sul Periférica</span>
                <h4 class="font-bold text-slate-900 text-sm">Campo Limpo, M'Boi Mirim & Capela do Socorro</h4>
                <p class="text-xs text-slate-600 leading-relaxed">
                   Pontos de terminais e hospitais para investigar; a demanda e a ociosidade precisam de validação em campo.
                </p>
                <button onclick="filterMapByRegion('SUL')" class="w-full mt-2 bg-white hover:bg-slate-100 border text-slate-800 font-semibold py-1.5 rounded-lg text-xs transition">
                  Explorar Pontos no Mapa
                </button>
              </div>

              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span class="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">Zona Norte Periférica</span>
                <h4 class="font-bold text-slate-900 text-sm">Pirituba, Jaraguá & Perus-Anhanguera</h4>
                <p class="text-xs text-slate-600 leading-relaxed">
                   Pontos junto a estações e polos locais; qualquer hipótese de demanda ou retorno deve ser validada antes de uso comercial.
                </p>
                <button onclick="filterMapByRegion('NORTE')" class="w-full mt-2 bg-white hover:bg-slate-100 border text-slate-800 font-semibold py-1.5 rounded-lg text-xs transition">
                  Explorar Pontos no Mapa
                </button>
              </div>
            </div>

            <!-- Captação em Postos GNV -->
            <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
              <h4 class="font-bold text-amber-900 flex items-center space-x-1.5 text-sm">
                <i class="fa-solid fa-gas-pump text-amber-600"></i>
                <span>Estratégia para frota / prepostos (quantidade não verificada)</span>
              </h4>
              <p class="text-amber-800 leading-relaxed">
                Durante o abastecimento de Gás Natural (GNV), que demora de 15 a 20 minutos por veículo, os motoristas obrigatoriamente descem do carro. 
                <strong>Postos recomendados para promotores:</strong> Corredores da Marginal Tietê (Ponte das Bandeiras / Vila Maria), Av. do Estado e Radial Leste.
              </p>
            </div>
          </div>
        </div>

        <!-- SUB-VISÃO: PITCH COMERCIAL & ARGUMENTÁRIO -->
        <div id="subtab-pitch" class="space-y-4 hidden">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 class="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <i class="fa-solid fa-comments text-sky-600"></i>
                <span>Guia de Abordagem & Argumentário Comercial (Para Promotores e Telemarketing)</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Utilize as principais dores do taxista tradicional para converter a adesão à cooperativa Chame Táxi.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                <h4 class="font-bold text-rose-900 flex items-center space-x-1.5">
                  <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
                  <span>As Dores Reais do Taxista no Ponto</span>
                </h4>
                <ul class="space-y-1.5 text-rose-800 list-disc list-inside">
                  <li><strong>Ociosidade prolongada:</strong> fica 1h a 2h no ponto sem tocar nenhuma corrida.</li>
                  <li><strong>Taxas abusivas dos grandes apps:</strong> desconto de até 25% a 30% nas corridas particulares.</li>
                  <li><strong>Perda de clientes corporativos:</strong> empresas exigem faturamento eletrônico que o taxista avulso não emite.</li>
                  <li><strong>Falta de suporte:</strong> desamparo quando há problemas com passageiros ou pagamento.</li>
                </ul>
              </div>

              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <h4 class="font-bold text-emerald-900 flex items-center space-x-1.5">
                  <i class="fa-solid fa-handshake text-emerald-600"></i>
                  <span>A Solução da Cooperativa Chame Táxi</span>
                </h4>
                <ul class="space-y-1.5 text-emerald-800 list-disc list-inside">
                  <li><strong>Corridas Corporativas Faturadas:</strong> tíquete médio até 40% superior à corrida comum de rua.</li>
                  <li><strong>Modelo Cooperativo Justo:</strong> o taxista é sócio-cooperado, com taxa justa e transparência.</li>
                  <li><strong>App Moderno de Despacho:</strong> recebe chamadas no celular mesmo quando estiver circulando.</li>
                  <li><strong>Atendimento Humanizado:</strong> central de apoio real que atende pelo telefone e WhatsApp.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </section>

      <!-- ABA 3: DASHBOARDS ANALÍTICOS -->
      <section id="tab-analytics" class="flex-1 p-6 overflow-y-auto custom-scrollbar hidden space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 class="font-bold text-slate-800 text-sm mb-1 flex items-center space-x-2">
              <i class="fa-solid fa-chart-column text-sky-600"></i>
              <span>Distribuição de Pontos e Vagas por Macrorregião</span>
            </h3>
            <p class="text-xs text-slate-500 mb-4">Comparação entre o cadastro DTP e os pontos georreferenciados no OSM</p>
            <div class="flex-1 h-64"><canvas id="chart-regional"></canvas></div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 class="font-bold text-slate-800 text-sm mb-1 flex items-center space-x-2">
              <i class="fa-solid fa-shield-halved text-emerald-600"></i>
              <span>Níveis de Confiança Metodológica (Gate 5)</span>
            </h3>
            <p class="text-xs text-slate-500 mb-4">Relação entre identificador numérico oficial e correspondência textual fuzzy</p>
            <div class="flex-1 h-64 flex items-center justify-center"><canvas id="chart-confianca"></canvas></div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 class="font-bold text-slate-800 text-sm mb-1 flex items-center space-x-2">
              <i class="fa-solid fa-ranking-star text-amber-500"></i>
              <span>Top Subprefeituras com Mais Pontos Oficiais</span>
            </h3>
            <p class="text-xs text-slate-500 mb-4">Concentração das {format_number(total_vagas)} vagas regulamentadas pelo município</p>
            <div class="flex-1 h-64"><canvas id="chart-top-subpref"></canvas></div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 class="font-bold text-slate-800 text-sm mb-1 flex items-center space-x-2">
              <i class="fa-solid fa-scale-unbalanced-flip text-indigo-600"></i>
              <span>Spot Balance: Vagas Regulamentares vs Baias Físicas</span>
            </h3>
            <p class="text-xs text-slate-500 mb-4">Análise nos 112 pontos com contagem física de baias mapeada no OSM</p>
            <div class="flex-1 h-64 flex items-center justify-center"><canvas id="chart-spot-balance"></canvas></div>
          </div>
        </div>
      </section>

      <!-- ABA 4: DIAGNÓSTICO DE VAZIOS CARTOGRÁFICOS -->
      <section id="tab-vazios" class="flex-1 p-6 overflow-y-auto custom-scrollbar hidden space-y-6">
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div class="border-b border-slate-100 pb-4">
            <h3 class="text-base font-bold text-slate-900 flex items-center space-x-2">
              <i class="fa-solid fa-triangle-exclamation text-rose-500"></i>
              <span>Auditoria dos Vazios Cartográficos: 14 Subprefeituras com 0% no OSM</span>
            </h3>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
              O mapeamento colaborativo do OpenStreetMap na capital possui forte viés territorial, hiperconcentrando feições no Centro Expandido (Sé e Pinheiros) e gerando vazios absolutos em {total_vazios_subpref} subprefeituras periféricas que possuem pontos regulamentados com vagas abertas.
            </p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-3">Subprefeitura</th>
                  <th class="py-2.5 px-3">Macrorregião</th>
                  <th class="py-2.5 px-3">Pontos Ativos no DTP</th>
                  <th class="py-2.5 px-3">Pontos Pareados no OSM</th>
                  <th class="py-2.5 px-3">Taxa Cobertura</th>
                  <th class="py-2.5 px-3">Impacto / Gravidade</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100" id="vazios-table-body">
                <!-- Injetado dinamicamente -->
              </tbody>
            </table>
          </div>

          <div class="bg-amber-50/70 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-2 mt-4">
            <h4 class="font-bold flex items-center space-x-1.5 text-amber-800">
              <i class="fa-solid fa-bullhorn"></i>
              <span>Recomendações Institucionais para o DTP / SMT</span>
            </h4>
            <p>1. <strong>Protocolo da Minuta de Solicitação Oficial</strong> para obtenção da camada vetorial cadastral da CET/DTP.</p>
            <p>2. <strong>Publicação de Coordenadas Geográficas</strong> em futuros editais de sorteio, superando o formato textual sem numeração predial.</p>
             <p>3. <strong>Mutirão Cívico de Mapeamento (MapRoulette)</strong> focado nas {total_vazios_subpref} subprefeituras desprovidas de dados abertos.</p>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- 4. MODAL / DETALHES DE PONTO -->
  <div id="point-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
      <div class="flex items-start justify-between border-b pb-3">
        <div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-700" id="modal-badge">Ponto DTP</span>
          <h3 class="text-lg font-bold text-slate-900 mt-1" id="modal-title">Ponto #000</h3>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg p-1">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-3 text-xs" id="modal-body">
        <!-- Injetado dinamicamente -->
      </div>

      <div class="flex justify-end pt-3 border-t">
        <button onclick="closeModal()" class="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold transition">
          Fechar
        </button>
      </div>
    </div>
  </div>

  <!-- 5. SCRIPTS E LÓGICA REATIVA -->
  <script>
    const PONTOS_RAW = {data_points_json};
    const VAZIOS_GEOJSON = {vazios_json};
    const METRICAS = {metricas_json_str};
    const RECRUITMENT_RAW = {recruitment_json_str};
    const POLOS_RAW = {polos_json_str};
    const DOC_RAW = {doc_json_str};

    let map, markersLayer, heatLayer, vaziosLayer, polosLayer;
    let filteredPoints = [...PONTOS_RAW];
    let selectedConfidence = '';
    let currentTab = 'mapa';
    let markersMap = new Map();

    function escapeHtml(value) {{
      return String(value ?? '').replace(/[&<>"']/g, character => ({{
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }}[character]));
    }}

    function phoneHref(value) {{
      return 'tel:' + String(value ?? '').replace(/[^0-9+]/g, '');
    }}

    function htmlAttribute(value) {{
      return escapeHtml(JSON.stringify(String(value ?? '')));
    }}

    function csvCell(value) {{
      let text = String(value ?? '');
      if (/^[=+\\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }}

    window.onload = function() {{
      initMap();
      renderPointsList();
      initCharts();
      renderVaziosTable();
      initRecruitmentTab();
      updateKPIs();
    }};

    function switchTab(tabId) {{
      currentTab = tabId;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('btn-tab-' + tabId).classList.add('active');

      document.getElementById('tab-mapa').classList.add('hidden');
      document.getElementById('tab-recrutamento').classList.add('hidden');
      document.getElementById('tab-analytics').classList.add('hidden');
      document.getElementById('tab-vazios').classList.add('hidden');

      document.getElementById('tab-' + tabId).classList.remove('hidden');

      if (tabId === 'mapa' && map) {{
        setTimeout(() => map.invalidateSize(), 150);
      }}
    }}

    function switchRecruitmentSubtab(subId) {{
      ['cfcs', 'doc', 'telemarketing', 'megapontos', 'periferias', 'pitch'].forEach(id => {{
        const btn = document.getElementById('subtab-btn-' + id);
        const panel = document.getElementById('subtab-' + id);
        if (btn) {{
          btn.classList.remove('active', 'bg-slate-900', 'text-white');
          btn.classList.add('bg-white', 'text-slate-700');
        }}
        if (panel) panel.classList.add('hidden');
      }});

      const activeBtn = document.getElementById('subtab-btn-' + subId);
      const activePanel = document.getElementById('subtab-' + subId);
      if (activeBtn) {{
        activeBtn.classList.remove('bg-white', 'text-slate-700');
        activeBtn.classList.add('active', 'bg-slate-900', 'text-white');
      }}
      if (activePanel) activePanel.classList.remove('hidden');
    }}

    function initMap() {{
      map = L.map('map', {{
        center: [-23.5505, -46.6333],
        zoom: 11,
        zoomControl: true
      }});

      const esriStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{{z}}/{{y}}/{{x}}', {{
        attribution: '&copy; Esri &mdash; Esri Street Map',
        maxZoom: 19
      }}).addTo(map);

      const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }});

      const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{{z}}/{{y}}/{{x}}', {{
        attribution: '&copy; Esri &mdash; Esri Satellite',
        maxZoom: 19
      }});

      L.control.layers({{
        "🗺️ Esri Ruas (Recomendado - Sem API)": esriStreets,
        "🌐 OpenStreetMap Oficial": osmStandard,
        "🛰️ Esri Satélite / Aérea": esriSatellite
      }}, null, {{ position: 'topright' }}).addTo(map);

      markersLayer = L.layerGroup().addTo(map);
      heatLayer = L.layerGroup();
      vaziosLayer = L.layerGroup().addTo(map);
      polosLayer = L.layerGroup().addTo(map);

      // Renderiza polígonos das subprefeituras em vazio
      if (VAZIOS_GEOJSON && VAZIOS_GEOJSON.features) {{
        L.geoJSON(VAZIOS_GEOJSON, {{
          style: function(feat) {{
            return {{
              fillColor: '#ff4d4f',
              color: '#cf1322',
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.22,
              dashArray: '5, 5'
            }};
          }},
          onEachFeature: function(feat, layer) {{
            const p = feat.properties;
             layer.bindTooltip(`<b>Subprefeitura ${{escapeHtml(p.nm_subprefeitura)}}</b><br><span style="color:#cf1322;font-weight:600;">Vazio Cartográfico (0% OSM)</span>`, {{
              sticky: true
            }});
          }}
        }}).addTo(vaziosLayer);
      }}

      // Renderiza Polos de Formação, DTP e IPEM
      renderPolosMarkers();
      renderMapMarkers();
    }}

    function renderPolosMarkers() {{
      polosLayer.clearLayers();
      if (!POLOS_RAW) return;

      POLOS_RAW.forEach(p => {{
        if (!p.lat || !p.lon) return;
        const isDTP = p.tipo === 'ORGAO_REGULADOR';
        const isIPEM = p.tipo === 'AFERICAO_METROLOGICA';
        
        const color = isDTP ? '#b91c1c' : (isIPEM ? '#c2410c' : '#4338ca');
        const fill = isDTP ? '#ef4444' : (isIPEM ? '#f97316' : '#6366f1');
        const radius = isDTP ? 10 : (isIPEM ? 8 : 7);

        const circle = L.circleMarker([p.lat, p.lon], {{
          radius: radius,
          color: color,
          fillColor: fill,
          fillOpacity: 0.9,
          weight: 2
        }});

        const firstPhone = p.telefone ? p.telefone.split(';')[0].trim() : '';

        const popupContent = `
          <div style="font-family:'Inter',sans-serif; width: 280px; font-size: 11px; line-height: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid ${{color}}; padding-bottom: 4px; margin-bottom: 6px;">
              <b style="font-size: 12px; color: #0f172a;">${{isDTP ? '🏛️ SEDE CENTRAL DO DTP' : (isIPEM ? '⏱️ IPEM-SP LACRE TAXÍMETRO' : '🎓 CFC TAXISTA (CURSO CONDUTAX)')}}</b>
            </div>
            <b style="font-size: 13px; color: ${{color}};">${{escapeHtml(p.nome)}}</b><br>
            <b>Endereço:</b> ${{escapeHtml(p.endereco)}} - ${{escapeHtml(p.bairro)}}<br>
            <b>Região:</b> ${{escapeHtml(p.regiao)}} (Subpref: ${{escapeHtml(p.subprefeitura)}})<br>
            
            <div style="background:#f1f5f9; padding:5px 7px; border-radius:6px; margin:6px 0; border:1px solid #e2e8f0;">
              <b>Serviços Oficiais:</b> ${{escapeHtml(p.servicos)}}<br>
              <span style="color:#0369a1; font-weight:700;">Estratégia:</span> ${{escapeHtml(p.estrategia_chame_taxi)}}
            </div>

            ${{firstPhone ? `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 8px; border-radius:6px; margin-top:6px;">
                 <span style="color:#065f46; font-weight:bold;"><i class="fa-solid fa-phone mr-1"></i>${{escapeHtml(firstPhone)}}</span>
                 <span style="color:#047857; font-size:10px;">somente após validação</span>
              </div>
            ` : ''}}
          </div>
        `;

        circle.bindPopup(popupContent);
        circle.bindTooltip(`<b>${{escapeHtml(p.nome)}}</b> (${{escapeHtml(p.bairro)}})`, {{ direction: 'top' }});
        circle.addTo(polosLayer);

        markersMap.set(p.id, circle);
      }});
    }}

    function renderMapMarkers() {{
      markersLayer.clearLayers();

      const heatPoints = [];

      filteredPoints.forEach((feat, index) => {{
        const props = feat.properties;
        const coords = feat.geometry.coordinates;
        const lon = coords[0];
        const lat = coords[1];

        const dtpPonto = props.dtp_ponto_id || props.dtp_ponto || 'S/N';
        const conf = props.matching_confidence || props.match_tier || 'HIGH';
        const isHigh = conf === 'HIGH';
        const cap = props.dtp_vagas_capacidade || props.dtp_capacidade || 1;
        const ocup = props.dtp_vagas_ocupadas || props.dtp_vagas_capacidade || 0;
        const phone = props.osm_phone || '';

        heatPoints.push([lat, lon, Math.min(ocup, 30) / 30]);

        const markerColor = isHigh ? '#2563eb' : '#d97706';
        const fillColor = isHigh ? '#3b82f6' : '#f59e0b';

        const circle = L.circleMarker([lat, lon], {{
          radius: ocup >= 30 ? 9 : (ocup >= 15 ? 7 : 5),
          color: markerColor,
          fillColor: fillColor,
          fillOpacity: 0.85,
          weight: ocup >= 30 ? 2.5 : 1.5
        }});

        let phoneHtml = '';
        if (phone) {{
          const firstPhone = phone.split(';')[0].trim();
          phoneHtml = `
            <div style="margin-top: 6px; padding: 4px 6px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
               <span style="color:#065f46; font-weight:700;"><i class="fa-solid fa-phone"></i> ${{escapeHtml(firstPhone)}}</span>
               <span style="color:#047857; font-size:10px;">somente após validação</span>
            </div>
          `;
        }}

        const popupContent = `
          <div style="font-family:'Inter',sans-serif; width: 270px; font-size: 11px; line-height: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid ${{markerColor}}; padding-bottom: 4px; margin-bottom: 6px;">
              <b style="font-size: 13px; color: #0f172a;">Ponto DTP #${{escapeHtml(dtpPonto)}}</b>
              <span style="background:${{isHigh ? '#dbeafe' : '#fef3c7'}}; color:${{isHigh ? '#1e40af' : '#92400e'}}; font-weight:700; padding: 2px 6px; border-radius: 4px; font-size:10px;">
                ${{escapeHtml(conf)}}
              </span>
            </div>
            <b>Endereço DTP:</b> ${{escapeHtml(props.dtp_endereco || 'Não informado')}}<br>
            <b>Subprefeitura:</b> ${{escapeHtml(props.geosampa_subprefeitura || props.dtp_regiao || '')}}<br>
            
            <div style="background:#fef3c7; color:#92400e; padding:4px 6px; border-radius:6px; font-weight:700; margin: 5px 0;">
              👥 ${{escapeHtml(ocup)}} taxistas vinculados ao ponto (${{escapeHtml(cap)}} vagas)
            </div>

            ${{phoneHtml}}

            <button onclick="openPointModal(${{index}})" style="width:100%; margin-top:8px; background:#0284c7; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-weight:600; cursor:pointer;">
              Ver Ficha Técnica Completa
            </button>
          </div>
        `;

        circle.bindPopup(popupContent);
        circle.bindTooltip(`Ponto #${{escapeHtml(dtpPonto)}} (${{escapeHtml(ocup)}} taxistas)`, {{ direction: 'top' }});
        circle.addTo(markersLayer);

        markersMap.set(String(dtpPonto), circle);
      }});

      heatLayer.clearLayers();
      if (heatPoints.length > 0 && typeof L.heatLayer === 'function') {{
        L.heatLayer(heatPoints, {{
          radius: 18,
          blur: 14,
          maxZoom: 13,
          minOpacity: 0.35,
          gradient: {{ 0.4: '#3b82f6', 0.65: '#f59e0b', 1.0: '#ef4444' }}
        }}).addTo(heatLayer);
      }}
    }}

    function renderPointsList() {{
      const container = document.getElementById('points-list');
      container.innerHTML = '';

      if (filteredPoints.length === 0) {{
        container.innerHTML = `
          <div class="text-center py-12 text-slate-400">
            <i class="fa-solid fa-filter-circle-xmark text-3xl mb-2"></i>
            <p>Nenhum ponto encontrado com os filtros selecionados.</p>
          </div>
        `;
        document.getElementById('table-count').innerText = '0';
        return;
      }}

      document.getElementById('table-count').innerText = filteredPoints.length;

      filteredPoints.forEach((feat, index) => {{
        const props = feat.properties;
        const dtpPonto = props.dtp_ponto_id || props.dtp_ponto || 'S/N';
        const isHigh = (props.matching_confidence || props.match_tier) === 'HIGH';
        const cap = props.dtp_vagas_capacidade || 0;
        const ocup = props.dtp_vagas_ocupadas || props.dtp_vagas_capacidade || 0;
        const end = props.dtp_endereco || 'Sem endereço';
        const sub = props.geosampa_subprefeitura || props.dtp_regiao || '';
        const phone = props.osm_phone || '';

        const card = document.createElement('div');
        card.className = "bg-white p-3 rounded-lg border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition cursor-pointer flex flex-col space-y-1.5 text-xs";
        card.onclick = () => focusOnMap(dtpPonto, feat.geometry.coordinates);

        card.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-slate-900 text-sm">#${{escapeHtml(dtpPonto)}}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${{isHigh ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}}">
                ${{isHigh ? 'ALTA' : 'MÉDIA'}}
              </span>
            </div>
            <div class="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              👥 ${{escapeHtml(ocup)}} taxistas
            </div>
          </div>
          <div class="text-slate-800 font-medium truncate" title="${{escapeHtml(end)}}">${{escapeHtml(end)}}</div>
          <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
            <span><i class="fa-solid fa-map-pin mr-1 text-slate-400"></i>${{escapeHtml(sub)}}</span>
            ${{phone ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-phone mr-1"></i>Tem Tel</span>` : `<span>Cap: ${{escapeHtml(cap)}}</span>`}}
          </div>
        `;
        container.appendChild(card);
      }});
    }}

    function focusOnMap(id, coords) {{
      switchTab('mapa');
      if (!map || !coords) return;
      map.flyTo([coords[1], coords[0]], 16, {{ duration: 1.2 }});
      const marker = markersMap.get(String(id));
      if (marker) {{
        setTimeout(() => marker.openPopup(), 1200);
      }}
    }}

    function openPointModal(index) {{
      const feat = filteredPoints[index];
      if (!feat) return;
      const p = feat.properties;
      const isHigh = p.matching_confidence === 'HIGH';

      document.getElementById('modal-title').innerText = `Ponto Regulamentado #${{p.dtp_ponto_id || 'S/N'}}`;
      document.getElementById('modal-badge').innerText = isHigh ? 'Alta Confiança (ID Checado)' : 'Média Confiança (Fuzzy)';
      document.getElementById('modal-badge').className = `text-xs font-semibold px-2 py-0.5 rounded ${{isHigh ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}}`;

      const phone = p.osm_phone || '';
      const firstPhone = phone ? phone.split(';')[0].trim() : '';

      document.getElementById('modal-body').innerHTML = `
        <div class="bg-slate-50 p-3 rounded-lg border space-y-1">
          <div><b>Logradouro Oficial:</b> ${{escapeHtml(p.dtp_endereco || 'Não informado')}}</div>
          <div><b>Subprefeitura Oficial:</b> ${{escapeHtml(p.geosampa_subprefeitura || '')}} (Código DTP: ${{escapeHtml(p.dtp_subprefeitura_codigo || '')}}) </div>
          <div><b>Distrito GeoSampa:</b> ${{escapeHtml(p.geosampa_distrito || '')}}</div>
          <div><b>Macrorregião:</b> ${{escapeHtml(p.dtp_regiao || '')}}</div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-blue-50 border border-blue-100 p-2 rounded-lg">
            <span class="text-slate-500 block text-[10px]">Capacidade Total</span>
            <b class="text-base text-blue-700">${{escapeHtml(p.dtp_vagas_capacidade || 0)}} vagas</b>
          </div>
          <div class="bg-amber-50 border border-amber-200 p-2 rounded-lg">
            <span class="text-amber-800 block text-[10px] font-bold">Taxistas Vinculados</span>
            <b class="text-base text-amber-700">${{escapeHtml(p.dtp_vagas_ocupadas || 0)}}</b>
          </div>
          <div class="bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
            <span class="text-slate-500 block text-[10px]">Saldo no Sorteio</span>
            <b class="text-base text-emerald-700">${{escapeHtml(p.dtp_vagas_saldo || 0)}}</b>
          </div>
        </div>

        ${{phone ? `
        <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
          <span class="text-[10px] text-emerald-800 font-bold block uppercase">Telefone publicado do ponto</span>
          <b class="text-sm text-emerald-900">${{escapeHtml(phone)}}</b>
          <p class="text-[10px] text-emerald-700 mt-1">Exibir apenas; contato depende de validação de finalidade e autorização.</p>
        </div>
        ` : ''}}

        <div class="bg-slate-50 p-3 rounded-lg border space-y-1">
          <div><b>Identificador OSM:</b> Elemento ${{escapeHtml(p.osm_type || 'N/D')}} #${{escapeHtml(p.osm_id || '')}}</div>
          <div><b>Nome Mapeado OSM:</b> ${{escapeHtml(p.osm_name || p.osm_official_name || 'Não informado')}}</div>
          <div><b>Baias Físicas Observadas:</b> ${{escapeHtml(p.osm_capacity || 'N/D')}}</div>
          <div><b>Abrigo / Banco:</b> ${{p.osm_shelter === 'yes' ? 'Possui abrigo' : 'Sem abrigo'}} / ${{p.osm_bench === 'yes' ? 'Possui banco' : 'Sem banco'}}</div>
          <div><b>Regra de Matching:</b> <span class="font-mono text-[10px] text-slate-700">${{escapeHtml(p.matching_status || '')}}</span></div>
        </div>
      `;

      document.getElementById('point-modal').classList.remove('hidden');
    }}

    function closeModal() {{
      document.getElementById('point-modal').classList.add('hidden');
    }}

    function applyFilters() {{
      const searchText = document.getElementById('filter-search').value.toLowerCase().trim();
      const regiao = document.getElementById('filter-regiao').value;
      const subpref = document.getElementById('filter-subpref').value;
      const onlyWithPhone = document.getElementById('filter-com-telefone').checked;
      const onlyMegaPoints = document.getElementById('filter-mega-pontos').checked;
      const onlyOpenSaldo = document.getElementById('filter-saldo-aberto').checked;

      filteredPoints = PONTOS_RAW.filter(feat => {{
        const p = feat.properties;
        const dtpPonto = String(p.dtp_ponto_id || p.dtp_ponto || '');
        const end = String(p.dtp_endereco || '').toLowerCase();
        const osmName = String(p.osm_name || p.osm_official_name || '').toLowerCase();
        const phone = String(p.osm_phone || '').toLowerCase();
        const sub = p.geosampa_subprefeitura || '';
        const reg = p.dtp_regiao || '';
        const conf = p.matching_confidence || '';
        const ocup = p.dtp_vagas_ocupadas || p.dtp_vagas_capacidade || 0;
        const saldo = p.dtp_vagas_saldo || 0;

        if (searchText && !dtpPonto.includes(searchText) && !end.includes(searchText) && !osmName.includes(searchText) && !phone.includes(searchText)) {{
          return false;
        }}
        if (regiao && reg !== regiao) return false;
        if (subpref && sub !== subpref) return false;
        if (selectedConfidence && conf !== selectedConfidence) return false;
        if (onlyWithPhone && !p.osm_phone) return false;
        if (onlyMegaPoints && ocup < 20) return false;
        if (onlyOpenSaldo && saldo <= 0) return false;

        return true;
      }});

      renderPointsList();
      renderMapMarkers();
      updateKPIs();
    }}

    function onRegiaoChange() {{
      const regiao = document.getElementById('filter-regiao').value;
      const subSelect = document.getElementById('filter-subpref');
      
      subSelect.innerHTML = '<option value="">Todas as Subprefeituras</option>';
      const availableSubs = new Set();
      PONTOS_RAW.forEach(f => {{
        if (!regiao || f.properties.dtp_regiao === regiao) {{
          if (f.properties.geosampa_subprefeitura) {{
            availableSubs.add(f.properties.geosampa_subprefeitura);
          }}
        }}
      }});

      Array.from(availableSubs).sort().forEach(s => {{
        subSelect.innerHTML += `<option value="${{escapeHtml(s)}}">${{escapeHtml(s)}}</option>`;
      }});

      applyFilters();
    }}

    function setConfidenceFilter(conf) {{
      selectedConfidence = conf;
      document.querySelectorAll('.conf-btn').forEach(btn => btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm'));
      if (!conf) {{
        document.getElementById('btn-conf-all').classList.add('bg-white', 'text-slate-800', 'shadow-sm');
      }} else if (conf === 'HIGH') {{
        document.getElementById('btn-conf-high').classList.add('bg-white', 'text-slate-800', 'shadow-sm');
      }} else {{
        document.getElementById('btn-conf-med').classList.add('bg-white', 'text-slate-800', 'shadow-sm');
      }}
      applyFilters();
    }}

    function resetFilters() {{
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-regiao').value = '';
      document.getElementById('filter-com-telefone').checked = false;
      document.getElementById('filter-mega-pontos').checked = false;
      document.getElementById('filter-saldo-aberto').checked = false;
      onRegiaoChange();
      setConfidenceFilter('');
    }}

    function toggleHeatmap() {{
      const isChecked = document.getElementById('layer-heatmap').checked;
      if (isChecked) map.addLayer(heatLayer);
      else map.removeLayer(heatLayer);
    }}

    function toggleVazios() {{
      const isChecked = document.getElementById('layer-vazios').checked;
      if (isChecked) map.addLayer(vaziosLayer);
      else map.removeLayer(vaziosLayer);
    }}

    function togglePolos() {{
      const isChecked = document.getElementById('layer-polos').checked;
      if (isChecked) map.addLayer(polosLayer);
      else map.removeLayer(polosLayer);
    }}

    function updateKPIs() {{
      const total = filteredPoints.length;
      document.getElementById('header-counter').innerText = `${{total}} de ${{RECRUITMENT_RAW.length}} pontos`;
      document.getElementById('kpi-pontos').innerHTML = `${{total}} <span class="text-[10px] font-normal text-slate-500">/ ${{RECRUITMENT_RAW.length}}</span>`;

      const totalVagas = filteredPoints.reduce((acc, f) => acc + (f.properties.dtp_vagas_capacidade || 0), 0);
      document.getElementById('kpi-vagas').innerHTML = `${{totalVagas.toLocaleString('pt-BR')}} <span class="text-[10px] font-normal text-slate-500">vagas</span>`;

      const totalTelefones = filteredPoints.filter(f => f.properties.osm_phone).length;
      document.getElementById('kpi-telefones').innerHTML = `${{totalTelefones}} <span class="text-[10px] font-normal text-slate-500">pontos</span>`;
    }}

    // INICIALIZA ABA DE RECRUTAMENTO COM DADOS COMPLETOS
    function initRecruitmentTab() {{
      renderPolosTable(POLOS_RAW);
      renderDocTable(DOC_RAW);
      renderTelemarketingTable(RECRUITMENT_RAW.filter(p => p.telefone));
      renderMegaPontosGrid(RECRUITMENT_RAW.filter(p => p.taxistas_vinculados >= 30).slice(0, 15));
    }}

    function renderPolosTable(polos) {{
      const tbody = document.getElementById('polos-table-body');
      tbody.innerHTML = '';

      if (!polos || polos.length === 0) {{
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Nenhum polo encontrado.</td></tr>`;
        return;
      }}

      polos.forEach(p => {{
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition";
        const isDTP = p.tipo === 'ORGAO_REGULADOR';
        const isIPEM = p.tipo === 'AFERICAO_METROLOGICA';
        const badge = isDTP ? 
          `<span class="bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.5 rounded">DTP SEDE</span>` : 
          (isIPEM ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded">IPEM-SP</span>` : 
          `<span class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded">CFC</span>`);

        const firstPhone = p.telefone ? p.telefone.split(';')[0].trim() : '';

        tr.innerHTML = `
          <td class="py-2.5 px-3">
            <div class="flex items-center space-x-1.5">
              ${{badge}}
              <span class="font-bold text-slate-900">${{escapeHtml(p.nome)}}</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">${{escapeHtml(p.servicos)}}</div>
          </td>
          <td class="py-2.5 px-3 text-slate-700">
            <div>${{escapeHtml(p.endereco)}}</div>
            <div class="text-[11px] text-slate-400">${{escapeHtml(p.bairro)}} • CEP ${{escapeHtml(p.cep)}}</div>
          </td>
          <td class="py-2.5 px-3 text-slate-600 font-medium">
            ${{escapeHtml(p.regiao)}} <span class="text-[10px] text-slate-400">(${{escapeHtml(p.subprefeitura)}})</span>
          </td>
          <td class="py-2.5 px-3 font-semibold text-emerald-800">
            ${{firstPhone ? `<i class="fa-solid fa-phone mr-1 text-emerald-600"></i>${{escapeHtml(firstPhone)}}` : '—'}}
          </td>
          <td class="py-2.5 px-3 text-right space-x-1.5">
            ${{firstPhone ? `
              <a href="${{escapeHtml(phoneHref(firstPhone))}}" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-bold text-[11px]">
                Ligar
              </a>
            ` : ''}}
            <button onclick="focusOnMap(${{htmlAttribute(p.id)}}, [${{Number(p.lon) || 0}}, ${{Number(p.lat) || 0}}])" class="bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1 rounded font-bold border border-sky-200 text-[11px]">
              <i class="fa-solid fa-location-dot mr-1"></i>Ver Mapa
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      }});
    }}

    function filterPolosTable() {{
      const text = document.getElementById('cfc-search').value.toLowerCase().trim();
      const filtered = POLOS_RAW.filter(p => (
        String(p.nome || '').toLowerCase().includes(text) ||
        String(p.bairro || '').toLowerCase().includes(text) ||
        String(p.endereco || '').toLowerCase().includes(text) ||
        String(p.subprefeitura || '').toLowerCase().includes(text) ||
        String(p.regiao || '').toLowerCase().includes(text) ||
        String(p.telefone || '').toLowerCase().includes(text)
      ));
      renderPolosTable(filtered);
    }}

    function renderDocTable(items) {{
      const tbody = document.getElementById('doc-table-body');
      tbody.innerHTML = '';

      if (!items || items.length === 0) {{
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">Nenhum despacho localizado.</td></tr>`;
        return;
      }}

      items.forEach(doc => {{
        const tr = document.createElement('tr');
        const identifier = doc.condutax_num !== '—'
          ? 'Condutax #' + doc.condutax_num
          : 'Alvará #' + (doc.alvara_num || '—');
        tr.className = "hover:bg-slate-50 transition";
        tr.innerHTML = `
          <td class="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">${{escapeHtml(doc.data_publicacao)}}</td>
          <td class="py-2.5 px-3">
            <span class="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded">${{escapeHtml(doc.tipo_ato)}}</span>
            <div class="text-[10px] text-slate-400 mt-0.5">Proc: ${{escapeHtml(doc.processo_sei)}}</div>
          </td>
          <td class="py-2.5 px-3 font-black text-slate-900">${{escapeHtml(doc.nome_motorista)}}</td>
          <td class="py-2.5 px-3 font-mono text-slate-700">
            <b>${{escapeHtml(identifier)}}</b>
            <div class="text-[10px] text-slate-400">${{escapeHtml(doc.categoria)}}</div>
          </td>
          <td class="py-2.5 px-3 text-emerald-700 font-bold">${{escapeHtml(doc.status)}}</td>
          <td class="py-2.5 px-3 text-right">
            <span class="text-[11px] font-medium text-slate-600">${{escapeHtml(doc.acao_chame_taxi || '')}}</span>
          </td>
        `;
        tbody.appendChild(tr);
      }});
    }}

    function renderTelemarketingTable(points) {{
      const tbody = document.getElementById('telemarketing-table-body');
      tbody.innerHTML = '';

      if (points.length === 0) {{
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Nenhum ponto com telefone encontrado.</td></tr>`;
        return;
      }}

      points.forEach(p => {{
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition";
        const firstPhone = String(p.telefone || '').split(';')[0].trim();
        const mapAction = p.geolocalizado ? 
          `<button onclick="focusOnMap(${{htmlAttribute(p.ponto_id)}}, [${{Number(p.lon) || 0}}, ${{Number(p.lat) || 0}}])" class="bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1 rounded font-bold border border-sky-200">
            <i class="fa-solid fa-location-dot mr-1"></i>Ver Mapa
          </button>` : 
          `<span class="text-[10px] text-slate-400">Sem GPS</span>`;

        tr.innerHTML = `
          <td class="py-2.5 px-3">
            <span class="font-bold text-slate-900">#${{escapeHtml(p.ponto_id || 'S/N')}}</span> - ${{escapeHtml(p.endereco)}}
          </td>
          <td class="py-2.5 px-3 text-slate-600">
            ${{escapeHtml(p.subprefeitura)}} <span class="text-[10px] text-slate-400">(${{escapeHtml(p.regiao)}})</span>
          </td>
          <td class="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/50">
            ${{escapeHtml(p.taxistas_vinculados)}}
          </td>
          <td class="py-2.5 px-3 font-semibold text-emerald-800">
            <i class="fa-solid fa-phone mr-1 text-emerald-600"></i>${{escapeHtml(p.telefone)}}
          </td>
          <td class="py-2.5 px-3 text-right space-x-1.5">
            <span class="text-[10px] text-slate-500">Contato não acionado</span>
            ${{mapAction}}
          </td>
        `;
        tbody.appendChild(tr);
      }});
    }}

    function filterTelemarketingTable() {{
      const text = document.getElementById('telemarketing-search').value.toLowerCase().trim();
      const filtered = RECRUITMENT_RAW.filter(p => p.telefone && (
        String(p.endereco || '').toLowerCase().includes(text) ||
        String(p.subprefeitura || '').toLowerCase().includes(text) ||
        String(p.telefone || '').toLowerCase().includes(text) ||
        String(p.ponto_id || '').toLowerCase().includes(text)
      ));
      renderTelemarketingTable(filtered);
    }}

    function renderMegaPontosGrid(points) {{
      const grid = document.getElementById('megapontos-grid');
      grid.innerHTML = '';

      points.forEach((p, idx) => {{
        const card = document.createElement('div');
        card.className = "bg-slate-50 border border-slate-200/90 hover:border-amber-400 hover:shadow-md p-4 rounded-xl transition flex flex-col justify-between space-y-2";
        
        const mapBtn = p.geolocalizado ? 
          `<button onclick="focusOnMap(${{htmlAttribute(p.ponto_id)}}, [${{Number(p.lon) || 0}}, ${{Number(p.lat) || 0}}])" class="w-full bg-sky-600 hover:bg-sky-700 text-white py-1.5 rounded-lg font-bold text-xs transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-location-dot"></i><span>Focar no Mapa</span>
          </button>` : 
          `<div class="text-[10px] text-slate-400 text-center py-1 bg-slate-100 rounded">Endereço Cadastral Oficial DTP</div>`;

        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between">
              <span class="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">Polo #${{idx+1}}</span>
              <span class="text-sm font-black text-slate-900">👥 ${{escapeHtml(p.taxistas_vinculados)}} Taxistas</span>
            </div>
            <h4 class="font-bold text-slate-900 text-xs mt-2">${{escapeHtml(p.endereco)}}</h4>
            <p class="text-[11px] text-slate-500">${{escapeHtml(p.subprefeitura)}} • Região ${{escapeHtml(p.regiao)}}</p>
          </div>

          <div class="pt-2 border-t border-slate-200/60 text-[11px] space-y-1">
            <div class="flex justify-between text-slate-600">
              <span>Capacidade Total:</span>
              <b>${{escapeHtml(p.capacidade_vagas)}} vagas</b>
            </div>
            <div class="flex justify-between text-amber-800 font-semibold">
              <span>Horário de Ociosidade:</span>
              <span>10h às 16h</span>
            </div>
            ${{p.telefone ? `<div class="text-emerald-700 font-bold truncate"><i class="fa-solid fa-phone mr-1"></i>${{escapeHtml(p.telefone)}}</div>` : ''}}
          </div>

          ${{mapBtn}}
        `;
        grid.appendChild(card);
      }});
    }}

    function filterMapByRegion(regiao) {{
      switchTab('mapa');
      document.getElementById('filter-regiao').value = regiao;
      onRegiaoChange();
    }}

    function downloadRecruitmentCSV() {{
      let csvContent = "\uFEFF";
      csvContent += "ponto_id;endereco;subprefeitura;distrito;regiao;taxistas_vinculados;capacidade_vagas;telefone_ponto;geolocalizado;localizado_por_endereco\\n";

      RECRUITMENT_RAW.forEach(r => {{
        const row = [
          csvCell(r.ponto_id),
          csvCell(r.endereco),
          csvCell(r.subprefeitura),
          csvCell(r.distrito),
          csvCell(r.regiao),
          csvCell(r.taxistas_vinculados),
          csvCell(r.capacidade_vagas),
          csvCell(r.telefone),
          csvCell(r.geolocalizado ? 'SIM' : 'NAO'),
          csvCell(r.localizado_por_endereco ? 'SIM' : 'NAO')
        ].join(";");
        csvContent += row + "\\n";
      }});

      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "ranking_prospeccao_taxistas_chame_taxi.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }}

    function downloadPolosCSV() {{
      let csvContent = "\uFEFF";
      csvContent += "id;tipo;nome;endereco;bairro;cep;subprefeitura;regiao;telefone;lat;lon;servicos;publico_alvo;estrategia_chame_taxi;fonte;data_fonte;status_vigencia;observacao\\n";

      POLOS_RAW.forEach(p => {{
        const row = [
          csvCell(p.id),
          csvCell(p.tipo),
          csvCell(p.nome),
          csvCell(p.endereco),
          csvCell(p.bairro),
          csvCell(p.cep),
          csvCell(p.subprefeitura),
          csvCell(p.regiao),
          csvCell(p.telefone),
          csvCell(p.lat),
          csvCell(p.lon),
          csvCell(p.servicos),
          csvCell(p.publico_alvo),
          csvCell(p.estrategia_chame_taxi),
          csvCell(p.fonte),
          csvCell(p.data_fonte),
          csvCell(p.status_vigencia),
          csvCell(p.observacao)
        ].join(";");
        csvContent += row + "\\n";
      }});

      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "polos_formacao_taxistas_cfc_dtp_dashboard.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }}

    function downloadDocCSV() {{
      let csvContent = "\uFEFF";
      csvContent += "data_publicacao;processo_sei;tipo_ato;nome_motorista;condutax_num;alvara_num;categoria;status;acao_chame_taxi\\n";

      DOC_RAW.forEach(d => {{
        const row = [
          csvCell(d.data_publicacao),
          csvCell(d.processo_sei),
          csvCell(d.tipo_ato),
          csvCell(d.nome_motorista),
          csvCell(d.condutax_num),
          csvCell(d.alvara_num),
          csvCell(d.categoria),
          csvCell(d.status),
          csvCell(d.acao_chame_taxi)
        ].join(";");
        csvContent += row + "\\n";
      }});

      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "atos_diario_oficial_dashboard.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }}

    function renderVaziosTable() {{
      const tbody = document.getElementById('vazios-table-body');
      if (!METRICAS || !METRICAS.subprefeituras_cobertura_zero) return;

      tbody.innerHTML = '';
      METRICAS.subprefeituras_cobertura_zero.forEach(item => {{
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition";
        tr.innerHTML = `
          <td class="py-2 px-3 font-bold text-slate-800">${{escapeHtml(item.nome)}}</td>
          <td class="py-2 px-3 text-slate-600">${{escapeHtml(item.regiao)}}</td>
          <td class="py-2 px-3 font-semibold text-rose-700">${{escapeHtml(item.dtp_total)}} pontos</td>
          <td class="py-2 px-3 text-slate-400">0</td>
          <td class="py-2 px-3 font-bold text-rose-600">0,0%</td>
          <td class="py-2 px-3">
            <span class="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded font-bold">
              ${{item.dtp_total >= 10 ? 'CRÍTICO' : 'ELEVADO'}}
            </span>
          </td>
        `;
        tbody.appendChild(tr);
      }});
    }}

    function initCharts() {{
      if (!METRICAS) return;

      const ctxRegional = document.getElementById('chart-regional');
      if (ctxRegional && METRICAS.cobertura_regional) {{
        const labels = METRICAS.cobertura_regional.map(r => r.regiao);
        const dtpData = METRICAS.cobertura_regional.map(r => r.dtp_total);
        const osmData = METRICAS.cobertura_regional.map(r => r.pareados);

        new Chart(ctxRegional, {{
          type: 'bar',
          data: {{
            labels: labels,
            datasets: [
              {{ label: 'DTP Total (Edital 2024)', data: dtpData, backgroundColor: '#94a3b8' }},
              {{ label: 'Pareados com OSM', data: osmData, backgroundColor: '#0284c7' }}
            ]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {{ legend: {{ position: 'bottom' }} }}
          }}
        }});
      }}

      const ctxConf = document.getElementById('chart-confianca');
      if (ctxConf) {{
        new Chart(ctxConf, {{
          type: 'doughnut',
          data: {{
            labels: ['Alta Confiança (ID Checado)', 'Média Confiança (Fuzzy Address)'],
            datasets: [{{
              data: [{high_confidence}, {medium_confidence}],
              backgroundColor: ['#2563eb', '#f59e0b']
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {{ legend: {{ position: 'bottom' }} }}
          }}
        }});
      }}

      const ctxTop = document.getElementById('chart-top-subpref');
      if (ctxTop && METRICAS.cobertura_subprefeituras) {{
        const sorted = [...METRICAS.cobertura_subprefeituras].sort((a,b) => b.dtp_total - a.dtp_total).slice(0, 8);
        new Chart(ctxTop, {{
          type: 'bar',
          data: {{
            labels: sorted.map(s => s.nome),
            datasets: [{{
              label: 'Pontos Regulamentados DTP',
              data: sorted.map(s => s.dtp_total),
              backgroundColor: '#0284c7'
            }}]
          }},
          options: {{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {{ legend: {{ display: false }} }}
          }}
        }});
      }}

      const ctxSpot = document.getElementById('chart-spot-balance');
      if (ctxSpot && METRICAS.balanco_vagas) {{
        const b = METRICAS.balanco_vagas.subconjunto_com_capacity_osm;
        new Chart(ctxSpot, {{
          type: 'doughnut',
          data: {{
            labels: ['DTP > OSM (Capacidade Teórica Maior)', 'DTP == OSM (Capacidade Idêntica)', 'DTP < OSM (Baias Maiores)'],
            datasets: [{{
              data: [b.dtp_maior_osm_contagem, b.dtp_igual_osm_contagem, b.dtp_menor_osm_contagem],
              backgroundColor: ['#4f46e5', '#10b981', '#f59e0b']
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {{ legend: {{ position: 'bottom' }} }}
          }}
        }});
      }}
    }}
  </script>
</body>
</html>"""

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"[4/4] Aplicação web gerada com sucesso em:\n      {OUTPUT_HTML} ({len(html_content):,} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--include-doc-personal-data",
        action="store_true",
        help="inclui identificadores pessoais do Diário Oficial no HTML protegido",
    )
    args = parser.parse_args()
    main(include_doc_personal_data=args.include_doc_personal_data)
