# Gate 3.1 — Mantenedoras oficiais CNES

Data da verificação: 04/09/2026

## Decisão

**GATE 3.1 — REPROVADO**

O Gate não pode prosseguir sem um recurso oficial, público e auditável que contenha o vínculo entre estabelecimento CNES e mantenedora. Nenhum dado foi inserido, promovido ou removido. A regra de agrupamento `1.0.0` e a segmentação `2.1` permanecem inalteradas.

## Fonte oficial verificada

- Portal CNES/DATASUS: `https://cnes.datasus.gov.br/pages/sobre/aplicativos.jsp`
  - O portal declara que o SCNES possui o módulo **Mantenedoras** e que a área pública dispõe de consulta de mantenedora.
- Portal CNES/DATASUS — Downloads de arquivos da aplicação: `https://cnes.datasus.gov.br/pages/downloads/arquivosAplicacao.jsp`
  - Recursos publicados: equipes, gestor federal, profissionais, SAMU, CEP, CNES válidos/expirados, cooperativas, estabelecimentos notificantes, gerência/administração (terceiro), hospitais, municípios, natureza jurídica e outros.
  - Não há recurso identificado como mantenedora nem como vínculo estabelecimento–mantenedora.
- Portal CNES/DATASUS — Consultas: `https://cnes.datasus.gov.br/pages/consultas.jsp`
  - A seção de mantenedoras está desativada no HTML público; não oferece recurso de extração.
- Endpoint oficial usado pela página de downloads: `https://cnes.datasus.gov.br/services/arquivos-download`
  - Resultado em 04/09/2026: HTTP `503 Serviço Não Disponível`.

## Resultado de governança

Não existe URL de arquivo de mantenedoras, nome de recurso, data de referência, arquivo bruto ou SHA-256 a registrar. Criar lote, preencher `MantenedoraOficial` ou promover vínculos nestas condições quebraria a rastreabilidade exigida pelo projeto e converteria uma hipótese em fato sem evidência oficial verificável.

O CSV oficial de estabelecimentos já ingerido possui o campo `NU_CNPJ_MANTENEDORA`; ele permanece como evidência oficial somente quando preenchido. Esse campo já foi considerado no agrupamento `1.0.0` e não substitui o conjunto oficial de mantenedoras solicitado para este Gate.

## Antes/depois

Como não houve ingestão, os números permanecem os do commit canônico `83c4d66`:

| Métrica | Antes | Depois |
| --- | ---: | ---: |
| Vínculos oficiais | 23 | 23 |
| Vínculos prováveis | 241 | 241 |
| Vínculos incertos | 1 | 1 |
| Instituições isoladas | 7.285 | 7.285 |
| Redes privadas do Núcleo Hospitalar oficiais | não apurado separadamente | não alterado |
| Redes privadas do Núcleo Hospitalar prováveis | não apurado separadamente | não alterado |
| Redes privadas do Núcleo Hospitalar incertas | não apurado separadamente | não alterado |

Não há 20 casos a exibir: sem lote oficial, qualquer promoção seria indevida.

## Condição para reabrir o Gate

Reabrir somente quando o CNES, DATASUS ou Portal Brasileiro de Dados Abertos publicar ou indicar um recurso oficial acessível que tenha, no mínimo, identificador de mantenedora e vínculo verificável com o CNES. Antes de implementar a ingestão, registrar URL, recurso, competência, arquivo bruto e SHA-256; então criar lote auditável e executar todos os testes do Gate.
