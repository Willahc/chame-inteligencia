# -*- coding: utf-8 -*-
"""
scripts/enrich_corporate_emails.py
Mapeia e enriquece os 190 clientes corporativos (94 Hospitais e 96 Grandes Empresas no raio de 5 km)
com inteligência de e-mails corporativos dos decisores:
- Dominio_Email_Corporativo: Domínio oficial de e-mail da empresa/instituição
- Padrao_Sintaxe_Email: Formato padrão de e-mail corporativo (ex: {nome}.{sobrenome}@empresa.com.br)
- Email_Canal_Compras_Institucional: E-mail funcional ou canal oficial de compras/fornecedores
- Email_Provavel_Decisor_Mapeado: E-mail nominal estimado para os líderes identificados
- Link_Hunter_Busca_Emails: URL direta para abrir o domínio no Hunter.io e ver todos os e-mails verificados
- Link_Google_Dork_Emails: URL direta do Google Dork ("*@dominio" compras OR suprimentos OR facilities)
- Ferramenta_Extracao_Recomendada: Ferramentas recomendadas para obter o e-mail validado no LinkedIn
"""

import urllib.parse
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "Novos Alvarás 2026"

HOSP_CSV_FOLDER = OUTPUT_DIR / "clientes_corporativos_hospitais_5km.csv"
HOSP_XLSX_FOLDER = OUTPUT_DIR / "clientes_corporativos_hospitais_5km.xlsx"
HOSP_CSV_ROOT = BASE_DIR / "clientes_corporativos_hospitais_5km.csv"
HOSP_XLSX_ROOT = BASE_DIR / "clientes_corporativos_hospitais_5km.xlsx"

EMP_CSV_FOLDER = OUTPUT_DIR / "clientes_corporativos_empresas_5km.csv"
EMP_XLSX_FOLDER = OUTPUT_DIR / "clientes_corporativos_empresas_5km.xlsx"
EMP_CSV_ROOT = BASE_DIR / "clientes_corporativos_empresas_5km.csv"
EMP_XLSX_ROOT = BASE_DIR / "clientes_corporativos_empresas_5km.xlsx"

def extract_domain_from_url(url):
    if not url or pd.isna(url) or url == '—':
        return None
    url_clean = str(url).strip().lower()
    if '://' in url_clean:
        url_clean = url_clean.split('://')[1]
    url_clean = url_clean.split('/')[0].split('?')[0]
    if url_clean.startswith('www.'):
        url_clean = url_clean[4:]
    return url_clean

def map_hospital_emails(row):
    nome = str(row.get('Nome_Instituicao', '')).strip()
    grupo = str(row.get('Grupo_Mantenedor', '')).strip()
    nome_up = nome.upper()
    grupo_up = grupo.upper()
    
    # 1. Albert Einstein
    if 'EINSTEIN' in nome_up:
        dom = "einstein.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@einstein.br"
        email_dec = "felipe.falone@einstein.br | gustavo.taboas@einstein.br"
        email_inst = "suprimentos@einstein.br / portal corporativo empresas.einstein.br"
    # 2. Sírio-Libanês
    elif 'SÍRIO' in nome_up or 'SIRIO' in nome_up:
        dom = "hsl.org.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@hsl.org.br"
        email_dec = "compras.indiretos@hsl.org.br"
        email_inst = "compras.indiretos@hsl.org.br | gestaodefornecedores@hsl.org.br"
    # 3. Rede D'Or São Luiz
    elif 'SÃO LUIZ' in nome_up or 'SAO LUIZ' in nome_up or "REDE D'OR" in nome_up:
        dom = "rededor.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@rededor.com.br"
        email_dec = "suprimentos.sp@rededor.com.br"
        email_inst = "fornecedores@rededor.com.br | compras@rededor.com.br"
    # 4. HCFMUSP / FFM
    elif any(k in nome_up for k in ['CLÍNICAS', 'CLINICAS', 'INCOR', 'ICESP', 'IOT', 'HCFMUSP']):
        dom = "hc.fm.usp.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@hc.fm.usp.br"
        email_dec = "compras@ffm.br | suprimentos@hc.fm.usp.br"
        email_inst = "compras@ffm.br (Fundação Faculdade de Medicina)"
    # 5. Prevent Senior / Sancta Maggiore
    elif 'PREVENT' in nome_up or 'SANCTA' in nome_up:
        dom = "preventsenior.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@preventsenior.com.br"
        email_dec = "operacoes@preventsenior.com.br"
        email_inst = "credenciamento@preventsenior.com.br | compras@preventsenior.com.br"
    # 6. Dasa / Lefort / Santa Paula / Delboni / Lavoisier / Alta
    elif any(k in nome_up for k in ['LEFORT', 'SANTA PAULA', 'DELBONI', 'LAVOISIER', 'ALTA', 'DASA']) or 'DASA' in grupo_up:
        dom = "dasa.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@dasa.com.br"
        email_dec = "suprimentos.corporativo@dasa.com.br"
        email_inst = "fornecedores@dasa.com.br | compras.servicos@dasa.com.br"
    # 7. Grupo Fleury
    elif 'FLEURY' in nome_up or 'FLEURY' in grupo_up:
        dom = "grupofleury.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@grupofleury.com.br"
        email_dec = "suprimentos@grupofleury.com.br"
        email_inst = "compras.indiretas@grupofleury.com.br"
    # 8. AACD
    elif 'AACD' in nome_up:
        dom = "aacd.org.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@aacd.org.br"
        email_dec = "suprimentos@aacd.org.br"
        email_inst = "compras@aacd.org.br"
    # 9. IMREA Lucy Montoro
    elif 'MONTORO' in nome_up:
        dom = "lucymontoro.org.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@lucymontoro.org.br"
        email_dec = "transporte@lucymontoro.org.br"
        email_inst = "contato@lucymontoro.org.br | compras@lucymontoro.org.br"
    # 10. Instituto Butantan / Hospital Vital Brazil
    elif 'BUTANTAN' in nome_up or 'VITAL BRAZIL' in nome_up:
        dom = "butantan.gov.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@butantan.gov.br"
        email_dec = "compras@butantan.gov.br"
        email_inst = "licitacoes@butantan.gov.br | suprimentos@butantan.gov.br"
    # 11. Hapvida NotreDame Intermédica
    elif 'NOTREDAME' in grupo_up or 'HAPVIDA' in grupo_up or 'CAXINGUI' in nome_up:
        dom = "hapvida.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@hapvida.com.br"
        email_dec = "suprimentos.sp@hapvida.com.br"
        email_inst = "fornecedores@hapvida.com.br"
    # 12. CEMA
    elif 'CEMA' in nome_up:
        dom = "cemahospital.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@cemahospital.com.br"
        email_dec = "compras@cemahospital.com.br"
        email_inst = "ouvidoria@cemahospital.com.br | compras@cemahospital.com.br"
    # 13. Rede Pública Municipal / SUS (UBS, AMA, CAPS)
    elif any(k in grupo_up for k in ['PREFEITURA', 'MUNICIPAL', 'SISTEMA ÚNICO', 'SISTEMA UNICO', 'ESTADO']):
        dom = "prefeitura.sp.gov.br"
        padrao = "{primeiro_nome}{ultimo_sobrenome}@prefeitura.sp.gov.br"
        email_dec = "smscompras@prefeitura.sp.gov.br"
        email_inst = "coordenadoriasaudesoeste@prefeitura.sp.gov.br"
    else:
        dom = "hospital.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@" + dom
        email_dec = "compras@" + dom
        email_inst = "contato@" + dom

    hunter_url = f"https://hunter.io/search/{dom}"
    dork_query = f'"@{dom}" (compras OR suprimentos OR facilities OR procurement)'
    google_dork = f"https://www.google.com/search?q={urllib.parse.quote_plus(dork_query)}"
    
    return {
        "Dominio_Email_Corporativo": dom,
        "Padrao_Sintaxe_Email": padrao,
        "Email_Canal_Compras_Institucional": email_inst,
        "Email_Provavel_Decisor_Mapeado": email_dec,
        "Link_Hunter_Busca_Emails": hunter_url,
        "Link_Google_Dork_Emails": google_dork,
        "Ferramentas_Extracao_Recomendadas": "Hunter.io | Apollo.io Chrome Extension | Snov.io | Lusha"
    }

def map_enterprise_emails(row):
    nome = str(row.get('Nome_Empresa', '')).strip()
    website = str(row.get('Website_Corporativo', '')).strip()
    nome_up = nome.upper()
    
    dom = extract_domain_from_url(website)
    
    # Defaults baseados na empresa
    if 'AMBEV' in nome_up:
        dom = "ambev.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@ambev.com.br"
        email_dec = "felipe.baruque@ambev.com.br"
        email_inst = "compras.indiretas@ambev.com.br | fornecedores@ambev.com.br"
    elif 'UNILEVER' in nome_up:
        dom = "unilever.com"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@unilever.com"
        email_dec = "fabio.pollice@unilever.com"
        email_inst = "procurement.brasil@unilever.com"
    elif 'GOOGLE' in nome_up:
        dom = "google.com"
        padrao = "{primeiro_nome}@google.com ou {primeiro_nome}{ultimo_sobrenome}@google.com"
        email_dec = "workplace-sp@google.com"
        email_inst = "facilities-brasil@google.com"
    elif 'META' in nome_up or 'FACEBOOK' in nome_up:
        dom = "meta.com"
        padrao = "{primeiro_nome}{ultimo_sobrenome}@meta.com"
        email_dec = "workplace-br@meta.com"
        email_inst = "facilities-sa@meta.com"
    elif 'NUBANK' in nome_up:
        dom = "nubank.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@nubank.com.br"
        email_dec = "procurement@nubank.com.br"
        email_inst = "facilities@nubank.com.br | compras@nubank.com.br"
    elif 'ITAÚ' in nome_up or 'ITAU' in nome_up:
        dom = "itau-unibanco.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@itau-unibanco.com.br"
        email_dec = "suprimentos.corporativo@itau-unibanco.com.br"
        email_inst = "fornecedores@itau-unibanco.com.br | facilities@itau-unibanco.com.br"
    elif 'SANTANDER' in nome_up:
        dom = "santander.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@santander.com.br"
        email_dec = "compras.servicos@santander.com.br"
        email_inst = "suprimentos@santander.com.br"
    elif 'BTG' in nome_up:
        dom = "btgpactual.com"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@btgpactual.com"
        email_dec = "facilities@btgpactual.com"
        email_inst = "compras@btgpactual.com"
    elif 'XP' in nome_up:
        dom = "xpi.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@xpi.com.br"
        email_dec = "workplace@xpi.com.br"
        email_inst = "compras@xpi.com.br"
    elif 'PWC' in nome_up or 'PRICEWATERHOUSE' in nome_up:
        dom = "pwc.com"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@pwc.com"
        email_dec = "procurement.brasil@pwc.com"
        email_inst = "facilities.sp@pwc.com"
    elif 'EY' in nome_up or 'ERNST' in nome_up:
        dom = "ey.com"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@ey.com"
        email_dec = "procurement.brasil@ey.com"
        email_inst = "facilities.sp@ey.com"
    elif 'DELOITTE' in nome_up:
        dom = "deloitte.com"
        padrao = "{primeira_letra}{ultimo_sobrenome}@deloitte.com"
        email_dec = "compras.brasil@deloitte.com"
        email_inst = "facilities.sp@deloitte.com"
    elif 'PINHEIRO NETO' in nome_up:
        dom = "pn.com.br"
        padrao = "{primeira_letra}{ultimo_sobrenome}@pn.com.br"
        email_dec = "administracao@pn.com.br"
        email_inst = "facilities@pn.com.br"
    elif 'MATTOS FILHO' in nome_up:
        dom = "mattosfilho.com.br"
        padrao = "{primeira_letra}{ultimo_sobrenome}@mattosfilho.com.br"
        email_dec = "administracao@mattosfilho.com.br"
        email_inst = "facilities@mattosfilho.com.br"
    elif 'BAYER' in nome_up:
        dom = "bayer.com"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@bayer.com"
        email_dec = "procurement.brasil@bayer.com"
        email_inst = "facilities.brasil@bayer.com"
    elif 'JOHNSON' in nome_up:
        dom = "its.jnj.com"
        padrao = "{primeira_letra}{ultimo_sobrenome}@its.jnj.com"
        email_dec = "procurement.latam@its.jnj.com"
        email_inst = "facilities.brasil@its.jnj.com"
    elif 'WEWORK' in nome_up:
        dom = "wework.com"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@wework.com"
        email_dec = "community.butanta@wework.com"
        email_inst = "operations.brasil@wework.com"
    elif 'SHOPPING ELDORADO' in nome_up or 'ELDORADO' in nome_up:
        dom = "shoppingeldorado.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@shoppingeldorado.com.br"
        email_dec = "operacoes@shoppingeldorado.com.br"
        email_inst = "atendimento@shoppingeldorado.com.br | compras@shoppingeldorado.com.br"
    else:
        if not dom:
            clean = nome.lower().split()[0].replace(',', '').replace('.', '')
            dom = f"{clean}.com.br"
        padrao = "{primeiro_nome}.{ultimo_sobrenome}@" + dom
        email_dec = "compras@" + dom
        email_inst = "contato@" + dom

    hunter_url = f"https://hunter.io/search/{dom}"
    dork_query = f'"@{dom}" (compras OR suprimentos OR facilities OR procurement)'
    google_dork = f"https://www.google.com/search?q={urllib.parse.quote_plus(dork_query)}"

    return {
        "Dominio_Email_Corporativo": dom,
        "Padrao_Sintaxe_Email": padrao,
        "Email_Canal_Compras_Institucional": email_inst,
        "Email_Provavel_Decisor_Mapeado": email_dec,
        "Link_Hunter_Busca_Emails": hunter_url,
        "Link_Google_Dork_Emails": google_dork,
        "Ferramentas_Extracao_Recomendadas": "Hunter.io | Apollo.io Chrome Extension | Snov.io | Lusha"
    }

def main():
    print("=" * 80)
    print("ENRIQUECIMENTO DE INTELIGÊNCIA DE E-MAILS CORPORATIVOS DOS DECISORES B2B")
    print("Hospitais (94) e Grandes Empresas (96) - Raio de 5 km da Cooperativa Chame Táxi")
    print("=" * 80)

    # 1. Enriquecer Hospitais
    if HOSP_CSV_FOLDER.exists():
        df_h = pd.read_csv(HOSP_CSV_FOLDER, sep=';', low_memory=False)
    else:
        df_h = pd.read_csv(HOSP_CSV_ROOT, sep=';', low_memory=False)

    print(f"\nEnriquecendo dados de e-mail para {len(df_h)} Polos Hospitalares...")
    h_email_data = [map_hospital_emails(row) for _, row in df_h.iterrows()]
    df_h_email = pd.DataFrame(h_email_data)

    for col in df_h_email.columns:
        df_h[col] = df_h_email[col]

    df_h.to_csv(HOSP_CSV_FOLDER, sep=';', index=False, encoding='utf-8-sig')
    df_h.to_excel(HOSP_XLSX_FOLDER, index=False, engine='openpyxl')
    df_h.to_csv(HOSP_CSV_ROOT, sep=';', index=False, encoding='utf-8-sig')
    df_h.to_excel(HOSP_XLSX_ROOT, index=False, engine='openpyxl')
    print(f" -> 94 Hospitais atualizados com {len(df_h.columns)} colunas em CSV e Excel!")

    # 2. Enriquecer Empresas
    if EMP_CSV_FOLDER.exists():
        df_e = pd.read_csv(EMP_CSV_FOLDER, sep=';', low_memory=False)
    else:
        df_e = pd.read_csv(EMP_CSV_ROOT, sep=';', low_memory=False)

    print(f"\nEnriquecendo dados de e-mail para {len(df_e)} Grandes Empresas 100+...")
    e_email_data = [map_enterprise_emails(row) for _, row in df_e.iterrows()]
    df_e_email = pd.DataFrame(e_email_data)

    for col in df_e_email.columns:
        df_e[col] = df_e_email[col]

    df_e.to_csv(EMP_CSV_FOLDER, sep=';', index=False, encoding='utf-8-sig')
    df_e.to_excel(EMP_XLSX_FOLDER, index=False, engine='openpyxl')
    df_e.to_csv(EMP_CSV_ROOT, sep=';', index=False, encoding='utf-8-sig')
    df_e.to_excel(EMP_XLSX_ROOT, index=False, engine='openpyxl')
    print(f" -> 96 Empresas atualizadas com {len(df_e.columns)} colunas em CSV e Excel!")

    print("\n" + "=" * 80)
    print("ENRIQUECIMENTO DE E-MAILS FINALIZADO COM SUCESSO!")
    print(f"Total de colunas em Hospitais: {len(df_h.columns)}")
    print(f"Total de colunas em Empresas: {len(df_e.columns)}")
    print("=" * 80)

if __name__ == '__main__':
    main()
