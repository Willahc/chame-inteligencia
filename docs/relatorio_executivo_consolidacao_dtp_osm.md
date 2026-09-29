# Relatório Executivo — Consolidação e Análise Espacial dos Pontos de Táxi de São Paulo (DTP ↔ OSM)

**Projeto:** Inteligência de Dados e Mapeamento de Infraestrutura de Táxi  
**Entidade:** Cooperativa Chame Táxi  
**Data de Conclusão:** 23 de Setembro de 2026  
**Status do Pipeline:** Gates 1 a 6 concluídos com homologação **PASS**  
**Autoria / Engenharia:** Antigravity Data Intelligence  

---

## 1. Sumário Executivo

Este documento consolida as análises e descobertas do ciclo público de auditoria e integração de dados sobre a infraestrutura de pontos de táxi no Município de São Paulo. O pipeline espacial partiu de fontes públicas preservadas em estado bruto (DTP/SMT, GeoSampa e OpenStreetMap) e não tratou dados pessoais de motoristas. A camada posterior ao Gate 6, porém, incorporou registros públicos do Diário Oficial com nomes de motoristas e identificadores de atos, além de CPF, telefone e e-mail consolidados a partir de bases operacionais; desde 29/09/2026 esses dados ficam numa camada completa não versionada, e apenas a versão minimizada (`planilha_mestre_taxistas_sp_2026_publico.csv`) entra no Git, conforme `scripts/privacy.py`. Toda distribuição dessa camada continua exigindo revisão de finalidade, base legal, controle de acesso e minimização.

Pela primeira vez, foi estabelecido um pipeline determinístico em Python capaz de cruzar a relação oficial de pontos de táxi do **Edital DTP nº 002/2024** (1.187 pontos com 3.634 vagas abertas para sorteio) com a base vetorial do **OpenStreetMap** (extrato PBF Geofabrik do Sudeste), validada geometricamente contra o grid administrativo do **GeoSampa** (SIRGAS 2000 / EPSG:31983).

### Principais Indicadores Consolidados

- **Taxa Global de Georreferenciamento do Edital 2024**: **22,0%** (261 pontos pareados com coordenadas geográficas auditadas).
- **Aproveitamento das Feições OSM Municipais**: **44,0%** (261 das 593 feições de táxi ativas no município foram vinculadas ao edital de sorteio).
- **Pontos DTP Pendentes de Mapeamento no OSM**: **926 pontos** (78,0% do edital), revelando severas lacunas no mapeamento voluntário da capital.
- **Feições OSM sem Correspondência no Sorteio**: **332 feições** (pontos com 100% de ocupação sem vagas para sorteio, pontos extintos ou paradas informais).
- **Abismo Cartográfico Centro vs. Periferia**: Enquanto o Centro Expandido (Sé e Pinheiros) atinge ~30% de cobertura, **14 das 32 subprefeituras (43,8%)** e **37 dos 96 distritos municipais (38,5%)** registram cobertura nula no OSM.
- **Descolamento de Vagas (Spot Balance)**: Nos 112 pontos em que a capacidade física foi mapeada em campo no OSM, o DTP declara **1.760 vagas regulamentares**, mas o viário físico comporta apenas **488 baias imediatas** (relação de 3,6 vagas de direito para cada baia física no solo).

---

## 2. Metodologia de Integração Multi-fonte

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   DTP / Edital 2024    │      │  OpenStreetMap (OSM)   │      │   GeoSampa (Oficial)   │
│ 5 PDFs Regionais       │      │ PBF Geofabrik Sudeste  │      │ Limites, Subprefeituras│
│ 1.187 pontos / 3.634 vg│      │ 592 nós + 6 ways + 3 rel│      │ 96 Distritos (EPSG:31983)
└───────────┬────────────┘      └───────────┬────────────┘      └───────────┬────────────┘
            │                               │                               │
            │                   ┌───────────▼────────────┐                  │
            │                   │ Recorte Municipal PIP  │◄─────────────────┤
            │                   │ 100% dos nós em SP     │                  │
            │                   └───────────┬────────────┘                  │
            │                               │                               │
            ▼                               ▼                               ▼
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │                     PIPELINE DE MATCHING EM CAMADAS                          │
    │  - Camada 1: Regex de ID oficial DTP (official_name, name, ref, old_name)    │
    │  - Validação Topológica: Ponto OSM ⊂ cd_subprefeitura DTP (Buffer borda 50m) │
    │  - Camada 2: Desinversão de logradouro DTP + Levenshtein / Jaccard >= 0,85   │
    │  - Blocking Territorial: Comparação estrita restrita à mesma Subprefeitura   │
    │  - Camada 3: Centróides de coberturas físicas e descarte de eixos viários    │
    └───────────────────────────────────────┬──────────────────────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │            ARTEFATOS PROCESSADOS              │
                    │  - pontos_taxi_sp_consolidado.geojson (261)   │
                    │  - pontos_taxi_sp_consolidado.csv             │
                    │  - dtp_pontos_sem_osm.csv (926)               │
                    │  - osm_pontos_sem_dtp.csv (332)               │
                    │  - log_discrepancias_matching.jsonl (161)     │
                    └───────────────────────────────────────────────┘
```

### Regras de Pareamento Aplicadas

1. **Camada 1 — Identificador Numérico Oficial**:
   - Extrai número do ponto de `official_name`, `name`, `ref` e `old_name` via regex estrito `\b(\d{1,5})\b`.
   - Cruza com a coluna `PONTO` do DTP.
   - **Validação Espacial**: Compara a subprefeitura do nó no GeoSampa com a coluna `SUB` do DTP. Caso divirja, calcula a distância métrica até a divisa da subprefeitura declarada. Se $\le 50$ metros, aceita como via limítrofe (`MATCH_EXACT_ID_BORDER_BUFFER_50M`). Se divergir de macrorregião, bloqueia como conflito (`AMBIGUITY_ID_CONFLICT`).
2. **Camada 2 — Logradouro Fuzzy com Blocking Administrativo**:
   - Aplica normalização fonética e desinversão de vias DTP (`FRANCISCA MIQUELINA, R.` $\rightarrow$ `RUA FRANCISCA MIQUELINA`).
   - Compara apenas registros dentro da **mesma subprefeitura** (`cd_subprefeitura`).
   - Similaridade combinada $\ge 0,85$ com candidato único $\rightarrow$ aceito (`MATCH_FUZZY_ADDRESS_HIGH`).
   - Candidatos múltiplos com scores próximos na mesma via $\rightarrow$ isolados como ambiguidade (`AMBIGUOUS_MULTI_CANDIDATE_ADDRESS`).
3. **Camada 3 — Tratamento de Geometrias e Descarte de Anomalias**:
   - A Way `950146049` (cobertura Ponto 1668 Santo Eduardo) foi convertida em centróide.
   - 3 relations multipolígono foram confirmadas fora do município (Votuporanga, Araraquara, Praia Grande) e descartadas.
   - 4 eixos viários lineares com `taxi=yes` foram descartados por não serem pontos regulamentados de parada.
   - 1 ponto de moto-táxi em Paraisópolis foi isolado como anomalia modal.

---

## 3. Resultados e Indicadores Espaciais

### 3.1. Cobertura Espacial por Macrorregião

| Macrorregião | Pontos DTP (Edital 2024) | Pontos Pareados (OSM) | Taxa de Cobertura (%) | Vagas Totais DTP | Vagas Pareadas DTP | Pontos Pendentes DTP |
|---|---:|---:|---:|---:|---:|---:|
| **Centro** | 253 | 75 | **29,6%** | 3.756 | 1.367 | 178 |
| **Oeste** | 358 | 103 | **28,8%** | 4.901 | 1.468 | 255 |
| **Norte** | 113 | 25 | **22,1%** | 1.229 | 282 | 88 |
| **Leste** | 183 | 27 | **14,8%** | 2.046 | 337 | 156 |
| **Sul** | 280 | 31 | **11,1%** | 3.389 | 366 | 249 |
| **Total Município** | **1.187** | **261** | **22,0%** | **15.321** | **3.820** | **926** |

### 3.2. Ranking de Cobertura por Subprefeitura

A distribuição territorial demonstra a forte assimetria do mapeamento colaborativo. As subprefeituras de maior renda e fluxo concentram a quase totalidade dos pontos mapeados:

| Posição | Subprefeitura | Região | Pontos DTP | Pareados | Cobertura (%) | Pendentes |
|---|---|---|---:|---:|---:|---:|
| 1º | **Jabaquara** | Sul | 12 | 5 | **41,7%** | 7 |
| 2º | **Pinheiros** | Oeste | 202 | 77 | **38,1%** | 125 |
| 3º | **Vila Maria-Vila Guilherme** | Norte | 22 | 8 | **36,4%** | 14 |
| 4º | **São Mateus** | Leste | 3 | 1 | **33,3%** | 2 |
| 5º | **Santana-Tucuruvi** | Norte | 37 | 12 | **32,4%** | 25 |
| 6º | **Sé** | Centro | 253 | 75 | **29,6%** | 178 |
| 7º | **Mooca** | Leste | 99 | 25 | **25,3%** | 74 |
| 8º | **Lapa** | Oeste | 117 | 23 | **19,7%** | 94 |
| 9º | **Vila Mariana** | Sul | 137 | 23 | **16,8%** | 114 |
| 10º | **Casa Verde-Limão-Cachoeirinha** | Norte | 23 | 3 | **13,0%** | 20 |
| 11º | **Jaçanã-Tremembé** | Norte | 8 | 1 | **12,5%** | 7 |
| 12º | **Freguesia-Brasilândia** | Norte | 9 | 1 | **11,1%** | 8 |
| 13º | **Butantã** | Oeste | 39 | 3 | **7,7%** | 36 |
| 14º | **Vila Prudente** | Leste | 15 | 1 | **6,7%** | 14 |
| 15º | **Ipiranga** | Sul | 34 | 2 | **5,9%** | 32 |

> Quatro pontos DTP não tinham `SUB` preenchido e foram contabilizados separadamente como `NÃO INFORMADO`; a soma da tabela completa de cobertura, incluindo esse bucket, é 1.187 DTP, 261 pareados e 926 pendentes.

---

## 4. Balanço de Vagas: Capacidade Regulatória vs. Baias Físicas

Um dos achados mais relevantes do Gate 6 reside na comparação entre as vagas regulamentares e a capacidade física das paradas.

```
Nos 112 pontos com capacidade física mapeada no OSM:
┌────────────────────────────────────────────────────────┐
│ Vagas declaradas no DTP: 1.760 vagas (média 15,7 / pto)│
├────────────────────────────────────────────────────────┤
│ Baias físicas no OSM:     488 baias  (média  4,4 / pto)│
└────────────────────────────────────────────────────────┘
  Diferença: 1.272 vagas (72,3% das vagas regulamentares não possuem baia física direta)
```

### Análise Estrutural da Discrepância

1. **Casos em que DTP > OSM (97,3% dos pontos — 109 de 112)**:
   - Em quase a totalidade dos pontos, a capacidade oficial outorgada pelo DTP supera largamente o número de veículos que cabem fisicamente no ponto.
   - *Causa Técnica*: O DTP calcula a capacidade do ponto considerando a **capacidade de acolhimento do alvará de estacionamento**, prevendo fila de espera em vias transversais e rotatividade operacional ao longo das 24 horas. O OpenStreetMap, por sua vez, registra estritamente as baias demarcadas com pintura no pavimento defronte ao totem.
2. **Casos em que DTP == OSM (1,8% — 2 pontos)**:
   - Pontos de pequeno porte (ex: 3 a 4 vagas) onde a demarcação física no asfalto coincide exatamente com o decreto de criação do ponto.
3. **Casos em que DTP < OSM (0,9% — 1 ponto)**:
   - Casos residuais onde houve ampliação da sinalização pela CET sem a correspondente atualização do anexo do edital.

---

## 5. Matriz de Confiança e Matriz de Confusão do Matching

A metodologia determinística em duas camadas assegurou alta auditabilidade e rastreabilidade:

| Nível de Confiança | Status Algorítmico | Quantidade | Percentual | Justificativa Técnica |
|---|---|---:|---:|---|
| **ALTA (HIGH)** | `MATCH_EXACT_ID_GEO_VERIFIED` | 194 | 74,3% | ID numérico DTP extraído do OSM coincide com o edital e a coordenada geográfica está contida na mesma subprefeitura declarada. |
| **ALTA (HIGH)** | `MATCH_EXACT_ID_BORDER_BUFFER_50M` | 1 | 0,4% | ID numérico coincide e o ponto situa-se na linha de fronteira ($\le 50$ m) da subprefeitura vizinha declarada pelo DTP. |
| **MÉDIA (MEDIUM)** | `MATCH_EXACT_ID_SUBPREF_DIVERGENT` | 1 | 0,4% | ID numérico coincide e macrorregião é a mesma, com subprefeitura vizinha a $> 50$ m (possível erro cadastral de distrito do DTP). |
| **MÉDIA (MEDIUM)** | `MATCH_FUZZY_ADDRESS_HIGH` | 65 | 24,9% | Similaridade de logradouro normalizado $\ge 0,85$ com candidato único e validado na mesma subprefeitura. |
| **Total Consolidado** | — | **261** | **100,0%** | |

### Exceções e Conflitos Isolados no Log Transacional

- **Conflitos de ID com Macrorregião Divergente (5 casos bloqueados)**:
  - Nós OSM cujos números batiam com o DTP, mas situados em zonas completamente opostas da cidade (ex: nó OSM na Vila Maria / Zona Norte com número 1997, enquanto o ponto 1997 do DTP fica na Rua Maria Figueiredo / Zona Sul). Bloqueados para evitar falso positivo.
- **Ambiguidades 1:N de Logradouro (36 casos isolados)**:
  - Grandes vias (Avenida Paulista, Avenida Rebouças, Avenida Santo Amaro) com múltiplos pontos regulamentados. Na ausência de número predial no edital DTP, foram isolados sem vinculação cega.
- **Feições de Circulação Viária Descartadas (4 ways)**:
  - Trechos de via na Praça Ramos de Azevedo e acessos viários com tag `taxi=yes`.
- **Anomalias Modais e Comerciais (2 casos)**:
  - 1 ponto de moto-táxi em Paraisópolis (Way `1062965746`).
  - 1 motorista individual autônomo fazendo divulgação comercial (Node `13189805756`).

---

## 6. Mapeamento de Vazios Cartográficos

O cruzamento espacial com os dados do GeoSampa identificou áreas críticas desprovidas de qualquer mapeamento colaborativo:

### 6.1. Subprefeituras em Vazio Absoluto de Pareamento (14 Subprefeituras)
Subprefeituras com pontos de táxi ativos no Edital DTP 2024, mas com **zero pontos consolidados no OSM**:
1. **Aricanduva-Formosa-Carrão** (Leste): 21 pontos DTP ativos, 0 pareados.
2. **Penha** (Leste): 19 pontos DTP ativos, 0 pareados.
3. **Campo Limpo** (Sul): 16 pontos DTP ativos, 0 pareados.
4. **Pirituba-Jaraguá** (Norte): 12 pontos DTP ativos, 0 pareados.
5. **Capela do Socorro** (Sul): 10 pontos DTP ativos, 0 pareados.
6. **Itaquera** (Leste): 8 pontos DTP ativos, 0 pareados.
7. **São Miguel Paulista** (Leste): 6 pontos DTP ativos, 0 pareados.
8. **Ermelino Matarazzo** (Leste): 2 pontos DTP ativos, 0 pareados.
9. **Itaim Paulista** (Leste): 3 pontos DTP ativos, 0 pareados.
10. **Guaianases** (Leste): 3 pontos DTP ativos, 0 pareados.
11. **Cidade Tiradentes** (Leste): 2 pontos DTP ativos, 0 pareados.
12. **M'Boi Mirim** (Sul): 1 ponto DTP ativo, 0 pareados.
13. **Cidade Ademar** (Sul): 1 ponto DTP ativo, 0 pareados.
14. **Perus-Anhanguera** (Norte): 1 ponto DTP ativo, 0 pareados.

### 6.2. Distritos Municipais sem Nenhuma Feição OSM
**37 dos 96 distritos municipais (38,5%)** não possuem sequer um nó de táxi cadastrado no OpenStreetMap:
- *Zona Leste*: Aricanduva, Cangaíba, Ermelino Matarazzo, Guaianases, Iguatemi, Itaim Paulista, Itaquera, Jaguara, Jardim Helena, José Bonifácio, Lajeado, Parque do Carmo, Ponte Rasa, São Miguel, São Rafael, Sapopemba, Vila Curuçá, Vila Jacuí.
- *Zona Sul*: Capão Redondo, Cidade Ademar, Cidade Dutra, Grajaú, Jardim Ângela, Jardim São Luís, Marsilac, Parelheiros, Pedreira, Socorro, Vila Formosa.
- *Zona Norte*: Brasilândia, Pirituba, Raposo Tavares, Sacomã, São Domingos, São Lucas, Tremembé.
- *Zona Noroeste*: Perus.

---

## 7. Recomendações Institucionais para o DTP, SMT e PMSP

Com base nas evidências empíricas e técnicas apuradas no projeto, recomenda-se:

1. **Instituição de Padrão Geoespacial Oficial pelo DTP/SMT**:
   - Os editais de sorteio e relações de pontos de táxi devem publicar obrigatoriamente as **coordenadas métricas em SIRGAS 2000 UTM 23S (EPSG:31983)** e WGS 84 de cada ponto regulamentado. A publicação puramente textual de logradouros sem numeração métrica impede a automação e gera custos excessivos de conferência em campo.
2. **Publicação da Camada Vetorial no GeoSampa**:
   - Protocolar imediatamente junto ao DTP e à Secretaria Executiva de Planejamento Urbano a minuta oficial elaborada no Gate 4 (`docs/gate4/minuta_solicitacao_oficial_pontos_taxi.md`), solicitando a inclusão do tema `transporte_individual_passageiros:pontos_taxi` no catálogo WFS/WMS do GeoSampa.
3. **Desambiguação Cadastral de Grandes Eixos Viários**:
   - Incluir a referência métrica predial (ex: "Av. Paulista, altura do nº 1500") ou o código do cruzamento da CET nos 36 pontos situados em vias de grande extensão, permitindo desempate determinístico.
4. **Distinção Cadastral entre Vagas Regulamentares e Baias Físicas**:
   - Estabelecer duas colunas oficiais no cadastro DTP: (a) *Vagas de Direito/Alvará* e (b) *Baias Físicas Sinalizadas*, orientando os motoristas sobre a real capacidade de estacionamento imediato sem infração de trânsito em fila dupla.
5. **Campanha Cívica / Mutirão de Mapeamento Aberto nas Periferias**:
   - Promover projeto em plataformas de mapeamento colaborativo (ex: *MapRoulette*) focado nas 14 subprefeituras periféricas desprovidas de cobertura OSM, mobilizando a categoria de taxistas e cooperativas para alimentar a base aberta.

---

## 8. Conclusão do Pipeline

O projeto atinge seu objetivo final: a entrega de uma base geoespacial consolidada, limpa e auditada de **261 pontos regulamentados de táxi** em São Paulo, acompanhada da relação exata das **926 lacunas cadastrais do DTP** e do **log integral de discrepâncias**.

Todos os artefatos de dados, scripts de automação, manifestos com hashes SHA-256 e documentos de auditoria estão preservados e organizados na estrutura do repositório, aptos a subsidiar o sistema de inteligência operacional da cooperativa Chame Táxi.

## 9. Camada posterior ao Gate 6

Após a conclusão histórica dos Gates 1 a 6, foram adicionados artefatos operacionais, sem alterar a evidência do pipeline público:

- `scripts/analyze_recruitment_targets.py` gera um ranking de 1.187 alvos DTP, dos quais 261 possuem coordenadas consolidadas e 155 possuem telefone publicado de ponto.
- `scripts/scrape_diario_oficial_2026.py` coleta e deduplica atos públicos do Diário Oficial, incluindo `alvara_num`; os artefatos processados foram normalizados localmente para 94 registros únicos a partir de 120 registros extraídos anteriormente, sem nova consulta ao portal. Os arquivos `novos_condutax_diario_oficial.*` são espelhos de compatibilidade dos atos coletados, não uma lista restrita a novos Condutax. A ação comercial fica condicionada à validação de elegibilidade e autorização.
- `scripts/build_polos_formacao_dataset.py` mantém uma seleção operacional de 24 CFCs, uma sede do DTP e uma pista do IPEM. A lista de origem auditada continha 27 entradas e não comprova vigência em 2026.
- `scripts/generate_dashboard_app.py` gera um dashboard HTML local, com indicadores derivados dos arquivos carregados, escape de conteúdo renderizado e exportação de CSV. Não há backend, API, banco de dados ou decisão automatizada.

Os dados do Diário Oficial podem conter nomes e identificadores de atos publicados. O dashboard, os telefones institucionais e os arquivos de prospecção devem permanecer sob controle de acesso e não devem ser usados para contato automatizado sem revisão jurídica, minimização, finalidade definida e validação de autorização.
