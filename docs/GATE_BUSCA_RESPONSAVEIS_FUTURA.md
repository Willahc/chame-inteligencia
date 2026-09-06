# Gate futuro — Busca de responsáveis sob demanda

Este documento define a arquitetura do futuro enriquecimento de contatos profissionais públicos. A funcionalidade não está ativa no MVP e não executa consultas externas.

## Objetivo

Permitir que um usuário solicite a pesquisa de responsáveis comerciais para uma conta específica, com fontes públicas, revisão humana e rastreabilidade.

## Fluxo controlado

`SOLICITADO → PESQUISANDO → CANDIDATOS_ENCONTRADOS → REVISAO_HUMANA → PERSISTIDO`

Fluxos alternativos:

- `PESQUISANDO → SEM_CANDIDATO_VERIFICAVEL`;
- qualquer etapa não persistida pode ser `CANCELADO`;
- `SEM_CANDIDATO_VERIFICAVEL` pode ser reaberto mediante nova solicitação.

## Dados permitidos

- nome profissional público;
- cargo e área;
- empresa e escopo organização/instituição;
- página profissional ou LinkedIn público;
- e-mail corporativo publicado;
- telefone profissional, departamental, ramal ou central;
- fonte, data da evidência, confiança e status de revisão;
- papel comercial classificado como `INFERENCIA`.

## Salvaguardas

- nenhuma busca automática em massa;
- nenhuma persistência sem fonte pública verificável;
- nenhum e-mail pessoal, telefone pessoal, CPF, endereço residencial ou dado familiar;
- nenhum login privado, scraping autenticado ou bypass de CAPTCHA;
- nenhum envio de mensagem, campanha, WhatsApp, CRM ou discador;
- revisão humana obrigatória antes de persistir;
- deduplicação por nome, empresa e perfil público;
- fatos, inferências e hipóteses permanecem separados.

## Critérios para implementação futura

1. autorização explícita do Gate;
2. definição das fontes permitidas;
3. limite de consultas e auditoria de custo;
4. fila com reserva e idempotência;
5. tela de revisão humana;
6. testes de privacidade, fonte, duplicidade e isolamento entre modos;
7. execução completa de lint, typecheck, testes, build e audit.
