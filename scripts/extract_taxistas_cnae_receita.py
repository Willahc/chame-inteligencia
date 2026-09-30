# -*- coding: utf-8 -*-
"""
scripts/extract_taxistas_cnae_receita.py
Extrator de estabelecimentos de taxi e transporte de passageiros por CNAE (dados abertos da Receita Federal).

Objetivo:
  Baixar os dados abertos do CNPJ (Receita Federal) e extrair os
  estabelecimentos de servico de taxi e transporte rodoviario de passageiros
  registrados no municipio de Sao Paulo e em toda a Regiao Metropolitana de
  Sao Paulo (RMSP - 39 municipios), classificando cada registro pelo CNAE e
  pela natureza juridica (MEI / LTDA).

Fontes (publicas, sem autenticacao):
  Corte mensal da Receita Federal, espelho CDN:
    https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos/<corte>/
  Origem primaria:
    https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9

Criterio de extracao:
  municipio in municipios_alvo (padrao RMSP: 40 codigos TOM incluindo Sao Paulo e 39 cidades vizinhas)
  E CNAE presente como principal (campo 11) ou secundario (campo 12).
"""

import argparse
import csv
import hashlib
import io
import os
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

MIRROR = 'https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos'
# O espelho rejeita o User-Agent padrao do urllib com HTTP 403.
USER_AGENT = 'Mapeamento-TaxiSP/1.0 (projeto de dados publicos; contato: locally)'

# Tabela TOM (Tabela de Orgaos e Municipios da Receita Federal / SERPRO) da RMSP
RMSP_MUNICIPIOS = {
    '7107': 'SAO PAULO',
    '6477': 'GUARULHOS',
    '6789': 'OSASCO',
    '7057': 'SANTO ANDRE',
    '0516': 'SANTO ANDRE',
    '7075': 'SAO BERNARDO DO CAMPO',
    '7077': 'SAO CAETANO DO SUL',
    '6377': 'DIADEMA',
    '7157': 'TABOAO DA SERRA',
    '6213': 'BARUERI',
    '6313': 'CARAPICUIBA',
    '6689': 'MAUA',
    '6361': 'COTIA',
    '6713': 'MOGI DAS CRUZES',
    '7151': 'SUZANO',
    '6545': 'ITAPECERICA DA SERRA',
    '6401': 'EMBU DAS ARTES',
    '6403': 'EMBU-GUACU',
    '7047': 'SANTANA DE PARNAIBA',
    '6563': 'ITAQUAQUECETUBA',
    '6415': 'FERRAZ DE VASCONCELOS',
    '6897': 'POA',
    '6429': 'FRANCO DA ROCHA',
    '6427': 'FRANCISCO MORATO',
    '6281': 'CAIEIRAS',
    '6285': 'CAJAMAR',
    '6177': 'ARUJA',
    '7037': 'SANTA ISABEL',
    '9689': 'SANTA ISABEL',
    '6967': 'RIBEIRAO PIRES',
    '6983': 'RIO GRANDE DA SERRA',
    '6601': 'JANDIRA',
    '6551': 'ITAPEVI',
    '7273': 'VARGEM GRANDE PAULISTA',
    '6883': 'PIRAPORA DO BOM JESUS',
    '6625': 'JUQUITIBA',
    '5447': 'SAO LOURENCO DA SERRA',
    '7001': 'SALESOPOLIS',
    '6467': 'GUARAREMA',
    '6671': 'MAIRIPORA'
}

# CNAEs da familia taxi e transporte de passageiros (incluindo motoristas de aplicativo/fretamento)
CNAE_TAXI = {
    '4923001': 'Servico de taxi',
    '4923002': 'Transporte de passageiros - locacao de automoveis com motorista',
    '5229001': 'Apoio ao transporte por taxi, inclusive centrais de chamada',
    '4929799': 'Outros transportes rodoviarios de passageiros (app / fretamento)',
    '4929701': 'Organizacao de excursoes em veiculos rodoviarios proprios',
    '4929702': 'Transporte rodoviario coletivo de passageiros fretamento'
}

# Naturezas juridicas relevantes
NATUREZA_MEI = '2135'   # Empresario (Individual)
NATUREZA_LTDA = '2062'  # Sociedade Empresaria Limitada

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

COLUNAS_EMP = [
    'CNPJ_BASICO', 'RAZAO_SOCIAL', 'COD_NATUREZA_JURIDICA',
    'COD_GRUPO_ECONOMICO', 'CAPITAL_SOCIAL', 'PORTE', 'RESERVADO',
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for bloco in iter(lambda: fh.read(1 << 20), b''):
            h.update(bloco)
    return h.hexdigest()


def abrir_url(url, timeout=1800):
    """Abre uma URL com User-Agent explicito (o espelho retorna 403 sem ele)."""
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={'User-Agent': USER_AGENT}), timeout=timeout)


def listar_cortes():
    """Retorna os cortes mensais disponiveis no espelho, do mais novo para o mais velho."""
    with abrir_url(MIRROR + '/', timeout=60) as resp:
        html = resp.read().decode('utf-8', 'replace')
    cortes = sorted(set(__import__('re').findall(r'href="(\d{4}-\d{2}-\d{2}/)"', html)), reverse=True)
    return cortes


def baixar(url, destino, timeout=1800):
    """Baixa uma URL para disco mostrando progresso a cada 100 MB."""
    destino = Path(destino)
    if destino.exists() and destino.stat().st_size > 0:
        print(f'    cache: {destino.name} ({destino.stat().st_size/1e6:.0f} MB)')
        return destino
    tmp = destino.with_suffix(destino.suffix + '.part')
    t0 = time.time()
    with abrir_url(url, timeout=timeout) as resp, open(tmp, 'wb') as out:
        total = int(resp.headers.get('Content-Length') or 0)
        lido = 0
        prox = 0
        while True:
            buf = resp.read(1 << 20)
            if not buf:
                break
            out.write(buf)
            lido += len(buf)
            if lido - prox >= 100e6:
                prox = lido
                mb = lido / 1e6
                print(f'    {mb:,.0f} MB  {mb/(time.time()-t0):.0f} MB/s', flush=True)
    tmp.rename(destino)
    mb = destino.stat().st_size / 1e6
    print(f'    concluído {destino.name} ({mb:,.0f} MB em {time.time()-t0:.0f}s)')
    return destino


def Abrir_zip(path):
    zf = zipfile.ZipFile(path)
    return zf, zf.open(zf.namelist()[0])


def dividir(bline):
    """Divide uma linha em campos, removendo as aspas envolventes."""
    campos = bline.rstrip(b'\r\n').decode('latin-1').split(';')
    return [c[1:-1] if len(c) >= 2 and c[0] == '"' and c[-1] == '"' else c for c in campos]


def varrer_estabelecimentos_arquivo(caminho, municipios_alvo, cnaes_alvo, vistos, marcas, log):
    """Filtra estabelecimentos do municipio alvo cujo CNAE principal ou secundario
    pertence a familia taxi/transporte. Leitura em streaming."""
    est = []
    nome = Path(caminho).name
    zf, fh = Abrir_zip(caminho)
    n_linhas = n_hit = 0
    with fh:
        for bline in fh:
            n_linhas += 1
            if not any(m in bline for m in marcas):
                continue
            parts = dividir(bline)
            if len(parts) != 30:
                continue
            if parts[20] not in municipios_alvo:
                continue
            chave = parts[0] + parts[1]
            if chave in vistos:
                continue
            secundarias = set(parts[12].split(',')) if parts[12] else set()
            principais = [c for c in cnaes_alvo if c in secundarias]
            if parts[11] in cnaes_alvo:
                principais.insert(0, parts[11])
            if not principais:
                continue
            vistos.add(chave)
            reg = dict(zip(COLUNAS_ESTAB, parts))
            reg['CNAES_TAXI_ENCONTRADOS'] = ','.join(principais)
            reg['_cnpj_basico'] = parts[0]
            est.append(reg)
            n_hit += 1
    zf.close()
    log.append((nome, n_linhas, n_hit))
    print(f'    {nome}: {n_linhas:>12,} linhas -> {n_hit} taxi/app match', flush=True)
    return est


def varrer_empresas_arquivo(caminho, basicos, achados, log):
    """Busca razao social e natureza juridica para os CNPJ bases coletados."""
    nome = Path(caminho).name
    zf, fh = Abrir_zip(caminho)
    n_linhas = 0
    n_novos = 0
    with fh:
        for bline in fh:
            n_linhas += 1
            parts = dividir(bline)
            if len(parts) < 7:
                continue
            base = parts[0]
            if base in basicos and base not in achados:
                achados[base] = dict(zip(COLUNAS_EMP, parts))
                n_novos += 1
    zf.close()
    log.append((nome, n_linhas, len(achados)))
    print(f'    {nome}: {n_linhas:>12,} linhas -> +{n_novos} empresas (total: {len(achados)}/{len(basicos)})', flush=True)
    return achados


def formatar_cnpj(basico, ordem, dv):
    """Monta o CNPJ na notacao oficial: 00.000.000/0000-00."""
    b, o, d = str(basico).zfill(8), str(ordem).zfill(4), str(dv).zfill(2)
    return f'{b[:2]}.{b[2:5]}.{b[5:8]}/{o}-{d}'


def formatar_cep(cep):
    cep = str(cep).strip().zfill(8)
    return f'{cep[:5]}-{cep[5:]}' if len(cep) == 8 and cep.isdigit() else cep


def formatar_data(d):
    d = str(d).strip()
    return f'{d[:4]}-{d[4:6]}-{d[6:8]}' if len(d) == 8 and d.isdigit() else d


def mascarar_nome(nome):
    """Iniciais + sobrenome, para a versao publica sem identificacao direta."""
    partes = [p for p in str(nome).split() if p]
    if not partes:
        return ''
    if len(partes) == 1:
        return partes[0][:2] + '***'
    return partes[0][:2] + '*** ' + ' '.join(partes[1:])


def main():
    ap = argparse.ArgumentParser(description='Extrai estabelecimentos de taxi e transportes (SP/RMSP) da Receita Federal')
    ap.add_argument('--corte', help='Corte mensal (ex: 2026-09-14). Padrao: mais recente.')
    ap.add_argument('--municipio', default='RMSP', help='Codigo IBGE/TOM do municipio ou "RMSP" para toda a Grande SP')
    ap.add_argument('--nome-municipio', default='RMSP (Sao Paulo + 39 municipios)')
    ap.add_argument('--cnaes', default=','.join(CNAE_TAXI), help='CNAEs alvo, separados por virgula')
    ap.add_argument('--particoes', default='0,1,2,3,4,5,6,7,8,9', help='Indices das particoes de 0 a 9 a processar')
    ap.add_argument('--workdir', default=os.environ.get('TEMP', '.') + r'\cnpj_rfb')
    ap.add_argument('--manter-zip', action='store_true', help='Nao apaga os ZIPs apos o processamento de cada particao')
    ap.add_argument('--saida-dir', default='data/processed')
    ap.add_argument('--log-dir', default='logs')
    args = ap.parse_args()

    cnaes_alvo = [c.strip() for c in args.cnaes.split(',') if c.strip()]
    particoes_idx = [int(p.strip()) for p in args.particoes.split(',') if p.strip()]

    if args.municipio.upper() == 'RMSP':
        municipios_alvo = set(RMSP_MUNICIPIOS.keys())
    else:
        municipios_alvo = {m.strip() for m in args.municipio.split(',') if m.strip()}

    work = Path(args.workdir)
    work.mkdir(parents=True, exist_ok=True)

    print('=' * 74)
    print('Extracao de taxi e transportes por CNAE - Dados Abertos do CNPJ (RFB)')
    print('=' * 74)

    if args.corte:
        corte = args.corte.strip('/')
    else:
        cortes = listar_cortes()
        corte = cortes[0].strip('/')
        print(f'Cortes disponiveis: {cortes[0]} .. {cortes[-1]} ({len(cortes)} meses)')
    url = f'{MIRROR}/{corte}/'
    print(f'Corte: {corte}\nMunicipios: {len(municipios_alvo)} selecionados ({args.nome_municipio})')
    print(f'CNAEs: {", ".join(cnaes_alvo)}\nParticoes: {particoes_idx}\nFonte: {url}\n')

    manifesto = []
    est_log, emp_log = [], []

    # 1) Estabelecimentos (em streaming partition-by-partition para economizar espaco em disco)
    print(f'[1/4] Baixando e varrendo Estabelecimentos ({len(particoes_idx)} particoes)...')
    est = []
    vistos = set()
    marcas = tuple(c.encode('ascii') for c in cnaes_alvo)

    for i in particoes_idx:
        arq = f'Estabelecimentos{i}.zip'
        p = baixar(f'{url}{arq}', work / arq)
        manifesto.append((arq, p.stat().st_size, sha256(p), 'bruto', 'RFB/CNPJ'))
        est_part = varrer_estabelecimentos_arquivo(p, municipios_alvo, cnaes_alvo, vistos, marcas, est_log)
        est.extend(est_part)
        if not args.manter_zip:
            p.unlink(missing_ok=True)

    print(f'  => Total estabelecimentos coletados: {len(est):,}')

    # 2) Empresas (razao social + natureza juridica)
    print('\n[2/4] Baixando e varrendo Empresas para razao social e natureza juridica...')
    basicos = {r['_cnpj_basico'] for r in est}
    emp = {}

    for i in particoes_idx:
        arq = f'Empresas{i}.zip'
        p = baixar(f'{url}{arq}', work / arq)
        manifesto.append((arq, p.stat().st_size, sha256(p), 'bruto', 'RFB/CNPJ'))
        varrer_empresas_arquivo(p, basicos, emp, emp_log)
        if not args.manter_zip:
            p.unlink(missing_ok=True)
        if len(emp) >= len(basicos):
            print(f'  => 100% das razoes sociais localizadas antecipadamente na particao {i}!')
            break

    print(f'  => {len(emp):,}/{len(basicos):,} razoes sociais localizadas')

    # 3) Monta o CSV
    print('\n[3/4] Montando o CSV...')
    cabecalho = [
        'CNPJ', 'RAZAO_SOCIAL', 'NOME_FANTASIA', 'NATUREZA_JURIDICA_COD',
        'NATUREZA_JURIDICA', 'EH_EMPRESARIO_INDIVIDUAL_MEI', 'PORTE',
        'CAPITAL_SOCIAL', 'CNAE_TAXI_ENCONTRADOS', 'CNAE_FISCAL_PRINCIPAL',
        'CNAE_FISCAL_SECUNDARIA', 'CNAE_TAXI_DESCRICAO', 'SITUACAO_CADASTRAL',
        'DATA_INICIO_ATIVIDADE', 'DATA_SITUACAO_CADASTRAL', 'MATRIZ_OU_FILIAL',
        'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CEP', 'MUNICIPIO',
        'UF', 'TELEFONE_1', 'TELEFONE_2', 'CORREIO_ELETRONICO',
    ]
    linhas = []
    for r in est:
        e = emp.get(r['_cnpj_basico'], {})
        nat = e.get('COD_NATUREZA_JURIDICA', '')
        cnaes_encontrados = r['CNAES_TAXI_ENCONTRADOS'].split(',')
        desc = '; '.join(f'{c}={CNAE_TAXI.get(c, "?")}' for c in cnaes_encontrados)
        ddd1 = r.get('DDD_1', '').strip()
        ddd2 = r.get('DDD_2', '').strip()
        fone1 = r.get('TELEFONE_1', '').strip()
        fone2 = r.get('TELEFONE_2', '').strip()
        nome_mun = RMSP_MUNICIPIOS.get(r.get('MUNICIPIO', ''), r.get('MUNICIPIO', 'SAO PAULO'))
        linhas.append({
            'CNPJ': formatar_cnpj(r['CNPJ_BASICO'], r['CNPJ_ORDEM'], r['CNPJ_DV']),
            'RAZAO_SOCIAL': e.get('RAZAO_SOCIAL', ''),
            'NOME_FANTASIA': r['NOME_FANTASIA'],
            'NATUREZA_JURIDICA_COD': nat,
            'NATUREZA_JURIDICA': {'2135': 'Empresario (Individual)',
                                  '2062': 'Sociedade Empresaria Limitada'}.get(nat, ''),
            'EH_EMPRESARIO_INDIVIDUAL_MEI': 'SIM' if nat == NATUREZA_MEI else 'NAO',
            'PORTE': e.get('PORTE', ''),
            'CAPITAL_SOCIAL': e.get('CAPITAL_SOCIAL', ''),
            'CNAE_TAXI_ENCONTRADOS': r['CNAES_TAXI_ENCONTRADOS'],
            'CNAE_FISCAL_PRINCIPAL': r['CNAE_FISCAL'],
            'CNAE_FISCAL_SECUNDARIA': r['CNAE_FISCAL_SECUNDARIA'],
            'CNAE_TAXI_DESCRICAO': desc,
            'SITUACAO_CADASTRAL': SITUACAO.get(r['SITUACAO_CADASTRAL_COD'], r['SITUACAO_CADASTRAL_COD']),
            'DATA_INICIO_ATIVIDADE': formatar_data(r['DATA_INICIO_ATIVIDADE']),
            'DATA_SITUACAO_CADASTRAL': formatar_data(r['DATA_SITUACAO_CADASTRAL']),
            'MATRIZ_OU_FILIAL': {'1': 'Matriz', '2': 'Filial'}.get(r['IDENTIFICADOR_MATRIZ_FILIAL'], r['IDENTIFICADOR_MATRIZ_FILIAL']),
            'LOGRADOURO': f"{r['TIPO_LOGRADOURO']} {r['LOGRADOURO']}".strip(),
            'NUMERO': r['NUMERO'],
            'COMPLEMENTO': r['COMPLEMENTO'],
            'BAIRRO': r['BAIRRO'],
            'CEP': formatar_cep(r['CEP']),
            'MUNICIPIO': nome_mun,
            'UF': r['UF'],
            'TELEFONE_1': f'({ddd1}) {fone1}' if fone1 else '',
            'TELEFONE_2': f'({ddd2}) {fone2}' if fone2 else '',
            'CORREIO_ELETRONICO': r['CORREIO_ELETRONICO'],
        })

    linhas.sort(key=lambda d: (d['CNAE_FISCAL_PRINCIPAL'] != '4923001', d['CNPJ']))

    Path(args.saida_dir).mkdir(parents=True, exist_ok=True)
    saida = Path(args.saida_dir) / f'taxistas_sp_cnae_receita_{corte}.csv'

    # Se ja existir um arquivo previo, faz backup antes de salvar
    if saida.exists():
        backup_path = saida.with_suffix('.csv.bak')
        try:
            import shutil
            shutil.copy2(saida, backup_path)
            print(f'  Backup criado: {backup_path}')
        except Exception:
            pass

    with open(saida, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=cabecalho, delimiter=';')
        w.writeheader()
        w.writerows(linhas)
    print(f'  CSV completo: {saida} ({len(linhas):,} linhas)')

    # 4) Versao publica minimizada (LGPD) + manifesto
    pub_cab = [c for c in cabecalho if c not in
               ('RAZAO_SOCIAL', 'NOME_FANTASIA', 'TELEFONE_1', 'TELEFONE_2',
                'CORREIO_ELETRONICO', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'CEP')]
    pub_cab = ['CNPJ', 'RAZAO_SOCIAL_PUBLICA'] + pub_cab[1:]
    saida_pub = Path(args.saida_dir) / f'taxistas_sp_cnae_receita_{corte}_publico.csv'
    with open(saida_pub, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=pub_cab, delimiter=';')
        w.writeheader()
        for d in linhas:
            pub = {k: v for k, v in d.items() if k in pub_cab}
            nome = d['RAZAO_SOCIAL'] or d['NOME_FANTASIA']
            individual = d['EH_EMPRESARIO_INDIVIDUAL_MEI'] == 'SIM'
            pub['RAZAO_SOCIAL_PUBLICA'] = mascarar_nome(nome) if individual else nome
            w.writerow(pub)
    print(f'  CSV publico (sem contato): {saida_pub}')

    Path(args.log_dir).mkdir(parents=True, exist_ok=True)
    man = Path(args.log_dir) / f'manifesto_cnpj_receita_{corte}.csv'
    with open(man, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh, delimiter=';')
        w.writerow(['arquivo', 'bytes', 'sha256', 'tipo', 'fonte', 'corte', 'url'])
        for nome, size, digest, tipo, fonte in manifesto:
            w.writerow([nome, size, digest, tipo, fonte, corte, url + nome])
    print(f'  manifesto: {man}')

    mei = sum(1 for d in linhas if d['EH_EMPRESARIO_INDIVIDUAL_MEI'] == 'SIM')
    ativos = sum(1 for d in linhas if d['SITUACAO_CADASTRAL'] == 'Ativa')
    prin = sum(1 for d in linhas if d['CNAE_FISCAL_PRINCIPAL'] == '4923001')
    print('\n' + '=' * 74)
    print(f'RESULTADO  municipios={args.nome_municipio}  corte={corte}')
    print(f'  estabelecimentos coletados ....... {len(linhas):,}')
    print(f'  CNAE 4923001 como principal ...... {prin:,}')
    print(f'  Empresario Individual (2135) .... {mei:,}')
    print(f'  situacao cadastral Ativa ......... {ativos:,}')
    print(f'  arquivo ......................... {saida}')
    print('=' * 74)


if __name__ == '__main__':
    main()
