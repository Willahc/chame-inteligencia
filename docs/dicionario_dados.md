# Dicionário de dados — campos efetivamente encontrados

Fonte: tabela exibida no PDF oficial `dtp_edital_002_2018_sorteio_pontos_taxi_consultado_20260923T0919.pdf`. Nenhum campo geográfico foi inventado ou derivado.

| Campo como publicado | Uso observado | Observação |
|---|---|---|
| `PONTO` | identificador/número do ponto de táxi | Exemplo publicado: 3063. |
| `ENDEREÇO` | logradouro de referência do ponto | Texto livre; exemplo: `MANUEL BANDEIRA, AV.` |
| `CAP` | capacidade de vagas, abreviada | A interpretação é apoiada pelo campo `CAPACIDADE` do resumo da mesma página. |
| `OCUP` | ocupação, abreviada | A interpretação é apoiada por `OCUPAÇÃO` no resumo. |
| `SALDO` | saldo de vagas | Exibido na linha individual e no resumo. |
| `SITUACAO` | situação do ponto | Exemplo publicado: `Ativo`. |
| `SUB` | código de subprefeitura, abreviado | O PDF exibe valor numérico, sem legenda. |
| `REGIÃO` | macro-região | Exemplo publicado: `OESTE`; resumo contém Centro, Leste, Oeste, Norte e Sul. |
| `PONTOS` | contagem de pontos por região | Campo presente apenas no resumo regional. |
| `CAPACIDADE` | capacidade agregada por região | Campo presente apenas no resumo regional. |
| `OCUPAÇÃO` | ocupação agregada por região | Campo presente apenas no resumo regional. |

Não foram encontrados campos de latitude, longitude, geometria, CRS, categoria detalhada, data de alteração por ponto ou dados pessoais de motoristas.

## Gate 1B — anexos de 2024

Nenhum dos cinco PDFs regionais de 2024 estava presente em `data/raw/dtp/` na auditoria de 23/09/2026. Assim, este Gate não adiciona campos ao dicionário e não reutiliza os campos da base histórica de 2018 como se fossem campos de 2024.

## Gate 1B — campos efetivamente encontrados nos anexos de 2024

Os cinco anexos usam o cabeçalho `PONTO ENDEREÇO CAP OCUP SALDO SITUAÇÃO SUB REGIÃO`. A tabela abaixo descreve exclusivamente o conteúdo de 2024; não combina nem substitui o dicionário histórico de 2018 acima.

| Campo como publicado | Uso observado em 2024 | Presença / ressalva |
|---|---|---|
| `PONTO` | identificador numérico do ponto | Presente nas 1.187 linhas; não houve ID duplicado. |
| `ENDEREÇO` | referência de logradouro do ponto | Presente nas 1.187 linhas; texto livre, não geocodificado nem corrigido. |
| `CAP` | capacidade do ponto | Presente nas 1.187 linhas. |
| `OCUP` | ocupação do ponto | Presente nas 1.187 linhas. |
| `SALDO` | vagas disponíveis para sorteio | Presente nas 1.187 linhas; soma 3.634. |
| `SITUAÇÃO` | situação do ponto | Presente nas 1.187 linhas; valor textual observado: `Ativo`. |
| `SUB` | código de subprefeitura | Ausente no texto de quatro linhas: pontos 1633 (Leste), 3136 e 3211 (Norte), 3151 (Sul). |
| `REGIÃO` | macro-região | Presente nas 1.187 linhas; valores: CENTRO, LESTE, NORTE, OESTE, SUL. |

Não há coluna de categoria, distrito, bairro, latitude, longitude, geometria, CRS ou data de atualização por ponto nos anexos de 2024.

## Camada posterior - taxistas por CNAE (dados abertos do CNPJ/RFB)

Corte 2026-09-14, municipio 7107 (SAO PAULO/SP). Dois artefatos: `data/processed/taxistas_sp_cnae_receita_2026-09-14.csv` (completo, com contato) e `..._publico.csv` (minimizado, sem contato direto). 80.615 linhas em ambos.

| Campo | Origem no layout RFB | Descricao | Ressalva |
|---|---|---|---|
| `CNPJ` | `CNPJ_BASICO`+`CNPJ_ORDEM`+`CNPJ_DV` | CNPJ completo na notacao oficial `00.000.000/0000-00` | a ordem distingue matriz (`0001`) de filial |
| `RAZAO_SOCIAL` | `Empresas` campo 1 | razao social como registrada | no Empresario Individual reproduz o nome civil do titular: **dado pessoal** |
| `NOME_FANTASIA` | `Estabelecimentos` campo 4 | nome fantasia do estabelecimento | ausente em 86,9% dos registros |
| `NATUREZA_JURIDICA_COD` | `Empresas` campo 2 | codigo de 4 digitos | `2135` Empresario (Individual); `2062` Sociedade Empresaria Limitada |
| `NATUREZA_JURIDICA` | derivado | rotulo em texto dos dois codigos acima | demais naturalezas ficam vazias |
| `EH_EMPRESARIO_INDIVIDUAL_MEI` | derivado de `NATUREZA_JURIDICA_COD` | `SIM` quando 2135 | proxy de MEI pela natureza juridica; nao confirma opcao pelo Simples |
| `PORTE` | `Empresas` campo 5 | porte declarado | |
| `CAPITAL_SOCIAL` | `Empresas` campo 4 | capital social em reais | |
| `CNAE_TAXI_ENCONTRADOS` | derivado | CNAEs da familia taxi que casa com o registro | ordenacao nao e significantemente |
| `CNAE_FISCAL_PRINCIPAL` | `Estabelecimentos` campo 11 | CNAE da atividade principal | 8.844 registros com `4923001` |
| `CNAE_FISCAL_SECUNDARIA` | `Estabelecimentos` campo 12 | CNAEs secundarios, separados por virgula | |
| `CNAE_TAXI_DESCRICAO` | derivado de `Cnaes.zip` | descricao legivel de cada CNAE encontrado | |
| `SITUACAO_CADASTRAL` | `Estabelecimentos` campo 5 | rotulo em texto do codigo de 2 digitos | 56.768 `Ativa` |
| `DATA_INICIO_ATIVIDADE` | `Estabelecimentos` campo 10 | data de inicio no formato ISO | |
| `DATA_SITUACAO_CADASTRAL` | `Estabelecimentos` campo 6 | data da situacao atual, ISO | |
| `MATRIZ_OU_FILIAL` | `Estabelecimentos` campo 3 | `Matriz` ou `Filial` | |
| `LOGRADOURO` | `Estabelecimentos` campos 13 e 14 | tipo e nome do logradouro | versao publica remove |
| `NUMERO` / `COMPLEMENTO` | campos 15 e 16 | numero e complemento | versao publica remove |
| `BAIRRO` | campo 17 | bairro do municipio | unico campo de granularidade espacial retido na versao publica |
| `CEP` | campo 18 | CEP de 8 digitos | versao publica remove |
| `MUNICIPIO` / `UF` | derivado do filtro | municipio e sigla fixos no recorte | |
| `TELEFONE_1` / `TELEFONE_2` | campos 21-24 | telefone com DDD | **dado pessoal**; removido na versao publica |
| `CORREIO_ELETRONICO` | campo 27 | e-mail cadastrado | **dado pessoal**; removido na versao publica |
| `RAZAO_SOCIAL_PUBLICA` | derivado | razao social minimizada | versao publica: mascarada quando Empresario Individual, preservada quando LTDA |

A fonte nao traz latitude, longitude, geometria, CRS, data de alteracao por registro, numero do Condutax, matricula de condutor, ponto vinculado nem situacao do alvara municipal. **Ter CNAE de taxi no CNPJ nao comprova Condutax valido nem exercicio efetivo da atividade.** Os 80.615 registros sao o universo cadastral, nao a frota: 58.926 (73,0%) tem CNAE `4923002` (locacao de automoveis com motorista, transporte por aplicativo), que nao e o CNAE de taxi. O nucleo `4923001` e' de 21.511 registros em qualquer posicao, 8.844 como atividade principal e 4.248 principal + `Ativa` + Empresario Individual.

Nenhum campo de dado pessoal foi criado, inferido ou completado por este pipeline. Nao houve geocodificacao, matching com pontos, contato, perfilamento nem publicacao.

## Camada posterior - Planilha Mestre e política de duas camadas (29/09/2026)

A `planilha_mestre_taxistas_sp_2026.csv` completa tem 99 colunas e contem dados pessoais de pessoas naturais; ela e' mantida apenas localmente e consta do `.gitignore`. A versao versionada, `planilha_mestre_taxistas_sp_2026_publico.csv`, nasce com 13 colunas removidas:

`Genero`, `Idade_Minima_Estimada`, `Ano_Nascimento_Estimado_Min`, `Ano_Nascimento_Estimado_Max`, `CPF_Identificado`, `Telefone_Celular_1`, `Telefone_Celular_2`, `WhatsApp_Ativo`, `Email_Principal`, `Bairro_Residencial`, `CEP`, `Chave_Busca_Bureau_Pessoa`, `Query_Busca_Google_DTP`.

Alem da remocao de colunas, `scripts/privacy.py` redige em texto livre qualquer CPF no formato `000.000.000-00` e qualquer link `wa.me/<numero>`, o que atinge `Melhor_Identificador_Busca` (ex.: `CPF: [REMOVIDO] (Receita Federal)`) e `DOC_Resumo_Texto`.

Permanecem versionados, por serem dado institucional ou publico: telefone de ponto/CFC/empresa (`Ponto_Telefone`, `Telefone_Ponto_DTP`, `Telefone_Central`, `telefone_ponto`), e-mail corporativo (`Dominio_Email_Corporativo`, `Email_Provavel_Decisor_Mapeado`, `Email_Canal_Compras_Institucional`), nome completo, Condutax, alvara e numeros de processo - estes ultimos vindos de atos publicados no Diario Oficial.

A coluna `Melhor_Identificador_Busca` e' preservada na versao publica com o CPF redigido, porque carrega tambem Condutax e alvara. Verificacao: `python scripts/privacy.py check`.

## Camada posterior - dados abertos derivados (29/09/2026)

Cinco CSVs em `data/processed/`, todos com separador `;` e nenhum dado pessoal:

| Arquivo | Colunas | Observacao |
|---|---|---|
| `sgtp_licencas_taxi_mensal.csv` | `tipo_veiculo` (C/S-CARRO), `titulacao` (AUTONOMO/EMPRESA), `categoria` (ACESSÍVEL, COMUM, COMUM RÁDIO, ESPECIAL, EXECUTIVO, LUXO, `(subtotal)`), `jan_2026`…`mai_2026` | reorganizacao do CSV do SGTP, que vem em blocos com quantidade e percentual alternados; linhas `(subtotal)` somam as categorias da titulacao |
| `frota_ativa_sp_por_municipio_2026-08.csv` | `id_ibge`, `municipio`, `mesorregiao_ibge`, `e_capital`, `frota_total`, `automoveis`, `motocicletas`, `onibus`, `veiculos_carga`, `veiculos_especiais`, `periodo` | 645 municipios do estado; o bruto do Detran tem 3,2 milhoes de linhas (municipio × categoria × especie × tipo) e fica fora do Git |
| `sinistros_vitimas_taxistas_infosiga_mensal.csv` | `ano_mes`, `municipio`, `profissao` (TAXISTA/MOTOTAXISTA), `vitimas_taxista`, `graves`, `fatais`, `outras_gravidades`, `total_vitimas_estado_no_mes`, `arquivos_fonte` | uma linha por municipio/profissao/mes; `graves`/`fatais` vem de `qtd_gravidade_*` da fonte |
| `acidentes_sp_por_subprefeitura_2025-09_2026-08.csv` | `subprefeitura`, `sinistros`, `sinistros_fatais`, `sinistros_nao_fatais`, `notificacoes`, `vitimas_fatais`, `atropelamentos`, `colisoes`, `choques`, `envolvidos_total`, `periodo` | 34 balcoes: 32 subprefeituras + `Sem coordenada` + `Fora dos poligonos`; `notificacoes` sao eventos com `tipo_registro = NOTIFICACAO` (nao classificados) |
| `acidentes_sp_mensal_2025-09_2026-08.csv` | `ano_mes`, `sinistros`, `sinistros_fatais`, `sinistros_nao_fatais`, `notificacoes`, `vitimas_fatais`, `atropelamentos`, `colisoes`, `choques`, `envolvidos_total` | serie temporal do municipio |

`envolvidos_total` e' a soma de `qtd_pedestre + qtd_bicicleta + qtd_motocicleta + qtd_automovel + qtd_onibus + qtd_caminhao + qtd_veic_outros` do evento. `vitimas_fatais` pode ser maior que `sinistros_fatais` porque um evento tem mais de uma vitima.