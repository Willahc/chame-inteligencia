# -*- coding: utf-8 -*-
"""
scripts/scrape_diario_oficial_2026.py
Extrator oficial de atos do Diário Oficial da Cidade de São Paulo (DOC):
Coleta os despachos de 2026 do DTP com motoristas requerentes, cessionários de alvará,
números de Condutax, processos SEI e links oficiais.

Saídas canônicas:
  - data/processed/diario_oficial_taxistas_sp_2026.csv
  - data/processed/diario_oficial_taxistas_sp_2026.json

Saídas de compatibilidade (espelhos dos atos coletados, não apenas novos Condutax):
  - data/processed/novos_condutax_diario_oficial.csv
  - data/processed/novos_condutax_diario_oficial.json
"""

import csv
import html
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
BASE_URL = "https://diariooficial.prefeitura.sp.gov.br/"
OFFICIAL_HOST = "diariooficial.prefeitura.sp.gov.br"
SEARCH_URL = urljoin(BASE_URL, "md_epubli_controlador.php?acao=materias_pesquisar")
TIMEOUT = (10, 30)
PAGE_SIZE = 10
MAX_PAGES = 12
EMPTY_VALUE = "—"
OUTPUT_CSV_2026 = PROCESSED_DIR / "diario_oficial_taxistas_sp_2026.csv"
OUTPUT_JSON_2026 = PROCESSED_DIR / "diario_oficial_taxistas_sp_2026.json"
OUTPUT_CSV_DASH = PROCESSED_DIR / "novos_condutax_diario_oficial.csv"
OUTPUT_JSON_DASH = PROCESSED_DIR / "novos_condutax_diario_oficial.json"
OUTPUT_FIELDS = [
    "data_publicacao",
    "processo_sei",
    "tipo_ato",
    "nome_motorista",
    "condutax_num",
    "alvara_num",
    "cedente_anterior",
    "categoria",
    "status",
    "doc_id",
    "doc_url",
    "resumo_texto",
    "acao_chame_taxi",
]


def clean_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_document_url(value: str) -> str:
    if not value:
        return ""
    value = html.unescape(value.strip()).rstrip(",;")
    parsed = urlsplit(urljoin(BASE_URL, value))
    hostname = (parsed.hostname or "").lower()
    if hostname and hostname != OFFICIAL_HOST:
        return ""
    return urlunsplit(("https", parsed.netloc, parsed.path, parsed.query, parsed.fragment))


def _ascii_upper(value: str) -> str:
    normalized = value.replace("Á", "A").replace("À", "A").replace("Â", "A").replace("Ã", "A")
    normalized = normalized.replace("É", "E").replace("Ê", "E").replace("Í", "I")
    normalized = normalized.replace("Ó", "O").replace("Ô", "O").replace("Õ", "O")
    normalized = normalized.replace("Ú", "U").replace("Ü", "U").replace("Ç", "C")
    return normalized.upper()


def parse_alvara_from_summary(resumo: str) -> str:
    patterns = (
        r"Alvar[aá]\s*(?:n[ºo°]\s*)?(?:n[ºo°]\s*)?([0-9][0-9.\-/]*)",
        r"Alvar[aá][^0-9]{0,30}([0-9][0-9.\-/]{2,})",
    )
    for pattern in patterns:
        match = re.search(pattern, resumo, re.IGNORECASE)
        if match:
            value = match.group(1).strip(" .;:-")
            if value and value != "...":
                return value
    return EMPTY_VALUE


def build_commercial_action(subject: str) -> str:
    subject_key = _ascii_upper(subject or "")
    if "SEGUNDO MOTORISTA" in subject_key or "PREPOSTO" in subject_key:
        return "Validar a condição de preposto antes de apresentar a oferta."
    return "Validar elegibilidade e obter autorização antes de apresentar a oferta."


def record_key(record: dict) -> tuple:
    values = (
        record.get("doc_id"),
        record.get("processo_sei"),
        record.get("tipo_ato"),
        record.get("condutax_num"),
        record.get("nome_motorista"),
    )
    if any(value not in (None, "", EMPTY_VALUE) for value in values):
        return tuple(str(value or "").strip() for value in values)
    return (json.dumps(record, ensure_ascii=False, sort_keys=True),)


def deduplicate_records(records: list[dict]) -> list[dict]:
    unique = []
    seen = set()
    for record in records:
        key = record_key(record)
        if key in seen:
            continue
        seen.add(key)
        unique.append(record)
    return unique

def parse_drivers_from_summary(resumo: str):
    """Extrai nomes e Condutax de cedente e cessionário/requerente do resumo do DOC."""
    cessionario = "—"
    condutax_cess = "—"
    cedente = "—"
    condutax_ced = "—"
    categoria = "Táxi Comum"

    if "EXECUTIVO" in resumo.upper():
        categoria = "Táxi Executivo"
    elif "ESPECIAL" in resumo.upper():
        categoria = "Táxi Especial"
    elif "ACESSÍVEL" in resumo.upper() or "ACESSIBEL" in resumo.upper():
        categoria = "Táxi Acessível"

    # 1. Procura Cessionário (quem está assumindo o alvará)
    cess_match = re.search(r'Cession[aá]ri[ao]:?\s*([A-ZÀ-Ú\s\.]+?)(?:[-–]|\bCondutax\b|\bDESPACHO\b|$)', resumo, re.IGNORECASE)
    if cess_match:
        cand = re.sub(r'\.{2,}', ' ', cess_match.group(1))
        cand = re.sub(r'\s{2,}', ' ', cand).strip(" -:,")
        if len(cand) >= 3 and not cand.startswith("DESPACHO"):
            cessionario = cand

    # Procura Condutax Cessionário
    cond_cess_match = re.search(r'Cession[aá]ri[ao][^0-9]*?Condutax\s*n[ºo°]?\s*([0-9\.\-\/]+)', resumo, re.IGNORECASE)
    if cond_cess_match:
        condutax_cess = cond_cess_match.group(1).strip()

    # 2. Procura Cedente (quem está transferindo)
    ced_match = re.search(r'Cedente:?\s*([A-ZÀ-Ú\s\.]+?)(?:[-–]|\bCondutax\b|\bCession[aá]ri[ao]\b|$)', resumo, re.IGNORECASE)
    if ced_match:
        cand_ced = re.sub(r'\.{2,}', ' ', ced_match.group(1))
        cand_ced = re.sub(r'\s{2,}', ' ', cand_ced).strip(" -:,")
        if len(cand_ced) >= 3:
            cedente = cand_ced

    cond_ced_match = re.search(r'Cedente[^0-9]*?Condutax\s*n[ºo°]?\s*([0-9\.\-\/]+)', resumo, re.IGNORECASE)
    if cond_ced_match:
        condutax_ced = cond_ced_match.group(1).strip()

    # 3. Se cessionário ainda não identificado, procura Requerente / Interessado
    if cessionario == "—":
        req_match = re.search(r'(?:Requerente|Interessad[ao]|Nome):?\s*([A-ZÀ-Ú\s\.]+?)(?:[-–]|\bCondutax\b|\bDESPACHO\b|$)', resumo, re.IGNORECASE)
        if req_match:
            cand_req = re.sub(r'\.{2,}', ' ', req_match.group(1))
            cand_req = re.sub(r'\s{2,}', ' ', cand_req).strip(" -:,")
            if len(cand_req) >= 4:
                cessionario = cand_req

    # 4. Fallback: procura o primeiro nome próprio antes de "- Condutax"
    if cessionario == "—":
        first_name = re.search(r'([A-ZÀ-Ú\s]{6,40})\s*[-–]\s*Condutax', resumo)
        if first_name:
            cand_first = first_name.group(1).strip(" -:,")
            if cand_first not in ["COMUM", "EXECUTIVO", "ESPECIAL", "ACESSIVEL"]:
                cessionario = cand_first

    if condutax_cess == "—":
        cond_any = re.search(r'Condutax\s*n[ºo°]?\s*([0-9\.\-\/]+)', resumo, re.IGNORECASE)
        if cond_any:
            condutax_cess = cond_any.group(1).strip()

    motorista_final = cessionario if cessionario != "—" else (cedente if cedente != "—" else "CONDUTOR DTP")

    return {
        "motorista": motorista_final,
        "condutax": condutax_cess if condutax_cess != "—" else condutax_ced,
        "cedente": cedente,
        "categoria": categoria
    }

def extract_record(block: str) -> dict:
    proc_match = re.search(
        r'class="nroSei">([^<]+)</a>\s*-\s*([^<]+)', block, re.DOTALL
    )
    proc_num = clean_html(proc_match.group(1)) if proc_match else EMPTY_VALUE
    assunto = clean_html(proc_match.group(2)) if proc_match else "Táxi DTP"

    doc_match = re.search(
        r'href="([^"]*md_epubli_visualizar\.php[^"]*)"[^>]*class="nroSei">([^<]+)</a>\s*<span>\s*-\s*([^<]+)</span>',
        block,
        re.DOTALL,
    )
    doc_url = normalize_document_url(doc_match.group(1)) if doc_match else ""
    doc_id = clean_html(doc_match.group(2)) if doc_match else EMPTY_VALUE
    status = clean_html(doc_match.group(3)) if doc_match else "Não identificado"

    data_match = re.search(r'class="dataPublicacao">Publicado em ([^<]+)</span>', block)
    publication_date = clean_html(data_match.group(1)) if data_match else ""

    resumo_match = re.search(r'class="resumoDocumento">(.*?)</p>', block, re.DOTALL)
    resumo = clean_html(resumo_match.group(1)) if resumo_match else ""
    driver_info = parse_drivers_from_summary(resumo)

    subject_key = _ascii_upper(assunto)
    if "TRANSFER" in subject_key:
        tipo_ato = "TRANSFERÊNCIA DE ALVARÁ"
    elif "CONDUTAX" in subject_key:
        tipo_ato = "NOVO CONDUTAX"
    else:
        tipo_ato = "REGULAÇÃO DTP"

    acao = build_commercial_action(assunto)

    condutax = str(driver_info["condutax"] or EMPTY_VALUE).strip(" .;:-")
    if condutax in {"", "...", "-"}:
        condutax = EMPTY_VALUE

    return {
        "data_publicacao": publication_date,
        "processo_sei": proc_num,
        "tipo_ato": tipo_ato,
        "nome_motorista": driver_info["motorista"],
        "condutax_num": condutax,
        "alvara_num": parse_alvara_from_summary(resumo),
        "cedente_anterior": driver_info["cedente"],
        "categoria": driver_info["categoria"],
        "status": status,
        "doc_id": doc_id,
        "doc_url": doc_url,
        "resumo_texto": resumo[:500],
        "acao_chame_taxi": acao,
    }


def write_records(records: list[dict]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for output_path in (OUTPUT_CSV_2026, OUTPUT_CSV_DASH):
        with open(output_path, "w", encoding="utf-8-sig", newline="") as file:
            writer = csv.DictWriter(
                file,
                fieldnames=OUTPUT_FIELDS,
                delimiter=";",
                extrasaction="ignore",
            )
            writer.writeheader()
            writer.writerows(records)

    for output_path in (OUTPUT_JSON_2026, OUTPUT_JSON_DASH):
        with open(output_path, "w", encoding="utf-8") as file:
            json.dump(records, file, ensure_ascii=False, indent=2)


def main() -> int:
    try:
        import requests
    except ImportError:
        print("Dependência ausente: requests. Instale as dependências do projeto.")
        return 2

    print("[1/3] Conectando ao portal do Diário Oficial da Cidade de São Paulo...")
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE_URL,
        }
    )

    try:
        response = session.get(BASE_URL, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as error:
        print(f"Erro ao conectar na homepage: {error}")
        return 1

    extracted_records = []
    print(f"[2/3] Coletando até {MAX_PAGES} páginas de publicações de CONDUTAX e Alvarás de 2026...")
    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        data = {
            "hdnTermoPesquisa": "CONDUTAX",
            "hdnTipoPesquisa": "Q",
            "hdnVersaoDiario": "A",
            "hdnOndePesquisa": "C",
            "hdnTipoDataPesquisa": "I",
            "hdnDataInicioPesquisa": "",
            "hdnDataFimPesquisa": "",
            "hdnTipoDocumentoPesquisa": "",
            "hdnVisualizacao": "L",
            "hdnModoPesquisa": "AVANCADA",
            "hdnInicio": str(offset),
        }

        try:
            response = session.post(SEARCH_URL, data=data, timeout=TIMEOUT)
            response.raise_for_status()
            blocks = re.findall(
                r'<div class="dadosDocumento">(.*?)</div>(?=<div class="dadosDocumento">|<div class="col-xs-12 col-sm-12)',
                response.text,
                re.DOTALL,
            )
        except requests.RequestException as error:
            print(f"   Aviso: erro na página {page + 1}: {error}")
            continue

        print(f"   Página {page + 1}: {len(blocks)} publicações capturadas")
        for block in blocks:
            extracted_records.append(extract_record(block))

        if page + 1 < MAX_PAGES:
            time.sleep(0.4)

    records = deduplicate_records(extracted_records)
    if not records:
        print("Nenhum registro válido foi encontrado; os arquivos existentes foram preservados.")
        return 1

    write_records(records)
    print(f"\n[3/3] {len(extracted_records)} registros brutos; {len(records)} registros únicos salvos.")
    print(f"-> CSV oficial 2026: {OUTPUT_CSV_2026}")
    print(f"-> JSON oficial 2026: {OUTPUT_JSON_2026}")
    print(f"-> Base canônica atualizada: {OUTPUT_JSON_2026}")
    print(f"-> Espelho de compatibilidade atualizado: {OUTPUT_JSON_DASH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
