# -*- coding: utf-8 -*-
"""scripts/test_privacy.py — testes unitários para a política de privacidade (LGPD)."""

import unittest
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from privacy import (
    extra_patterns,
    is_pii_column,
    pii_columns,
    redact_text,
    _detect_sep,
    CONTENT_PATTERNS,
)


class PrivacyPolicyTests(unittest.TestCase):
    def test_pii_columns_detection(self):
        # Campos que DEVEM ser identificados como PII
        pii_samples = [
            "CPF",
            "CPF_Completo",
            "MEI_CPF_Extraido",
            "Telefone_Celular",
            "Telefone_Principal",
            "Telefone_Secundario",
            "Telefone_Residencial",
            "Celular",
            "Celular_1",
            "DDD_1",
            "Telefones_Motoristas",
            "Telefone_Motorista",
            "Email",
            "Email_Principal",
            "CORREIO_ELETRONICO",
            "Bairro_Residencial",
            "Chave_Busca",
            "Nascimento",
            "Idade_Minima_Estimada",
            "Genero",
            "WhatsApp",
            "WhatsApp_Ativo",
            "Link_WhatsApp",
            "Texto_Mensagem_WhatsApp",
        ]
        for col in pii_samples:
            self.assertTrue(
                is_pii_column(col),
                f"Coluna '{col}' deveria ser classificada como PII",
            )

    def test_institutional_columns_allowed(self):
        # Campos permitidos / institucionais
        safe_samples = [
            "Ponto_Numero",
            "Ponto_Endereco",
            "Ponto_Telefone",
            "CFC_Telefone",
            "Telefone_Central",
            "Telefone_Institucional",
            "Telefone_Totem",
            "Razao_Social",
            "CNPJ",
            "Score_Chame_Taxi",
            "Tier_Prioridade_Comercial",
            "Subprefeitura",
            "Capacidade_Vagas",
        ]
        for col in safe_samples:
            self.assertFalse(
                is_pii_column(col),
                f"Coluna institucional '{col}' não deveria ser bloqueada como PII",
            )

    def test_file_specific_pii(self):
        # CEP é PII apenas na Planilha Mestre (endereço residencial do motorista)
        master_file = "planilha_mestre_taxistas_sp_2026.csv"
        extras = extra_patterns(master_file)
        self.assertTrue(is_pii_column("CEP", extras))

        # Em outros arquivos institucionais, CEP do ponto/empresa é permitido
        self.assertFalse(is_pii_column("CEP", None))

    def test_redact_formatted_cpf(self):
        raw = "Motorista cadastrado sob CPF 123.456.789-01 no sistema."
        redacted = redact_text(raw)
        self.assertNotIn("123.456.789-01", redacted)
        self.assertIn("[REMOVIDO]", redacted)

    def test_redact_whatsapp_links(self):
        link_wame = "Contato direto via wa.me/5511999998888 com o titular."
        redacted_wame = redact_text(link_wame)
        self.assertNotIn("wa.me/5511999998888", redacted_wame)
        self.assertIn("[REMOVIDO]", redacted_wame)

        link_api = "Chat: https://api.whatsapp.com/send?phone=5511988887777 texto"
        redacted_api = redact_text(link_api)
        self.assertNotIn("api.whatsapp.com/send?phone=5511988887777", redacted_api)
        self.assertIn("[REMOVIDO]", redacted_api)

    def test_detect_sep(self):
        tmp_csv = Path(__file__).resolve().parent / "_test_sep.tmp"
        try:
            tmp_csv.write_text("a;b;c\n1;2;3\n", encoding="utf-8")
            self.assertEqual(_detect_sep(tmp_csv), ";")
            tmp_csv.write_text("a,b,c\n1,2,3\n", encoding="utf-8")
            self.assertEqual(_detect_sep(tmp_csv), ",")
        finally:
            tmp_csv.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
