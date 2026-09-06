# Gate 4 — Enriquecimento oficial de CNPJ / Receita Federal

Data do diagnóstico: 04/09/2026

## Situação do Gate

**GATE 4 — AGUARDANDO AUTORIZAÇÃO PARA INGESTÃO MASSIVA**

Esta etapa executou somente a descoberta da fonte e a definição reprodutível do recorte local. Não houve download de base CNPJ, criação de lote, alteração de banco, migração, promoção de vínculo, mudança da regra de agrupamento `1.0.0` ou da segmentação `2.1.0`.

## Fonte oficial identificada

| Item | Evidência |
| --- | --- |
| Órgão | Secretaria Especial da Receita Federal do Brasil (RFB) |
| Página oficial do conjunto | `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros/cnpj` — redireciona ao Portal Brasileiro de Dados Abertos para o conjunto `Cadastro Nacional da Pessoa Jurídica (CNPJ)` |
| Página institucional | `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros` |
| Leiaute oficial | `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf` |
| Condições indicadas | Conteúdo do portal publicado sob Creative Commons Atribuição-SemDerivações 3.0 Não Adaptada; confirmar as condições do recurso da competência escolhida antes de baixá-lo. |
| Formato | Arquivos próprios para carga em banco relacional, delimitados por ponto e vírgula (`;`). |

O leiaute oficial separa os dados em tabelas. `EMPRESAS` traz CNPJ básico, razão social, natureza jurídica, capital social e porte. `ESTABELECIMENTOS` traz CNPJ básico, ordem, dígitos verificadores, identificador matriz/filial, nome fantasia, situação cadastral, datas, CNAE, UF e município. O identificador oficial é `1` para matriz e `2` para filial.

O leiaute também documenta arquivos de domínios, incluindo municípios, naturezas jurídicas e CNAEs. O arquivo de sócios não é necessário para o escopo atual e não deve ser ingerido: evitaria dados pessoais desnecessários.

## Viabilidade da fonte

As páginas oficiais consultadas indicam publicação do CNPJ como conjunto de arquivos estruturados para carga relacional nacional. Não foi identificada API pública oficial, seletiva e documentada que aceite a lista local de CNPJs e entregue somente os respectivos registros. O catálogo atual exige JavaScript e não expõe, de modo verificável nesta etapa, um manifesto de competência com nomes, quantidades e tamanhos dos arquivos.

Por isso, não é possível registrar com fidelidade a competência, a lista de arquivos, o tamanho agregado, o SHA-256 ou a estratégia de atualização antes de selecionar uma competência e baixar os recursos. Baixar a distribuição nacional apenas para resolver 322 CNPJs prioritários pode exigir arquivos nacionais grandes e é expressamente vedado sem autorização adicional.

## Universo candidato reprodutível

Fonte local: `Instituicao` `FATO_OFICIAL`, `SegmentacaoComercial`, `GrupoEconomico` e `RegistroBrutoCNES` aceito. O CNPJ foi lido exclusivamente de `NU_CNPJ` do payload CNES já preservado. A validação aplicou tamanho de 14 dígitos e os dois dígitos verificadores; nenhum CNPJ foi buscado por nome.

| Recorte | Unidades | CNPJs únicos | Válidos | Inválidos | Ausentes | CNPJs básicos válidos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Todas as privadas do Núcleo Hospitalar | 334 | 322 | 322 | 0 | 11 | 216 |
| Redes privadas com presença no Núcleo Hospitalar | 220 | 217 | 217 | 0 | 2 | 41 |
| Isoladas privadas do Núcleo Hospitalar | 203 | 193 | 193 | 0 | 10 | 183 |
| Privadas da Saúde Corporativa Expandida (universo ainda não priorizado) | 2.399 | 2.323 | 2.323 | 0 | 74 | 2.127 |

As 40 redes privadas do Núcleo Hospitalar continuam classificadas pelo Gate 3 como 5 `OFICIAL`, 35 `PROVAVEL` e 0 `INCERTO`. Essa classificação não foi modificada por este diagnóstico.

## Estratégia proposta após autorização

1. Escolher, no catálogo oficial, uma competência com manifesto publicamente verificável e registrar URL, nomes, tamanhos e condições de uso.
2. Baixar somente as tabelas necessárias: `ESTABELECIMENTOS`, `EMPRESAS` e domínios de CNAE, municípios e natureza jurídica. Não baixar QSA.
3. Processar os arquivos como fluxo, filtrando os 322 CNPJs ou 216 CNPJs básicos do Núcleo Hospitalar sem carregar a base inteira no SQLite de produção.
4. Preservar os arquivos brutos e calcular SHA-256 antes da publicação; criar `Fonte` e `LoteIngestao` auditáveis.
5. Persistir somente os registros correspondentes ao recorte autorizado e as relações matriz/filial explicitamente presentes na fonte.
6. Expandir para a Saúde Corporativa Expandida somente com critério de priorização aprovado e explicitamente versionado.

## Regras que permanecem obrigatórias

- Receita Federal é `FATO_OFICIAL` independente de CNES; não resolve a lacuna de mantenedora CNES.
- Mesmo CNPJ básico e relação matriz/filial oficial podem fundamentar uma relação empresarial explicável, mas não serão chamados de grupo econômico sem a evidência apropriada.
- Razão social normalizada continuará `HIPOTESE`; nunca promoverá vínculo por si só.
- Conflitos, CNPJs não resolvidos e situações cadastrais não ativas serão preservados, sem apagar instituições reais.

## Próxima decisão necessária

Autorizar, de modo explícito, o download e processamento controlado dos arquivos nacionais da competência oficial selecionada, após a confirmação do respectivo manifesto de arquivos e tamanho. Sem essa autorização, não é seguro iniciar a implementação ou a ingestão.
