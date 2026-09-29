# Dicionário de conceitos e campos — Gate 2

Este dicionário preserva a separação entre unidades. Nenhum indicador foi convertido em outro.

| Conceito / campo | Fonte em que aparece | Significado observado | Não representa automaticamente |
|---|---|---|---|
| `Ano` | Infocidade — Frota de Táxis | ano da observação da série | data de publicação nem mês de referência, quando não declarado. |
| `Táxis` | Infocidade — Frota de Táxis | tamanho da frota, em veículos | condutores, Condutax, alvarás ou pessoas. |
| `Condutax` | CTT 2023 e página institucional | Cadastro Municipal de Condutores de Táxi; documento pessoal que habilita a pessoa física | motorista trabalhando no momento, veículo, alvará ou vaga. |
| `Taxistas fizeram cadastro` | CTT 2023 | métrica de cadastro de plataforma exibida no slide | total de Condutax ou total de trabalhadores ativos. |
| `Alvará de Estacionamento` | CTT 2023 e página institucional | licença municipal para exercício da atividade, vinculável a veículo | pessoa, Condutax ou empresa. |
| `Comum`, `Comum Rádio`, `Especial`, `Luxo` | CTT 2023 | categorias de alvarás agregados | categorias completas de toda a frota atual; o CTT não traz Acessível/Executivo no quadro. |
| `Autônomo` / `Empresa` | CTT 2023 | classificação do bloco de alvará segundo titular/vínculo publicado | contagem de pessoas ou de empresas. |
| `C/carro` / `S/carro` | CTT 2023 | alvará com ou sem veículo, conforme o slide | veículo individual ou situação atual permanente. |
| `Empresa de frota` / `Termo de Permissão` | página oficial de frotistas | pessoa jurídica credenciada/autorizada a operar frota | quantidade de alvarás, veículos ou condutores. |
| `Ponto` | Gate 1 / CTT 2023 | local de estacionamento; métricas temporais distintas | alvará, frota ou Condutax. |
| `Vaga` | Gate 1 / CTT 2023 | capacidade/disponibilidade associada a pontos | condutor, veículo ou alvará. |

Não foram encontrados campos públicos agregados de Condutax ativo, lista de condutores, CPF, telefone, endereço residencial, placa, ou relação nominal consolidada de empresas frotistas. Esses dados não foram procurados nem coletados.

## Gate 2B — termo adicional confirmado

| Termo como publicado | Fonte | Limite de interpretação |
|---|---|---|
| `taxistas com cadastro ativo no DTP` | notícia oficial DTP de 18/05/2026 | É o termo textual da fonte e é distinto de Condutax CTT 2023. Não significa automaticamente taxista trabalhando, veículo em operação, alvará ou vaga. |

O arquivo da série mantém os campos `Ano` e `Taxis (1)`. A marca `**` em 2001 e 2002 está ligada à nota `Dados indisponíveis`; os valores visuais `0` não foram reinterpretados.

## Gate 2C — proveniência do snapshot

`Snapshot manual em PDF de página oficial` é uma evidência local produzida por impressão do navegador e não um documento PDF originalmente emitido pelo DTP. Ele conserva o texto e a URL impressa da página, mas sua autoria técnica de PDF é do navegador (Chrome/Skia). Os indicadores nele citados mantêm as definições acima: frota é veículo; `cadastro ativo no DTP` é a expressão administrativa publicada; nenhum deles equivale automaticamente a alvará, Condutax histórico ou pessoa trabalhando.
