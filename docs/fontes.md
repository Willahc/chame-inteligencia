# Fontes consultadas — Gate 1

Consulta realizada em 23/09/2026, aproximadamente 09:16–09:21 BRT (UTC−03:00). As consultas foram pontuais: GetCapabilities uma vez para cada serviço e downloads únicos; não houve raspagem agressiva.

| Nome | Órgão responsável | URL / endpoint direto | Formato e cobertura | Atualização / licença | Método | Situação e motivo |
|---|---|---|---|---|---|---|
| GeoSampa WFS — GetCapabilities | PMSP, GeoInfo/SMUL | https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&request=GetCapabilities | XML; catálogo de 483 tipos de feição, Município de São Paulo conforme as camadas | resposta consultada em 23/09/2026; licença não declarada na resposta | OGC WFS GET, HTTP 200 | **baixada** como metadado oficial. Pesquisa nos nomes/títulos por `taxi`, `táxi` e `ponto`: 0 camada de táxi; ocorrências de “ponto” eram de outros temas. |
| GeoSampa WMS — GetCapabilities | PMSP, GeoInfo/SMUL | https://wms.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wms?service=WMS&request=GetCapabilities | XML; 499 camadas nomeadas, imagens/cartografia do Município | resposta consultada em 23/09/2026; licença não declarada na resposta | OGC WMS GET, HTTP 200 | **baixada** como metadado oficial. Pesquisa por termos de táxi: nenhuma camada de táxi. WMS não é substituto vetorial para a auditoria de pontos. |
| Catálogo de Metadados GeoSampa | PMSP, GeoInfo/SMUL | https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/search?fast=index | Catálogo geográfico, cobertura institucional municipal | página consultada em 23/09/2026; licença não declarada | pesquisa de catálogo por `taxi` / `táxi` e revisão da categoria Transporte | **descartada como fonte de pontos**: não foi localizado registro de metadados de camada de táxi. A rota API testada `/geonetwork/srv/api/search/records?any=taxi` respondeu HTTP 404; não foi repetida. |
| Edital SMT/SETRAM/DTP nº 002/2024 e anexos regionais | DTP / Secretaria Executiva de Mobilidade e Trânsito, PMSP | Página: https://prefeitura.sp.gov.br/web/secretaria_executiva_de_transporte_e_mobilidade_urbana/w/noticias/368307 ; PDF do edital: https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/Edital%20002%20sorteio%20de%20vagas%20em%20pontos%20de%20taxi.pdf | PDF, Município; edital informa 1.187 pontos privativos e 3.634 vagas para sorteio | publicado em 21/06/2024; licença não declarada | página oficial e tentativa única de download HTTP | **bloqueada para download automatizado**: o PDF e os cinco anexos regionais retornaram HTTP 403 ao `curl`. Alternativa oficial: baixar manualmente pelos seis links da página do edital em navegador, preservando os anexos por região. Não se tentou contornar o bloqueio. |
| Edital nº 002/2018 — DTP.GAB | DTP / Secretaria Municipal de Mobilidade e Transportes, PMSP | https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/edital_002_18_sorteio_pontos_taxi_1537367029.pdf | PDF, Município; uma atualização pontual de ponto e resumo regional | publicado 17/09/2018; cabeçalho HTTP `Last-Modified: 19/09/2018`; licença não declarada | download HTTP único, 200 | **baixada** em formato original. É fonte oficial histórica, não representa a situação atual nem oferece geometria. |
| Serviço de Táxi / legislação municipal | DTP / PMSP | https://prefeitura.sp.gov.br/web/mobilidade/w/institucional/6998 ; https://legislacao.prefeitura.sp.gov.br/portaria-secretaria-municipal-de-mobilidade-e-transportes-smt-dtp-102-de-14-de-setembro-de-2020/consolidado | páginas HTML, Município | Portaria 102/2020; licença não declarada | leitura web | **encontrada (contextual)**: confirma categorias, vagas e competência do DTP; não é arquivo tabular/geoespacial. |
| Portal de Dados Abertos e InfoCidade | PMSP | https://dados.prefeitura.sp.gov.br/ ; https://infocidade.prefeitura.sp.gov.br/ | catálogos municipais | consultados em 23/09/2026; licença depende do conjunto | pesquisa por `pontos de táxi`, `pontos privativos`, `vagas` e `taxi` | **pendente / sem conjunto direto identificado nesta rodada**. Nenhum arquivo não oficial foi usado como substituto. |

Não foi usado OpenStreetMap **neste Gate 1**: ele permanecia apenas como alternativa externa complementar. A partir do Gate 4 o OSM passou a ser fonte efetivamente usada (extração bruta do PBF Geofabrik Sudeste, recortada pelo polígono oficial do município), preservada em `data/external/osm/` e pareada com o Edital DTP no Gate 5.

Consultas empregadas: `pontos de táxi`, `pontos privativos de táxi`, `vagas em pontos`, `localização`, `categoria`, `alteração`, `ampliação`, `situação`, `taxi` e `táxi`. A ausência de nome técnico foi tratada por inspeção do GetCapabilities, e não por suposição de camada.

## Gate 1B — verificação de recebimento dos anexos 2024

Em 23/09/2026, a pasta indicada para os anexos (`data/raw/dtp/`) continha apenas `dtp_edital_002_2018_sorteio_pontos_taxi_consultado_20260923T0919.pdf`, já registrado como fonte histórica. Nenhum PDF novo regional de 2024 foi encontrado. Logo, não há fonte 2024 adicional a validar como oficial nesta execução; o bloqueio é de disponibilidade local dos cinco arquivos, não de origem ou extração.

## Gate 1B — anexos recebidos e validados

Em verificação posterior em 23/09/2026, foram encontrados os cinco anexos regionais manualmente obtidos da página oficial do Edital SMT/SETRAM/DTP nº 002/2024. A validação de origem combina: (a) os cinco links aparecem na página oficial registrada acima; (b) os nomes locais correspondem aos nomes dos links; (c) todos trazem a tabela `PONTO ENDEREÇO CAP OCUP SALDO SITUAÇÃO SUB REGIÃO` e a região esperada; e (d) metadados dos PDFs apontam o mesmo arquivo de trabalho de origem (`Pastas 02042024 - Verificado 17062024.xlsx`), autor `Rafael Alexandrino da Silva`, criado/modificado em 17/06/2024. O edital principal de 2024, armazenado separadamente, identifica o DTP e relaciona esses anexos no Anexo III.

| Região | Arquivo original preservado | URL oficial do anexo | Situação de obtenção |
|---|---|---|---|
| Centro | `Relacao de pontos para sorteio _Regiao Central.pdf` | https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/Relacao%20de%20pontos%20para%20sorteio%20_Regiao%20Central.pdf | baixado manualmente; a tentativa automatizada anterior havia retornado HTTP 403 |
| Leste | `Relacao de pontos para sorteio_Zona Leste.pdf` | https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/Relacao%20de%20pontos%20para%20sorteio_Zona%20Leste.pdf | baixado manualmente; tentativa automatizada anterior: HTTP 403 |
| Norte | `Relacao de pontos para sorteio_Zona Norte.pdf` | https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/Relacao%20de%20pontos%20para%20sorteio_Zona%20Norte.pdf | baixado manualmente; tentativa automatizada anterior: HTTP 403 |
| Oeste | `Relacao de pontos para sorteio_Zona Oeste.pdf` | https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/Relacao%20de%20pontos%20para%20sorteio_Zona%20Oeste.pdf | baixado manualmente; tentativa automatizada anterior: HTTP 403 |
| Sul | `Relacao de pontos para sorteio_Zona Sul.pdf` | https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/Relacao%20de%20pontos%20para%20sorteio_Zona%20Sul.pdf | baixado manualmente; tentativa automatizada anterior: HTTP 403 |

Os cinco anexos não têm anexos embutidos, formulários ou assinatura digital PDF detectável pela auditoria estrutural. A ausência de assinatura visível não invalida sua origem, que é confirmada pela página oficial e pelo edital principal.

## Camada posterior - Dados Abertos do CNPJ (Receita Federal)

Fonte acrescentada em 28/09/2026 para extrair estabelecimentos de taxi por CNAE no municipio de Sao Paulo. Nao substitui nenhuma fonte oficial do DTP e nao comprova Condutax.

| Fonte | Orgao | URL | Conteudo | Data / corte | Licenca | Acesso | Uso no projeto |
|---|---|---|---|---|---|---|---|
| Dados abertos do CNPJ - `Estabelecimentos0..9.zip` + `Empresas0..9.zip` + `Cnaes.zip` + `Municipios.zip` + `Naturezas.zip` | Receita Federal do Brasil (RFB) | Origem primaria: https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9  \|  Espelho CDN usado no download: https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos/2026-09-14/ | Cadastro Nacional da Pessoa Juridica: CNPJ, razao social, natureza juridica, CNAE principal e secundarios, situacao cadastral, data de inicio, endereco, telefones e e-mail | corte mensal **2026-09-14** (publicado 18/09/2026); 43 cortes disponiveis de 2023-03-15 a 2026-09-14 | Creative Commons Attribution (CC-BY), conforme catalogo do Portal Brasileiro de Dados Aberto | HTTP 200, sem autenticacao. Resposta **403** se a requisicao nao enviar `User-Agent`. | **baixado e filtrado** por `scripts/extract_taxistas_cnae_receita.py`; 73.366.154 estabelecimentos varridos, 80.615 retidos no municipio 7107 (SAO PAULO/SP). Hashes em `logs/manifesto_cnpj_receita_2026-09-14.csv`. |

Criterio de extracao: `MUNICIPIO = 7107` (codigo IBGE de SAO PAULO/SP) e CNAE da familia taxi presente como atividade principal (`CNAE_FISCAL`) ou entre as secundarias (`CNAE_FISCAL_SECUNDARIA`): `4923001` Servico de taxi, `4923002` Transporte de passageiros - locacao de automoveis com motorista, `5229001` Apoio ao transporte por taxi. `5112901` (taxi aereo) foi excluido por nao ser transporte terrestre.

Os arquivos brutos (5,8 GB) nao foram preservados no repositorio: sao reproduziveis pelo script, que registra URL, tamanho e SHA-256 de cada arquivo em `logs/manifesto_cnpj_receita_2026-09-14.csv`.

## Camada de dados abertos municipais e estaduais (rodada de 29/09/2026)

Aquisicoes novas feitas em 29/09/2026 (BRT) para ampliar as bases do projeto. Todas seguem o mesmo padrao: download idempotente por script + manifesto com URL, SHA-256, licenca e horario da consulta em `logs/`.

| Fonte | Orgao | URL | Conteudo adquirido | Data / cobertura | Licenca | Acesso | Uso no projeto |
|---|---|---|---|---|---|---|---|
| SGTP \| Taxi - Licencas (CSV + PDF + dicionario) | SMT/DTP - Prefeitura de Sao Paulo (Portal CKAN) | https://dados.prefeitura.sp.gov.br/dataset/sistema-de-gerenciamento-de-transporte-publico-sgtp-taxi | Serie mensal de licencas de taxi por tipo (C/S-CARRO), titulacao (autonomo/empresa) e categoria | Jan-Mai/2026; maio/2026 = 37.571 licencas | CCZero | HTTP 200 | `scripts/fetch_smt_open_data.py` → `data/raw/smt/`; medida oficial de oferta do municipio |
| CMTT - Conselheiros por mandato (CSV + dicionario) | SMT/AT - Prefeitura de Sao Paulo (Portal CKAN) | https://dados.prefeitura.sp.gov.br/dataset/conselheiros-por-mandato-do-cmtt | 133 conselheiros por segmento, cargo e genero declarado (inclui SINDITAXI e sindicatos de taxi) | mandato 2024mar-2026jan | CC BY 4.0 | HTTP 200 | mesmo script; mapa de influencia/relacionamento (acesso ao nome de cargo publico e permitido) |
| Frota Ativa (mensal) | Detran-SP (Portal de Dados Abertos do Estado de SP) | https://dadosabertos.sp.gov.br/dataset/frota-ativa | 3.242.859 linhas agregadas: municipio, categoria, especie, tipo de veiculo, quantidade | Ago/2026 (15 CSVs mensais disponiveis) | dado aberto estadual (Lei 12.527/2011) | CKAN + download do blob Azure via `curl --ssl-no-revoke` (proxy corporativo nao tem revogacao do certificado) | `scripts/fetch_detran_frota.py` → `data/processed/frota_ativa_sp_por_municipio_2026-08.csv` (645 municipios; SP = 6.464.958 veiculos, 3.875.312 automoveis) |
| Pessoas Envolvidas em Sinistros (mensal) | Detran-SP / Infosiga | https://dadosabertos.sp.gov.br/dataset/pessoas-envolvidas-em-sinistros | uma linha por vitima, com profissao declarada e gravidade da lesao | set/2025-ago/2026 (12 CSVs) | dado aberto estadual | HTTP 200 | `scripts/fetch_infosiga_taxistas.py` → `data/processed/sinistros_vitimas_taxistas_infosiga_mensal.csv` (364 vitimas taxista/mototaxista em Sao Paulo no periodo) |
| Eventos de Sinistro (mensal) | Detran-SP / Infosiga | https://dadosabertos.sp.gov.br/dataset/eventos-de-sinistro | uma linha por evento, com tipo de registro (NOTIFICACAO / SINISTRO NAO FATAL / SINISTRO FATAL), causa provavel, tipo primario, bairro, circunscricao, quantidade de vitimas e lat/lon | set/2025-ago/2026 (12 CSVs; 44.522 eventos no municipio de Sao Paulo) | dado aberto estadual | HTTP 200 | `scripts/build_acidentes_por_subprefeitura.py` → `data/processed/acidentes_sp_por_subprefeitura_2025-09_2026-08.csv` e `data/processed/acidentes_sp_mensal_2025-09_2026-08.csv` |

**Limitacao registrada (Frota Ativa):** a base aberta do Detran nao expoe a categoria de servico `TAXI` — as categorias sao `PARTICULAR`, `ALUGUEL`, `OFICIAL`, `APRENDIZAGEM` etc., e nenhum campo (especie, tipo, marca) distingue o taxi. Por isso a medida de oferta continua sendo a serie do SGTP, e a frota entra apenas como dimensionamento de mercado por municipio. O mesmo vale para o pacote nacional RENAVAM (`i_frota_por_uf_municipio_marca_e_modelo_ano_*.zip`), cujas dimensoes sao UF, municipio, marca, modelo e ano.

**Limitacao registrada (Infosiga):** os pacotes abertos `veiculos-envolvidos-em-sinistros` e `eventos-de-sinistro` tambem nao trazem categoria de servico do veiculo (`tipo_veiculo` = AUTOMOVEL, MOTOCICLETA, ...). O recorte em taxi foi obtido pela `profissao` da vitima (`TAXISTA`, `MOTOTAXISTA`) no pacote de pessoas. O consolidado de sinistros (`dados_infosiga.zip`) exige autenticacao (HTTP 401) e nao foi usado. O pacote `eventos-de-sinistro` e usado apenas como camada de risco territorial, sem recorte de categoria de servico.

**Limitacao registrada (Eventos de Sinistro):** dos 44.522 eventos do municipio no periodo, **15.439 (34,7%) nao trazem latitude/longitude** (a ausencia varia de mes para mes: 309 em jul/2026 e 1.966 em mai/2026) e **900 (2,0%)** ficam fora dos 32 poligonos de subprefeitura. Esses 16.339 eventos nao recebem subprefeitura: os sem coordenada vao para o balcao `Sem coordenada` e os demais para `Fora dos poligonos`. Alem disso, 18.250 linhas sao `NOTIFICACAO` (evento ainda nao classificado como fatal ou nao fatal) e sao contadas como eventos, mas nao nas colunas de sinistros fatais/nao fatais. As coordenadas vem com virgula decimal e sao transformadas de EPSG:4326 para EPSG:31983 antes do ponto-em-poligono.

### Derivados locais gerados nesta rodada

| Artefato | Origem | Conteudo | Camada |
|---|---|---|---|
| `data/processed/empresas_taxi_pj_ativas_sp.csv` | recorte CNAE da RFB (base local) | 5.558 PJ ativas com CNPJ, razao social, CNAE, endereco juridico, telefone e e-mail institucionais | versionada |
| `data/private/condutores_taxi_mei_ativas_sp.csv` | mesma base | 51.210 MEI ativos (razao social = nome do titular) | local (`.gitignore`) |
| `data/processed/dtp_pontos_sem_osm_geo.csv` | `dtp_pontos_sem_osm.csv` + Nominatim | 736 dos 926 pontos sem OSM com coordenada de logradouro (94 cairam fora do municipio, 96 nao encontrados) | versionada |
| `data/processed/cobertura_gate5_geocodificacao.json` | execucao do geocoder | 21.99% → 83.99% de cobertura de coordenadas do DTP (o pareamento DTP↔OSM do Gate 5 permanece em 21.99%) | versionada |
| `data/processed/sgtp_licencas_taxi_mensal.csv` | `data/raw/smt/sgtp_licencas_taxi_05.2026.csv` (layout em blocos) | 25 linhas retangulares: tipo de veiculo (C/S-CARRO), titulacao, categoria e colunas jan–mai/2026 (subtotais somam 37.571 em mai) | versionada |
| `data/processed/acidentes_sp_por_subprefeitura_2025-09_2026-08.csv` | `eventos-de-sinistro` + poligonos do GeoSampa | 34 balcoes (32 subprefeituras, `Sem coordenada`, `Fora dos poligonos`) com sinistros, fatais, nao fatais, atropelamentos e envolvidos | versionada |
| `data/processed/acidentes_sp_mensal_2025-09_2026-08.csv` | idem | 12 linhas mensais de serie temporal do municipio | versionada |

### Integracao nos produtos

As quatro bases novas entram como **abas 16 a 20** da Planilha Mestre (`16_Licencas_SGTP_Taxi`, `17_Frota_Ativa_Por_Municipio`, `18_Sinistros_Vitimas_Taxistas`, `19_Acidentes_Por_Subprefeitura`, `20_Acidentes_SP_Mensal`) e como a secao **Dados Abertos Municipais e Estaduais** do dashboard oficial (6 indicadores de KPI, ranking das 10 subprefeituras com mais sinistros e serie mensal, ambos em Chart.js).

`data/raw/smt/` e versionado (arquivos pequenos, aquisicao preservada). `data/raw/detran/` (355 MB) e `data/raw/infosiga/` (45 MB) ficam fora do Git: o manifesto guarda URL, SHA-256 e o script rebaixa quando precisar.