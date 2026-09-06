# Validação das fontes oficiais baixadas — 06/09/2026

## Escopo

Esta validação confere os arquivos oficiais baixados para apoiar os próximos Gates do Chame Inteligência. Os arquivos brutos permanecem preservados em `data/raw/`, sem substituição do lote canônico e sem ingestão automática de dados novos no banco de produção.

## CNES

| Lote | Arquivo | SHA-256 | Linhas de dados | Situação |
|---|---|---|---:|---|
| Canônico 04/09 | `data/raw/cnes_estabelecimentos_csv.zip` | `479BFB9950AAA1C7392EEA362E953815B7EE92B702F2216F3A2A87E0918A2E88` | 634.914 | preservado |
| Validação 05/09 | `data/raw/cnes/2026-09-05/cnes_estabelecimentos_csv.zip` | `2B09E0978553C05918D3B6CE97EE85819904B56526E1DC6BBA385B8EDF66C4E6` | 635.118 | isolado |

O cabeçalho dos dois lotes é idêntico. O lote de 05/09 contém 204 linhas adicionais. Ele não foi promovido ao banco porque a promoção de um novo lote CNES exige comparação de chaves, alterações de instituição e execução explícita do Gate de atualização.

## PNCP

- Fonte: Portal Nacional de Contratações Públicas.
- Arquivo: `data/raw/pncp/consultas_pncp_sinais_contratacao.json`.
- SHA-256: `FB63CFB0D2508A496AFE0227267AE4B9D865E13A36C6792783EFD905E8F8BE26`.
- Consulta declarada: 2.500 registros analisados, UF SP, período 01/08/2026–06/09/2026.
- Registros de saúde correspondentes: 544.
- Sinais de mobilidade/transporte: 175.

O arquivo é evidência pública de oportunidades de contratação. Não houve associação automática a instituições CNES nem criação de fatos comerciais; qualquer associação futura deverá usar CNPJ/CNES explícito e registrar fonte, data e confiança.

Limitação identificada: alguns campos originalmente estruturados (`orgao` e `unidade`) foram serializados no arquivo como texto no formato `@{campo=valor}`. Por isso, o lote é adequado para auditoria exploratória, mas não deve ser ingerido como estrutura canônica sem uma nova captura/normalização validada.

## ANS

- Fonte: Agência Nacional de Saúde Suplementar.
- Recurso: `Relatorio_cadop.csv`.
- URL: https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv
- SHA-256: `8C4CFA65D27664EE6E6282CC393D6AB3BCC632A16486517D6DC1E7D039FD774E`.
- Registros: 1.113 operadoras.

O CSV contém campos cadastrais e também campos de representante, telefone e e-mail. Os campos pessoais/de contato não foram ingeridos nem exibidos. O recurso permanece bruto para um Gate ANS específico.

## Outras fontes

Os arquivos oficiais de Receita Federal, IBGE e MTE estão preservados conforme o manifesto de downloads. A Receita Federal ainda não disponibilizou, neste ambiente, a base nacional necessária para enriquecimento CNPJ seletivo; o PDF de metadados não contém registros empresariais.

O novo arquivo de contratos PNCP (`contratos_pncp_saude_mobilidade_sp_2026.json`, SHA-256 `22FEB68930693B5561C4591A86E6C41ADDB727C598B917482903C064AB05656C`) também foi preservado. Sua raiz é um objeto JSON com chaves numéricas (`"0"`, `"1"`, ...), equivalente a uma lista mas não tipado como array; por isso, não foi ingerido até haver normalização explícita e validação de campos de fornecedor, vigência e identificador PNCP.

## Governança e resultado

- Nenhuma instituição real foi removida ou alterada.
- Nenhuma demonstração foi misturada a fatos oficiais.
- Nenhum contato profissional foi criado a partir de ANS ou PNCP.
- Nenhum arquivo bruto foi sobrescrito.
- O agrupamento 1.0.0 e a segmentação 2.1.0 permanecem canônicos.
- Esta etapa conclui a validação dos downloads; não aprova o Gate 4 de CNPJ nem inicia Gates ANS/PNCP.

## Diagnóstico do Gate 4 — Receita Federal

O diagnóstico controlado confirmou 334 unidades privadas no Núcleo Hospitalar, 323 CNPJs válidos, 322 CNPJs únicos e 216 CNPJs básicos únicos. A página oficial de metadados respondeu, mas os repositórios oficiais de arquivos permaneceram indisponíveis (timeout/HTTP 401). Portanto, o Gate 4 segue **AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL**, sem uso de espelhos ou agregadores.

## Próximos Gates

1. Gate 4: obter fonte oficial Receita com registros CNPJ ou autorizar estratégia seletiva compatível com os arquivos disponíveis.
2. Gate PNCP: modelar e ingerir sinais de contratação com proveniência, sem inferir contratação ou decisão.
3. Gate ANS: modelar somente dados cadastrais de operadoras, excluindo contatos de representantes.
