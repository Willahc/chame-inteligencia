# Inventário e Auditoria de Processamento — Gate 5

## Status

**PASS (Matching DTP ↔ OSM Concluído).**
Primeira etapa de processamento analítico e geoespacial executada com sucesso via pipeline determinístico em Python (`scripts/match_dtp_osm.py`). Foram cruzadas as bases oficiais do DTP (Edital 2024, 1.187 pontos) com a extração bruta do OpenStreetMap recortada pelo perímetro municipal do GeoSampa (592 nós, 6 ways, 3 relations).

Os artefatos processados foram gravados em `data/processed/` e o manifesto de integridade registrado em `logs/gate5/manifesto_gate5.csv`.

---

## Arquivos Gerados em `data/processed/`

| Arquivo | Formato | Tamanho (bytes) | SHA-256 | Registros | Descrição e Conteúdo |
|---|---|---:|---|---:|---|
| `pontos_taxi_sp_consolidado.geojson` | GeoJSON (EPSG:4326) | 319.262 | `106e847dcf4b84a6a59a11c8aa39aa8983da6d6b0baeb339859c797c86724394` | 261 feições | Camada geoespacial integrada com geometrias pontuais, atributos DTP (capacidade, ocupação, saldo) e atributos OSM (tags, telefone, horários), com níveis de confiança e flags. |
| `pontos_taxi_sp_consolidado.csv` | CSV (UTF-8 com BOM, sep `;`) | 66.174 | `623c95367345b9b34db6b990d3ecc414200f83556c3bc5c0ba4cd39e56e0ac5e` | 261 linhas | Versão tabular consolidada dos pontos pareados, contendo latitude/longitude, endereço DTP, tags OSM e pontuações de similaridade. |
| `dtp_pontos_sem_osm.csv` | CSV (UTF-8 com BOM, sep `;`) | 108.455 | `8c0af2c0968bc18e814d806b0c0a2c39cc9a66d1e11040aca9e3748701119e51` | 926 linhas | Relação dos pontos oficiais do Edital DTP 2024 que não possuem cobertura espacial correspondente no OpenStreetMap (lacunas do mapeamento colaborativo). |
| `osm_pontos_sem_dtp.csv` | CSV (UTF-8 com BOM, sep `;`) | 45.864 | `5a1ff0e30900479ab6560555650c2dbd617dd20a25a9be7117cde625c12ab5ed` | 332 linhas | Feições de táxi do OSM no município que não constavam nas vagas abertas para o sorteio do Edital DTP 2024 (pontos sem vagas abertas, pontos históricos ou informais). |
| `log_discrepancias_matching.jsonl` | JSON Lines | 43.464 | `8e62c6afd133c88995348e23ea4640377587e37096927c2421832fa31f6cdde9` | 161 linhas | Registro transacional e auditável de cada decisão: elementos descartados, conflitos geográficos de ID numérico, ambiguidades 1:N de logradouro e divergências de capacidade. |

---

## Métricas Consolidadas do Gate 5

- **Universo DTP (Edital 2024)**: 1.187 pontos distintos (3.634 vagas de saldo para sorteio).
- **Universo OSM no Município**: 593 feições consideradas (592 nós + 1 centróide da Way 950146049).
- **Total de Pontos Consolidados (Pares DTP ↔ OSM)**: **261 pontos** (taxa de cobertura: **22,0%** dos pontos do Edital DTP 2024; **44,0%** das feições de táxi do OSM em São Paulo).
- **Pontos DTP sem georreferenciamento no OSM**: **926 pontos** (78,0% do Edital 2024).
- **Feições OSM sem vínculo com o Edital 2024**: **332 feições** (56,0% do OSM municipal).

### Distribuição por Camada de Matching

| Camada de Matching | Registros | Proporção | Descrição da Regra |
|---|---:|---:|---|
| `LAYER_1_EXACT_ID` | 196 | 75,1% | Identificador numérico oficial DTP extraído por regex estrito de `official_name`, `name`, `ref` ou `old_name`. |
| `LAYER_2_FUZZY_ADDRESS` | 65 | 24,9% | Correspondência fuzzy de logradouro (desinversão de endereço DTP + Levenshtein / Jaccard $\ge 0,85$) com blocking estrito pela subprefeitura GeoSampa. |
| **Total** | **261** | **100,0%** | |

### Distribuição por Nível de Confiança e Status

| Nível de Confiança | Status Detalhado | Quantidade | Observações Técnicas |
|---|---|---:|---|
| **ALTA (HIGH)** | `MATCH_EXACT_ID_GEO_VERIFIED` | 194 | ID DTP coincide exatamente e a coordenada OSM cai estritamente dentro da mesma Subprefeitura (`SUB` DTP == `cd_subprefeitura` GeoSampa). |
| **ALTA (HIGH)** | `MATCH_EXACT_ID_BORDER_BUFFER_50M` | 1 | ID DTP coincide e a coordenada OSM situa-se a menos de 50 metros da divisa da subprefeitura declarada pelo DTP (via limítrofe interdistrital). |
| **MÉDIA (MEDIUM)** | `MATCH_EXACT_ID_SUBPREF_DIVERGENT` | 1 | ID DTP coincide e pertence à mesma Macrorregião geográfica, com subprefeitura vizinha a mais de 50m. |
| **MÉDIA (MEDIUM)** | `MATCH_FUZZY_ADDRESS_HIGH` | 65 | Score de similaridade de logradouro $\ge 0,85$ com candidato único dentro da mesma subprefeitura. |

---

## Auditoria de Anomalias, Descartes e Ambiguidades

Todas as anomalias detectadas foram isoladas e registradas linha a linha no log `data/processed/log_discrepancias_matching.jsonl`:

1. **Relations Multipolígono Descartadas (3)**:
   - As 3 relations presentes no XML Sudeste situam-se comprovadamente fora do Município de São Paulo:
     - Relation `5886802`: Votuporanga-SP (lat -20.62, lon -49.64).
     - Relation `6769221`: Araraquara-SP (lat -21.78, lon -48.17).
     - Relation `12123805`: Praia Grande-SP (lat -24.01, lon -46.42).
   - Classificadas como `RELATION_OUTSIDE_MUNICIPALITY` e descartadas.
2. **Infraestrutura Viária Linear com `taxi=yes` Descartada (4)**:
   - Ways `8579210` e `1307281372`: calçadão/vias na Praça Ramos de Azevedo com permissão de tráfego de táxi.
   - Ways `357570047` e `1488757682`: vias de serviço e pista interna de manobra de estacionamento.
   - Classificadas como `HIGHWAY_INFRASTRUCTURE_DISCARDED` (não representam ponto físico regulamentado de parada).
3. **Anomalia Modal (1)**:
   - Way `1062965746`: `MOTO TÁXI DZ7` em Paraisópolis. Classificada como `MODAL_ANOMALY_MOTOTAXI` e descartada do cadastro de táxis convencionais.
4. **Conflitos de ID Numérico com Macrorregião Divergente (5)**:
   - 5 nós do OSM possuíam números que coincidiram com um ID do DTP, porém suas coordenadas caíam em Macrorregiões completamente opostas da cidade (ex: nó OSM na Vila Maria / Zona Norte com número 1997, enquanto o ponto 1997 do DTP fica na Rua Maria Figueiredo / Zona Sul).
   - O algoritmo bloqueou a associação cega e registrou como `AMBIGUITY_ID_CONFLICT` para revisão humana.
5. **Ambiguidades 1:N de Logradouro Isoladas (36)**:
   - Vias estruturais longas (ex: Av. Paulista, Av. Rebouças, Av. Santo Amaro) que possuem múltiplos pontos de táxi regulamentados ao longo de sua extensão.
   - Na ausência de número predial na tabela do DTP, o algoritmo recusou vinculação arbitrária e registrou os casos como `AMBIGUOUS_MULTI_CANDIDATE_ADDRESS`.
6. **Divulgação Comercial de Motorista Autônomo (1)**:
   - Node `13189805756` ("Daniel Ramos Taxista"): contém propaganda individual e endereço de pagamento Lightning/Bitcoin. Isolado como `ANOMALY_OSM_INDIVIDUAL_DRIVER`.
