# Progresso — rodada de melhorias (29/09/2026)

Registro do trabalho de análise e melhoria do repositório. Histórico reescrito neste mesmo dia: o Git agora tem uma única raiz (`5a6d0f4`).

## Concluído (8/8 recomendações)

| # | Tema | Estado |
|---|---|---|
| 1 | LGPD — minimização dos artefatos versionados | OK |
| 2 | LGPD — correção das afirmações em `README.md` e `docs/gate3` | OK |
| 3 | Reprodutibilidade — dependências, orquestrador e fix do Gate 5 | OK |
| 4 | Scripts órfãos e geradores de dashboard concorrentes | OK |
| 5 | Reescrita do `README.md` | OK |
| 6 | Reconciliação de números contraditórios | OK |
| 7 | Artefatos >5 MB e derivados fora do versionamento | OK |
| 8 | Reescrita do histórico do Git | OK |

### 1–2. LGPD

- Duas camadas: **completa** (local, `data/private/`, `.gitignore`) e **pública** (`_publico`), única versionada.
- `scripts/privacy.py` com `check` (0 violações em 48 arquivos), `public-master` e `minimize`.
- Removidos do índice 24 artefatos com dado pessoal; planilha mestre pública com **86 colunas** e CPF redigido.
- PII do extrator de MEIs movida para `data/private/base_meis_zona_oeste_fonte.json` (script lê via `load_fonte_meis()`).
- Telefones/e-mails **institucionais** (ponto, CFC, empresa) permanecem permitidos.

### 3. Reprodutibilidade

- `requirements.txt` (numpy, openpyxl, pandas, pypdf, pyproj, requests, urllib3, folium==0.20.0).
- `scripts/run_pipeline.py`: estágios declarativos, `--only/--group/--all/--from/--to/--include-manual/--keep-going/--strict`.
- `match_dtp_osm.py`: paths dinâmicos + override por env (`MTD_OSM_FILE`, `MTD_SUB_FILE`, `MTD_DIS_FILE`, `MTD_MUN_FILE`).
- `extract_osm_taxi.py`: saída relativa ao repositório; exit codes corrigidos em `build_clean_master_map.py`.

### 4. Geradores de dashboard

- **Oficial:** `generate_master_dashboard.py` (decisão do usuário; gera o artefato de 37 MB).
- Removidos: `build_enterprise_tool_v2.py`, `generate_enterprise_tool.py`, `enrich_master_map.py`, `clean_map.py`, `run_build_enterprise.py`.
- Restam 27 scripts / ~16,5 mil linhas.

### 5. README

- Nome real `build_master_spreadsheet.py`, **12 bases obrigatórias** (+ RFB e cache DOC), 15 abas, 16.863 registros.
- Nova seção "Como executar", estrutura atualizada (`data/private/`, `Novos Alvarás 2026/`, `requirements.txt`), camada B2B descrita.
- `Score_Chame_Taxi` declarado como **score de priorização comercial**, sem decisão automatizada.

### 6. Números reconciliados (fonte de verdade: `docs/metricas_analise_gate6.json`)

- Auditoria do Gate 5 = **161 registros**: 110 flags de capacidade, 36 ambiguidades 1:N, 8 elementos descartados (3 relations, 4 vias, 1 moto-táxi), 5 conflitos de ID, 1 motorista individual, 1 resumo.
- `limitacoes_gate5.md`: 9 → **14 subprefeituras** em vazio absoluto de pareamento.
- `fontes.md`: aviso "não foi usado OSM" escopado ao **Gate 1** (OSM usado a partir do Gate 4).
- `inventario.md`: seção BLOCKED e "próxima ação" marcadas como etapas superadas.

### 7. Tamanho do Git

- Únicos arquivos >5 MB versionados: `planilha_mestre_taxistas_sp_2026_publico.csv` (24,6 MB) e `data/processed/taxistas_sp_cnae_receita_2026-09-14_publico.csv` (20,4 MB) — camada pública aprovada.
- `data/processed/dashboard_pontos_taxi_sp.html` desversionado (regenerável, `.gitignore`).
- Pack final: **31,4 MB**, 192 objetos, 0 objetos soltos.

### 8. Reescrita do histórico

- Commit consolidado `bca4ca4` → raiz única `5a6d0f4` (`git checkout --orphan` + `reflog expire` + `gc --prune=now`).
- Varredura dos 160 blobs do histórico: nenhum arquivo de PII (apenas nomes de coluna em código e o placeholder `000.000.000-00` na documentação).

## Decisões do usuário

1. Dados pessoais → minimizar versionado, manter base completa local.
2. Histórico Git → reescrever (destructive, sem remoto).
3. Gerador oficial do dashboard → `generate_master_dashboard.py`.
4. Commit → 1 consolidado; histórico → 1 commit só.

## Verificação final

```
python scripts/privacy.py check      # 48 arquivos, 0 violações, exit 0
python scripts/test_doc_scraper.py   # 6 tests OK
python scripts/run_pipeline.py --only dashboard,privacidade,testes   # tudo OK
git status                           # limpo
git log --oneline                    # 5a6d0f4 (único commit)
```

## Pontos em aberto (não executados)

- Sem remoto configurado: quando houver push, o histórico atual já é o limpo.
- `data/external/osm/taxi/` guarda dois PBFs Geofabrik (885 MB + 819 MB) — o interrompido está preservado como evidência pelo Gate 4; pode ser removido do disco se o espaço importar (não afeta o Git).
- `Novos Alvarás 2026/` mantém espelhos locais dos dashboards/planilhas (gitignorados), duplicando ~100 MB em disco.
