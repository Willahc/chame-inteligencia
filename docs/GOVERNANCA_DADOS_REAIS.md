# Governança de dados reais

Fluxo obrigatório: **DADO BRUTO → NORMALIZAÇÃO → RESOLUÇÃO POR CNES → PERSISTÊNCIA → EVIDÊNCIA → ÍNDICE/PUBLICAÇÃO**.

Cada execução cria um `LoteIngestao` com arquivo, URL, hash, versão, horários, contagens e erros. Cada linha filtrada é preservada como `RegistroBrutoCNES` com `ACEITO`, `REJEITADO` ou `REVISAO_NECESSARIA`; nada é descartado silenciosamente. Evidências CNES são `FATO_OFICIAL`, têm fonte, datas, confiança e lote.

Instituições reais são identificadas exclusivamente pelo CNES e recebem `tipoDado=FATO_OFICIAL`; demonstrações continuam `DEMONSTRACAO`. A ingestão é idempotente por `cnes` e a evidência é estável por CNES/data de referência. A cobertura informa quantos campos básicos foram encontrados; ausência de dados não é convertida em fato.
