# -*- coding: utf-8 -*-
"""Gera zip compacto do projeto para anexo de e-mail (limite 25 MB).

Padrão: variante B (17,6 MB) — sem pasta "Novos Alvarás 2026", sem .xlsx,
sem .git, sem data/external (OSM), data/raw (rebaixável) e data/private (LGPD).

Uso:
    python scripts/make_email_zip.py [destino] [prefixos_a_pular|-] [xlsx|-]
Exemplos:
    python scripts/make_email_zip.py
    python scripts/make_email_zip.py ..\\pacote.zip - xlsx     # inclui xlsx
    python scripts/make_email_zip.py ..\\min.zip "data/processed;Novos Alvarás 2026" -
"""
import datetime
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_DIRS = {".git", "__pycache__", ".ipynb_checkpoints"}
EXCLUDE_TOP_DATA = {"external", "raw", "private"}
EXCLUDE_FILES = {"Thumbs.db", "desktop.ini"}
SKIP_DEFAULT = ["Novos Alvarás 2026"]
SKIP_DUP_NAMES = {
    "dashboard_alvaras_taxi_2026.html",
    "planilha_mestre_taxistas_sp_2026.csv",
    "planilha_mestre_taxistas_sp_2026.xlsx",
}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] not in ("", "-") else os.path.join(
        ROOT, "mapeamento_%s.zip" % datetime.date.today().strftime("%Y-%m-%d"))
    arg2 = sys.argv[2] if len(sys.argv) > 2 else "Novos Alvarás 2026"
    skip = [] if arg2 in ("", "-") else [p for p in arg2.split(";") if p]
    include_xlsx = len(sys.argv) > 3 and sys.argv[3] == "xlsx"
    exclude_ext = {".zip", ".pyc"} if include_xlsx else {".zip", ".pyc", ".xlsx"}

    total_in = 0
    n = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            rel_dir = os.path.relpath(dirpath, ROOT).replace("\\", "/")
            if rel_dir == ".":
                rel_dir = ""
            dirnames[:] = [
                d for d in dirnames
                if d not in EXCLUDE_DIRS
                and not (rel_dir == "data" and d in EXCLUDE_TOP_DATA)
            ]
            for fn in filenames:
                if fn in EXCLUDE_FILES or os.path.splitext(fn)[1].lower() in exclude_ext:
                    continue
                full = os.path.join(dirpath, fn)
                arc = os.path.relpath(full, ROOT).replace("\\", "/")
                if rel_dir in SKIP_DEFAULT and fn in SKIP_DUP_NAMES:
                    continue
                if any(arc == p or arc.startswith(p + "/") for p in skip):
                    continue
                if os.path.exists(out) and os.path.abspath(full) == os.path.abspath(out):
                    continue
                try:
                    total_in += os.path.getsize(full)
                except OSError:
                    continue
                z.write(full, arc)
                n += 1

    print("zip     : %s" % out)
    print("entrada : %.1f MB" % (total_in / 1048576))
    print("saida   : %.2f MB (%d arquivos)" % (os.path.getsize(out) / 1048576, n))


if __name__ == "__main__":
    main()
