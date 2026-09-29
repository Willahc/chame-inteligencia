# -*- coding: utf-8 -*-
"""Extrai elementos OSM com marcadores de taxi no municipio de Sao Paulo.

Entrada:  data/external/osm/taxi/geofabrik_sudeste_latest_20260923T1425.osm.pbf
Recorte:  polygon municipal oficial GeoSampa (EPSG:31983) reprojetado para EPSG:4326.
Filtro:   amenity=taxi OR taxi=yes OR public_transport=taxi.
Saida:    OSM XML cru (sem user/uid/changeset/timestamp) com nodes, ways e relations.
"""

import json
import struct
import sys
import time
import zlib

import pyproj

PBF = r"data\external\osm\taxi\geofabrik_sudeste_latest_20260923T1425.osm.pbf"
GEOJSON = r"data\raw\geosampa\limites\municipio_sao_paulo_geosampa_20260923T1045.geojson"
OUT = None
LIMIT_BLOBS = int(sys.argv[1]) if len(sys.argv) > 1 else 0

TAXI_TAGS = {("amenity", "taxi"), ("taxi", "yes"), ("public_transport", "taxi")}


def read_varint(buf, i):
    result = 0
    shift = 0
    while True:
        b = buf[i]
        i += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7
    return result, i


def iterate_buf(buf, start=0, end=None):
    if end is None:
        end = len(buf)
    i = start
    while i < end:
        key, i = read_varint(buf, i)
        tag = key >> 3
        wt = key & 0x07
        if wt == 0:
            v, i = read_varint(buf, i)
        elif wt == 1:
            v = buf[i:i + 8]
            i += 8
        elif wt == 2:
            ln, i = read_varint(buf, i)
            v = buf[i:i + ln]
            i += ln
        elif wt == 5:
            v = buf[i:i + 4]
            i += 4
        else:
            raise ValueError("wire type {}".format(wt))
        yield tag, wt, v


def unpack_packed(buf):
    out = []
    i = 0
    while i < len(buf):
        v, i = read_varint(buf, i)
        out.append(v)
    return out


def zigzag(n):
    return (n >> 1) ^ -(n & 1)


class OSMWriter:
    def __init__(self, path):
        self.f = open(path, "w", encoding="utf-8")
        self.f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        self.f.write(
            '<osm version="0.6" generator="scripts/extract_osm_taxi.py">\n'
        )

    def node(self, nid, lat, lon, tags):
        self.f.write('<node id="%d" lat="%.7f" lon="%.7f">' % (nid, lat, lon))
        for k, v in tags:
            self.f.write(
                '<tag k="%s" v="%s"/>'
                % (k.replace("&", "&amp;").replace('"', "&quot;"),
                   v.replace("&", "&amp;").replace('"', "&quot;"))
            )
        self.f.write("</node>\n")

    def way(self, wid, refs, tags):
        self.f.write('<way id="%d">' % wid)
        for r in refs:
            self.f.write('<nd ref="%d"/>' % r)
        for k, v in tags:
            self.f.write(
                '<tag k="%s" v="%s"/>'
                % (k.replace("&", "&amp;").replace('"', "&quot;"),
                   v.replace("&", "&amp;").replace('"', "&quot;"))
            )
        self.f.write("</way>\n")

    def relation(self, rid, members, tags):
        self.f.write('<relation id="%d">' % rid)
        for mtype, mref, role in members:
            self.f.write(
                '<member type="%s" ref="%d" role="%s"/>'
                % (mtype, mref, role.replace("&", "&amp;").replace('"', "&quot;"))
            )
        for k, v in tags:
            self.f.write(
                '<tag k="%s" v="%s"/>'
                % (k.replace("&", "&amp;").replace('"', "&quot;"),
                   v.replace("&", "&amp;").replace('"', "&quot;"))
            )
        self.f.write("</relation>\n")

    def close(self):
        self.f.write("</osm>\n")
        self.f.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


def build_polygon():
    with open(GEOJSON, encoding="utf-8-sig") as fh:
        gj = json.load(fh)
    coords = gj["features"][0]["geometry"]["coordinates"]
    rings = coords if gj["features"][0]["geometry"]["type"] == "Polygon" else coords[0]
    xfm = pyproj.Transformer.from_crs("EPSG:31983", "EPSG:4326", always_xy=True)
    polys = []
    for ring in rings:
        lonlat = xfm.itransform(ring)
        polys.append(list(lonlat))
    return polys


def point_in_polygons(polys, lon, lat):
    for ring in polys:
        inside = False
        j = len(ring) - 1
        for i in range(len(ring)):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (
                (yi > lat) != (yj > lat)
                and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi
            ):
                inside = not inside
            j = i
        if inside:
            return True
    return False


def parse_block(raw):
    strings = []
    groups = []
    granularity = 100
    lat_offset = 0
    lon_offset = 0
    for tag, wt, v in iterate_buf(raw):
        if tag == 1:
            for _, _, s in iterate_buf(v):
                strings.append(s.decode("utf-8", "replace"))
        elif tag == 2:
            groups.append(v)
        elif tag == 17:
            granularity = v
        elif tag == 19:
            lat_offset = v
        elif tag == 20:
            lon_offset = v
    return strings, groups, granularity, lat_offset, lon_offset


def coord_z(rawv, off, gran):
    return 1e-9 * (off + gran * zigzag(rawv))


def coord_d(rawv, off, gran):
    return 1e-9 * (off + gran * rawv)


def main():
    called = time.time()
    polys = build_polygon()

    def inside(lon, lat):
        return point_in_polygons(polys, lon, lat)

    blobs = BlobIter(PBF)

    taxi_nodes = {}
    taxi_ways = {}
    taxi_rels = {}
    needed = set()
    n_blobs = 0
    t0 = time.time()

    for btype, raw in blobs:
        n_blobs += 1
        if LIMIT_BLOBS and n_blobs > LIMIT_BLOBS:
            break
        if btype != "OSMData":
            continue
        strings, groups, gran, lato, lono = parse_block(raw)

        for g in groups:
            for tag, wt, v in iterate_buf(g):
                if tag == 1:
                    nid = None
                    keys = []
                    vals = []
                    lat = lon = None
                    for t2, w2, v2 in iterate_buf(v):
                        if t2 == 1:
                            nid = zigzag(v2)
                        elif t2 == 2:
                            keys = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 3:
                            vals = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 8:
                            lat = v2
                        elif t2 == 9:
                            lon = v2
                    tags = [(strings[a], strings[b]) for a, b in zip(keys, vals)]
                    if any(t in TAXI_TAGS for t in tags):
                        y = coord_z(lat, lato, gran)
                        x = coord_z(lon, lono, gran)
                        if inside(x, y):
                            taxi_nodes[nid] = (x, y, tags)
                elif tag == 2:
                    ids = vals = kvs = None
                    for t2, w2, v2 in iterate_buf(v):
                        if t2 == 1:
                            ids = unpack_packed(v2)
                        elif t2 == 8:
                            latr = unpack_packed(v2)
                        elif t2 == 9:
                            lonr = unpack_packed(v2)
                        elif t2 == 10:
                            kvs = unpack_packed(v2)
                    d_id = 0
                    d_lat = 0
                    d_lon = 0
                    kv_i = 0
                    for di in range(len(ids)):
                        d_id += zigzag(ids[di])
                        d_lat += zigzag(latr[di])
                        d_lon += zigzag(lonr[di])
                        tags = []
                        while kvs[kv_i] != 0:
                            ki = kvs[kv_i]
                            vi = kvs[kv_i + 1]
                            kv_i += 2
                            tags.append((strings[ki], strings[vi]))
                        kv_i += 1
                        if any(t in TAXI_TAGS for t in tags):
                            y = coord_d(d_lat, lato, gran)
                            x = coord_d(d_lon, lono, gran)
                            if inside(x, y):
                                taxi_nodes[d_id] = (x, y, tags)
                elif tag == 3:
                    wid = None
                    keys = []
                    vals = []
                    refs = []
                    for t2, w2, v2 in iterate_buf(v):
                        if t2 == 1:
                            wid = v2
                        elif t2 == 2:
                            keys = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 3:
                            vals = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 8:
                            refs = []
                            acc = 0
                            for x in unpack_packed(v2):
                                acc += zigzag(x)
                                refs.append(acc)
                    tags = [(strings[a], strings[b]) for a, b in zip(keys, vals)]
                    if any(t in TAXI_TAGS for t in tags):
                        taxi_ways[wid] = (tags, refs)
                        needed.update(refs)
                elif tag == 4:
                    rid = None
                    keys = []
                    vals = []
                    roles = []
                    memids = []
                    mtypes = []
                    for t2, w2, v2 in iterate_buf(v):
                        if t2 == 1:
                            rid = v2
                        elif t2 == 2:
                            keys = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 3:
                            vals = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 8:
                            roles = unpack_packed(v2) if w2 == 2 else [v2]
                        elif t2 == 9:
                            memids = []
                            acc = 0
                            for x in unpack_packed(v2):
                                acc += zigzag(x)
                                memids.append(acc)
                        elif t2 == 10:
                            mtypes = unpack_packed(v2) if w2 == 2 else [v2]
                    tags = [(strings[a], strings[b]) for a, b in zip(keys, vals)]
                    if any(t in TAXI_TAGS for t in tags):
                        members = []
                        for i, m in enumerate(memids):
                            mt = {0: "node", 1: "way", 2: "relation"}.get(
                                mtypes[i] if i < len(mtypes) else 0, "node"
                            )
                            role = strings[roles[i]] if i < len(roles) else ""
                            members.append((mt, m, role))
                        taxi_rels[rid] = (tags, members)
        if n_blobs % 500 == 0:
            print(
                "[p1] blobs=%d nodes=%d ways=%d rels=%d %.1fs"
                % (n_blobs, len(taxi_nodes), len(taxi_ways), len(taxi_rels), time.time() - t0),
                flush=True,
            )

    print(
        "[p1] done blobs=%d taxi_nodes=%d taxi_ways=%d taxi_rels=%d needed_refs=%d %.1fs"
        % (n_blobs, len(taxi_nodes), len(taxi_ways), len(taxi_rels), len(needed), time.time() - t0),
        flush=True,
    )

    node_coords = {}
    n2 = 0
    t1 = time.time()
    for btype, raw in BlobIter(PBF):
        n2 += 1
        if LIMIT_BLOBS and n2 > LIMIT_BLOBS:
            break
        if btype != "OSMData":
            continue
        strings, groups, gran, lato, lono = parse_block(raw)

        for g in groups:
            for tag, wt, v in iterate_buf(g):
                if tag not in (1, 2):
                    continue
                if tag == 1:
                    nid = None
                    lat = lon = None
                    for t2, w2, v2 in iterate_buf(v):
                        if t2 == 1:
                            nid = zigzag(v2)
                        elif t2 == 8:
                            lat = v2
                        elif t2 == 9:
                            lon = v2
                    if nid in needed:
                        node_coords[nid] = (coord_z(lon, lono, gran), coord_z(lat, lato, gran))
                else:
                    ids = None
                    latr = None
                    lonr = None
                    for t2, w2, v2 in iterate_buf(v):
                        if t2 == 1:
                            ids = unpack_packed(v2)
                        elif t2 == 8:
                            latr = unpack_packed(v2)
                        elif t2 == 9:
                            lonr = unpack_packed(v2)
                    d_id = 0
                    d_lat = 0
                    d_lon = 0
                    for di in range(len(ids)):
                        d_id += zigzag(ids[di])
                        d_lat += zigzag(latr[di])
                        d_lon += zigzag(lonr[di])
                        if d_id in needed:
                            node_coords[d_id] = (coord_d(d_lon, lono, gran), coord_d(d_lat, lato, gran))
        if n2 % 500 == 0:
            print(
                "[p2] blobs=%d coords=%d %.1fs"
                % (n2, len(node_coords), time.time() - t1),
                flush=True,
            )
    print("[p2] done coords=%d %.1fs" % (len(node_coords), time.time() - t1), flush=True)

    kept_ways = {}
    dropped_ways = 0
    for wid, (tags, refs) in taxi_ways.items():
        inside_refs = 0
        known = 0
        for r in refs:
            c = node_coords.get(r)
            if c is None:
                continue
            known += 1
            if inside(c[0], c[1]):
                inside_refs += 1
        if inside_refs and known:
            kept_ways[wid] = (tags, refs)
        elif not known and refs:
            pass
        else:
            dropped_ways += 1

    kept_rel = {}
    for rid, (tags, members) in taxi_rels.items():
        kept_rel[rid] = (tags, members)

    extra_nodes = {}
    for wid, (tags, refs) in kept_ways.items():
        for r in refs:
            c = node_coords.get(r)
            if c is not None and r not in taxi_nodes:
                extra_nodes[r] = c

    t2 = time.time()
    with OSMWriter(OUT) as w:
        for nid, (x, y, tags) in sorted(taxi_nodes.items()):
            w.node(nid, y, x, tags)
        for nid, (x, y) in sorted(extra_nodes.items()):
            w.node(nid, y, x, [])

        for wid, (tags, refs) in sorted(kept_ways.items()):
            w.way(wid, refs, tags)
        for rid, (tags, members) in sorted(kept_rel.items()):
            w.relation(rid, members, tags)

    print(
        "[out] taxi_nodes=%d way_ref_nodes=%d ways=%d rels=%d dropped_ways=%d"
        % (len(taxi_nodes), len(extra_nodes), len(kept_ways), len(kept_rel), dropped_ways),
        flush=True,
    )
    print("total %.1fs" % (time.time() - called), flush=True)


class BlobIter:
    def __init__(self, path):
        self.f = open(path, "rb")

    def __iter__(self):
        while True:
            hdr = self.f.read(4)
            if len(hdr) < 4:
                break
            (hlen,) = struct.unpack(">I", hdr)
            bh = self.f.read(hlen)
            btype = None
            dsize = None
            for tag, wt, v in iterate_buf(bh):
                if tag == 1:
                    btype = v.decode()
                elif tag == 3:
                    dsize = v
            blob = self.f.read(dsize)
            raw = None
            for tag, wt, v in iterate_buf(blob):
                if tag == 1:
                    raw = v
                elif tag == 3:
                    raw = zlib.decompress(v)
            yield btype, raw

    def close(self):
        self.f.close()


if __name__ == "__main__":
    import os
    from pathlib import Path

    ts = time.strftime("%Y%m%dT%H%M")
    out_dir = Path(__file__).resolve().parent.parent / "data" / "external" / "osm" / "taxi"
    out_dir.mkdir(parents=True, exist_ok=True)
    OUT = os.path.join(
        str(out_dir),
        "osm_taxi_saopaulo_geofabrik_%s_raw.osm" % ts,
    )
    print("OUT =", OUT, flush=True)
    main()