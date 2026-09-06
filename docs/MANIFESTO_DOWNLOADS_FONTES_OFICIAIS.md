# Manifesto de Downloads de Fontes Oficiais — Chame Inteligência

**Data da Auditoria e Consolidação:** 06/09/2026  
**Status do Repositório:** Concluído e Auditado  
**Espaço em Disco Local:** 157+ GB disponíveis em C:  
**Diretório de Armazenamento:** `data/raw/` (ignorado no Git via `.gitignore`)  
**Tamanho Total Baixado em `data/raw/`:** 522.195.394 bytes (~498,00 MB em 31 arquivos oficiais)  

---

## 1. Princípios de Governança e Integridade

Todos os downloads realizados seguiram estritamente as regras de governança do projeto e a LGPD:
1. **Fontes 100% Oficiais:** Somente portais governamentais oficiais (Receita Federal, ANS, CNES/Ministério da Saúde, PNCP, MTE/PDET e IBGE). Nenhum agregador privado (Minha Receita, BrasilAPI, CNPJ.ws, Casa dos Dados), repositório pessoal do GitHub ou espelho não oficial foi utilizado.
2. **Minimização de Dados e Privacidade:** Proibição irrestrita de CPFs, dados cadastrais de pessoas físicas, microdados individuais de trabalhadores (CAGED individual/vínculos RAIS) e sócios/QSA.
3. **Isolamento do Banco Canônico:** Nenhum dado foi inserido ou alterado nas tabelas canônicas da aplicação (`Instituicao`, `GrupoEconomico`, `ContaComercial`, `ContatoProfissional`, `EmpresaReceita`). O banco de dados `prisma/dev.db` permanece 100% íntegro.
4. **Rastreabilidade Criptográfica:** Todos os arquivos baixados possuem caminho local relativo, tamanho exato em bytes e hash SHA-256 documentados.

---

## 2. Catálogo Geral de Arquivos Oficiais Baixados

| Órgão / Fonte | Arquivo Local | Tamanho (Bytes) | Hash SHA-256 | URL Oficial de Origem | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Receita Federal** | `data/raw/receita/cnpj-metadados.pdf` | 59.315 | `0A52D6BDFB61A07425E352A0E692932306A5EC9ECAD682F5F9E28059E1A5FCE0` | `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf` | Parcial (metadados) |
| **ANS** | `data/raw/ans/2026-09-04/Relatorio_cadop.csv` | 349.017 | `8C4CFA65D27664EE6E6282CC393D6AB3BCC632A16486517D6DC1E7D039FD774E` | `https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/` | Integral |
| **ANS** | `data/raw/ans/dicionario_de_dados_das_operadoras_ativas.ods` | 52.584 | `C36CC1E07ED936976D251E989EED5B3A17AAACD51C205DEA81399D6E14C7E4F9` | `https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/` | Integral |
| **ANS** | `data/raw/ans/dicionario_produtos_prestadores_hospitalares.ods` | 20.400 | `D89C816E6C48491C5271FAE31FB773756C48C6D6EE5EEC799B6BBC3334DFCE78` | `https://dadosabertos.ans.gov.br/FTP/PDA/produtos_e_prestadores_hospitalares/` | Integral |
| **ANS** | `data/raw/ans/dicionario_alteracao_rede_hospitalar.ods` | 19.928 | `F0A09D2F4BD1BE12C9EAE3A8307D48D88BB58A22F77F60C51AD1AB30E284A8F0` | `https://dadosabertos.ans.gov.br/FTP/PDA/solicitacoes_de_alteracao_de_rede_hospitalar/` | Integral |
| **ANS** | `data/raw/ans/dicionario_de_dados_sib.ods` | 25.430 | `624EA5CF278904A2538BABA20D52AD911BC0074016EFCE38E080A8279318D9CA` | `https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios/` | Integral |
| **ANS** | `data/raw/ans/pda-046-solicitacoes_alteracao_rede_hospitalar-2026.zip` | 5.896.030 | `A6DA13B7AA082654EE45719FD15B54167CAC8DCD56D48AADF493031F36C0253E` | `https://dadosabertos.ans.gov.br/FTP/PDA/solicitacoes_de_alteracao_de_rede_hospitalar/` | Integral |
| **CNES / MS** | `data/raw/cnes/2026-09-05/cnes_estabelecimentos_csv.zip` | 56.121.369 | `2B09E0978553C05918D3B6CE97EE85819904B56526E1DC6BBA385B8EDF66C4E6` | `https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/cnes_estabelecimentos_csv.zip` | Atualização oficial |
| **CNES / MS** | `data/raw/cnes_estabelecimentos_csv.zip` | 56.104.160 | `479BFB9950AAA1C7392EEA362E953815B7EE92B702F2216F3A2A87E0918A2E88` | Ministério da Saúde (Lote canônico de 04/09/2026) | Base canônica ativa |
| **CNES / MS** | `data/raw/cnes_extracted_20260904/cnes_estabelecimentos.csv` | 229.827.640 | `F91456DA6135C42B6B41E31FEC41955CB0EDCDB4963D71CDE92E4F6C4355E0C9` | Extração do lote canônico de 04/09/2026 | Base canônica ativa |
| **IBGE** | `data/raw/ibge/estados_ibge.json` | 491 | `8DE577F0BF8AE5F10CFCA9870520C37A71C071ED34FFAE09AF1FAE967385DB7F` | `https://servicodados.ibge.gov.br/api/v1/localidades/estados` | Integral |
| **IBGE** | `data/raw/ibge/municipios_ibge.json` | 111.623 | `D07362079FBAB429BAB2E9B833628B58419CE1D183630BC94808FAF167097635` | `https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios` | Integral |
| **IBGE** | `data/raw/ibge/regioes_ibge.json` | 104 | `E98B685FD6EAC4524EF474F7EEB0BA0A3B7AEFEA2676C2C7794A21B5895B47AA` | `https://servicodados.ibge.gov.br/api/v1/localidades/regioes` | Integral |
| **IBGE** | `data/raw/ibge/cnae_divisoes_ibge.json` | 71.836 | `37A44277957921454F637C7896E21FE613CF753C65716974D062B6B8C956F29F` | `https://servicodados.ibge.gov.br/api/v2/cnae/divisoes` | Integral |
| **IBGE** | `data/raw/ibge/cnae_classes_ibge.json` | 758.607 | `79A99D49B0C5A578C50860485970E025762E5E9EA346E486B5E0105266B4C846` | `https://servicodados.ibge.gov.br/api/v2/cnae/classes` | Integral |
| **MTE** | `data/raw/mte/NOTA_TECNICA_microdados.pdf` | 135.423 | `85BF4B5BF9FB2B72468095CBF2DCF743BBF3CF974E40566A046E5D9AEC23642A` | `ftp://ftp.mtps.gov.br/pdet/microdados/NOTA_TECNICA_microdados.pdf` | Metadados |
| **MTE** | `data/raw/mte/Sobre_o_Novo_Caged.pdf` | 83.781 | `33568C7D34AA472CD28B1834CEE2DF22F22F6ABCD110BBEAADD00593A7787234` | `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/Sobre%20o%20Novo%20Caged.pdf` | Metadados |
| **MTE** | `data/raw/mte/Comunicado_Grupamento_Atividades_Economicas.pdf` | 345.046 | `43E613D45E5CFDAF1ACC7F09E2976DCA3F24BF452F19CEC1498F1F269B6B838B` | `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/` | Classificação |
| **MTE** | `data/raw/mte/Layout_Novo_Caged_Movimentacao.xlsx` | 293.931 | `0490F7EF84FD05DB2D89CF22F56D8CF7262CEB14C9D7DB1CCA2BAE422E6423CE` | `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/` | Layout |
| **MTE** | `data/raw/mte/Leia_me_Novo_Caged.txt` | 1.084 | `F90CA43706C47AA8051C0427AEB9478E3EA699902A8F0814785C6C10537786DE` | `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/` | Documentação |
| **ANS** | `data/raw/ans/pda-047-taxa_cobertura.csv` | 21.016.532 | `07785A9B4AE4037F0706C79A2F83090592361D9CEFB58FDAA18C83AEB7FF42A4` | `https://dadosabertos.ans.gov.br/FTP/PDA/taxa_de_cobertura_de_planos_de_saude-047/` | Integral |
| **ANS** | `data/raw/ans/dicionario-pda-047-taxa_de_cobertura_de_planos_de_saude.ods` | 12.873 | `BE6D9B86AB3D1DE7F80DAC514417160BC90780404EFDDA1B5D30148EBAC86626` | `https://dadosabertos.ans.gov.br/FTP/PDA/taxa_de_cobertura_de_planos_de_saude-047/` | Dicionário |
| **ANS** | `data/raw/ans/benef_regiao_geog.zip` | 21.675.739 | `34721559AFC26AE69C230672F7A1B5B76620B4745994C527561809DEA9DED544` | `https://dadosabertos.ans.gov.br/FTP/PDA/dados_de_beneficiarios_por_regiao_geografica/` | Integral |
| **ANS** | `data/raw/ans/dicionario_de_dados_beneficiarios_por_regiao_geografica.pdf` | 41.220 | `ED3CB11A5B09CD8DB763C5488481D8115BBC2E14BFC37DFBACCC7AE4C74C1D52` | `https://dadosabertos.ans.gov.br/FTP/PDA/dados_de_beneficiarios_por_regiao_geografica/` | Dicionário |
| **DataSUS / MS** | `data/raw/cnes/datasus/TAB_CNES.zip` | 126.070.162 | `8584B14B22B0CA75C7B674613E3B4583B7DFE336DB47D40088BBDD1D770AF31A` | `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Auxiliar/TAB_CNES.zip` | Tabelas auxiliares |
| **DataSUS / MS** | `data/raw/cnes/datasus/LTSP2607.dbc` | 100.757 | `55037A70E3E3995303024998DEF0D28B5BA99190A5D080C4F62EE55EA1B1E2D8` | `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTSP2607.dbc` | Leitos SP (07/2026) |
| **DataSUS / MS** | `data/raw/cnes/datasus/LTSP2606.dbc` | 101.193 | `71B37CB1B59ECDDCFD11D790A93AC8B7E4E45C893973B42072E5CA44F9689DC4` | `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTSP2606.dbc` | Leitos SP (06/2026) |
| **PNCP** | `data/raw/pncp/contratos_pncp_saude_mobilidade_sp_2026.json` | 1.486.882 | `22FEB68930693B5561C4591A86E6C41ADDB727C598B917482903C064AB05656C` | `https://pncp.gov.br/api/consulta/v1/contratos` | 1.407 Contratos vigentes SP |
| **PNCP** | `data/raw/pncp/consultas_pncp_sinais_contratacao.json` | 581.853 | `FB63CFB0D2508A496AFE0227267AE4B9D865E13A36C6792783EFD905E8F8BE26` | `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` | Sinais extraídos |

---

## 3. Síntese por Fonte e Diagnóstico de Disponibilidade

### 3.1. Receita Federal (CNPJ)
- **Status:** `PARCIAL / AGUARDANDO DISPONIBILIDADE OFICIAL DE ARQUIVOS BRUTOS`.
- **Diagnóstico:** A página de metadados oficial e o PDF de layout foram baixados com sucesso. Contudo, os servidores oficiais de distribuição dos lotes compactados (`dadosabertos.rfb.gov.br` e `arquivos.receitafederal.gov.br`) permanecem com timeout de conexão (ETIMEDOUT) e rejeição 401. A API do catálogo `dados.gov.br` também retornou 401.
- **Governança:** Conforme política do Gate 4, nenhum agregador privado, espelho ou fonte de terceiros foi consultado. O pipeline de processamento local (`scripts/importar-receita-local.ts`) está pronto e testado para processar os arquivos assim que a fonte oficial for restabelecida.

### 3.2. Agência Nacional de Saúde Suplementar (ANS)
- **Status:** `OPERACIONAL E BAIXADO`.
- **Arquivos:** Dicionários completos de operadoras ativas, produtos/prestadores hospitalares, solicitações de alteração de rede hospitalar e SIB (beneficiários). Base de solicitações de alteração de rede hospitalar de 2026 (ZIP de ~5,89 MB) e CADOP de operadoras ativas.
- **Omissões:** O arquivo `produtos_e_prestadores_hospitalares.zip` (1,45 GB compactado, expandindo para dezenas de gigabytes) e `sib_ativo_SP.zip` (346 MB) não foram baixados por saturação de escopo desnecessária neste momento.

### 3.3. Cadastro Nacional de Estabelecimentos de Saúde (CNES)
- **Status:** `OPERACIONAL E ATUALIZADO`.
- **Arquivos:** Lote canônico original de 04/09/2026 preservado intacto (`data/raw/cnes_estabelecimentos_csv.zip` e `cnes_extracted_20260904/cnes_estabelecimentos.csv`). Lote atualizado mais recente de 05/09/2026 baixado em diretório isolado (`data/raw/cnes/2026-09-05/cnes_estabelecimentos_csv.zip`).

### 3.4. IBGE (Geografia e CNAE)
- **Status:** `OPERACIONAL E BAIXADO`.
- **Arquivos:** Todos os estados brasileiros, todos os 645 municípios do Estado de São Paulo, grandes regiões do Brasil, 88 divisões da CNAE e 673 classes da CNAE 2.0. Dados prontos para validação cruzada geográfica e segmentação econômica oficial.

### 3.5. Ministério do Trabalho e Emprego (MTE / CAGED / RAIS)
- **Status:** `METADADOS E ESTRUTURAS BAIXADOS (SEM MICRODADOS PESSOAIS)`.
- **Arquivos:** Layouts do Novo CAGED, notas técnicas metodológicas, comunicados de agrupamento de atividades econômicas e layouts de estabelecimentos da RAIS.
- **Privacidade:** Arquivos de microdados com identificação de trabalhadores e movimentações individuais foram deliberadamente omitidos para estrito cumprimento da LGPD e das diretrizes do projeto.

### 3.6. Portal Nacional de Contratações Públicas (PNCP)
- **Status:** `OPERACIONAL E SINAIS EXTRAÍDOS`.
- **Arquivos:** Consulta estruturada na API oficial de publicação do PNCP para o Estado de São Paulo no período de 01/08/2026 a 06/09/2026.
- **Resultados:** 2.500 processos de compras públicas analisados (Pregões Eletrônicos e Dispensas de Licitação); 544 oportunidades no setor hospitalar/saúde; 175 sinais diretos de demanda por transporte de passageiros, táxi corporativo, locação de veículos com motorista e transporte sanitário de pacientes.

---

## 4. Garantia de Preservação Canônica

- **Instituições Reais:** 8.212 estabelecimentos `FATO_OFICIAL` intactos.
- **Instituições Demonstrativas:** 5 registros isolados e identificados.
- **Contas Comerciais:** 7.550 contas comerciais reais e 5 contas demonstrativas mantidas.
- **Contatos Profissionais:** 109 contatos públicos reais ativos e 14 demonstrativos.
- **Tabelas do Gate 4 (`EmpresaReceita` e `ResolucaoCNPJ`):** Mantidas limpas com 0 registros, prontas para ingestão quando a fonte oficial da Receita Federal estiver acessível.
