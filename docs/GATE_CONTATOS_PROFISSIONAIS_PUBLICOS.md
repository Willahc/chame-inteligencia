# Gate — Contatos profissionais públicos

Data do relatório: 04/09/2026

## Resultado

**PILOTO CONCLUÍDO — AGUARDANDO REVISÃO DO RELATÓRIO ANTES DO COMMIT**

O piloto usou 1 organização privada já existente no banco (`FLEURY S A`), dentro do limite autorizado de até 10 organizações. Foram persistidos 2 contatos profissionais públicos. Não houve envio de mensagens, campanha, WhatsApp, discador ou contato automático.

## Evidências públicas reproduzidas

| Contato | Fatos públicos armazenados | Papel comercial | Confiança | Fonte |
| --- | --- | --- | --- | --- |
| Clóvis Porto | Gerente sênior; área de Facilities | Influenciador estratégico (`INFERENCIA`) | ALTA | [publicação pública do Grupo Fleury no LinkedIn](https://pt.linkedin.com/posts/grupo-fleury_fm-entrevista-fm-edmar-cioletti-e-cl%C3%B3vis-activity-6488395072973864960-X2UZ) |
| Andréia R. | Profissional de Compras; área de Strategic Sourcing | Compras (`INFERENCIA`) | ALTA | [perfil público de Andréia R. no LinkedIn](https://br.linkedin.com/in/andreiarochadasilva) |

O nome abreviado “Andréia R.” foi preservado como exibido na fonte. Não foi inferido nome completo. O perfil individual público de Clóvis Porto não foi localizado; foi mantida somente a página pública da publicação do Grupo Fleury.

## Campos não confirmados

Nenhum dos dois contatos possui e-mail corporativo ou telefone profissional confirmado nas fontes reproduzidas. Esses campos não foram preenchidos. As informações fornecidas anteriormente (“Diretor”, “Expansão”, e-mail e telefone) não foram tratadas como canônicas por falta de reprodução pública suficiente.

## Governança e modelo

- Fatos do contato: `tipoDado = FATO_PUBLICO`.
- Papel comercial: `tipoPapelComercial = INFERENCIA`; não afirma poder de decisão.
- Confiança, fonte, URL e data de evidência estão persistidas por contato.
- Status de revisão dos dois contatos: `APROVADA`.
- Contatos podem ser desativados pelo campo `ativo`; a consulta da organização exibe somente contatos ativos.
- Não foram coletados CPF, endereço residencial, e-mail pessoal, telefone pessoal, dados familiares ou dados obtidos por login privado.

## Idempotência e preservação

O comando `npm run contatos:publicos` foi executado duas vezes. As duas execuções fizeram upsert dos mesmos 2 identificadores estáveis, sem duplicação. A organização Fleury, as 8.212 instituições reais, os agrupamentos `1.0.0` e a segmentação `2.1.0` permaneceram preservados.

## Validação técnica

- `npm run lint` — aprovado
- `npm run typecheck` — aprovado
- `npm test` — 58/58 aprovados
- `npm run build` — aprovado
- `npm audit --audit-level=high` — 0 vulnerabilidades

## Limitações e próximos passos

Este é um piloto de uma organização e duas evidências públicas. Não há cobertura de dez organizações nem validação de e-mail/telefone neste Gate. A expansão deve repetir a descoberta pública, registrar fonte e data, preservar `FATO_PUBLICO` separado de `INFERENCIA`, e passar por revisão humana antes de qualquer novo commit ou uso comercial.

O bloqueio do Gate 3.1 sobre mantenedoras CNES permanece inalterado; estes contatos não promovem agrupamentos `PROVAVEL` para `OFICIAL`.
