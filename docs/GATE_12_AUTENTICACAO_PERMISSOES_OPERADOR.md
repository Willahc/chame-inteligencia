# Gate 12 — Autenticação e permissões do operador

Status: **GATE 12 — AGUARDANDO PROVEDOR DE AUTENTICAÇÃO**.

## Preparação implementada

O domínio define os perfis `CONSULTA`, `REVISOR`, `APROVADOR` e `ADMINISTRADOR`, com permissões canônicas aplicadas no servidor:

| Perfil | Permissões |
| --- | --- |
| `CONSULTA` | consultar |
| `REVISOR` | consultar, revisar contatos, planejar ações |
| `APROVADOR` | permissões de revisor, aprovar ações e simular integrações locais |
| `ADMINISTRADOR` | todas as permissões, inclusive administração de integrações |

O operador ausente ou não autenticado é sempre reduzido a `CONSULTA`. Ações sensíveis registram a identidade resolvida no servidor; valores de usuário recebidos do navegador não são aceitos como identidade de auditoria.

## Decisões e limites

- Não há senha, token de sessão ou credencial persistida no Git.
- Não foi integrado provedor externo de autenticação.
- Ações de leitura permanecem disponíveis ao perfil `CONSULTA`; alterações exigem permissão explícita.
- Integrações continuam exclusivamente em mock local, mesmo para `ADMINISTRADOR`.
- Histórico de domínio permanece imutável; a autorização não altera evidências, dados canônicos ou seus modos.

## Modelo futuro de auditoria

Um provedor aprovado deverá fornecer uma identidade verificável de operador, perfil, sessão, data de acesso e estado de desativação. A camada de autorização já possui contrato para aplicar essa identidade exclusivamente no servidor.

## Testes

Os testes cobrem: usuário ausente, operador não autenticado, consulta, revisão, aprovação, administração, negação de ação sem permissão e tentativa de promoção de perfil sem identidade de servidor. Os testes de integrações cobrem mock local, ausência de rede e ausência de segredos em payloads.

## Dependência futura

Para autenticação real, é necessária aprovação de escopo para escolher e integrar um provedor. Até essa aprovação, nenhuma conta, senha, login externo ou produção será habilitada.
