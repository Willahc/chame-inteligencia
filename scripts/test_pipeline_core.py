# -*- coding: utf-8 -*-
"""scripts/test_pipeline_core.py — testes unitários para funções centrais de normalização e dados."""

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_master_spreadsheet import (
    clean_val,
    norm_name,
    norm_digits,
    clean_mei_thorough,
    clean_mei_name,
    strip_prep,
    format_cpf,
)


class PipelineCoreTests(unittest.TestCase):
    def test_clean_val(self):
        self.assertEqual(clean_val("—"), "")
        self.assertEqual(clean_val("nan"), "")
        self.assertEqual(clean_val("NaN"), "")
        self.assertEqual(clean_val("None"), "")
        self.assertEqual(clean_val("null"), "")
        self.assertEqual(clean_val("Não localizado"), "")
        self.assertEqual(clean_val("  teste  "), "teste")
        self.assertEqual(clean_val(None), "")

    def test_norm_name(self):
        self.assertEqual(norm_name("  João  da   Silva  "), "JOAO DA SILVA")
        self.assertEqual(norm_name("Érika Conceição"), "ERIKA CONCEICAO")
        self.assertEqual(norm_name(None), "")

    def test_norm_digits(self):
        self.assertEqual(norm_digits("(11) 98765-4321"), "11987654321")
        self.assertEqual(norm_digits("123.456.789-00"), "12345678900")
        self.assertEqual(norm_digits(None), "")

    def test_clean_mei_thorough(self):
        raw = "12345678000199 JOSE DA SILVA TAXI ME"
        cleaned = clean_mei_thorough(raw)
        self.assertEqual(cleaned, "JOSE DA SILVA")

        raw2 = "MARIA DE SOUZA AUTO TAXI LTDA"
        cleaned2 = clean_mei_thorough(raw2)
        self.assertEqual(cleaned2, "MARIA DE SOUZA")

    def test_clean_mei_name_alias(self):
        self.assertEqual(clean_mei_name("CARLOS PEREIRA TAXISTA"), "CARLOS PEREIRA")

    def test_strip_prep(self):
        self.assertEqual(strip_prep("JOAO DA SILVA E SOUZA"), "JOAO SILVA SOUZA")
        self.assertEqual(strip_prep("MARIA DO CARMO DOS SANTOS"), "MARIA CARMO SANTOS")

    def test_format_cpf(self):
        self.assertEqual(format_cpf("12345678901"), "123.456.789-01")
        self.assertEqual(format_cpf("123.456.789-01"), "123.456.789-01")
        self.assertEqual(format_cpf("12345"), "")
        self.assertEqual(format_cpf(""), "")


if __name__ == "__main__":
    unittest.main()
