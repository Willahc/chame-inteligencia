# Mapeamento — pontos de táxi do Município de São Paulo

Inventário, aquisição preservada, auditoria estrutural, matching determinístico e análise espacial de dados públicos sobre pontos de táxi no Município de São Paulo, para o projeto de inteligência de dados da cooperativa Chame Táxi. O **Gate 1** permanece registrado como `PARTIAL` no escopo histórico original; o **Gate 1B** e os Gates 2–6 foram concluídos, e o conjunto **Gates 1B, 2, 3, 4, 5 e 6** forma o pipeline público e auditável concluído. A camada posterior ao Gate 6 acrescenta a Planilha Mestre, ranking operacional, monitoramento do Diário Oficial, seleção de polos de formação, camada B2B corporativa e dashboards HTML locais. Não há API, backend, banco de dados nem decisão automatizada; o `Score_Chame_Taxi` (0–100) é um **score de priorização comercial**, não um score de decisão.

Estado dos gates: **PASS** em 23/09/2026 (America/Sao_Paulo). Os artefatos derivados (mapa, dashboards e versão pública da Planilha Mestre) foram regerados em 29/09/2026 e são artefatos de análise/prospecção, não uma plataforma comercial homologada.

Fontes consultadas: GeoSampa WFS/WMS e catálogo de metadados; DTP/Secretaria Executiva de Mobilidade e Trânsito; legislação municipal; pesquisas no Portal de Dados Abertos/InfoCidade; dados abertos OSM (Geofabrik/BBBike/Overpass); dados abertos do CNPJ/RFB; SGTP e CMTT no CKAN da SMT; frota ativa do Detran-SP; sinistros do Infosiga (Detran-SP). Detalhes estão em `docs/fontes.md`, em `docs/gate*` e no relatório executivo `docs/relatorio_executivo_consolidacao_dtp_osm.md`.

O pipeline espacial dos Gates 1–6 não tratou dados pessoais de motoristas. A camada posterior ao Gate 6, porém, consolidou CPF, telefone, e-mail, bairro/CEP residencial, gênero e faixa etária de titulares a partir do Diário Oficial, de bases da Receita Federal e de listas operacionais — e o repositório passou a adotar, em 29/09/2026, uma política de **duas camadas** (ver `scripts/privacy.py`): a camada **completa**, com dados pessoais, permanece apenas na máquina local e é ignorada pelo Git; a camada **pública**, minimizada (sufixo `_publico`), é a única versionada. Nenhum artefato versionado contém CPF, telefone ou e-mail de pessoa natural — telefone e e-mail **institucionais** (ponto, CFC, empresa) seguem permitidos. A verificação é `python scripts/privacy.py check` (deve retornar 0 violações), a regeneração da base pública é `python scripts/privacy.py public-master` e a minimização de um artefato é `python scripts/privacy.py minimize <arquivo>` (a cópia completa vai para `data/private/`). Telefones de CFC e de ponto são tratados como dados institucionais/publicados, não como autorização de contato.

Estrutura:

```
data/raw/            originais imutáveis (GeoSampa, DTP, Diário Oficial e metadados)
data/external/       fontes externas abertas preservadas (OSM Geofabrik/BBBike)
data/processed/      camada geoespacial, ranking, polos e dashboards dos Gates 5–6
data/private/        cópias completas com dado pessoal — fora do versionamento
docs/                relatório executivo, inventários por gate, limitações e dicionários
scripts/             pipeline, orquestrador (run_pipeline.py) e política de privacidade (privacy.py)
logs/                cabeçalhos HTTP, manifestos e logs de matching/extração
Novos Alvarás 2026/  fontes e produtos operacionais de 2026 (alvarás, CRM, roteiros, dashboards locais)
requirements.txt     dependências fixadas
```

## Como executar

```bash
python -m pip install -r requirements.txt
python scripts/run_pipeline.py                          # lista os estágios e seus grupos
python scripts/run_pipeline.py --only match,metricas,privacidade
python scripts/run_pipeline.py --all                    # tudo, exceto os estágios de rede pesada
python scripts/run_pipeline.py --all --include-manual   # inclui RFB, DOC, Nominatim e Overpass
python scripts/privacy.py check                         # deve terminar com 0 violações
python scripts/test_doc_scraper.py                      # testes unitários
```

Cada estágio declara as entradas de que precisa; se faltarem, é pulado com aviso (`--strict` transforma pulo em falha) e a execução para na primeira falha (`--keep-going` para continuar). Consulte `docs/inventario.md` para a auditoria, limitações e próxima ação recomendada.

## Gate 1B — anexos regionais de 2024

Estado: **PASS** em 23/09/2026. Os cinco anexos regionais de 2024 (Centro, Leste, Norte, Oeste e Sul) estão preservados em `data/raw/dtp/`, foram verificados estruturalmente e adicionados ao manifesto. A extração textual registrou 1.187 pontos distintos e 3.634 vagas de saldo, coerentes com o edital. Durante o Gate 1B não houve OCR, tratamento, geocodificação ou escrita em `data/processed/`. A auditoria permanece temporalmente separada: 2018 é histórico; 2024 é o edital/anexos auditado.

## Gate 2 — frota, condutores e estrutura do mercado

Estado: **PASS** em 23/09/2026. A série Infocidade 1983–2025 foi preservada como PDF e auditada (2025: 37.643 táxis). A página DTP de 18/05/2026 foi preservada como **snapshot manual em PDF de página oficial**, depois de o endpoint retornar HTTP 403 à automação; ela registra 37.586 táxis e 63.319 taxistas com cadastro ativo no DTP. O snapshot não é tratado como PDF original do DTP. Não há inferência de atividade profissional nem relação consolidada de empresas frotistas. Consulte `docs/gate2/` e `logs/gate2/`; o Gate 1 continua PASS e seus arquivos não foram alterados.

## Gate 3 — canais institucionais

Estado: **PASS** em 23/09/2026. O PDF original da relação oficial de CFCs foi manualmente preservado e auditado exclusivamente na seção `CFC - TÁXI`: 27 entradas, com endereço, bairro, CEP e telefone publicados; não há prova de vigência individual em 2026. Escolar e Motofrete foram mantidos como seções separadas. A posterior `data/processed/polos_formacao_taxistas_cfc_dtp.json` é uma seleção operacional de 24 CFCs, ampliada por uma sede do DTP e uma pista do IPEM; não substitui a lista oficial nem comprova credenciamento vigente. Anexos de despachantes e OIAs continuam excluídos por minimização de dados pessoais. Consulte `docs/gate3/` e `logs/gate3/`; os Gates 1 e 2 permanecem PASS e inalterados.

## Gate 4 — referências geográficas brutas

Estado: **PASS** em 23/09/2026. Foram preservadas camadas oficiais GeoSampa em EPSG:31983: 1 limite municipal, 96 distritos e 32 subprefeituras, com seus DescribeFeatureType e hashes. A extração OSM bruta de feições de táxi foi concluída a partir do PBF Geofabrik Sudeste com parser próprio (`scripts/extract_osm_taxi.py`), recortado pelo polígono oficial do município: **592 nodes, 6 ways e 3 relations** em `data/external/osm/taxi/osm_taxi_saopaulo_geofabrik_20260923T1211_raw.osm`, sem dados de contribuidores. Durante o Gate 4 não houve geocodificação, cruzamento, mapa, reprojeção, tratamento ou escrita em `data/processed/`; esses artefatos foram gerados em etapas posteriores. Consulte `docs/gate4/` e `logs/gate4/`; os Gates 1, 2 e 3 permanecem PASS.

Como rotas complementares, a landing BBBike foi preservada, mas exige e-mail para gerar extrato municipal; nenhum e-mail foi coletado. Um PBF bruto Geofabrik do Sudeste foi preservado com hash e tamanho validado; um segundo PBF interrompido foi preservado somente como evidência técnica. Foi preparada, sem protocolo, uma minuta de solicitação oficial de camada georreferenciada ao DTP/SMT. As consultas Overpass permaneceram indisponíveis (504) e deixaram de ser a fonte primária.

## Gate 5 — matching e consolidação DTP ↔ OSM

Estado: **PASS** em 23/09/2026. Implementação do pipeline de matching determinístico (`scripts/match_dtp_osm.py`) cruzando os 1.187 pontos do Edital DTP 2024 com os 593 elementos de táxi do OSM (592 nós + 1 centróide de cobertura).
Resultados consolidados em `data/processed/`:
- **261 pontos pareados** (22,0% do Edital DTP; 44,0% do OSM municipal), sendo 196 na Camada 1 (ID oficial) e 65 na Camada 2 (Fuzzy Address com blocking por subprefeitura). 195 com confiança ALTA e 66 com confiança MÉDIA.
- **926 pontos DTP sem georreferenciamento no OSM** (`data/processed/dtp_pontos_sem_osm.csv`).
- **332 feições OSM sem vínculo com o Edital 2024** (`data/processed/osm_pontos_sem_dtp.csv`).
- Auditoria de anomalias preservada em `data/processed/log_discrepancias_matching.jsonl` (**161 registros**): 110 divergências de capacidade/atributo DTP ↔ OSM em pontos pareados, 36 endereços com múltiplos candidatos DTP (ambiguidade 1:N, mantidos sem atribuição forçada), 8 feições OSM descartadas (3 relations fora do município — Votuporanga, Araraquara e Praia Grande; 4 trechos viários; 1 moto-táxi), 5 conflitos de ID numérico bloqueados por divergência de macrorregião, 1 nó de motorista individual e 1 registro-resumo da execução.
- Consulte `docs/gate5/` e `logs/gate5/manifesto_gate5.csv`; os Gates 1, 1B, 2, 3 e 4 permanecem PASS e inalterados.

## Gate 6 — análise espacial, indicadores e relatório executivo

Estado: **PASS** em 23/09/2026. Conclusão do ciclo analítico do projeto via `scripts/generate_analysis_metrics.py` e elaboração do relatório executivo final em `docs/relatorio_executivo_consolidacao_dtp_osm.md`.
Síntese dos achados:
- **Taxa de Cobertura Espacial**: 22,0% global (Centro: 29,6%, Oeste: 28,8%, Norte: 22,1%, Leste: 14,8%, Sul: 11,1%).
- **Vazios Cartográficos**: 14 das 32 subprefeituras (todas periféricas, ex: Aricanduva, Penha, Campo Limpo, Capela do Socorro, Itaquera) e 37 dos 96 distritos municipais possuem cobertura zero no OSM.
- **Balanço de Vagas (Spot Balance)**: Nos 112 pontos com capacidade física mapeada em campo no OSM, o DTP declara 1.760 vagas regulamentares, mas o viário comporta apenas 488 baias físicas imediatas (em 97,3% dos pontos, a capacidade teórica do edital supera a capacidade visível no solo).
- **Encerramento do Ciclo**: A base consolidada de 261 pontos em `data/processed/`, as 926 lacunas DTP, as métricas em `docs/metricas_analise_gate6.json` e as recomendações institucionais encerram formalmente a cadeia de gates (1 a 6).

## Camada posterior ao Gate 6 — Planilha Mestre, Cockpit e camada B2B

- `scripts/build_master_spreadsheet.py` consolida a **Planilha Mestre Unificada de Taxistas SP 2026** (`planilha_mestre_taxistas_sp_2026.csv` e `.xlsx`, com 15 abas):
  - **16.863 registros únicos** integrados de 12 bases obrigatórias (alvarás 2026 consolidados, layout de contemplados, ranking de alvos, MEIs da Zona Oeste/Butantã, atos do Diário Oficial DOC 2026, catálogo de pontos, pontos consolidados DTP ↔ OSM, inscritos e resultados dos sorteios de pontos, polos CFC/DTP/IPEM, plano de prospecção territorial e feições OSM sem DTP), mais a base CNPJ da Receita Federal e o cache do DOC quando presentes.
  - Normalização canônica de CPF, CNPJ, Alvará, Condutax, pontuação de captação e geolocalização, além de `Score_Chame_Taxi` (0–100) e `Tier_Prioridade_Comercial`. É um **score de priorização comercial** — não há decisão automatizada nem atribuição automática de vaga.
  - Saída versionada: `planilha_mestre_taxistas_sp_2026_publico.csv` (86 colunas, sem dado pessoal), gerada por `python scripts/privacy.py public-master`. A base completa fica local e no `.gitignore`.
- `scripts/generate_interactive_map.py` gera o mapa Folium e `scripts/build_clean_master_map.py` o finaliza (`mapa_interativo_pontos_taxi_sp.html`, artefato local não versionado):
  - **100% Esri GIS (sem exigência de API Key)**: camada base **Esri World Street Map** (substituindo OpenStreetMap/CartoDB para eliminar erros 403 e exigência de chave comercial em origens locais `file:///`), com Esri Satélite/Aérea e Esri Topográfico & Relevo como complementares.
  - Overlays: 261 pontos pareados, 10 MEIs da Zona Oeste (com links de WhatsApp direto — dado pessoal, por isso o HTML não é versionado), 26 polos institucionais (DTP, CFC e IPEM), 14 subprefeituras com vazios cartográficos e heatmap de vagas.
- `scripts/generate_master_dashboard.py` gera o **Cockpit + CRM 360** (`dashboard_mestre_taxistas_sp_2026.html` e espelho em `Novos Alvarás 2026/dashboard_alvaras_taxi_2026.html`, artefatos locais não versionados):
  - **4 views**: Base Mestre Universal, Fila CRM & WhatsApp, Mapa Tático GIS (SP) e Clientes Corporativos B2B.
  - **Data grid**: ordenação por coluna, paginação configurável (25 a 500), filtros, exportação CSV e gaveta lateral de auditoria do motorista com links de WhatsApp, DOC, SEI, LinkedIn, Google e Hunter.
  - Este é o gerador oficial do dashboard; as versões anteriores (`build_enterprise_tool_v2.py`, `generate_enterprise_tool.py`) foram removidas por produzirem a mesma saída.
- `scripts/run_pipeline.py` é o orquestrador: `python scripts/run_pipeline.py` lista os estágios, `--only <id>` roda estágios isolados, `--all` roda o pipeline completo (os estágios de rede pesada são manuais e exigem `--include-manual`). As dependências estão em `requirements.txt`.

### Camada B2B corporativo

`extract_hospitals_corporate_5km.py` e `extract_corporate_companies_5km.py` constroem as bases de hospitais (94) e empresas (96) em 5 km da sede; `enrich_corporate_emails.py`, `enrich_mobility_services_corporate.py` e `enrich_decision_makers_corporate.py` acrescentam e-mails corporativos, indicadores de mobilidade e decisores; `generate_corporate_dashboard.py` gera `dashboard_clientes_corporativos_b2b.html`. Esses arquivos contêm contato **institucional** de empresas (telefone central, domínio de e-mail, e-mails e nomes de profissionais em contexto de trabalho) e são versionados por isso.

O dashboard e as bases de dados completos são artefatos locais de inteligência analítica, ficam fora do versionamento (`.gitignore`) e não devem ser publicados externamente sem controle de acesso, revisão de minimização (LGPD) e validação de finalidade. A versão versionada da Planilha Mestre é `planilha_mestre_taxistas_sp_2026_publico.csv`, gerada por `python scripts/privacy.py public-master`.

### Rodada de dados abertos de 29/09/2026

Quatro aquisições novas, todas com download idempotente, SHA-256 e licença registrados em `logs/manifesto_*.csv`:

- **SGTP / CMTT** (`scripts/fetch_smt_open_data.py` → `data/raw/smt/`, versionado): série mensal de **licenças de táxi** do município (jan–mai/2026; 37.571 em maio) e a lista dos **133 conselheiros do CMTT** (inclui SINDITAXI e sindicatos de táxi).
- **Frota ativa do Detran-SP** (`scripts/fetch_detran_frota.py` → `data/processed/frota_ativa_sp_por_municipio_2026-08.csv`): 645 municípios, São Paulo com 6.464.958 veículos. O bruto (355 MB, `data/raw/detran/`) fica fora do Git. **Limitação**: a base não expõe a categoria de serviço `TAXI` — a oferta continua sendo medida pelo SGTP.
- **Sinistros do Infosiga** (`scripts/fetch_infosiga_taxistas.py` → `data/processed/sinistros_vitimas_taxistas_infosiga_mensal.csv`): 12 meses de vítimas por profissão; **364 vítimas taxista/mototaxista** em São Paulo (set/2025–ago/2026). Os pacotes de veículos/eventos não trazem categoria de táxi.
- **PJ ativas e MEIs por CNAE** (`scripts/build_empresas_taxi_cnae.py`): `data/processed/empresas_taxi_pj_ativas_sp.csv` (**5.558 empresas PJ ativas**, versionada, telefones/e-mails renomeados para `*_INSTITUCIONAL`) e `data/private/condutores_taxi_mei_ativas_sp.csv` (**51.210 MEI**, local, `razao_social` = nome do titular).
- **Geocodificação dos pontos sem OSM** (`scripts/geocode_dtp_sem_osm.py`): dos **926** pontos do Gate 5 sem par no OSM, **736** receberam coordenada de logradouro via Nominatim (`data/processed/dtp_pontos_sem_osm_geo.csv`); cobertura de coordenadas do DTP sobe de **21,99% para 83,99%**. O pareamento DTP ↔ OSM do Gate 5 **permanece em 21,99%** — geocodificação própria não é correspondência OSM (`data/processed/cobertura_gate5_geocodificacao.json`).


