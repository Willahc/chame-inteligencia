# Checkpoint de pesquisa de contatos públicos — 05/09/2026

## 1. Estado terminal da fila e pesquisas

Auditoria canônica executada sobre o banco SQLite (`prisma/dev.db`) em 06/09/2026, sem recriação, sem reset e sem exclusão de dados.

- **Instituições reais preservadas**: 8.212 (`FATO_OFICIAL`);
- **Instituições demonstrativas**: 5 (`DEMONSTRACAO`);
- **Grupos econômicos**: 7.550 reais (versão de regra `1.0.0`) + 1 demonstração;
- **Segmentação comercial**: 8.212 instituições classificadas na versão `2.1.0` (400 no `NUCLEO_HOSPITALAR`, 2.472 na `SAUDE_CORPORATIVA_EXPANDIDA`, 5.340 `BAIXA_PRIORIDADE_INICIAL`);
- **Fila operacional (`FilaOrganizacao`)**: 243 organizações prioritárias:
  - 79 `CONCLUIDA`;
  - 164 `SEM_CONTATO`;
  - 0 `PENDENTE`;
  - 0 `EM_PROCESSAMENTO` (0 leases ativos);
- **Pesquisas de contato (`PesquisaContatoOrganizacao`)**: 243 registros:
  - 79 `COM_CONTATO_VERIFICAVEL`;
  - 164 `SEM_CONTATO_VERIFICAVEL`;
- **Contatos profissionais ativos**: 123 contatos (109 `FATO_PUBLICO` corporativos em 79 organizações + 14 `DEMONSTRACAO`).

A fila compartilhada está integralmente encerrada em estado terminal. Não há leases ativos nem tarefas pendentes.

## 2. Auditoria dos 10 registros com `fontesConsultadas = '[]'`

A auditoria em nível de banco de dados detalhou a situação dos registros na tabela `PesquisaContatoOrganizacao`:

- Das **164 pesquisas** com status `SEM_CONTATO_VERIFICAVEL`, **100% (164 de 164)** possuem termos e URLs de fontes públicas consultadas registradas.
- Os **10 registros** que possuem `fontesConsultadas = '[]'` na tabela `PesquisaContatoOrganizacao` possuem status `COM_CONTATO_VERIFICAVEL`:
  1. `org-7d8f25e8` — CLINICA PREMIUM CARE SAUDE LTDA (1 contato ativo; fonte oficial CNES);
  2. `org-aa1f20b8` — HOSPITAL ALEMAO OSWALDO CRUZ (2 contatos ativos; fontes públicas de liderança e PROADI-SUS);
  3. `org-isol-inst-cnes-2058391` — SOCIEDADE BENEFICENTE ISRAELITA BRAS HOSP ALBERT EINSTEIN (4 contatos ativos; perfis públicos no LinkedIn);
  4. `org-isol-inst-cnes-2080974` — HOSPITAL PAULISTA LTDA (1 contato ativo; perfil público no LinkedIn);
  5. `org-isol-inst-cnes-266167` — HOSPITAL ALVORADA TAGUATINGA S A (1 contato ativo; fonte oficial CNES);
  6. `org-isol-inst-cnes-2688581` — IRMANDADE SANTA CASA DE MISERICORDIA DE SAO PAULO (1 contato ativo; perfil público no LinkedIn);
  7. `org-isol-inst-cnes-2688603` — ASSOCIACAO CONGREGACAO DESANTA CATARINA (1 contato ativo; perfil público no LinkedIn);
  8. `org-isol-inst-cnes-3876500` — CMA SERVICOS MEDICOS HOSPITALARES LTDA (3 contatos ativos; edital público publicado);
  9. `org-isol-inst-cnes-803626` — CEMA HOSPITAL ESPECIALIZADO MORUMBI (1 contato ativo; perfil público no LinkedIn);
  10. `org-isol-inst-cnes-9646019` — HOSPITAL DA PELE LTDA (1 contato ativo; cadastro público Econodata).

**Conclusão da auditoria sobre os 10 registros:** Essas organizações possuem contatos `FATO_PUBLICO` ativos comprovados e rastreáveis na tabela `Fonte` e em `ContatoProfissional`. O campo `fontesConsultadas` em `PesquisaContatoOrganizacao` permaneceu `[]` porque na rodada automatizada de reconciliação não foi necessária nova busca web, registrando explicitamente: *"Organização possui contato FATO_PUBLICO ativo já existente; a rodada atual não adicionou novo contato. Histórico e fontes anteriores preservados."* Nenhuma fonte artificial foi inventada.

## 3. Reconciliação dos 109 contatos `FATO_PUBLICO` ativos

A divergência entre o manifesto documental inicial (31 contatos no lote 100.4.0) e os 109 contatos ativos no banco foi reconciliada e decomposta nas seguintes origens comprovadas:

| Lote / Origem | Quantidade | Descrição / Arquivo de Referência |
| :--- | :---: | :--- |
| **Manifesto Lote 100** | **33** | Definidos em `src/data/contatos-publicos-lote-100.ts` (versão 100.5.0), incluindo os 2 do piloto Fleury inicial, 29 de grupos prioritários (Sírio-Libanês, Rede D'Or, AFIP, Ebenezer, Einstein, etc.) e 2 do CEMA (Aline Corbeta e Robson Fedulo). |
| **Lote 1 (Expansão Inicial)** | **15** | Ingeridos via `scripts/ingest-contatos-lote-1.ts` (contatos complementares de CMA, Day Hospital Ermelino Matarazzo, AC Camargo / Fundação Antonio Prudente, Hospital Alemão Oswaldo Cruz, Hospital Alvorada e Hospital da Pele). |
| **Expansão Operacional de Pesquisa** | **61** | Contatos com IDs determinísticos `contato-org-...`, gerados durante a execução da fila de pesquisa web das organizações prioritárias, todos com URLs públicas verificáveis (LinkedIn, Casa dos Dados, Consultas CNPJ, editais públicos e portais corporativos). |
| **Total** | **109** | **100% ativos, tipo `FATO_PUBLICO`, escopo `ORGANIZACAO`, distribuídos em 79 organizações.** |

## 4. Governança e Salvaguardas Preservadas

- Todos os 109 contatos públicos tratam apenas de dados profissionais mínimos: nome, cargo corporativo, área e link público de evidência.
- Não constam nem foram coletados e-mail pessoal, telefone pessoal, CPF, endereço residencial ou dados privados obtidos por autenticação.
- O papel comercial permanece classificado como `INFERENCIA`, e todos os dados públicos como `FATO_PUBLICO`.
- Idempotência preservada via chaves determinísticas e operações de `upsert`.

