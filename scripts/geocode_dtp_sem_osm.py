# -*- coding: utf-8 -*-
"""
scripts/geocode_dtp_sem_osm.py

Alvo D — geocodifica os pontos DTP que nao casaram com o OSM (Gate 5).

Entrada : data/processed/dtp_pontos_sem_osm.csv  (926 pontos; enderecos sem
          numero de porta, ex. "SERRA DE JAPI, R.")
Saida   : data/processed/dtp_pontos_sem_osm_geo.csv (+ latitude, longitude,
          consulta, status)
Cache   : data/processed/geocache_pontos_dtp.json (o mesmo do geocode_points.py,
          consultas repetidas nao sao refeitas)

Politica: Nominatim (OSM) com 1 req/s, User-Agent identificado; busca em
cascata -> endereco completo -> sem tipo de logradouro -> so' o logradouro.
O geocodificado e' um ponto aproximado (do logradouro), util para levantar a
cobertura do Gate 5 (21.99% -> ) sem prometer porta exata.

Uso:
  python scripts/geocode_dtp_sem_osm.py --max 5    # fumaca
  python scripts/geocode_dtp_sem_osm.py            # tudo
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
ENTRADA = ROOT / "data" / "processed" / "dtp_pontos_sem_osm.csv"
SAIDA = ROOT / "data" / "processed" / "dtp_pontos_sem_osm_geo.csv"
CACHE = ROOT / "data" / "processed" / "geocache_pontos_dtp.json"
RESUMO = ROOT / "data" / "processed" / "cobertura_gate5_geocodificacao.json"

USER_AGENT = "Mapeamento-TaxiSP-OpenData/1.0 (pesquisa-urbana-sp; contato: local)"
BRT = timezone(timedelta(hours=-3))

TIPOS = {
    "R": "Rua", "AV": "Avenida", "AL": "Alameda", "PCA": "Praca", "PÇA": "Praca",
    "EST": "Estrada", "ROD": "Rodovia", "TR": "Travessa", "VD": "Viaduto",
    "PÇ": "Praca", "PC": "Praca",
}


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
    return list(csv.DictReader(texto.splitlines(), delimiter=";"))


def limpar(endereco: str) -> str:
    """Normaliza o endereco invertido do DTP: 'NOME, R.' -> 'Rua NOME'."""
    s = (endereco or "").strip()
    if not s:
        return ""
    m = re.match(
        r"^(.*?),\s*(R|AV|AL|PCA|PÇA|PÇ|EST|ROD|TR|VD|PC)\b(.*)$",
        s, re.IGNORECASE)
    tem_mj = bool(re.search(r"\bMJ\b", s, re.IGNORECASE))
    if m:
        base = re.sub(r"\(.*?\)", "", m.group(1)).strip()
        stype = m.group(2).strip().upper().rstrip(".")
        tipo = TIPOS.get(stype, stype.title())
        if tem_mj:  # "GUILHERME RUDGE MJ, PÇA." -> "Praça Major GUILHERME RUDGE"
            base = re.sub(r"\bMJ\b", "", base, flags=re.IGNORECASE)
            base = "Major " + re.sub(r"\s{2,}", " ", base).strip()
        s = f"{tipo} {base}".strip()
    else:
        s = re.sub(r"\(.*?\)", "", s).strip()
        if tem_mj:
            s = re.sub(r"\bMJ\b", "Major", s, flags=re.IGNORECASE)
    s = s.replace("PROFº", "Professor").replace("PROFª", "Professora")
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


# Municipio de Sao Paulo (margem folgada): -24.12..-23.34 / -46.95..-46.30
LAT_MIN, LAT_MAX = -24.12, -23.34
LON_MIN, LON_MAX = -46.95, -46.30


def norm(texto: str) -> str:
    texto = "".join(c for c in unicodedata.normalize("NFKD", texto or "")
                    if not unicodedata.combining(c))
    return " ".join(texto.upper().split())


def dentro_sp(res: dict) -> bool:
    return (LAT_MIN <= res["lat"] <= LAT_MAX) and (LON_MIN <= res["lon"] <= LON_MAX)


def candidatos(endereco: str) -> list[str]:
    """Consultas em cascata, da mais especifica para a mais generica."""
    base = limpar(endereco)
    if not base:
        return []
    sem_tipo = re.sub(
        r"^(Rua|Avenida|Alameda|Praca|Praça|Estrada|Rodovia|Travessa|Viaduto)\s+",
        "", base).strip()
    nucleo = sem_tipo or base
    out = [
        f"{base}, São Paulo, SP, Brasil",
        f"{base}, São Paulo, Brasil",
        f"{nucleo}, São Paulo, Brasil",
        f"{base}, Brasil",
    ]
    vistos, finais = set(), []
    for q in out:
        if q not in vistos:
            vistos.add(q)
            finais.append(q)
    return finais


def carregar_cache() -> dict:
    if CACHE.exists():
        try:
            return json.loads(CACHE.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return {}
    return {}


def salvar_cache(cache: dict) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def buscar(query: str, cache: dict, tentativas: int = 3, pause: float = 1.05):
    if query in cache:
        v = cache[query]
        if v is None or "cidade" in v:
            return v
        del cache[query]  # cache antigo sem a cidade: refaz a consulta
    url = ("https://nominatim.openstreetmap.org/search?q="
           f"{urllib.parse.quote(query)}&format=json&limit=1"
           "&countrycodes=br&addressdetails=1")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for tentativa in range(tentativas):
        try:
            time.sleep(pause)  # rate limit do Nominatim: 1 req/s
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            break
        except Exception as exc:  # noqa: BLE001
            if tentativa == tentativas - 1:
                print(f"     erro: {exc}")
                return None
            time.sleep(5 * (tentativa + 1))
    else:
        return None

    if not data:
        cache[query] = None
        salvar_cache(cache)
        return None

    addr = data[0].get("address") or {}
    cidade = (addr.get("city") or addr.get("town") or addr.get("municipality")
              or addr.get("county") or "")
    res = {
        "lat": float(data[0]["lat"]),
        "lon": float(data[0]["lon"]),
        "display_name": data[0].get("display_name", ""),
        "cidade": cidade,
    }
    cache[query] = res
    salvar_cache(cache)
    return res


def aceito(res: dict) -> bool:
    """Aceita so' o que caiu no municipio de Sao Paulo."""
    cid = norm(res.get("cidade") or "")
    if cid and cid != "SAO PAULO":
        return False
    return dentro_sp(res)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--max", type=int, default=0, help="limita a execucao")
    ap.add_argument("--sleep", type=float, default=1.05)
    args = ap.parse_args()

    if not ENTRADA.exists():
        print(f"entrada nao encontrada: {ENTRADA}")
        return 1

    pontos = ler_csv(ENTRADA)
    print(f"pontos a geocodificar: {len(pontos)}")
    cache = carregar_cache()
    print(f"cache: {len(cache)} consultas")

    ja_geo = 0
    if SAIDA.exists():
        prev = {r["ponto"]: r for r in ler_csv(SAIDA)}
        ja_geo = sum(1 for r in prev.values() if r.get("latitude"))
        print(f"saida anterior: {ja_geo} com coordenadas (sera' atualizada)")

    limite = args.max or len(pontos)
    ok = falhou = 0
    linhas = []

    for i, p in enumerate(pontos[:limite], 1):
        end = p.get("endereco", "")
        achado = None
        usada = ""
        fora = False
        for q in candidatos(end):
            r = buscar(q, cache, tentativas=2, pause=args.sleep)
            if not r:
                continue
            if aceito(r):
                achado, usada = r, q
                break
            fora = True  # achou fora do municipio: tenta a proxima consulta
        if achado:
            ok += 1
            status = "ok"
        else:
            falhou += 1
            status = "fora_do_municipio" if fora else "nao_encontrado"
        linhas.append({
            **p,
            "latitude": f"{achado['lat']:.6f}" if achado else "",
            "longitude": f"{achado['lon']:.6f}" if achado else "",
            "consulta": usada,
            "resultado_nome": achado["display_name"] if achado else "",
            "status_geo": status,
        })
        if i % 25 == 0 or i == limite:
            print(f"  {i}/{limite} | ok={ok} falhou={falhou} | {p['endereco'][:40]}")
            salvar_cache(cache)

    if args.max and limite < len(pontos):
        # parcial: preserva o que ja existia na saida
        anterior = {r["ponto"]: r for r in ler_csv(SAIDA)} if SAIDA.exists() else {}
        for l in linhas:
            anterior[l["ponto"]] = {**anterior.get(l["ponto"], {}), **l}
        campos = list(pontos[0].keys()) + ["latitude", "longitude", "consulta",
                                           "resultado_nome", "status_geo"]
        with SAIDA.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=campos, delimiter=";",
                               extrasaction="ignore")
            w.writeheader()
            for pid, row in anterior.items():
                w.writerow(row)
        print(f"[parcial] {SAIDA.relative_to(ROOT)} com {len(anterior)} linhas")
        return 0

    campos = list(pontos[0].keys()) + ["latitude", "longitude", "consulta",
                                       "resultado_nome", "status_geo"]
    with SAIDA.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";",
                           extrasaction="ignore")
        w.writeheader()
        w.writerows(linhas)
    print(f"[ok] {SAIDA.relative_to(ROOT)} ({len(linhas)} linhas)")

    resumo = {
        "data": datetime.now(BRT).isoformat(timespec="seconds"),
        "pontos_sem_osm": len(pontos),
        "geocodificados": ok,
        "nao_encontrados": falhou,
        "cobertura_coordenada_dtp_pct_antes": 21.99,
        "cobertura_coordenada_dtp_pct_depois": round((261 + ok) / 1187 * 100, 2),
        "pareamento_osm_gate5_pct": 21.99,
        "nota": ("geocodificacao no nivel de logradouro (enderecos sem numero); "
                 "sobe a cobertura de COORDENADAS do DTP no mapa, nao o "
                 "pareamento DTP<->OSM do Gate 5"),
    }
    RESUMO.write_text(json.dumps(resumo, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
