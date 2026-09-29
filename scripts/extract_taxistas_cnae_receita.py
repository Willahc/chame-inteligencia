# -*- coding: utf-8 -*-
"""
scripts/extract_taxistas_cnae_receita.py
Extrator de estabelecimentos de taxi por CNAE (dados abertos da Receita Federal).

Objetivo:
  Baixar os dados abertos do CNPJ (Receita Federal) e extrair os
  estabelecimentos de servico de taxi registrados no municipio de Sao Paulo,
  classificando cada registro pelo CNAE e pela natureza juridica.

Fontes (publicas, sem autenticacao):
  Corte mensal da Receita Federal, espelho CDN:
    https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos/<corte>/
  Origem primaria:
    https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9

Criterio de extracao:
  municipio == codigo IBGE do municipio alvo (padrao 7107 = SAO PAULO/SP)
  E CNAE de taxi presente como principal (campo 11) ou secundario (campo 12).

Nao faz geocodificacao, matching, contato, perfilamento ou publicacao.
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

# CNAEs da familia taxi/transporte de passageiros. O nucleo e 4923001.
CNAE_TAXI = {
    '4923001': 'Servico de taxi',
    '4923002': 'Transporte de passageiros - locacao de automoveis com motorista',
    '5229001': 'Apoio ao transporte por taxi, inclusive centrais de chamada',
}
# 5112901 (taxi aereo) e' deliberadamente excluido: nao e transporte terrestre.

# Naturezas juridicas relevantes (tabela Naturezas.zip, codigo de 4 digitos).
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
    """Divide uma linha em campos, removendo as aspas envolventes.

    O layout da RFB nao e estavel entre cortes: o corte 2026-09-14 vem com todos
    os campos entre aspas, enquanto cortes anteriores vem sem aspas. Um split
    simples deixa o aspeto residuo ('"7107"') e quebra a comparacao de codigo,
    o que zera silenciosamente o filtro. Normalizamos aqui.
    """
    campos = bline.rstrip(b'\r\n').decode('latin-1').split(';')
    return [c[1:-1] if len(c) >= 2 and c[0] == '"' and c[-1] == '"' else c for c in campos]


def varrer_estabelecimentos(caminhos, municipio, cnaes_alvo, log):
    """Filtra estabelecimentos do municipio alvo cujo CNAE principal ou secundario
    pertence a familia taxi. Leitura em streaming, sem extrair o CSV do disco."""
    est = []
    vistos = set()
    marcas = tuple(c.encode('ascii') for c in cnaes_alvo)
    total = 0
    for caminho in caminhos:
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
                if parts[20] != municipio:
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
        total += n_linhas
        log.append((nome, n_linhas, n_hit))
        print(f'    {nome}: {n_linhas:>12,} linhas -> {n_hit} taxi', flush=True)
    print(f'    total varrido: {total:,} estabelecimentos')
    return est


def varrer_empresas(caminhos, basicos, log):
    """Busca razao social e natureza juridica apenas para os CNPJ bases coletados."""
    achados = {}
    for caminho in caminhos:
        nome = Path(caminho).name
        zf, fh = Abrir_zip(caminho)
        n_linhas = 0
        with fh:
            for bline in fh:
                n_linhas += 1
                parts = dividir(bline)
                if len(parts) < 7:
                    continue
                base = parts[0]
                if base in basicos and base not in achados:
                    achados[base] = dict(zip(COLUNAS_EMP, parts))
        zf.close()
        log.append((nome, n_linhas, len(achados)))
        print(f'    {nome}: {n_linhas:>12,} linhas -> {len(achados)}/', flush=True)
    return achados


def formatar_cnpj(basico, ordem, dv):
    """Monta o CNPJ na notacao oficial: 00.000.000/0000-00.

    O CNPJ e' a concatenacao de CNPJ_BASICO (8) + CNPJ_ORDEM (4) + CNPJ_DV (2).
    A pontuacao oficial divide o basico em 2.000.000 e mantem a ordem e o DV
    apos a barra, portanto nao se pode resumir a ordem para '/0001'.
    """
    b, o, d = str(basico).zfill(8), str(ordem).zfill(4), str(dv).zfill(2)
    return f'{b[:2]}.{b[2:5]}.{b[5:8]}/{o}-{d}'


def formatar_cep(cep):
    cep = str(cep).strip()
    if len(cep) == 8:
        return f'{cep[:5]}-{cep[5:]}'
    return cep


def formatar_data(d):
    d = str(d).strip()
    return f'{d[:4]}-{d[4:6]}-{d[6:8]}' if len(d) == 8 and d.isdigit() else d


def mascarar_nome(nome):
    """Iniciais + sobrenome, para a versao publica sem identificacao direta.

    A razao social de um Empresario Individual e o nome civil do titular, entao
    e' dado pessoal e precisa ser minimizado. A razao social de LTDA e demais
    PJ e' registro publico de pessoa juridica e nao e' dado pessoal: mantem-la
    e o que torna a versao publica util para analise economica do setor.
    """
    partes = [p for p in str(nome).split() if p]
    if not partes:
        return ''
    if len(partes) == 1:
        return partes[0][:2] + '***'
    return partes[0][:2] + '*** ' + ' '.join(partes[1:])


def main():
    ap = argparse.ArgumentParser(description='Extrai estabelecimentos de taxi por CNAE (SP) da Receita Federal')
    ap.add_argument('--corte', help='Corte mensal (ex: 2026-09-14). Padrao: mais recente.')
    ap.add_argument('--municipio', default='7107', help='Codigo IBGE do municipio. Padrao 7107 = SAO PAULO/SP')
    ap.add_argument('--nome-municipio', default='SAO PAULO')
    ap.add_argument('--cnaes', default=','.join(CNAE_TAXI), help='CNAEs alvo, separados por virgula')
    ap.add_argument('--workdir', default=os.environ.get('TEMP', '.') + r'\cnpj_rfb')
    ap.add_argument('--manter-zip', action='store_true', help='Nao apaga os ZIPs apos o processamento')
    ap.add_argument('--saida-dir', default='data/processed')
    ap.add_argument('--log-dir', default='logs')
    args = ap.parse_args()

    cnaes_alvo = [c.strip() for c in args.cnaes.split(',') if c.strip()]
    work = Path(args.workdir)
    work.mkdir(parents=True, exist_ok=True)

    print('=' * 74)
    print('Extracao de taxi por CNAE - Dados Abertos do CNPJ (Receita Federal)')
    print('=' * 74)

    if args.corte:
        corte = args.corte.strip('/')
    else:
        cortes = listar_cortes()
        corte = cortes[0].strip('/')
        print(f'Cortes disponiveis: {cortes[0]} .. {cortes[-1]} ({len(cortes)} meses)')
    url = f'{MIRROR}/{corte}/'
    print(f'Corte: {corte}\nMunicipio: {args.nome_municipio} (codigo {args.municipio})')
    print(f'CNAEs: {", ".join(cnaes_alvo)}\nFonte: {url}\n')

    manifesto = []
    est_log, emp_log = [], []

    # 1) Estabelecimentos
    print('[1/4] Baixando e varrendo Estabelecimentos (10 particoes)...')
    zips_est = []
    for i in range(10):
        arq = f'Estabelecimentos{i}.zip'
        p = baixar(f'{url}{arq}', work / arq)
        manifesto.append((arq, p.stat().st_size, sha256(p), 'bruto', 'RFB/CNPJ'))
        zips_est.append(p)

    est = varrer_estabelecimentos(zips_est, args.municipio, cnaes_alvo, est_log)
    print(f'  => {len(est)} estabelecimentos de taxi em {args.nome_municipio}')

    # 2) Empresas (razao social + natureza juridica)
    print('\n[2/4] Baixando e varrendo Empresas para razao social e natureza juridica...')
    basicos = {r['_cnpj_basico'] for r in est}
    zips_emp = []
    for i in range(10):
        arq = f'Empresas{i}.zip'
        p = baixar(f'{url}{arq}', work / arq)
        manifesto.append((arq, p.stat().st_size, sha256(p), 'bruto', 'RFB/CNPJ'))
        zips_emp.append(p)

    emp = varrer_empresas(zips_emp, basicos, emp_log)
    print(f'  => {len(emp)}/{len(basicos)} razoes sociais localizadas')

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
            'MUNICIPIO': args.nome_municipio,
            'UF': r['UF'],
            'TELEFONE_1': f'({ddd1}) {fone1}' if fone1 else '',
            'TELEFONE_2': f'({ddd2}) {fone2}' if fone2 else '',
            'CORREIO_ELETRONICO': r['CORREIO_ELETRONICO'],
        })

    linhas.sort(key=lambda d: (d['CNAE_FISCAL_PRINCIPAL'] != '4923001', d['CNPJ']))

    Path(args.saida_dir).mkdir(parents=True, exist_ok=True)
    saida = Path(args.saida_dir) / f'taxistas_sp_cnae_receita_{corte}.csv'
    with open(saida, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=cabecalho, delimiter=';')
        w.writeheader()
        w.writerows(linhas)
    print(f'  CSV completo: {saida} ({len(linhas)} linhas)')

    # 4) Versao publica minimizada (LGPD) + manifesto
    # Retira contato direto (telefone, e-mail) e o endereco fino. A razao social
    # so e minimizada quando o registro e' Empresario Individual, porque nesse
    # caso ela reproduz o nome civil do titular; para LTDA e registro publico.
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

    if not args.manter_zip:
        print('\n[4/4] Removendo ZIPs do workdir (use --manter-zip para preservar)...')
        for p in zips_est + zips_emp:
            p.unlink(missing_ok=True)

    mei = sum(1 for d in linhas if d['EH_EMPRESARIO_INDIVIDUAL_MEI'] == 'SIM')
    ativos = sum(1 for d in linhas if d['SITUACAO_CADASTRAL'] == 'Ativa')
    prin = sum(1 for d in linhas if d['CNAE_FISCAL_PRINCIPAL'] == '4923001')
    print('\n' + '=' * 74)
    print(f'RESULTADO  municipio={args.nome_municipio}  corte={corte}')
    print(f'  estabelecimentos taxi ........... {len(linhas)}')
    print(f'  CNAE 4923001 como principal ...... {prin}')
    print(f'  Empresario Individual (2135) .... {mei}')
    print(f'  situacao cadastral Ativa ......... {ativos}')
    print(f'  arquivo ......................... {saida}')
    print('=' * 74)
    print('\nRessalva: CNPJ com CNAE de taxi NAO comprova Condutax valido no DTP/PMSP.')
    print('Verificar elegibilidade na fonte municipal antes de qualquer uso.')


if __name__ == '__main__':
    main()
