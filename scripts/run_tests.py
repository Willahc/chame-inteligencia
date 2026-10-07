# -*- coding: utf-8 -*-
"""scripts/run_tests.py — executa toda a suíte de testes unitários do repositório."""

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"


def main():
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=str(SCRIPTS_DIR), pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
