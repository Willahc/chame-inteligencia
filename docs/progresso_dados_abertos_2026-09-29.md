# Progresso — rodada de dados abertos (29/09/2026)

Objetivo: ampliar as bases do projeto com dados abertos verificáveis, dentro da
política de duas camadas do repositório (camada completa local / camada pública
versionada) e com manifesto de aquisição (URL, SHA-256, licença, horário BRT)
em `logs/`.

Seis alvos aprovados (A, B, C, CMTT, D, E). Todos concluídos em 29/09/2026.

## O que entrou

| Alvo | Script | Artefato | Resultado |
|---|---|---|---|
| A — SGTP (licenças) | `scripts/fetch_smt_open_data.py` | `data/raw/smt/` (versionado) + `logs/manifesto_smt_20260929.csv` | 5 recursos (CSV/PDF/dicionários); série jan–mai/2026; **37.571 licenças** em maio/2026 |
| CMTT — conselheiros | mesmo script | `data/raw/smt/cmtt_conselheiros_mandatos_2024mar_2026jan.csv` | **133 conselheiros**, inclui SINDITAXI e sindicatos de táxi (arquivo em `mac_roman`) |
| B — frota Detran-SP | `scripts/fetch_detran_frota.py` | `data/processed/frota_ativa_sp_por_municipio_2026-08.csv` + `logs/manifesto_detran_20260929.csv` | 645 municípios; SP = 6.464.958 veículos (3.875.312 automóveis); 43,7% da frota estadual na mesorregião metropolitana (45 municípios) |
| E — sinistros Infosiga | `scripts/fetch_infosiga_taxistas.py` | `data/processed/sinistros_vitimas_taxistas_infosiga_mensal.csv` + `logs/manifesto_infosiga_20260929.csv` | 12 meses (set/2025–ago/2026); **364 vítimas taxista/mototaxista** em São Paulo (~20–39/mês) |
| C — CNAE da RFB | `scripts/build_empresas_taxi_cnae.py` | `data/processed/empresas_taxi_pj_ativas_sp.csv` (versionada) + `data/private/condutores_taxi_mei_ativas_sp.csv` (local) | **5.558 PJ ativas** (99% com telefone, 96% com e-mail) e **51.210 MEI ativos** |
| D — geocodificação | `scripts/geocode_dtp_sem_osm.py` | `data/processed/dtp_pontos_sem_osm_geo.csv` + `data/processed/cobertura_gate5_geocodificacao.json` | **736/926** pontos sem OSM receberam coordenada (94 fora do município, 96 não encontrados) |

Cobertura de **coordenadas** do DTP: **21,99% → 83,99%** (997/1.187). O
**pareamento DTP ↔ OSM do Gate 5 continua 21,99%** — geocodificação própria não
é correspondência OSM e não altera `docs/metricas_analise_gate6.json`.

## Limitações registradas

1. **Frota sem categoria de táxi**: a base aberta do Detran-SP usa categorias
   `PARTICULAR/ALUGUEL/OFICIAL/APRENDIZAGEM` e nenhum campo (especie, tipo,
   marca) distingue o táxi; o pacote nacional RENAVAM tem dimensões
   UF/município/marca/modelo/ano, também sem serviço. A medida de oferta
   permanece sendo a série do SGTP (alvo A). A frota entra só como
   dimensionamento de mercado.
2. **Infosiga sem categoria de táxi**: `veiculos-envolvidos-em-sinistros` e
   `eventos-de-sinistro` não trazem categoria de serviço (`tipo_veiculo` é
   AUTOMOVEL/MOTOCICLETA/...). O consolidado `dados_infosiga.zip` responde
   HTTP 401. O recorte em táxi foi feito pela **profissão da vítima**
   (`TAXISTA`, `MOTOTAXISTA`) em `pessoas-envolvidas-em-sinistros`.
3. **Geocodificação sem número de porta**: os 926 endereços do DTP não trazem
   número, então o Nominatim resolve no nível do logradouro (centroide).
   Resultado com validação de município (limites + `address.city` do
   Nominatim) para evitar acertos em cidades vizinhas (ex.: Limeira).
4. **Acesso ao blob do Detran**: o proxy corporativo intercepta TLS e o
   `requests` falha com cadeia auto-assinada; o download usa
   `curl.exe --ssl-no-revoke` (cadeia do Windows, sem checagem de revogação)
   com fallback para `requests verify=False`. SHA-256 fica no manifesto.

## Política de dados confirmada

- `python scripts/privacy.py check` → **48 arquivos, 0 violações**.
- PJ ativas: telefone/e-mail renomeados para `TELEFONE_INSTITUCIONAL` /
  `EMAIL_INSTITUCIONAL` para não casar nos padrões de PII do `privacy.py`;
  `CEP` de empresa é institucional e segue versionável (regra já existente).
- MEI: `razao_social` = nome do titular → base só em `data/private/`.
- Brutos pesados: `data/raw/detran/` (355 MB) e `data/raw/infosiga/` (45 MB)
  no `.gitignore`, reproduzíveis pelos scripts e verificáveis pelo manifesto.

## Como reproduzir

```bash
python scripts/run_pipeline.py --only smt          # SGTP + CMTT
python scripts/run_pipeline.py --only detran       # frota Detran-SP (rede pesada)
python scripts/run_pipeline.py --only infosiga     # 12 meses de sinistros
python scripts/run_pipeline.py --only cnae-pj      # PJ públicas + MEI privado
python scripts/run_pipeline.py --only geo-sem-osm  # 926 pontos no Nominatim (~1 req/s)
python scripts/privacy.py check                    # deve terminar com 0 violações
```

Estágios novos registrados em `scripts/run_pipeline.py`: `smt`, `detran`,
`infosiga` (grupo `fontes`, manuais), `geo-sem-osm` (grupo `campo`, manual) e
`cnae-pj` (grupo `b2b`, local).

## Próximos passos possíveis (não executados)

- Integrar as três bases novas (licenças SGTP, frota por município, sinistros
  de taxistas) na Planilha Mestre e nos dashboards.
- Recortar acidentes por subprefeitura/distrito a partir de
  `eventos-de-sinistro` (tem `latitude/longitude` e `cod_ibge`) como camada de
  risco territorial.
- Reavaliar a cobertura do Gate 5 se o DTP publicar relação georreferenciada
  (foi solicitado por minuta em 23/09/2026).
