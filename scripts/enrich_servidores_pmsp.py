# -*- coding: utf-8 -*-
"""
scripts/enrich_servidores_pmsp.py
Mineração OSINT e Mapeamento de Funcionalismo Público / Processos SEI
para os Contemplados e motoristas sem telefone da Planilha Mestre.

Cruza o histórico de despachos do Diário Oficial da Cidade (DOC) e processos
do Sistema Eletrônico de Informações (SEI) da Prefeitura de São Paulo para
identificar os órgãos de lotação (SMS/Saúde, SME/Educação, SMSU/GCM, SMT/DTP, SMSUB),
justificando a ausência de MEI comercial (estatuto do servidor / Pessoa Física)
e fornecendo canais de contato institucional e rastreamento de alvará.
"""

import json
import re
import sys
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
DOC_CACHE_JSON = BASE_DIR / "data" / "processed" / "doc_contemplados_cache.json"
OUT_CSV = BASE_DIR / "data" / "processed" / "servidores_contemplados_pmsp.csv"
OUT_PUBLIC_CSV = BASE_DIR / "data" / "processed" / "servidores_contemplados_pmsp_publico.csv"

SEI_ORGAOS = {
    '6020': ('SMT', 'Secretaria Municipal de Mobilidade e Trânsito (DTP/CET)', 'DTP Pari / Rua Joaquim Carlos, 655', '(11) 2796-3299'),
    '6018': ('SMS', 'Secretaria Municipal da Saúde (UBS/Hospitais Municipais)', 'Secretaria da Saúde / Rua General Jardim, 36', '(11) 3397-2000'),
    '6016': ('SME', 'Secretaria Municipal de Educação (DRE/Escolas)', 'Rua Borges Vieira, 403', '(11) 3396-0600'),
    '6013': ('SMSUB', 'Secretaria Municipal das Subprefeituras', 'Rua São Bento, 405', '(11) 3113-8000'),
    '6029': ('SMSU', 'Secretaria Municipal de Segurança Urbana (GCM)', 'Rua da Consolação, 1379', '(11) 3124-5100'),
    '6012': ('SF', 'Secretaria Municipal da Fazenda', 'Viaduto do Chá, 15', '(11) 3396-1000'),
    '6014': ('SEHAB', 'Secretaria Municipal de Habitação', 'Rua São Bento, 405', '(11) 3243-1500'),
    '6021': ('SMDET', 'Secretaria de Desenvolvimento Econômico e Trabalho', 'Av. São João, 473', '(11) 3224-6000'),
    '6025': ('SVMA', 'Secretaria do Verde e Meio Ambiente', 'Rua do Paraíso, 387', '(11) 5187-0100'),
    '6010': ('SGM', 'Secretaria de Governo Municipal', 'Edifício Matarazzo / Viaduto do Chá, 15', '(11) 3113-8000'),
    '6017': ('SF-CIF', 'Secretaria da Fazenda - Cadastro Imobiliário Fiscal', 'Vale do Anhangabaú', '(11) 3396-1000'),
    '7410': ('SPTrans', 'São Paulo Transporte S/A', 'Rua Boa Vista, 236', '(11) 3396-6800'),
}

def mascarar_nome(nome):
    partes = [p for p in str(nome).split() if p]
    if not partes:
        return ''
    if len(partes) == 1:
        return partes[0][:2] + '***'
    return partes[0][:2] + '*** ' + ' '.join(partes[1:])

def main():
    print("=" * 80)
    print("MINERAÇÃO OSINT DE SERVIDORES PÚBLICOS E PROCESSOS SEI (PMSP)")
    print("=" * 80)

    if not MASTER_CSV.exists() or not DOC_CACHE_JSON.exists():
        print("Erro: Planilha mestre ou doc_contemplados_cache.json não encontrados.")
        return

    df_m = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    with open(DOC_CACHE_JSON, 'r', encoding='utf-8') as f:
        doc_cache = json.load(f)

    # Identificar motoristas sem telefone ou contemplados
    sem_tel = df_m[df_m['Telefone_Celular_1'].fillna('').str.strip() == ''].copy()
    print(f"Total sem telefone analisados: {len(sem_tel):,}")

    rows_found = []
    seen = set()

    for _, r in sem_tel.iterrows():
        did = r['ID_Master']
        nm = r['Nome_Completo']
        st = r['Status_Sorteio_2026']
        ed = r['Edital_Numero']
        despachos = doc_cache.get(nm, [])

        if not despachos:
            continue

        for d in despachos:
            sei = str(d.get('processo_sei', '')).strip()
            if not sei or sei == 'nan':
                continue

            pref = sei[:4] if len(sei) >= 4 else ""
            sigla, orgao_nome, end_inst, tel_inst = SEI_ORGAOS.get(pref, ('PMSP', f'Órgão Municipal ({pref})', 'Prefeitura de São Paulo', '(11) 3397-3000'))

            row_key = (did, sei)
            if row_key in seen:
                continue
            seen.add(row_key)

            assunto = d.get('assunto', '')
            data_pub = d.get('data_publicacao', '')
            doc_url = d.get('doc_url', '')

            # Classificar tipo de vínculo
            if 'alvará de estacionamento - transferência' in assunto.lower():
                tipo_vinculo = "Taxista em Processo de Transferência no DTP"
            elif 'recurso' in assunto.lower() or 'multa' in assunto.lower():
                tipo_vinculo = "Taxista com Recurso de Trânsito no DTP"
            elif sigla in ['SMS', 'SME', 'SMSU', 'SMSUB', 'SF', 'SPTrans']:
                tipo_vinculo = f"Servidor Público / Vínculo Municipal ({sigla})"
            else:
                tipo_vinculo = f"Cidadão com Processo Administrativo Municipal ({sigla})"

            rows_found.append({
                'ID_Master': did,
                'Nome_Completo': nm,
                'Status_Sorteio_2026': st,
                'Edital_Numero': ed,
                'Processo_SEI': sei,
                'Orgao_Sigla': sigla,
                'Orgao_Nome_Completo': orgao_nome,
                'Tipo_Vinculo_Identificado': tipo_vinculo,
                'Assunto_Processo': assunto,
                'Data_Publicacao_DOC': data_pub,
                'Telefone_Institucional_Orgao': tel_inst,
                'Endereco_Institucional_Orgao': end_inst,
                'Link_Publicacao_DOC': doc_url,
                'Link_Consulta_SEI': f"https://processos.prefeitura.sp.gov.br/Forms/consultarProcessos.aspx?txtNumProcesso={sei}"
            })

    df_out = pd.DataFrame(rows_found)
    print(f"\nTotal de registros OSINT mapeados: {len(df_out):,}")
    print(f"Total de motoristas únicos sem telefone com SEI: {df_out['ID_Master'].nunique():,}")
    contemp_count = df_out[df_out['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False)]['ID_Master'].nunique()
    print(f"Sendo {contemp_count:,} Contemplados Titulares!")

    # Exportar interno
    df_out.to_csv(OUT_CSV, sep=';', index=False, encoding='utf-8-sig')
    print(f"Salvo: {OUT_CSV}")

    # Exportar público LGPD
    df_pub = df_out.copy()
    df_pub['Nome_Completo'] = df_pub['Nome_Completo'].apply(mascarar_nome)
    df_pub.to_csv(OUT_PUBLIC_CSV, sep=';', index=False, encoding='utf-8-sig')
    print(f"Salvo (Público LGPD): {OUT_PUBLIC_CSV}")

    print("\nDistribuição por Órgão / Vínculo Municipal:")
    print(df_out['Orgao_Sigla'].value_counts().to_string())

if __name__ == '__main__':
    main()
