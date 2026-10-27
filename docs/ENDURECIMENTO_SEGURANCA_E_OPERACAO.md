# Endurecimento de segurança e operação local

Data da auditoria: 09/09/2026.

Status: **ENDURECIMENTO — REPROVADO** até que a auditoria visual seja concluída em navegador disponível e a verificação de vulnerabilidades seja autorizada sem violar a regra de não chamar serviços externos.

## Alterações realizadas

- A identidade usada por ações sensíveis é obtida exclusivamente no servidor por `WINS_HUB_TAXI_USUARIO_OPERADOR`.
- Sem identidade configurada, o registro usa `operador-local-nao-autenticado` e o perfil efetivo é `CONSULTA`.
- As ações de revisão, planejamento, aprovação, simulação e administração de integrações exigem permissão no servidor.
- A integração de e-mail de homologação opera somente como `MOCK_LOCAL_HOMOLOGACAO`; a implementação não possui `fetch` nem autorização de rede recebida do navegador.
- O assistente entrega somente o mapeamento canônico de instituições e evidências; contatos profissionais não fazem parte do objeto devolvido ao cliente.
- O Vitest recebeu um alias local para o marcador `server-only`, preservando a separação servidor/cliente durante os testes.

## Proteção de credenciais, payloads e logs

- Arquivos `.env` e `.env.local` não são rastreados pelo Git; apenas `.env.example` é versionado, sem segredo.
- O adaptador de e-mail mantém credenciais no servidor e não as adiciona a payloads sanitizados, telas ou eventos.
- Os testes de integração cobrem remoção de tokens, senhas, cabeçalhos de autorização e dados pessoais proibidos.
- Não há `fetch` nas rotas, ações ou adaptadores de integração ativos. Nenhum serviço externo foi chamado nesta auditoria.

## Preservação do banco

| Medida | Resultado |
| --- | ---: |
| Instituições `FATO_OFICIAL` | 8.212 |
| Instituições `DEMONSTRACAO` | 5 |
| Contas comerciais | 7.555 |
| Agrupamentos não demonstrativos | 7.550 |
| Agrupamentos físicos, incluindo 1 demonstração | 7.551 |
| Contatos | 123 |
| Contatos reais | 109 |
| Contatos demonstração | 14 |
| Sinais/processos PNCP | 2.018 |
| Enriquecimentos BrasilAPI | 2.996 |
| Registros ANS | 1.113 |
| Municípios IBGE | 5.571 |
| Indicadores MTE | 4 |
| `EmpresaReceita` | 0 |

O valor canônico de 7.550 corresponde aos grupos `FATO_OFICIAL` e `HIPOTESE`; existe adicionalmente um grupo `DEMONSTRACAO`, preservado sem alteração.

## Validações

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npx prisma validate` foram executados com sucesso.
- Testes direcionados de permissões, operador e integrações passaram, assim como a suíte completa: 75 suítes e 286 testes, sem falhas.
- `npm audit` não foi executado: a regra desta auditoria proíbe chamadas a serviços externos, e esse comando consulta o registro npm.

## Limitações e pendências

- A identidade local configurada por ambiente evita adulteração pelo navegador, mas não substitui autenticação real.
- A auditoria visual foi bloqueada porque não há navegador disponível no ambiente de automação. O servidor local iniciou em `localhost:3000`; os breakpoints precisam ser verificados em navegador disponível antes da aprovação visual.
- A consulta mínima de Prisma para o assistente foi adiada: Prisma 6.12 com SQLite apresentou panic ao executar a projeção relacional reduzida. O limite de dados exposto ao cliente permanece aplicado; uma otimização de consulta deve acompanhar atualização planejada do Prisma.
