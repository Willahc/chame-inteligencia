# GATE 3 — CNPJ, Grupo Econômico e Múltiplas Unidades (Diagnóstico + Design)

Versão: 1.0 · Data: 2026-09-04 · Escopo: diagnóstico analítico e desenho conceitual, **sem alteração de banco de dados**.

## 1. Objetivo

Transformar o universo CNES de "lista de estabelecimentos" em visão comercial por **grupo econômico / rede**.
Este documento contém a análise exploratória (diagnóstico) e o desenho de modelo proposto, exclusivamente a partir dos dados já ingeridos do CNES — **sem chamada externa, sem CNPJ/ANS/IA** (regras do projeto).

## 2. Fontes e método

- Fonte: payloads brutos de `RegistroBrutoCNES` (arquivo oficial `cnes_estabelecimentos.csv`), com os campos `NO_RAZAO_SOCIAL`, `NO_FANTASIA`, `NU_CNPJ`, `NU_CNPJ_MANTENEDORA`, `CO_NATUREZA_JUR`.
- Universo: **8.212** Instituição `FATO_OFICIAL` com segmentação comercial (GATE 2.1).
- Ferramenta executável: `scripts/diagnostico-gate3.ts` (ler e reprodutível).
- Nenhum dado novo foi ingerido; nenhuma chamada externa foi realizada.

## 3. Campos disponíveis no CNES (já no banco)

| Campo | Papel | Cobertura observada |
|---|---|---|
| `NU_CNPJ` | CNPJ do estabelecimento | 7.812 / 8.212 (95,1%) válidos (14 dígitos) |
| `NU_CNPJ_MANTENEDORA` | CNPJ da mantenedora | ~172 instâncias com valor; **majoritariamente vazio** no arquivo de estabelecimentos |
| `NO_RAZAO_SOCIAL` | Razão social (do próprio estabelecimento) | 100% preenchido (8.212) |
| `NO_FANTASIA` | Nome fantasia do estabelecimento | 100% preenchido |
| `CO_NATUREZA_JUR` | Código IBGE de natureza jurídica | 8.206 / 8.212 (99,9%) |

**Conclusão de fonte:** o grupo econômico **não é diretamente legível** no arquivo de estabelecimentos — o CNPJ do estabelecimento tem relação ~1:1 com a unidade. A informação de *mantenedora* pertence ao **módulo Mantenedora ficha SCNES** (vínculo mantenedora↔estabelecimento mantido no cadastro do CNES), ainda **não ingerido**. A disponibilidade como recurso aberto de download deverá ser confirmada na etapa de implementação (mesmo assim, permanece no domínio do CNES — não é chamada externa). Decisão de ingestão fica pendente de aprovação de escopo.

## 4. Diagnóstico — resultados

### 4.1 Público x privado (natureza jurídica)

Códigos `10xx`/`11xx` (órgãos públicos) = **público**; demais = **privado**.

| Segmento | Total | Público | Privado |
|---|---|---|---|
| NUCLEO_HOSPITALAR | 400 | 66 | 334 |
| SAUDE_CORPORATIVA_EXPANDIDA | 2.472 | 72 | 2.400 |
| BAIXA_PRIORIDADE_INICIAL | 5.340 | 1 | 5.339 |
| **Total** | **8.212** | **139 (1,7%)** | **8.073 (98,3%)** |

- NUCLEO: **66 hospitais/órgãos públicos** (~31 natureza estadual `1023`, ~30 municipal `1031`) ligados a Prefeitura/Secretaria de Estado → **não são alvo comercial da Chame**. Comercialmente, o Núcleo privado = **334** estabelecimentos.
- SAUDE privado = 2.400; BAIXA privado = 5.339.

### 4.2 Cobertura de CNPJ

| Métrica | Valor |
|---|---|
| Com CNPJ de estabelecimento válido | 7.812 (95,1%) |
| Sem CNPJ (14 dígitos) | 400 (4,9%) — sobretudo órgãos públicos e PJ não declarada |
| Com CNPJ mantenedora preenchido | 172 instâncias (2,1%) |

### 4.3 Multiplicidade

**Por CNPJ (`NU_CNPJ`):**
- 7.797 CNPJs distintos; **7.782 com 1 unidade**; 15 com 2 unidades.
- CNPJ ≈ unidade (1:1). **Não serve como chave de rede.**

**Por razão social (`NO_RAZAO_SOCIAL`):**
- 7.596 razões distintas; **249 com ≥ 2 unidades** → cobrem **865 unidades (10,5%)**.
- Com normalização ortográfica (S.A/SA, LIMITEDA/LTDA, ME/EPP/EIRELI, acentos, pontuação): **254 grupos privados multi-unidade, 772 unidades**.

**Por natureza jurídica + multiplicidade (comercial):**
- Grupos privados multi-unidade (razão normalizada): **254 grupos / 772 unidades**.
- Grupos privados com presença de NUCLEO: **40 grupos / 218 unidades** (média ≈ 5,5 unidades/grupo).
- Grupos privados com NUCLEO ou SAUDE: **135 grupos**.
- NUCLEO privado: **205 isolados** (razão com 1 unidade) + **129 unidades em ~40 redes**.

### 4.4 Redes e órgãos mais representativos (por razão social)

**Privadas (alvo comercial):**

| Razão social | Unid. | Segmentos |
|---|---|---|
| FLEURY (S A + SA) | ~50 | SAUDE + NUCLEO |
| DIAGNOSTICOS DA AMERICA / DASA (S A + SA) | ~22 | SAUDE + NUCLEO |
| BANCO DE SANGUE DE SAO PAULO E SERVICOS DE HEMOTERAPIA | 15 | SAUDE + NUCLEO |
| PREVENT SENIOR ATENDIMENTO A SAUDE | 15 | SAUDE + NUCLEO |
| DELBONI MEDICINA DIAGNOSTICA | 13 | SAUDE |
| CEMA HOSPITAL ESPECIALIZADO | 10 | NUCLEO |
| ISO RADIOLOGIA DIAGNOSTICO POR IMAGEM | 9 | SAUDE |
| CLINICA PREMIUM CARE | 8 | NUCLEO + SAUDE + BAIXA |
| AMICO SAUDE | 7 | NUCLEO + SAUDE |
| REDE DOR SAO LUIZ | 6 | NUCLEO + SAUDE |

> Observação de qualidade de dados: duplicidades ortográficas fragmentam grupos ("FLEURY S A" 39 + "FLEURY SA" 11; "DIAGNOSTICOS DA AMERICA S A" 13 + "DIAGNOSTICOS DA AMERICA SA" 9). **Todo agrupamento depende de normalização determinística documentada.**

**Públicas (não-alvo comercial):**

| Razão social | Unid. |
|---|---|
| PREFEITURA DO MUNICIPIO DE SAO PAULO | 88 |
| SECRETARIA DE ESTADO DA SAUDE (variantes) | ~38 |
| SECRETARIA MUNICIPAL DA SAUDE | 2 |

## 5. Leitura comercial (responde a hipótese do backlog do Gate 2.1)

Confirma-se do Gate 2.1: das 1.645 clínicas em SAUDE_CORPORATIVA_EXPANDIDA (entrada por turno estendido), **a maioria é PJ isolada, de baixo valor de rede**.
O Gate 3 separa naturalmente:
- **Redes realmente interessantes** (FLEURY, DASA, DELBONI, ISO, PREMIUM CARE, AMICO, REDE DOR etc.) — clientes de negócio multiunidade;
- **Unidades isoladas de pouco valor comercial** — mantidas nos segmentos atuais, com lacuna de grupo documentada.

Impacto estimado do Núcleo comercial: **400 → 129 unidades em ~40 redes + 205 isoladas + 66 públicas (fora de escopo)**.

## 6. Design proposto (conceitual — sem alterar banco)

### 6.1 Princípios
- Grupo econômico é **camada anexa** à segmentação; não re-segmenta aderência.
- Rastreabilidade: cada vínculo unidade→grupo tem origem de dados, data, confiança e status de revisão.
- Nunca apresentar inferência como fato: agrupamento heurístico = `HIPOTESE`/`INFERENCIA`; vínculo por mantenedora oficial (módulo Mantenedora/SCNES) = `FATO_OFICIAL`.
- Sem dados pessoais; sem CNPJ/ANS/IA externos.

### 6.2 Pipeline proposto
1. **Normalização da razão social** (determinística): uppercase, remoção de acentos, colapso de espaços, sufixos jurídicos (SA/LTDA/LIMITADA/ME/EPP/EIRELI), pontuação. → chave de agrupamento `chaveRazao`.
2. **Formação de grupos de trabalho** por `chaveRazao` normalizada, validados por `NU_CNPJ` quando 1 grupo = 1 CNPJ.
3. **Classificação do grupo** (público/privado) via `CO_NATUREZA_JUR` dominante (10xx/11xx = público).
4. **(Futuro, sob aprovação)** ingestão do vínculo de mantenedora do CNES (módulo Mantenedora/SCNES, se disponível como recurso aberto) → vincular unidade↔mantenedora oficial e **promover/validar** os grupos heurísticos a `FATO_OFICIAL`, incluindo grupos multi-CNPJ (redes reais).

### 6.3 Modelo sugerido (evolução do modelo `GrupoEconomico` já existente no schema)
- `GrupoEconomico` mantém `nome`, `tipoDado` (inicia em `HIPOTESE`) e relação 1:N com `Instituicao` (via `grupoEconomicoId`, já existente).
- Campos a validar na implementação (decisão posterior, sem mudar banco agora):
  - `chaveRazao` (chave normalizada)
  - `cnpjMantenedora` (múltiplos, quando vínculo de mantenedora ingerido)
  - `publico` (boolean derivado de `CO_NATUREZA_JUR`)
  - `quantidadeUnidades` e agregação por segmento (NUCLEO/SAUDE/BAIXA)
  - lote de origem (rastreabilidade de ingestão)
- Interface: seção "Grupo econômico" na página da instituição + visão agregada "Redes" no radar (filtro por grupo, unidades do mesmo grupo).

### 6.4 Regras de negócio (propostas)
- Uma instituição pertence a **exatamente um** grupo de trabalho.
- Instituição **sem razão normalizável e sem mantenedora**: permanece no segmento atual, com `grupoEconomicoId = null` e lacuna visível (rastreabilidade preservada). Corresponde aos casos atuais em que a razão é inadequada para agrupar.
- Grupo **público** fica marcado `tipoDado = FATO_OFICIAL` quando oficial (módulo Mantenedora/SCNES) e `HIPOTESE` quando derivado de razão — nunca aparece como oportunidade comercial sem validação.
- Redes com presença NUCLEO privado são a prioridade comercial do Gate 3.

## 7. Riscos e limitações

1. **Razão social normalizada é proxy**, não verdade legal de grupo: pode fraturar (grafias divergentes) ou colidir (homônimas). Mitigação: validação por CNPJ e, ao final, revisão humana.
2. **CNPJ do estabelecimento não revela rede** (1:1); usar apenas como âncora, nunca como chave de grupo.
3. **400 registros sem CNPJ** (4,9%): órgãos públicos e PJ não declaradas — manutenção no segmento atual, lacuna documentada.
4. **139 públicos** concentrados no NUCLEO (66): fora do escopo comercial; filtráveis por natureza jurídica.
5. Recurso de mantenedoras (módulo Mantenedora/SCNES) não ingerido: **vínculo oficial mantenedora↔unidade indisponível** até decisão de escopo (ainda dentro do CNES, sem chamada externa).

## 8. Próximos passos (mediante aprovação de escopo)

1. Validar e aprovar este diagnóstico + design.
2. Decidir sobre ingestão do vínculo de mantenedora do CNES (módulo Mantenedora/SCNES, se disponível como recurso aberto) para promover grupos heurísticos a oficial.
3. Implementar: normalização, grupos de trabalho, classificação público/privado e camada de interface (sem re-segmentar aderência).
4. Testes: pureza (cada unidade em 1 grupo), idempotência, rastreabilidade e invariantes do universo (8.212).

## 9. Invariantes preservados neste diagnóstico

- Universo: 8.212 `FATO_OFICIAL` (nenhuma alteração).
- Nenhuma alteração em `prisma/schema.prisma`.
- Nenhuma re-segmentação / nenhuma mudança de pesos / faixas do GATE 2.1.
- Nenhuma chamada externa; nenhum dado pessoal; nenhum CNPJ/ANS/IA.