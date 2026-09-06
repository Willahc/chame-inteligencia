# Consolidação da Entidade Conta Comercial

Data: 06/09/2026  
Status: Homologado no MVP Comercial da Chame Táxi

---

## 1. Contexto e Motivação

O radar de inteligência da Chame Táxi originou-se a partir de estabelecimentos individuais cadastrados no CNES (8.212 instituições reais). No entanto, para a operação diária de vendas B2B, a abordagem não ocorre por CNES isolado, mas por **Conta Comercial** (empresa mantenedora, rede hospitalar ou grupo econômico).

A consolidação de contas unifica múltiplos estabelecimentos sob uma única conta de decisão, mantendo rastreabilidade total até cada alvará, unidade e evidência.

---

## 2. Regras Canônicas de Agrupamento em Contas

1. **Rede Multiunidade vira 1 Conta**:
   - Grupos econômicos com vínculo `OFICIAL` (ex.: Rede D'Or, Hapvida, São Mateus) ou `PROVAVEL` (ex.: Fleury, Prevent Senior, AFIP) são consolidados em 1 única conta comercial.
   - Todas as instituições e unidades filiadas são preservadas e vinculadas à conta.
2. **Instituição Isolada vira 1 Conta**:
   - Estabelecimentos sem vínculo com outras unidades (`ISOLADO`) são mapeados 1:1 para sua conta comercial individual.
3. **Nenhuma instituição ou unidade é perdida**:
   - 8.212 instituições reais permanecem vinculadas a suas respectivas 7.550 contas.
   - 8.214 unidades reais pertencem a essas instituições.
4. **Preservação de Natureza e Vínculo**:
   - Vínculos `PROVAVEL` e `INCERTO` continuam explicitamente sinalizados com seus níveis de confiança e status de revisão.
   - Natureza jurídica `PUBLICA` vs `PRIVADA` é herdada sem inversão ou adulteração.
5. **Idempotência Estrita**:
   - O script `scripts/consolidar-contas-comerciais.ts` (ou `npm run consolidar:contas`) pode ser executado repetidas vezes sem criar contas duplicadas nem sobrescrever históricos de abordagem já lançados pelos operadores.

---

## 3. Estado Quantitativo Consolidado

- **Contas Reais**: 7.550 contas
  - Muito Alta: 1 conta
  - Alta: 39 contas
  - Moderada: 348 contas
  - Baixa: 7.162 contas
- **Contas de Demonstração**: 5 contas (Rede Saúde Exemplo, Hospital Modelo Sul, Hospital Alfa, Centro Diagnóstico Modelo, Instituto Clínico Delta)
- **Contatos Ativos**: 123 contatos (109 `FATO_PUBLICO` corporativos em 79 organizações + 14 `DEMONSTRACAO`)
- **Ações Recomendadas no Universo Real**:
  - `ABORDAR_IMEDIATAMENTE`: 20 contas (alta pontuação comercial + contatos verificados disponíveis)
  - `PESQUISAR_MELHOR`: 360 contas (forte potencial, demandando mapeamento de decisores)
  - `BAIXA_PRIORIDADE`: 7.169 contas (entidades públicas ou de baixa demanda imediata)
  - `REVISAR_VINCULO`: 1 conta (revisão de hipótese antes do contato)
