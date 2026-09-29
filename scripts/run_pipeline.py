# -*- coding: utf-8 -*-
"""scripts/run_pipeline.py — orquestrador único do pipeline Mapeamento.

Não há mais dependência de cwd ou de ordem implícita: cada estágio declara os
arquivos de que precisa e é executado a partir da raiz do repositório, com
propagação de falha (exit code).

Uso:
  python scripts/run_pipeline.py                 # lista os estágios
  python scripts/run_pipeline.py --group gates   # roda um grupo
  python scripts/run_pipeline.py --only match,metricas
  python scripts/run_pipeline.py --from match --to dashboard
  python scripts/run_pipeline.py --all           # tudo exceto os manuais
  python scripts/run_pipeline.py --all --include-manual

Estágios marcados como `manual` consomem rede em volume (CNPJ/RFB, Nominatim,
Overpass, Diário Oficial) e só rodam com --include-manual.
"""

from __future__ import annotations

import argparse
import glob
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PONTOS = "data/processed/pontos_taxi_sp_consolidado.csv"
MAPEAMENTO = "data/processed/*"
MEIS = "Novos Alvarás 2026/base_meis_taxi_butanta_zona_oeste.csv"
CATALOGO = "Novos Alvarás 2026/catalogo_pontos_completo.csv"
MAESTRE = "planilha_mestre_taxistas_sp_2026.csv"


@dataclass
class Stage:
    id: str
    desc: str
    cmd: list[str]
    group: str
    requires: list[str] = field(default_factory=list)
    manual: bool = False


STAGES: list[Stage] = [
    # --- Gates 4-6: mapeamento público -------------------------------------
    Stage("extracao-osm", "Extrai feições de táxi do PBF Geofabrik (Gate 4)",
          ["extract_osm_taxi.py"], "gates",
          requires=["data/external/osm/taxi/*.pbf"], manual=True),
    Stage("polos", "Gera a base de polos de formação CFC/DTP/IPEM",
          ["build_polos_formacao_dataset.py"], "gates"),
    Stage("match", "Cruza os 1.187 pontos DTP com o OSM (Gate 5)",
          ["match_dtp_osm.py"], "gates",
          requires=["data/raw/dtp/Relacao*.pdf", "data/external/osm/taxi/*_raw.osm"]),
    Stage("metricas", "Calcula cobertura, vazios e balanço de vagas (Gate 6)",
          ["generate_analysis_metrics.py"], "gates",
          requires=[PONTOS, "data/processed/log_discrepancias_matching.jsonl"]),
    Stage("ranking", "Ranking de pontos para prospecção de motoristas",
          ["analyze_recruitment_targets.py"], "gates",
          requires=[PONTOS, "docs/metricas_analise_gate6.json"]),

    # --- Fontes externas (rede) --------------------------------------------
    Stage("rfb", "Baixa o CNPJ aberto da RFB e filtra CNAE de táxi",
          ["extract_taxistas_cnae_receita.py"], "fontes", manual=True),
    Stage("doc", "Varre o Diário Oficial e gera a base de atos 2026",
          ["scrape_diario_oficial_2026.py"], "fontes", manual=True),
    Stage("doc-contemplados", "Cruza contemplados com publicações do DOC",
          ["enrich_doc_contemplados.py"], "fontes", manual=True),
    Stage("smt", "Baixa licenças SGTP e conselheiros CMTT (CKAN da SMT)",
          ["fetch_smt_open_data.py"], "fontes", manual=True),
    Stage("detran", "Baixa e agrega a frota ativa do Detran-SP por município",
          ["fetch_detran_frota.py"], "fontes", manual=True),
    Stage("infosiga", "Baixa sinistros do Infosiga e extrai vítimas taxistas",
          ["fetch_infosiga_taxistas.py"], "fontes", manual=True),
    Stage("acidentes", "Recorta sinistros de trânsito por subprefeitura (GeoSampa)",
          ["build_acidentes_por_subprefeitura.py"], "fontes", manual=True),

    # --- Campo e CRM --------------------------------------------------------
    Stage("geocode", "Geocodifica o catálogo de pontos (Nominatim)",
          ["geocode_points.py"], "campo", requires=[CATALOGO], manual=True),
    Stage("roteiro", "Monta o roteiro tático de visitas aos pontos",
          ["build_field_route_pontos.py"], "campo",
          requires=[MAESTRE, CATALOGO]),
    Stage("fila-crm", "Gera a fila de prospecção com links de WhatsApp",
          ["generate_crm_prospecting_list.py"], "campo",
          requires=[f"Novos Alvarás 2026/planilha_mestre_taxistas_sp_2026.csv"]),
    Stage("meis", "Reconstrói a base de MEIs de táxi da Zona Oeste",
          ["extrator_meis_taxi_zona_oeste.py"], "campo",
          requires=["data/private/base_meis_zona_oeste_fonte.json"]),
    Stage("geo-sem-osm", "Geocodifica os 926 pontos DTP sem par no OSM (Nominatim)",
          ["geocode_dtp_sem_osm.py"], "campo",
          requires=["data/processed/dtp_pontos_sem_osm.csv"], manual=True),

    # --- B2B corporativo ----------------------------------------------------
    Stage("cnae-pj", "Gera a base de PJ ativas (versionada) e a de MEIs (privada)",
          ["build_empresas_taxi_cnae.py"], "b2b",
          requires=["data/processed/taxistas_sp_cnae_receita_*.csv"]),
    Stage("corp-hospitais", "Base de hospitais em 5 km da sede",
          ["extract_hospitals_corporate_5km.py"], "b2b", requires=[PONTOS], manual=True),
    Stage("corp-empresas", "Base de empresas em 5 km da sede",
          ["extract_corporate_companies_5km.py"], "b2b",
          requires=["Novos Alvarás 2026/roteiro_tatico_visitas_pontos_2026.csv"]),
    Stage("corp-emails", "Injeta e-mails corporativos prováveis",
          ["enrich_corporate_emails.py"], "b2b",
          requires=["clientes_corporativos_empresas_5km.csv"]),
    Stage("corp-mobilidade", "Injeta indicadores de mobilidade corporativa",
          ["enrich_mobility_services_corporate.py"], "b2b",
          requires=["clientes_corporativos_hospitais_5km.csv"]),
    Stage("corp-decisores", "Injeta decisores mapeados",
          ["enrich_decision_makers_corporate.py"], "b2b",
          requires=["clientes_corporativos_empresas_5km.csv"]),
    Stage("corp-dashboard", "Dashboard B2B de clientes corporativos",
          ["generate_corporate_dashboard.py"], "b2b",
          requires=["clientes_corporativos_hospitais_5km.csv",
                    "clientes_corporativos_empresas_5km.csv"]),

    # --- Mapa ---------------------------------------------------------------
    Stage("mapa", "Gera o mapa Folium dos pontos (camada base Esri vem depois)",
          ["generate_interactive_map.py"], "mapa", requires=[PONTOS]),
    Stage("mapa-limpo", "Injeta MEIs/polos e limpa o HTML do mapa",
          ["build_clean_master_map.py"], "mapa",
          requires=["data/processed/mapa_interativo_pontos_taxi_sp.html", MEIS]),

    # --- Consolidação -------------------------------------------------------
    Stage("maestre", "Consolida a Planilha Mestre (CSV + XLSX com 15 abas)",
          ["build_master_spreadsheet.py"], "consolidacao",
          requires=[
              "Novos Alvarás 2026/alvaras_taxi_sp_2026_consolidado.csv",
              "Novos Alvarás 2026/layout_enriquecimento_contemplados_2140.csv",
              "Novos Alvarás 2026/ranking_alvos_chame_taxi_contemplados.csv",
              MEIS,
              "data/processed/diario_oficial_taxistas_sp_2026.csv",
              CATALOGO,
              PONTOS,
              "Novos Alvarás 2026/inscritos_sorteios_pontos_consolidado.csv",
              "Novos Alvarás 2026/resultados_sorteios_pontos.csv",
              "data/processed/polos_formacao_taxistas_cfc_dtp.csv",
              "Novos Alvarás 2026/plano_prospeccao_territorial_taxistas_2026.csv",
              "data/processed/osm_pontos_sem_dtp.csv",
          ]),
    Stage("publica", "Gera a versão pública minimizada da Planilha Mestre",
          ["privacy.py", "public-master"], "consolidacao", requires=[MAESTRE]),
    Stage("dashboard", "Gera o cockpit + CRM 360 (gerador oficial)",
          ["generate_master_dashboard.py"], "consolidacao", requires=[MAESTRE]),
    Stage("dashboard-pontos", "Gera o dashboard analítico dos pontos (sem dado pessoal)",
          ["generate_dashboard_app.py"], "consolidacao",
          requires=[PONTOS, "docs/metricas_analise_gate6.json"]),
    Stage("monitor-doc", "Monitor recorrente do Diário Oficial (estado local)",
          ["monitor_diario_oficial_condutax.py"], "consolidacao", manual=True),

    # --- Qualidade ----------------------------------------------------------
    Stage("privacidade", "Verifica que nenhum dado pessoal está versionado",
          ["privacy.py", "check"], "qualidade"),
    Stage("testes", "Roda os testes unitários do repositório",
          ["test_doc_scraper.py"], "qualidade"),
]


def resolve_requires(stage: Stage) -> list[str]:
    """Retorna os padrões de `requires` sem correspondência."""
    missing = []
    for pattern in stage.requires:
        if not glob.glob(str(ROOT / pattern)):
            missing.append(pattern)
    return missing


def run_stage(stage: Stage, keep_going: bool, strict: bool) -> str:
    print("\n" + "=" * 78)
    print(f"[{stage.id}] {stage.desc}")
    print("=" * 78)
    missing = resolve_requires(stage)
    if missing:
        status = "FALHA" if strict else "PULADO"
        print(f"  entradas ausentes: {', '.join(missing)}")
        return status
    started = time.time()
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / stage.cmd[0]), *stage.cmd[1:]],
        cwd=str(ROOT),
        encoding="utf-8",
        errors="replace",
    )
    elapsed = time.time() - started
    if proc.returncode != 0:
        print(f"  -> FALHA (exit {proc.returncode}, {elapsed:.1f}s)")
        return "FALHA"
    print(f"  -> OK ({elapsed:.1f}s)")
    return "OK"


def select_stages(args: argparse.Namespace) -> list[Stage]:
    ids = [s.id for s in STAGES]
    if args.only:
        chosen = [i.strip() for i in args.only.split(",") if i.strip()]
        unknown = [i for i in chosen if i not in ids]
        if unknown:
            sys.exit(f"estágios desconhecidos: {', '.join(unknown)}")
        return [s for s in STAGES if s.id in chosen]
    if args.group:
        return [s for s in STAGES if s.group == args.group]
    if args.from_ or args.to:
        start = ids.index(args.from_) if args.from_ else 0
        end = ids.index(args.to) + 1 if args.to else len(ids)
        return STAGES[start:end]
    if args.all:
        return [s for s in STAGES if args.include_manual or not s.manual]
    return []


def print_list() -> None:
    group = None
    for s in STAGES:
        if s.group != group:
            group = s.group
            print(f"\n{group}:")
        requires = f"  [requires: {', '.join(s.requires)}]" if s.requires else ""
        manual = "  (manual/rede)" if s.manual else ""
        print(f"  {s.id:18s} {s.desc}{manual}{requires}")
    print("\nUso: python scripts/run_pipeline.py --only <id,id> | --group <grupo> | --all")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="lista os estágios (padrão)")
    parser.add_argument("--only", help="lista de estágios separados por vírgula")
    parser.add_argument("--group", help="roda todos os estágios de um grupo")
    parser.add_argument("--from", dest="from_", help="primeiro estágio")
    parser.add_argument("--to", help="último estágio")
    parser.add_argument("--all", action="store_true", help="roda tudo (exceto manuais)")
    parser.add_argument("--include-manual", action="store_true",
                        help="inclui os estágios manuais (rede pesada)")
    parser.add_argument("--keep-going", action="store_true",
                        help="não interrompe na primeira falha")
    parser.add_argument("--strict", action="store_true",
                        help="trata estágio pulado como falha")
    args = parser.parse_args()

    stages = select_stages(args)
    if not stages:
        print_list()
        return 0

    results: dict[str, str] = {}
    failed = False
    for stage in stages:
        status = run_stage(stage, args.keep_going, args.strict)
        results[stage.id] = status
        if status == "FALHA" and not args.keep_going:
            failed = True
            break

    print("\n" + "=" * 78)
    print("RESUMO")
    print("=" * 78)
    for sid, status in results.items():
        print(f"  {status:8s} {sid}")
    if len(results) < len(stages):
        print(f"  (interrompido; {len(stages) - len(results)} estágio(s) não executados)")
    return 1 if failed or "FALHA" in results.values() else 0


if __name__ == "__main__":
    raise SystemExit(main())
