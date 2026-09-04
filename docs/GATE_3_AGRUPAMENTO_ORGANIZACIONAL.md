# Gate 3 — Agrupamento Organizacional e Múltiplas Unidades do CNES
## Relatório analítico do comando `agrupar:organizacoes`

Data: 2026-09-04 · Regra `1.0.0` · Normalizador `1.0.0` · Universo: 8.212 instituições `FATO_OFICIAL` CNES

---

## 1. Objetivo

Identificar **organizações e redes** (grupo econômico, múltiplas unidades, mantenedora comum) dentro do universo CNES já ingerido — preservando a distinção canônica entre **vínculo oficial** (comprovado por dados do CNES) e **hipótese** (inferida por normalização de razão social). Nenhuma fonte externa foi consultada (Receita Federal, ANS ou sites), nenhuma chamada a IA e nenhum dado pessoal ou de CNPJ novo foi coletado.

---

## 2. Regra de vínculo e confiança

| Vínculo | Confiança | Tipo de dado | Critério |
|---|---|---|---|
| `OFICIAL` | ALTA | FATO_OFICIAL | `NU_CNPJ` idêntico ou `NU_CNPJ_MANTENEDORA` idêntico **declarado no CNES** |
| `PROVAVEL` | MÉDIA | HIPÓTESE | razão social normalizada idêntica (normalizador v1.0.0) |
| `ISOLADO` | BAIXA | inferência | nada detectado (cada instituição em grupo próprio) |
| `INCERTO` | BAIXA | HIPÓTESE | normalização agrupou naturezas jurídica divergentes (público+privado) → `statusRevisao AJUSTE_NECESSARIO`, `precisaRevisao = true` |

Princípio fundamental confirmado em código e na interface: **razão social normalizada nunca é prova de grupo econômico** — agrupamento por nome gera `HIPOTESE`, nunca `FATO_OFICIAL`. A natureza público/privado vem **somente** de `CO_NATUREZA_JUR` (`10xx/11xx` = público; `classificarNatureza`), nunca do nome.

---

## 3. Normalização determinística e versionada

`VERSAO_NORMALIZADOR_RAZAO = "1.0.0"` (`src/domain/agrupamento/normalizacao.ts`). Aplica, em ordem:

1. maiúsculas, sem acentos, sem pontuação, espaços múltiplos colapsados;
2. `&` → `" E "`;
3. sufixos legais reduzidos: `LTDA`, `SA`, `S/A`, `S A`, `SOCIEDADE ANONIMA`, `EIRELI`, `ME`, `EPP`;
4. colapso de `S.S.`/`S S` → `SS`.

Sem fuzzy agressivo: não remove palavras que alterem identidade econômica. Razões genéricas (`NOMES_GENERICOS`: CLINICA, CENTRO MEDICO, HOSPITAL, LABORATORIO...) **não agrupam** e, antes da comparação, `ehRazaoGenerica` reduz sufixos legais para não criar grupos falsos de nomes genéricos.

Demonstração na amostra real: `PAPAIZ ASSOCIADOS ... S A` e `... SA` (9 unid) e `NOTRE DAME INTERMEDICA SAUDE S A`/`SA` (6 unid) agrupadas graças ao colapso de `S A` → `SA`.

---

## 4. Comando e idempotência

`npm run agrupar:organizacoes` (`scripts/agrupar-organizacoes.ts`): consulta instituições `FATO_OFICIAL`, extrai CNPJ/CNPJ mantenedora/razão social/natureza do payload bruto, aplica Union-Find e grava em transação com timeout estendido.

Execuções (Rollback seguro, sem `skipDuplicates` — não suportado em SQLite):

| Execução | Criados | Atualizados | Órfãos removidos |
|---|---|---|---|
| 1ª | 7.560 | — | — |
| 2ª | 10 | 7.540 | 20 |
| 3ª | **0** | **7.550** | **0** |

**Determinístico e idempotente:** a 3ª execução não alterou nada (`criados: 0`, `atualizados: 7.550`, órfãos `0`).

---

## 5. Números finais (versão 1.0.0)

| # | Métrica | Valor |
|---|---|---|
| 1 | Instituições `FATO_OFICIAL` | 8.212 |
| 2 | Com CNPJ válido no payload | 7.812 |
| 3 | Sem CNPJ (núcleo/isoladas por sem-CNPJ) | 400 |
| 4 | Razões sociais distintas | 7.596 |
| 5 | Total de agrupamentos | 7.550 |
| 6 | Agrupamentos com múltiplas unidades | 265 |
| 7 | Unidades dentro de agrupamentos múltiplos | 927 |
| 8 | Instituições isoladas | 7.285 |
| 9 | Vínculo oficial (`OFICIAL`) | 23 |
| 10 | Agrupamento provável (`PROVAVEL`) | 241 |
| 11 | Relação incerta (`INCERTO`) | 1 |
| 12 | Natureza pública (instituições) | 139 |
| 13 | Natureza privada | 8.073 |
| 14 | Natureza indeterminada | 0 |
| 15 | Núcleo hospitalar (total) | 400 |
| 16 | Núcleo privado | 334 |
| 17 | Núcleo público | 66 |
| 18 | Núcleo isolado privado | 203 |
| 19 | Núcleo privado em redes | 131 |
| 20 | Redes privadas com núcleo hospitalar | 40 |

Bate com o diagnóstico prévio (Gate 3 diagnóstico) e com a segmentação 2.1 (NUCLEO = 400), sem alterar a segmentação aprovada.

---

## 6. Amostras reais (top 20 por nº de unidades)

| Agrupamento | Vínculo | Confiança | Natureza | Unidades | Evidência |
|---|---|---|---|---|---|
| PREFEITURA DO MUNICIPIO DE SAO PAULO | OFICIAL | ALTA | Pública | 96 | CNPJ mantenedora 46392130000380 |
| FLEURY S A | OFICIAL | ALTA | Privada | 50 | CNPJ mantenedora 60840055000131 |
| SECRETARIA DE ESTADO DA SAUDE DE SAO PAULO | OFICIAL | ALTA | Pública | 36 | CNPJ mantenedora 46374500000194 |
| DIAGNOSTICOS DA AMERICA S A (DASA) | PROVAVEL | MÉDIA | Privada | 22 | razão normalizada |
| BANCO DE SANGUE DE SAO PAULO E SERVICOS DE HEMOTERAPIA LTDA | OFICIAL | ALTA | Privada | 16 | CNPJ mantenedora 61369047000111 |
| PREVENT SENIOR ATENDIMENTO A SAUDE LTDA | PROVAVEL | MÉDIA | Privada | 15 | razão normalizada |
| DELBONI MEDICINA DIAGNOSTICA S A | PROVAVEL | MÉDIA | Privada | 13 | razão normalizada |
| CEMA HOSPITAL ESPECIALIZADO LIMITADA | PROVAVEL | MÉDIA | Privada | 11 | razão normalizada |
| VITA CLINICAS MEDICINA ESPECIALIZADA LTDA | PROVAVEL | MÉDIA | Privada | 11 | razão normalizada |
| OFTALMOMED CLINICA DE OLHOS LTDA | PROVAVEL | MÉDIA | Privada | 10 | razão normalizada |
| ISO RADIOLOGIA DIAGNOSTICO POR IMAGEM LTDA | PROVAVEL | MÉDIA | Privada | 9 | razão normalizada |
| PAPAIZ ASSOCIADOS DIAGNOSTICOS POR IMAGEM S A | PROVAVEL | MÉDIA | Privada | 9 | razão normalizada (mistura `S A`/`SA`) |
| CLINICA PREMIUM CARE SAUDE LTDA | PROVAVEL | MÉDIA | Privada | 8 | razão normalizada |
| AMICO SAUDE LTDA | OFICIAL | ALTA | Privada | 7 | CNPJ mantenedora 51722957000182 |
| CLIDEC CLINICA DENTARIA ESPECIALIZADA CURA D ARS LTDA | PROVAVEL | MÉDIA | Privada | 7 | razão normalizada |
| MRSPF CLINICA MEDICA LTDA | PROVAVEL | MÉDIA | Privada | 7 | razão normalizada |
| CLINICA ADRIANA VILARINHO LTDA | PROVAVEL | MÉDIA | Privada | 6 | razão normalizada |
| NOVAMED GESTAO DE CLINICAS LTDA | PROVAVEL | MÉDIA | Privada | 6 | razão normalizada |
| NOTRE DAME INTERMEDICA SAUDE S A | PROVAVEL | MÉDIA | Privada | 6 | razão normalizada (`S A`→SA) |
| REDE DOR SAO LUIZ S A | PROVAVEL | MÉDIA | Privada | 6 | razão normalizada (`S A`→SA) |

Outras redes relevantes capturadas: SOCIEDADE BENEFICENTE DE SENHORAS HOSPITAL SIRIO LIBANES (4, provável), BENEFICENCIA NIPO BRASILEIRA DE SAO PAULO (3, provável), além de hospitais universitários públicos (FMUSP etc.).

### Único `INCERTO` (revisão obrigatória)

`org-5d4baf89` — "HOSPITAL DAS CLINICAS FMUSP" e "FUNDACAO FACULDADE DE MEDICINA" (2 unid), natureza INDETERMINADO, `AJUSTE_NECESSARIO`. Provável coincidência de denominação entre entidade pública e fundação — exatamente o caso para o qual o vínculo `INCERTO` existe. Fila de revisão: **242 grupos** (241 prováveis + 1 incerto).

---

## 7. Limitações conhecidas (v1.0.0)

1. **Vínculo por mantenedora depende do payload:** `NU_CNPJ_MANTENEDORA` só gera `OFICIAL` quando declarado no CNES. Repetidor de CNPJ mantenedora ainda **não é ingerido em massa** — 23 vínculos oficiais vieram somente do campo declarado. Evolução futura: ingestão do módulo de mantenedoras do CNES (fora do escopo atual).
2. **Colapso de sufixo:** `S A` → `SA` e `S.S.`/`S S` → `SS` já convergem na versão final; variações não capturadas ficam como `ISOLADO`, nunca como grupo falso.
3. **Sem fuzzy:** grafias divergentes (ex.: "CURA D ARS" × "CURA D'ARS") permanecem separadas como `ISOLADO` — comportamento conservador intencional.
4. **Público/privado:** idêntico ao gate 2.1 (via `CO_NATUREZA_JUR`); não exclui o público do banco, apenas não o foca comercialmente.
5. **DEMONSTRACAO preservada:** o grupo fictício `grupo-horizonte-demo` permanece e é filtrado da listagem de organizações.

---

## 8. Integração na interface

- **Página `/organizacoes`** — lista de agrupamentos (nome, nº unidades, vínculo, confiança, natureza, municípios, tipos, status de revisão) com busca e filtros; destaque "somente múltiplas unidades" (padrão) e "somente revisão necessária".
- **Página `/organizacoes/[id]`** — detalhe com aviso de **HIPÓTESE**: "este agrupamento foi inferido por normalização de razão social e ainda não representa vínculo econômico confirmado"; composição do agrupamento, regra/evidência/revisão e tabela das instituições (CNES, município, tipo, segmento, índice, link para a instituição).
- **Radar** — coluna "Organização / Rede" com link ao agrupamento; filtros novos: organização/rede, natureza, vínculo, "privadas multi-unidade" e "revisão necessária".
- **Assistente** — novas intents ("vinculo oficial", "agrupamentos prováveis", "relação incerta", "revisão necessária", "redes privadas") com respostas determinísticas que diferenciam fato de hipótese.
- **Navegação** — item "Organizações" no menu lateral (ícone Network).

---

## 9. Qualidade

| Verificação | Resultado |
|---|---|
| `npx next typegen` | ✓ rotas `/organizacoes` e `/organizacoes/[id]` geradas |
| `npm run typecheck` | ✓ sem erros |
| `npm run test` | ✓ 58/58 passam (8 arquivos, inclui 15 testes do agrupamento) |
| `npm run lint` | ✓ sem erros |
| `npm run build` | ✓ compila com as rotas novas (dynamic) |
| `npm run agrupar:organizacoes` | ✓ 3ª execução idempotente (0 criados / 7.550 atualizados / 0 órfãos) |

Testes obrigatórios do gate cobrem: vínculo oficial por CNPJ e por mantenedora, provável por razão normalizada, isolado por CNPJ inválido, incerto por natureza divergente, razões genéricas sem agrupamento, idempotência determinística, normalização de sufixos (`S A`, `LTDA`, `EIRELI`, `ME`/`EPP`) e `S.S.`→`SS`.

---

## 10. Decisão do Gate

- Regra de vínculo **conservadora** (oficial só com CNES; provável só como HIPÓTESE); razão social nunca vira fato.
- Hipóteses sempre marcadas e agrupadas na fila de revisão (**242 grupos**) — diferenciadas na interface e no assistente.
- Números determinísticos e reprodutíveis; segmentação 2.1 intacta; nenhuma dependência nova; nenhuma chamada externa; nenhum dado pessoal.

**Recomenda-se a aprovação do GATE 3** com as limitações da seção 7 registradas como backlog de evolução.

*Aguardando autorização explícita para criar o commit.*