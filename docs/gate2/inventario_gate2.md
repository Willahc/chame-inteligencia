# Inventário e auditoria estrutural — Gate 2

Data da auditoria: 23/09/2026, America/Sao_Paulo. Escopo limitado a inventário, preservação de originais e auditoria estrutural. Não há arquivo em `data/processed/` e não foi coletada informação pessoal.

## Estado

**PARTIAL.** Há fonte oficial de frota com ano-base identificado (Infocidade, 2025) e um PDF oficial baixado com agregados de Condutax e alvarás de 2023. Entretanto, o XLSX da série de frota bloqueou automação (HTTP 403) e não há contagem pública localizada que comprove Condutax ou taxistas **ativos** em data posterior, nem relação pública consolidada de empresas frotistas.

## Arquivo original baixado

| Arquivo | Fonte / órgão | Formato | HTTP | Bytes | SHA-256 | Metadados e estrutura |
|---|---|---|---:|---:|---|---|
| `data/raw/dtp/estatisticas/Apresentacao_CTT_DEZ_2023.pdf` | Câmara Temática do Táxi / DTP, PMSP | PDF | 200 | 1.218.361 | `adcaa8f55b70b603af757111c7940cbfa9c4f78a42175e23e6990a8f3a4a66d9` | 5 páginas, não criptografado, camada textual em todas as páginas. `/Title`: Slide 1; `/Author`: M124392; criação/modificação 13/12/2023 −03:00; produtor/criador Microsoft Office PowerPoint 2007. |

O PDF possui apresentação, não tabela estruturada. A página 3 contém os agregados e categorias abaixo; as páginas 1 e 5 são apenas título, a 2 contém itens operacionais e a 4 trata de faixas exclusivas. Não há registros individuais, valores ausentes em campos individuais ou duplicidades a testar. Não foram detectados dados pessoais no conteúdo usado.

## Fontes oficiais auditadas sem download local

| Fonte | Formato disponível | Situação | Estrutura / período |
|---|---|---|---|
| Infocidade — Frota de Táxis | XLSX e PDF/HTML | XLSX retornou HTTP 403 à automação; arquivo de erro não foi mantido em `data/raw` | Série anual de 1983 a 2025, 43 observações; campos `Ano` e `Táxis`. |
| Página oficial sobre empresas frotistas | HTML | retorno HTTP 403 à automação; arquivo de erro não foi mantido | Documento normativo/notícia de 06/12/2024; não é lista de empresas. |

## Frota de táxis — série oficial Infocidade

- Cobertura: Município de São Paulo; período 1983–2025; unidade: número de táxis.
- Ano-base mais recente: **2025**, com **37.643 táxis**.
- 2001 e 2002 aparecem como `0`, mas a nota oficial define-os como **dados indisponíveis**; não devem ser tratados como frota zero.
- A própria fonte informa que em 2025 houve revisão da série histórica por consolidação de dados oriundos da Secretaria Municipal de Transportes. Assim, ela substitui valores anteriormente exibidos: por exemplo, a versão anterior mostrava 37.280 para 2023 e 37.387 para 2024; a versão revisada mostra 37.634 e 36.935, respectivamente.
- A data de referência histórica é dezembro nos metadados da versão anterior da mesma tabela, com exceções metodológicas antigas; a versão 2025 não explicita mês de referência na tabela aberta. Registrar somente ano-base para 2025.

## Agregados CTT/DTP — referência 2023

O documento, intitulado `Câmara Temática do Táxi - 2023`, não informa data de extração do sistema. O ano-base inferível é 2023, compatível com o título e com os comparativos 2023 × 2022; não deve ser interpretado como situação atual de 2026.

| Conceito, mantido separado | Valor publicado | Detalhe publicado |
|---|---:|---|
| Condutax | 54.407 | O slide não o qualifica como ativo, válido ou em exercício. |
| Taxistas que fizeram cadastro | 54.176 | Métrica de cadastro da plataforma; não equivale necessariamente a Condutax nem a motorista em atividade. |
| Alvarás de estacionamento | 37.602 | Comum 34.724; Comum Rádio 2.088; Especial 607; Luxo 183. |
| Alvarás de autônomos com carro | 30.874 | Subconjunto de alvarás, não contagem de pessoas. |
| Alvarás de autônomos sem carro | 3.737 | Subconjunto de alvarás. |
| Alvarás de empresas com carro | 1.799 | Alvarás vinculados a empresa, não número de empresas. |
| Alvarás de empresas sem carro | 1.192 | Alvarás vinculados a empresa, não número de empresas. |
| Pontos | 2.012 | Não combinar com o inventário de 1.187 pontos de sorteio de 2024. |
| Vagas | 28.716 | Não combinar com as 3.634 vagas disponíveis para sorteio em 2024. |

Verificações aritméticas internas: categorias de alvará somam 37.602; blocos Autônomos/Empresas, com e sem carro, também somam 37.602. A frota revisada do Infocidade para 2023 (37.634) diverge dos 37.602 alvarás da apresentação por 32. Isso é uma divergência entre fontes/snapshots e conceitos: a apresentação não informa data de extração nem declara que alvará seja igual a veículo/frota. Não foi feita reconciliação ou inferência.

## Categorias e empresas de frota

Categorias efetivamente identificadas nos agregados de 2023: Comum, Comum Rádio, Especial e Luxo. A página institucional de táxi também menciona Acessível e Executivo em regras/tarifas, mas não há total agregado dessas categorias no PDF CTT 2023.

Há regra oficial de credenciamento para empresas frotistas (Termo de Permissão), mas **nenhuma relação pública consolidada de empresas de frota foi localizada**. A regra de mínimo de veículos (15 na criação até 40 após cinco anos; com exigências de acessibilidade) não permite contar empresas. Não foram feitas pesquisas nominais.

## Gate 2B — complemento da série e fotografia administrativa 2026

**Status: PARTIAL (23/09/2026).** O arquivo original recebido foi auditado integralmente. A publicação DTP de 2026 foi confirmada no site oficial, mas não pôde ser preservada localmente: a tentativa única de download HTML devolveu HTTP 403. Por isso o critério de cópia verificável local da publicação 2026 permanece pendente.

### Arquivo manual auditado

| Arquivo original | Formato real | Tamanho | SHA-256 | Páginas / estrutura |
|---|---|---:|---|---|
| `data/raw/infocidade/02_frotataxi_1983_2025.pdf` | PDF 1.7 (não XLSX) | 147.340 bytes | `fa8939dc3f0718595a0b6ff03d018a446208930b0deb0e1420394ea78fe74abf` | 1 página, não criptografado, tabela textual extraível; título `Frota de Táxis`; campos `Ano` e `Taxis (1)`. |

O nome original preservado é `02_frotataxi_1983_2025.pdf`. Metadados: autor `L088969`; criação/modificação 06/02/2026 15:53:29 −03:00; produtor/criador Microsoft Excel 2019. Por ser PDF, não há planilhas, dimensões de planilha, células ou fórmulas a auditar; não se trata de falha de leitura de XLSX, mas de diferença entre o formato efetivamente recebido e o formato inicialmente esperado.

Foram extraídas estruturalmente 43 observações anuais, de 1983 a 2025, sem lacunas de ano. Não há células vazias aplicáveis ao formato PDF. O arquivo registra `2001** 0` e `2002** 0`, mas a nota `(**) Dados indisponíveis` se aplica explicitamente a ambos: os zeros são representação visual de indisponibilidade e não devem ser usados como frota zero. A nota também declara revisão da série em 2025 por consolidação dos dados da Secretaria Municipal de Transportes. O valor de 2025 foi confirmado como **37.643**.

### Publicação DTP 2026

Na publicação oficial de 18/05/2026, 15:18, sob a Secretaria Municipal de Mobilidade Urbana e Transporte, o texto informa: `A cidade de São Paulo conta com uma frota de 37.586 táxis e 63.319 taxistas com cadastro ativo no DTP.` Assim, as expressões solicitadas estão confirmadas no conteúdo oficial e seu contexto é explicitamente a cidade de São Paulo.

Não foi criado arquivo bruto da publicação: o endpoint retornou HTTP 403 ao `curl`, com resposta de 134 bytes que era apenas página de erro e foi descartada. Não foram inventados hash, tamanho ou arquivo para essa página. O cabeçalho HTTP da tentativa permanece em `logs/gate2/dtp_maio_amarelo_2026_headers.txt`.

### Conciliação descritiva, sem equivalência de unidades

| Referência | Valor | Natureza |
|---|---:|---|
| Infocidade 2023 | 37.634 táxis | observação anual revisada de frota. |
| CTT 2023 | 37.602 alvarás | licenças; não são necessariamente veículos. |
| CTT 2023 | 54.407 Condutax | cadastro sem qualificação de atividade no documento. |
| Infocidade 2025 | 37.643 táxis | observação anual de frota. |
| DTP 18/05/2026 | 37.586 táxis | fotografia administrativa divulgada na data da notícia. |
| DTP 18/05/2026 | 63.319 taxistas com cadastro ativo no DTP | termo expresso da fonte; não prova que todos estejam trabalhando. |

- Diferença aritmética descritiva: 37.586 (DTP 2026) − 37.643 (Infocidade 2025) = **−57 táxis**.
- Diferença aritmética descritiva: 63.319 (cadastro ativo DTP 2026) − 37.586 (frota DTP 2026) = **25.733**.

Essas diferenças não são estimativa de motoristas disponíveis, adesão, vínculo ou recrutamento. A série Infocidade não foi alterada pelo número publicado na notícia.

## Gate 2C — validação do snapshot manual da publicação DTP 2026

**Status final do Gate 2: PASS (23/09/2026).** A evidência local solicitada foi preservada como snapshot manual, com hash e proveniência explícitos. Este status substitui o bloqueio de preservação automatizada registrado no Gate 2B, mas não muda o fato histórico de que o endpoint recusou `curl` com HTTP 403.

| Item | Resultado |
|---|---|
| Nome e caminho preservado | `data/raw/dtp/estatisticas/snapshot_publicacao_dtp_frota_condutores_2026_20260923.pdf.pdf` (nome real, mantido sem renomear) |
| Classificação | **Snapshot manual em PDF de página oficial**; não é PDF original publicado pelo DTP. |
| Tamanho | 652.994 bytes |
| Versão / páginas | PDF 1.4; 3 páginas; não criptografado |
| SHA-256 | `d7f857bc5a202a4ade1383baf91d7d287c271a0cbe5290ddffdb79d64c6bc731` |
| Horário do arquivo | última modificação local: 23/09/2026 10:16:26 BRT; criação local: 10:17:18 BRT; metadado PDF: 23/09/2026 13:16:17 UTC (10:16:17 BRT) |
| Produtor | `Skia/PDF m154`; criador: Chrome 154 em Windows |
| Proveniência | página oficial SMT/DTP, captura manual no navegador em 23/09/2026, motivada pelo HTTP 403 da coleta automatizada; URL canônica registrada em `fontes_gate2.md`. |

Validação textual na camada de texto do snapshot:

- título da publicação, repartido em linhas, presente: `DTP realiza ações educativas sobre importância do uso do cinto de segurança por todos os passageiros nos táxis em ação do Maio Amarelo 2026`;
- identificação `Secretaria Municipal de Mobilidade Urbana e Transporte` e `Departamento de Transportes Públicos (DTP)` presente;
- data publicada `Segunda-feira, 18 de Maio de 2026 | Horário: 15:18` presente;
- contexto: `A cidade de São Paulo conta com uma frota de 37.586 táxis e 63.319 taxistas com cadastro ativo no DTP.` presente;
- os valores solicitados aparecem textualmente, ainda que divididos pela quebra de linha da impressão: `37.586 táxis` e `63.319 taxistas com cadastro ativo no DTP`;
- o host e caminho da URL canônica aparecem nos rodapés da impressão; o sufixo de rastreio está truncado no próprio snapshot.

Quadro consolidado mantido sem conversão de unidades:

| Ano / referência | Fonte | Indicador | Valor |
|---|---|---|---:|
| 2023 | CTT/DTP | Frota Infocidade revisada | 37.634 táxis |
| 2023 | CTT/DTP | Alvarás | 37.602 |
| 2023 | CTT/DTP | Condutax, sem atributo de atividade | 54.407 |
| 2025 | Infocidade | Frota anual | 37.643 táxis |
| 18/05/2026 | SMT/DTP, snapshot manual da página oficial | Frota, fotografia administrativa | 37.586 táxis |
| 18/05/2026 | SMT/DTP, snapshot manual da página oficial | Taxistas com cadastro ativo no DTP | 63.319 |

O snapshot não muda a série anual, não transforma alvará em veículo e não interpreta cadastro ativo como trabalho efetivo.
