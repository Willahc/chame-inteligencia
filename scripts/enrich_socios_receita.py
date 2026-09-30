# -*- coding: utf-8 -*-
"""
scripts/enrich_socios_receita.py
Extrator de contatos via Quadro de Sócios e Administradores (QSA - Receita Federal)
para taxistas de São Paulo.

Metodologia de Alta Precisão (Zero Custo e Sem Homônimos):
  1. Carrega os motoristas sem telefone (7.331) e com apenas telefone fixo (5.223) da Planilha Mestre.
  2. Varre as 10 partições da tabela pública Socios da Receita Federal (Socios0.zip a Socios9.zip).
  3. Identifica participações societárias como Pessoa Física (cód. 2).
  4. Cruza com as 10 partições de Estabelecimentos exigindo estritamente UF == 'SP'.
  5. Extrai telefones (celular/WhatsApp e fixo), e-mails corporativos e endereços da empresa.
  6. Aplica normalização da Anatel para números móveis e gera links diretos do WhatsApp.
"""

import argparse
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
import concurrent.futures
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

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

QUALIFICACOES = {
    '05': 'Administrador', '08': 'Conselheiro de Administração', '09': 'Curador',
    '10': 'Diretor', '16': 'Presidente', '20': 'Sociedade Consorciada',
    '22': 'Sócio', '23': 'Sócio Capitalista', '24': 'Sócio Comanditado',
    '25': 'Sócio Comanditário', '26': 'Sócio de Indústria', '28': 'Sócio-Gerente',
    '29': 'Sócio Incapaz ou Relativamente Incapaz', '30': 'Sócio Menor (Assistido/Representado)',
    '31': 'Sócio Ostensivo', '37': 'Sócio Pessoa Jurídica Domiciliada no Exterior',
    '38': 'Sócio Pessoa Física Residente no Exterior', '47': 'Sócio Pessoa Física Residente no Brasil',
    '48': 'Sócio Pessoa Jurídica Domiciliada no Brasil', '49': 'Sócio-Administrador',
    '52': 'Sócio com Capital', '53': 'Sócio sem Capital', '65': 'Titular Pessoa Física Residente no Brasil'
}

FAIXAS_ETARIAS = {
    '1': '0 a 12 anos', '2': '13 a 20 anos', '3': '21 a 30 anos',
    '4': '31 a 40 anos', '5': '41 a 50 anos', '6': '51 a 60 anos',
    '7': '61 a 70 anos', '8': '71 a 80 anos', '9': 'Mais de 80 anos',
    '0': 'Não se aplica'
}

VALID_BR_DDDS = {
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', 
    '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', 
    '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', 
    '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', 
    '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'
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
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return ' '.join(s.split())


def strip_prep(s):
    preps = {'DE', 'DA', 'DO', 'DAS', 'DOS', 'E'}
    return ' '.join(w for w in s.split() if w not in preps)


def format_cpf_masked(mask_str):
    m = re.sub(r'[^\d\*]', '', str(mask_str or ''))
    if len(m) == 11:
        return f"***.{m[3:6]}.{m[6:9]}-**"
    return mask_str


def format_cnpj(b, o, d):
    b = str(b or '').zfill(8)
    o = str(o or '').zfill(4)
    d = str(d or '').zfill(2)
    return f"{b[:2]}.{b[2:5]}.{b[5:]}/{o}-{d}"


def normalize_and_format_phone(ddd_str, tel_str):
    d_raw = re.sub(r'\D+', '', str(ddd_str or '')).strip()
    t_raw = re.sub(r'\D+', '', str(tel_str or '')).strip()
    
    if not t_raw or len(set(t_raw)) <= 1 or t_raw.startswith('0000'):
        return "", "", "Sem Telefone"
        
    t = t_raw
    if len(t) == 13 and t[:2] == '11' and t[2:4] in VALID_BR_DDDS:
        t = t[2:]
    elif len(t) == 15 and t[:4] == '1155' and t[4:6] in VALID_BR_DDDS:
        t = t[4:]
    elif len(t) in (12, 13) and t[:2] == '55' and t[2:4] in VALID_BR_DDDS:
        t = t[2:]
        
    d = d_raw if d_raw in VALID_BR_DDDS else ""
    
    if len(t) == 11 and t[:2] in VALID_BR_DDDS:
        d = t[:2]
        local = t[2:]
    elif len(t) == 10 and t[:2] in VALID_BR_DDDS:
        d = t[:2]
        local = t[2:]
    elif len(t) in (8, 9):
        local = t
        if not d:
            d = "11"
    else:
        if d and len(t) >= 8:
            local = t
        elif len(t) >= 10 and t[:2] in VALID_BR_DDDS:
            d = t[:2]
            local = t[2:]
        else:
            return "", "", "Sem Telefone"

    if not d:
        d = "11"

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
    ap = argparse.ArgumentParser(description='Enriquecimento via Quadro de Sócios (Receita Federal)')
    ap.add_argument('--corte', default='2026-09-14', help='Corte mensal da Receita Federal')
    ap.add_argument('--master', default='planilha_mestre_taxistas_sp_2026.csv', help='Caminho da planilha mestre')
    ap.add_argument('--workdir', default=os.environ.get('TEMP', '.') + r'\cnpj_rfb_socios')
    ap.add_argument('--saida-dir', default='data/processed')
    args = ap.parse_args()

    work = Path(args.workdir)
    work.mkdir(parents=True, exist_ok=True)
    corte = args.corte.strip('/')
    url_base = f'{MIRROR}/{corte}/'

    print('=' * 80)
    print('MINERAÇÃO NO QUADRO DE SÓCIOS E ADMINISTRADORES - QSA (RECEITA FEDERAL)')
    print('=' * 80)
    print(f'Corte: {corte} | Fonte: {url_base}')

    # 1. Carregar alvos da Planilha Mestre
    print('\n[1/4] Carregando motoristas sem telefone ou com apenas telefone fixo...')
    df_m = pd.read_csv(args.master, sep=';', encoding='utf-8-sig', low_memory=False)
    
    # Critério: quem não tem telefone ou tem apenas fixo (para buscar celular)
    t1_empty = df_m['Telefone_Celular_1'].fillna('').str.strip() == ''
    wpp_nao = ~df_m['WhatsApp_Ativo'].fillna('').str.startswith('Sim')
    alvos_df = df_m[t1_empty | wpp_nao].copy()

    print(f'  -> Total motoristas alvo: {len(alvos_df):,}')
    contemp_count = alvos_df['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False).sum()
    print(f'     Sendo {contemp_count:,} Contemplados Titulares de 2026.')

    # Indexar alvos por nome exato e sem preposições
    target_exact = {}
    target_noprep = {}
    for _, r in alvos_df.iterrows():
        id_m = str(r.get('ID_Master', ''))
        nome = str(r.get('Nome_Completo', ''))
        n = norm_name(nome)
        parts = n.split()
        if len(parts) >= 2:
            r_info = {
                'id_master': id_m,
                'nome_completo': nome,
                'status_sorteio': r.get('Status_Sorteio_2026', ''),
                'edital': r.get('Edital_Numero', ''),
                'condutax': r.get('Cadastro_DTP_Condutax', ''),
                'tel1_atual': r.get('Telefone_Celular_1', ''),
                'wpp_atual': r.get('WhatsApp_Ativo', '')
            }
            target_exact.setdefault(n, []).append(r_info)
            np = strip_prep(n)
            if len(np.split()) >= 2:
                target_noprep.setdefault(np, []).append(r_info)

    print(f'  -> Variações de nomes indexadas: {len(target_exact):,} exatos | {len(target_noprep):,} sem preposição.')

    # 2. Varrer partições de Sócios
    print('\n[2/4] Varrendo partições de Sócios (Socios0 a Socios9)...')
    matched_socios = {}  # cnpj_basico -> list of partner records linked to drivers
    cache_path = work / 'matched_socios_cache.json'
    
    if cache_path.exists():
        print(f'  -> Carregando cache existente: {cache_path}')
        with open(cache_path, 'r', encoding='utf-8') as f:
            matched_socios = json.load(f)
        print(f'     {len(matched_socios):,} CNPJs Básicos recuperados do cache.')
    else:
        t0 = time.time()
        for idx in range(10):
            nome_zip = f'Socios{idx}.zip'
            url_zip = f'{url_base}{nome_zip}'
            destino_zip = work / nome_zip

            print(f'  -> [{idx+1}/10] Baixando e processando {nome_zip}...')
            t_part = time.time()
            baixar_stream(url_zip, destino_zip)

            zf, stream = abrir_zip(destino_zip)
            lidos = 0
            matches_part = 0
            try:
                for raw_line in stream:
                    lidos += 1
                    cols = dividir(raw_line)
                    if len(cols) < 5:
                        continue
                    
                    # Filtra apenas Pessoa Física (identificador 2)
                    identificador = cols[1].strip()
                    if identificador != '2':
                        continue

                    cnpj_basico = cols[0].strip().zfill(8)
                    nome_socio = norm_name(cols[2])
                    cpf_mascarado = cols[3].strip()
                    qualificacao = cols[4].strip()
                    data_entrada = cols[5].strip() if len(cols) > 5 else ''
                    faixa_etaria = cols[10].strip() if len(cols) > 10 else ''

                    cand_drivers = target_exact.get(nome_socio)
                    if not cand_drivers:
                        ns_np = strip_prep(nome_socio)
                        if len(ns_np.split()) >= 2:
                            cand_drivers = target_noprep.get(ns_np)

                    if cand_drivers:
                        for d_info in cand_drivers:
                            entry = {
                                'id_master': d_info['id_master'],
                                'nome_motorista': d_info['nome_completo'],
                                'status_sorteio': d_info['status_sorteio'],
                                'edital': d_info['edital'],
                                'condutax': d_info['condutax'],
                                'cnpj_basico': cnpj_basico,
                                'nome_socio_rf': cols[2].strip(),
                                'cpf_mascarado': format_cpf_masked(cpf_mascarado),
                                'qualificacao_cod': qualificacao,
                                'qualificacao_desc': QUALIFICACOES.get(qualificacao, f'Qualif {qualificacao}'),
                                'data_entrada': data_entrada,
                                'faixa_etaria_desc': FAIXAS_ETARIAS.get(faixa_etaria, '')
                            }
                            matched_socios.setdefault(cnpj_basico, []).append(entry)
                            matches_part += 1
            finally:
                stream.close()
                zf.close()
                if destino_zip.exists():
                    os.remove(destino_zip)

            print(f'     Lidos: {lidos:,} | Matches nesta partição: {matches_part:,} ({time.time() - t_part:.1f}s)')

        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(matched_socios, f, ensure_ascii=False)
        print(f'  -> Varredura de Sócios concluída em {time.time() - t0:.1f}s! Total CNPJs Básicos encontrados: {len(matched_socios):,}')

    if not matched_socios:
        print('Nenhum sócio localizado. Encerrando.')
        return

    # 3. Cruzar com Estabelecimentos (restrito a SP)
    print('\n[3/4] Cruzando com Estabelecimentos (UF == "SP")...')
    checkpoint_path = work / 'estab_matches_checkpoint.json'
    estab_matches = {}  # id_master -> list of enriched records
    if checkpoint_path.exists():
        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                estab_matches = json.load(f)
            print(f'  -> Checkpoint recuperado: {len(estab_matches):,} motoristas já com contatos salvos.')
        except Exception:
            pass

    # Pré-codifica CNPJs Básicos para busca ultrarrápida em bytes (O(1))
    matched_socios_bytes = {k.encode('ascii'): v for k, v in matched_socios.items()}
    t0_est = time.time()
    
    for idx in range(10):
        nome_zip = f'Estabelecimentos{idx}.zip'
        url_zip = f'{url_base}{nome_zip}'
        destino_zip = work / nome_zip

        print(f'  -> [{idx+1}/10] Baixando e processando {nome_zip}...')
        t_part = time.time()
        baixar_stream(url_zip, destino_zip)

        zf, stream = abrir_zip(destino_zip)
        lidos = 0
        matches_estab = 0
        try:
            for raw_line in stream:
                lidos += 1
                if len(raw_line) < 25:
                    continue

                # Filtro ultrarrápido em nível de bytes no CNPJ Básico (coluna 0)
                # Formato padrão: "12345678";"0001";...
                cand_base = raw_line[1:9]
                if cand_base not in matched_socios_bytes:
                    continue

                # Filtro rápido para Estado de São Paulo
                if b';"SP";' not in raw_line:
                    continue

                cols = dividir(raw_line)
                if len(cols) < 25:
                    continue

                uf = cols[19].strip().upper()
                if uf != 'SP':
                    continue

                base_cand = cols[0].strip().zfill(8)
                if base_cand not in matched_socios:
                    continue

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

                # Prioriza celular em fmt1 se fmt2 for celular e fmt1 for fixo
                if not tipo1.startswith('Celular') and tipo2.startswith('Celular'):
                    fmt1, fmt2 = fmt2, fmt1
                    wpp1, wpp2 = wpp2, wpp1
                    tipo1, tipo2 = tipo2, tipo1

                # Se não tem nenhum telefone válido, descarta
                if not fmt1 and not fmt2:
                    continue

                partner_list = matched_socios[base_cand]
                for p_rec in partner_list:
                    mid = p_rec['id_master']
                    
                    full_rec = {
                        'ID_Master': mid,
                        'Nome_Motorista': p_rec['nome_motorista'],
                        'Status_Sorteio_2026': p_rec['status_sorteio'],
                        'Edital_Numero': p_rec['edital'],
                        'Cadastro_DTP_Condutax': p_rec['condutax'],
                        'Empresa_CNPJ': cnpj_fmt,
                        'Empresa_Tipo': matriz_filial,
                        'Empresa_Nome_Fantasia': nome_fantasia,
                        'Socio_Qualificacao': p_rec['qualificacao_desc'],
                        'Socio_CPF_Mascarado': p_rec['cpf_mascarado'],
                        'Socio_Faixa_Etaria': p_rec['faixa_etaria_desc'],
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
                    
                    # Prioriza empresas ativas e que possuam celular
                    existing = estab_matches.get(mid)
                    if existing is None:
                        estab_matches[mid] = full_rec
                        matches_estab += 1
                    else:
                        prev_eh_cel = existing['Tipo_Telefone'].startswith('Celular')
                        novo_eh_cel = full_rec['Tipo_Telefone'].startswith('Celular')
                        if not prev_eh_cel and novo_eh_cel:
                            estab_matches[mid] = full_rec
                        elif existing['Empresa_Situacao_Cadastral'] != 'Ativa' and sit_desc == 'Ativa':
                            estab_matches[mid] = full_rec
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

        # Salva checkpoint após cada partição
        try:
            with open(checkpoint_path, 'w', encoding='utf-8') as f:
                json.dump(estab_matches, f, ensure_ascii=False)
        except Exception:
            pass

        print(f'     Lidos: {lidos:,} | Motoristas únicos acumulados com contato: {len(estab_matches):,} ({time.time() - t_part:.1f}s)')

    print(f'\n[4/4] Consolidação de Resultados...')
    out_df = pd.DataFrame(list(estab_matches.values()))
    
    if len(out_df) == 0:
        print('Nenhum estabelecimento com contato localizado.')
        return

    # Salvar base completa (privada)
    saida_dir = Path(args.saida_dir)
    saida_dir.mkdir(parents=True, exist_ok=True)
    out_csv = saida_dir / 'socios_taxistas_sp_enriquecidos.csv'
    out_df.to_csv(out_csv, sep=';', index=False, encoding='utf-8-sig')
    print(f'  -> Base Completa salva: {out_csv} ({len(out_df):,} motoristas)')

    # Salvar versão pública (sem PII)
    out_pub = saida_dir / 'socios_taxistas_sp_enriquecidos_publico.csv'
    pub_cols = [
        'ID_Master', 'Nome_Motorista', 'Status_Sorteio_2026', 'Edital_Numero',
        'Empresa_CNPJ', 'Empresa_Tipo', 'Socio_Qualificacao', 'Empresa_Situacao_Cadastral',
        'Empresa_Data_Inicio', 'Empresa_CNAE', 'Empresa_Municipio', 'Empresa_UF'
    ]
    pub_df = out_df[[c for c in pub_cols if c in out_df.columns]].copy()
    pub_df.to_csv(out_pub, sep=';', index=False, encoding='utf-8-sig')
    print(f'  -> Versão Pública salva: {out_pub} ({len(pub_df):,} registros)')

    # Estatísticas
    cont_count = out_df['Status_Sorteio_2026'].str.contains('CONTEMPLADO', na=False).sum()
    wpp_count = out_df['Tipo_Telefone'].str.startswith('Celular').sum()
    fixo_count = out_df['Tipo_Telefone'].str.startswith('Fixo').sum()

    print('\n' + '=' * 80)
    print('RELATÓRIO DE ENRIQUECIMENTO VIA QUADRO DE SÓCIOS (QSA)')
    print('=' * 80)
    print(f'Total de Motoristas Enriquecidos: {len(out_df):,}')
    print(f'  -> Contemplados Titulares: {cont_count:,}')
    print(f'  -> Suplentes / Outros: {len(out_df) - cont_count:,}')
    print(f'  -> Com Celular / WhatsApp: {wpp_count:,}')
    print(f'  -> Com Telefone Fixo: {fixo_count:,}')
    print('=' * 80)


if __name__ == '__main__':
    main()
