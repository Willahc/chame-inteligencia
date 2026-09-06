# Relatório de Integração Visual de Todas as Fontes Oficiais e Auxiliares

Data de referência: 06/09/2026  
Projeto: Chame Inteligência  
Diretório: `C:\Users\kbadmin\Documents\Projetos\Chame Táxi\chame-inteligencia`

---

## 1. Sumário Executivo

Este documento consolida a integração completa, visual e estruturada de todos os conjuntos de dados já baixados e preservados em `data/raw/` no projeto **Chame Inteligência**, sem realização de novos downloads ou scraping externo.

A integração preservou estritamente:
- **8.212** instituições canônicas `FATO_OFICIAL` (origem CNES/DataSUS);
- **5** instituições isoladas `DEMONSTRACAO`;
- Agrupamento organizacional canônico versão **1.0.0** (7.550 grupos econômicos reais: 7.308 fatos oficiais e 242 hipóteses);
- Segmentação comercial canônica versão **2.1.0** e contas comerciais (7.550 contas comerciais reais + 5 de demonstração);
- **123** contatos profissionais públicos B2B (estritamente impessoais e com finalidade comercial legítima);
- Separação ontológica rigorosa entre as categorias canônicas: `FATO_OFICIAL`, `FATO_PUBLICO`, `DADO_TERCEIRO_NAO_CANONICO`, `INFERENCIA`, `HIPOTESE` e `DEMONSTRACAO`;
- **Nenhum commit automático** criado;
- **Zero dados pessoais** não autorizados (zero CPFs, zero representantes ou sócios, zero telefones e e-mails pessoais, zero dados de trabalhadores individuais).

---

## 2. Inventário de Fontes: Integradas vs. Pendentes

| Fonte de Dados | Órgão / Custodiante | Arquivo de Origem (`data/raw/`) | Tipo Canônico | Registros | Status de Integração |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **CNES** | Ministério da Saúde / DataSUS | `cnes/` (canônico e lote 05/09/2026) | `FATO_OFICIAL` | 8.212 | **Integrada** (base canônica ativa) |
| **PNCP (Sinais)** | Governo Federal / PNCP | `pncp/consultas_pncp_sinais_contratacao.json` | `FATO_PUBLICO` | 544 | **Integrada** (editais e dispensas) |
| **PNCP (Contratos)** | Governo Federal / PNCP | `pncp/contratos_pncp_saude_mobilidade_sp_2026.json` | `FATO_PUBLICO` | 1.474 | **Integrada** (contratos confirmados) |
| **BrasilAPI** | Espelho Público de CNPJ | Camada persistida (`EnriquecimentoCNPJTerceiro`) | `DADO_TERCEIRO_NAO_CANONICO` | 2.996 | **Integrada** (camada auxiliar) |
| **ANS (CADOP)** | ANS | `ans/2026-09-04/Relatorio_cadop.csv` | `FATO_OFICIAL` | 1.113 | **Integrada** (operadoras ativas) |
| **IBGE** | IBGE | `ibge/municipios_ibge.json` (gzip) | `FATO_OFICIAL` | 5.571 | **Integrada** (malha territorial) |
| **MTE / Novo CAGED** | Ministério do Trabalho | `mte/trabalho_caged_sp_2026.csv` | `FATO_PUBLICO` | 4 | **Integrada** (estatísticas agregadas) |
| **Receita Federal** | RFB | Nenhum arquivo de dados baixado | `FATO_OFICIAL` | 0 | **Pendente** (servidores RFB indisponíveis) |

---

## 3. Cobertura Institucional Detalhada

- **Total de Instituições Reais**: 8.212 hospitais e estabelecimentos de saúde em São Paulo.
- **Cobertura Territorial (IBGE)**: 8.212 estabelecimentos (100%) mapeados com código IBGE de 6 e 7 dígitos, microrregião, mesorregião e coordenadas político-administrativas.
- **Cobertura Contextual de Emprego (MTE)**: 8.212 estabelecimentos (100%) com indicadores setoriais da Saúde Humana (CNAE 86 / Seção Q).
- **Cobertura Cadastral de Terceiros (BrasilAPI)**: 2.996 CNPJs únicos prioritários (100% dos CNPJs candidatos no universo hospitalar SP).
- **Cobertura de Operadoras ANS (CADOP)**: 1.113 operadoras importadas no banco; 31 estabelecimentos com vínculo cadastral de operadora no CNES exibem dados de registro, modalidade e situação operacional.
- **Cobertura de Compras Públicas (PNCP)**:
  - Total de registros: 2.018 (544 editais/dispensas de compras + 1.474 contratos confirmados);
  - Vínculos unívocos diretos por CNPJ: 156 estabelecimentos de saúde;
  - Registros gerais sem vínculo direto ao CNES: 1.862 registros (preservados no painel geral sem vinculação forçada).
- **Cobertura Oficial da Receita Federal**:
  - 0% (0 registros em `EmpresaReceita`). Exibe status visual claro de *"Fonte oficial pendente"* com disclaimer de governança, mantendo a camada auxiliar BrasilAPI ativa sem bloqueio da experiência do usuário.

---

## 4. Telas, Rotas e Componentes Implementados / Atualizados

### 4.1. Nova Rota `/cobertura` (Painel Geral de Cobertura de Dados)
- Arquivos: `src/app/cobertura/page.tsx` e `src/components/cobertura-client.tsx`.
- Visualização de cards métricos para todas as 7 fontes do projeto.
- Barras de progresso e cobertura percentual sobre o universo de 8.212 instituições.
- Painel interativo de fontes com filtros por tipo canônico (`FATO_OFICIAL`, `FATO_PUBLICO`, etc.) e por status (`Ativa`, `Pendente`, `Auxiliar`).
- Descrição da custódia, confiança, formato de arquivo e aviso de governança para cada conjunto.

### 4.2. Detalhe da Instituição (`/instituicoes/[slug]`)
- Arquivo: `src/app/instituicoes/[slug]/page.tsx`.
- Seções integradas:
  - **Dados Cadastrais Oficiais da Receita Federal**: Banner de pendência oficial informativa com disclaimer;
  - **Dados Cadastrais Auxiliares (BrasilAPI)**: CNAE principal, natureza jurídica, porte, data de abertura, capital social e situação cadastral com badge `DADO_TERCEIRO_NAO_CANONICO`;
  - **Dados Cadastrais da Operadora ANS**: Exibido quando a instituição é mantida por operadora ou possui registro no CADOP (registro ANS, modalidade, situação operacional);
  - **Contexto Territorial e Regional (IBGE)**: Município, código IBGE de 6 e 7 dígitos, microrregião, mesorregião e macrorregião administrativa;
  - **Indicadores Setoriais de Emprego (MTE / Novo CAGED)**: Panorama municipal/estadual de empregos formais na saúde com disclaimer de que não reflete o quadro individual;
  - **Contratações Públicas Relacionadas (PNCP)**: Lista paginada interativa com badges de `Sinal de Compra` vs `Contrato Confirmado`, valores estimados e tags de mobilidade.

### 4.3. Detalhe da Conta Comercial (`/contas/[id]`)
- Arquivo: `src/app/contas/[id]/page.tsx`.
- Visualização consolidada em nível de grupo econômico / mantenedora agregando contexto geográfico IBGE, indicadores setoriais MTE, enriquecimento fiscal de terceiros, operadoras ANS vinculadas e histórico de contratações públicas PNCP.

### 4.4. Painel Geral de Contratações Públicas (`/contratacoes-publicas`)
- Arquivo: `src/components/contratacoes-publicas-client.tsx`.
- Suporte a 2.018 registros do PNCP com paginação interativa (sem cortes artificiais por `slice(0, 10)`).
- Filtros múltiplos: busca textual (objeto, órgão, fornecedor, CNPJ, ID), categoria (`SINAIS` vs `CONTRATOS`), mobilidade (`MOBILIDADE` vs `SEM_MOBILIDADE`), vínculo institucional (`VINCULADOS` vs `SEM_VINCULO`), município e modalidade de compra.

### 4.5. Filtros do Radar Comercial (`/radar`)
- Arquivos: `src/domain/filtros.ts`, `src/domain/tipos.ts` e `src/lib/dados.ts`.
- Novos filtros disponíveis:
  - `possuiEnriquecimentoTerceiro`: filtrar instituições com dados auxiliares de CNPJ;
  - `situacaoCadastral`: filtrar por status (ex.: ATIVA);
  - `possuiANS`: filtrar estabelecimentos vinculados a operadoras de planos de saúde;
  - Preservação integral dos filtros existentes de prioridade, porte, expansão e segmentação 2.1.0.

---

## 5. Modelos Prisma Adicionados / Atualizados

```prisma
// Modelo de Operadoras ANS (CADOP)
model OperadoraANS {
  id                    String         @id
  registroAns           String         @unique
  cnpj                  String         @index
  razaoSocial           String
  nomeFantasia          String?
  modalidade            String
  situacaoOperacional   String
  tipoDado              TipoDado       @default(FATO_OFICIAL)
  // Sem dados pessoais: zero representantes, CPFs ou contatos individuais
}

// Modelo de Municípios e Malha Territorial (IBGE)
model MunicipioIBGE {
  id                    String         @id // 7 dígitos
  codigoIbge6           String         @index // 6 dígitos (CO_IBGE do CNES)
  nome                  String
  ufSigla               String
  ufNome                String
  regiaoNome            String
  tipoDado              TipoDado       @default(FATO_OFICIAL)
}

// Modelo de Indicadores Setoriais Agregados (MTE / Novo CAGED)
model IndicadorMTE {
  id                    String         @id @default(cuid())
  municipio             String
  uf                    String
  codigoIbge6           String?        @index
  setorCnae             String
  descricaoSetor        String
  periodo               String
  indicador             String
  quantidadeAgregada    String
  tipoDado              TipoDado       @default(FATO_PUBLICO)
  // Zero registros de trabalhadores individuais
}

// Atualização no SinalContratacaoPublica
model SinalContratacaoPublica {
  // ...
  categoriaPNCP         String         @default("SINAL_CONTRATACAO") // SINAL_CONTRATACAO | CONTRATO_CONFIRMADO
  tipoContrato          String?
  fornecedorCNPJ        String?
  fornecedorNome        String?
}
```

---

## 6. Governança e Regras de Privacidade Rigorosamente Atendidas

1. **Minimização de Dados**:
   - Zero campos de CPF, representantes legais, sócios ou diretores (QSA descartado na sanitização);
   - Zero e-mails ou telefones residenciais ou particulares;
   - Nenhum dado individual de trabalhadores do Novo CAGED (apenas estatísticas agregadas por CNAE e município).
2. **Separação Ontológica**:
   - CNES, IBGE e ANS CADOP: `FATO_OFICIAL`;
   - PNCP e MTE: `FATO_PUBLICO`;
   - BrasilAPI: `DADO_TERCEIRO_NAO_CANONICO` (não canônico, confiança média, revisão pendente);
   - Receita Federal em Lote: `FATO_OFICIAL` (0 registros no momento, pendente de liberação da RFB).
3. **Impedimento de Associações Arbitrárias**:
   - Registros do PNCP da Secretaria Estadual da Saúde (órgão gestor com centenas de unidades) não são associados artificialmente a um hospital específico sem a presença explícita do CNPJ da unidade;
   - Vínculo institucional somente via CNPJ exato e unívoco.
4. **Isolamento de Demonstrações**:
   - Modo Demonstração exibe apenas as 5 contas e instituições marcadas com `DEMONSTRACAO`;
   - Modo Real exibe estritamente dados canônicos (`FATO_OFICIAL`), jamais misturando registros simulados.

---

## 7. Validações e Testes Executados

| Verificação | Comando | Resultado |
| :--- | :--- | :---: |
| **Linting** | `npm run lint` | **Aprovado** (0 erros, 0 avisos) |
| **Typecheck** | `npm run typecheck` | **Aprovado** (0 erros de tipagem) |
| **Testes Automatizados** | `npm test` | **160 aprovados** em 23 arquivos de teste |
| **Build de Produção** | `npm run build` | **Aprovado** (Next.js 16 Turbopack, 13 rotas compiladas) |
| **Auditoria de Segurança** | `npm audit` | **0 vulnerabilidades** |
| **Verificação Git** | `git diff --check` | **Aprovado** (sem conflitos ou whitespaces inválidos) |

---

## 8. Conclusão

Todas as fontes de dados oficiais e auxiliares já preservadas localmente em `data/raw/` estão plenamente estruturadas, persistidas de modo idempotente e integradas com excelência visual à interface da aplicação. As regras de governança, isolamento de dados de teste, ausência de dados pessoais e neutralidade das métricas canônicas foram 100% cumpridas.
