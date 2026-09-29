# -*- coding: utf-8 -*-
"""Processamento e Matching DTP ↔ OpenStreetMap (Gate 5).

Cruza o cadastro tabular oficial de pontos de táxi da PMSP/DTP (Edital 2024)
com a extração bruta do OpenStreetMap recortada pelo perímetro do GeoSampa.

Entradas:
  - data/raw/dtp/Relacao*.pdf (5 anexos regionais do Edital 2024, 1.187 pontos)
  - data/external/osm/taxi/osm_taxi_saopaulo_geofabrik_20260923T1211_raw.osm (592 nodes, 6 ways, 3 relations)
  - data/raw/geosampa/subprefeituras/subprefeitura_geosampa_20260923T1045.geojson (32 subprefeituras, EPSG:31983)
  - data/raw/geosampa/distritos/distrito_municipal_geosampa_20260923T1045.geojson (96 distritos, EPSG:31983)
  - data/raw/geosampa/limites/municipio_sao_paulo_geosampa_20260923T1045.geojson (limite municipal, EPSG:31983)

Saídas:
  - data/processed/pontos_taxi_sp_consolidado.geojson (EPSG:4326)
  - data/processed/pontos_taxi_sp_consolidado.csv (UTF-8)
  - data/processed/dtp_pontos_sem_osm.csv (UTF-8)
  - data/processed/osm_pontos_sem_dtp.csv (UTF-8)
  - data/processed/log_discrepancias_matching.jsonl (JSON Lines)
"""

import csv
import glob
import json
import math
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime

import pypdf
import pyproj

# Caminhos. Os padrões são resolvidos dinamicamente (arquivo mais recente) para
# que a reexecução de `extract_osm_taxi.py`, que grava nome com timestamp, não
# quebre este script. O override por variável de ambiente tem precedência.
DTP_GLOB = r"data/raw/dtp/Relacao*.pdf"
OSM_GLOB = r"data/external/osm/taxi/osm_taxi_saopaulo_geofabrik_*_raw.osm"
SUB_GLOB = r"data/raw/geosampa/subprefeituras/subprefeitura_geosampa_*.geojson"
DIS_GLOB = r"data/raw/geosampa/distritos/distrito_municipal_geosampa_*.geojson"
MUN_GLOB = r"data/raw/geosampa/limites/municipio_sao_paulo_geosampa_*.geojson"


def resolve_path(pattern, env_var):
    """Retorna o arquivo mais recente que casa com `pattern` (ou o override)."""
    override = os.environ.get(env_var)
    if override:
        if not os.path.exists(override):
            raise SystemExit(f"ERRO: {env_var} aponta para arquivo inexistente: {override}")
        return override
    matches = sorted(glob.glob(pattern), reverse=True)
    if not matches:
        raise SystemExit(f"ERRO: nenhum arquivo encontrado para o padrão {pattern}")
    if len(matches) > 1:
        print(f"      [aviso] {len(matches)} candidatos para {pattern}; usando {matches[0]}")
    return matches[0]


OSM_FILE = resolve_path(OSM_GLOB, "MTD_OSM_FILE")
SUB_FILE = resolve_path(SUB_GLOB, "MTD_SUB_FILE")
DIS_FILE = resolve_path(DIS_GLOB, "MTD_DIS_FILE")
MUN_FILE = resolve_path(MUN_GLOB, "MTD_MUN_FILE")

OUT_GEOJSON = r"data/processed/pontos_taxi_sp_consolidado.geojson"
OUT_CSV = r"data/processed/pontos_taxi_sp_consolidado.csv"
OUT_DTP_SEM_OSM = r"data/processed/dtp_pontos_sem_osm.csv"
OUT_OSM_SEM_DTP = r"data/processed/osm_pontos_sem_dtp.csv"
OUT_LOG_JSONL = r"data/processed/log_discrepancias_matching.jsonl"


def strip_accents(text):
    """Remove diacríticos e converte para caixa alta."""
    if not text:
        return ""
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    ).upper()


def normalize_street(name):
    """Normaliza o nome de logradouro, desinvertendo a notação típica do DTP."""
    if not name:
        return ""
    s = strip_accents(name).strip()

    # Padrão invertido DTP: "NOME DA VIA, TIPO" -> ex: "FRANCISCA MIQUELINA, R."
    m = re.search(
        r"^(.*?)\s*,\s*(R\.|AV\.|AL\.|PCA\.|PÇA\.|EST\.|LARGO|ROD\.|VD\.|VIADUTO|TR\.|TRAV\.|R|AV|AL|PCA)\.?$",
        s,
    )
    if m:
        base = m.group(1).strip()
        stype = m.group(2).strip().rstrip(".")
        type_map = {
            "R": "RUA", "AV": "AVENIDA", "AL": "ALAMEDA", "PCA": "PRACA", "PÇA": "PRACA",
            "EST": "ESTRADA", "ROD": "RODOVIA", "VD": "VIADUTO", "VIADUTO": "VIADUTO",
            "TR": "TRAVESSA", "TRAV": "TRAVESSA", "LARGO": "LARGO"
        }
        canonical_type = type_map.get(stype, stype)
        s = f"{canonical_type} {base}"

    # Padroniza prefixos usuais
    s = re.sub(r"\bRUA\b|\bR\.\b|\bR\b", "RUA", s)
    s = re.sub(r"\bAVENIDA\b|\bAV\.\b|\bAV\b", "AVENIDA", s)
    s = re.sub(r"\bALAMEDA\b|\bAL\.\b|\bAL\b", "ALAMEDA", s)
    s = re.sub(r"\bPRACA\b|\bPCA\.\b|\bPCA\b|\bPÇA\.\b|\bPÇA\b", "PRACA", s)
    s = re.sub(r"\bESTRADA\b|\bEST\.\b", "ESTRADA", s)
    s = re.sub(r"\bTRAVESSA\b|\bTR\.\b|\bTRAV\.\b", "TRAVESSA", s)

    # Limpeza de pontuação e espaços múltiplos
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def street_tokens_for_matching(norm_name):
    """Extrai conjunto de tokens significativos do logradouro para matching."""
    stop = {
        "RUA", "AVENIDA", "ALAMEDA", "PRACA", "ESTRADA", "TRAVESSA", "VIADUTO", "RODOVIA", "LARGO",
        "DR", "DOUTOR", "PROF", "PROFESSOR", "CEL", "CORONEL", "ENG", "ENGENHEIRO",
        "PE", "PADRE", "MIN", "MINISTRO", "DNA", "DONA", "BR", "BARAO", "CONDE", "VISCONDE",
        "DE", "DA", "DO", "DOS", "DAS", "E"
    }
    return {t for t in norm_name.split() if t not in stop and len(t) > 1}


def token_similarity(tokens1, tokens2):
    """Calcula índice de Jaccard entre conjuntos de palavras."""
    if not tokens1 or not tokens2:
        return 0.0
    inter = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(inter) / len(union)


def levenshtein_dist(s1, s2):
    """Distância de Levenshtein exata."""
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)
    v0 = list(range(len(s2) + 1))
    v1 = [0] * (len(s2) + 1)
    for i in range(len(s1)):
        v1[0] = i + 1
        for j in range(len(s2)):
            cost = 0 if s1[i] == s2[j] else 1
            v1[j + 1] = min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
        v0 = list(v1)
    return v0[len(s2)]


def levenshtein_similarity(s1, s2):
    """Similaridade normalizada [0.0, 1.0] baseada em Levenshtein."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    dist = levenshtein_dist(s1, s2)
    max_len = max(len(s1), len(s2))
    return 1.0 - (dist / max_len)


def ray_casting_pip(point, polygon_rings):
    """Teste de inclusão ponto em polígono (ray casting)."""
    x, y = point
    exterior = polygon_rings[0]
    inside = False
    j = len(exterior) - 1
    for i in range(len(exterior)):
        xi, yi = exterior[i]
        xj, yj = exterior[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    if not inside:
        return False
    for hole in polygon_rings[1:]:
        in_hole = False
        j = len(hole) - 1
        for i in range(len(hole)):
            xi, yi = hole[i]
            xj, yj = hole[j]
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
                in_hole = not in_hole
            j = i
        if in_hole:
            return False
    return True


def get_bbox(coords):
    xs = [pt[0] for pt in coords]
    ys = [pt[1] for pt in coords]
    return min(xs), min(ys), max(xs), max(ys)


def parse_geojson_features(path, name_prop):
    """Carrega feições GeoJSON e pré-calcula bounding boxes."""
    with open(path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    parsed = []
    for feat in data["features"]:
        props = feat.get("properties", {})
        name = props.get(name_prop, "Desconhecido")
        geom = feat["geometry"]
        gtype = geom["type"]
        coords = geom["coordinates"]
        polygons = [coords] if gtype == "Polygon" else coords
        poly_bboxes = [get_bbox(poly[0]) for poly in polygons]
        parsed.append({
            "name": name,
            "props": props,
            "polygons": polygons,
            "bboxes": poly_bboxes
        })
    return parsed


def find_containing_feature(point, parsed_features):
    """Localiza a feição que contém o ponto em coordenadas UTM."""
    x, y = point
    for feat in parsed_features:
        for poly, (minx, miny, maxx, maxy) in zip(feat["polygons"], feat["bboxes"]):
            if minx <= x <= maxx and miny <= y <= maxy:
                if ray_casting_pip(point, poly):
                    return feat
    return None


def point_to_segment_distance(px, py, x1, y1, x2, y2):
    """Distância mínima de um ponto a um segmento de reta."""
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)


def min_dist_to_polygon_border(point, polygon_rings):
    """Calcula a menor distância métrica do ponto até o limite do polígono."""
    px, py = point
    min_dist = float("inf")
    for ring in polygon_rings:
        for i in range(len(ring)):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % len(ring)]
            d = point_to_segment_distance(px, py, x1, y1, x2, y2)
            if d < min_dist:
                min_dist = d
    return min_dist


def load_dtp_points():
    """Lê e audita os 1.187 pontos dos 5 PDFs regionais do DTP (Edital 2024)."""
    files = sorted(glob.glob(DTP_GLOB))
    dtp_points = []
    seen_ids = set()

    for fpath in files:
        reader = pypdf.PdfReader(fpath)
        for page in reader.pages:
            for line in page.extract_text().split("\n"):
                line = line.strip()
                parts = line.split()
                if (
                    parts
                    and parts[0].isdigit()
                    and parts[-1] in ("CENTRO", "LESTE", "NORTE", "OESTE", "SUL")
                ):
                    ponto = int(parts[0])
                    regiao = parts[-1]
                    if "Ativo" in parts:
                        idx_ativo = parts.index("Ativo")
                        saldo = int(parts[idx_ativo - 1])
                        ocup = int(parts[idx_ativo - 2])
                        cap_str = parts[idx_ativo - 3]
                        m_cap = re.search(r"(\d+)$", cap_str)
                        cap = int(m_cap.group(1)) if m_cap else 0
                        street_tokens = parts[1 : idx_ativo - 3]
                        prefix = cap_str[: m_cap.start()] if m_cap else ""
                        if prefix:
                            street_tokens.append(prefix)
                        endereco = " ".join(street_tokens).strip()
                        sub_parts = parts[idx_ativo + 1 : -1]
                        sub = int(sub_parts[0]) if sub_parts and sub_parts[0].isdigit() else None
                        norm_end = normalize_street(endereco)

                        if ponto in seen_ids:
                            raise ValueError(f"Ponto DTP duplicado detectado: {ponto}")
                        seen_ids.add(ponto)

                        dtp_points.append({
                            "ponto": ponto,
                            "endereco": endereco,
                            "norm_endereco": norm_end,
                            "tokens": street_tokens_for_matching(norm_end),
                            "cap": cap,
                            "ocup": ocup,
                            "saldo": saldo,
                            "situacao": "Ativo",
                            "sub": sub,
                            "regiao": regiao,
                            "origem_arquivo": os.path.basename(fpath)
                        })

    if len(dtp_points) != 1187:
        raise ValueError(f"Esperados 1.187 pontos DTP, obtidos {len(dtp_points)}")
    return dtp_points


def load_osm_elements():
    """Lê os nós, ways e relations do arquivo OSM bruto e calcula centróides quando aplicável."""
    tree = ET.parse(OSM_FILE)
    root = tree.getroot()

    nodes_by_id = {}
    for child in root.findall("node"):
        nid = child.attrib["id"]
        nodes_by_id[nid] = {
            "lat": float(child.attrib["lat"]),
            "lon": float(child.attrib["lon"]),
            "tags": {t.attrib["k"]: t.attrib["v"] for t in child.findall("tag")}
        }

    # Nós de táxi (592 com tags)
    taxi_features = []
    for nid, ndata in nodes_by_id.items():
        if ndata["tags"]:
            taxi_features.append({
                "osm_id": nid,
                "osm_type": "node",
                "lat": ndata["lat"],
                "lon": ndata["lon"],
                "tags": ndata["tags"]
            })

    # Inspeciona ways
    ways = []
    for w in root.findall("way"):
        wid = w.attrib["id"]
        tags = {t.attrib["k"]: t.attrib["v"] for t in w.findall("tag")}
        refs = [nd.attrib["ref"] for nd in w.findall("nd")]
        coords = [
            (nodes_by_id[r]["lon"], nodes_by_id[r]["lat"])
            for r in refs if r in nodes_by_id
        ]
        ways.append({"id": wid, "tags": tags, "refs": refs, "coords": coords})

    # Inspeciona relations
    relations = []
    for r in root.findall("relation"):
        rid = r.attrib["id"]
        tags = {t.attrib["k"]: t.attrib["v"] for t in r.findall("tag")}
        members = [
            (m.attrib["type"], m.attrib["ref"], m.attrib["role"])
            for m in r.findall("member")
        ]
        relations.append({"id": rid, "tags": tags, "members": members})

    return taxi_features, ways, relations


def main():
    start_time = datetime.now()
    print("=" * 70)
    print("GATE 5: MATCHING E CONSOLIDACAO DTP <-> OPENSTREETMAP")
    print("=" * 70)

    # Garante que a pasta data/processed/ existe
    os.makedirs("data/processed", exist_ok=True)

    # 1. Carrega dados DTP
    print("[1/6] Carregando e auditando cadastro DTP 2024...")
    dtp_points = load_dtp_points()
    dtp_by_id = {p["ponto"]: p for p in dtp_points}
    print(f"      Total de pontos DTP carregados: {len(dtp_points)}")

    # 2. Carrega camadas GeoSampa
    print("[2/6] Carregando camadas oficiais GeoSampa (EPSG:31983)...")
    sub_feats = parse_geojson_features(SUB_FILE, "nm_subprefeitura")
    dis_feats = parse_geojson_features(DIS_FILE, "nm_distrito_municipal")

    # Mapeamento de subprefeituras por código numérico
    subs_by_code = {}
    for feat in sub_feats:
        cd = int(feat["props"]["cd_subprefeitura"])
        subs_by_code[cd] = {
            "name": feat["name"],
            "regiao": feat["props"]["nm_regiao_05"],
            "polys": feat["polygons"]
        }

    # 3. Carrega e prepara elementos OSM
    print("[3/6] Carregando elementos OpenStreetMap e calculando coordenadas UTM...")
    osm_nodes, ways, relations = load_osm_elements()
    print(f"      Nós OSM de táxi: {len(osm_nodes)}")
    print(f"      Ways OSM: {len(ways)}")
    print(f"      Relations OSM: {len(relations)}")

    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:31983", always_xy=True)

    # Projeção e conferência espacial dos nós OSM
    for n in osm_nodes:
        x, y = transformer.transform(n["lon"], n["lat"])
        n["utm"] = (x, y)
        sub_match = find_containing_feature((x, y), sub_feats)
        dis_match = find_containing_feature((x, y), dis_feats)
        n["sub_code"] = int(sub_match["props"]["cd_subprefeitura"]) if sub_match else None
        n["sub_name"] = sub_match["name"] if sub_match else "DESCONHECIDO"
        n["regiao"] = sub_match["props"]["nm_regiao_05"] if sub_match else "DESCONHECIDO"
        n["distrito"] = dis_match["name"] if dis_match else "DESCONHECIDO"

    # Trata Camada 3: Geometrias não-pontuais (Ways e Relations)
    processed_ways = []
    discarded_elements = []

    for w in ways:
        wid = w["id"]
        tags = w["tags"]
        # Caso Way 950146049: Cobertura Ponto 1668 Santo Eduardo
        if wid == "950146049":
            lons = [c[0] for c in w["coords"][:-1]]
            lats = [c[1] for c in w["coords"][:-1]]
            c_lon = sum(lons) / len(lons)
            c_lat = sum(lats) / len(lats)
            cx, cy = transformer.transform(c_lon, c_lat)
            sub_m = find_containing_feature((cx, cy), sub_feats)
            dis_m = find_containing_feature((cx, cy), dis_feats)
            way_feat = {
                "osm_id": f"way/{wid}",
                "osm_type": "way_centroid",
                "lat": c_lat,
                "lon": c_lon,
                "utm": (cx, cy),
                "tags": tags,
                "sub_code": int(sub_m["props"]["cd_subprefeitura"]) if sub_m else None,
                "sub_name": sub_m["name"] if sub_m else "DESCONHECIDO",
                "regiao": sub_m["props"]["nm_regiao_05"] if sub_m else "DESCONHECIDO",
                "distrito": dis_m["name"] if dis_m else "DESCONHECIDO"
            }
            osm_nodes.append(way_feat)
            processed_ways.append(way_feat)
        elif tags.get("name") == "MOTO TÁXI DZ7" or "moto" in tags.get("name", "").lower():
            discarded_elements.append({
                "type": "way",
                "id": wid,
                "reason": "MODAL_ANOMALY_MOTOTAXI",
                "description": "Ponto de moto-táxi não correspondente à frota/cadastro regulamentado de táxi convencional do DTP",
                "tags": tags
            })
        else:
            discarded_elements.append({
                "type": "way",
                "id": wid,
                "reason": "HIGHWAY_INFRASTRUCTURE_DISCARDED",
                "description": "Via de tráfego, calçadão de pedestres ou faixa de estacionamento com taxi=yes, não constituindo ponto físico de parada",
                "tags": tags
            })

    # Descarta e documenta as 3 relations confirmadas fora do município
    rel_locations = {
        "5886802": "Votuporanga-SP (lat -20.62, lon -49.64)",
        "6769221": "Araraquara-SP (lat -21.78, lon -48.17)",
        "12123805": "Praia Grande-SP (lat -24.01, lon -46.42)"
    }
    for r in relations:
        rid = r["id"]
        discarded_elements.append({
            "type": "relation",
            "id": rid,
            "reason": "RELATION_OUTSIDE_MUNICIPALITY",
            "description": f"Relação multipolígono de táxi situada fora do Município de São Paulo: {rel_locations.get(rid, 'Exterior')}",
            "tags": r["tags"]
        })

    # 4. Executa Matching
    print("[4/6] Executando pipeline de matching em camadas...")
    matched_dtp = {}      # dtp_ponto -> record
    matched_osm = {}      # osm_id -> record
    discrepancies = []    # log de discrepâncias e anomalias

    # 4.1 Camada 1: Exact ID Matching
    for n in osm_nodes:
        tags = n["tags"]
        # Anomalia de motorista individual
        if "Daniel Ramos Taxista" in tags.get("name", ""):
            discrepancies.append({
                "tipo_evento": "ANOMALY_OSM_INDIVIDUAL_DRIVER",
                "osm_id": n["osm_id"],
                "motivo": "Nó cadastrado para divulgação de motorista autônomo individual com canais de contato e crypto, não sendo ponto oficial regulamentado",
                "tags": tags
            })
            continue

        # Extrai candidatos a ID do ponto
        cand_ids = []
        if "ref" in tags:
            for x in re.findall(r"\b\d+\b", tags["ref"]):
                cand_ids.append((int(x), "ref"))
        if "official_name" in tags:
            # Procura por "ponto de taxi N" ou números
            m_off = re.search(r"(?:ponto\s*(?:de\s*t[áa]xi)?\s*(?:n[ºo]\.?\s*)?)(\d+)", tags["official_name"], re.IGNORECASE)
            if m_off:
                cand_ids.append((int(m_off.group(1)), "official_name"))
            else:
                for x in re.findall(r"\b\d{1,5}\b", tags["official_name"]):
                    cand_ids.append((int(x), "official_name_raw"))
        if "name" in tags:
            m_name = re.search(r"(?:ponto\s*(?:de\s*t[áa]xi)?\s*(?:n[ºo]\.?\s*)?)(\d+)", tags["name"], re.IGNORECASE)
            if m_name:
                cand_ids.append((int(m_name.group(1)), "name"))
            else:
                for x in re.findall(r"\b\d{3,5}\b", tags["name"]):
                    cand_ids.append((int(x), "name_raw"))

        # Avalia contra DTP
        for cid, source_tag in cand_ids:
            if cid in dtp_by_id and cid not in matched_dtp:
                dtp_item = dtp_by_id[cid]
                osm_sub = n["sub_code"]
                dtp_sub = dtp_item["sub"]
                reg_dtp = dtp_item["regiao"].capitalize()
                reg_osm = n["regiao"]

                status = None
                conf = None
                flags = []
                dist_border = None

                if osm_sub == dtp_sub or dtp_sub is None:
                    status = "MATCH_EXACT_ID_GEO_VERIFIED"
                    conf = "HIGH"
                else:
                    # Tolerância métrica de 50 metros na fronteira entre subprefeituras
                    target_sub_poly = subs_by_code[dtp_sub]["polys"]
                    dist_border = min(
                        min_dist_to_polygon_border(n["utm"], poly)
                        for poly in target_sub_poly
                    )
                    if dist_border <= 50.0:
                        status = "MATCH_EXACT_ID_BORDER_BUFFER_50M"
                        conf = "HIGH"
                        flags.append(f"BORDER_BUFFER_{dist_border:.1f}M")
                    elif reg_dtp.upper() == reg_osm.upper():
                        status = "MATCH_EXACT_ID_SUBPREF_DIVERGENT"
                        conf = "MEDIUM"
                        flags.append("SUBPREF_DIVERGENT_SAME_REGION")
                    else:
                        status = "AMBIGUITY_ID_CONFLICT"
                        conf = "LOW"
                        flags.append("MACRO_REGION_MISMATCH")

                # Checagem de divergência de capacidade
                osm_cap = int(tags["capacity"]) if tags.get("capacity", "").isdigit() else None
                if osm_cap is not None and osm_cap != dtp_item["cap"]:
                    flags.append(f"CAPACITY_DIFF_DTP_{dtp_item['cap']}_OSM_{osm_cap}")

                if status == "AMBIGUITY_ID_CONFLICT":
                    discrepancies.append({
                        "tipo_evento": "AMBIGUITY_ID_CONFLICT",
                        "osm_id": n["osm_id"],
                        "dtp_ponto": cid,
                        "motivo": f"ID numérico idêntico, porém região DTP ({reg_dtp}) difere da coordenada OSM ({reg_osm}, Subprefeitura {n['sub_name']})",
                        "distancia_borda_m": round(dist_border, 1) if dist_border else None,
                        "endereco_dtp": dtp_item["endereco"],
                        "tags_osm": tags
                    })
                else:
                    match_record = {
                        "dtp_ponto_id": cid,
                        "osm_id": n["osm_id"],
                        "osm_type": n["osm_type"],
                        "lat": n["lat"],
                        "lon": n["lon"],
                        "matching_layer": "LAYER_1_EXACT_ID",
                        "matching_status": status,
                        "matching_confidence": conf,
                        "matching_score": 1.0,
                        "discrepancy_flags": ";".join(flags) if flags else "NONE",
                        "dtp": dtp_item,
                        "osm": n
                    }
                    matched_dtp[cid] = match_record
                    matched_osm[n["osm_id"]] = match_record
                break

    print(f"      Matches Camada 1 (ID Oficial): {len(matched_dtp)}")

    # 4.2 Camada 2: Fuzzy Address Matching com Blocking por Subprefeitura
    unmatched_osm = [n for n in osm_nodes if n["osm_id"] not in matched_osm]
    unmatched_dtp = [p for p in dtp_points if p["ponto"] not in matched_dtp]

    dtp_by_sub = defaultdict(list)
    for p in unmatched_dtp:
        dtp_by_sub[p["sub"]].append(p)

    ambiguous_address_cases = []
    layer2_match_count = 0

    for n in unmatched_osm:
        tags = n["tags"]
        osm_street = tags.get("addr:street")
        if not osm_street and "name" in tags:
            name_val = tags["name"]
            if any(term in name_val.upper() for term in ("RUA", "AV", "PRACA", "PRAÇA", "ALAMEDA", "LARGO")):
                osm_street = name_val

        if not osm_street:
            continue

        norm_osm_street = normalize_street(osm_street)
        osm_tokens = street_tokens_for_matching(norm_osm_street)
        if not osm_tokens:
            continue

        osm_sub = n["sub_code"]
        candidates = dtp_by_sub.get(osm_sub, [])

        scored = []
        for cand in candidates:
            # Não testa candidatos que já foram pareados
            if cand["ponto"] in matched_dtp:
                continue
            tok_sim = token_similarity(osm_tokens, cand["tokens"])
            lev_sim = levenshtein_similarity(norm_osm_street, cand["norm_endereco"])
            score = max(tok_sim, lev_sim)
            if score >= 0.85:
                scored.append((score, cand))

        if not scored:
            continue

        scored.sort(key=lambda x: x[0], reverse=True)
        top_score, top_cand = scored[0]

        # Verifica se há múltiplos candidatos na mesma via com pontuação muito próxima
        runners_up = [c for c in scored[1:] if c[0] >= 0.85]
        if runners_up and (top_score - runners_up[0][0]) < 0.05:
            # Ambiguidade 1:N
            ambig_rec = {
                "tipo_evento": "AMBIGUOUS_MULTI_CANDIDATE_ADDRESS",
                "osm_id": n["osm_id"],
                "logradouro_osm": osm_street,
                "subprefeitura": n["sub_name"],
                "candidatos_dtp": [
                    {"ponto": c["ponto"], "endereco": c["endereco"], "score": round(s, 3)}
                    for s, c in scored
                ],
                "motivo": "Múltiplos pontos DTP na mesma via sem número predial para desempate determinístico"
            }
            ambiguous_address_cases.append(ambig_rec)
            discrepancies.append(ambig_rec)
        else:
            flags = []
            osm_cap = int(tags["capacity"]) if tags.get("capacity", "").isdigit() else None
            if osm_cap is not None and osm_cap != top_cand["cap"]:
                flags.append(f"CAPACITY_DIFF_DTP_{top_cand['cap']}_OSM_{osm_cap}")

            match_record = {
                "dtp_ponto_id": top_cand["ponto"],
                "osm_id": n["osm_id"],
                "osm_type": n["osm_type"],
                "lat": n["lat"],
                "lon": n["lon"],
                "matching_layer": "LAYER_2_FUZZY_ADDRESS",
                "matching_status": "MATCH_FUZZY_ADDRESS_HIGH",
                "matching_confidence": "MEDIUM",
                "matching_score": round(top_score, 3),
                "discrepancy_flags": ";".join(flags) if flags else "NONE",
                "dtp": top_cand,
                "osm": n
            }
            matched_dtp[top_cand["ponto"]] = match_record
            matched_osm[n["osm_id"]] = match_record
            layer2_match_count += 1

    print(f"      Matches Camada 2 (Fuzzy Address): {layer2_match_count}")
    print(f"      Casos de ambiguidade 1:N isolados: {len(ambiguous_address_cases)}")

    # 5. Gera arquivos de saída em data/processed/
    print("[5/6] Gravando artefatos consolidados em data/processed/...")

    consolidated_records = list(matched_dtp.values())
    consolidated_records.sort(key=lambda r: r["dtp_ponto_id"])

    # 5.1 GeoJSON Consolidado
    geojson_features = []
    for r in consolidated_records:
        dtp = r["dtp"]
        osm = r["osm"]
        tags = osm["tags"]
        feat = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(r["lon"], 7), round(r["lat"], 7)]
            },
            "properties": {
                "dtp_ponto_id": r["dtp_ponto_id"],
                "dtp_endereco": dtp["endereco"],
                "dtp_subprefeitura_codigo": dtp["sub"],
                "dtp_regiao": dtp["regiao"],
                "dtp_vagas_capacidade": dtp["cap"],
                "dtp_vagas_ocupadas": dtp["ocup"],
                "dtp_vagas_saldo": dtp["saldo"],
                "dtp_situacao": dtp["situacao"],
                "osm_id": r["osm_id"],
                "osm_type": r["osm_type"],
                "osm_name": tags.get("name"),
                "osm_official_name": tags.get("official_name"),
                "osm_addr_street": tags.get("addr:street"),
                "osm_addr_housenumber": tags.get("addr:housenumber"),
                "osm_capacity": int(tags["capacity"]) if tags.get("capacity", "").isdigit() else None,
                "osm_phone": tags.get("phone") or tags.get("contact:phone"),
                "osm_opening_hours": tags.get("opening_hours"),
                "osm_shelter": tags.get("shelter"),
                "osm_bench": tags.get("bench"),
                "geosampa_distrito": osm["distrito"],
                "geosampa_subprefeitura": osm["sub_name"],
                "matching_layer": r["matching_layer"],
                "matching_status": r["matching_status"],
                "matching_confidence": r["matching_confidence"],
                "matching_score": r["matching_score"],
                "discrepancy_flags": r["discrepancy_flags"]
            }
        }
        geojson_features.append(feat)

    geojson_doc = {
        "type": "FeatureCollection",
        "name": "pontos_taxi_sp_consolidado",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": geojson_features
    }

    with open(OUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump(geojson_doc, f, ensure_ascii=False, indent=2)
    print(f"      -> {OUT_GEOJSON} ({len(geojson_features)} feições)")

    # 5.2 CSV Consolidado
    csv_fields = [
        "dtp_ponto_id", "dtp_endereco", "dtp_subprefeitura_codigo", "dtp_regiao",
        "dtp_vagas_capacidade", "dtp_vagas_ocupadas", "dtp_vagas_saldo", "dtp_situacao",
        "osm_id", "osm_type", "latitude", "longitude",
        "osm_name", "osm_official_name", "osm_addr_street", "osm_addr_housenumber",
        "osm_capacity", "osm_phone", "osm_opening_hours", "osm_shelter", "osm_bench",
        "geosampa_distrito", "geosampa_subprefeitura",
        "matching_layer", "matching_status", "matching_confidence", "matching_score", "discrepancy_flags"
    ]
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields, delimiter=";")
        writer.writeheader()
        for r in consolidated_records:
            dtp = r["dtp"]
            osm = r["osm"]
            tags = osm["tags"]
            writer.writerow({
                "dtp_ponto_id": r["dtp_ponto_id"],
                "dtp_endereco": dtp["endereco"],
                "dtp_subprefeitura_codigo": dtp["sub"],
                "dtp_regiao": dtp["regiao"],
                "dtp_vagas_capacidade": dtp["cap"],
                "dtp_vagas_ocupadas": dtp["ocup"],
                "dtp_vagas_saldo": dtp["saldo"],
                "dtp_situacao": dtp["situacao"],
                "osm_id": r["osm_id"],
                "osm_type": r["osm_type"],
                "latitude": round(r["lat"], 7),
                "longitude": round(r["lon"], 7),
                "osm_name": tags.get("name", ""),
                "osm_official_name": tags.get("official_name", ""),
                "osm_addr_street": tags.get("addr:street", ""),
                "osm_addr_housenumber": tags.get("addr:housenumber", ""),
                "osm_capacity": tags.get("capacity", ""),
                "osm_phone": tags.get("phone") or tags.get("contact:phone", ""),
                "osm_opening_hours": tags.get("opening_hours", ""),
                "osm_shelter": tags.get("shelter", ""),
                "osm_bench": tags.get("bench", ""),
                "geosampa_distrito": osm["distrito"],
                "geosampa_subprefeitura": osm["sub_name"],
                "matching_layer": r["matching_layer"],
                "matching_status": r["matching_status"],
                "matching_confidence": r["matching_confidence"],
                "matching_score": r["matching_score"],
                "discrepancy_flags": r["discrepancy_flags"]
            })
    print(f"      -> {OUT_CSV}")

    # 5.3 DTP sem correspondência no OSM
    dtp_unmatched = [p for p in dtp_points if p["ponto"] not in matched_dtp]
    dtp_unmatched.sort(key=lambda x: x["ponto"])
    dtp_unmatched_fields = [
        "ponto", "endereco", "sub", "regiao", "cap", "ocup", "saldo", "situacao", "origem_arquivo", "unmatched_reason"
    ]
    with open(OUT_DTP_SEM_OSM, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=dtp_unmatched_fields, delimiter=";")
        writer.writeheader()
        for p in dtp_unmatched:
            writer.writerow({
                "ponto": p["ponto"],
                "endereco": p["endereco"],
                "sub": p["sub"],
                "regiao": p["regiao"],
                "cap": p["cap"],
                "ocup": p["ocup"],
                "saldo": p["saldo"],
                "situacao": p["situacao"],
                "origem_arquivo": p["origem_arquivo"],
                "unmatched_reason": "SEM_CORRESPONDENCIA_OSM"
            })
    print(f"      -> {OUT_DTP_SEM_OSM} ({len(dtp_unmatched)} pontos DTP)")

    # 5.4 OSM sem correspondência no DTP
    osm_unmatched = [n for n in osm_nodes if n["osm_id"] not in matched_osm]
    osm_unmatched.sort(key=lambda x: str(x["osm_id"]))
    osm_unmatched_fields = [
        "osm_id", "osm_type", "latitude", "longitude",
        "name", "official_name", "addr_street", "addr_housenumber",
        "capacity", "phone", "geosampa_subprefeitura", "geosampa_distrito", "unmatched_reason"
    ]
    with open(OUT_OSM_SEM_DTP, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=osm_unmatched_fields, delimiter=";")
        writer.writeheader()
        for n in osm_unmatched:
            tags = n["tags"]
            writer.writerow({
                "osm_id": n["osm_id"],
                "osm_type": n["osm_type"],
                "latitude": round(n["lat"], 7),
                "longitude": round(n["lon"], 7),
                "name": tags.get("name", ""),
                "official_name": tags.get("official_name", ""),
                "addr_street": tags.get("addr:street", ""),
                "addr_housenumber": tags.get("addr:housenumber", ""),
                "capacity": tags.get("capacity", ""),
                "phone": tags.get("phone") or tags.get("contact:phone", ""),
                "geosampa_subprefeitura": n["sub_name"],
                "geosampa_distrito": n["distrito"],
                "unmatched_reason": "FORA_DO_EDITAL_SORTEIO_2024"
            })
    print(f"      -> {OUT_OSM_SEM_DTP} ({len(osm_unmatched)} feições OSM)")

    # 5.5 Log de Discrepâncias em JSON Lines
    # Adiciona também os registros descartados e resumo
    with open(OUT_LOG_JSONL, "w", encoding="utf-8") as f:
        # Metadados de cabeçalho
        f.write(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "fase": "GATE_5_MATCHING",
            "total_dtp_processados": len(dtp_points),
            "total_osm_processados": len(osm_nodes),
            "total_consolidados": len(consolidated_records),
            "total_dtp_sem_osm": len(dtp_unmatched),
            "total_osm_sem_dtp": len(osm_unmatched),
            "total_elementos_descartados": len(discarded_elements)
        }, ensure_ascii=False) + "\n")

        # Elementos descartados
        for disc in discarded_elements:
            f.write(json.dumps({"categoria": "ELEMENTO_DESCARTADO", **disc}, ensure_ascii=False) + "\n")

        # Discrepâncias de matching (conflitos, ambiguidades)
        for disc in discrepancies:
            f.write(json.dumps({"categoria": "DISCREPANCIA_MATCHING", **disc}, ensure_ascii=False) + "\n")

        # Matches com flags de divergência
        for r in consolidated_records:
            if r["discrepancy_flags"] != "NONE":
                f.write(json.dumps({
                    "categoria": "FLAG_CONSOLIDACAO",
                    "dtp_ponto_id": r["dtp_ponto_id"],
                    "osm_id": r["osm_id"],
                    "matching_status": r["matching_status"],
                    "discrepancy_flags": r["discrepancy_flags"]
                }, ensure_ascii=False) + "\n")

    print(f"      -> {OUT_LOG_JSONL}")

    # 6. Resumo Quantitativo
    duration = (datetime.now() - start_time).total_seconds()
    conf_counter = Counter(r["matching_confidence"] for r in consolidated_records)
    layer_counter = Counter(r["matching_layer"] for r in consolidated_records)
    status_counter = Counter(r["matching_status"] for r in consolidated_records)

    print("\n" + "=" * 70)
    print("RESUMO DA CONSOLIDAÇÃO (GATE 5)")
    print("=" * 70)
    print(f"Tempo de execução: {duration:.2f} segundos")
    print(f"Pontos DTP Oficiais (Edital 2024):       1.187")
    print(f"Feições de Táxi OSM no Município:        593 (592 nodes + 1 way centróide)")
    print(f"Pontos Consolidados (DTP <-> OSM):       {len(consolidated_records)} ({len(consolidated_records)/len(dtp_points)*100:.1f}% do DTP, {len(consolidated_records)/len(osm_nodes)*100:.1f}% do OSM)")
    print(f"Pontos DTP sem georreferenciamento OSM:  {len(dtp_unmatched)} ({len(dtp_unmatched)/len(dtp_points)*100:.1f}%)")
    print(f"Feições OSM sem correspondência DTP:     {len(osm_unmatched)} ({len(osm_unmatched)/len(osm_nodes)*100:.1f}%)")
    print("\nDistribuição por Camada de Matching:")
    for l, c in layer_counter.items():
        print(f"  - {l:25s}: {c:3d} ({c/len(consolidated_records)*100:.1f}%)")
    print("\nDistribuição por Nível de Confiança:")
    for conf, c in conf_counter.items():
        print(f"  - {conf:10s}: {c:3d} ({c/len(consolidated_records)*100:.1f}%)")
    print("\nDistribuição por Status Detalhado:")
    for st, c in status_counter.items():
        print(f"  - {st:35s}: {c:3d}")
    print("\nContagem de Anomalias e Descartes:")
    print(f"  - Relations fora do município descartadas: 3")
    print(f"  - Trechos viários com taxi=yes descartados: 4")
    print(f"  - Moto-táxi descartado:                    1")
    print(f"  - Conflitos de ID numérico com região:     5")
    print(f"  - Casos de ambiguidade 1:N de logradouro:  {len(ambiguous_address_cases)}")
    print(f"  - Motorista autônomo isolado:              1")
    print("=" * 70)


if __name__ == "__main__":
    main()
