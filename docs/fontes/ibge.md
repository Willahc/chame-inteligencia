# Documentação de Fonte: IBGE (Instituto Brasileiro de Geografia e Estatística)

## 1. Identificação da Fonte
- **Órgão:** Instituto Brasileiro de Geografia e Estatística (IBGE) / Ministério do Planejamento e Orçamento
- **Portais Oficiais:**
  - `https://servicodados.ibge.gov.br/api/v1/localidades/`
  - `https://servicodados.ibge.gov.br/api/v2/cnae/`
  - `https://concla.ibge.gov.br/`
- **Finalidade no Chame Inteligência:**
  - Padronização oficial de códigos de municípios e UFs para geolocalização e cruzamento com CNES, Receita e PNCP.
  - Classificação Nacional de Atividades Econômicas (CNAE 2.0) para estruturar a taxonomia de atividades hospitalares e de transporte.

## 2. Artefatos Locais e Hashes
- `data/raw/ibge/estados_ibge.json`
  - Tamanho: 491 bytes | SHA-256: `8DE577F0BF8AE5F10CFCA9870520C37A71C071ED34FFAE09AF1FAE967385DB7F`
  - Conteúdo: Lista de todas as 27 Unidades da Federação com siglas e códigos IBGE.
- `data/raw/ibge/municipios_ibge.json`
  - Tamanho: 111.623 bytes | SHA-256: `D07362079FBAB429BAB2E9B833628B58419CE1D183630BC94808FAF167097635`
  - Conteúdo: Todos os 645 municípios do Estado de São Paulo com seus respectivos códigos oficiais de 7 dígitos.
- `data/raw/ibge/regioes_ibge.json`
  - Tamanho: 104 bytes | SHA-256: `E98B685FD6EAC4524EF474F7EEB0BA0A3B7AEFEA2676C2C7794A21B5895B47AA`
  - Conteúdo: As 5 grandes regiões do Brasil.
- `data/raw/ibge/cnae_divisoes_ibge.json`
  - Tamanho: 71.836 bytes | SHA-256: `37A44277957921454F637C7896E21FE613CF753C65716974D062B6B8C956F29F`
  - Conteúdo: As 88 divisões da CNAE 2.0 (ex: Divisão 86: Atividades de atenção à saúde humana; Divisão 49: Transporte terrestre).
- `data/raw/ibge/cnae_classes_ibge.json`
  - Tamanho: 758.607 bytes | SHA-256: `79A99D49B0C5A578C50860485970E025762E5E9EA346E486B5E0105266B4C846`
  - Conteúdo: As 673 classes oficiais da CNAE 2.0 (ex: 86.10-1 Atividades de atendimento hospitalar; 49.23-0 Transporte de passageiros - táxi).

## 3. Governança e Uso
- **Fonte Primária da Verdade Geográfica e Econômica:** O IBGE é a autoridade canônica para códigos de municípios e taxonomia de atividades econômicas no Brasil.
- **Isolamento de Banco:** Arquivos salvos em formato JSON aberto, prontos para enriquecer normalizações e filtros em futuras etapas.
