# Piloto controlado — 5 contas de demonstração

Data: 04/09/2026

## Escopo e decisão

O fluxo visual foi colocado em `MODO_DEMONSTRACAO` por padrão. As consultas do aplicativo filtram explicitamente `tipoDado = DEMONSTRACAO`; o modo real só é selecionado por `CHAME_MODO_DADOS=MODO_REAL`. Nenhuma busca web foi executada nesta etapa e nenhum contato real foi criado ou enriquecido.

## Auditoria prévia

O banco contém exatamente 5 instituições `DEMONSTRACAO`:

| Nome | ID | Slug | Origem |
| --- | --- | --- | --- |
| Rede Saúde Exemplo | `inst-rede-saude-exemplo` | `rede-saude-exemplo` | Seed/catálogo fictício do Gate 1 |
| Hospital Modelo Sul | `inst-hospital-modelo-sul` | `hospital-modelo-sul` | Seed/catálogo fictício do Gate 1 |
| Hospital Demonstração Alfa | `inst-hospital-alfa` | `hospital-demonstracao-alfa` | Seed/catálogo fictício do Gate 1 |
| Centro Diagnóstico Modelo | `inst-centro-diagnostico` | `centro-diagnostico-modelo` | Seed/catálogo fictício do Gate 1 |
| Instituto Clínico Demonstração | `inst-instituto-clinico` | `instituto-clinico-demonstracao` | Seed/catálogo fictício do Gate 1 |

### Investigação de BERRINI

`BERRINI CENTRO DE DIAGNOSTICO` não é uma sexta demonstração. O registro é:

- ID `inst-cnes-24872`, slug `cnes-24872`, CNES `24872`;
- `tipoDado = FATO_OFICIAL`;
- grupo real isolado `org-isol-inst-cnes-24872`, regra `1.0.0`;
- evidência `evidencia-cnes-24872-2026-09-04`, fonte CNES oficial, lote `lote-cnes-1788537287986`;
- segmentação `2.1.0` em `SAUDE_CORPORATIVA_EXPANDIDA`.

O registro foi preservado integralmente e não foi apagado ou convertido.

## Contatos fictícios

Foram criados 14 contatos, distribuídos em 2–4 por conta. Todos têm `tipoDado = DEMONSTRACAO`, perfil profissional simulado não clicável, e-mail em domínio reservado `.example`, telefone `(00) 0000-00xx`, confiança alta e status de revisão aprovado. O papel comercial é marcado como inferência simulada (`tipoPapelComercial = INFERENCIA`).

| Conta | Contatos | Índices de qualidade |
| --- | ---: | --- |
| Rede Saúde Exemplo | 3 | 88, 92, 84 |
| Hospital Modelo Sul | 3 | 81, 79, 86 |
| Hospital Demonstração Alfa | 3 | 76, 82, 73 |
| Centro Diagnóstico Modelo | 2 | 68, 71 |
| Instituto Clínico Demonstração | 3 | 65, 62, 58 |

O índice combina, de forma explicitamente simulada, aderência do cargo, empresa, senioridade, perfil, e-mail, telefone e atualidade. A tela informa que os dados são de demonstração.

## Ações recomendadas

- Rede Saúde Exemplo: abordar Facilities e Compras para apresentar gestão centralizada de mobilidade entre unidades.
- Hospital Modelo Sul: validar necessidade de transporte 24h e deslocamentos administrativos.
- Hospital Demonstração Alfa: mapear Compras e Serviços Corporativos.
- Centro Diagnóstico Modelo: investigar mobilidade entre unidades e transporte de colaboradores.
- Instituto Clínico Demonstração: baixa prioridade; aprofundar estrutura antes da abordagem.

## Telas e arquitetura afetadas

- Visão Geral: Top oportunidades mostra somente as cinco contas e exibe “MODO DEMONSTRAÇÃO — 5 contas simuladas”.
- Radar, Assistente e listagens: consultas usam o filtro do modo de dados e não misturam fatos oficiais com demonstrações.
- Detalhe de instituição e organização: seção de contatos, qualidade, fonte, tipo de dado, papel inferido e ação recomendada.
- `src/domain/modo-dados.ts`: separa `MODO_DEMONSTRACAO` e `MODO_REAL`, com demonstração como padrão seguro.
- `ContatoProfissional`: suporta proveniência, revisão, qualidade, senioridade, desativação e vínculo a instituição/grupo.

## Testes e validação

- Exatamente cinco demonstrações canônicas confirmadas no banco.
- 14 contatos simulados; nenhum domínio de e-mail real e nenhum LinkedIn clicável.
- Índices determinísticos testados.
- Idempotência do seed de contatos verificada por execução repetida.
- `npm run lint` — aprovado.
- `npm run typecheck` — aprovado.
- `npm test` — 63/63 aprovados.
- `npm run build` — aprovado.
- `npm audit` — 0 vulnerabilidades.

## Limitações

O piloto não implementa edição ou remoção pela interface, não consulta fontes externas e não é um CRM. O modo real permanece disponível apenas arquiteturalmente para evolução futura, sem ser o modo padrão da demonstração local. Nenhuma campanha ou ação automática foi iniciada.
