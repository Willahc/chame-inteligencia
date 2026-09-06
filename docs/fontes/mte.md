# Documentação de Fonte: Ministério do Trabalho e Emprego (MTE / PDET / Novo CAGED / RAIS)

## 1. Identificação da Fonte
- **Órgão:** Ministério do Trabalho e Emprego (MTE) / Programa de Disseminação das Estatísticas do Trabalho (PDET)
- **Servidores Oficiais:**
  - `http://pdet.mte.gov.br/`
  - `ftp://ftp.mtps.gov.br/pdet/`
- **Finalidade no Chame Inteligência:** Fornecer definições metodológicas, agrupamento setorial de atividades econômicas e estruturas de dados de estabelecimentos para futuro cálculo de volume de colaboradores e estimativa de demanda de mobilidade corporativa.

## 2. Artefatos Locais e Hashes
- `data/raw/mte/NOTA_TECNICA_microdados.pdf`
  - Tamanho: 135.423 bytes | SHA-256: `85BF4B5BF9FB2B72468095CBF2DCF743BBF3CF974E40566A046E5D9AEC23642A`
  - Conteúdo: Nota técnica oficial sobre a geração e anonimização de dados estatísticos do trabalho.
- `data/raw/mte/Sobre_o_Novo_Caged.pdf`
  - Tamanho: 83.781 bytes | SHA-256: `33568C7D34AA472CD28B1834CEE2DF22F22F6ABCD110BBEAADD00593A7787234`
  - Conteúdo: Metodologia e transição do CAGED histórico para o Novo CAGED integrado ao eSocial.
- `data/raw/mte/Comunicado_Grupamento_Atividades_Economicas.pdf`
  - Tamanho: 345.046 bytes | SHA-256: `43E613D45E5CFDAF1ACC7F09E2976DCA3F24BF452F19CEC1498F1F269B6B838B`
  - Conteúdo: Tabela de correspondência e agrupamento de setores e subsetores econômicos.
- `data/raw/mte/Layout_Novo_Caged_Movimentacao.xlsx`
  - Tamanho: 293.931 bytes | SHA-256: `0490F7EF84FD05DB2D89CF22F56D8CF7262CEB14C9D7DB1CCA2BAE422E6423CE`
  - Conteúdo: Dicionário das variáveis de movimentação agregada por estabelecimento, município e CNAE.
- `data/raw/mte/Leia_me_Novo_Caged.txt`
  - Tamanho: 1.084 bytes | SHA-256: `F90CA43706C47AA8051C0427AEB9478E3EA699902A8F0814785C6C10537786DE`
- `data/raw/mte/RAIS_estabelecimento_layout2018e2019.xls`
  - Tamanho: 809.984 bytes | SHA-256: `B94A9E01E5274CB1CAACDB076B8606D9230B7395F539A37BC4239A2FE622699A`
  - Conteúdo: Layout detalhado da RAIS Estabelecimentos (faixas de empregados por CNPJ/estabelecimento).

## 3. Conformidade com LGPD e Privacidade
- **Exclusão de Microdados Individuais:** Em conformidade estrita com o `AGENTS.md` e a LGPD, arquivos contendo microdados individuais de trabalhadores (CPF, salários, admissão/demissão individual) **NÃO FORAM BAIXADOS**. Apenas arquivos metodológicos, dicionários e layouts foram transferidos.
- **Foco em Estabelecimentos:** Qualquer futura utilização de dados do MTE limitará o processamento a estatísticas agregadas por CNPJ de estabelecimento ou por setor/município.
