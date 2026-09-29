# -*- coding: utf-8 -*-
"""
scripts/generate_crm_prospecting_list.py
Gera a Fila Operacional de Prospecção para CRM e WhatsApp:
Filtra os motoristas qualificados com telefones e identificadores completos (CPF/CNPJ),
priorizando os contemplados de 2026 e motoristas da Zona Oeste/Butantã.
"""

import os
import re
import unicodedata
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
OUTPUT_DIR = BASE_DIR / "Novos Alvarás 2026"
OUTPUT_CSV = OUTPUT_DIR / "fila_prospeccao_crm_taxistas_2026.csv"
OUTPUT_XLSX = OUTPUT_DIR / "fila_prospeccao_crm_taxistas_2026.xlsx"

def norm_name(s):
    if not isinstance(s, str): return ''
    s = s.strip().upper()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return ' '.join(s.split())

def clean_mei_thorough(s):
    s = norm_name(s)
    s = re.sub(r'^[0-9\.\-\/\s]+', '', s)
    s = re.sub(r'[0-9\.\-\/\s]+$', '', s)
    sufs = [
        ' TRANSPORTE DE TAXI', ' SERVICOS DE TAXI', ' AUTO TAXI', ' TAXISTA', ' TAXIS',
        ' TRANSPORTES', ' TRANSPORTE', ' TAXI', ' LOCACAO', ' EIRELI', ' LTDA', ' ME', ' MEI', ' EPP'
    ]
    changed = True
    while changed:
        changed = False
        s = s.strip()
        for suf in sufs:
            if s.endswith(suf):
                s = s[:-len(suf)].strip()
                changed = True
    return s.strip()

def format_cpf(digits):
    d = re.sub(r'\D', '', str(digits))
    if len(d) == 11:
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"
    return ""

def format_phone(tel):
    t = re.sub(r'\D', '', str(tel))
    if len(t) == 10:
        return f"({t[:2]}) {t[2:6]}-{t[6:]}"
    elif len(t) == 11:
        return f"({t[:2]}) {t[2:7]}-{t[7:]}"
    return str(tel)

import urllib.parse

def format_first_name(nome_completo):
    if not isinstance(nome_completo, str) or not nome_completo.strip():
        return "Colega Taxista"
    parts = nome_completo.strip().split()
    if not parts:
        return "Colega Taxista"
    fn = parts[0].title()
    # Se primeiro nome for abreviação de 1 ou 2 letras, pega os dois primeiros
    if len(fn) <= 2 and len(parts) > 1:
        return f"{fn} {parts[1].title()}"
    return fn

def build_whatsapp_message(row, first_name):
    edital = str(row.get('Edital_Numero', '')).replace('.0', '').strip()
    status = str(row.get('Status_Sorteio_2026', '')).upper()
    categoria = str(row.get('Categoria_Veiculo', ''))
    dist_raw = str(row.get('MEI_Distancia_Sede_Chame_Taxi_km', '')).replace(',', '.')
    dist_val = 999.0
    try:
        dist_val = float(dist_raw)
    except Exception:
        pass
        
    suplente_status = str(row.get('Classificacao_Suplencia_Fila', ''))
    pos_fila = str(row.get('Posicao_Fila_Espera', '')).replace('.0', '')
    
    if edital == '4' or "Híbrido" in categoria or "Elétrico" in categoria:
        msg = f"Olá, {first_name}! Tudo bem? Parabéns pela contemplação no Edital 4 (Híbrido/Elétrico)! Sou da Cooperativa Chame Táxi (sede no Butantã). Preparamos uma assessoria especializada para homologação do seu veículo no DTP dentro do prazo de 90 dias. Gostaria de tirar dúvidas com a gente?"
    elif edital in ['6', '7', '8'] or "Acessível" in categoria:
        msg = f"Olá, {first_name}! Tudo bem? Parabéns pela contemplação do seu Alvará Acessível 2026! Sou da Cooperativa Chame Táxi. Temos convênios para adaptação com rampa Inmetro e alta demanda de corridas corporativas especiais. Vamos marcar um café aqui no Butantã?"
    elif edital == '3':
        msg = f"Olá, {first_name}! Tudo bem? Parabéns pela contemplação no Edital 3 (Mulheres Taxistas)! Sou da Cooperativa Chame Táxi. Temos condições e apoio especial para mulheres na praça, com corridas corporativas seguras. Gostaria de conhecer nossa estrutura no Butantã?"
    elif "CONTEMPLADO" in status:
        msg = f"Olá, {first_name}! Tudo bem? Parabéns pelo novo Alvará de Táxi 2026! Sou da Cooperativa Chame Táxi (Av. Vital Brasil, Butantã). Oferecemos suporte completo no DTP, isenção inicial de taxa e aplicativo corporativo. Podemos te ligar para explicar?"
    elif "Alta Probabilidade" in suplente_status:
        msg = f"Olá, {first_name}! Tudo bem? Vimos que você está na posição {pos_fila} da fila de espera do Edital {edital}. Pelo histórico de desistências no DTP, sua chamada é muito provável. A Chame Táxi já está orientando os suplentes prioritários para antecipar a documentação. Quer entender como funciona?"
    elif dist_val <= 7.0:
        msg = f"Olá, {first_name}! Tudo bem? Vimos seu cadastro de taxista aqui na Zona Oeste, bem perto da sede da Chame Táxi no Butantã. Gostaríamos de te convidar para um café aqui com nossa diretoria para conhecer as vantagens da cooperativa para taxistas da nossa região. O que acha?"
    else:
        msg = f"Olá, {first_name}! Tudo bem? Sou da Cooperativa Chame Táxi aqui de São Paulo. Gostaríamos de apresentar nossos benefícios para taxistas: taxas reduzidas, corridas de rádio táxi corporativo e aplicativo próprio. Podemos conversar?"
        
    encoded = urllib.parse.quote(msg)
    return msg, encoded

def build_pitch(row):
    status = str(row.get('Status_Sorteio_2026', ''))
    edital = str(row.get('Edital_Numero', ''))
    categoria = str(row.get('Categoria_Veiculo', ''))
    dist = row.get('MEI_Distancia_Sede_Chame_Taxi_km', '')
    
    if "Híbrido" in categoria or "Elétrico" in categoria or edital == "4":
        return "Oferecer suporte para homologação de Híbrido/Elétrico no DTP e condições especiais para frotas limpas."
    elif "Acessível" in categoria or edital in ["6", "7", "8"]:
        return "Oferecer suporte técnico para adaptação veicular acessível e convênio para corridas corporativas especiais."
    elif dist and dist != '—' and float(str(dist).replace(',', '.')) <= 10.0:
        return f"Motorista da Zona Oeste ({dist} km da sede): Convidar para café de integração no Butantã e cadastro no app."
    elif "CONTEMPLADO" in status:
        return "Parabenizar pela contemplação do novo alvará 2026 e oferecer suporte completo no DTP + ativação no rádio táxi."
    else:
        return "Apresentar benefícios da cooperativa Chame Táxi, redução de taxas e chamadas corporativas corporativas."

def main():
    print("=" * 80)
    print("GERANDO FILA OPERACIONAL DE PROSPECÇÃO COMERCIAL (CRM / WHATSAPP)")
    print("=" * 80)

    master_path = OUTPUT_DIR / "planilha_mestre_taxistas_sp_2026.csv"
    rf_path = PROCESSED_DIR / "taxistas_sp_cnae_receita_2026-09-14.csv"

    print("Lendo planilha mestre consolidada...")
    df = pd.read_csv(master_path, sep=';', low_memory=False)
    print(f"Total registros na base mestre: {len(df):,}")

    print("Indexando dados da Receita Federal para enriquecimento direto...")
    rf = pd.read_csv(rf_path, sep=';', low_memory=False)
    
    cpf_pattern = re.compile(r'\b(\d{11})\b')
    cnpj_prefix_pattern = re.compile(r'^(\d{2}\.\d{3}\.\d{3})')
    
    rf_lookup = {}
    for _, r in rf.iterrows():
        raw_rz = str(r.get('RAZAO_SOCIAL', ''))
        raw_nf = str(r.get('NOME_FANTASIA', ''))
        c1 = clean_mei_thorough(raw_rz)
        c2 = clean_mei_thorough(raw_nf)
        n1 = norm_name(raw_rz)
        n2 = norm_name(raw_nf)
        
        # Extrair CPF ou prefixo
        cpf_match = cpf_pattern.search(raw_rz)
        cpf_val = cpf_match.group(1) if cpf_match else ""
        
        info = {
            'cnpj': r.get('CNPJ', ''),
            'razao_social': raw_rz,
            'nome_fantasia': raw_nf,
            'situacao': r.get('SITUACAO_CADASTRAL', ''),
            'data_abertura': r.get('DATA_INICIO_ATIVIDADE', ''),
            'logradouro': r.get('LOGRADOURO', ''),
            'numero': r.get('NUMERO', ''),
            'bairro': r.get('BAIRRO', ''),
            'cep': r.get('CEP', ''),
            'telefone_1': r.get('TELEFONE_1', ''),
            'telefone_2': r.get('TELEFONE_2', ''),
            'email': r.get('CORREIO_ELETRONICO', ''),
            'cpf_completo': cpf_val
        }
        
        for k in [c1, c2, n1, n2]:
            if k and len(k.split()) >= 2 and k not in rf_lookup:
                rf_lookup[k] = info

    print(f"Indexados {len(rf_lookup):,} nomes comerciais da Receita Federal.")

    # Cruzar e filtrar apenas quem tem telefone
    crm_rows = []
    
    for idx, row in df.iterrows():
        nome_norm = norm_name(row.get('Nome_Completo', ''))
        
        # Obter telefone existente
        t1 = str(row.get('Telefone_Celular_1', '')).strip()
        t2 = str(row.get('Telefone_Celular_2', '')).strip()
        cpf_val = ""
        
        rf_match = rf_lookup.get(nome_norm)
        if rf_match:
            if not t1 or t1 in ['—', 'nan', '']:
                t1 = str(rf_match.get('telefone_1', '')).strip()
            if not t2 or t2 in ['—', 'nan', '']:
                t2 = str(rf_match.get('telefone_2', '')).strip()
            cpf_val = rf_match.get('cpf_completo', '')
            
        # Limpar telefones
        t1_clean = re.sub(r'\D', '', t1)
        t2_clean = re.sub(r'\D', '', t2)
        
        # Filtro: pelo menos um telefone válido
        if len(t1_clean) < 8 and len(t2_clean) < 8:
            continue
            
        # Determinar canal WhatsApp preferencial e mensagem personalizada pronta
        tel_principal = t1_clean if len(t1_clean) >= 10 else t2_clean
        pri_nome = format_first_name(row.get('Nome_Completo', ''))
        msg_texto, msg_encoded = build_whatsapp_message(row, pri_nome)
        
        link_whatsapp_direto = f"https://wa.me/55{tel_principal}" if len(tel_principal) in [10, 11] else ""
        link_whatsapp_pronto = f"https://wa.me/55{tel_principal}?text={msg_encoded}" if len(tel_principal) in [10, 11] else ""
        
        # Montar registro para CRM com funil operacional
        crm_record = {
            'ID_Master': row.get('ID_Master', ''),
            'Nome_Motorista': row.get('Nome_Completo', ''),
            'CPF_Completo': format_cpf(cpf_val) if cpf_val else str(row.get('CPF_Identificado', '—')),
            'Telefone_Principal': format_phone(tel_principal),
            'Telefone_Secundario': format_phone(t2_clean) if len(t2_clean) >= 8 else "—",
            'Link_WhatsApp_Mensagem_Pronta': link_whatsapp_pronto,
            'Link_Direto_WhatsApp': link_whatsapp_direto,
            'Texto_Mensagem_WhatsApp': msg_texto,
            'Status_Funil_CRM': "1 - Novo Lead",
            'Data_Primeiro_Contato': "",
            'Operador_Responsavel': "",
            'Resultado_Contato': "",
            'Data_Agendamento_Visita': "",
            'Historico_Observacoes': "",
            'Email': rf_match.get('email', '') if rf_match and rf_match.get('email') else row.get('Email_Principal', '—'),
            'Status_Alvara_2026': row.get('Status_Sorteio_2026', ''),
            'Edital_Numero': row.get('Edital_Numero', ''),
            'Edital_Descricao': row.get('Edital_Descricao', ''),
            'Categoria_Veiculo': row.get('Categoria_Veiculo', ''),
            'Processo_SEI_DTP': row.get('Processo_SEI_DTP', '—'),
            'Publicacao_DOC': row.get('Publicacao_DOC_Possui', '—'),
            'Exigencia_Veiculo_DTP': row.get('Exigencia_Veiculo_DTP', '—'),
            'Modelos_Homologados_Recomendados': row.get('Modelos_Homologados_Recomendados', '—'),
            'Score_Chame_Taxi': row.get('Score_Chame_Taxi', 50),
            'Tier_Prioridade': row.get('Tier_Prioridade_Comercial', 'Tier 2'),
            'Distancia_Sede_Butanta_km': row.get('MEI_Distancia_Sede_Chame_Taxi_km', '—'),
            'Regiao_Macro': row.get('MEI_Regiao_Macro', '—'),
            'Script_Comercial_Sugerido': build_pitch(row),
            'Bairro_Atuacao': rf_match.get('bairro', '') if rf_match and rf_match.get('bairro') else row.get('MEI_Bairro', 'São Paulo'),
            'Endereco_MEI': f"{rf_match.get('logradouro', '')}, {rf_match.get('numero', '')}" if rf_match and rf_match.get('logradouro') else "—",
            'CEP': rf_match.get('cep', '') if rf_match and rf_match.get('cep') else row.get('CEP', '—'),
            'CNPJ_MEI': rf_match.get('cnpj', '') if rf_match and rf_match.get('cnpj') else row.get('MEI_CNPJ', '—'),
            'Razao_Social_MEI': rf_match.get('razao_social', '') if rf_match and rf_match.get('razao_social') else row.get('MEI_Razao_Social', '—'),
            'Cadastro_Condutax': row.get('Cadastro_DTP_Condutax', '—'),
            'Ponto_Privativo': row.get('Vinculo_Ponto_Privativo', '—'),
            'Link_DOC_Pesquisa': row.get('Link_Pesquisa_DOC_SP', ''),
        }
        crm_rows.append(crm_record)

    crm_df = pd.DataFrame(crm_rows)
    print(f"\nTotal de Motoristas Qualificados com Telefone para Prospecção: {len(crm_df):,}")
    
    # Ordenar por Prioridade (Tier 1 primeiro, depois Score descendente)
    tier_weights = {
        'Tier 1 (Prioridade Máxima / Score >= 80)': 1,
        'Tier 2 (Prioridade Alta / Score 65-79)': 2,
        'Tier 3 (Prioridade Média / Score 50-64)': 3,
        'Tier 4 (Base Ampla / Score < 50)': 4
    }
    crm_df['tier_order'] = crm_df['Tier_Prioridade'].map(tier_weights).fillna(9)
    crm_df['score_num'] = pd.to_numeric(crm_df['Score_Chame_Taxi'], errors='coerce').fillna(0)
    crm_df.sort_values(by=['tier_order', 'score_num'], ascending=[True, False], inplace=True)
    crm_df.drop(columns=['tier_order', 'score_num'], inplace=True)

    print("\nDistribuição por Status de Alvará:")
    print(crm_df['Status_Alvara_2026'].value_counts())
    
    print("\nDistribuição por Tier de Prospecção:")
    print(crm_df['Tier_Prioridade'].value_counts())

    # Salvar CSV e XLSX
    print(f"\nSalvando CSV: {OUTPUT_CSV}")
    crm_df.to_csv(OUTPUT_CSV, sep=';', index=False, encoding='utf-8-sig')

    print(f"Salvando Excel: {OUTPUT_XLSX}")
    with pd.ExcelWriter(OUTPUT_XLSX, engine='openpyxl') as writer:
        crm_df.to_excel(writer, sheet_name='Fila_Prospeccao_CRM', index=False)

    print("=" * 80)
    print("FILA DE PROSPECÇÃO COMERCIAL GERADA COM SUCESSO!")
    print(f"-> CSV: {OUTPUT_CSV}")
    print(f"-> Excel: {OUTPUT_XLSX}")
    print("=" * 80)

if __name__ == "__main__":
    main()
