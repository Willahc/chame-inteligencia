import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from scrape_diario_oficial_2026 import (
    build_commercial_action,
    clean_html,
    deduplicate_records,
    extract_record,
    normalize_document_url,
    parse_alvara_from_summary,
)


class DocScraperTests(unittest.TestCase):
    def test_clean_html_decodes_entities(self):
        self.assertEqual(clean_html("<p>JOÃO&nbsp;DA&nbsp;SILVA</p>"), "JOÃO DA SILVA")

    def test_normalize_document_url_uses_https(self):
        value = "http://diariooficial.prefeitura.sp.gov.br/md_epubli_visualizar.php?acao=ver&id=1,,"
        self.assertEqual(
            normalize_document_url(value),
            "https://diariooficial.prefeitura.sp.gov.br/md_epubli_visualizar.php?acao=ver&id=1",
        )
        self.assertEqual(normalize_document_url("https://example.test/redirect"), "")

    def test_parse_alvara_from_summary(self):
        self.assertEqual(parse_alvara_from_summary("Alvará nº 012.441-21"), "012.441-21")
        self.assertEqual(parse_alvara_from_summary("sem alvará"), "—")

    def test_extract_record_uses_explicit_schema(self):
        block = (
            '<a class="nroSei">6020.2026/0013944-8</a> - TRANSFERÊNCIA DE ALVARÁ'
            '<a href="md_epubli_visualizar.php?acao=ver&amp;id=123" '
            'class="nroSei">123</a><span> - Deferido</span>'
            '<span class="dataPublicacao">Publicado em 22/09/2026</span>'
            '<p class="resumoDocumento">Cessionário: JOÃO DA SILVA - '
            'Condutax nº 123. Alvará nº 012.441-21.</p>'
        )
        record = extract_record(block)
        self.assertEqual(record["processo_sei"], "6020.2026/0013944-8")
        self.assertEqual(record["tipo_ato"], "TRANSFERÊNCIA DE ALVARÁ")
        self.assertEqual(record["condutax_num"], "123")
        self.assertEqual(record["alvara_num"], "012.441-21")
        self.assertEqual(record["doc_url"].split("://", 1)[0], "https")

    def test_build_commercial_action_is_neutral(self):
        self.assertEqual(
            build_commercial_action("TRANSFERÊNCIA DE ALVARÁ"),
            "Validar elegibilidade e obter autorização antes de apresentar a oferta.",
        )
        self.assertEqual(
            build_commercial_action("REGISTRO DE SEGUNDO MOTORISTA"),
            "Validar a condição de preposto antes de apresentar a oferta.",
        )

    def test_deduplicate_records_ignores_repeated_document_urls(self):
        record = {
            "doc_id": "123",
            "processo_sei": "1",
            "tipo_ato": "NOVO CONDUTAX",
            "condutax_num": "123",
            "nome_motorista": "REGISTRO",
        }
        duplicate = dict(record, doc_url="https://example.test/outro")
        self.assertEqual(deduplicate_records([record, duplicate]), [record])


if __name__ == "__main__":
    unittest.main()
