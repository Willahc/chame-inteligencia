# Índice de Prioridade Comercial — Versão 1.0.0

Data: 06/09/2026  
Status: Vigente no MVP Comercial da Chame Táxi  
Escopo: Classificação determinística de contas hospitalares e corporativas de saúde

---

## 1. Princípios e Limitações Estruturais

O **Índice de Prioridade Comercial (v1.0.0)** foi desenvolvido como uma métrica determinística, explicável e estritamente ancorada em dados públicos oficiais do CNES/DATASUS e contatos profissionais corporativos auditados.

### O que o índice NÃO faz:
- Não inventa nem estima faturamento presumido;
- Não estima número arbitrário de funcionários;
- Não projeta volume fictício de corridas;
- Não assume contratos vigentes inexistentes;
- Não inventa decisores ou cargos;
- Não altera nem substitui o `IndicePrioridadeHospitalar` (v1.0.0), que permanece canônico para a camada de instituições.

---

## 2. Critérios, Pesos e Fórmulas Determinísticas

A pontuação total varia de **0 a 100 pontos**, distribuída em 11 componentes objetivos:

| Critério | Rótulo | Peso | Regra de Cálculo | Justificativa Gerada |
| :--- | :--- | :---: | :--- | :--- |
| `estruturaMultiunidade` | Estrutura multiunidade | **15** | ≥5 unid: 1.0 (15 pts); 3-4 unid: 0.8 (12 pts); 2 unid: 0.6 (9 pts); 1 unid: 0.2 (3 pts) | Potencial de circulação de colaboradores e equipes entre múltiplas unidades da mesma organização. |
| `numeroDeHospitais` | Presença hospitalar | **15** | ≥3 hosp: 1.0 (15 pts); 2 hosp: 0.85 (13 pts); 1 hosp: 0.6 (9 pts); 0 hosp: 0.1 (1.5 pts) | Alta densidade de demanda médica, plantonistas e viagens corporativas contínuas. |
| `segmentoComercial` | Segmento comercial | **15** | `NUCLEO_HOSPITALAR`: 1.0 (15 pts); `SAUDE_CORPORATIVA_EXPANDIDA`: 0.65 (10 pts); `BAIXA_PRIORIDADE_INICIAL`: 0.2 (3 pts); Outros: 0.0 | Aderência aos segmentos estratégicos definidos na segmentação comercial 2.1.0. |
| `naturezaPrivada` | Natureza privada | **10** | `PRIVADO`: 1.0 (10 pts); `INDETERMINADO`: 0.3 (3 pts); `PUBLICO`: 0.0 (0 pts) | Ciclo de compras corporativo privado vs exigência legal de licitação pública formal. |
| `operacao24h` | Operação 24 horas | **10** | Sim: 1.0 (10 pts); Não: 0.1 (1 pt) | Troca de turnos noturnos e atendimento em horários sem cobertura regular de transporte coletivo. |
| `urgenciaEmergencia` | Urgência e emergência | **10** | Sim: 1.0 (10 pts); Não: 0.1 (1 pt) | Picos imprevisíveis de demanda assistencial e suporte rápido de mobilidade. |
| `dispersaoGeografica` | Dispersão geográfica | **5** | ≥3 cidades: 1.0 (5 pts); 2 cidades: 0.7 (3.5 pts); 1 cidade: 0.3 (1.5 pts); 0: 0.1 | Deslocamento intermunicipal de executivos, médicos e técnicos. |
| `numeroDeUnidades` | Total de unidades | **5** | ≥10 unid: 1.0 (5 pts); 5-9 unid: 0.8 (4 pts); 2-4 unid: 0.5 (2.5 pts); 1 unid: 0.2 (1 pt) | Escala total de pontos operacionais cadastrados sob a conta. |
| `existenciaContatos` | Contatos verificados | **5** | ≥1 contato ativo: 1.0 (5 pts); 0 contatos: 0.0 (0 pts) | Prontidão operacional para início imediato da abordagem comercial. |
| `confiancaVinculo` | Confiança do vínculo | **5** | `OFICIAL`: 1.0 (5 pts); `ISOLADO`: 0.85 (4.25 pts); `PROVAVEL`: 0.6 (3 pts); `INCERTO`: 0.2 (1 pt) | Segurança no direcionamento da abordagem à mantenedora ou matriz correta. |
| `coberturaDados` | Cobertura cadastral | **5** | (cobertura% / 100) * 5 pts | Completude dos dados oficiais verificados da instituição. |
| **Total** | | **100** | | |

---

## 3. Faixas de Prioridade Comercial

- **`MUITO_ALTA`** (≥ 80 pontos): Redes hospitalares privadas de grande porte, multiunidade, operação contínua e contatos públicos mapeados.
- **`ALTA`** (60 a 79 pontos): Contas com forte potencial corporativo e alta densidade hospitalar ou clínica.
- **`MODERADA`** (40 a 59 pontos): Contas com potencial relevante, porém demandando pesquisa de contatos ou com menor escala de unidades.
- **`BAIXA`** (&lt; 40 pontos): Contas públicas (sujeitas a edital) ou de baixa aderência inicial ao transporte corporativo.

---

## 4. Distribuição das Contas Reais no MVP (7.550 contas)

- **Muito Alta**: 1 conta (`PREVENT SENIOR ATENDIMENTO A SAUDE LTDA` — 85 pts)
- **Alta**: 39 contas (incluindo `FLEURY S A`, `CEMA`, `NOTRE DAME INTERMEDICA`, `REDE D'OR`, `BANCO DE SANGUE DE SP`, `EBENEZER`, `DASA`, `SIRIO-LIBANES`, etc.)
- **Moderada**: 348 contas
- **Baixa**: 7.162 contas (majoritariamente entidades públicas licitatórias ou pequenos estabelecimentos isolados de baixa aderência)
