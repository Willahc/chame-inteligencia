# Gate 2.1 — Segmentação Comercial do Universo CNES
## Relatório analítico de auditoria

Data: 2026-09-04 · Regra `ADERENCIA_COMERCIAL_2.1.0` · Universo: 8.212 instituições `FATO_OFICIAL` CNES

---

## 1. Investigação de `FORA_DO_FOCO_ATUAL = 0` — corrigido e demonstrado

### Tipos CNES que podem cair em `FORA_DO_FOCO_ATUAL`

O ramo `FORA_DO_FOCO_ATUAL` de `determinarSegmento` é alcançado **somente** quando o tipo oficial:

1. não contém nenhum dos tipos hospitalares (`Hospital geral`, `Hospital especializado`, `Hospital-Dia`);
2. não contém `Pronto Atendimento`;
3. não contém `Centro de Diagnóstico`;
4. não contém `Clínica / Centro de Especialidade`;
5. **e** o total de aderência é menor que 40.

É a braço final do algoritmo (fallback explícito), sem qualquer transformação de tipo desconhecido em clínica/baixa prioridade.

### Registros com tipo não reconhecido

Existem 9 valores distintos em `TipoEstabelecimento`:

| Tipo | Qtd | Proveniência |
|---|---|---|
| Clínica / Centro de Especialidade | 7.003 | FATO_OFICIAL |
| Centro de Diagnóstico | 598 | FATO_OFICIAL |
| Hospital geral | 343 | FATO_OFICIAL |
| Pronto Atendimento | 232 | FATO_OFICIAL |
| Hospital-Dia | 26 | FATO_OFICIAL |
| Hospital especializado | 12 | FATO_OFICIAL |
| Rede hospitalar | 1 | **DEMONSTRAÇÃO** (não entra no pipeline) |
| Centro de diagnóstico (variação de caixa) | 1 | **DEMONSTRAÇÃO** |
| Clínica especializada (variação de caixa) | 1 | **DEMONSTRAÇÃO** |

O comando `segmentar:comercial` filtra `tipoDado = 'FATO_OFICIAL'`, portanto os três tipos variantes são **excluídos do pipeline**. Normalização (acentos + caixa) cobre 100% dos registros reais com os 6 tipos canônicos.

### Fallback para tipo desconhecido

Não existe. Tipos não reconhecidos seguem para BAIXA quando `total >= 40` e para `FORA_DO_FOCO_ATUAL` quando `total < 40`. Não há conversão de desconhecido para clínica.

### A regra "desconhecido → FORA" está viva?

Sim. O teste `calcular-aderencia.test.ts` ("classifica tipo desconhecido sem aderência como FORA_DO_FOCO_ATUAL") passa, provando o caminho.

### Existem tipos reais que deveriam estar fora do foco?

Não. Os 8.212 registros aceitos são todos estabelecimentos de saúde dos 6 tipos canônicos. Não há estabelecimento "fora do escopo" (ex.: não-saúde) no universo aceito. A população de menor aderência já está capturada em `BAIXA_PRIORIDADE_INICIAL` (5.340).

**Conclusão:** `FORA_DO_FOCO_ATUAL = 0` é o resultado **correto** para o universo aceito. A regra existe, é testada e será exercitada quando houver tipos não canônicos. **Nenhuma alteração de regra foi feita para forçar registros em FORA.**

---

## 2. Auditoria de `SAUDE_CORPORATIVA_EXPANDIDA` (2.472)

### Decomposição por tipo CNES

| Tipo CNES | Qtd | % do segmento | Regra |
|---|---|---|---|
| Clínica / Centro de Especialidade | 1.645 | 66,5% | Tipo + estrutura (turno ≥ 0,6 ou flag ambulatorial) |
| Centro de Diagnóstico | 597 | 24,2% | **Type-driven** — todo Centro de Diagnóstico |
| Pronto Atendimento | 230 | 9,3% | **Type-driven** — todo Pronto Atendimento |

### Composição estrutural (flags)

Sobre os 2.472 registros:
- com `ST_ATEND_AMBULATORIAL = 1`: **11**
- com complexidade estrutural: **0**
- com `ST_ATEND_HOSPITALAR = 1`: **0**
- sem nenhuma flag, entrada somente por turno estendido ou tipo: **2.461**

As 1.645 clínicas de saúde corporativa entraram **quase totalmente por turno estendido** (`CO_TURNO_ATENDIMENTO ≥ 04` → fator 0,6+), não por bandeiras de estrutura. Isto é esperado dada a cobertura real do payload (ServicoSaude vazio, operacao24h uniformemente false, flags majoritariamente ausentes).

### Especialidades isoladas (odondo/psicologia/fisioterapia)

| Palavra-chave | Em SAUDE | Em BAIXA |
|---|---|---|
| ODONTO | 220 | 685 |
| PSICOLOG | 155 | 332 |
| FISIOTERAPIA/FISIO | 68+58 | 124+99 |
| **Total (sem sobreposição por amostra)** | **447** | **~1.372** |

As que estão em SAUDE entraram por turno estendido (ex.: clínica odontológica com turno manhã+tarde+noite → índice 37, confiança MÉDIA). Clinicamente são estabelecimentos simples, mas a operação com três turnos é um sinal oficial de demanda contínua — comportamento previsto e documentado na regra como "estrutura relevante". A maioria das especialidades isoladas de turno único permanece em BAIXA.

**Avaliação:** segmento comercialmente coerente (ponto de entrada ~índice 34–56). Não há diagnóstico/laboratório/PA classificados equivocadamente; as entradas questionáveis são sinalizadas por `faixa FORA_DO_FOCO` + revisão humana.

---

## 3. Auditoria de `NUCLEO_HOSPITALAR` (400)

| Tipo oficial | Qtd |
|---|---|
| Hospital geral | 342 |
| Hospital-Dia | 26 |
| Hospital especializado | 11 |
| Clínica / Centro de Especialidade | 18 |
| Pronto Atendimento | 2 |
| Centro de Diagnóstico | 1 |

Os **21 registros não-hospitalares** entraram porque carregam o indicador oficial `ST_ATEND_HOSPITALAR = 1` (verificado via `componentesJson`: `atendimentoHospitalar=15/15`). Exemplos verificados:
- `HOSP DE CLINICAS J HELENA` (Clínica) — idx 98, confiança ALTA
- `CLINICA PREMIUM CARE UNIDADE MORUMBI` (Clínica) — idx 95
- `UPA VERA CRUZ` (Pronto Atendimento) — idx 88

A regra respeita a flag oficial: uma clínica com capacidade hospitalar declarada ao CNES pertence ao núcleo hospitalar. Coerente com a diretriz de preservar CNES/flags oficiais.

---

## 4. Amostragem real

Executada via consulta direta ao SQLite (sem fontes externas). Amostra representativa de 20 registros por segmento (NUCLEO, SAUDE, BAIXA) capturada em `scripts/audit-seg.ts`; FORA sem registros (vazio coerente — seção 1). Destaques:

- **NUCLEO (top):** idx 98 em todos os principais hospitais (BRASILANDIA, SANCTA MAGGIORE, PREVINA, ALBERT EINSTEIN, USP, OSWALDO CRUZ...), confiança ALTA.
- **SAUDE:** UPA TATUAPE idx 56/MÉDIA; Premium Care (7 filiais) idx 47; centros de diagnóstico idx 46 (turno 06).
- **BAIXA:** clínicas de turno único diurno, idx 31 uniforme, confiança BAIXA (ex.: ANDRETTA ODONTOLOGIA, clínicas de psicologia, fisioterapia).

---

## 5. Distribuição do índice de aderência

### Estatísticas (— 8.212 registros)

| Métrica | Valor |
|---|---|
| Mínimo | 25 |
| Máximo | 98 |
| Média | 34,9 |
| Mediana (P50) | 31 |
| P25 | 31 |
| P75 | 37 |
| P90 | 37 |
| P95 | 46 |

### Faixas

| Faixa | Qtd |
|---|---|
| 0–39 | 7.535 |
| 40–59 | 477 |
| 60–79 | 37 |
| 80–100 | 163 |

### SEGMENTO × FAIXA

| Segmento | ALTA | MEDIA | BAIXA | FORA_DO_FOCO |
|---|---|---|---|---|
| NUCLEO_HOSPITALAR | 163 | 37 | 200 | **0** |
| SAUDE_CORPORATIVA_EXPANDIDA | 0 | 0 | 277 | 2.195 |
| BAIXA_PRIORIDADE_INICIAL | 0 | 0 | 0 | 5.340 |

### Verificação de inconsistências

- **NUCLEO + FORA_DO_FOCO:** inexistente. Todos os hospitais ≥ 40. ✓
- **BAIXA + ALTA/MEDIA:** inexistente. BAIXA máx. 31. ✓
- **Observação (documentada, não é erro de segmentação):** 91,7% do universo exibe `faixa FORA_DO_FOCO`, incluindo 2.195 de SAUDE. Causa: as faixas `ALTA≥80 / MEDIA≥60 / BAIXA≥40` foram herdadas do Índice de Prioridade Hospitalar e calibradas para hospitais (que alcançam 46–98). Estabelecimentos não-hospitalares alcançam, por construção, no máximo ~56. A faixa é um atributo secundário; o **segmento** é o sinal comercial primário. Sem alteração de pesos.

---

## 6. Confiança

### Regra exata (`determinarConfianca`)

1. tipo hospitalar **E** pelo menos uma flag estruturada (`ST_ATEND_HOSPITALAR`, complexidade, `ST_ATEND_AMBULATORIAL`) → **ALTA**
2. tipo hospitalar **OU** alguma flag estruturada **OU** turno ≥ 0,6 → **MÉDIA**
3. caso contrário → **BAIXA**

### Distribuição

| Segmento | ALTA | MEDIA | BAIXA |
|---|---|---|---|
| NUCLEO_HOSPITALAR | 205 | 195 | 0 |
| SAUDE_CORPORATIVA_EXPANDIDA | 0 | 1.873 | 599 |
| BAIXA_PRIORIDADE_INICIAL | 0 | 0 | 5.340 |

Interpretação automática: NUCLEO com flags → ALTA; NUCLEO/SAUDE com sinal único → MÉDIA; BAIXA (sem sinal estruturado) → BAIXA. Coerente com a regra.

---

## 7. Revisão humana

### Estado atual (após correção)

| Status | Qtd | Semântica |
|---|---|---|
| NAO_REVISADO | 2.273 | regra aplicada, permite revisão |
| APROVADO | 0 | (reservado para aprovação humana explícita) |
| AJUSTE_NECESSARIO | 5.939 | **revisão obrigatória por confiança BAIXA** |

### Correção aplicada nesta auditoria

A primeira execução (regra antiga) gravou `AJUSTE_NECESSARIO` em 7.801 registros; as re-execuções não recomputavam `statusRevisao` no caminho de update, deixando dados **obsoletos**. Corrigido em `scripts/segmentar-comercial.ts`:
- re-execuções recomputam `statusRevisao` a partir da confiança atual;
- registros marcados `APROVADO` por humano **nunca** são sobrescritos pelo script;
- antes (obsoleto): AJUSTE 7.801 / NAO 411 → depois (convergiu): AJUSTE 5.939 / NAO 2.273, **igual** à confiança BAIXA.

Fila de revisão humana recomendada: **5.939** (confiança BAIXA) + avaliação amostral de MEDIA/ALTA.

---

## 8. Filtro "Somente oportunidades comerciais" — regra explícita

`somenteOportunidadesComerciais` agora inclui **exclusivamente**:
- `NUCLEO_HOSPITALAR`
- `SAUDE_CORPORATIVA_EXPANDIDA`

e exclui:
- `BAIXA_PRIORIDADE_INICIAL`
- `FORA_DO_FOCO_ATUAL`
- estabelecimentos sem segmentação

Regra codificada explicitamente em `filtros.ts` (allow-list, não negação) e alinhada à intent do assistente. Teste atualizado cobre os quatro segmentos + sem segmento. Mesmo que FORA esteja vazio hoje, a regra é literal em código.

---

## 9. Idempotência

Execuções do comando na versão final:

| Métrica | Antes | Após execução |
|---|---|---|
| Total de segmentações | 8.212 | 8.212 |
| Instituições únicas | 8.212 | 8.212 |
| Duplicações | 0 | 0 |
| Instituições perdidas | 0 | 0 |
| Segmentos (NUCLEO/SAUDE/BAIXA) | 400/2.472/5.340 | 400/2.472/5.340 |
| Amostra de índices (10 ids) | idêntica | idêntica |

Segunda execução: `criadas: 0`, `atualizadas: 8.212`. **Determinístico e idempotente.**

---

## 10. Qualidade

| Verificação | Resultado |
|---|---|
| `npm run lint` | ✓ sem erros |
| `npm run typecheck` | ✓ sem erros |
| `npm test` | ✓ 43/43 passam (7 arquivos) |
| `npm run build` | ✓ compila e gera rotas |
| `npm audit` | ✓ 0 vulnerabilidades |

---

## 11. Decisão do Gate

### Opção A — regras comercialmente coerentes

- **Segmentos refletem a estratégia:** NUCLEO = universo hospitalar real + capacidade hospitalar declarada (400) · SAUDE = PA, diagnóstico e clínicas com operação recorrente (2.472) · BAIXA = clínicas isoladas de turno único (5.340) · FORA = reserva para tipos não canônicos (hoje vazio por construção, não por falha).
- **Filtro comercial explícito** (NUCLEO + SAUDE apenas).
- **Confiança** derivada de regra determinística e audável.
- **Pesos não foram alterados** para melhorar distribuição; nenhum enriquecimento externo; mínimo de aderência coerente (BAIXA = 25, reais).

### Ressalvas documentadas (não bloqueiam o Gate)

1. **Escala de faixa herdada do IPH:** 91,7% do universo cai em `faixa FORA_DO_FOCO` (inclusive 2.195 de SAUDE). A faixa não discrimina não-hospitalares — retrabalho sugerido para um gate futuro (não re-calibrar agora).
2. **Sinal dominante em SAUDE é o turno:** só 11 clínicas chegaram com flag ambulatorial; as demais via `CO_TURNO_ATENDIMENTO`. Melhoria futura: incorporar ServicoSaude/leitos quando houver ingestão, sem aprovar agora.

### Antes × depois da auditoria

| Métrica | Antes (obsoleto) | Depois (convergido) | Causa |
|---|---|---|---|
| Segmentos | 400 / 2.472 / 5.340 / 0 | 400 / 2.472 / 5.340 / 0 | — (sem mudança de regra) |
| Faixa | 163 / 37 / 477 / 7.535 | 163 / 37 / 477 / 7.535 | — |
| Confiança | 205 / 2.068 / 5.939 | 205 / 2.068 / 5.939 | — |
| Revisão | AJUSTE 7.801 / NAO 411 | AJUSTE 5.939 / NAO 2.273 | convergência de status obsoleto |

### Decisão

**A) Regras atualmente comercialmente coerentes → GATE 2.1 passível de aprovação**, com as ressalvas registradas acima como itens de backlog de evolução.

*Aguardando autorização para criar o commit.*