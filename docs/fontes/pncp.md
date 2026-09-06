# Documentação de Fonte: PNCP (Portal Nacional de Contratações Públicas)

## 1. Identificação da Fonte
- **Órgão:** Comitê Gestor da Rede Nacional de Contratações Públicas / Governo Federal
- **Portais Oficiais:**
  - `https://pncp.gov.br/`
  - `https://pncp.gov.br/api/consulta/`
  - Swagger/OpenAPI: `https://pncp.gov.br/api/consulta/v3/api-docs`
- **Finalidade no Chame Inteligência:** Identificar contratações públicas de serviços de mobilidade corporativa, transporte de passageiros, táxi, locação de frotas com motorista, transporte sanitário e remoção de pacientes no setor hospitalar e de saúde do Estado de São Paulo.

## 2. Artefatos Locais e Hashes
- `data/raw/pncp/consultas_pncp_sinais_contratacao.json`
  - Tamanho: 581.853 bytes
  - SHA-256: `FB63CFB0D2508A496AFE0227267AE4B9D865E13A36C6792783EFD905E8F8BE26`
  - Competência da Consulta: Publicações oficiais entre `2026-08-01` e `2026-09-06`.
  - Recorte Geográfico: Estado de São Paulo (`uf=SP`).
  - Modalidades Analisadas: Pregão Eletrônico (código 6) e Dispensa de Licitação (código 8).

## 3. Métricas da Extração e Sinais Identificados
- **Total de Processos Varridos:** 2.500 editais e termos de contratação.
- **Correspondências em Saúde/Hospitalar:** 544 processos relacionados a hospitais, unidades de saúde e secretarias de saúde.
- **Sinais Fortes de Mobilidade / Transporte:** 175 processos com termos específicos como "transporte de pacientes", "locação de veículos", "ambulância/remoção", "táxi", "transporte sanitário" e "apoio logístico".

## 4. Governança e Uso
- **Diferenciação Canônica:** Estes sinais constituem `FATO_PUBLICO` proveniente do diário oficial / PNCP. Quando vinculados a uma conta comercial ou hospital específico, devem ser tratados com rastreabilidade de URL do processo e número de controle PNCP.
- **Persistência governada:** O lote foi ingerido na entidade aditiva `SinalContratacaoPublica` como `FATO_PUBLICO`, com fonte, lote, hash e idempotência. Não houve alteração ou remoção de instituições, grupos, contas ou contatos existentes.
