# -*- coding: utf-8 -*-
"""
scripts/enrich_nacional_receita.py
Enriquecimento Nacional via Receita Federal (MEI e QSA em todos os estados do Brasil)
para os 5.426 taxistas de São Paulo que ainda permanecem sem contato telefônico.

Recupera contatos de taxistas da capital que possuem CNPJ (MEI ou Sociedade)
registrado em outras unidades federativas (MG, RJ, PR, SC, RS, GO, DF, BA, etc.).
"""

import argparse
import concurrent.futures
import csv
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request
import zipfile
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MASTER_CSV = BASE_DIR / "planilha_mestre_taxistas_sp_2026.csv"
WORKDIR = Path(os.environ.get('TEMP', '.')) / 'cnpj_rfb_nacional'

MIRROR = 'https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos'
USER_AGENT = 'Mapeamento-TaxiSP/1.0 (projeto de dados publicos; contato: locally)'

SITUACAO = {
    '01': 'Nula', '02': 'Ativa', '03': 'Suspensa', '04': 'Inapta',
    '05': 'Vencida', '06': 'Cancelada', '07': 'InSituacaoEspecial',
    '08': 'Baixada', '09': 'EmVencimento', '10': 'EmInSituacaoEspecial',
    '11': 'InativoEmIra', '12': 'InativoPorEmissaoDeclaracao',
    '13': 'InativoPorEmissaoDeclaracao', '14': 'InativoPorDecisaoJudicial',
    '99': 'SemInformacao',
}

VALID_BR_DDDS = {
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', 
    '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', 
    '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', 
    '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', 
    '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'
}


def normalize_and_format_phone(ddd_raw, tel_raw):
    d_raw = re.sub(r'\D+', '', str(ddd_raw or '')).strip()
    t = re.sub(r'\D+', '', str(tel_raw or '')).strip()
    
    if not t or len(t) < 7:
        return "", "", "Sem Telefone"

    if len(t) in (10, 11) and t[:2] in VALID_BR_DDDS:
        d = t[:2]
        local = t[2:]
    elif len(t) in (8, 9):
        local = t
        d = d_raw if d_raw in VALID_BR_DDDS else "11"
    elif len(t) in (12, 13) and t[:2] == '55' and t[2:4] in VALID_BR_DDDS:
        d = t[2:4]
        local = t[4:]
    else:
        d = d_raw if d_raw in VALID_BR_DDDS else "11"
        local = t

    if len(local) < 8 or len(set(local)) <= 1 or local.startswith('0000'):
        return "", "", "Sem Telefone"

    eh_celular = False
    if len(local) == 9 and local.startswith('9'):
        eh_celular = True
    elif len(local) == 8 and local[0] in '6789':
        local = '9' + local
        eh_celular = True

    if eh_celular and len(local) == 9:
        fmt = f"({d}) {local[:5]}-{local[5:]}"
        wpp = f"https://wa.me/55{d}{local}"
        tipo = "Celular (WhatsApp Provável)"
    elif len(local) == 8 and local[0] in '2345':
        fmt = f"({d}) {local[:4]}-{local[4:]}"
        wpp = ""
        tipo = "Fixo (Voz)"
    else:
        fmt = f"({d}) {local}"
        wpp = ""
        tipo = "Outro"

    return fmt, wpp, tipo


def format_cnpj(basico, ordem, dv):
    b = str(basico).zfill(8)
    o = str(ordem).zfill(4)
    d = str(dv).zfill(2)
    return f"{b[:2]}.{b[2:5]}.{b[5:8]}/{o}-{d}"


def baixar_stream(url, destino):
    destino = Path(destino)
    if destino.exists() and destino.stat().st_size > 0:
        print(f'     Arquivo já existe em disco ({destino.stat().st_size / 1024 / 1024:.1f} MB), pulando download.')
        return destino
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    tmp = destino.with_suffix('.tmp')
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            cl = int(resp.headers.get('content-length', 0))
            accept_ranges = resp.headers.get('accept-ranges', '')
        
        if cl > 20 * 1024 * 1024 and 'bytes' in accept_ranges.lower():
            num_workers = 6
            chunk_size = cl // num_workers
            ranges = []
            for i in range(num_workers):
                st = i * chunk_size
                en = (i + 1) * chunk_size - 1 if i < num_workers - 1 else cl - 1
                ranges.append((st, en))
            
            with open(tmp, 'wb') as fh:
                fh.truncate(cl)
            
            def download_chunk(rng):
                st, en = rng
                r = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Range': f'bytes={st}-{en}'})
                with urllib.request.urlopen(r, timeout=120) as r_resp:
                    with open(tmp, 'r+b') as fh:
                        fh.seek(st)
                        while True:
                            b = r_resp.read(1024 * 1024)
                            if not b:
                                break
                            fh.write(b)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as ex:
                list(ex.map(download_chunk, ranges))
                
            tmp.rename(destino)
            return destino
    except Exception as e:
        print(f'     Fallback para download sequencial ({e})')
        if tmp.exists():
            try:
                os.remove(tmp)
            except Exception:
                pass

    with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, 'wb') as fh:
        bloco = 1024 * 1024
        while True:
            pedaco = resp.read(bloco)
            if not pedaco:
                break
            fh.write(pedaco)
    tmp.rename(destino)
    return destino


def abrir_zip(path):
    zf = zipfile.ZipFile(path)
    return zf, zf.open(zf.namelist()[0])


def dividir(bline):
    campos = bline.rstrip(b'\r\n').decode('latin-1').split(';')
    return [c[1:-1] if len(c) >= 2 and c[0] == '"' and c[-1] == '"' else c for c in campos]


def main():
    print("=" * 80)
    print("MINERAÇÃO NACIONAL DA RECEITA FEDERAL (TODOS OS ESTADOS - MEI E QSA)")
    print("=" * 80)

    WORKDIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    corte = '2026-09-14'
    url_base = f'{MIRROR}/{corte}/'

    # 1. Identificar os motoristas sem telefone na Planilha Mestre
    df_m = pd.read_csv(MASTER_CSV, sep=';', low_memory=False)
    sem_tel = df_m[df_m['WhatsApp_Ativo'] == 'Não verificado'].copy()
    sem_tel_ids = set(sem_tel['ID_Master'].dropna())
    print(f"Total de motoristas alvo sem telefone na Planilha Mestre: {len(sem_tel_ids):,}")

    # 2. Carregar caches existentes de MEI Geral e Sócios
    mei_cache_path = Path(os.environ.get('TEMP', '.')) / 'cnpj_rfb_geral' / 'matched_basicos_cache.json'
    soc_cache_path = Path(os.environ.get('TEMP', '.')) / 'cnpj_rfb_socios' / 'matched_socios_cache.json'

    target_cnpjs = {}
    covered_drivers = set()

    if mei_cache_path.exists():
        with open(mei_cache_path, 'r', encoding='utf-8') as f:
            meis = json.load(f)
        for c, info in meis.items():
            for d in info['drivers']:
                mid = d['id_master']
                if mid in sem_tel_ids:
                    covered_drivers.add(mid)
                    target_cnpjs.setdefault(c, []).append({
                        'id_master': mid,
                        'nome': d['nome_completo'],
                        'origem': 'MEI Nacional',
                        'razao_social': info['razao_social'],
                        'qualificacao': 'Empresário Individual (MEI)'
                    })
        print(f"  -> Cache MEI carregado: {len(meis):,} empresas.")

    if soc_cache_path.exists():
        with open(soc_cache_path, 'r', encoding='utf-8') as f:
            socios = json.load(f)
        for c, recs in socios.items():
            for r in recs:
                mid = r['id_master']
                if mid in sem_tel_ids:
                    covered_drivers.add(mid)
                    target_cnpjs.setdefault(c, []).append({
                        'id_master': mid,
                        'nome': r['nome_motorista'],
                        'origem': 'Sócio Nacional',
                        'razao_social': r.get('nome_socio_rf', ''),
                        'qualificacao': r.get('qualificacao_desc', 'Sócio')
                    })
        print(f"  -> Cache Sócios carregado: {len(socios):,} empresas.")

    print(f"  -> Total de motoristas alvo no escopo nacional: {len(covered_drivers):,}")
    print(f"  -> CNPJs Básicos únicos a varrer em Estabelecimentos: {len(target_cnpjs):,}")

    if not target_cnpjs:
        print("Nenhum CNPJ alvo pendente.")
        return

    # Pré-codifica CNPJs Básicos para busca ultrarrápida em bytes
    target_cnpjs_bytes = {k.encode('ascii'): v for k, v in target_cnpjs.items()}

    # 3. Cruzar com Estabelecimentos em ÂMBITO NACIONAL (todos os estados)
    print("\nVarrendo partições de Estabelecimentos (Brasil Inteiro)...")
    checkpoint_path = WORKDIR / 'nacional_matches_checkpoint.json'
    nacional_matches = {}
    if checkpoint_path.exists():
        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                nacional_matches = json.load(f)
            print(f"  -> Checkpoint recuperado: {len(nacional_matches):,} motoristas com contatos.")
        except Exception:
            pass

    t0_all = time.time()
    for idx in range(10):
        nome_zip = f'Estabelecimentos{idx}.zip'
        url_zip = f'{url_base}{nome_zip}'
        destino_zip = WORKDIR / nome_zip

        print(f'  -> [{idx+1}/10] Baixando e processando {nome_zip}...')
        t_part = time.time()
        baixar_stream(url_zip, destino_zip)

        zf, stream = abrir_zip(destino_zip)
        lidos = 0
        matches_part = 0
        try:
            for raw_line in stream:
                lidos += 1
                if len(raw_line) < 25:
                    continue

                # Filtro O(1) em bytes no CNPJ Básico (coluna 0)
                cand_base = raw_line[1:9]
                if cand_base not in target_cnpjs_bytes:
                    continue

                cols = dividir(raw_line)
                if len(cols) < 25:
                    continue

                base_cand = cols[0].strip().zfill(8)
                if base_cand not in target_cnpjs:
                    continue

                uf = cols[19].strip().upper()
                ordem = cols[1].strip()
                dv = cols[2].strip()
                cnpj_fmt = format_cnpj(base_cand, ordem, dv)
                matriz_filial = 'Matriz' if cols[3].strip() == '1' else 'Filial'
                nome_fantasia = cols[4].strip()
                sit_cod = cols[5].strip()
                sit_desc = SITUACAO.get(sit_cod, f'Cod {sit_cod}')
                data_inicio = cols[10].strip()
                cnae = cols[11].strip()

                logr = f"{cols[13].strip()} {cols[14].strip()}".strip()
                numero = cols[15].strip()
                compl = cols[16].strip()
                bairro = cols[17].strip()
                cep = cols[18].strip()
                municipio = cols[20].strip()
                ddd1 = cols[21].strip()
                tel1 = cols[22].strip()
                ddd2 = cols[23].strip()
                tel2 = cols[24].strip()
                email = cols[27].strip()

                fmt1, wpp1, tipo1 = normalize_and_format_phone(ddd1, tel1)
                fmt2, wpp2, tipo2 = normalize_and_format_phone(ddd2, tel2)

                # Prioriza celular se t2 for celular e t1 for fixo
                if not tipo1.startswith('Celular') and tipo2.startswith('Celular'):
                    fmt1, fmt2 = fmt2, fmt1
                    wpp1, wpp2 = wpp2, wpp1
                    tipo1, tipo2 = tipo2, tipo1

                if not fmt1 and not fmt2:
                    continue

                driver_list = target_cnpjs[base_cand]
                for d_info in driver_list:
                    mid = d_info['id_master']
                    rec = {
                        'ID_Master': mid,
                        'Nome_Motorista': d_info['nome'],
                        'Origem_Cadastro': d_info['origem'],
                        'Empresa_CNPJ': cnpj_fmt,
                        'Empresa_Tipo': matriz_filial,
                        'Empresa_Nome_Fantasia': nome_fantasia or d_info['razao_social'],
                        'Socio_Qualificacao': d_info['qualificacao'],
                        'Empresa_Situacao_Cadastral': sit_desc,
                        'Empresa_Data_Inicio': data_inicio,
                        'Empresa_CNAE': cnae,
                        'Empresa_Logradouro': logr,
                        'Empresa_Numero': numero,
                        'Empresa_Complemento': compl,
                        'Empresa_Bairro': bairro,
                        'Empresa_CEP': cep,
                        'Empresa_Municipio': municipio,
                        'Empresa_UF': uf,
                        'Telefone_Principal': fmt1,
                        'Telefone_Secundario': fmt2,
                        'Tipo_Telefone': tipo1 if fmt1 else tipo2,
                        'Link_WhatsApp': wpp1 if wpp1 else wpp2,
                        'Email': email
                    }

                    existing = nacional_matches.get(mid)
                    if existing is None:
                        nacional_matches[mid] = rec
                        matches_part += 1
                    else:
                        prev_eh_cel = existing['Tipo_Telefone'].startswith('Celular')
                        novo_eh_cel = rec['Tipo_Telefone'].startswith('Celular')
                        if not prev_eh_cel and novo_eh_cel:
                            nacional_matches[mid] = rec
                        elif existing['Empresa_Situacao_Cadastral'] != 'Ativa' and sit_desc == 'Ativa':
                            nacional_matches[mid] = rec
        finally:
            try:
                stream.close()
                zf.close()
            except Exception:
                pass
            try:
                if destino_zip.exists():
                    os.remove(destino_zip)
            except Exception as e:
                print(f'     Aviso: remoção de {destino_zip.name} diferida: {e}')

        try:
            with open(checkpoint_path, 'w', encoding='utf-8') as f:
                json.dump(nacional_matches, f, ensure_ascii=False)
        except Exception:
            pass

        print(f'     Lidos: {lidos:,} | Motoristas únicos acumulados: {len(nacional_matches):,} ({time.time() - t_part:.1f}s)')

    print(f"\nVarredura nacional finalizada em {time.time() - t0_all:.1f}s!")
    out_df = pd.DataFrame(list(nacional_matches.values()))
    if len(out_df) == 0:
        print("Nenhum contato localizado.")
        return

    # Salva privado
    out_csv = DATA_DIR / 'nacional_taxistas_enriquecidos.csv'
    out_df.to_csv(out_csv, sep=';', index=False, encoding='utf-8-sig')
    print(f"-> Base Completa salva: {out_csv} ({len(out_df):,} motoristas)")

    # Salva publico
    out_pub = DATA_DIR / 'nacional_taxistas_enriquecidos_publico.csv'
    pub_cols = [
        'ID_Master', 'Nome_Motorista', 'Origem_Cadastro', 'Empresa_CNPJ',
        'Empresa_Tipo', 'Socio_Qualificacao', 'Empresa_Situacao_Cadastral',
        'Empresa_Data_Inicio', 'Empresa_CNAE', 'Empresa_Municipio', 'Empresa_UF'
    ]
    pub_df = out_df[[c for c in pub_cols if c in out_df.columns]].copy()
    pub_df.to_csv(out_pub, sep=';', index=False, encoding='utf-8-sig')
    print(f"-> Versão Pública salva: {out_pub} ({len(pub_df):,} registros)")

    # Relatório
    wpp_count = out_df['Tipo_Telefone'].str.startswith('Celular').sum()
    fixo_count = out_df['Tipo_Telefone'].str.startswith('Fixo').sum()
    print("=" * 80)
    print("RELATÓRIO DE ENRIQUECIMENTO NACIONAL DA RECEITA FEDERAL")
    print("=" * 80)
    print(f"Total de Motoristas Resgatados: {len(out_df):,}")
    print(f"  -> Celular / WhatsApp: {wpp_count:,}")
    print(f"  -> Telefone Fixo: {fixo_count:,}")
    print("=" * 80)


if __name__ == '__main__':
    main()
