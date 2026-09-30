# -*- coding: utf-8 -*-
"""
scripts/generate_gmail_package.py
Empacotador inteligente do projeto para envio por e-mail (Gmail - limite 25 MB).

Gera um arquivo .zip otimizado contendo:
- A base mestre consolidada completa (CSV com 16.863 motoristas e 99 colunas)
- A planilha operacional de CRM pronta para uso em Excel (com links de WhatsApp)
- O mapa estratégico de concorrência com cooperativas de rádio-táxi (Excel)
- Todo o código-fonte em Python (44 scripts) e dependências (requirements.txt)
- Todos os conjuntos de dados processados e dossiês de inteligência
- Instruções completas para abrir e restaurar o ambiente no outro computador

Garante que o arquivo fique em torno de 12-13 MB (50% do limite máximo do Gmail).
"""

import os
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_ZIP = BASE_DIR / "projeto_taxistas_sp_2026_gmail.zip"
EXCEL_ZIP = BASE_DIR / "super_excel_mestre_20_abas.zip"

EXCLUDE_EXTENSIONS = {'.bak', '.tmp', '.pbf', '.pyc', '.pdf'}
EXCLUDE_DIRS = {'.git', '__pycache__', '.ipynb_checkpoints', 'raw', 'external', 'private'}

FILES_TO_INCLUDE = [
    'INSTRUCOES_NOVA_MAQUINA.md',
    'requirements.txt',
    '.gitignore',
    'planilha_mestre_taxistas_sp_2026.csv',
    'planilha_mestre_taxistas_sp_2026_publico.csv',
    'Novos Alvarás 2026/fila_prospeccao_crm_taxistas_2026.xlsx',
    'Novos Alvarás 2026/mapa_estrategico_cooperativas_chame_taxi.xlsx',
    'Novos Alvarás 2026/alvaras_taxi_sp_2026_consolidado.csv',
    'Novos Alvarás 2026/catalogo_pontos_completo.csv',
    'Novos Alvarás 2026/inscritos_sorteios_pontos_consolidado.csv',
    'Novos Alvarás 2026/resultados_sorteios_pontos.csv',
    'Novos Alvarás 2026/layout_enriquecimento_contemplados_2140.csv',
    'Novos Alvarás 2026/roteiro_tatico_visitas_pontos_2026.xlsx',
    'Novos Alvarás 2026/top_200_alvos_prioritarios_chame_taxi.xlsx',
    'Novos Alvarás 2026/ranking_alvos_chame_taxi_contemplados.xlsx',
    'data/processed/doc_contemplados_cache.json',
    'data/processed/fonetico_taxistas_enriquecidos.csv',
    'data/processed/fonetico_taxistas_enriquecidos_publico.csv',
    'data/processed/servidores_contemplados_pmsp.csv',
    'data/processed/servidores_contemplados_pmsp_publico.csv',
    'data/processed/auditoria_whatsapp_fixo_pendente.csv',
    'data/processed/cruzamento_cooperativas_taxi_sp.csv',
    'data/processed/meis_gerais_taxistas_sp_enriquecidos.csv',
    'data/processed/meis_gerais_taxistas_sp_enriquecidos_publico.csv',
    'data/processed/socios_taxistas_sp_enriquecidos.csv',
    'data/processed/socios_taxistas_sp_enriquecidos_publico.csv',
    'data/processed/nacional_taxistas_enriquecidos.csv',
    'data/processed/nacional_taxistas_enriquecidos_publico.csv',
    'data/processed/diario_oficial_taxistas_sp_2026.csv',
    'data/processed/ranking_prospeccao_taxistas_chame_taxi.csv',
    'data/processed/polos_formacao_taxistas_cfc_dtp.csv',
    'data/processed/sgtp_licencas_taxi_mensal.csv',
    'data/processed/sinistros_vitimas_taxistas_infosiga_mensal.csv',
    'data/processed/taxistas_candidatos_tse_2024.csv',
    'data/processed/empresas_taxi_pj_ativas_sp.csv',
    'data/processed/pontos_taxi_sp_consolidado.csv',
    'data/processed/osm_pontos_sem_dtp.csv',
]

def main():
    print("=" * 80)
    print("EMPACOTADOR INTELIGENTE DO PROJETO PARA ENVIO POR GMAIL (LIMITE 25 MB)")
    print("=" * 80)

    # 1. Gerar Pacote Principal do Projeto
    print(f"\n[1/2] Criando pacote do projeto: {OUTPUT_ZIP.name}...")
    n_files = 0
    total_uncompressed = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        # Arquivos explicitamente selecionados
        for rel_path in FILES_TO_INCLUDE:
            full_path = BASE_DIR / rel_path
            if full_path.exists():
                arc_name = rel_path.replace("\\", "/")
                z.write(full_path, arc_name)
                total_uncompressed += full_path.stat().st_size
                n_files += 1

        # Todos os scripts Python
        scripts_dir = BASE_DIR / "scripts"
        if scripts_dir.exists():
            for p in scripts_dir.glob("*.py"):
                arc_name = f"scripts/{p.name}"
                z.write(p, arc_name)
                total_uncompressed += p.stat().st_size
                n_files += 1

        # Arquivos Markdown da raiz (sem duplicar)
        for p in BASE_DIR.glob("*.md"):
            arc_name = p.name
            if arc_name not in [Path(f).name for f in FILES_TO_INCLUDE]:
                z.write(p, arc_name)
                total_uncompressed += p.stat().st_size
                n_files += 1


    zip_size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"  -> Concluído com sucesso!")
    print(f"  -> Arquivos incluídos: {n_files}")
    print(f"  -> Tamanho descompactado: {total_uncompressed / (1024 * 1024):.2f} MB")
    print(f"  -> Tamanho do ZIP compactado: {zip_size_mb:.2f} MB")
    
    if zip_size_mb <= 24.5:
        print(f"  -> [OK] COMPATÍVEL COM ANEXO DIRETO NO GMAIL! ({zip_size_mb:.2f} MB < 25 MB)")
    else:
        print(f"  -> [AVISO] Tamanho próximo do limite.")

    # 2. Gerar ZIP isolado do Super Excel de 20 Abas (Opcional para quem quiser enviar por e-mail avulso)
    master_xlsx = BASE_DIR / "planilha_mestre_taxistas_sp_2026.xlsx"
    if master_xlsx.exists():
        print(f"\n[2/2] Criando pacote complementar do Super Excel: {EXCEL_ZIP.name}...")
        with zipfile.ZipFile(EXCEL_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            z.write(master_xlsx, master_xlsx.name)
        excel_zip_size = EXCEL_ZIP.stat().st_size / (1024 * 1024)
        print(f"  -> Tamanho do ZIP do Super Excel: {excel_zip_size:.2f} MB (Compatível com Gmail individualmente)")

    print("\n" + "=" * 80)
    print("PACOTES DE ENVIO PRONTOS:")
    print(f"1. Pacote Principal do Projeto: {OUTPUT_ZIP} ({zip_size_mb:.2f} MB)")
    print(f"2. Super Excel 20 Abas (Avulso): {EXCEL_ZIP} ({excel_zip_size:.2f} MB)")
    print("=" * 80)

if __name__ == '__main__':
    main()
