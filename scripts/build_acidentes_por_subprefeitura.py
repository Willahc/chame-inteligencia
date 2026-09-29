# -*- coding: utf-8 -*-
"""
scripts/build_acidentes_por_subprefeitura.py

Camada de risco territorial: sinistros de transito do Infosiga (Detran-SP)
agregados por subprefeitura do Município de São Paulo.

Base: conjunto "eventos-de-sinistro" (um evento por linha, com tipo de
registro NOTIFICACAO / SINISTRO NAO FATAL / SINISTRO FATAL), filtrado pelo
cod_ibge 3550308 e localizado por lat/lon (WGS84) dentro dos polígonos
oficiais do GeoSampa (EPSG:31983). Eventos sem coordenada entram no balcão
"Sem coordenada" e nao sao distribuidos.

Saidas:
  data/processed/acidentes_sp_por_subprefeitura_<inicio>_<fim>.csv
  data/processed/acidentes_sp_mensal_<inicio>_<fim>.csv

Bruto: data/raw/infosiga/ (gitignorado) + manifesto em logs/.

Uso:
  python scripts/build_acidentes_por_subprefeitura.py --dry-run
  python scripts/build_acidentes_por_subprefeitura.py --meses 12
"""

from __future__ import annotations

import argparse
import csv
import glob
import hashlib
import io
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pyproj
import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "infosiga"
PROC = ROOT / "data" / "processed"
LOGS = ROOT / "logs"

BRT = timezone(timedelta(hours=-3))
USER_AGENT = "Mapeamento-TaxiSP/1.0 (projeto de dados abertos; contato: local)"
CKAN = "https://dadosabertos.sp.gov.br/api/3/action/package_show"
CONJUNTO = "eventos-de-sinistro"
MUN_IBGE = "3550308"
SUB_GLOB = str(ROOT / "data/raw/geosampa/subprefeituras/subprefeitura_geosampa_*.geojson")
SEPARADOR = ";"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def recursos(meses: int) -> list[dict]:
    r = requests.get(CKAN, params={"id": CONJUNTO},
                     headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    res = r.json()["result"]["resources"]
    csvs = [x for x in res
            if (x.get("format") or "").upper() == "CSV"
            or ".csv" in (x.get("url") or "").split("?")[0].lower()]
    return csvs[-meses:]


def baixar(url: str, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"[skip] {dest.name} ({dest.stat().st_size} bytes)")
        return "skip"
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=300)
    r.raise_for_status()
    dest.write_bytes(r.content)
    print(f"[ok] {dest.name} ({len(r.content)} bytes)")
    return r.status_code


def ler_csv(path: Path) -> list[dict]:
    raw = path.read_bytes()
    texto = None
    for enc in ("utf-8-sig", "cp1252"):
        try:
            texto = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if texto is None:
        texto = raw.decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(texto), delimiter=SEPARADOR))


def num(valor: str) -> int:
    try:
        return int((valor or "0").strip() or 0)
    except ValueError:
        return 0


def ponto_float(valor: str) -> float | None:
    """Latitude/longitude do Infosiga vem com virgula decimal."""
    v = (valor or "").strip().replace(",", ".")
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def carregar_subprefeituras() -> list[dict]:
    arquivos = sorted(glob.glob(SUB_GLOB))
    if not arquivos:
        raise SystemExit(f"poligonos de subprefeitura nao encontrados: {SUB_GLOB}")
    with open(arquivos[-1], encoding="utf-8-sig") as fh:
        data = json.load(fh)
    saida = []
    for feat in data["features"]:
        nome = (feat.get("properties") or {}).get("nm_subprefeitura", "?")
        geom = feat["geometry"]
        coords = geom["coordinates"]
        polys = [coords] if geom["type"] == "Polygon" else coords
        bboxes = []
        for poly in polys:
            ring = poly[0]
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            bboxes.append((min(xs), min(ys), max(xs), max(ys)))
        saida.append({"nome": nome, "polygons": polys, "bboxes": bboxes})
    print(f"subprefeituras carregadas: {len(saida)}")
    return saida


def pip(point, polygon_rings) -> bool:
    """Ray casting (mesma rotina do match_dtp_osm.py)."""
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


def localizar(point, subs) -> str:
    x, y = point
    for sub in subs:
        for poly, (minx, miny, maxx, maxy) in zip(sub["polygons"], sub["bboxes"]):
            if minx <= x <= maxx and miny <= y <= maxy and pip((x, y), poly):
                return sub["nome"]
    return "Fora dos poligonos"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--meses", type=int, default=12)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    lista = recursos(args.meses)
    print(f"recursos selecionados: {len(lista)}")
    if args.dry_run:
        for x in lista:
            print(f"[dry-run] {x['name']}")
        return 0

    subs = carregar_subprefeituras()
    xfm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:31983", always_xy=True)

    agg: dict[str, Counter] = defaultdict(Counter)
    mensal: dict[str, Counter] = defaultdict(Counter)
    manifesto = []
    meses_vistos = []

    for x in lista:
        url = x["url"]
        dest = RAW / (url.split("/")[-1].split("?")[0] or "evento.csv")
        status = baixar(url, dest)
        manifesto.append({
            "arquivo": str(dest.relative_to(ROOT)).replace("\\", "/"),
            "fonte": "Eventos de Sinistro (Infosiga)",
            "orgao": "Detran-SP (Portal de Dados Abertos do Estado de SP)",
            "url": url,
            "data_hora_consulta_brt": datetime.now(BRT).isoformat(timespec="seconds"),
            "data_publicacao": x.get("last_modified") or "",
            "formato": "CSV",
            "tamanho_bytes": dest.stat().st_size,
            "sha256": sha256_of(dest),
            "cobertura": x.get("name") or "",
            "licenca": "Dado aberto estadual (Lei 12.527/2011)",
            "status_http": status,
            "observacoes": "Bruto em data/raw/infosiga/ (gitignorado); agregado por subprefeitura",
        })

        for row in ler_csv(dest):
            if row.get("cod_ibge") != MUN_IBGE:
                continue
            mes = (row.get("ano_mes_sinistro") or "").strip()
            if not mes:
                continue
            meses_vistos.append(mes)
            lat = ponto_float(row.get("latitude", ""))
            lon = ponto_float(row.get("longitude", ""))
            if lat is None or lon is None:
                local = "Sem coordenada"
            else:
                x, y = xfm.transform(lon, lat)
                local = localizar((x, y), subs)

            tipo = (row.get("tipo_registro") or "").upper()
            primario = (row.get("tp_sinistro_primario") or "").upper()

            b = agg[local]
            b["sinistros"] += 1
            m = mensal[mes]
            m["sinistros"] += 1
            if "NAO FATAL" in tipo:
                b["nao_fatais"] += 1
                m["nao_fatais"] += 1
            elif "FATAL" in tipo:
                b["fatais"] += 1
                m["fatais"] += 1
            else:
                b["notificacoes"] += 1
                m["notificacoes"] += 1

            b["vitimas_fatais"] += num(row.get("qtd_gravidade_fatal", ""))
            m["vitimas_fatais"] += num(row.get("qtd_gravidade_fatal", ""))
            if primario == "ATROPELAMENTO":
                b["atropelamentos"] += 1
                m["atropelamentos"] += 1
            elif primario == "COLISAO":
                b["colisoes"] += 1
                m["colisoes"] += 1
            elif primario == "CHOQUE":
                b["choques"] += 1
                m["choques"] += 1

            envolvidos = sum(num(row.get(c, "")) for c in (
                "qtd_pedestre", "qtd_bicicleta", "qtd_motocicleta",
                "qtd_automovel", "qtd_onibus", "qtd_caminhao", "qtd_veic_outros"))
            b["envolvidos"] += envolvidos
            m["envolvidos"] += envolvidos

    if not meses_vistos:
        print("nenhum evento do municipio encontrado")
        return 1

    inicio, fim = min(meses_vistos), max(meses_vistos)
    periodo = f"{inicio.replace('/', '-')}_{fim.replace('/', '-')}"
    PROC.mkdir(parents=True, exist_ok=True)

    saida_sub = PROC / f"acidentes_sp_por_subprefeitura_{periodo}.csv"
    with saida_sub.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["subprefeitura", "sinistros", "sinistros_fatais",
                    "sinistros_nao_fatais", "notificacoes", "vitimas_fatais",
                    "atropelamentos", "colisoes", "choques",
                    "envolvidos_total", "periodo"])
        for nome in sorted(agg, key=lambda n: -agg[n]["sinistros"]):
            b = agg[nome]
            w.writerow([nome, b["sinistros"], b["fatais"], b["nao_fatais"],
                        b["notificacoes"], b["vitimas_fatais"],
                        b["atropelamentos"], b["colisoes"], b["choques"],
                        b["envolvidos"], f"{inicio} a {fim}"])

    saida_mes = PROC / f"acidentes_sp_mensal_{periodo}.csv"
    with saida_mes.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["ano_mes", "sinistros", "sinistros_fatais",
                    "sinistros_nao_fatais", "notificacoes", "vitimas_fatais",
                    "atropelamentos", "colisoes", "choques", "envolvidos_total"])
        for mes in sorted(mensal):
            b = mensal[mes]
            w.writerow([mes, b["sinistros"], b["fatais"], b["nao_fatais"],
                        b["notificacoes"], b["vitimas_fatais"],
                        b["atropelamentos"], b["colisoes"], b["choques"],
                        b["envolvidos"]])

    total = sum(b["sinistros"] for b in agg.values())
    print(f"[agregado] {saida_sub.relative_to(ROOT)} ({len(agg)} linhas)")
    print(f"[agregado] {saida_mes.relative_to(ROOT)} ({len(mensal)} meses)")
    print(f"total de eventos em SP: {total} | fatais: "
          f"{sum(b['fatais'] for b in agg.values())} | atropelamentos: "
          f"{sum(b['atropelamentos'] for b in agg.values())}")

    LOGS.mkdir(parents=True, exist_ok=True)
    mpath = LOGS / "manifesto_infosiga_20260929.csv"
    campos = list(manifesto[0])
    urls_ja_registradas = set()
    if mpath.exists():
        with mpath.open(encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                urls_ja_registradas.add(r.get("url", ""))
    novos = [r for r in manifesto if r["url"] not in urls_ja_registradas]
    if novos:
        novo = not mpath.exists()
        with mpath.open("a", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=campos)
            if novo:
                w.writeheader()
            for row in novos:
                w.writerow(row)
    print(f"manifesto: {mpath.relative_to(ROOT)} (+{len(novos)} linhas novas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
