# Relatório de Implementação e Auditoria — GATE 6

**Projeto:** Chame Inteligência  
**Status do Gate:** `GATE 6 — APROVADO`  
**Data:** 07 de Setembro de 2026  
**Responsável:** Antigravity (Pair Programming Assistido)  

---

## 1. Sumário Executivo e Objetivo

O **Gate 6 — Busca Supervisionada de Responsáveis** foi implementado com total conformidade em relação às regras de governança, ética, privacidade e não-fabricação de dados estabelecidas em `AGENTS.md` e no escopo deste Gate.

O objetivo alcançado é permitir que um usuário, dentro do dossiê de uma **Conta Comercial** (`/contas/[id]`), solicite manualmente a busca supervisionada de profissionais potencialmente relacionados à contratação de serviços corporativos (compras, facilities, logística, operações e mobilidade).

### Princípios Rigorosamente Respeitados
1. **Acionamento estritamente sob demanda:** Nenhuma busca automática, em massa, periódica ou em background não supervisionado foi criada.
2. **Confirmação explícita prévia:** O usuário deve obrigatoriamente confirmar em modal os termos éticos e legais antes do disparo da busca.
3. **Não-fabricação absoluta:**
   - Nomes nunca são inventados.
   - Profissionais puramente clínicos (médicos, enfermeiros, cirurgiões etc.) não são transformados em compradores corporativos.
   - Proibição de dedução de e-mail por fórmula (ex.: `nome.sobrenome@dominio.com.br`) ou inferência de telefones pessoais.
   - Quando não há pessoa verificável com cargo corporativo e vínculo documentado, o sistema registra formalmente `SEM_CONTATO_VERIFICAVEL` com as fontes consultadas e termos utilizados.
4. **Proteção de dados pessoais e LGPD:**
   - Proibição de CPF, endereço residencial, telefone pessoal, e-mail pessoal, dados familiares ou de saúde.
   - Tratamento exclusivo de contatos profissionais públicos estritamente B2B.
   - Ausência de scraping autenticado, bypass de login ou quebra de CAPTCHA.
5. **Revisão humana obrigatória:** Contatos identificados entram inicialmente com `statusRevisao: "PENDENTE"` e `ativo: false`, exigindo ação humana explícita de aprovação antes de qualquer ativação operacional.
6. **Desativação auditada:** Possibilidade imediata de desativar e remover contatos da exibição ativa com registro do usuário e justificativa.

---

## 2. Estado Canônico Preservado no Banco de Dados

Todas as contagens canônicas do banco SQLite (`dev.db`) foram rigorosamente preservadas sem perda ou modificação indevida de dados:

| Entidade / Métrica | Contagem no Banco | Status / Governança |
| :--- | :---: | :--- |
| **Instituições Reais** | **8.212** | `FATO_OFICIAL` (CNES SP) — Preservadas |
| **Instituições Demonstração** | **5** | `DEMONSTRACAO` isolada — Preservadas |
| **Agrupamentos Econômicos** | **7.550** | 7.308 oficiais + 242 agrupamentos canônicos (+ 1 demo) |
| **Contas Comerciais** | **7.555** | 7.550 reais + 5 demonstração |
| **Contatos Profissionais Públicos** | **123** | 118 reais + 5 demonstração (canônicos originais) |
| **Processos PNCP (Sinais + Contratos)** | **2.018** | 544 sinais + 1.474 contratos (4 com vínculo exato, 2.014 sem vínculo) |
| **Enriquecimentos BrasilAPI** | **2.996** | `DADO_TERCEIRO_NAO_CANONICO` |
| **Operadoras ANS** | **1.113** | Cadastro Geral da ANS |
| **Municípios IBGE** | **5.571** | Malha territorial municipal completa |
| **Indicadores Agregados MTE** | **4** | Dados agregados setoriais |
| **Empresas Receita Federal** | **0** | **Gate da Receita Federal permanece PENDENTE e fora de escopo** |

---

## 3. Arquitetura e Componentes Implementados

### 3.1. Modelo Canônico de Dados (`prisma/schema.prisma`)
Adicionada a entidade de auditoria de solicitações preservando a integridade referencial com `ContaComercial`:

```prisma
enum StatusSolicitacaoBusca {
  PENDENTE
  EM_PESQUISA
  AGUARDANDO_REVISAO
  CONCLUIDA
  SEM_CONTATO_VERIFICAVEL
  ERRO
}

model SolicitacaoBuscaResponsaveis {
  id                      String                 @id
  contaComercialId        String
  usuarioSolicitante      String                 @default("analista-comercial")
  status                  StatusSolicitacaoBusca @default(PENDENTE)
  dataSolicitacao         DateTime               @default(now())
  fontesConsultadas       String                 @default("[]")
  termosBusca             String                 @default("[]")
  resultado               String?
  confianca               NivelConfianca         @default(MEDIA)
  limitacoes              String?
  contatosEncontradosJson String?
  criadoEm                DateTime               @default(now())
  atualizadoEm            DateTime               @updatedAt

  contaComercial          ContaComercial         @relation(fields: [contaComercialId], references: [id], onDelete: Cascade)

  @@index([contaComercialId, dataSolicitacao])
  @@index([status])
}
```

### 3.2. Módulo de Domínio (`src/domain/busca-responsaveis/`)
- **`tipos.ts`**: Tipos estritos para requisição, candidato, retorno visual e status do ciclo de vida da pesquisa.
- **`regras-busca.ts`**:
  - `validarConfirmacaoUsuario`: Impede qualquer execução sem consentimento explícito.
  - `validarCandidatoNaoFabricado`: Rejeita candidatos com nomes genéricos, CPFs, e-mails de provedores gratuitos (`@gmail`, `@hotmail` etc.), URLs inválidas, cargos clínicos sem vínculo com compras e assegura classificação do papel comercial como `INFERENCIA_COMERCIAL`.
  - `gerarChaveDeduplicacao`: Deduplicação determinística baseada em `nome | empresa | urlPublica`.
- **`servico-busca.ts`**:
  - `solicitarBuscaResponsaveis`: Motor determinístico que registra o status `EM_PESQUISA`, consulta fontes públicas auditadas (manifesto público, histórico de auditoria de pesquisas prévias de organizações, editais PNCP por CNPJ), avalia candidatos segundo regras de não-fabricação, persiste candidatos com `statusRevisao: "PENDENTE"` e `ativo: false`, ou conclui com `SEM_CONTATO_VERIFICAVEL`.
  - `obterUltimaPesquisaConta` e `listarPesquisasConta`: Recuperação do dossiê auditável para interface.
  - `ativarContatoSupervisionado`: Ativação após revisão humana explícita (`statusRevisao: "APROVADA"`, `ativo: true`).
  - `desativarContatoSupervisionado`: Desativação auditada com motivo e responsável (`statusRevisao: "REJEITADA"`, `ativo: false`).

### 3.3. Interface e Experiência do Usuário (`src/components/secao-busca-responsaveis.tsx`)
- **Botão com ícone e estado interativo**: Localizado no dossiê de cada conta comercial (`/contas/[id]`).
- **Modal de Confirmação**: Exibe alerta de governança ética, salvaguardas da LGPD, regras de não-dedução e exige marcação de checkbox pelo analista antes de prosseguir.
- **Painel de Resultados e Auditoria**:
  - Exibição do status da última pesquisa (`AGUARDANDO_REVISAO`, `SEM_CONTATO_VERIFICAVEL`, `CONCLUIDA`, `EM_PESQUISA`).
  - Data e hora formatadas, solicitante interno e nível de confiança.
  - Lista de fontes consultadas e termos de busca auditáveis.
  - Cartões de candidatos identificados com badges distinguindo categorias canônicas (`Fato público`, `Inferência comercial`, `Demonstração`).
  - Botões para ação humana: **"Aprovar e Ativar"** e **"Desativar"**.
  - Histórico de solicitações anteriores da conta.
  - Card de aviso de salvaguardas de privacidade e governança B2B.

### 3.4. Server Actions Integradas (`src/app/contas/[id]/actions.ts`)
- `executarBuscaResponsaveis`: Processamento seguro da requisição com revalidação de cache do Next.js.
- `aprovarContatoAcao`: Transição de revisão para aprovado e ativado.
- `desativarContatoAcao`: Desativação imediata com justificativa auditada.

---

## 4. Testes do Gate 6 (`src/domain/busca-responsaveis/busca-responsaveis.test.ts`)

Foram implementados 12 testes automatizados cobrindo todos os requisitos obrigatórios do Gate 6:

1. `aceita candidato válido com cargo comprovado, fonte e URL pública` — **Aprovado**
2. `rejeita busca sem confirmação explícita do usuário (nenhuma busca automática)` — **Aprovado**
3. `rejeita candidato com CPF no registro (proibição de dados pessoais protegidos)` — **Aprovado**
4. `rejeita e-mail de provedor genérico ou pessoal (ex.: @gmail.com)` — **Aprovado**
5. `rejeita candidato sem URL pública verificável` — **Aprovado**
6. `rejeita profissional clínico puro inferido como responsável por compras` — **Aprovado**
7. `classifica o papel comercial obrigatoriamente como INFERENCIA_COMERCIAL` — **Aprovado**
8. `gera chave de deduplicação determinística` — **Aprovado**
9. `diferencia claramente escopo ORGANIZACAO vs INSTITUICAO` — **Aprovado**
10. `executa busca sob demanda para conta demonstração com isolamento garantido` — **Aprovado**
11. `retorna SEM_CONTATO_VERIFICAVEL com auditoria completa quando não há pessoa comprovada` — **Aprovado**
12. `permite revisão humana com ativação e posterior desativação auditada` — **Aprovado**

*Nota de isolamento:* A suíte de testes inclui gancho `afterAll` e restauração de estado para garantir que nenhum registro transitório de teste altere as contagens canônicas do banco de dados.

---

## 5. Resultados da Suíte Completa de Verificação

Todos os comandos de validação do projeto foram executados e aprovados:

| Verificação | Comando | Resultado |
| :--- | :--- | :---: |
| **Linhas / Whitespace** | `git diff --check` | **Aprovado** (0 erros) |
| **Lint** | `npm run lint` | **Aprovado** (0 erros, 0 avisos) |
| **Tipos TypeScript** | `npm run typecheck` | **Aprovado** (0 erros) |
| **Testes Automatizados** | `npm test` | **Aprovado** (26 suítes, 194 testes aprovados) |
| **Build de Produção** | `npm run build` | **Aprovado** (Next.js 16.3.4, todas as 13 rotas compiladas) |
| **Vulnerabilidades** | `npm audit` | **Aprovado** (0 vulnerabilidades) |

---

## 6. Declaração do Gate e Próximos Passos

> **DECLARAÇÃO FORMAL: `GATE 6 — APROVADO`**
> 
> A busca supervisionada de responsáveis está implementada, testada e validada.
> 
> - **Nenhum commit foi criado automaticamente**, respeitando estritamente a instrução do usuário.
> - **A Receita Federal permaneceu 100% pendente e fora de escopo** (0 registros).
> - **O Gate 7 (Revisão e Publicação Assistida), Gate 8 e Gate 9 NÃO foram iniciados.**
