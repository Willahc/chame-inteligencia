# Inventário e auditoria geográfica — Gate 4

## Status

**PASS (extração OSM concluída).** Referências oficiais preservadas e auditadas (limite municipal, distritos, subprefeituras). A extração OSM bruta de feições de táxi foi obtida de forma válida via PBF Geofabrik processado com parser próprio (`scripts/extract_osm_taxi.py`), recortado pelo polígono oficial do município. A consulta Overpass continuou indisponível (504/queda), mas tornou-se desnecessária como fonte primária.

## Camadas oficiais

| Camada técnica | Arquivo bruto | Feições | Geometria | CRS | Bounding box EPSG:31983 | Vazias | Inválidas |
|---|---|---:|---|---|---|---:|---|
| `geoportal:area_contexto` (filtro São Paulo) | `data/raw/geosampa/limites/municipio_sao_paulo_geosampa_20260923T1045.geojson` | 1 | Polygon | EPSG:31983 | 313386.45403659, 7343737.63012172, 360618.84804882, 7416133.2163053 | 0 | não testadas* |
| `geoportal:distrito_municipal` | `data/raw/geosampa/distritos/distrito_municipal_geosampa_20260923T1045.geojson` | 96 | Polygon | EPSG:31983 | igual ao limite | 0 | não testadas* |
| `geoportal:subprefeitura` | `data/raw/geosampa/subprefeituras/subprefeitura_geosampa_20260923T1045.geojson` | 32 | Polygon | EPSG:31983 | igual ao limite | 0 | não testadas* |

\* Não foi instalada biblioteca adicional de validação geométrica. Foi feita auditoria estrutural de presença/tipo/bounding box; nenhuma geometria foi corrigida, reprojetada ou alterada.

### Metadados e atualização

- Os três DescribeFeatureType originais foram preservados junto às camadas.
- Distritos: `dt_criacao=2004-01-01Z`; `dt_atualizacao` entre `2026-03-20T16:13:19.988Z` e `2026-03-20T16:13:20.129Z`.
- Subprefeituras: `dt_criacao=2023-11-30Z`; `dt_atualizacao` entre `2026-03-20T16:14:01.317Z` e `2026-03-20T16:14:01.400Z`.
- Limite: a camada não publica campo de data de atualização.
- `cd_usuario_atualizacao` está vazio em todas as 96 feições de distrito e 32 de subprefeitura; não foi usado.

## Resultado OSM

Extraído com sucesso de `data/external/osm/taxi/geofabrik_sudeste_latest_20260923T1425.osm.pbf` e recortado pelo polígono oficial da PMSP (GeoSampa):

- Arquivo: `data/external/osm/taxi/osm_taxi_saopaulo_geofabrik_20260923T1211_raw.osm`
- Conteúdo: **592 nodes**, **6 ways**, **3 relations** com `amenity=taxi`, `taxi=yes` ou `public_transport=taxi`.
- Geometrias preservadas em EPSG:4326; sem `userId`, `version` ou `changeset` (dado bruto, sem dados de contribuidores).
- SHA-256: `B274414D3B2F9BB408E8EB8EF22085E0134A0A87A396ADC0B513502333B9E508`; 204.270 bytes.

Método: parser PBF puro em Python (`scripts/extract_osm_taxi.py`) — sem dependências PID do sistema, rodando no venv `C:\Users\winsilva\AppData\Local\Temp\opencode\venv-osm` (`protobuf` e `pyproj`). Duas passadas: (1) coleta candidatos e refs de ways/relations; (2) resolve coordenadas dos refs necessários. Recorte por point-in-polygon reaproveitando o mesmo algoritmo do pipeline (ray casting) sobre o anel externo municipal, com transformação EPSG:31983→4326 via `pyproj`.

Validação: os 566 refs de ways foram resolvidos; as 102 ways de táxi restantes do arquivo Sudeste ficam fora do município e foram corretamente descartadas. O resultado é determinístico (hash reproduzido em segunda execução) e o log de execução consta em `logs/gate4/log_extracao_osm_taxi.txt`.

A consulta Overpass integral está preservada em `logs/gate4/consulta_overpass_taxi.txt`; a retomada autorizada em 23/09/2026 às 14:00 BRT recebeu novamente HTTP 504. A Overpass deixou de ser a fonte primária; mantém-se como referência cruzar em etapa futura.

Foram preservadas somente as respostas mínimas de identificação do limite OSM e da tentativa de relation incorreta, separadas em `data/external/osm/taxi/`. Não foram preservados dados de contribuidores.

## Rotas complementares executadas

- **BBBike:** landing HTML preservada, SHA-256 `5b46f529932f92cb95a65f66d1df2c399ae5af8cc810adb6d1690cf50f5a61d8`. A interface oferece PBF/XML e outros formatos, mas exige e-mail para solicitar extrato. Não foi informado, inferido ou coletado e-mail; por isso não há extrato BBBike.
- **Geofabrik:** PBF bruto `data/external/osm/taxi/geofabrik_sudeste_latest_20260923T1425.osm.pbf`, 858.909.937 bytes, SHA-256 `973af023be071e19219cf6327284814e410ede59526c50718cfa929f0df47274`. Cabeçalho PBF válido: `OSMHeader`, recursos `OsmSchema-V0.6` e `DenseNodes`, programa `osmium/1.16.0`. Cobertura: Sudeste brasileiro; não é camada municipal nem foi filtrado/processado para táxi.
- **Tentativa interrompida Geofabrik:** `...T1415.osm.pbf`, 928.115.953 bytes, é maior que o tamanho remoto esperado e está inválida por concorrência causada por interrupções do terminal. Foi preservada sem uso e identificada no manifesto; a versão válida é somente `...T1425.osm.pbf`.
- **Solicitação oficial:** minuta preparada em `docs/gate4/minuta_solicitacao_oficial_pontos_taxi.md`; nenhum protocolo foi enviado.

## Observação de versão

`municipio_sao_paulo_geosampa_20260923T1042.geojson` é a primeira resposta oficial de 147 bytes/zero feições: consulta com caractere acentuado codificado incorretamente. Ela foi mantida sem sobrescrita como evidência técnica. A versão válida, com filtro UTF-8 correto, é `...T1045.geojson` e contém a única feição municipal.
