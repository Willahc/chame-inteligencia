# Governança de dados reais

Fluxo obrigatório: **DADO BRUTO → NORMALIZAÇÃO → RESOLUÇÃO POR CNES → PERSISTÊNCIA → EVIDÊNCIA → ÍNDICE/PUBLICAÇÃO**.

Cada execução cria um `LoteIngestao` com arquivo, URL, hash, versão, horários, contagens e erros. Cada linha filtrada é preservada como `RegistroBrutoCNES` com `ACEITO`, `REJEITADO` ou `REVISAO_NECESSARIA`; nada é descartado silenciosamente. Evidências CNES são `FATO_OFICIAL`, têm fonte, datas, confiança e lote.

Instituições reais são identificadas exclusivamente pelo CNES e recebem `tipoDado=FATO_OFICIAL`; demonstrações continuam `DEMONSTRACAO`. A ingestão é idempotente por `cnes` e a evidência é estável por CNES/data de referência. A cobertura informa quantos campos básicos foram encontrados; ausência de dados não é convertida em fato.

## Remediação do seed (04/09/2026)

O seed anterior executava `deleteMany()` sem filtro em todas as tabelas. Quando rodado após a ingestão CNES, apagou todas as evidências (incluindo FATO_OFICIAL) antes de falhar na FK de `Fonte`. Dados brutos, lotes, fonte, instituições, unidades e endereços permaneceram intactos.

O seed foi refatorado para deletar apenas registros `DEMONSTRACAO`, usando `tipoDado` direto ou subqueries na `Instituicao` para entidades sem `tipoDado`. As evidências oficiais foram restauradas pela re-execução da ingestão CNES idempotente com a mesma fonte, data de referência e arquivo (SHA-256 verificado).

`npm run db:seed` pode ser executado com segurança em qualquer momento sem risco de perda de dados reais.
