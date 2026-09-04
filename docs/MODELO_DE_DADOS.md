# Modelo de dados canônico

`Instituicao` é a raiz do Radar. Pode pertencer a um `GrupoEconomico`, possui um `TipoEstabelecimento` e se relaciona a `Unidade`, `ServicoSaude`, `SinalExpansao`, `NecessidadeMobilidade`, `AreaDecisora`, `Evidencia`, `IndicePrioridade` e `AcaoComercial`.

Cada `Unidade` tem até um `Endereco`. Cada `Evidencia` pertence a uma instituição e a uma `Fonte`, e pode justificar sinais de expansão e `ComponenteIndice`. O `IndicePrioridade` contém o total, a faixa, a versão do motor, o instante de cálculo e dez componentes auditáveis.

O esquema executável está em `prisma/schema.prisma`. As chaves são estáveis, relações relevantes possuem índices SQLite e exclusões de instituições removem os registros dependentes. Fontes e grupos permanecem entidades próprias para evitar repetição e apoiar futura resolução de entidades.
