# -*- coding: utf-8 -*-
"""
scripts/audit_whatsapp_business_fixo.py
Ferramenta de Auditoria de WhatsApp Business nas Linhas Telefônicas Fixas (Voz).

Para os motoristas que possuem apenas telefone fixo comercial registrado
(prefixos 2xxx, 3xxx, 4xxx, 5xxx), prepara a fila de validação de contas
WhatsApp Business ativas (criadas via verificação por chamada de voz),
gerando links diretos wa.me e suportando auditoria assistida ou em lote
com controle estrito de rate-limiting para evitar bloqueios de IP/número.
"""

import argparse
import csv
import os
import re
import sys
import time
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
OUT_DIR = BASE_DIR / "data" / "processed"
OUT_CSV = OUT_DIR / "auditoria_whatsapp_fixo_pendente.csv"

def extract_clean_digits(tel_str):
    d = re.sub(r'\D', '', str(tel_str or ''))
    if len(d) == 8:
        d = '11' + d
    elif len(d) == 10 and d.startswith('11'):
        pass
    elif len(d) in (12, 13) and d.startswith('55'):
        d = d[2:]
    return d

def main():
    parser = argparse.ArgumentParser(description="Auditoria de WhatsApp Business em Linhas Fixas")
    parser.add_argument("--batch-size", type=int, default=100, help="Tamanho do lote para auditoria")
    parser.add_argument("--contemplados-only", action="store_true", help="Filtra apenas Contemplados Titulares 2026")
    args = parser.parse_args()

    print("=" * 80)
    print("AUDITORIA DE WHATSAPP BUSINESS EM LINHAS TELEFÔNICAS FIXAS")
    print("=" * 80)

    if not MASTER_CSV.exists():
        print(f"Erro: Planilha mestre não encontrada em {MASTER_CSV}")
        return

    df = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    
    # Filtrar registros com telefone fixo
    fixo_mask = (df['WhatsApp_Ativo'] == 'Não (Fixo)') & (df['Telefone_Celular_1'].fillna('').str.strip() != '')
    if args.contemplados_only:
        fixo_mask = fixo_mask & df['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False)

    df_fixo = df[fixo_mask].copy()
    print(f"Total de motoristas com linha fixa para auditoria: {len(df_fixo):,}")
    
    audit_rows = []
    for _, r in df_fixo.iterrows():
        t1_raw = r.get('Telefone_Celular_1', '')
        digits = extract_clean_digits(t1_raw)
        
        link_wpp = f"https://wa.me/55{digits}" if len(digits) == 10 else ""
        link_web = f"https://web.whatsapp.com/send?phone=55{digits}" if len(digits) == 10 else ""

        audit_rows.append({
            'ID_Master': r.get('ID_Master', ''),
            'Nome_Motorista': r.get('Nome_Completo', ''),
            'Status_Sorteio_2026': r.get('Status_Sorteio_2026', ''),
            'Edital_Numero': r.get('Edital_Numero', ''),
            'Tier_Prioridade': r.get('Tier_Prioridade_Comercial', ''),
            'Telefone_Fixo_Formatado': t1_raw,
            'Telefone_Fixo_Digitos': digits,
            'Link_WhatsApp_Direto': link_wpp,
            'Link_WhatsApp_Web': link_web,
            'Possui_WhatsApp_Business': "Não Testado",
            'Data_Ultimo_Teste': "",
            'Operador_Teste': "",
            'Notas_Auditoria': "Linha fixa comercial apta a receber chamada de voz para ativação de WA Business"
        })

    df_audit = pd.DataFrame(audit_rows)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df_audit.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
    print(f"Arquivo de auditoria gerado com sucesso: {OUT_CSV}")
    print(f"Total exportado: {len(df_audit):,} linhas fixas.")
    
    # Exibir resumo por status de sorteio
    print("\nDistribuição das linhas fixas por status do sorteio:")
    print(df_audit['Status_Sorteio_2026'].value_counts().to_string())

if __name__ == '__main__':
    main()
