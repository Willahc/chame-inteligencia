# Documentação de Fonte: Receita Federal do Brasil (CNPJ)

## 1. Identificação da Fonte
- **Órgão:** Secretaria Especial da Receita Federal do Brasil / Ministério da Fazenda
- **Portais Oficiais:**
  - `https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj`
  - `https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj`
  - `https://dadosabertos.rfb.gov.br/CNPJ/`
- **Finalidade no Chame Inteligência:** Resolução cadastral de matriz/filial, razão social canônica, CNAE fiscal primário/secundário, situação cadastral e data de início de atividade para enriquecimento oficial dos 322 CNPJs prioritários do Núcleo Hospitalar.

## 2. Artefatos Locais e Hashes
- `data/raw/receita/cnpj-metadados.pdf`
  - Tamanho: 59.315 bytes
  - SHA-256: `0A52D6BDFB61A07425E352A0E692932306A5EC9ECAD682F5F9E28059E1A5FCE0`
  - Conteúdo: Dicionário oficial de campos dos arquivos de Empresas, Estabelecimentos, Motivos, Municípios, Naturezas, Países, Qualificações e Simples.

## 3. Diagnóstico de Disponibilidade dos Lotes Brutos
- **Servidores de Arquivos:** `dadosabertos.rfb.gov.br` (ETIMEDOUT persistente) e `arquivos.receitafederal.gov.br` (HTTP 401 Unauthorized).
- **Catálogo de Dados Abertos:** A API do portal `dados.gov.br` respondeu 401 Unauthorized para solicitações automáticas.
- **Status do Gate 4:** `GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL`.

## 4. Governança e Regras Específicas
- **Proibição de Agregadores:** Não utilizar APIs privadas, espelhos não oficiais ou plataformas de terceiros (ex: Minha Receita, BrasilAPI, CNPJ.ws, Casa dos Dados).
- **Proibição de Sócios/QSA e Pessoas Físicas:** A tabela de Sócios (QSA) não deve ser baixada ou ingerida para evitar tratamento de CPFs ou dados pessoais.
- **Isolamento e Idempotência:** O script `scripts/importar-receita-local.ts` e `scripts/testar-idempotencia-receita.ts` estão prontos para processar os arquivos descompactados (`Estabelecimentos*.csv`, `Empresas*.csv`) assim que os servidores da Receita forem restabelecidos.
