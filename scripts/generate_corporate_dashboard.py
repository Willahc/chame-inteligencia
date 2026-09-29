import os
import json
import pandas as pd

def generate_corporate_dashboard():
    print("=" * 80)
    print("GERANDO DASHBOARD DEDICADO: CLIENTES CORPORATIVOS B2B & HOSPITAIS 5KM")
    print("=" * 80)

    # 1. Carregar Hospitais
    hosp_path = os.path.join('Novos Alvarás 2026', 'clientes_corporativos_hospitais_5km.csv')
    if not os.path.exists(hosp_path):
        hosp_path = 'clientes_corporativos_hospitais_5km.csv'
    
    hosp_records = []
    if os.path.exists(hosp_path):
        hdf = pd.read_csv(hosp_path, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, hr in hdf.iterrows():
            lat = hr.get('Latitude')
            lon = hr.get('Longitude')
            if pd.notna(lat) and pd.notna(lon):
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except Exception:
                    continue
                hosp_records.append({
                    "id": str(hr.get('ID_Prospect_B2B', '')),
                    "nome": str(hr.get('Nome_Instituicao', '')),
                    "grupo": str(hr.get('Grupo_Mantenedor', '')),
                    "tipo": str(hr.get('Tipo_Estabelecimento', '')),
                    "tipo_entidade": "Hospital / Polo de Saúde",
                    "setor": str(hr.get('Tipo_Estabelecimento', 'Hospital / Saúde')),
                    "tier": str(hr.get('Tier_Potencial_Comercial', '')),
                    "score": int(hr.get('Score_Afinidade_Chame_Taxi', 80)) if pd.notna(hr.get('Score_Afinidade_Chame_Taxi')) else 80,
                    "dist": float(hr.get('Distancia_Sede_Chame_Taxi_km', 0)),
                    "tempo": int(hr.get('Tempo_Estimado_Deslocamento_min', 5)) if pd.notna(hr.get('Tempo_Estimado_Deslocamento_min')) else 5,
                    "end": str(hr.get('Endereco_Completo', '')),
                    "bairro": str(hr.get('Bairro', '')),
                    "tel": str(hr.get('Telefone_Central', '')),
                    "acessivel": str(hr.get('Demanda_Taxi_Acessivel', 'Alta')),
                    "vouchers": str(hr.get('Demanda_Vouchers_Plantoes', 'Alta')),
                    "esg": str(hr.get('Demanda_Frota_ESG_Eletrica', 'Alta')),
                    "corridas": str(hr.get('Estimativa_Potencial_Corridas_Mes', '')),
                    "ponto": str(hr.get('Ponto_Taxi_Mais_Proximo', '')),
                    "pitch": str(hr.get('Proposta_Valor_Pitch_Chame_Taxi', '')),
                    "mob_ativo": str(hr.get('Possui_Servico_Mobilidade_Ativo', '—')),
                    "mob_tipo": str(hr.get('Tipo_Servico_Mobilidade_Atual', '—')),
                    "mob_forn": str(hr.get('Fornecedor_Atual_Provavel', '—')),
                    "mob_dor": str(hr.get('Gargalo_Dor_Atual', '—')),
                    "mob_vuln": str(hr.get('Nivel_Vulnerabilidade_Contrato', '—')),
                    "mob_ataque": str(hr.get('Estrategia_Ataque_Chame_Taxi', '—')),
                    "mob_rec": str(hr.get('Potencial_Receita_Mensal_Estimada', '—')),
                    "dec_area": str(hr.get('Area_Decisora_Principal', '')),
                    "dec_cargos": str(hr.get('Cargos_Alvo_Decisores', '')),
                    "dec_lideres": str(hr.get('Nomes_Liderancas_Mapeadas', '')),
                    "dec_canal": str(hr.get('Canal_Contato_Recomendado', '')),
                    "dec_linkedin": str(hr.get('Link_Busca_LinkedIn_Decisores', '')),
                    "dec_google": str(hr.get('Link_Busca_Google_Decisores', '')),
                    "dec_script": str(hr.get('Script_Abordagem_LinkedIn', '')),
                    "email_dom": str(hr.get('Dominio_Email_Corporativo', '')),
                    "email_padrao": str(hr.get('Padrao_Sintaxe_Email', '')),
                    "email_inst": str(hr.get('Email_Canal_Compras_Institucional', '')),
                    "email_dec": str(hr.get('Email_Provavel_Decisor_Mapeado', '')),
                    "link_hunter": str(hr.get('Link_Hunter_Busca_Emails', '')),
                    "link_google_email": str(hr.get('Link_Google_Dork_Emails', '')),
                    "isHosp": True,
                    "lat": lat_f,
                    "lon": lon_f
                })
    print(f"-> Hospitais carregados: {len(hosp_records)}")

    # 2. Carregar Grandes Empresas
    emp_path = os.path.join('Novos Alvarás 2026', 'clientes_corporativos_empresas_5km.csv')
    if not os.path.exists(emp_path):
        emp_path = 'clientes_corporativos_empresas_5km.csv'
        
    emp_records = []
    if os.path.exists(emp_path):
        edf = pd.read_csv(emp_path, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, er in edf.iterrows():
            lat = er.get('Latitude')
            lon = er.get('Longitude')
            if pd.notna(lat) and pd.notna(lon):
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except Exception:
                    continue
                emp_records.append({
                    "id": str(er.get('ID_Prospect_B2B', '')),
                    "nome": str(er.get('Nome_Empresa', '')),
                    "razao": str(er.get('Razao_Social_Holding', '')),
                    "tipo_entidade": "Grande Empresa (100+)",
                    "setor": str(er.get('Setor_Economico', '')),
                    "colab": str(er.get('Qtd_Colaboradores_Presenciais_Est', '')),
                    "faixa": str(er.get('Faixa_Colaboradores', '')),
                    "edificio": str(er.get('Edificio_Sede_Complexo', '')),
                    "end": str(er.get('Endereco_Completo', '')),
                    "bairro": str(er.get('Bairro', '')),
                    "lat": lat_f,
                    "lon": lon_f,
                    "dist": float(er.get('Distancia_Sede_Chame_Taxi_km', 0)),
                    "tempo": int(er.get('Tempo_Estimado_Deslocamento_min', 5)) if pd.notna(er.get('Tempo_Estimado_Deslocamento_min')) else 5,
                    "ponto": str(er.get('Ponto_Taxi_Mais_Proximo', '')),
                    "vouchers": str(er.get('Demanda_Vouchers_Horas_Extras_Noturno', 'Alta')),
                    "aero": str(er.get('Demanda_Viagens_Aeroportos', 'Alta')),
                    "esg": str(er.get('Demanda_Frota_ESG_Eletrica', 'Alta')),
                    "faixa_onibus": str(er.get('Vantagem_Faixa_Onibus_Reunioes', 'Muito Alta')),
                    "corridas": str(er.get('Estimativa_Potencial_Corridas_Mes', '')),
                    "tier": str(er.get('Tier_Potencial_Comercial', '')),
                    "score": int(er.get('Score_Afinidade_Chame_Taxi', 85)) if pd.notna(er.get('Score_Afinidade_Chame_Taxi')) else 85,
                    "pitch": str(er.get('Script_Pitch_Comercial_Chame_Taxi', '')),
                    "mob_ativo": str(er.get('Possui_Servico_Mobilidade_Ativo', '—')),
                    "mob_tipo": str(er.get('Tipo_Servico_Mobilidade_Atual', '—')),
                    "mob_forn": str(er.get('Fornecedor_Atual_Provavel', '—')),
                    "mob_dor": str(er.get('Gargalo_Dor_Atual', '—')),
                    "mob_vuln": str(er.get('Nivel_Vulnerabilidade_Contrato', '—')),
                    "mob_ataque": str(er.get('Estrategia_Ataque_Chame_Taxi', '—')),
                    "mob_rec": str(er.get('Potencial_Receita_Mensal_Estimada', '—')),
                    "dec_area": str(er.get('Area_Decisora_Principal', '')),
                    "dec_cargos": str(er.get('Cargos_Alvo_Decisores', '')),
                    "dec_lideres": str(er.get('Nomes_Liderancas_Mapeadas', '')),
                    "dec_canal": str(er.get('Canal_Contato_Recomendado', '')),
                    "dec_linkedin": str(er.get('Link_Busca_LinkedIn_Decisores', '')),
                    "dec_google": str(er.get('Link_Busca_Google_Decisores', '')),
                    "dec_script": str(er.get('Script_Abordagem_LinkedIn', '')),
                    "email_dom": str(er.get('Dominio_Email_Corporativo', '')),
                    "email_padrao": str(er.get('Padrao_Sintaxe_Email', '')),
                    "email_inst": str(er.get('Email_Canal_Compras_Institucional', '')),
                    "email_dec": str(er.get('Email_Provavel_Decisor_Mapeado', '')),
                    "link_hunter": str(er.get('Link_Hunter_Busca_Emails', '')),
                    "link_google_email": str(er.get('Link_Google_Dork_Emails', '')),
                    "tel": str(er.get('Telefone_Central', '')),
                    "site": str(er.get('Website_Corporativo', '')),
                    "isHosp": False
                })
    print(f"-> Grandes Empresas carregadas: {len(emp_records)}")

    all_clients = hosp_records + emp_records
    json_clients = json.dumps(all_clients, ensure_ascii=False)
    json_hosp = json.dumps(hosp_records, ensure_ascii=False)
    json_emp = json.dumps(emp_records, ensure_ascii=False)

    html_template = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal de Inteligência Comercial B2B: Clientes & Hospitais 5km - Chame Táxi</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <!-- Leaflet CSS & JS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css"/>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
  <!-- Phosphor Icons -->
  <script src="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/index.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    #b2b-leaflet-map { height: calc(100vh - 250px); min-height: 560px; border-radius: 0.75rem; z-index: 10; }
  </style>
</head>
<body class="text-slate-800 min-h-screen flex flex-col">

  <!-- TOP HEADER & MAIN NAVIGATION -->
  <header class="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
    <div class="max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      
      <!-- LOGO & TITULO -->
      <div class="flex items-center space-x-3.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-purple-500/20 text-xl">
          <i class="ph-bold ph-buildings"></i>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-base sm:text-lg font-bold tracking-tight text-white leading-none">Chame Táxi: Central de Inteligência Comercial B2B</h1>
            <span class="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-wider">Raio 5km Sede Butantã</span>
          </div>
          <p class="text-xs text-slate-300 mt-0.5">190 Clientes Corporativos Mapeados &bull; 94 Polos Hospitalares &bull; 96 Grandes Empresas (100+)</p>
        </div>
      </div>

      <!-- BOTÕES DE NAVEGAÇÃO -->
      <div class="flex items-center space-x-2 text-xs font-semibold">
        <button id="nav-btn-table" onclick="switchB2BTab('table')" class="px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 bg-purple-600 text-white font-bold shadow-sm">
          <i class="ph-bold ph-table"></i>
          <span>1. Tabela & Dossiês (190)</span>
        </button>
        <button id="nav-btn-map" onclick="switchB2BTab('map')" class="px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white">
          <i class="ph-bold ph-map-pin"></i>
          <span>2. Mapa GIS B2B</span>
        </button>
        <button id="nav-btn-intel" onclick="switchB2BTab('intel')" class="px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white">
          <i class="ph-bold ph-lightning"></i>
          <span>3. Inteligência de Decisores</span>
        </button>
        <a href="dashboard_mestre_taxistas_sp_2026.html" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1 shadow-sm ml-2">
          <i class="ph-bold ph-taxi"></i>
          <span>Portal Taxistas 2026 ↗</span>
        </a>
      </div>

    </div>
  </header>

  <!-- CONTEÚDO PRINCIPAL -->
  <main class="max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full">

    <!-- ===================================================================== -->
    <!-- ABA 1: TABELA E DOSSIÊS B2B                                           -->
    <!-- ===================================================================== -->
    <div id="tab-content-table" class="space-y-6">
      
      <!-- CARDS DE METRICAS E KPI B2B -->
      <section class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Prospects B2B</span>
            <i class="ph-bold ph-buildings text-purple-600 text-base"></i>
          </div>
          <div class="text-2xl font-black text-slate-900 tracking-tight">190</div>
          <span class="text-[10px] text-purple-600 font-semibold mt-1">Raio 5.0 km Sede</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Hospitais & Saúde</span>
            <i class="ph-bold ph-first-aid text-rose-600 text-base"></i>
          </div>
          <div class="text-2xl font-black text-rose-600 tracking-tight">94</div>
          <span class="text-[10px] text-slate-500 mt-1">Tier A, Quat. & Clínicas</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Empresas (100+)</span>
            <i class="ph-bold ph-briefcase text-blue-600 text-base"></i>
          </div>
          <div class="text-2xl font-black text-blue-600 tracking-tight">96</div>
          <span class="text-[10px] text-slate-500 mt-1">Sedes Corporativas</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Alta Vulnerabilidade</span>
            <i class="ph-bold ph-flame text-red-500 text-base"></i>
          </div>
          <div class="text-2xl font-black text-red-600 tracking-tight">85</div>
          <span class="text-[10px] text-red-600 font-semibold mt-1">Contratos Frágeis</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Potencial Mensal</span>
            <i class="ph-bold ph-currency-dollar text-emerald-600 text-base"></i>
          </div>
          <div class="text-2xl font-black text-emerald-600 tracking-tight">R$ 3.83M</div>
          <span class="text-[10px] text-slate-500 mt-1">~103.500 corridas/mês</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Demanda Acessível</span>
            <i class="ph-bold ph-wheelchair text-indigo-600 text-base"></i>
          </div>
          <div class="text-2xl font-black text-indigo-600 tracking-tight">28</div>
          <span class="text-[10px] text-indigo-600 font-semibold mt-1">Hospitais Reabilitação</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider">Demanda ESG / Elét.</span>
            <i class="ph-bold ph-leaf text-teal-600 text-base"></i>
          </div>
          <div class="text-2xl font-black text-teal-600 tracking-tight">32</div>
          <span class="text-[10px] text-teal-600 font-semibold mt-1">Foco Edital 4 Híbrido</span>
        </div>
      </section>

      <!-- BARRA DE FILTROS B2B -->
      <section class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <i class="ph-bold ph-funnel text-purple-600 text-lg"></i>
            <h3 class="font-bold text-slate-900 text-sm">Filtros Táticos de Prospecção B2B</h3>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="exportB2BCSV()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <i class="ph-bold ph-download-simple"></i>
              <span>Exportar Base Filtrada (CSV)</span>
            </button>
            <button onclick="switchB2BTab('map')" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <i class="ph-bold ph-map-pin"></i>
              <span>Explorar no Mapa GIS</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- BUSCA RÁPIDA -->
          <div class="lg:col-span-2">
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buscar Empresa / Hospital / Decisor</label>
            <div class="relative">
              <i class="ph-bold ph-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
              <input type="text" id="b2b-search-query" oninput="applyB2BFilters()" placeholder="Nome, hospital, bairro, decisor, cargo, dor..." class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"/>
            </div>
          </div>

          <!-- FILTRO POR SEGMENTO -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Segmento / Setor</label>
            <select id="b2b-segment-filter" onchange="applyB2BFilters()" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="ALL">Todos os Segmentos (190)</option>
              <option value="HOSPITAIS">🏥 Apenas Hospitais & Saúde (94)</option>
              <option value="EMPRESAS">🏢 Apenas Grandes Empresas (96)</option>
              <option value="HOSP_TIERA">🏥 Quaternários Tier A (Einstein, HC...)</option>
              <option value="TECH">💻 Big Techs & Startups</option>
              <option value="FINANCE">🏦 Bancos & Financeiras</option>
              <option value="INDUSTRY">🌿 Indústrias & Bens de Consumo</option>
              <option value="CONSULT">📊 Big Four & Consultorias</option>
              <option value="LEGAL">⚖️ Bancas de Advocacia</option>
              <option value="SHOPPING">🏢 Shoppings & Complexos</option>
            </select>
          </div>

          <!-- FILTRO POR VULNERABILIDADE -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vulnerabilidade Contratual</label>
            <select id="b2b-vuln-filter" onchange="applyB2BFilters()" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="ALL">Todas as Vulnerabilidades</option>
              <option value="Alta">🔥 Alta Vulnerabilidade (85)</option>
              <option value="Média">⏳ Média Vulnerabilidade (105)</option>
            </select>
          </div>

          <!-- FILTRO POR DEMANDA ESPECIAL -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Foco de Demanda</label>
            <select id="b2b-demand-filter" onchange="applyB2BFilters()" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="ALL">Todas as Demandas</option>
              <option value="ACES">♿ Táxi Acessível / Desospitalização</option>
              <option value="VOUCHERS">🌙 Vouchers Noturnos / Horas Extras</option>
              <option value="ESG">⚡ Frotas Elétricas / ESG (Edital 4)</option>
              <option value="FAIXA">🚌 Benefício Faixa Exclusiva Ônibus</option>
            </select>
          </div>

          <!-- FILTRO POR DISTÂNCIA DA SEDE -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Distância Sede Butantã</label>
            <select id="b2b-dist-filter" onchange="applyB2BFilters()" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="ALL">Todas (< 5.0 km)</option>
              <option value="2.5">📍 Raio Imediato (< 2.5 km)</option>
              <option value="4.0">📍 Raio Próximo (< 4.0 km)</option>
            </select>
          </div>
        </div>
      </section>

      <!-- TABELA INTERATIVA DE CLIENTES CORPORATIVOS B2B -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div class="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800" id="b2b-results-count">Exibindo 0 clientes</span>
            <span class="text-slate-400">|</span>
            <span class="text-slate-500">Clique em qualquer linha para abrir o <b>Dossiê Completo B2B</b></span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[11px]">Itens por página:</span>
            <select id="b2b-page-size" onchange="changeB2BPageSize()" class="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700">
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="190">Todos (190)</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th class="py-2.5 px-3">Prospect / Instituição</th>
                <th class="py-2.5 px-3">Segmento & Local</th>
                <th class="py-2.5 px-3 text-center">Dist. Sede</th>
                <th class="py-2.5 px-3">Mobilidade Atual & Dor</th>
                <th class="py-2.5 px-3 text-center">Vulnerab.</th>
                <th class="py-2.5 px-3">Potencial Receita</th>
                <th class="py-2.5 px-3">Decisores & E-mails</th>
                <th class="py-2.5 px-3 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody id="b2b-table-body" class="divide-y divide-slate-100">
              <!-- Linhas geradas via JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- PAGINAÇÃO -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs" id="b2b-pagination">
          <!-- Controles de paginação dinâmicos -->
        </div>
      </section>

    </div>

    <!-- ===================================================================== -->
    <!-- ABA 2: MAPA GIS LEAFLET B2B                                           -->
    <!-- ===================================================================== -->
    <div id="tab-content-map" class="space-y-4 hidden">
      
      <!-- CONTROLES SUPERIORES DO MAPA -->
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1.5 font-bold text-slate-800">
            <i class="ph-bold ph-map-trifold text-purple-600 text-base"></i>
            <span>Visualizador Territorial GIS B2B</span>
          </div>
          <span class="text-slate-400">|</span>
          <span class="text-slate-500 text-[11px]">Sede Butantã (Estrela ⭐) & Círculos de 3km e 5km</span>
        </div>

        <!-- CAMADAS & PROVEDORES -->
        <div class="flex items-center space-x-2">
          <button id="btn-toggle-hosp" onclick="toggleLayer('hosp')" class="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1">
            <span>🏥 Hospitais (94)</span>
          </button>
          <button id="btn-toggle-emp" onclick="toggleLayer('emp')" class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1">
            <span>🏢 Empresas (96)</span>
          </button>
          <select id="map-tile-select" onchange="switchB2BTile(this.value)" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
            <option value="esri_street" selected>Mapa Esri Street</option>
            <option value="google">Google Maps</option>
            <option value="carto">CARTO Voyager</option>
            <option value="esri_satellite">Satélite Esri</option>
          </select>
        </div>
      </div>

      <!-- MAPA CONTAINER -->
      <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative">
        <div id="b2b-leaflet-map"></div>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- ABA 3: INTELIGÊNCIA DE DECISORES & SCRIPT OUTBOUND                     -->
    <!-- ===================================================================== -->
    <div id="tab-content-intel" class="space-y-6 hidden">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <!-- CARD 1: METODOLOGIA DE OUTBOUND B2B -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <i class="ph-bold ph-target"></i>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">Metodologia de Abordagem B2B</h3>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Para maximizar a conversão de contratos corporativos frente aos apps multinacionais (99 Empresas / Uber for Business), a abordagem deve focar na <b>vulnerabilidade contratual</b> mapeada:
          </p>
          <ul class="text-xs text-slate-700 space-y-2">
            <li class="flex items-start gap-1.5">
              <i class="ph-bold ph-check-circle text-emerald-600 text-sm shrink-0 mt-0.5"></i>
              <span><b>Fim do Custo Surpresa:</b> Eliminação total da tarifa dinâmica em dias de chuva e picos.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <i class="ph-bold ph-check-circle text-emerald-600 text-sm shrink-0 mt-0.5"></i>
              <span><b>Agilidade no Trânsito:</b> Liberação irrestrita nas pistas exclusivas e faixas de ônibus de SP.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <i class="ph-bold ph-check-circle text-emerald-600 text-sm shrink-0 mt-0.5"></i>
              <span><b>Atendimento Humano:</b> Faturamento consolidado quinzenal/mensal e central 24h dedicada.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <i class="ph-bold ph-check-circle text-emerald-600 text-sm shrink-0 mt-0.5"></i>
              <span><b>Frota Especializada:</b> Táxi Acessível (DTP) para pacientes e frotas elétricas/híbridas (ESG).</span>
            </li>
          </ul>
        </div>

        <!-- CARD 2: PADRÕES DE E-MAIL & SINTAXE -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <i class="ph-bold ph-envelope"></i>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">Engenharia de E-mails Corporativos</h3>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Em mais de 88% das corporações e hospitais privados de São Paulo, os e-mails corporativos seguem uma sintaxe padronizada:
          </p>
          <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
              <span class="text-purple-700 font-bold block">{nome}.{sobrenome}@empresa.com.br</span>
              <span class="text-[10px] text-slate-500 font-sans">Padrão dominante em 68% das empresas multinacionais e hospitais.</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
              <span class="text-indigo-700 font-bold block">{inicial_nome}{sobrenome}@empresa.com.br</span>
              <span class="text-[10px] text-slate-500 font-sans">Padrão em bancos, financeiras e fundações de saúde.</span>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 italic">
            Dica: Combine o nome do decisor mapeado no LinkedIn com o Hunter.io do domínio para validação antes do envio.
          </p>
        </div>

        <!-- CARD 3: HIERARQUIA DE DECISÃO -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <i class="ph-bold ph-users-three"></i>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">Hierarquia dos Cargos Decisores</h3>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Quem tem o poder da caneta para assinar e homologar o fornecedor de mobilidade corporativa:
          </p>
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center justify-between p-2 rounded bg-purple-50 text-purple-900 font-semibold">
              <span>1. Gerente / Diretor de Suprimentos & Compras Indiretas</span>
              <span class="text-[10px] bg-purple-200 px-1.5 py-0.5 rounded">Decisor Final</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded bg-blue-50 text-blue-900 font-semibold">
              <span>2. Gerente de Facilities, Workplace & Serviços Gerais</span>
              <span class="text-[10px] bg-blue-200 px-1.5 py-0.5 rounded">Gestor Contrato</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded bg-amber-50 text-amber-900 font-semibold">
              <span>3. Business Partner de RH / Operações Médicas</span>
              <span class="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded">Influenciador</span>
            </div>
          </div>
        </div>

      </div>

    </div>

  </main>

  <!-- ===================================================================== -->
  <!-- MODAL / DOSSIÊ 360° DO CLIENTE CORPORATIVO B2B                        -->
  <!-- ===================================================================== -->
  <div id="b2b-modal" class="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm hidden flex items-center justify-center p-3 sm:p-5">
    <div class="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- MODAL HEADER -->
      <div class="p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white flex items-start justify-between border-b border-slate-800">
        <div class="flex items-center space-x-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-500/20" id="b2b-modal-avatar">
            🏢
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight" id="b2b-modal-name">Nome do Prospect</h3>
              <span id="b2b-modal-tier-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Tier A
              </span>
              <span id="b2b-modal-score-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Score: 95 pts
              </span>
              <span id="b2b-modal-vuln-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                Alta Vulnerabilidade
              </span>
            </div>
            <p class="text-xs text-slate-300 mt-1" id="b2b-modal-subtitle">Segmento &bull; Endereço</p>
          </div>
        </div>
        <button onclick="closeB2BModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition">
          <i class="ph-bold ph-x text-base"></i>
        </button>
      </div>

      <!-- MODAL BODY -->
      <div class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-xs">
        
        <!-- GRID DE CARDS ESTRATÉGICOS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          <!-- CARD 1: DIAGNÓSTICO DE MOBILIDADE ATUAL -->
          <div class="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
            <span class="text-[10px] uppercase font-bold text-rose-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-car text-sm"></i>
              <span>Diagnóstico de Mobilidade & Fornecedor Atual</span>
            </span>
            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-rose-200/60">
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Fornecedor Atual</span>
                <span id="b2b-modal-forn" class="font-bold text-slate-900">—</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Modelo de Operação</span>
                <span id="b2b-modal-tipo-mob" class="font-semibold text-slate-800">—</span>
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-rose-700 uppercase block">Principal Gargalo / Dor</span>
              <p id="b2b-modal-dor" class="text-slate-800 italic mt-0.5 leading-snug">—</p>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-rose-200/60">
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Corridas Estimadas</span>
                <span id="b2b-modal-corridas" class="font-bold text-slate-900">—</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Potencial de Receita</span>
                <span id="b2b-modal-rec" class="font-black text-emerald-600">—</span>
              </div>
            </div>
          </div>

          <!-- CARD 2: LOCALIZAÇÃO & LOGÍSTICA SEDE BUTANTÃ -->
          <div class="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
            <span class="text-[10px] uppercase font-bold text-blue-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-map-pin text-sm"></i>
              <span>Localização & Proximidade Sede Butantã</span>
            </span>
            <div class="pt-1 border-t border-blue-200/60">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Endereço Completo</span>
              <span id="b2b-modal-end" class="font-bold text-slate-900 leading-snug block">—</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Distância Sede</span>
                <span id="b2b-modal-dist" class="font-bold text-blue-700">—</span>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Tempo de Deslocamento</span>
                <span id="b2b-modal-tempo" class="font-bold text-slate-800">—</span>
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Ponto de Táxi DTP Próximo</span>
              <span id="b2b-modal-ponto" class="font-semibold text-slate-800">—</span>
            </div>
          </div>

        </div>

        <!-- CARD 3: DECISORES DE COMPRAS, SUPRIMENTOS & FACILITIES -->
        <div class="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-users text-sm"></i>
              <span>Decisores de Contratação (Compras, Suprimentos & Facilities)</span>
            </span>
            <span class="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Procurement B2B</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 border-t border-emerald-200/60">
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase block">Área Decisora</span>
              <span id="b2b-modal-dec-area" class="font-bold text-slate-900 block">—</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase block">Cargos-Alvo Prioritários</span>
              <span id="b2b-modal-dec-cargos" class="font-semibold text-slate-800 block">—</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase block">Liderança Mapeada / Canal</span>
              <span id="b2b-modal-dec-lideres" class="font-bold text-indigo-700 block">—</span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1.5 border-t border-emerald-200/60">
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase block">Padrão de E-mail Corporativo</span>
              <span id="b2b-modal-email-padrao" class="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200 block">—</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase block">E-mail Provável do Decisor / Canal</span>
              <span id="b2b-modal-email-dec" class="font-mono text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 block">—</span>
            </div>
          </div>
        </div>

        <!-- CARD 4: BOTÕES DE AÇÃO RÁPIDA 1-CLIQUE -->
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span class="text-[10px] uppercase font-bold text-slate-600 tracking-wider block">Ações Rápidas de Prospecção</span>
          <div class="flex flex-wrap gap-2">
            <a id="b2b-modal-link-linkedin" href="#" target="_blank" class="px-3 py-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="ph-bold ph-linkedin-logo"></i>
              <span>Buscar no LinkedIn Web ↗</span>
            </a>
            <a id="b2b-modal-link-google" href="#" target="_blank" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="ph-bold ph-google-logo"></i>
              <span>Ver Perfis no Google (Sem Login) ↗</span>
            </a>
            <a id="b2b-modal-link-hunter" href="#" target="_blank" class="px-3 py-1.5 bg-[#e11d48] hover:bg-[#be123c] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="ph-bold ph-target"></i>
              <span>Hunter.io (E-mails do Domínio) ↗</span>
            </a>
            <a id="b2b-modal-link-dork-email" href="#" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="ph-bold ph-envelope"></i>
              <span>Google Dork E-mails ↗</span>
            </a>
            <a id="b2b-modal-link-maps" href="#" target="_blank" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="ph-bold ph-navigation-arrow"></i>
              <span>Rota Google Maps ↗</span>
            </a>
            <button id="b2b-modal-btn-locate" onclick="locateCurrentB2BOnMap()" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="ph-bold ph-crosshair"></i>
              <span>Ver no Mapa GIS</span>
            </button>
            <a id="b2b-modal-link-tel" href="#" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition">
              <i class="ph-bold ph-phone"></i>
              <span id="b2b-modal-tel-txt">Ligar Central</span>
            </a>
          </div>
        </div>

        <!-- CARD 5: SCRIPT DE ABORDAGEM PERSONALIZADO (INMAIL / EMAIL) -->
        <div class="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-chat-text text-sm"></i>
              <span>Script Personalizado de Abordagem Comercial (InMail / Cold Email)</span>
            </span>
            <button onclick="copyB2BScript()" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 transition shadow-sm">
              <i class="ph-bold ph-copy"></i>
              <span id="b2b-copy-script-btn-txt">Copiar Mensagem Pronta</span>
            </button>
          </div>
          <p id="b2b-modal-script-text" class="text-slate-800 bg-white p-3 rounded-lg border border-amber-200 font-medium leading-relaxed select-all">
            Carregando script personalizado...
          </p>
        </div>

        <!-- CARD 6: GESTÃO DO LEAD CRM B2B (PERSISTÊNCIA LOCALSTORAGE) -->
        <div class="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-purple-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-kanban text-sm"></i>
              <span>Gestão de Contato CRM B2B & Histórico</span>
            </span>
            <span id="b2b-crm-saved-indicator" class="text-[10px] font-bold text-emerald-600 hidden">✓ Salvo localmente</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status do Funil B2B</label>
              <select id="b2b-crm-status" class="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="1 - Novo Prospect">1 - Novo Prospect</option>
                <option value="2 - Decisor Conectado no LinkedIn">2 - Decisor Conectado no LinkedIn</option>
                <option value="3 - E-mail / Apresentação Enviada">3 - E-mail / Apresentação Enviada</option>
                <option value="4 - Reunião Agendada">4 - Reunião Agendada</option>
                <option value="5 - Proposta Comercial em Análise">5 - Proposta Comercial em Análise</option>
                <option value="6 - Contrato Homologado">6 - Contrato Homologado ⭐</option>
                <option value="7 - Standby / Retornar em 60 dias">7 - Standby / Retornar em 60 dias</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anotações do Contato / Próximos Passos</label>
              <div class="flex gap-2">
                <input type="text" id="b2b-crm-notes" placeholder="Ex: Falou com Felipe no LinkedIn, reunião pré-agendada para quinta..." class="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                <button onclick="saveB2BCRM()" class="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1 shrink-0">
                  <i class="ph-bold ph-floppy-disk"></i>
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- MODAL FOOTER -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-500" id="b2b-modal-footer-id">ID Prospect: CORP-000</span>
        </div>
        <button onclick="closeB2BModal()" class="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300 transition text-xs">
          Fechar Dossiê B2B
        </button>
      </div>

    </div>
  </div>

  <!-- SCRIPT & DADOS JAVASCRIPT -->
  <script>
    const ALL_B2B_CLIENTS = __ALL_CLIENTS_PLACEHOLDER__;
    const HOSPITAIS_DATA = __HOSPITAIS_PLACEHOLDER__;
    const EMPRESAS_DATA = __EMPRESAS_PLACEHOLDER__;

    const CHAME_LAT = -23.5715;
    const CHAME_LON = -46.7082;

    let currentB2BTab = 'table';
    let filteredB2B = [...ALL_B2B_CLIENTS];
    let currentB2BPage = 1;
    let b2bPageSize = 25;
    let currentB2BModalId = null;

    let b2bMapInstance = null;
    let b2bTileLayer = null;
    let hospLayerGroup = null;
    let empLayerGroup = null;
    let isHospVisible = true;
    let isEmpVisible = true;

    const TILE_PROVIDERS = {
      'esri_street': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attr: '&copy; Esri World Street Map'
      },
      'google': {
        url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attr: '&copy; Google Maps'
      },
      'carto': {
        url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attr: '&copy; CARTO Voyager'
      },
      'esri_satellite': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: '&copy; Esri World Imagery'
      }
    };

    window.addEventListener('DOMContentLoaded', () => {
      applyB2BFilters();
    });

    function switchB2BTab(tab) {
      currentB2BTab = tab;
      
      const tabTable = document.getElementById('tab-content-table');
      const tabMap = document.getElementById('tab-content-map');
      const tabIntel = document.getElementById('tab-content-intel');

      const btnTable = document.getElementById('nav-btn-table');
      const btnMap = document.getElementById('nav-btn-map');
      const btnIntel = document.getElementById('nav-btn-intel');

      tabTable.classList.add('hidden');
      tabMap.classList.add('hidden');
      tabIntel.classList.add('hidden');

      btnTable.className = "px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white";
      btnMap.className = "px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white";
      btnIntel.className = "px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-300 hover:text-white";

      if (tab === 'table') {
        tabTable.classList.remove('hidden');
        btnTable.className = "px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 bg-purple-600 text-white font-bold shadow-sm";
      } else if (tab === 'map') {
        tabMap.classList.remove('hidden');
        btnMap.className = "px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 bg-purple-600 text-white font-bold shadow-sm";
        initB2BMap();
      } else if (tab === 'intel') {
        tabIntel.classList.remove('hidden');
        btnIntel.className = "px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 bg-purple-600 text-white font-bold shadow-sm";
      }
    }

    // =========================================================================
    // FILTROS & TABELA B2B
    // =========================================================================
    function applyB2BFilters() {
      const qInput = document.getElementById('b2b-search-query');
      const q = qInput ? qInput.value.toLowerCase().trim() : '';

      const segInput = document.getElementById('b2b-segment-filter');
      const seg = segInput ? segInput.value : 'ALL';

      const vulnInput = document.getElementById('b2b-vuln-filter');
      const vuln = vulnInput ? vulnInput.value : 'ALL';

      const demandInput = document.getElementById('b2b-demand-filter');
      const demand = demandInput ? demandInput.value : 'ALL';

      const distInput = document.getElementById('b2b-dist-filter');
      const dist = distInput ? distInput.value : 'ALL';

      filteredB2B = ALL_B2B_CLIENTS.filter(item => {
        if (q) {
          const matchNome = (item.nome || '').toLowerCase().includes(q);
          const matchId = (item.id || '').toLowerCase().includes(q);
          const matchEnd = (item.end || '').toLowerCase().includes(q);
          const matchBairro = (item.bairro || '').toLowerCase().includes(q);
          const matchLideres = (item.dec_lideres || '').toLowerCase().includes(q);
          const matchCargos = (item.dec_cargos || '').toLowerCase().includes(q);
          const matchDor = (item.mob_dor || '').toLowerCase().includes(q);
          const matchForn = (item.mob_forn || '').toLowerCase().includes(q);
          const matchDom = (item.email_dom || '').toLowerCase().includes(q);
          const matchDecEmail = (item.email_dec || '').toLowerCase().includes(q);
          const matchSetor = (item.setor || '').toLowerCase().includes(q);
          if (!matchNome && !matchId && !matchEnd && !matchBairro && !matchLideres && !matchCargos && !matchDor && !matchForn && !matchDom && !matchDecEmail && !matchSetor) {
            return false;
          }
        }

        if (seg !== 'ALL') {
          if (seg === 'HOSPITAIS' && !item.isHosp) return false;
          if (seg === 'EMPRESAS' && item.isHosp) return false;
          if (seg === 'HOSP_TIERA' && (!item.isHosp || !item.tier || !item.tier.includes('Tier A'))) return false;
          if (seg === 'TECH' && (!item.setor || (!item.setor.includes('Tecnologia') && !item.setor.includes('Software') && !item.setor.includes('Internet')))) return false;
          if (seg === 'FINANCE' && (!item.setor || (!item.setor.includes('Financeiro') && !item.setor.includes('Banc')))) return false;
          if (seg === 'INDUSTRY' && (!item.setor || (!item.setor.includes('Indústria') && !item.setor.includes('Bens') && !item.setor.includes('Farmacêutica') && !item.setor.includes('Automobilística')))) return false;
          if (seg === 'CONSULT' && (!item.setor || (!item.setor.includes('Consultoria') && !item.setor.includes('Auditoria')))) return false;
          if (seg === 'LEGAL' && (!item.setor || (!item.setor.includes('Jurídico') && !item.setor.includes('Advocacia')))) return false;
          if (seg === 'SHOPPING' && (!item.setor || (!item.setor.includes('Shopping') && !item.setor.includes('Varejo')))) return false;
        }

        if (vuln !== 'ALL') {
          if (vuln === 'Alta' && (!item.mob_vuln || !item.mob_vuln.toLowerCase().includes('alta'))) return false;
          if (vuln === 'Média' && (!item.mob_vuln || !item.mob_vuln.toLowerCase().includes('média'))) return false;
        }

        if (demand !== 'ALL') {
          if (demand === 'ACES' && (!item.acessivel || !item.acessivel.toLowerCase().includes('alta'))) return false;
          if (demand === 'VOUCHERS' && (!item.vouchers || !item.vouchers.toLowerCase().includes('alta'))) return false;
          if (demand === 'ESG' && (!item.esg || !item.esg.toLowerCase().includes('alta'))) return false;
          if (demand === 'FAIXA' && (!item.faixa_onibus || !item.faixa_onibus.toLowerCase().includes('alta'))) {
            if (item.isHosp) return false;
          }
        }

        if (dist !== 'ALL') {
          const maxDist = parseFloat(dist);
          if (item.dist > maxDist) return false;
        }

        return true;
      });

      currentB2BPage = 1;
      renderB2BTable();
      renderB2BPagination();
    }

    function renderB2BTable() {
      const tbody = document.getElementById('b2b-table-body');
      if (!tbody) return;

      const resultsCount = document.getElementById('b2b-results-count');
      if (resultsCount) {
        resultsCount.innerText = `Exibindo ${filteredB2B.length} clientes corporativos`;
      }

      const startIdx = (currentB2BPage - 1) * b2bPageSize;
      const endIdx = Math.min(startIdx + b2bPageSize, filteredB2B.length);
      const pageData = filteredB2B.slice(startIdx, endIdx);

      if (pageData.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-10 text-slate-500">
              <i class="ph-bold ph-buildings text-3xl mb-2 block text-slate-300"></i>
              Nenhum cliente corporativo encontrado com os filtros selecionados.
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      pageData.forEach(item => {
        const isHosp = item.isHosp;
        const icon = isHosp ? '🏥' : '🏢';
        const tierBadge = item.tier.includes('Tier A') ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-amber-100 text-amber-800 border-amber-200';
        const vulnBadge = item.mob_vuln === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200';

        html += `
          <tr class="hover:bg-purple-50/40 transition cursor-pointer group" onclick="openB2BModal('${item.id}')">
            <td class="py-2.5 px-3">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${isHosp ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}">
                  ${icon}
                </div>
                <div>
                  <div class="font-bold text-slate-900 group-hover:text-purple-700 transition flex items-center gap-1.5">
                    <span>${item.nome}</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${tierBadge}">${item.tier.split(' ')[0]} ${item.tier.split(' ')[1]}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">${item.id} &bull; Score: <b class="text-amber-600">${item.score} pts</b></div>
                </div>
              </div>
            </td>

            <td class="py-2.5 px-3">
              <div class="font-semibold text-slate-800">${item.setor}</div>
              <div class="text-[10px] text-slate-500">${item.bairro} &bull; ${item.colab ? item.colab + ' presencial' : (item.grupo || 'Saúde')}</div>
            </td>

            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                ${item.dist} km
              </span>
              <span class="block text-[9px] text-slate-400 mt-0.5">~${item.tempo} min</span>
            </td>

            <td class="py-2.5 px-3 max-w-[220px]">
              <div class="flex items-center gap-1">
                <span class="text-[10px] text-slate-500 font-medium">Fornecedor:</span>
                <span class="font-bold text-slate-800 text-[11px]">${item.mob_forn}</span>
              </div>
              <div class="text-[10px] text-rose-700 font-medium line-clamp-1 italic mt-0.5" title="${item.mob_dor}">
                "${item.mob_dor}"
              </div>
            </td>

            <td class="py-2.5 px-3 text-center">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${vulnBadge}">
                ${item.mob_vuln}
              </span>
            </td>

            <td class="py-2.5 px-3">
              <div class="font-black text-emerald-600 text-xs">${item.mob_rec.split('(')[0]}</div>
              <div class="text-[9px] text-slate-500">${item.corridas.split(' ')[0]} corr/mês</div>
            </td>

            <td class="py-2.5 px-3 max-w-[200px]">
              <div class="font-semibold text-slate-800 line-clamp-1" title="${item.dec_cargos}">
                ${item.dec_cargos.split('|')[0] || item.dec_area}
              </div>
              <div class="text-[10px] font-mono text-emerald-700 line-clamp-1" title="${item.email_dec || item.email_inst}">
                ${item.email_dec ? item.email_dec.split(';')[0] : (item.email_dom ? `@${item.email_dom}` : '—')}
              </div>
            </td>

            <td class="py-2.5 px-3 text-center whitespace-nowrap" onclick="event.stopPropagation()">
              <div class="flex items-center justify-center gap-1">
                <button onclick="openB2BModal('${item.id}')" title="Abrir Dossiê 360°" class="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs shadow-sm transition">
                  <i class="ph-bold ph-files"></i>
                </button>
                ${item.dec_linkedin ? `
                  <a href="${item.dec_linkedin}" target="_blank" title="Buscar no LinkedIn Web" class="p-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg text-xs shadow-sm transition">
                    <i class="ph-bold ph-linkedin-logo"></i>
                  </a>
                ` : ''}
                ${item.dec_google ? `
                  <a href="${item.dec_google}" target="_blank" title="Ver Perfis do LinkedIn no Google (Sem Login)" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs shadow-sm transition">
                    <i class="ph-bold ph-google-logo"></i>
                  </a>
                ` : ''}
                <button onclick="locateB2BOnMap(${item.lat}, ${item.lon}, '${item.id}')" title="Localizar no Mapa GIS" class="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs shadow-sm transition">
                  <i class="ph-bold ph-map-pin"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    }

    function renderB2BPagination() {
      const container = document.getElementById('b2b-pagination');
      if (!container) return;

      const totalItems = filteredB2B.length;
      const totalPages = Math.ceil(totalItems / b2bPageSize) || 1;
      const startIdx = totalItems > 0 ? (currentB2BPage - 1) * b2bPageSize + 1 : 0;
      const endIdx = Math.min(currentB2BPage * b2bPageSize, totalItems);

      let html = `
        <div class="text-slate-500 text-[11px]">
          Mostrando <b>${startIdx}</b> a <b>${endIdx}</b> de <b>${totalItems}</b> clientes corporativos
        </div>
        <div class="flex items-center space-x-1">
          <button onclick="changeB2BPage(1)" ${currentB2BPage === 1 ? 'disabled' : ''} class="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="ph-bold ph-caret-double-left"></i>
          </button>
          <button onclick="changeB2BPage(${currentB2BPage - 1})" ${currentB2BPage === 1 ? 'disabled' : ''} class="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="ph-bold ph-caret-left"></i>
          </button>
      `;

      let startP = Math.max(1, currentB2BPage - 2);
      let endP = Math.min(totalPages, currentB2BPage + 2);
      for (let p = startP; p <= endP; p++) {
        if (p === currentB2BPage) {
          html += `<button class="px-2.5 py-1 rounded bg-purple-600 text-white font-bold">${p}</button>`;
        } else {
          html += `<button onclick="changeB2BPage(${p})" class="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100">${p}</button>`;
        }
      }

      html += `
          <button onclick="changeB2BPage(${currentB2BPage + 1})" ${currentB2BPage === totalPages ? 'disabled' : ''} class="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="ph-bold ph-caret-right"></i>
          </button>
          <button onclick="changeB2BPage(${totalPages})" ${currentB2BPage === totalPages ? 'disabled' : ''} class="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="ph-bold ph-caret-double-right"></i>
          </button>
        </div>
      `;

      container.innerHTML = html;
    }

    function changeB2BPage(p) {
      const totalPages = Math.ceil(filteredB2B.length / b2bPageSize) || 1;
      if (p < 1 || p > totalPages) return;
      currentB2BPage = p;
      renderB2BTable();
      renderB2BPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function changeB2BPageSize() {
      const select = document.getElementById('b2b-page-size');
      if (select) {
        b2bPageSize = parseInt(select.value, 10);
        currentB2BPage = 1;
        renderB2BTable();
        renderB2BPagination();
      }
    }

    // =========================================================================
    // MODAL / DOSSIÊ 360°
    // =========================================================================
    function openB2BModal(id) {
      const item = ALL_B2B_CLIENTS.find(x => x.id === id);
      if (!item) return;

      currentB2BModalId = item.id;

      document.getElementById('b2b-modal-avatar').innerText = item.isHosp ? '🏥' : '🏢';
      document.getElementById('b2b-modal-name').innerText = item.nome;
      document.getElementById('b2b-modal-tier-badge').innerText = item.tier;
      document.getElementById('b2b-modal-score-badge').innerText = `Score: ${item.score} pts`;
      
      const vulnBadge = document.getElementById('b2b-modal-vuln-badge');
      vulnBadge.innerText = `Vuln: ${item.mob_vuln}`;
      if (item.mob_vuln === 'Alta') {
        vulnBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30";
      } else {
        vulnBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30";
      }

      const subTitle = item.isHosp 
        ? `${item.tipo} &bull; ${item.grupo || 'Rede de Saúde'} &bull; ${item.bairro}`
        : `${item.setor} &bull; ${item.colab} presencial (${item.edificio || 'Sede'}) &bull; ${item.bairro}`;
      document.getElementById('b2b-modal-subtitle').innerHTML = subTitle;

      // Card 1
      document.getElementById('b2b-modal-forn').innerText = item.mob_forn || '—';
      document.getElementById('b2b-modal-tipo-mob').innerText = item.mob_tipo || '—';
      document.getElementById('b2b-modal-dor').innerText = `"${item.mob_dor || 'Gargalo em validação'}"`;
      document.getElementById('b2b-modal-corridas').innerText = item.corridas || '—';
      document.getElementById('b2b-modal-rec').innerText = item.mob_rec || '—';

      // Card 2
      document.getElementById('b2b-modal-end').innerText = item.end || '—';
      document.getElementById('b2b-modal-dist').innerText = `${item.dist} km da Sede Chame Táxi`;
      document.getElementById('b2b-modal-tempo').innerText = `~${item.tempo} min de deslocamento`;
      document.getElementById('b2b-modal-ponto').innerText = item.ponto || 'Ponto Livre da Região';

      // Card 3
      document.getElementById('b2b-modal-dec-area').innerText = item.dec_area || 'Compras Indiretas & Suprimentos';
      document.getElementById('b2b-modal-dec-cargos').innerText = item.dec_cargos || 'Diretor de Suprimentos / Head Facilities';
      document.getElementById('b2b-modal-dec-lideres').innerText = item.dec_lideres || 'Central de Compras Institucional';
      
      const emailPadrao = item.email_padrao || (item.email_dom ? `{primeiro}.{sobrenome}@${item.email_dom}` : '—');
      document.getElementById('b2b-modal-email-padrao').innerText = emailPadrao;
      
      const emailDec = item.email_dec || item.email_inst || (item.email_dom ? `compras@${item.email_dom}` : '—');
      document.getElementById('b2b-modal-email-dec').innerText = emailDec;

      // Card 4
      const lnkLinkedin = document.getElementById('b2b-modal-link-linkedin');
      if (item.dec_linkedin) {
        lnkLinkedin.href = item.dec_linkedin;
        lnkLinkedin.classList.remove('hidden');
      } else {
        lnkLinkedin.classList.add('hidden');
      }

      const lnkGoogle = document.getElementById('b2b-modal-link-google');
      if (item.dec_google) {
        lnkGoogle.href = item.dec_google;
        lnkGoogle.classList.remove('hidden');
      } else {
        lnkGoogle.classList.add('hidden');
      }

      const lnkHunter = document.getElementById('b2b-modal-link-hunter');
      if (item.link_hunter) {
        lnkHunter.href = item.link_hunter;
        lnkHunter.classList.remove('hidden');
      } else if (item.email_dom) {
        lnkHunter.href = `https://hunter.io/search/${item.email_dom}`;
        lnkHunter.classList.remove('hidden');
      } else {
        lnkHunter.classList.add('hidden');
      }

      const lnkDorkEmail = document.getElementById('b2b-modal-link-dork-email');
      if (item.link_google_email) {
        lnkDorkEmail.href = item.link_google_email;
        lnkDorkEmail.classList.remove('hidden');
      } else {
        lnkDorkEmail.classList.add('hidden');
      }

      const lnkRoute = document.getElementById('b2b-modal-link-maps');
      if (lnkRoute) {
        lnkRoute.href = `https://www.google.com/maps/dir/?api=1&origin=${CHAME_LAT},${CHAME_LON}&destination=${item.lat},${item.lon}`;
      }

      const lnkTel = document.getElementById('b2b-modal-link-tel');
      const telTxt = document.getElementById('b2b-modal-tel-txt');
      if (item.tel && item.tel !== '—') {
        const cleanTel = item.tel.replace(/\\D/g, '');
        lnkTel.href = `tel:${cleanTel}`;
        telTxt.innerText = `Ligar (${item.tel})`;
        lnkTel.classList.remove('hidden');
      } else {
        lnkTel.classList.add('hidden');
      }

      // Card 5
      const scriptText = item.dec_script || item.pitch || 'Prezado(a), identificamos oportunidade de otimização no contrato corporativo de mobilidade de sua instituição...';
      document.getElementById('b2b-modal-script-text').innerText = scriptText;

      // Card 6 CRM
      const savedCRM = localStorage.getItem(`corp_crm_${item.id}`);
      if (savedCRM) {
        try {
          const parsed = JSON.parse(savedCRM);
          document.getElementById('b2b-crm-status').value = parsed.status || '1 - Novo Prospect';
          document.getElementById('b2b-crm-notes').value = parsed.notes || '';
        } catch (e) {
          document.getElementById('b2b-crm-status').value = '1 - Novo Prospect';
          document.getElementById('b2b-crm-notes').value = '';
        }
      } else {
        document.getElementById('b2b-crm-status').value = '1 - Novo Prospect';
        document.getElementById('b2b-crm-notes').value = '';
      }
      document.getElementById('b2b-crm-saved-indicator').classList.add('hidden');

      // Footer
      document.getElementById('b2b-modal-footer-id').innerText = `ID Prospect: ${item.id} &bull; ${item.tipo_entidade}`;

      document.getElementById('b2b-modal').classList.remove('hidden');
    }

    function closeB2BModal() {
      document.getElementById('b2b-modal').classList.add('hidden');
      currentB2BModalId = null;
    }

    function copyB2BScript() {
      const scriptElem = document.getElementById('b2b-modal-script-text');
      if (!scriptElem) return;
      navigator.clipboard.writeText(scriptElem.innerText).then(() => {
        const btnTxt = document.getElementById('b2b-copy-script-btn-txt');
        if (btnTxt) {
          const orig = btnTxt.innerText;
          btnTxt.innerText = "✓ Mensagem Copiada!";
          setTimeout(() => { btnTxt.innerText = orig; }, 2000);
        }
      }).catch(err => {
        alert("Não foi possível copiar automaticamente: selecione o texto e copie.");
      });
    }

    function saveB2BCRM() {
      if (!currentB2BModalId) return;
      const status = document.getElementById('b2b-crm-status').value;
      const notes = document.getElementById('b2b-crm-notes').value;
      
      const payload = {
        id: currentB2BModalId,
        status: status,
        notes: notes,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`corp_crm_${currentB2BModalId}`, JSON.stringify(payload));
      
      const indicator = document.getElementById('b2b-crm-saved-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
        setTimeout(() => { indicator.classList.add('hidden'); }, 2500);
      }
    }

    function locateCurrentB2BOnMap() {
      if (!currentB2BModalId) return;
      const item = ALL_B2B_CLIENTS.find(x => x.id === currentB2BModalId);
      if (!item) return;
      closeB2BModal();
      locateB2BOnMap(item.lat, item.lon, item.id);
    }

    function locateB2BOnMap(lat, lon, id) {
      switchB2BTab('map');
      setTimeout(() => {
        if (!b2bMapInstance) return;
        b2bMapInstance.setView([lat, lon], 16);
        
        let found = false;
        if (hospLayerGroup) {
          hospLayerGroup.eachLayer(layer => {
            if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lon) < 0.0001) {
              layer.openPopup();
              found = true;
            }
          });
        }
        
        if (!found && empLayerGroup) {
          empLayerGroup.eachLayer(layer => {
            if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lon) < 0.0001) {
              layer.openPopup();
            }
          });
        }
      }, 300);
    }

    // =========================================================================
    // MAPA GIS LEAFLET B2B
    // =========================================================================
    function initB2BMap() {
      if (b2bMapInstance) {
        b2bMapInstance.invalidateSize();
        return;
      }

      b2bMapInstance = L.map('b2b-leaflet-map').setView([CHAME_LAT, CHAME_LON], 13);
      switchB2BTile('esri_street');

      // Sede Chame Táxi
      const sedeIcon = L.divIcon({
        className: 'custom-sede-icon',
        html: `<div style="background-color:#d97706; color:#000; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:2px solid #000; font-weight:bold; font-size:18px; box-shadow:0 4px 14px rgba(0,0,0,0.35);">⭐</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const sedeMarker = L.marker([CHAME_LAT, CHAME_LON], { icon: sedeIcon }).addTo(b2bMapInstance);
      sedeMarker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; line-height:1.4;">
          <b style="font-size:14px; color:#d97706;">COOPERATIVA CHAME TÁXI</b><br>
          <b>Sede Operacional & Central de Rádio:</b> Av. Vital Brasil, Butantã, São Paulo - SP<br>
          <span style="color:#059669; font-weight:bold;">Pólo Estratégico da Zona Oeste</span>
        </div>
      `);

      L.circle([CHAME_LAT, CHAME_LON], { radius: 3000, color: '#d97706', fillOpacity: 0.04, weight: 1.5, dashArray: '4, 4' }).addTo(b2bMapInstance);
      L.circle([CHAME_LAT, CHAME_LON], { radius: 5000, color: '#9333ea', fillOpacity: 0.02, weight: 1.5, dashArray: '4, 4' }).addTo(b2bMapInstance);

      hospLayerGroup = L.layerGroup().addTo(b2bMapInstance);
      empLayerGroup = L.layerGroup().addTo(b2bMapInstance);

      renderHospMarkersMap(HOSPITAIS_DATA);
      renderEmpMarkersMap(EMPRESAS_DATA);

      setTimeout(() => { b2bMapInstance.invalidateSize(); }, 250);
    }

    function switchB2BTile(providerKey) {
      if (!b2bMapInstance) return;
      const prov = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS['esri_street'];
      if (b2bTileLayer) b2bMapInstance.removeLayer(b2bTileLayer);
      b2bTileLayer = L.tileLayer(prov.url, { maxZoom: 19, attribution: prov.attr }).addTo(b2bMapInstance);
    }

    function toggleLayer(type) {
      if (type === 'hosp') {
        isHospVisible = !isHospVisible;
        const btn = document.getElementById('btn-toggle-hosp');
        if (isHospVisible) {
          hospLayerGroup.addTo(b2bMapInstance);
          btn.className = "px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1";
          btn.innerHTML = `<span>🏥 Hospitais (${HOSPITAIS_DATA.length})</span>`;
        } else {
          b2bMapInstance.removeLayer(hospLayerGroup);
          btn.className = "px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1";
          btn.innerHTML = `<span>🏥 Hospitais (Oculto)</span>`;
        }
      } else {
        isEmpVisible = !isEmpVisible;
        const btn = document.getElementById('btn-toggle-emp');
        if (isEmpVisible) {
          empLayerGroup.addTo(b2bMapInstance);
          btn.className = "px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1";
          btn.innerHTML = `<span>🏢 Empresas (${EMPRESAS_DATA.length})</span>`;
        } else {
          b2bMapInstance.removeLayer(empLayerGroup);
          btn.className = "px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1";
          btn.innerHTML = `<span>🏢 Empresas (Oculto)</span>`;
        }
      }
    }

    function renderHospMarkersMap(list) {
      if (!hospLayerGroup) return;
      hospLayerGroup.clearLayers();

      list.forEach(h => {
        const isTierA = h.tier.includes('Tier A');
        const isTierB = h.tier.includes('Tier B');
        const bgColor = isTierA ? '#e11d48' : (isTierB ? '#d97706' : '#0284c7');
        const sz = isTierA ? 26 : (isTierB ? 22 : 18);
        const iconSize = isTierA ? 12 : (isTierB ? 11 : 9);

        const icon = L.divIcon({
          className: 'custom-hosp-marker',
          html: `<div style="background:${bgColor}; color:#fff; width:${sz}px; height:${sz}px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; font-size:${iconSize}px; box-shadow:0 2px 6px rgba(0,0,0,0.35); font-weight:bold; cursor:pointer;">🏥</div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2]
        });

        const marker = L.marker([h.lat, h.lon], { icon: icon }).addTo(hospLayerGroup);
        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:11px; line-height:1.45; max-width:320px;">
            <b style="font-size:13px; color:#0f172a; display:block;">${h.nome}</b>
            <span style="font-size:10px; color:#64748b;">${h.grupo || 'Saúde'} &bull; ${h.tipo}</span><br>
            <div style="margin-top:4px; padding:4px 6px; background:#fef2f2; border-radius:4px; border:1px solid #fee2e2;">
              <b>Fornecedor:</b> ${h.mob_forn}<br>
              <b>Gargalo:</b> <span style="color:#b91c1c; font-style:italic;">"${h.mob_dor}"</span><br>
              <b>Receita Potencial:</b> <b style="color:#059669;">${h.mob_rec}</b>
            </div>
            <div style="margin-top:4px; font-size:10px;">
              <b>Decisor:</b> ${h.dec_cargos}<br>
              <b>E-mail:</b> <span style="font-family:monospace; color:#047857; font-weight:bold;">${h.email_dec || h.email_inst}</span>
            </div>
            <div style="margin-top:6px; display:flex; gap:4px;">
              <button onclick="openB2BModal('${h.id}')" style="background:#9333ea; color:#fff; font-weight:bold; padding:4px 8px; border-radius:4px; border:none; cursor:pointer; font-size:10px;">Abrir Dossiê ↗</button>
              ${h.dec_linkedin ? `<a href="${h.dec_linkedin}" target="_blank" style="background:#0a66c2; color:#fff; font-weight:bold; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:10px;">LinkedIn ↗</a>` : ''}
            </div>
          </div>
        `);
      });
    }

    function renderEmpMarkersMap(list) {
      if (!empLayerGroup) return;
      empLayerGroup.clearLayers();

      list.forEach(e => {
        const isTierA = e.tier.includes('Tier A');
        const isTierB = e.tier.includes('Tier B');
        const bgColor = isTierA ? '#2563eb' : (isTierB ? '#4f46e5' : '#7c3aed');
        const sz = isTierA ? 26 : (isTierB ? 22 : 18);
        const iconSize = isTierA ? 12 : (isTierB ? 11 : 9);

        const icon = L.divIcon({
          className: 'custom-emp-marker',
          html: `<div style="background:${bgColor}; color:#fff; width:${sz}px; height:${sz}px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; font-size:${iconSize}px; box-shadow:0 2px 6px rgba(0,0,0,0.35); font-weight:bold; cursor:pointer;">🏢</div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2]
        });

        const marker = L.marker([e.lat, e.lon], { icon: icon }).addTo(empLayerGroup);
        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:11px; line-height:1.45; max-width:320px;">
            <b style="font-size:13px; color:#0f172a; display:block;">${e.nome}</b>
            <span style="font-size:10px; color:#64748b;">${e.setor} &bull; ${e.colab} presencial</span><br>
            <div style="margin-top:4px; padding:4px 6px; background:#eff6ff; border-radius:4px; border:1px solid #dbeafe;">
              <b>Fornecedor:</b> ${e.mob_forn}<br>
              <b>Gargalo:</b> <span style="color:#b91c1c; font-style:italic;">"${e.mob_dor}"</span><br>
              <b>Receita Potencial:</b> <b style="color:#059669;">${e.mob_rec}</b>
            </div>
            <div style="margin-top:4px; font-size:10px;">
              <b>Decisor:</b> ${e.dec_cargos}<br>
              <b>E-mail:</b> <span style="font-family:monospace; color:#047857; font-weight:bold;">${e.email_dec || e.email_inst}</span>
            </div>
            <div style="margin-top:6px; display:flex; gap:4px;">
              <button onclick="openB2BModal('${e.id}')" style="background:#9333ea; color:#fff; font-weight:bold; padding:4px 8px; border-radius:4px; border:none; cursor:pointer; font-size:10px;">Abrir Dossiê ↗</button>
              ${e.dec_linkedin ? `<a href="${e.dec_linkedin}" target="_blank" style="background:#0a66c2; color:#fff; font-weight:bold; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:10px;">LinkedIn ↗</a>` : ''}
            </div>
          </div>
        `);
      });
    }

    function exportB2BCSV() {
      if (!filteredB2B || filteredB2B.length === 0) {
        alert("Nenhum dado filtrado para exportar.");
        return;
      }

      let csv = "\\uFEFF";
      const headers = [
        "id", "nome", "tipo_entidade", "setor", "tier", "score", "dist", "tempo",
        "end", "bairro", "tel", "mob_forn", "mob_tipo", "mob_dor", "mob_vuln",
        "mob_rec", "corridas", "dec_area", "dec_cargos", "dec_lideres",
        "email_dom", "email_padrao", "email_dec", "dec_linkedin"
      ];
      csv += headers.join(";") + "\\n";

      filteredB2B.forEach(r => {
        const row = headers.map(h => {
          let val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        });
        csv += row.join(";") + "\\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes_corporativos_b2b_export_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>"""

    final_html = html_template.replace('__ALL_CLIENTS_PLACEHOLDER__', json_clients)
    final_html = final_html.replace('__HOSPITAIS_PLACEHOLDER__', json_hosp)
    final_html = final_html.replace('__EMPRESAS_PLACEHOLDER__', json_emp)

    out_root = 'dashboard_clientes_corporativos_b2b.html'
    out_folder = os.path.join('Novos Alvarás 2026', 'dashboard_clientes_corporativos_b2b.html')

    print(f"Escrevendo arquivo raiz: {out_root}...")
    with open(out_root, 'w', encoding='utf-8') as f:
        f.write(final_html)

    print(f"Escrevendo arquivo pasta: {out_folder}...")
    with open(out_folder, 'w', encoding='utf-8') as f:
        f.write(final_html)

    sz_kb = os.path.getsize(out_root) / 1024
    print("=" * 80)
    print(f"DASHBOARD CORPORATIVO B2B GERADO COM SUCESSO! ({sz_kb:.1f} KB)")
    print(f"-> {out_root}")
    print(f"-> {out_folder}")
    print("=" * 80)

if __name__ == '__main__':
    generate_corporate_dashboard()
