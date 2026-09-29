# Inventário e auditoria — Gate 3

Data: 23/09/2026, America/Sao_Paulo. Gates 1 e 2 permanecem intactos e PASS. Na etapa Gate 3, `data/processed/` permanecia vazia; a base de polos foi derivada posteriormente.

## Status final

**PASS.** O PDF original da relação oficial foi preservado, tem camada textual e a seção `CFC - TÁXI` foi auditada integralmente de modo estrutural. A relação não prova vigência individual em 2026; a limitação está documentada.

## Arquivos preservados

| Arquivo | Natureza | Tamanho | SHA-256 | HTTP | Auditoria |
|---|---|---:|---|---:|---|
| `data/raw/dtp/canais/pesqtranspub_landing_20260923.html` | HTML original da interface pública, sem consulta submetida | 21.476 bytes | `16c9492a3c1e4167119cf2cad3151d1409445e530d8e01be931708fdda76687f` | 200 | Interface, filtros e CAPTCHA; sem lista. |
| `data/raw/dtp/canais/cfc/cfc_escolar_motofrete_taxi_dtp_original.pdf.pdf` | PDF original manual da URL oficial CFC | 341.128 bytes | `61c880f00db216fe016337b53b6103866411fbbbd180f794bef85d0241d18a08` | não aplicável à cópia manual | PDF 1.5, 3 páginas, sem criptografia, com camada textual. |

O download automatizado histórico do anexo retornou HTTP 403 e foi descartado. O fato segue separado no manifesto do PDF original manual agora preservado.

## Estrutura do PDF

O documento contém `CFC - ESCOLAR`, `CFC - MOTOFRETE` e `CFC - TÁXI`. Escolar tem 13 entradas e Motofrete 5, somente como informação estrutural; elas não foram incorporadas à relação Táxi. Táxi começa na página 2 e continua na página 3.

## Auditoria exclusiva: CFC - TÁXI

| Métrica | Resultado |
|---|---:|
| Entradas extraídas | 27 |
| Nomes institucionais distintos | 27 |
| Com endereço | 27 |
| Com bairro | 27 |
| Com CEP | 27 |
| Com telefone publicado no cadastro institucional do CFC | 27 |
| Com e-mail | 0 |
| Com CNPJ | 0 |
| Duplicidades exatas | 0 |
| Nomes repetidos com endereços diferentes | 0 |
| Telefones repetidos entre entradas distintas | 1 par de entradas |
| CEP ausente | 0 |
| Linhas/registros com falha estrutural | 0 |

Campos publicados: nome institucional, endereço, bairro, CEP e telefone. Não há município, e-mail, CNPJ, número de credenciamento, situação, validade ou site na seção Táxi. O telefone é tratado somente como “telefone publicado no cadastro institucional do CFC”, sem afirmação de titularidade.

### Integridade da extração

- Há camada textual nas 3 páginas; OCR não foi usado.
- A quebra entre páginas 2 e 3 é normal e não aparenta truncar registro Táxi.
- Não foram detectados caracteres de controle. A codificação do PDF torna acentos potencialmente imperfeitos na extração; não houve correção/normalização.
- Não foi gravada tabela tratada no Gate 3, nem eliminada duplicidade. A seleção operacional posterior está descrita no README.

### Sobreposição entre modalidades

Por comparação de nome/endereço tal como publicados, 13 CFCs Táxi também aparecem em Escolar e 5 em Motofrete. São sobreposições entre modalidades, não duplicidades na seção Táxi.

## Cobertura geográfica e vigência

Não há campo Município; não foi deduzido Município de São Paulo por CEP, bairro ou endereço. A página de origem é de 02/10/2024; o título usa “credenciados”, mas não traz situação, validade ou atualização individual. Estar listado não prova credenciamento vigente em 2026.

## Despachantes e OIAs

Não foram processados: anexos observados contêm dados de pessoas. Não houve enumeração, preservação ou lista de contatos.
