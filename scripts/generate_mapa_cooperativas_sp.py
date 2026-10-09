# -*- coding: utf-8 -*-
"""
scripts/generate_mapa_cooperativas_sp.py
=============================================================================
GERADOR DO MAPA INTERATIVO & PAINEL DE INTELIGÊNCIA: COOPERATIVAS DE TÁXI SP
=============================================================================
Gera uma aplicação HTML/JS standalone rica com Leaflet e Esri GIS que mapeia
todas as cooperativas de táxi do Estado de São Paulo, permitindo análise
geográfica, concorrência, filtros e exportação.
=============================================================================
"""

import json
import os
import sys
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "processed" / "cooperativas_taxi_estado_sp.csv"
OUT_ROOT = BASE_DIR / "mapa_cooperativas_taxi_sp.html"
OUT_FOLDER = BASE_DIR / "Novos Alvarás 2026" / "mapa_cooperativas_taxi_sp.html"

def generate_mapa_cooperativas():
    print("=" * 80)
    print("GERANDO MAPA INTERATIVO DAS COOPERATIVAS DE TÁXI DO ESTADO DE SÃO PAULO")
    print("=" * 80)

    if not CSV_PATH.exists():
        print(f"Erro: {CSV_PATH} não encontrado. Execute build_cooperativas_sp_dataset.py primeiro.")
        return

    df = pd.read_csv(CSV_PATH, sep=';', encoding='utf-8-sig', low_memory=False)
    print(f"Carregadas {len(df):,} cooperativas.")

    records = []
    for r in df.itertuples(index=False):
        d = r._asdict()
        records.append({
            'id': str(d.get('ID_Cooperativa', '')),
            'cnpj': str(d.get('CNPJ', '')),
            'razao': str(d.get('Razao_Social', '')),
            'nome': str(d.get('Nome_Fantasia', '')),
            'muni': str(d.get('Municipio', '')),
            'uf': str(d.get('UF', 'SP')),
            'reg': str(d.get('Macrorregiao', '')),
            'bairro': str(d.get('Bairro', '')),
            'end': f"{d.get('Logradouro', '')}, {d.get('Numero', '')}".strip(' ,'),
            'cep': str(d.get('CEP', '')),
            'lat': float(d.get('Latitude', 0.0)),
            'lon': float(d.get('Longitude', 0.0)),
            'dist': float(d.get('Distancia_Sede_Chame_km', 0.0)),
            'st': str(d.get('Situacao_Cadastral', 'Ativa')),
            'tel': str(d.get('Telefone_Institucional', '')),
            'email': str(d.get('Email_Institucional', '')),
            'tipo': str(d.get('Tipo_Operacao', '')),
            'pos': str(d.get('Posicionamento_Chame_Taxi', ''))
        })

    json_coops = json.dumps(records, ensure_ascii=False, separators=(',', ':'))

    total_coops = len(df)
    ativas = int((df['Situacao_Cadastral'] == 'Ativa').sum())
    munis = int(df['Municipio'].nunique())
    capital = int((df['Municipio'] == 'SAO PAULO').sum())
    interior_litoral = int(df['Macrorregiao'].str.contains('Campinas|Vale|Sorocaba|Ribeirão|Central|Noroeste|Litoral|Baixada').sum())

    html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Mapeamento das Cooperativas de Táxi do Estado de São Paulo</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Leaflet CSS & JS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css"/>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
  <!-- Phosphor Icons -->
  <script src="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/index.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    body {{
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #0f172a;
      color: #0f172a;
    }}
    .map-container {{
      height: 60vh;
      min-height: 480px;
    }}
    @media (min-width: 1024px) {{
      .map-container {{
        height: 68vh;
      }}
    }}
    .eyebrow {{
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }}
    /* Custom Leaflet Marker Styling */
    .custom-div-icon {{
      background: transparent;
      border: none;
    }}
    .marker-pin {{
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -20px 0 0 -20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }}
    .marker-pin::after {{
      content: '';
      width: 14px;
      height: 14px;
      margin: 8px 0 0 8px;
      background: #fff;
      position: absolute;
      border-radius: 50%;
    }}
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">

  <!-- TOPO / HEADER -->
  <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 py-3 sm:px-6">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl">
          🚕
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-bold text-lg text-white">Cooperativas de Táxi do Estado de SP</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Inteligência Territorial
            </span>
          </div>
          <p class="text-xs text-slate-400">Panorama Estadual de Rádio-Táxi, Concorrência e Alianças Estratégicas</p>
        </div>
      </div>

      <!-- AÇÕES DO TOPO -->
      <div class="flex items-center gap-2">
        <a href="dashboard_mestre_taxistas_sp_2026.html" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700">
          <i class="ph-bold ph-arrow-left"></i>
          <span>Voltar ao Cockpit Mestre</span>
        </a>
        <button onclick="exportCooperativasCSV()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
          <i class="ph-bold ph-download-simple"></i>
          <span>Exportar Base (.CSV)</span>
        </button>
      </div>
    </div>
  </header>

  <!-- CONTEÚDO PRINCIPAL -->
  <main class="max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex-1 space-y-4">

    <!-- CARDS DE KPIS -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xs">
        <span class="eyebrow block">Total Mapeado</span>
        <div class="text-2xl font-black text-white mt-0.5">{total_coops}</div>
        <span class="text-[11px] text-slate-400">Cooperativas no Estado</span>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xs">
        <span class="eyebrow block">Situação Ativa</span>
        <div class="text-2xl font-black text-emerald-400 mt-0.5">{ativas}</div>
        <span class="text-[11px] text-emerald-500/80 font-bold">{round(ativas/total_coops*100, 1)}% com CNPJ ativo</span>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xs">
        <span class="eyebrow block">Capital Paulista</span>
        <div class="text-2xl font-black text-amber-400 mt-0.5">{capital}</div>
        <span class="text-[11px] text-slate-400">Sedes no Município SP</span>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xs">
        <span class="eyebrow block">Interior & Litoral</span>
        <div class="text-2xl font-black text-sky-400 mt-0.5">{interior_litoral}</div>
        <span class="text-[11px] text-slate-400">Campinas, Santos, Vale, etc.</span>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xs col-span-2 sm:col-span-1">
        <span class="eyebrow block">Municípios Cobertos</span>
        <div class="text-2xl font-black text-purple-400 mt-0.5">{munis}</div>
        <span class="text-[11px] text-slate-400">Cidades com cooperativa</span>
      </div>
    </div>

    <!-- SEÇÃO MAPA GIS -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div class="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="ph-bold ph-map-trifold text-amber-400 text-lg"></i>
          <h2 class="font-bold text-sm text-white">Mapa Tático de Sedes Cooperativas (Esri GIS)</h2>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-400">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-xs"></span> <strong>Chame Táxi (Sede)</strong></span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Concorrentes Capital</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Grande SP / RMSP</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Interior & Litoral</span>
        </div>
      </div>
      <div id="coop-map" class="map-container w-full"></div>
    </div>

    <!-- BARRA DE CONTROLES E FILTROS -->
    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <div class="relative min-w-[240px] flex-1">
          <i class="ph-bold ph-magnifying-glass absolute left-3 top-2.5 text-slate-500"></i>
          <input type="text" id="filter-search" oninput="applyFilters()" placeholder="Buscar cooperativa por nome, cidade ou CNPJ..." class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"/>
        </div>

        <select id="filter-regiao" onchange="applyFilters()" class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
          <option value="ALL">Todas as Regiões</option>
          <option value="CAPITAL">Capital (São Paulo)</option>
          <option value="RMSP">Grande SP / RMSP</option>
          <option value="LITORAL">Baixada Santista / Litoral</option>
          <option value="INTERIOR">Interior do Estado</option>
        </select>

        <select id="filter-status" onchange="applyFilters()" class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
          <option value="ATIVA" selected>Apenas Ativas</option>
          <option value="ALL">Todas as Situações</option>
        </select>
      </div>

      <div class="text-xs text-slate-400 font-medium" id="results-count">
        Exibindo {total_coops} cooperativas
      </div>
    </div>

    <!-- TABELA ANALÍTICA -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th class="py-3 px-4">Cooperativa / Nome Fantasia</th>
              <th class="py-3 px-3">Município / Região</th>
              <th class="py-3 px-3 text-center">Situação</th>
              <th class="py-3 px-3 text-right">Distância Sede</th>
              <th class="py-3 px-3">Contato Institucional</th>
              <th class="py-3 px-3">Posicionamento Estratégico</th>
              <th class="py-3 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody id="coop-table-body" class="divide-y divide-slate-800/60 font-medium text-slate-300">
            <!-- Injetado dinamicamente via JS -->
          </tbody>
        </table>
      </div>
      <!-- Paginação -->
      <div class="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div id="pagination-info">Página 1 de 1</div>
        <div class="flex items-center gap-1.5">
          <button onclick="prevPage()" class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-800 disabled:opacity-40">Anterior</button>
          <button onclick="nextPage()" class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-800 disabled:opacity-40">Próxima</button>
        </div>
      </div>
    </div>

  </main>

  <!-- MODAL DE DETALHES DA COOPERATIVA -->
  <div id="coop-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs hidden z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-2xl p-5 shadow-2xl space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="eyebrow block" id="modal-reg">Região</span>
          <h3 class="text-lg font-bold text-white mt-0.5" id="modal-nome">Nome da Cooperativa</h3>
          <p class="text-xs text-slate-400" id="modal-razao">Razão Social</p>
        </div>
        <button onclick="closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold">✕</button>
      </div>

      <div class="grid grid-cols-2 gap-2.5 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div>
          <span class="eyebrow block">CNPJ</span>
          <span class="font-mono text-slate-200" id="modal-cnpj">—</span>
        </div>
        <div>
          <span class="eyebrow block">Situação Cadastral</span>
          <span class="font-bold" id="modal-st">—</span>
        </div>
        <div>
          <span class="eyebrow block">Município / UF</span>
          <span class="text-slate-200 font-semibold" id="modal-muni">—</span>
        </div>
        <div>
          <span class="eyebrow block">Distância da Sede</span>
          <span class="text-amber-400 font-bold" id="modal-dist">—</span>
        </div>
        <div class="col-span-2">
          <span class="eyebrow block">Endereço Completo</span>
          <span class="text-slate-300" id="modal-end">—</span>
        </div>
      </div>

      <div class="space-y-2 text-xs">
        <div>
          <span class="eyebrow block">Tipo de Operação:</span>
          <p class="text-slate-200 font-medium" id="modal-tipo">—</p>
        </div>
        <div>
          <span class="eyebrow block">Posicionamento frente à Chame Táxi:</span>
          <p class="text-amber-300 font-bold" id="modal-pos">—</p>
        </div>
        <div>
          <span class="eyebrow block">Contatos Institucionais:</span>
          <div class="flex items-center gap-4 mt-1">
            <span class="text-slate-300 flex items-center gap-1.5"><i class="ph-bold ph-phone text-amber-400"></i> <span id="modal-tel">—</span></span>
            <span class="text-slate-300 flex items-center gap-1.5"><i class="ph-bold ph-envelope text-amber-400"></i> <span id="modal-email">—</span></span>
          </div>
        </div>
      </div>

      <div class="pt-2 border-t border-slate-800 flex justify-end gap-2">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Fechar</button>
      </div>
    </div>
  </div>

  <!-- SCRIPT & DADOS -->
  <script>
    const COOPS_DATA = {json_coops};
    let filteredCoops = [...COOPS_DATA];
    let currentPage = 1;
    const pageSize = 25;
    let map = null;
    let markersLayer = null;

    // Inicialização do Leaflet com Esri World Street Map
    function initMap() {{
      map = L.map('coop-map', {{
        center: [-23.5714, -46.7081],
        zoom: 9,
        maxZoom: 18
      }});

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{{z}}/{{y}}/{{x}}', {{
        attribution: 'Tiles &copy; Esri &mdash; Cooperativas SP',
        maxZoom: 18
      }}).addTo(map);

      markersLayer = L.layerGroup().addTo(map);
      renderMarkers();
    }}

    function getMarkerColor(coop) {{
      if (coop.cnpj.startsWith('47.136.430') || coop.pos.includes('Nossa Sede')) return '#f59e0b'; // Amber Chame Taxi
      if (coop.muni === 'SAO PAULO') return '#ef4444'; // Red Concorrente Capital
      if (coop.reg.includes('RMSP') || coop.reg.includes('ABC') || coop.reg.includes('Oeste')) return '#3b82f6'; // Blue Grande SP
      return '#10b981'; // Emerald Interior & Litoral
    }}

    function renderMarkers() {{
      if (!markersLayer) return;
      markersLayer.clearLayers();

      filteredCoops.forEach(c => {{
        if (!c.lat || !c.lon) return;

        const isChame = c.cnpj.startsWith('47.136.430') || c.pos.includes('Nossa Sede');
        const color = getMarkerColor(c);

        const circle = L.circleMarker([c.lat, c.lon], {{
          radius: isChame ? 10 : 6,
          fillColor: color,
          color: isChame ? '#ffffff' : color,
          weight: isChame ? 3 : 1.5,
          opacity: 1,
          fillOpacity: 0.9
        }});

        circle.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:200px; padding:2px;">
            <div style="font-size:10px; font-weight:800; color:#d97706; text-transform:uppercase;">${{c.reg}}</div>
            <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px;">${{c.nome}}</div>
            <div style="font-size:11px; color:#475569;">${{c.muni}} - ${{c.dist}} km da sede</div>
            <div style="font-size:11px; margin-top:4px; font-weight:600; color:#1e293b;">${{c.pos}}</div>
            ${{c.tel ? `<div style="font-size:11px; color:#059669; margin-top:3px;">📞 ${{c.tel}}</div>` : ''}}
            <button onclick="openModal('${{c.id}}')" style="margin-top:6px; background:#0f172a; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer; width:100%;">Ver Ficha Completa</button>
          </div>
        `);

        markersLayer.addLayer(circle);
      }});
    }}

    function applyFilters() {{
      const q = document.getElementById('filter-search').value.toLowerCase().trim();
      const reg = document.getElementById('filter-regiao').value;
      const st = document.getElementById('filter-status').value;

      filteredCoops = COOPS_DATA.filter(c => {{
        if (st === 'ATIVA' && c.st !== 'Ativa') return false;

        if (reg === 'CAPITAL' && c.muni !== 'SAO PAULO') return false;
        if (reg === 'RMSP' && (!c.reg.includes('RMSP') && !c.reg.includes('ABC') && !c.reg.includes('Oeste'))) return false;
        if (reg === 'LITORAL' && (!c.reg.includes('Litoral') && !c.reg.includes('Baixada'))) return false;
        if (reg === 'INTERIOR' && (c.muni === 'SAO PAULO' || c.reg.includes('RMSP') || c.reg.includes('Litoral'))) return false;

        if (q) {{
          const match = c.nome.toLowerCase().includes(q) ||
                        c.razao.toLowerCase().includes(q) ||
                        c.muni.toLowerCase().includes(q) ||
                        c.bairro.toLowerCase().includes(q) ||
                        c.cnpj.includes(q);
          if (!match) return false;
        }}

        return true;
      }});

      currentPage = 1;
      document.getElementById('results-count').innerText = `Exibindo ${{filteredCoops.length}} cooperativas`;
      renderTable();
      renderMarkers();
    }}

    function renderTable() {{
      const tbody = document.getElementById('coop-table-body');
      tbody.innerHTML = '';

      const total = filteredCoops.length;
      const start = (currentPage - 1) * pageSize;
      const pageData = filteredCoops.slice(start, start + pageSize);

      if (pageData.length === 0) {{
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">Nenhuma cooperativa encontrada com os filtros selecionados.</td></tr>`;
        document.getElementById('pagination-info').innerText = "0 de 0 registros";
        return;
      }}

      pageData.forEach(c => {{
        const isChame = c.cnpj.startsWith('47.136.430') || c.pos.includes('Nossa Sede');
        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-800/40 transition cursor-pointer ${{isChame ? 'bg-amber-500/10' : ''}}`;

        tr.innerHTML = `
          <td class="py-2.5 px-4">
            <div class="font-bold text-white flex items-center gap-1.5">
              ${{isChame ? '⭐' : ''}}
              <span>${{c.nome}}</span>
            </div>
            <div class="text-[10px] text-slate-400 truncate max-w-[280px]">${{c.razao}}</div>
            <div class="font-mono text-[10px] text-slate-500 mt-0.5">CNPJ: ${{c.cnpj}}</div>
          </td>
          <td class="py-2.5 px-3">
            <div class="font-bold text-slate-200">${{c.muni}}</div>
            <div class="text-[10px] text-slate-400">${{c.reg}}</div>
          </td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${{c.st === 'Ativa' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}}">
              ${{c.st}}
            </span>
          </td>
          <td class="py-2.5 px-3 text-right">
            <div class="font-bold text-amber-400">${{c.dist}} km</div>
            <div class="text-[10px] text-slate-500">da sede</div>
          </td>
          <td class="py-2.5 px-3">
            <div class="text-slate-300 font-semibold">${{c.tel || '—'}}</div>
            <div class="text-[10px] text-slate-400 truncate max-w-[180px]">${{c.email || '—'}}</div>
          </td>
          <td class="py-2.5 px-3">
            <span class="text-slate-300 font-semibold line-clamp-1">${{c.pos}}</span>
            <span class="text-[10px] text-slate-500 block truncate max-w-[200px]">${{c.tipo}}</span>
          </td>
          <td class="py-2.5 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button onclick="locateOnMap(${{c.lat}}, ${{c.lon}})" class="p-1.5 rounded hover:bg-slate-800 text-sky-400" title="Ver no Mapa">
                <i class="ph-bold ph-map-pin text-sm"></i>
              </button>
              <button onclick="openModal('${{c.id}}')" class="p-1.5 rounded hover:bg-slate-800 text-amber-400" title="Ver Ficha">
                <i class="ph-bold ph-files text-sm"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      }});

      const totalPages = Math.ceil(total / pageSize) || 1;
      document.getElementById('pagination-info').innerText = `Página ${{currentPage}} de ${{totalPages}} (${{total}} cooperativas)`;
    }}

    function prevPage() {{
      if (currentPage > 1) {{
        currentPage--;
        renderTable();
      }}
    }}

    function nextPage() {{
      const totalPages = Math.ceil(filteredCoops.length / pageSize) || 1;
      if (currentPage < totalPages) {{
        currentPage++;
        renderTable();
      }}
    }}

    function locateOnMap(lat, lon) {{
      if (map && lat && lon) {{
        map.setView([lat, lon], 14, {{ animate: true }});
        window.scrollTo({{ top: 120, behavior: 'smooth' }});
      }}
    }}

    function openModal(id) {{
      const c = COOPS_DATA.find(x => x.id === id);
      if (!c) return;

      document.getElementById('modal-nome').innerText = c.nome;
      document.getElementById('modal-razao').innerText = c.razao;
      document.getElementById('modal-reg').innerText = c.reg;
      document.getElementById('modal-cnpj').innerText = c.cnpj;
      document.getElementById('modal-st').innerText = c.st;
      document.getElementById('modal-st').className = c.st === 'Ativa' ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold';
      document.getElementById('modal-muni').innerText = `${{c.muni}} / ${{c.uf}} (${{c.bairro || 'Centro'}})`;
      document.getElementById('modal-dist').innerText = `${{c.dist}} km da sede Butantã`;
      document.getElementById('modal-end').innerText = `${{c.end}} - CEP ${{c.cep || '—'}}`;
      document.getElementById('modal-tipo').innerText = c.tipo;
      document.getElementById('modal-pos').innerText = c.pos;
      document.getElementById('modal-tel').innerText = c.tel || 'Não cadastrado';
      document.getElementById('modal-email').innerText = c.email || 'Não cadastrado';

      document.getElementById('coop-modal').classList.remove('hidden');
    }}

    function closeModal() {{
      document.getElementById('coop-modal').classList.add('hidden');
    }}

    function exportCooperativasCSV() {{
      if (!filteredCoops || filteredCoops.length === 0) return;
      let csv = "\\uFEFF";
      const headers = ["ID", "CNPJ", "Razao_Social", "Nome_Fantasia", "Municipio", "UF", "Regiao", "Bairro", "Distancia_Sede_km", "Situacao", "Telefone", "Email", "Posicionamento"];
      csv += headers.join(";") + "\\n";
      filteredCoops.forEach(c => {{
        csv += `"${{c.id}}";"${{c.cnpj}}";"${{c.razao}}";"${{c.nome}}";"${{c.muni}}";"${{c.uf}}";"${{c.reg}}";"${{c.bairro}}";"${{c.dist}}";"${{c.st}}";"${{c.tel}}";"${{c.email}}";"${{c.pos}}"\\n`;
      }});
      const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cooperativas_taxi_sp_export_${{new Date().toISOString().slice(0,10)}}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }}

    window.onload = function() {{
      initMap();
      renderTable();
    }};
  </script>
</body>
</html>"""

    with open(OUT_ROOT, 'w', encoding='utf-8') as f:
        f.write(html_content)
    with open(OUT_FOLDER, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"-> Arquivo HTML gerado na raiz: {OUT_ROOT} ({os.path.getsize(OUT_ROOT)/1024:.1f} KB)")
    print(f"-> Arquivo HTML gerado na pasta: {OUT_FOLDER}")
    print("=" * 80)

if __name__ == '__main__':
    generate_mapa_cooperativas()
