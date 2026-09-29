# Dicionário de Dados — Gate 5 (Consolidação DTP ↔ OSM)

Campos efetivamente consolidados e exportados nos artefatos em `data/processed/`.

---

## 1. Camada Consolidada (`pontos_taxi_sp_consolidado.geojson` e `.csv`)

| Campo | Tipo | Origem | Descrição e Regra de Derivação |
|---|---|---|---|
| `dtp_ponto_id` | Inteiro | DTP | Identificador numérico oficial do ponto regulamentado no DTP (ex: `1788`, `610`). |
| `dtp_endereco` | Texto | DTP | Logradouro publicado pelo DTP nos anexos regionais do Edital 2024. |
| `dtp_subprefeitura_codigo` | Inteiro | DTP | Código numérico da subprefeitura publicado na coluna `SUB` do edital (corresponde a `cd_subprefeitura` do GeoSampa, 1 a 32). |
| `dtp_regiao` | Texto | DTP | Macrorregião administrativa declarada pelo DTP (`CENTRO`, `LESTE`, `NORTE`, `OESTE`, `SUL`). |
| `dtp_vagas_capacidade` | Inteiro | DTP | Capacidade total de vagas regulamentadas do ponto (`CAP`). |
| `dtp_vagas_ocupadas` | Inteiro | DTP | Vagas atualmente ocupadas por taxistas permissionários (`OCUP`). |
| `dtp_vagas_saldo` | Inteiro | DTP | Vagas livres disponíveis para concorrência no sorteio (`SALDO`). |
| `dtp_situacao` | Texto | DTP | Situação cadastral do ponto no edital (`Ativo`). |
| `osm_id` | Texto / Inteiro | OSM | Identificador do elemento no OpenStreetMap (ex: `457559080` ou `way/950146049`). |
| `osm_type` | Texto | OSM | Tipo de geometria no OSM (`node` ou `way_centroid`). |
| `latitude` | Decimal | OSM | Latitude em graus decimais (WGS 84 / EPSG:4326). |
| `longitude` | Decimal | OSM | Longitude em graus decimais (WGS 84 / EPSG:4326). |
| `osm_name` | Texto / Null | OSM | Valor da tag `name` cadastrada no OpenStreetMap. |
| `osm_official_name` | Texto / Null | OSM | Valor da tag `official_name` cadastrada no OpenStreetMap. |
| `osm_addr_street` | Texto / Null | OSM | Logradouro mapeado na tag `addr:street` no OSM. |
| `osm_addr_housenumber` | Texto / Null | OSM | Número predial de referência na tag `addr:housenumber`. |
| `osm_capacity` | Inteiro / Null | OSM | Capacidade de vagas físicas observadas/mapeadas no local (`capacity`). |
| `osm_phone` | Texto / Null | OSM | Telefone de contato do ponto informado na tag `phone` ou `contact:phone`. |
| `osm_opening_hours` | Texto / Null | OSM | Horário de funcionamento do ponto (`opening_hours`, ex: `24/7`). |
| `osm_shelter` | Texto / Null | OSM | Presença de abrigo físico de proteção (`shelter=yes/no`). |
| `osm_bench` | Texto / Null | OSM | Presença de assento/banco para motoristas e usuários (`bench=yes/no`). |
| `geosampa_distrito` | Texto | GeoSampa | Distrito municipal oficial apurado por interseção geométrica com a camada `geoportal:distrito_municipal`. |
| `geosampa_subprefeitura` | Texto | GeoSampa | Nome da Subprefeitura apurada por interseção com a camada `geoportal:subprefeitura`. |
| `matching_layer` | Texto | Algoritmo | Camada de correspondência aplicada (`LAYER_1_EXACT_ID` ou `LAYER_2_FUZZY_ADDRESS`). |
| `matching_status` | Texto | Algoritmo | Status detalhado: `MATCH_EXACT_ID_GEO_VERIFIED`, `MATCH_EXACT_ID_BORDER_BUFFER_50M`, `MATCH_EXACT_ID_SUBPREF_DIVERGENT` ou `MATCH_FUZZY_ADDRESS_HIGH`. |
| `matching_confidence` | Texto | Algoritmo | Grau de confiança atribuído (`HIGH` ou `MEDIUM`). |
| `matching_score` | Decimal | Algoritmo | Índice de similaridade computado (1.00 para exato, 0.85 a 1.00 para fuzzy). |
| `discrepancy_flags` | Texto | Algoritmo | Avisos técnicos de auditoria (ex: `NONE`, `BORDER_BUFFER_14.2M`, `CAPACITY_DIFF_DTP_4_OSM_6`). |

---

## 2. Pontos DTP sem Correspondência (`dtp_pontos_sem_osm.csv`)

| Campo | Tipo | Descrição |
|---|---|---|
| `ponto` | Inteiro | Número do ponto oficial DTP não localizado no OSM. |
| `endereco` | Texto | Logradouro oficial publicado pelo DTP. |
| `sub` | Inteiro / Null | Código de subprefeitura publicado. |
| `regiao` | Texto | Macrorregião publicada. |
| `cap`, `ocup`, `saldo` | Inteiro | Vagas declaradas no Edital 2024. |
| `situacao` | Texto | Situação (`Ativo`). |
| `origem_arquivo` | Texto | Anexo regional de origem do registro. |
| `unmatched_reason` | Texto | Causa da ausência: `SEM_CORRESPONDENCIA_OSM`. |

---

## 3. Feições OSM sem Correspondência (`osm_pontos_sem_dtp.csv`)

| Campo | Tipo | Descrição |
|---|---|---|
| `osm_id` | Texto / Inteiro | Identificador do nó ou centróide no OSM. |
| `osm_type` | Texto | `node` ou `way_centroid`. |
| `latitude`, `longitude` | Decimal | Coordenadas WGS 84. |
| `name`, `official_name` | Texto | Nomes declarados no OSM. |
| `addr_street`, `addr_housenumber` | Texto | Endereço mapeado no OSM. |
| `capacity`, `phone` | Texto | Atributos cadastrados no OSM. |
| `geosampa_subprefeitura`, `geosampa_distrito` | Texto | Delimitação político-administrativa municipal GeoSampa. |
| `unmatched_reason` | Texto | Causa: `FORA_DO_EDITAL_SORTEIO_2024`. |
