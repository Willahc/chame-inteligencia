# Fontes e aquisição — Gate 4

Consulta em 23/09/2026, America/Sao_Paulo. Gates 1, 2 e 3 permanecem preservados como PASS. Na etapa Gate 4, nenhum endereço DTP/CFC foi geocodificado, nenhuma sobreposição espacial foi executada e `data/processed/` permanecia vazia; os artefatos processados foram gerados em etapas posteriores.

| Fonte | Órgão / natureza | Endpoint ou URL | Situação |
|---|---|---|---|
| GeoSampa WFS | Prefeitura de São Paulo / Prodam | https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs | **Baixada**: camadas oficiais e DescribeFeatureType. GetCapabilities já preservado no Gate 1. |
| `geoportal:area_contexto` | GeoSampa | WFS GetFeature, filtro `nm_area_contexto = 'São Paulo'` | **Baixada**: limite municipal oficial, 1 polígono. |
| `geoportal:distrito_municipal` | GeoSampa | WFS GetFeature | **Baixada**: 96 polígonos de distrito. |
| `geoportal:subprefeitura` | GeoSampa | WFS GetFeature | **Baixada**: 32 polígonos de subprefeitura. |
| Nominatim / OpenStreetMap | Fonte externa complementar OSM | https://nominatim.openstreetmap.org/search | **Baixada**: resposta mínima para identificar o limite administrativo, relation 298285. |
| Overpass API primária | Fonte externa complementar OSM | https://overpass-api.de/api/interpreter | **Bloqueada/expirada**: descoberta nacional e validação da relação retornaram HTTP 504. |
| Overpass API alternativa | Fonte externa complementar OSM | https://overpass.kumi.systems/api/interpreter ; https://overpass.private.coffee/api/interpreter | **Sem resposta utilizável**: conexão encerrada/consulta final sem retorno gravável. Nenhuma resposta de táxi foi preservada. |
| BBBike Extracts | Serviço comunitário de extratos OSM | https://extract.bbbike.org/ | **Pendente de dado do solicitante**: landing preservada; o serviço exige e-mail para gerar extrato municipal sob demanda. Nenhum e-mail foi informado ou coletado. |
| Geofabrik Sudeste | Distribuidor comunitário de extratos OSM | https://download.geofabrik.de/south-america/brazil/sudeste-latest.osm.pbf | **Usado**: PBF bruto regional, 858.909.937 bytes. Filtrado/recortado para táxi no município via parser próprio (592 nodes, 6 ways, 3 relations). |
| e-SIC municipal / CGM | Prefeitura de São Paulo | https://esic.prefeitura.sp.gov.br/ ; https://prefeitura.sp.gov.br/controladoria_geral/acesso_a_informacao/ | **Canais verificados**: minuta de solicitação preparada, mas não protocolada sem autenticação/autorização do solicitante. |

## Identificação de camadas e método

Os nomes técnicos foram obtidos do GetCapabilities WFS preservado em `data/raw/metadados/geosampa_wfs_getcapabilities_20260923T091709.xml` e confirmados por DescribeFeatureType antes de GetFeature. Foram solicitados GeoJSON oficiais no CRS declarado/nativo `EPSG:31983`, sem reprojeção. Não foi localizada no GetCapabilities uma camada distinta intitulada “região administrativa”; distrito e subprefeitura publicam os atributos oficiais `cd_regiao_05`/`nm_regiao_05` e `cd_regiao_08`/`nm_regiao_08`.

Para limite OSM, a resposta Nominatim identificou `relation_id=298285`, `type=administrative`, `category=boundary`, nome São Paulo e bounding box. O `admin_level` não foi confirmado por Overpass, mas a extração OSM municipal não dependeu da relação OSM: o recorte usou o polígono oficial GeoSampa da PMSP.
