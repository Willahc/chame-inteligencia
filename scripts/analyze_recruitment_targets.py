# -*- coding: utf-8 -*-
"""Gera o ranking operacional dos pontos do Edital DTP para o dashboard."""

import csv
import json
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_CSV = PROCESSED_DIR / "pontos_taxi_sp_consolidado.csv"
DTP_SEM_OSM_CSV = PROCESSED_DIR / "dtp_pontos_sem_osm.csv"
METRICS_JSON = BASE_DIR / "docs" / "metricas_analise_gate6.json"
OUTPUT_CSV = PROCESSED_DIR / "ranking_prospeccao_taxistas_chame_taxi.csv"
FIELDNAMES = [
    "ponto_id",
    "endereco",
    "subprefeitura",
    "distrito",
    "regiao",
    "taxistas_vinculados",
    "capacidade_vagas",
    "telefone_ponto",
    "origem",
    "geolocalizado",
]


def as_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def load_subprefecture_names() -> dict[str, str]:
    if not METRICS_JSON.exists():
        return {}
    with open(METRICS_JSON, "r", encoding="utf-8") as file:
        metrics = json.load(file)
    return {
        str(item.get("codigo")): str(item.get("nome") or "")
        for item in metrics.get("cobertura_subprefeituras", [])
        if item.get("codigo") is not None
    }


def build_targets() -> list[dict]:
    subprefecture_names = load_subprefecture_names()
    with open(PROCESSED_CSV, "r", encoding="utf-8-sig", newline="") as file:
        matched = list(csv.DictReader(file, delimiter=";"))

    unmatched = []
    if DTP_SEM_OSM_CSV.exists():
        with open(DTP_SEM_OSM_CSV, "r", encoding="utf-8-sig", newline="") as file:
            unmatched = list(csv.DictReader(file, delimiter=";"))

    targets = []
    for row in matched:
        sub_code = str(row.get("dtp_subprefeitura_codigo") or "")
        targets.append(
            {
                "ponto_id": str(row.get("dtp_ponto_id") or "").strip(),
                "endereco": row.get("dtp_endereco", ""),
                "subprefeitura": row.get("geosampa_subprefeitura")
                or subprefecture_names.get(sub_code)
                or "NÃO INFORMADO",
                "distrito": row.get("geosampa_distrito", ""),
                "regiao": row.get("dtp_regiao", ""),
                "taxistas_vinculados": as_int(row.get("dtp_vagas_ocupadas")),
                "capacidade_vagas": as_int(row.get("dtp_vagas_capacidade")),
                "telefone_ponto": row.get("osm_phone", ""),
                "origem": "Consolidado DTP-OSM",
                "geolocalizado": True,
            }
        )

    for row in unmatched:
        sub_code = str(row.get("sub") or "")
        targets.append(
            {
                "ponto_id": str(row.get("ponto") or "").strip(),
                "endereco": row.get("endereco", ""),
                "subprefeitura": subprefecture_names.get(sub_code) or "NÃO INFORMADO",
                "distrito": "",
                "regiao": row.get("regiao", ""),
                "taxistas_vinculados": as_int(row.get("ocup")),
                "capacidade_vagas": as_int(row.get("cap")),
                "telefone_ponto": "",
                "origem": "DTP Oficial",
                "geolocalizado": False,
            }
        )

    unique = []
    seen = set()
    for target in targets:
        point_id = target["ponto_id"]
        if point_id and point_id in seen:
            continue
        if point_id:
            seen.add(point_id)
        unique.append(target)
    return unique


def write_targets(targets: list[dict]) -> None:
    with open(OUTPUT_CSV, "w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES, delimiter=";")
        writer.writeheader()
        writer.writerows(targets)


def main() -> None:
    targets = build_targets()
    targets.sort(
        key=lambda item: (
            -item["taxistas_vinculados"],
            -item["capacidade_vagas"],
            item["ponto_id"],
        )
    )
    write_targets(targets)

    total_taxistas = sum(item["taxistas_vinculados"] for item in targets)
    total_vagas = sum(item["capacidade_vagas"] for item in targets)
    total_com_telefone = sum(bool(item["telefone_ponto"]) for item in targets)
    print(f"Total de pontos DTP analisados: {len(targets)}")
    print(f"Total de taxistas vinculados aos pontos oficiais: {total_taxistas:,}")
    print(f"Capacidade regulamentar total: {total_vagas:,} vagas")
    print(f"Pontos com telefone fixo mapeado no OSM: {total_com_telefone}")
    print(f"Ranking gerado em: {OUTPUT_CSV}")

    subpref_stats = defaultdict(lambda: {"pontos": 0, "ocup": 0, "regiao": ""})
    for target in targets:
        subpref = target["subprefeitura"] or "NÃO INFORMADO"
        subpref_stats[subpref]["pontos"] += 1
        subpref_stats[subpref]["ocup"] += target["taxistas_vinculados"]
        subpref_stats[subpref]["regiao"] = target["regiao"]

    print("\n--- TOP 10 SUBPREFEITURAS POR VOLUME DE TAXISTAS ---")
    ranked_subprefs = sorted(
        subpref_stats.items(), key=lambda item: item[1]["ocup"], reverse=True
    )[:10]
    for position, (subpref, data) in enumerate(ranked_subprefs, 1):
        print(
            f"{position:2d}. Subprefeitura {subpref} ({data['regiao']}): "
            f"{data['ocup']} taxistas em {data['pontos']} pontos"
        )


if __name__ == "__main__":
    main()
