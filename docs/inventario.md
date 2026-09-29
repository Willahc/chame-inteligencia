# Inventário e auditoria estrutural — Gate 1

Data da auditoria: 23/09/2026, BRT. A auditoria é exclusivamente estrutural; nenhum dado bruto foi transformado ou alterado.

> Nota de estado: este inventário registra o Gate 1. A pasta `data/processed/` foi preenchida posteriormente pelos pipelines dos Gates 5–6 e pela camada posterior; os arquivos brutos continuam preservados.

## Resultado do Gate

**PARTIAL (escopo histórico do Gate 1).** Há uma fonte oficial válida e original preservado (Edital DTP nº 002/2018), metadados oficiais dos serviços GeoSampa e hashes para todos os downloads. Porém, não há geometria nem CRS de pontos de táxi no arquivo oficial baixado; a busca no GetCapabilities atual não encontrou camada de táxi, e os anexos regionais do edital de 2024 foram bloqueados para automação. Assim, não é possível afirmar cobertura espacial atual, coordenadas ou a relação atual dos 1.187 pontos. A etapa posterior Gate 1B auditou os cinco anexos de 2024 e foi concluída com PASS; este PARTIAL permanece apenas como registro do escopo original do Gate 1.

## Arquivos preservados e auditoria

| Arquivo | Tipo / origem | Tamanho | Registros / estrutura | Geometria, CRS e extensão | Qualidade estrutural |
|---|---|---:|---|---|---|
| `data/raw/dtp/dtp_edital_002_2018_sorteio_pontos_taxi_consultado_20260923T0919.pdf` | PDF original, DTP, HTTP 200 | 149.171 bytes | 1 linha de ponto incluído: ponto 3063; 5 linhas de resumo regional e 1 total. O total histórico declarado é 905 pontos, capacidade 11.878, ocupação 9.541 e saldo 2.337. | Não há coordenadas, geometria, CRS ou bounding box no PDF. Cobertura declarada: Centro, Leste, Oeste, Norte e Sul do Município. | Linha observada sem nulos aparentes; não se calculou duplicidade em PDF. É instantâneo histórico (2018), portanto não é base atual. |
| `data/raw/metadados/geosampa_wfs_getcapabilities_20260923T091709.xml` | XML GetCapabilities WFS, GeoSampa, HTTP 200 | 422.605 bytes | 483 FeatureTypes. Busca em nome/título: 0 tipos de feição de táxi. | Cada camada possui metadados próprios; não há camada de táxi a auditar. | Válido como inventário do serviço, não como dados de pontos. |
| `data/raw/metadados/geosampa_wms_getcapabilities_20260923T091709.xml` | XML GetCapabilities WMS, GeoSampa, HTTP 200 | 900.765 bytes | 499 camadas nomeadas. Busca em nome/título: nenhuma camada de táxi. | WMS entrega mapas/imagens; não foi identificado tema táxi. | Válido como inventário do serviço, não como dados vetoriais. |

Quantidade de arquivos baixados: **3**. Na data do Gate 1, não havia arquivo em `data/processed/`; a pasta foi mantida vazia durante esta etapa. `data/external/` também estava vazia.

## Campos efetivamente observados

No PDF DTP de 2018, a tabela da linha incluída apresenta: `PONTO`, `ENDEREÇO`, `CAP`, `OCUP`, `SALDO`, `SITUACAO`, `SUB`, `REGIÃO`. O resumo apresenta: `REGIÃO`, `PONTOS`, `CAPACIDADE`, `OCUPAÇÃO`, `SALDO`.

Presença de quantidade de vagas: sim. `CAP`/`CAPACIDADE`, `OCUP`/`OCUPAÇÃO` e `SALDO` são exibidos. O PDF de 2024, disponível na página oficial mas não baixado pela automação, declara 3.634 vagas em 1.187 pontos; esse número não foi incorporado a arquivo processado.

## Verificações de qualidade solicitadas

- Coordenadas ausentes/inválidas: não aplicável ao PDF; não contém coordenadas.
- Campos completamente vazios: não observados na única linha de ponto exposta pelo PDF; não é possível generalizar para os 905 pontos, pois eles aparecem somente agregados nesse arquivo.
- Duplicidades exatas: não aplicável ao PDF como registro tabular completo; uma única linha individual não permite teste de duplicidade de todo o universo.
- Data aparente de atualização: 17/09/2018 no cabeçalho do edital e `Last-Modified` HTTP de 19/09/2018. O edital 2024 tem publicação em 21/06/2024 e é a referência mais recente localizada, porém seus arquivos ficaram bloqueados à automação.
- Cobertura geográfica: municipal declarada, repartida nas cinco macro-regiões no resumo de 2018; não há extensão espacial calculável.
- Sistema de coordenadas e tipo de geometria: ausentes no único conjunto de pontos baixado. Não inferir CRS a partir de outros dados GeoSampa.

## Limitações

1. Não foi localizado conjunto geoespacial oficial de pontos de táxi no GeoSampa atual (WFS/WMS GetCapabilities).
2. Os anexos regionais de 2024, que provavelmente contêm a lista atual de pontos e vagas, responderam HTTP 403 à automação. O bloqueio foi respeitado.
3. O arquivo de 2018 tem apenas uma linha detalhada e totais regionais: não permite geocodificação, cálculo de extensão, validação de coordenadas ou deduplicação integral.
4. Licença explícita não foi exibida nas respostas/fontes consultadas; a reutilização deve ser confirmada com o órgão antes de qualquer uso além deste inventário.

## Próxima ação recomendada no Gate 1 (executada na etapa Gate 1B abaixo)

Baixar manualmente, pelo navegador e pelos links oficiais do Edital 002/2024, os cinco anexos regionais; guardar cada original em `data/raw/dtp/` com timestamp, registrar hash/manifesto e então repetir apenas a auditoria estrutural. Em paralelo, solicitar ao DTP/GeoInfo a URL ou identificador da camada vetorial oficial, caso exista fora do GetCapabilities público.

## Gate 1B — auditoria dos anexos regionais de 2024

**Status: BLOCKED (23/09/2026) — etapa inicial, superada pela auditoria concluída da seção seguinte.** Foi inspecionado diretamente `data/raw/dtp/`: havia somente 1 arquivo, o PDF histórico de 2018 já auditado. Foram encontrados **0 de 5** anexos regionais de 2024, **0** arquivos novos para hash e **0** tabelas 2024 para extração. A biblioteca local `pypdf` está disponível para extração textual quando os originais estiverem presentes, mas não foi aplicada ao PDF de 2018 porque este Gate não autoriza misturar as bases temporais.

Consequentemente, título, emissor, região, páginas, assinatura/metadados, campos, linhas, pontos, vagas, nulos, duplicidades, quebras de tabela e soma consolidada de 2024 não são verificáveis. Não houve OCR. A comparação com os totais declarados de 2024 (1.187 pontos; 3.634 vagas) permanece **não realizada**, e não pode ser aprovada por ausência de evidência.

O manifesto `logs/manifesto_downloads_gate1_20260923T0921.csv` foi preservado sem modificação: não existiam novos downloads/arquivos para adicionar no encerramento do Gate 1. `data/processed/` foi preenchida apenas em etapas posteriores.

## Gate 1B — auditoria concluída dos anexos regionais 2024

**Status: PASS (23/09/2026).** Foram encontrados e auditados os cinco anexos regionais de 2024, além do PDF histórico de 2018 e do edital principal de 2024. O histórico de 2018 não foi usado em nenhum cálculo abaixo. O edital principal de 2024 foi usado somente para validar origem e os totais declarados; as métricas abaixo vêm exclusivamente das cinco relações regionais.

Todos os cinco PDFs têm camada textual extraível em todas as páginas, tabelas textuais e nenhum anexo incorporado/formulário/assinatura PDF detectável. Não foi necessário nem executado OCR. Metadados comuns: `/Author` Rafael Alexandrino da Silva; `/Title` `Pastas 02042024 - Verificado 17062024.xlsx`; `/Producer` Microsoft: Print To PDF; `/CreationDate` e `/ModDate` 17/06/2024 −03:00. A preparação dos anexos em 17/06 antecede a assinatura do edital (20/06) e sua publicação (21/06), sem contradição aparente.

| Região | Arquivo | Páginas | Bytes | SHA-256 | Linhas de dados | Pontos distintos | CAP | OCUP | Vagas (`SALDO`) | Linhas vazias na extração | Duplicidades exatas / IDs duplicados |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| Centro | `Relacao de pontos para sorteio _Regiao Central.pdf` | 6 | 477.648 | `14811bda448387c2cef808864fa35297e7defed68e2fa5e33b50bedf889ac3b6` | 253 | 253 | 3.756 | 2.989 | 767 | 0 | 0 / 0 |
| Leste | `Relacao de pontos para sorteio_Zona Leste.pdf` | 4 | 463.303 | `b8baeb4b602baab502c9d320bde8115d35aac4de7678a954c0bca8c23ecf8832` | 183 | 183 | 2.046 | 1.374 | 672 | 0 | 0 / 0 |
| Norte | `Relacao de pontos para sorteio_Zona Norte.pdf` | 3 | 445.672 | `6f730992908d9a3d303a28ed704a6e5aff0253bb4c9ecc7cfb32e85a346b2259` | 113 | 113 | 1.229 | 943 | 286 | 0 | 0 / 0 |
| Oeste | `Relacao de pontos para sorteio_Zona Oeste.pdf` | 8 | 507.245 | `d0322e54df4efdd6844441dbd4163b5cc14bfcedd7e62559e9e7b14af1bcc64d` | 358 | 358 | 4.901 | 3.802 | 1.099 | 0 | 0 / 0 |
| Sul | `Relacao de pontos para sorteio_Zona Sul.pdf` | 7 | 487.937 | `3299765733e11facdfd047ccd3f9bdce2d667192629cc950a165a2c59dad1dc0` | 280 | 280 | 3.389 | 2.579 | 810 | 0 | 0 / 0 |
| **Consolidado 2024** | cinco anexos, somente | **28** | **2.381.805** | — | **1.187** | **1.187** | **15.321** | **11.687** | **3.634** | **0** | **0 / 0** |

O consolidado de 1.187 pontos e 3.634 vagas (`SALDO`) coincide com os totais declarados no edital. Além da coincidência numérica, foram testados IDs e linhas exatas: não há duplicidade dentro das regiões nem entre elas; nenhum registro extraído ficou sem endereço, `CAP`, `OCUP`, `SALDO`, `SITUAÇÃO` ou `REGIÃO`.

### Exceções e continuidade das tabelas

- Centro, página 1, ponto `1152`: a camada textual traz `R.3` sem espaço entre o logradouro e `CAP`; a linha foi contabilizada estruturalmente sem alterar o PDF ou o texto-fonte. O rodapé do arquivo declara 253 / 3.756 / 2.989 / 767, iguais à leitura.
- Leste, página 2, ponto `1633`; Norte, página 3, pontos `3136` e `3211`; Sul, página 6, ponto `3151`: o texto publicado não mostra valor para `SUB`. São quatro ausências de subprefeitura; os demais campos estão presentes. Não houve preenchimento ou normalização.
- As páginas seguintes continuam a tabela sem repetir o cabeçalho. As contagens por página somam os totais de cada rodapé regional; não há indício de perda em quebra de página. As linhas de rodapé foram excluídas da contagem de dados.

Campos sem ocorrência nos anexos: categoria detalhada do táxi, distrito, coordenadas, geometria, CRS, data de alteração por ponto e dados pessoais. Na auditoria Gate 1, `data/processed/` permanecia vazia e nenhum dado de 2024 foi combinado com 2018.

Próxima ação recomendada (não executada): manter estes cinco originais como a referência auditada de 2024 e, em uma etapa autorizada posterior, avaliar se há versão oficial mais recente antes de qualquer análise espacial ou comercial.
