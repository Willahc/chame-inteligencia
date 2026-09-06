# Documentação de Fonte: Agência Nacional de Saúde Suplementar (ANS)

## 1. Identificação da Fonte
- **Órgão:** Agência Nacional de Saúde Suplementar (ANS) / Ministério da Saúde
- **Portal Oficial:** `https://dadosabertos.ans.gov.br/FTP/PDA/`
- **Finalidade no Chame Inteligência:**
  - Mapear operadoras ativas de planos de saúde para segmentação comercial B2B.
  - Identificar solicitações de alteração de rede hospitalar (inclusão/exclusão de hospitais credenciados), gerando sinais preditivos de demanda de mobilidade.

## 2. Artefatos Locais e Hashes
- `data/raw/ans/2026-09-04/Relatorio_cadop.csv`
  - Tamanho: 349.017 bytes | SHA-256: `8C4CFA65D27664EE6E6282CC393D6AB3BCC632A16486517D6DC1E7D039FD774E`
  - Conteúdo: Cadastro de Operadoras de Planos de Saúde Ativas (Registro ANS, CNPJ, Razão Social, Modalidade, Endereço).
- `data/raw/ans/dicionario_de_dados_das_operadoras_ativas.ods`
  - Tamanho: 52.584 bytes | SHA-256: `C36CC1E07ED936976D251E989EED5B3A17AAACD51C205DEA81399D6E14C7E4F9`
- `data/raw/ans/dicionario_produtos_prestadores_hospitalares.ods`
  - Tamanho: 20.400 bytes | SHA-256: `D89C816E6C48491C5271FAE31FB773756C48C6D6EE5EEC799B6BBC3334DFCE78`
- `data/raw/ans/dicionario_alteracao_rede_hospitalar.ods`
  - Tamanho: 19.928 bytes | SHA-256: `F0A09D2F4BD1BE12C9EAE3A8307D48D88BB58A22F77F60C51AD1AB30E284A8F0`
- `data/raw/ans/dicionario_de_dados_sib.ods`
  - Tamanho: 25.430 bytes | SHA-256: `624EA5CF278904A2538BABA20D52AD911BC0074016EFCE38E080A8279318D9CA`
- `data/raw/ans/pda-046-solicitacoes_alteracao_rede_hospitalar-2026.zip`
  - Tamanho: 5.896.030 bytes | SHA-256: `A6DA13B7AA082654EE45719FD15B54167CAC8DCD56D48AADF493031F36C0253E`
  - Conteúdo: Solicitações de alteração de rede hospitalar protocoladas na ANS ao longo de 2026.

## 3. Governança e Regras Críticas
- **Proibição de Contatos Automáticos de Representantes:** O CADOP contém nomes de diretores e representantes legais das operadoras. Conforme regra explícita de governança, esses nomes **NÃO** são importados como contatos na tabela `ContatoProfissional`.
- **Exclusão de Bases Massivas sem Demanda Direta:** A base de prestadores hospitalares de 1,45 GB e o SIB de 346 MB não foram baixados neste momento por não fazerem parte do escopo restrito do Núcleo Hospitalar.
