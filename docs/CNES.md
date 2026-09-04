# CNES / DATASUS — Gate 2

Fonte oficial: [Portal Brasileiro de Dados Abertos da Saúde](https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude), recurso **CNES Estabelecimentos** (`cnes_estabelecimentos_csv.zip`). Download: `https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/cnes_estabelecimentos_csv.zip`. Recurso CKAN: `78b91d79-bb6d-43ad-bda5-f015e3575a84`.

Referência usada nesta execução: 04/09/2026; SHA-256 do ZIP: `479BFB9950AAA1C7392EEA362E953815B7EE92B702F2216F3A2A87E0918A2E88`. A licença exibida pelo portal é Creative Commons Atribuição-SemDerivações 3.0.

O arquivo nacional é filtrado antes da publicação por `CO_IBGE` iniciado em `355030` e `CO_UF=35`. São aceitos somente tipos hospitalares, pronto atendimento, diagnóstico e clínica/centro de especialidade. Consultórios, registros sem nome/CNES, município divergente e classificações sem aderência são rejeitados e permanecem em `RegistroBrutoCNES`.

Campos preservados: CNES, nomes original e normalizado, tipo, município/UF, natureza/gestão, endereço, situação, lote, fonte, coleta e referência. CNPJ, ANS e enriquecimentos externos não são usados neste Gate.
