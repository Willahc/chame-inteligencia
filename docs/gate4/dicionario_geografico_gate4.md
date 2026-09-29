# Dicionário geográfico — Gate 4

| Camada/campo | Tipo publicado | Uso nesta auditoria |
|---|---|---|
| `area_contexto` | Polígono e atributos `cd_identificador_area_contexto`, `nm_area_contexto`, `cd_tipo_area_contexto`, `sg_fonte_original` | Limite municipal oficial filtrado para São Paulo; identificador: `cd_identificador_area_contexto`. |
| `distrito_municipal` | Polígono; identificadores, nome/sigla, área, criação/atualização, regiões 05/08 | Distritos oficiais; identificador principal: `cd_identificador_distrito`. |
| `subprefeitura` | Polígono; identificadores, nome/sigla, área, criação/atualização, regiões 05/08 | Subprefeituras oficiais; identificador principal: `cd_identificador_subprefeitura`. |
| `nm_regiao_05`, `nm_regiao_08` | Texto, em distritos e subprefeituras | Referências regionais publicadas; 5 e 8 valores distintos, respectivamente. Não foi criada camada derivada. |
| `ge_poligono` | `gml:SurfacePropertyType` no DescribeFeatureType | Geometria de superfície, retornada como Polygon no GeoJSON WFS. |
| OSM `amenity=taxi`, `taxi=yes`, `public_transport=taxi` | Tags OSM previstas na consulta | Nenhum elemento retornado; não há dicionário observado de tags/atributos de táxi. |

Campos completos de distrito: `cd_identificador_distrito`, `cd_identificador_subprefeitura`, `ge_poligono`, `cd_distrito_municipal`, `nm_distrito_municipal`, `sg_distrito_municipal`, `tx_escala`, `sg_fonte_original`, `dt_criacao`, `dt_atualizacao`, `cd_usuario_atualizacao`, `cd_tipo_discrepancia`, `qt_area_quilometro`, `qt_area_metro`, `cd_regiao_05`, `nm_regiao_05`, `cd_regiao_08`, `nm_regiao_08`.

Campos completos de subprefeitura: `cd_identificador_subprefeitura`, `ge_poligono`, `cd_subprefeitura`, `nm_subprefeitura`, `tx_escala`, `sg_fonte_original`, `dt_criacao`, `cd_tipo_discrepancia`, `dt_atualizacao`, `cd_usuario_atualizacao`, `sg_subprefeitura`, `qt_area_quilometro`, `qt_area_metro`, `cd_regiao_05`, `nm_regiao_05`, `cd_regiao_08`, `nm_regiao_08`.
