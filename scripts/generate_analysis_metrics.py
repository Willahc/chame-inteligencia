# -*- coding: utf-8 -*-
"""Geração de Métricas e Análise Espacial da Consolidação DTP ↔ OSM (Gate 6).

Calcula:
  1. Balanço quantitativo e taxas de cobertura global, por macrorregião e por subprefeitura.
  2. Balanço de vagas (capacidade regulamentar DTP vs capacidade física observada OSM).
  3. Mapeamento de vazios cartográficos e distritos municipais desprovidos de representação.
  4. Matriz de confusão e confiabilidade do matching.

Saída:
  - prints estruturados no console
  - JSON analítico exportado para docs/metricas_analise_gate6.json
"""

import csv
import json
import os
import sys
from collections import Counter, defaultdict

CONSOLIDATED_CSV = r"data/processed/pontos_taxi_sp_consolidado.csv"
DTP_UNMATCHED_CSV = r"data/processed/dtp_pontos_sem_osm.csv"
OSM_UNMATCHED_CSV = r"data/processed/osm_pontos_sem_dtp.csv"
LOG_JSONL = r"data/processed/log_discrepancias_matching.jsonl"
SUB_GEOJSON = r"data/raw/geosampa/subprefeituras/subprefeitura_geosampa_20260923T1045.geojson"
DIS_GEOJSON = r"data/raw/geosampa/distritos/distrito_municipal_geosampa_20260923T1045.geojson"
OUT_JSON = r"docs/metricas_analise_gate6.json"


def load_csv(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f, delimiter=";"))


def main():
    print("=" * 75)
    print("GATE 6: ANALISE ESPACIAL, INDICADORES E BALANCO DTP <-> OSM")
    print("=" * 75)

    # 1. Carrega dados
    consolidated = load_csv(CONSOLIDATED_CSV)
    dtp_unmatched = load_csv(DTP_UNMATCHED_CSV)
    osm_unmatched = load_csv(OSM_UNMATCHED_CSV)

    with open(SUB_GEOJSON, "r", encoding="utf-8-sig") as f:
        sub_gj = json.load(f)

    with open(DIS_GEOJSON, "r", encoding="utf-8-sig") as f:
        dis_gj = json.load(f)

    # Mapeamento de Subprefeituras
    sub_map = {}
    for feat in sub_gj["features"]:
        p = feat["properties"]
        cd = int(p["cd_subprefeitura"])
        sub_map[cd] = {
            "nome": p["nm_subprefeitura"],
            "regiao": p["nm_regiao_05"],
            "area_km2": p["qt_area_quilometro"]
        }

    # Mapeamento de Distritos
    distritos_all = set()
    distritos_by_sub = defaultdict(list)
    for feat in dis_gj["features"]:
        p = feat["properties"]
        d_nome = p["nm_distrito_municipal"]
        d_sub = p["nm_regiao_05"]
        distritos_all.add(d_nome)

    # Totais globais
    total_dtp = len(consolidated) + len(dtp_unmatched)
    total_osm = len(consolidated) + len(osm_unmatched)
    total_matched = len(consolidated)

    # 2. Cobertura por Macrorregião
    reg_dtp_tot = Counter()
    reg_matched = Counter()
    reg_vagas_tot = Counter()
    reg_vagas_matched = Counter()

    for c in consolidated:
        reg = c["dtp_regiao"]
        reg_dtp_tot[reg] += 1
        reg_matched[reg] += 1
        reg_vagas_tot[reg] += int(c["dtp_vagas_capacidade"])
        reg_vagas_matched[reg] += int(c["dtp_vagas_capacidade"])

    for u in dtp_unmatched:
        reg = u["regiao"]
        reg_dtp_tot[reg] += 1
        reg_vagas_tot[reg] += int(u["cap"])

    # 3. Cobertura por Subprefeitura
    sub_dtp_tot = Counter()
    sub_matched = Counter()
    sub_vagas_tot = Counter()
    sub_vagas_matched = Counter()

    for c in consolidated:
        cd = int(c["dtp_subprefeitura_codigo"]) if c["dtp_subprefeitura_codigo"] else 0
        sub_dtp_tot[cd] += 1
        sub_matched[cd] += 1
        sub_vagas_tot[cd] += int(c["dtp_vagas_capacidade"])
        sub_vagas_matched[cd] += int(c["dtp_vagas_capacidade"])

    for u in dtp_unmatched:
        cd = int(u["sub"]) if u["sub"] else 0
        sub_dtp_tot[cd] += 1
        sub_vagas_tot[cd] += int(u["cap"])

    # 4. Balanço de Vagas (Spot Balance)
    # Total de vagas no DTP 2024
    total_vagas_dtp = sum(int(c["dtp_vagas_capacidade"]) for c in consolidated) + sum(int(u["cap"]) for u in dtp_unmatched)
    total_ocup_dtp = sum(int(c["dtp_vagas_ocupadas"]) for c in consolidated) + sum(int(u["ocup"]) for u in dtp_unmatched)
    total_saldo_dtp = sum(int(c["dtp_vagas_saldo"]) for c in consolidated) + sum(int(u["saldo"]) for u in dtp_unmatched)

    # Vagas nos 261 pontos casados
    vagas_casados_dtp_cap = sum(int(c["dtp_vagas_capacidade"]) for c in consolidated)
    vagas_casados_dtp_ocup = sum(int(c["dtp_vagas_ocupadas"]) for c in consolidated)
    vagas_casados_dtp_saldo = sum(int(c["dtp_vagas_saldo"]) for c in consolidated)

    # Subconjunto com tag capacity presente no OSM
    matched_com_cap_osm = [c for c in consolidated if c["osm_capacity"]]
    cap_dtp_subconjunto = sum(int(c["dtp_vagas_capacidade"]) for c in matched_com_cap_osm)
    cap_osm_subconjunto = sum(int(c["osm_capacity"]) for c in matched_com_cap_osm)

    diff_maior_dtp = len([c for c in matched_com_cap_osm if int(c["dtp_vagas_capacidade"]) > int(c["osm_capacity"])])
    diff_igual = len([c for c in matched_com_cap_osm if int(c["dtp_vagas_capacidade"]) == int(c["osm_capacity"])])
    diff_maior_osm = len([c for c in matched_com_cap_osm if int(c["dtp_vagas_capacidade"]) < int(c["osm_capacity"])])

    # 5. Distritos e Vazios Cartográficos
    distritos_com_osm = Counter(c["geosampa_distrito"] for c in consolidated + osm_unmatched)
    distritos_com_match = Counter(c["geosampa_distrito"] for c in consolidated)
    distritos_sem_osm = sorted(distritos_all - set(distritos_com_osm.keys()))

    # 6. Exibição e estruturação do JSON
    print("\n1. BALANCO GERAL E COBERTURA MACRORREGIONAL")
    print("-" * 75)
    print(f"Total DTP: {total_dtp:4d} | Total OSM: {total_osm:4d} | Pareados: {total_matched:4d} ({total_matched/total_dtp*100:5.1f}%)")
    print("\nMacrorregiao | DTP Total | Pareados | Cobertura (%) | Vagas DTP | Vagas Pareadas")
    print("-" * 75)
    regional_summary = []
    for reg in sorted(reg_dtp_tot.keys()):
        tot = reg_dtp_tot[reg]
        mat = reg_matched[reg]
        cov = mat / tot * 100
        v_tot = reg_vagas_tot[reg]
        v_mat = reg_vagas_matched[reg]
        print(f"{reg:12s} | {tot:9d} | {mat:8d} | {cov:12.1f}% | {v_tot:9d} | {v_mat:14d}")
        regional_summary.append({
            "regiao": reg,
            "dtp_total": tot,
            "pareados": mat,
            "cobertura_pct": round(cov, 1),
            "vagas_totais": v_tot,
            "vagas_pareadas": v_mat
        })

    print("\n2. BALANCO DE VAGAS (SPOT BALANCE)")
    print("-" * 75)
    print(f"Capacidade Total DTP (1.187 pontos):       {total_vagas_dtp:5d} vagas (Ocupadas: {total_ocup_dtp}, Saldo: {total_saldo_dtp})")
    print(f"Capacidade nos 261 pontos pareados (DTP):   {vagas_casados_dtp_cap:5d} vagas (Média DTP: {vagas_casados_dtp_cap/total_matched:.1f} vagas/ponto)")
    print(f"Pontos pareados com capacity no OSM:        {len(matched_com_cap_osm):5d} ({len(matched_com_cap_osm)/total_matched*100:.1f}%)")
    print(f"  - Capacidade DTP no subconjunto:          {cap_dtp_subconjunto:5d} vagas (Média: {cap_dtp_subconjunto/len(matched_com_cap_osm):.1f} vagas/ponto)")
    print(f"  - Capacidade OSM no subconjunto:          {cap_osm_subconjunto:5d} vagas (Média: {cap_osm_subconjunto/len(matched_com_cap_osm):.1f} vagas/ponto)")
    print(f"  - Casos DTP > OSM (capacidade teórica maior): {diff_maior_dtp:3d} ({diff_maior_dtp/len(matched_com_cap_osm)*100:.1f}%)")
    print(f"  - Casos DTP == OSM (capacidade idêntica):      {diff_igual:3d} ({diff_igual/len(matched_com_cap_osm)*100:.1f}%)")
    print(f"  - Casos DTP < OSM (capacidade observada maior):{diff_maior_osm:3d} ({diff_maior_osm/len(matched_com_cap_osm)*100:.1f}%)")

    print("\n3. ANALISE DE SUBPREFEITURAS E VAZIOS CRITICOS")
    print("-" * 75)
    subpref_summary = []
    zero_coverage_subs = []
    for cd in sorted(sub_map.keys()):
        info = sub_map[cd]
        tot = sub_dtp_tot.get(cd, 0)
        mat = sub_matched.get(cd, 0)
        pend = tot - mat
        cov = (mat / tot * 100) if tot > 0 else 0.0
        item = {
            "codigo": cd,
            "nome": info["nome"],
            "regiao": info["regiao"],
            "dtp_total": tot,
            "pareados": mat,
            "pendentes": pend,
            "cobertura_pct": round(cov, 1)
        }
        subpref_summary.append(item)
        if tot > 0 and mat == 0:
            zero_coverage_subs.append(item)

    missing_subpref = sub_dtp_tot.get(0, 0)
    if missing_subpref:
        subpref_summary.append(
            {
                "codigo": 0,
                "nome": "NÃO INFORMADO",
                "regiao": "NÃO INFORMADO",
                "dtp_total": missing_subpref,
                "pareados": 0,
                "pendentes": missing_subpref,
                "cobertura_pct": 0.0,
                "escopo": "fora do universo de 32 subprefeituras"
            }
        )

    print(f"Subprefeituras com 0% de cobertura (vazios absolutos no DTP com pontos ativos): {len(zero_coverage_subs)}")
    for z in zero_coverage_subs:
        print(f"  - Subprefeitura {z['nome']} ({z['regiao']}): {z['dtp_total']} pontos DTP ativos, ZERO pareados.")

    print(f"\nDistritos municipais com ZERO feições de táxi no OSM: {len(distritos_sem_osm)} de {len(distritos_all)}")
    print(f"Exemplos de distritos em vazio cartográfico absoluto: {', '.join(distritos_sem_osm[:12])}...")

    # Salva JSON consolidado para apoio ao relatório executivo
    metrics_data = {
        "metadados": {
            "total_dtp": total_dtp,
            "total_osm": total_osm,
            "total_pareados": total_matched,
            "taxa_cobertura_dtp_pct": round(total_matched / total_dtp * 100, 2),
            "taxa_cobertura_osm_pct": round(total_matched / total_osm * 100, 2),
            "dtp_sem_osm": len(dtp_unmatched),
            "osm_sem_dtp": len(osm_unmatched)
        },
        "cobertura_regional": regional_summary,
        "cobertura_subprefeituras": subpref_summary,
        "pontos_sem_subprefeitura": missing_subpref,
        "subprefeituras_cobertura_zero": zero_coverage_subs,
        "balanco_vagas": {
            "total_dtp_capacidade": total_vagas_dtp,
            "total_dtp_ocupadas": total_ocup_dtp,
            "total_dtp_saldo": total_saldo_dtp,
            "pareados_dtp_capacidade": vagas_casados_dtp_cap,
            "pareados_dtp_ocupadas": vagas_casados_dtp_ocup,
            "pareados_dtp_saldo": vagas_casados_dtp_saldo,
            "subconjunto_com_capacity_osm": {
                "pontos": len(matched_com_cap_osm),
                "dtp_capacidade": cap_dtp_subconjunto,
                "osm_capacidade": cap_osm_subconjunto,
                "dtp_maior_osm_contagem": diff_maior_dtp,
                "dtp_igual_osm_contagem": diff_igual,
                "dtp_menor_osm_contagem": diff_maior_osm
            }
        },
        "vazios_cartograficos": {
            "total_distritos_sp": len(distritos_all),
            "distritos_com_presenca_osm": len(distritos_com_osm),
            "distritos_sem_presenca_osm_total": len(distritos_sem_osm),
            "distritos_sem_presenca_osm": distritos_sem_osm
        }
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, ensure_ascii=False, indent=2)

    print(f"\nMetricas analiticas salvas em: {OUT_JSON}")
    print("=" * 75)


if __name__ == "__main__":
    main()
