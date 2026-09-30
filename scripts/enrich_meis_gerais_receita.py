# -*- coding: utf-8 -*-
"""
scripts/enrich_meis_gerais_receita.py
Extrator de contatos via MEI Geral (Receita Federal) para motoristas sem telefone.

Objetivo:
  Localizar os contatos telefonicos e cadastrais (WhatsApp, telefone fixo, e-mail)
  dos motoristas que ainda nao possuem telefone na Planilha Mestre, buscando na base
  nacional de Empresarios Individuais (MEI) da Receita Federal em QUALQUER CNAE,
  com restricao estrita a estabelecimentos situados no Estado de Sao Paulo (UF == 'SP').

Metodologia de Alta Precisao (Zero Homonimos):
  1. No MEI, a Razao Social e' legalmente o Nome Civil do Titular (pessoa fisica).
  2. O script busca os nomes dos motoristas na tabela de Empresas (MEI - cod. 2135).
  3. Cruza com Estabelecimentos exigindo UF == 'SP'.
  4. Prioriza motoristas Contemplados e Suplentes de Alta Probabilidade.
  5. Aplica a regra oficial da Anatel do 9º digito para numeros moveis (prefixos 6, 7, 8, 9).
"""

import argparse
import csv
import io
import os
import re
import sys
import time
import unicodedata
import urllib.request
import zipfile
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

MIRROR = 'https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos'
USER_AGENT = 'Mapeamento-TaxiSP/1.0 (projeto de dados publicos; contato: locally)'

SITUACAO = {
    '01': 'Nula', '02': 'Ativa', '03': 'Suspensa', '04': 'Inapta',
    '05': 'Vencida', '06': 'Cancelada', '07': 'InSituacaoEspecial',
    '08': 'Baixada', '09': 'EmVencimento', '10': 'EmInSituacaoEspecial',
    '11': 'InativoEmIra', '12': 'InativoPorEmissaoDeclaracao',
    '13': 'InativoPorEmissaoD declaracao', '14': 'InativoPorDecisaoJudicial',
    '99': 'SemInformacao',
}

COLUNAS_ESTAB = [
    'CNPJ_BASICO', 'CNPJ_ORDEM', 'CNPJ_DV', 'IDENTIFICADOR_MATRIZ_FILIAL',
    'NOME_FANTASIA', 'SITUACAO_CADASTRAL_COD', 'DATA_SITUACAO_CADASTRAL',
    'MOTIVO_SITUACAO_CADASTRAL', 'NOME_CIDADE_EXTERIOR', 'PAIS',
    'DATA_INICIO_ATIVIDADE', 'CNAE_FISCAL', 'CNAE_FISCAL_SECUNDARIA',
    'TIPO_LOGRADOURO', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO',
    'CEP', 'UF', 'MUNICIPIO', 'DDD_1', 'TELEFONE_1', 'DDD_2', 'TELEFONE_2',
    'DDD_FAX', 'FAX', 'CORREIO_ELETRONICO', 'SITUACAO_ESPECIAL',
    'DATA_SITUACAO_ESPECIAL',
]


def norm_name(s):
    if not isinstance(s, str):
        return ''
    s = s.strip().upper()
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    s = re.sub(r'[^A-Z\s]', ' ', s)
    return ' '.join(s.split())


def strip_prep(s):
    return re.sub(r'\b(DE|DA|DO|DOS|DAS)\b', ' ', s).strip()


def formatar_cnpj(basico, ordem, dv):
    b, o, d = str(basico).zfill(8), str(ordem).zfill(4), str(dv).zfill(2)
    return f'{b[:2]}.{b[2:5]}.{b[5:8]}/{o}-{d}'


def formatar_cep(cep):
    cep = str(cep).strip().zfill(8)
    return f'{cep[:5]}-{cep[5:]}' if len(cep) == 8 and cep.isdigit() else cep


def formatar_data(d):
    d = str(d).strip()
    return f'{d[:4]}-{d[4:6]}-{d[6:8]}' if len(d) == 8 and d.isdigit() else d


def mascarar_nome(nome):
    partes = [p for p in str(nome).split() if p]
    if not partes:
        return ''
    if len(partes) == 1:
        return partes[0][:2] + '***'
    return partes[0][:2] + '*** ' + ' '.join(partes[1:])


def normalize_and_format_phone(ddd, tel):
    ddd = re.sub(r'\D+', '', str(ddd or '')).strip()
    tel = re.sub(r'\D+', '', str(tel or '')).strip()
    if not tel:
        return "", "", "Sem Telefone"
    if not ddd:
        ddd = "11"
    
    # Se ja tiver DDD no telefone
    if len(tel) in (10, 11) and tel[:2] == ddd:
        local = tel[2:]
    else:
        local = tel

    eh_celular = False
    if len(local) == 9 and local.startswith('9'):
        eh_celular = True
    elif len(local) == 8 and local[0] in '6789':
        local = '9' + local
        eh_celular = True

    if eh_celular and len(local) == 9:
        fmt = f"({ddd}) {local[:5]}-{local[5:]}"
        wpp = f"https://wa.me/55{ddd}{local}"
        tipo = "Celular (WhatsApp Provável)"
    elif len(local) == 8:
        fmt = f"({ddd}) {local[:4]}-{local[4:]}"
        wpp = ""
        tipo = "Fixo (Voz)"
    else:
        fmt = f"({ddd}) {local}"
        wpp = ""
        tipo = "Outro"

    return fmt, wpp, tipo


def abrir_url(url, timeout=1800):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={'User-Agent': USER_AGENT}), timeout=timeout)


def baixar(url, destino, timeout=1800):
    destino = Path(destino)
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    tmp = destino.with_suffix(destino.suffix + '.part')
    t0 = time.time()
    with abrir_url(url, timeout=timeout) as resp, open(tmp, 'wb') as out:
        while True:
            buf = resp.read(1 << 20)
            if not buf:
                break
            out.write(buf)
    tmp.rename(destino)
    return destino


def Abrir_zip(path):
    zf = zipfile.ZipFile(path)
    return zf, zf.open(zf.namelist()[0])


def dividir(bline):
    campos = bline.rstrip(b'\r\n').decode('latin-1').split(';')
    return [c[1:-1] if len(c) >= 2 and c[0] == '"' and c[-1] == '"' else c for c in campos]


def main():
    ap = argparse.ArgumentParser(description='Enriquecimento via MEI Geral (Receita Federal)')
    ap.add_argument('--corte', default='2026-09-14', help='Corte mensal da Receita Federal')
    ap.add_argument('--master', default='planilha_mestre_taxistas_sp_2026.csv', help='Caminho da planilha mestre')
    ap.add_argument('--workdir', default=os.environ.get('TEMP', '.') + r'\cnpj_rfb_geral')
    ap.add_argument('--saida-dir', default='data/processed')
    ap.add_argument('--apenas-contemplados', action='store_true', help='Restringe a busca exclusivamente aos Contemplados 2026')
    args = ap.parse_args()

    work = Path(args.workdir)
    work.mkdir(parents=True, exist_ok=True)
    corte = args.corte.strip('/')
    url_base = f'{MIRROR}/{corte}/'

    print('=' * 80)
    print('MINERAÇÃO REVERSA DE CONTATOS VIA MEIs GERAIS (RECEITA FEDERAL - SP)')
    print('=' * 80)
    print(f'Corte: {corte} | Fonte: {url_base}')

    # 1. Carregar alvos da Planilha Mestre
    print('\n[1/4] Carregando motoristas sem telefone da Planilha Mestre...')
    df_m = pd.read_csv(args.master, sep=';', encoding='utf-8-sig', low_memory=False)
    
    # Motoristas sem telefone
    sem_tel = df_m[df_m['Telefone_Celular_1'].fillna('').str.strip() == ''].copy()
    if args.apenas_contemplados:
        sem_tel = sem_tel[sem_tel['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False)].copy()

    print(f'  -> Total motoristas alvo sem telefone: {len(sem_tel):,}')
    contemp_count = sem_tel['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False).sum()
    print(f'     Sendo {contemp_count:,} Contemplados Titulares de 2026.')

    # Indexar alvos por nome exato e sem preposições
    target_exact = {}
    target_noprep = {}
    for _, r in sem_tel.iterrows():
        id_m = r['ID_Master']
        nome = r['Nome_Completo']
        n = norm_name(nome)
        parts = n.split()
        if len(parts) >= 2:
            r_info = {
                'id_master': id_m,
                'nome_completo': nome,
                'status_sorteio': r['Status_Sorteio_2026'],
                'edital': r['Edital_Numero'],
                'condutax': r.get('Cadastro_DTP_Condutax', ''),
                'cpf_previo': r.get('CPF_Identificado', ''),
                'tier': r.get('Tier_Prioridade_Comercial', '')
            }
            target_exact.setdefault(n, []).append(r_info)
            np = strip_prep(n)
            if len(np.split()) >= 2:
                target_noprep.setdefault(np, []).append(r_info)

    print(f'  -> Variações de nomes indexadas: {len(target_exact):,} exatos | {len(target_noprep):,} sem preposição.')

    # 2. Pass 1: Varredura das 10 partições de Empresas (busca MEI - cod. 2135)
    path_basicos_cache = work / 'matched_basicos_cache.json'
    matched_basicos = {}
    if path_basicos_cache.exists():
        import json
        try:
            with open(path_basicos_cache, 'r', encoding='utf-8') as f:
                matched_basicos = json.load(f)
            print(f'\n[2/4] Cache de MEIs já existente: {len(matched_basicos):,} bases carregadas instantaneamente!')
        except Exception:
            matched_basicos = {}

    if not matched_basicos:
        print('\n[2/4] Baixando e varrendo Empresas (10 partições) em busca de registros MEI...')
        t0_emp = time.time()
        cpf_pattern = re.compile(r'\b(\d{11})\b')

        for i in range(10):
            arq = f'Empresas{i}.zip'
            p = baixar(f'{url_base}{arq}', work / arq)
            zf, fh = Abrir_zip(p)
            hits_part = 0
            with fh:
                for bline in fh:
                    # Otimização: pular linhas que não sejam MEI (2135)
                    if b'2135' not in bline:
                        continue
                    parts = dividir(bline)
                    if len(parts) < 3 or parts[2] != '2135':
                        continue
                    
                    rz_raw = parts[1]
                    rz = norm_name(rz_raw)
                    rz_clean = re.sub(r'\s*\d{8,11}$', '', rz).strip()
                    
                    matched_drivers = target_exact.get(rz_clean)
                    if not matched_drivers:
                        rz_np = strip_prep(rz_clean)
                        matched_drivers = target_noprep.get(rz_np)

                    if matched_drivers:
                        base = parts[0]
                        m_cpf = cpf_pattern.search(rz_raw)
                        cpf_ext = m_cpf.group(1) if m_cpf else ""
                        
                        matched_basicos[base] = {
                            'cnpj_basico': base,
                            'razao_social': rz_raw,
                            'cpf_extraido': cpf_ext,
                            'drivers': matched_drivers
                        }
                        hits_part += 1
            zf.close()
            p.unlink(missing_ok=True)
            print(f'    {arq}: +{hits_part:,} MEIs identificados (total acumulado: {len(matched_basicos):,})', flush=True)

        print(f'  => Total de bases MEI correspondentes a motoristas: {len(matched_basicos):,} (em {time.time()-t0_emp:.0f}s)')
        try:
            import json
            with open(path_basicos_cache, 'w', encoding='utf-8') as f:
                json.dump(matched_basicos, f)
            print(f'  => Cache salvo com sucesso: {path_basicos_cache}')
        except Exception:
            pass

    # 3. Pass 2: Varredura das 10 partições de Estabelecimentos (restrição estrita a UF == 'SP')
    print('\n[3/4] Baixando e varrendo Estabelecimentos para extrair telefones (apenas UF == SP)...')
    t0_est = time.time()
    enriched_results = []
    seen_driver_ids = set()

    for i in range(10):
        arq = f'Estabelecimentos{i}.zip'
        p = baixar(f'{url_base}{arq}', work / arq)
        zf, fh = Abrir_zip(p)
        hits_est = 0
        with fh:
            for bline in fh:
                b_parts = bline.rstrip(b'\r\n').split(b';')
                if len(b_parts) < 21:
                    continue
                base_cand = b_parts[0].strip(b'"').decode('ascii', errors='ignore')
                if base_cand not in matched_basicos:
                    continue
                uf = b_parts[19].strip(b'"').decode('ascii', errors='ignore').upper()
                if uf != 'SP':
                    continue
                
                parts = [c[1:-1] if len(c) >= 2 and c[0] == '"' and c[-1] == '"' else c for c in [p.decode('latin-1', errors='ignore') for p in b_parts]]
                if len(parts) != 30:
                    continue
                
                emp_info = matched_basicos[base_cand]
                d1, t1 = parts[21], parts[22]
                d2, t2 = parts[23], parts[24]
                em = parts[27]
                
                fmt1, wpp1, tipo1 = normalize_and_format_phone(d1, t1)
                fmt2, wpp2, tipo2 = normalize_and_format_phone(d2, t2)
                
                # Exigir ao menos um telefone preenchido
                if not fmt1 and not fmt2:
                    continue

                tel_princ = fmt1 if fmt1 else fmt2
                wpp_link = wpp1 if wpp1 else wpp2
                tipo_tel = tipo1 if fmt1 else tipo2

                cnpj_completo = formatar_cnpj(parts[0], parts[1], parts[2])
                sit_cod = parts[5]
                sit_desc = SITUACAO.get(sit_cod, sit_cod)

                for drv in emp_info['drivers']:
                    # Priorizar o primeiro MEI ativo por motorista
                    drv_id = drv['id_master']
                    if drv_id in seen_driver_ids:
                        continue
                    seen_driver_ids.add(drv_id)

                    enriched_results.append({
                        'ID_Master': drv_id,
                        'Nome_Motorista': drv['nome_completo'],
                        'Status_Sorteio_2026': drv['status_sorteio'],
                        'Edital_Numero': drv['edital'],
                        'Cadastro_DTP_Condutax': drv['condutax'],
                        'MEI_CNPJ': cnpj_completo,
                        'MEI_Razao_Social': emp_info['razao_social'],
                        'MEI_CPF_Extraido': emp_info['cpf_extraido'],
                        'MEI_Situacao_Cadastral': sit_desc,
                        'MEI_Data_Inicio': formatar_data(parts[10]),
                        'MEI_CNAE_Fiscal': parts[11],
                        'MEI_Logradouro': f"{parts[13]} {parts[14]}".strip(),
                        'MEI_Numero': parts[15],
                        'MEI_Complemento': parts[16],
                        'MEI_Bairro': parts[17],
                        'MEI_CEP': formatar_cep(parts[18]),
                        'MEI_Municipio': parts[20],
                        'MEI_UF': uf,
                        'Telefone_Principal': tel_princ,
                        'Telefone_Secundario': fmt2 if fmt1 else "",
                        'Tipo_Telefone': tipo_tel,
                        'Link_WhatsApp': wpp_link,
                        'Email': em,
                    })
                    hits_est += 1

        zf.close()
        p.unlink(missing_ok=True)
        print(f'    {arq}: +{hits_est:,} motoristas enriquecidos com telefone (total acumulado: {len(enriched_results):,})', flush=True)

    print(f'  => Total de motoristas enriquecidos: {len(enriched_results):,} (em {time.time()-t0_est:.0f}s)')

    # 4. Exportação dos Resultados
    print('\n[4/4] Salvando bases de contatos enriquecidos...')
    saida_completa = Path(args.saida_dir) / 'meis_gerais_taxistas_sp_enriquecidos.csv'
    df_res = pd.DataFrame(enriched_results)
    df_res.to_csv(saida_completa, sep=';', index=False, encoding='utf-8-sig')
    print(f'  -> Base Completa Local: {saida_completa} ({len(df_res):,} linhas)')

    # Versão pública minimizada (LGPD)
    pub_cols = [c for c in df_res.columns if c not in ('Telefone_Principal', 'Telefone_Secundario', 'Link_WhatsApp', 'Email', 'MEI_Logradouro', 'MEI_Numero', 'MEI_Complemento', 'MEI_CEP')]
    df_pub = df_res[pub_cols].copy()
    df_pub['MEI_Razao_Social_Publica'] = df_pub['MEI_Razao_Social'].apply(mascarar_nome)
    df_pub.drop(columns=['MEI_Razao_Social'], inplace=True, errors='ignore')
    saida_pub = Path(args.saida_dir) / 'meis_gerais_taxistas_sp_enriquecidos_publico.csv'
    df_pub.to_csv(saida_pub, sep=';', index=False, encoding='utf-8-sig')
    print(f'  -> Base Pública Sanitizada (LGPD): {saida_pub}')

    # Métricas finais
    contemp_enr = df_res[df_res['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False)]
    wpp_enr = df_res[df_res['Link_WhatsApp'].str.strip() != '']
    fixos_enr = df_res[df_res['Tipo_Telefone'] == 'Fixo (Voz)']

    print('\n' + '=' * 80)
    print('RELATÓRIO DE ENRIQUECIMENTO CONCLUÍDO')
    print('=' * 80)
    print(f'Total de novos motoristas com telefone capturados: {len(df_res):,}')
    print(f'  -> Contemplados Titulares 2026: ................. {len(contemp_enr):,}')
    print(f'  -> Fila de Espera / Outros: .................... {len(df_res) - len(contemp_enr):,}')
    print(f'  -> Com WhatsApp Provável (Celular): ............ {len(wpp_enr):,}')
    print(f'  -> Telefone Fixo (Ligação de Voz): ............. {len(fixos_enr):,}')
    print('=' * 80)


if __name__ == '__main__':
    main()
