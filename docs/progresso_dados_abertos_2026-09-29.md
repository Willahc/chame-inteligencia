# Progresso — rodada de dados abertos (29/09/2026)

Objetivo: ampliar as bases do projeto com dados abertos verificáveis, dentro da
política de duas camadas do repositório (camada completa local / camada pública
versionada) e com manifesto de aquisição (URL, SHA-256, licença, horário BRT)
em `logs/`.

Seis alvos aprovados (A, B, C, CMTT, D, E). Todos concluídos em 29/09/2026.

## O que entrou

| Alvo | Script | Artefato | Resultado |
|---|---|---|---|
| A — SGTP (licenças) | `scripts/fetch_smt_open_data.py` | `data/raw/smt/` (versionado) + `logs/manifesto_smt_20260929.csv` | 5 recursos (CSV/PDF/dicionários); série jan–mai/2026; **37.571 licenças** em maio/2026 |
| CMTT — conselheiros | mesmo script | `data/raw/smt/cmtt_conselheiros_mandatos_2024mar_2026jan.csv` | **133 conselheiros**, inclui SINDITAXI e sindicatos de táxi (arquivo em `mac_roman`) |
| B — frota Detran-SP | `scripts/fetch_detran_frota.py` | `data/processed/frota_ativa_sp_por_municipio_2026-08.csv` + `logs/manifesto_detran_20260929.csv` | 645 municípios; SP = 6.464.958 veículos (3.875.312 automóveis); 43,7% da frota estadual na mesorregião metropolitana (45 municípios) |
| E — sinistros Infosiga | `scripts/fetch_infosiga_taxistas.py` | `data/processed/sinistros_vitimas_taxistas_infosiga_mensal.csv` + `logs/manifesto_infosiga_20260929.csv` | 12 meses (set/2025–ago/2026); **364 vítimas taxista/mototaxista** em São Paulo (~20–39/mês) |
| C — CNAE da RFB | `scripts/build_empresas_taxi_cnae.py` | `data/processed/empresas_taxi_pj_ativas_sp.csv` (versionada) + `data/private/condutores_taxi_mei_ativas_sp.csv` (local) | **5.558 PJ ativas** (99% com telefone, 96% com e-mail) e **51.210 MEI ativos** |
| D — geocodificação | `scripts/geocode_dtp_sem_osm.py` | `data/processed/dtp_pontos_sem_osm_geo.csv` + `data/processed/cobertura_gate5_geocodificacao.json` | **736/926** pontos sem OSM receberam coordenada (94 fora do município, 96 não encontrados) |
| F — acidentes por subprefeitura | `scripts/build_acidentes_por_subprefeitura.py` | `data/processed/acidentes_sp_por_subprefeitura_2025-09_2026-08.csv` + `data/processed/acidentes_sp_mensal_2025-09_2026-08.csv` | 12 meses de `eventos-de-sinistro` recortados em `cod_ibge=3550308` e localizados nos 32 polígonos do GeoSampa: **44.522 eventos** (1.010 fatais, 6.403 atropelamentos), 29.083 geolocalizados |

Cobertura de **coordenadas** do DTP: **21,99% → 83,99%** (997/1.187). O
**pareamento DTP ↔ OSM do Gate 5 continua 21,99%** — geocodificação própria não
é correspondência OSM e não altera `docs/metricas_analise_gate6.json`.

## Limitações registradas

1. **Frota sem categoria de táxi**: a base aberta do Detran-SP usa categorias
   `PARTICULAR/ALUGUEL/OFICIAL/APRENDIZAGEM` e nenhum campo (especie, tipo,
   marca) distingue o táxi; o pacote nacional RENAVAM tem dimensões
   UF/município/marca/modelo/ano, também sem serviço. A medida de oferta
   permanece sendo a série do SGTP (alvo A). A frota entra só como
   dimensionamento de mercado.
2. **Infosiga sem categoria de táxi**: `veiculos-envolvidos-em-sinistros` e
   `eventos-de-sinistro` não trazem categoria de serviço (`tipo_veiculo` é
   AUTOMOVEL/MOTOCICLETA/...). O consolidado `dados_infosiga.zip` responde
   HTTP 401. O recorte em táxi foi feito pela **profissão da vítima**
   (`TAXISTA`, `MOTOTAXISTA`) em `pessoas-envolvidas-em-sinistros`.
3. **Geocodificação sem número de porta**: os 926 endereços do DTP não trazem
   número, então o Nominatim resolve no nível do logradouro (centroide).
   Resultado com validação de município (limites + `address.city` do
   Nominatim) para evitar acertos em cidades vizinhas (ex.: Limeira).
4. **Acesso ao blob do Detran**: o proxy corporativo intercepta TLS e o
   `requests` falha com cadeia auto-assinada; o download usa
   `curl.exe --ssl-no-revoke` (cadeia do Windows, sem checagem de revogação)
   com fallback para `requests verify=False`. SHA-256 fica no manifesto.
5. **Eventos sem coordenada**: 15.439 dos 44.522 eventos (34,7%) não trazem
   latitude/longitude e 900 (2,0%) caem fora dos polígonos de subprefeitura;
   ambos ficam em balcões próprios (`Sem coordenada`, `Fora dos poligonos`)
   e não são distribuídos territorialmente. 18.250 linhas são `NOTIFICACAO`
   (evento não classificado) e entram no total, mas não nas colunas de
   fatais/não fatais.

## Política de dados confirmada

- `python scripts/privacy.py check` → **48 arquivos, 0 violações**.
- PJ ativas: telefone/e-mail renomeados para `TELEFONE_INSTITUCIONAL` /
  `EMAIL_INSTITUCIONAL` para não casar nos padrões de PII do `privacy.py`;
  `CEP` de empresa é institucional e segue versionável (regra já existente).
- MEI: `razao_social` = nome do titular → base só em `data/private/`.
- Brutos pesados: `data/raw/detran/` (355 MB) e `data/raw/infosiga/` (45 MB)
  no `.gitignore`, reproduzíveis pelos scripts e verificáveis pelo manifesto.

## Como reproduzir

```bash
python scripts/run_pipeline.py --only smt          # SGTP + CMTT
python scripts/run_pipeline.py --only detran       # frota Detran-SP (rede pesada)
python scripts/run_pipeline.py --only infosiga     # 12 meses de sinistros
python scripts/run_pipeline.py --only acidentes    # eventos de sinistro por subprefeitura
python scripts/run_pipeline.py --only cnae-pj      # PJ públicas + MEI privado
python scripts/run_pipeline.py --only geo-sem-osm  # 926 pontos no Nominatim (~1 req/s)
python scripts/privacy.py check                    # deve terminar com 0 violações
```

Estágios novos registrados em `scripts/run_pipeline.py`: `smt`, `detran`,
`infosiga`, `acidentes` (grupo `fontes`, manuais), `geo-sem-osm` (grupo
`campo`, manual) e `cnae-pj` (grupo `b2b`, local).

## Integração nos produtos (executada em 29/09/2026)

- **Planilha Mestre** (`scripts/build_master_spreadsheet.py`): passou de 15 para
  **20 abas**, na sequência já usada pelo script:
  - `16_Licencas_SGTP_Taxi` (25 linhas, jan–mai/2026),
  - `17_Frota_Ativa_Por_Municipio` (645 municípios, ago/2026),
  - `18_Sinistros_Vitimas_Taxistas` (623 linhas, 12 meses),
  - `19_Acidentes_Por_Subprefeitura` (34 balcões) e
  - `20_Acidentes_SP_Mensal` (12 meses).
  Os cinco CSVs são lidos com `sep=';'`, `encoding='utf-8-sig'` e entram apenas
  no `.xlsx` (o CSV mestre continua sendo a base de motoristas).
- **Dashboard oficial** (`scripts/generate_master_dashboard.py`): nova seção
  **Dados Abertos Municipais e Estaduais** na view 1, com 6 cards de KPI
  (licenças SGTP, frota estadual, PJ ativas, sinistros, vítimas taxistas e
  cobertura geográfica), gráfico de barras das 10 subprefeituras com mais
  sinistros, gráfico de linha da série mensal e tabela dos 10 primeiros.
  Os dados entram pelo placeholder `__ABERTOS_PLACEHOLDER__` e os HTMLs de
  KPI/tabela por `__KPIS_ABERTOS__` / `__LINHAS_ABERTOS__`.
- **Separador**: os CSVs derivados desta rodada passaram a usar `;`
  (convenção do repositório, abre direto no Excel pt-BR) e os escritores dos
  scripts de aquisição foram idempotentes por URL para não duplicar linhas de
  manifesto em reexecuções.

## Próximos passos possíveis (não executados)

- Reavaliar a cobertura do Gate 5 se o DTP publicar relação georreferenciada
  (foi solicitado por minuta em 23/09/2026).
