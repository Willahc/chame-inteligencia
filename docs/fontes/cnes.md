# Documentação de Fonte: CNES (Cadastro Nacional de Estabelecimentos de Saúde)

## 1. Identificação da Fonte
- **Órgão:** Ministério da Saúde / Secretaria de Atenção Especializada à Saúde (SAES)
- **Portal Oficial:** `https://dadosabertos.saude.gov.br/` e repositório S3 CKAN Saúde: `https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/`
- **Finalidade no Chame Inteligência:** Base primária de estabelecimentos de saúde, tipos de estabelecimentos, leitos, atendimento 24h, gestão (pública/privada), localização física e CNPJ mantenedor.

## 2. Artefatos Locais e Hashes
- **Lote Canônico Ativo (Base do Banco Canônico):**
  - `data/raw/cnes_estabelecimentos_csv.zip`
    - Tamanho: 56.104.160 bytes | SHA-256: `479BFB9950AAA1C7392EEA362E953815B7EE92B702F2216F3A2A87E0918A2E88`
  - `data/raw/cnes_extracted_20260904/cnes_estabelecimentos.csv`
    - Tamanho: 229.827.640 bytes | SHA-256: `F91456DA6135C42B6B41E31FEC41955CB0EDCDB4963D71CDE92E4F6C4355E0C9`
    - Competência de Ingestão: 04/09/2026. Origem de 8.212 estabelecimentos reais.
- **Lote Oficial Atualizado (Download de 06/09/2026):**
  - `data/raw/cnes/2026-09-05/cnes_estabelecimentos_csv.zip`
    - Tamanho: 56.121.369 bytes | SHA-256: `2B09E0978553C05918D3B6CE97EE85819904B56526E1DC6BBA385B8EDF66C4E6`
    - Data do Servidor S3: `Sat, 05 Sep 2026 06:59:01 GMT`.

## 3. Diretrizes de Ingestão e Governança
- **Preservação Canônica:** O lote atualizado de 05/09/2026 foi armazenado em diretório de lote isolado (`data/raw/cnes/2026-09-05/`) e **NÃO** sobrescreveu a base ativa nem disparou reingestão automática, mantendo o banco `prisma/dev.db` com os exatos 8.212 estabelecimentos homologados nas etapas anteriores.
- **Rastreabilidade de Mantenedoras:** O CNES fornece o campo `CNPJ_MANTENEDORA` e `NO_FANTASIA` utilizados nas regras de agrupamento 1.0.0.
