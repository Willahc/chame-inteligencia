# -*- coding: utf-8 -*-
"""
scripts/enrich_decision_makers_corporate.py
Mapeia e enriquece os 190 clientes corporativos (94 Hospitais e 96 Grandes Empresas 100+ no raio de 5 km)
com os responsáveis por contratação de mobilidade corporativa:
- Área Decisora Principal (Compras Indiretas, Suprimentos, Facilities, Supply Chain, Desospitalização, RH/Benefícios/Viagens)
- Cargos-Alvo dos Decisores (Diretores, Gerentes, Heads, Coordenadores)
- Lideranças e Contatos Conhecidos / Canais Oficiais de Homologação
- Link de Busca Direta de Pessoas no LinkedIn (com operadores booleanos pré-configurados)
- Link de Busca no Google Dork (site:linkedin.com/in) para visualização imediata de perfis públicos com nomes e cargos
- Canal de Abordagem Comercial Recomendado
- Script Personalizado de Abordagem para InMail / Conexão no LinkedIn
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
import re

def clean_company_name_for_search(company_name):
    orig = str(company_name).strip()
    special_cases = {
        "Delboni Auriemo Medicina Diagnóstica - Unidade Butantã": "Delboni Auriemo",
        "Hospital Luz Butantã": "Hospital Luz",
        "Centro de Saúde Escola Samuel Barnsley Pessoa": "Centro de Saúde Escola Samuel Barnsley Pessoa",
        "Coordenadoria Regional De Saúde Oeste (Uvis Lapa Pinheiros Vigilância Ambiental)": "Coordenadoria Regional De Saúde Oeste",
        "Hospital Vital Brazil (Instituto Butantan)": "Hospital Vital Brazil",
        "Hospital Sancta Maggiore - Unidade Rússia": "Hospital Sancta Maggiore",
        "Hospital Sancta Maggiore Butantã (Prevent Senior)": "Hospital Sancta Maggiore",
        "Unidade Básica de Saúde Nancy Abranches": "UBS Nancy Abranches",
        "Pronto Atendimento e Especialidades Butantã (AMA / UBS)": "AMA UBS Butantã",
        "CEMA Hospital da Visão (Unidade Shopping Eldorado)": "CEMA Hospital da Visão",
        "Hospital Israelita Albert Einstein (Unidade Morumbi Sede)": "Hospital Albert Einstein",
        "Hospital Sírio-Libanês (Unidade Itaim)": "Hospital Sírio-Libanês",
        "Hospital das Clínicas da FMUSP (HCFMUSP)": "Hospital das Clínicas FMUSP",
        "InCor - Instituto do Coração (HCFMUSP)": "InCor Instituto do Coração",
        "ICESP - Instituto do Câncer do Estado de São Paulo": "ICESP Instituto do Câncer",
        "Hospital Alemão Oswaldo Cruz (Unidade Referência)": "Hospital Alemão Oswaldo Cruz",
        "Hospital Nove de Julho": "Hospital Nove de Julho",
        "Hospital Santa Catarina (Paulista)": "Hospital Santa Catarina",
        "Hospital Samaritano Higienópolis": "Hospital Samaritano",
        "Hospital São Luiz Morumbi (Rede D'Or)": "Hospital São Luiz Morumbi",
        "Hospital São Luiz Itaim (Rede D'Or)": "Hospital São Luiz",
        "Hospital Infantil Sabará": "Hospital Sabará Infantil",
        "WeWork Pinheiros (Edifício Butantã)": "WeWork Pinheiros",
        "Loft Tecnologia": "Loft",
        "Instituto Butantan (Complexo Industrial & Biofármacos)": "Instituto Butantan",
        "SiqueiraCastro Advogados": "SiqueiraCastro Advogados",
        "Complexo Shopping Eldorado & Eldorado Business Tower": "Shopping Eldorado",
        "Deloitte Brasil (Eldorado Business Tower)": "Deloitte Brasil",
        "Accenture Brasil (Eldorado Business Tower)": "Accenture Brasil",
        "WeWork Rebouças": "WeWork Rebouças",
        "Unilever Brasil (Sede Pinheiros)": "Unilever Brasil",
        "Editora Abril / Edifício Victor Civita": "Editora Abril",
        "Bayer Brasil (Complexo Socorro/Pinheiros)": "Bayer Brasil",
        "B3 - Brasil, Bolsa, Balcão (Sede Operacional)": "B3 Bolsa",
        "Prevent Senior / Hospital Sancta Maggiore Butantã": "Prevent Senior",
        "Prevent Senior Operadora de Saúde": "Prevent Senior",
        "Hospital São Camilo Pompeia": "Hospital São Camilo",
        "Beneficência Portuguesa de São Paulo (BP)": "Beneficência Portuguesa BP",
        "Hospital Alvorada Moema": "Hospital Alvorada",
        "Hospital Metropolitano Lapa": "Hospital Metropolitano",
        "Hospital Leforte Morumbi": "Hospital Leforte",
        "Hospital Santa Paula": "Hospital Santa Paula",
        "Hospital Moriah": "Hospital Moriah",
        "Hospital e Maternidade São Cristóvão": "Hospital São Cristóvão"
    }
    if orig in special_cases:
        return special_cases[orig]
    
    c = orig
    c = re.sub(r'\s*\([^)]*?(?:unidade|sede|matriz|complexo|edifício|edificio|antigo|holding|prevent|dtp|shopping)[^)]*?\)', '', c, flags=re.IGNORECASE).strip()
    c = re.sub(r'\s*\([^)]*?\)$', '', c).strip()
    sufixos = [
        r'-\s*Unidade.*$', r'-\s*Sede.*$', r'-\s*Matriz.*$', r'-\s*Filial.*$',
        r'-\s*Complexo.*$', r'-\s*Edifício.*$', r'-\s*Edificio.*$', r'-\s*Campus.*$',
        r'-\s*Bloco.*$', r'/\s*Edifício.*$', r'/\s*Unidade.*$', r'/\s*Hospital.*$',
        r'-\s*São Paulo.*$', r'-\s*SP.*$'
    ]
    for s in sufixos:
        c = re.sub(s, '', c, flags=re.IGNORECASE).strip()
    c = re.sub(r'\b(S\.?A\.?|Ltda\.?|Eireli|MEI|EPP)\b', '', c, flags=re.IGNORECASE).strip()
    c = re.sub(r'[\-\/&]\s*$', '', c).strip()
    c = re.sub(r'^\s*[\-\/&]', '', c).strip()
    c = re.sub(r'\s+', ' ', c).strip()
    if len(c) < 3:
        c = orig.split('(')[0].split('-')[0].strip()
    return c

def build_search_urls(company_name, is_hospital=False):
    clean_name = clean_company_name_for_search(company_name)
    
    if is_hospital:
        # Busca no Google para encontrar perfis públicos do LinkedIn (sem barreira de login)
        google_query = f'site:linkedin.com/in "{clean_name}" (compras OR suprimentos OR procurement OR facilities)'
        # Busca direta no LinkedIn Web (limpa, usando /all/ para não travar o React router do LinkedIn)
        linkedin_query = f'{clean_name} compras suprimentos'
    else:
        google_query = f'site:linkedin.com/in "{clean_name}" (compras OR suprimentos OR procurement OR facilities OR "supply chain")'
        linkedin_query = f'{clean_name} compras suprimentos facilities'
    
    google_url = f'https://www.google.com/search?q={urllib.parse.quote_plus(google_query)}'
    linkedin_url = f'https://www.linkedin.com/search/results/all/?keywords={urllib.parse.quote_plus(linkedin_query)}'
    
    return clean_name, google_url, linkedin_url

def map_hospital_decision_maker(row):
    nome = str(row.get('Nome_Instituicao', '')).strip()
    grupo = str(row.get('Grupo_Mantenedor', '')).strip()
    tipo = str(row.get('Tipo_Estabelecimento', '')).strip()
    dor = str(row.get('Gargalo_Dor_Atual', ''))
    
    clean_name, google_url, linkedin_url = build_search_urls(nome, is_hospital=True)
    nome_up = nome.upper()
    
    # 1. Albert Einstein
    if 'EINSTEIN' in nome_up:
        area = "Suprimentos, Logística & Compras Indiretas / Desospitalização"
        cargos = "Diretor Executivo de Suprimentos & Logística | Gerente Sênior de Compras Indiretas | Coordenação de Desospitalização & Regulação"
        lideres = "Gustavo Guacelli Taboas (Diretor Suprimentos) | Felipe Falone (Ger. Sênior Compras Indiretas) | Central de Suprimentos Einstein"
        canal = "LinkedIn InMail para Felipe Falone + Contato com Coordenação de Altas e Desospitalização"
        script = (
            f"Olá [Nome], acompanho o trabalho de excelência do Albert Einstein. Observamos um gargalo comum em complexos de grande porte: o custo e a lentidão de ambulâncias simples para desospitalização de pacientes estáveis. A Cooperativa Chame Táxi (sediada no Butantã a 3km) conta com nova frota de táxis acessíveis com rampa homologados pela PMSP para acelerar altas hospitalares com custo até 60% menor e faturamento B2B consolidado. Podemos agendar 15 minutos para apresentar os termos de convênio?"
        )
    # 2. Sírio-Libanês
    elif 'SÍRIO' in nome_up or 'SIRIO' in nome_up:
        area = "Logística, Infraestrutura & Facilities (Núcleo ESG) / Compras Indiretas"
        cargos = "Gerente de Compras Indiretas | Gerente de Facilities & Logística | Central de Cadastro de Fornecedores"
        lideres = "Diretoria de Logística & Facilities | compras.indiretos@hsl.org.br | gestaodefornecedores@hsl.org.br"
        canal = "Apresentação formal via e-mail oficial (compras.indiretos@hsl.org.br) + InMail LinkedIn para Gerência de Compras Indiretas"
        script = (
            f"Olá [Nome], tudo bem? Trabalho na gestão corporativa da Cooperativa Chame Táxi. Sabemos do compromisso do Sírio-Libanês com ESG e eficiência operacional. Disponibilizamos frotas híbridas/elétricas e táxis acessíveis para deslocamento ágil de equipes médicas e pacientes em desospitalização, com faturamento corporativo quinzenal e trânsito livre nos corredores exclusivos de ônibus de SP. Gostaria de encaminhar nossa apresentação institucional para compras indiretas."
        )
    # 3. Rede D'Or São Luiz (Morumbi, Itaim)
    elif 'SÃO LUIZ' in nome_up or 'SAO LUIZ' in nome_up or "REDE D'OR" in nome_up:
        area = "Procurement & Suprimentos Corporativos Rede D'Or / Facilities Hospitalares"
        cargos = "Diretor / Gerente de Suprimentos Corporativos | Gerente de Compras Indiretas | Coordenador de Hotelaria & Facilities"
        lideres = "Diretoria de Suprimentos Rede D'Or São Luiz | Central de Compras de Serviços | Regulação de Leitos"
        canal = "LinkedIn InMail para Gerente de Compras Indiretas Rede D'Or + Reunião na unidade Morumbi"
        script = (
            f"Olá [Nome], tudo bem? Atuo na Chame Táxi, localizada no Butantã próximo ao Hospital São Luiz Morumbi. Estruturamos uma solução de mobilidade dedicada para o hospital: vouchers corporativos sem tarifa dinâmica para plantonistas noturnos e táxis acessíveis para altas médicas agilizadas. Podemos conversar brevemente sobre como homologar nossa cooperativa como prestadora credenciada?"
        )
    # 4. HCFMUSP / Instituto do Coração / ICESP / IOT
    elif any(k in nome_up for k in ['CLÍNICAS', 'CLINICAS', 'INCOR', 'ICESP', 'IOT', 'HCFMUSP']):
        area = "Divisão de Suprimentos & Compras FFM (Fundação Faculdade de Medicina) / Regulação HC"
        cargos = "Diretor de Suprimentos FFM | Gerente de Compras e Contratos | Coordenação de Remoções e Desospitalização HC"
        lideres = "Divisão de Suprimentos FFM | Central de Compras do HCFMUSP | Serviço Social e Regulação de Leitos"
        canal = "Cadastramento de Fornecedor na Fundação Faculdade de Medicina (FFM) + Contato com Serviço Social"
        script = (
            f"Prezado(a) [Nome], a Chame Táxi está sediada a poucos minutos do complexo do HCFMUSP. Dispomos da maior frota cooperada de táxis acessíveis com rampa homologados pela Prefeitura de SP, ideais para desafogar a demanda de transporte de pacientes em alta e pós-consultas ambulatoriais, além de transporte de plantonistas. Gostaríamos de apresentar proposta para credenciamento junto à FFM."
        )
    # 5. Prevent Senior / Sancta Maggiore
    elif 'PREVENT' in nome_up or 'SANCTA' in nome_up:
        area = "Diretoria de Operações & Atendimento / Credenciamento de Prestadores de Mobilidade"
        cargos = "Gerente de Operações | Coordenador de Credenciamento e Fornecedores | Serviço Social / Linha Sênior"
        lideres = "Diretoria de Operações Prevent Senior | Central de Credenciamento | Gestão Hospitalar Morumbi/Butantã"
        canal = "Apresentação direta à Gerência de Operações da Prevent Senior + Visita às unidades Sancta Maggiore Morumbi/Butantã"
        script = (
            f"Olá [Nome], tudo bem? Atuo na Chame Táxi. Sabemos que o público sênior da Prevent Senior enfrenta constantes cancelamentos e dificuldades com motoristas de app convencionais. Criamos uma linha de atendimento humanizado com motoristas cooperados treinados para assistência ao idoso e táxis adaptados, com canal exclusivo de despacho para os hospitais Sancta Maggiore. Gostaria de agendar uma breve conversa com sua equipe de operações."
        )
    # 6. Lefort / Santa Paula / Metropolitano / Dasa
    elif any(k in nome_up for k in ['LEFORT', 'SANTA PAULA', 'METROPOLITANO', 'DASA']):
        area = "Suprimentos & Procurement Corporativo Grupo Dasa / Facilities Hospitalar"
        cargos = "Head de Suprimentos Dasa | Gerente de Compras Indiretas | Gerente de Facilities & Hotelaria"
        lideres = "Diretoria de Suprimentos Corporativos Dasa | Gerência de Compras de Serviços | Regulação Lefort Morumbi"
        canal = "Portal de Fornecedores Dasa + InMail LinkedIn para Gerência de Compras Indiretas"
        script = (
            f"Olá [Nome], a Chame Táxi desenvolveu um modelo de mobilidade hospitalar sob medida para unidades do grupo Dasa (Lefort e Santa Paula), com táxis acessíveis para desospitalização sem custo de ambulância e vouchers corporativos sem cancelamento para equipes médicas. Como podemos iniciar o processo de homologação de fornecedores?"
        )
    # 7. Centros de Reabilitação (Lucy Montoro, AACD, Darcy Vargas)
    elif any(k in nome_up for k in ['MONTORO', 'AACD', 'DARCY', 'REABILITAÇÃO', 'REABILITACAO']):
        area = "Serviço Social & Transporte Sanitário Acessível / Compras Administrativas"
        cargos = "Coordenador de Transporte & Desospitalização | Assistente Social Chefe | Gerente de Suprimentos"
        lideres = "Gerência Administrativa | Serviço Social IMREA/AACD | Coordenação de Fisioterapia e Reabilitação"
        canal = "Reunião presencial com a Assistência Social e Coordenação Administrativa"
        script = (
            f"Prezado(a) [Nome], represento a Cooperativa Chame Táxi. Recebemos novos alvarás de táxis acessíveis com rampa homologados pela PMSP e temos como prioridade atender pacientes em tratamento contínuo de reabilitação. Oferecemos agendamento pontual, motoristas treinados para embarque em cadeira de rodas e faturamento corporativo. Gostaríamos de apresentar essa solução para sua coordenação."
        )
    # 8. Centros Diagnósticos (Delboni, Fleury, Alta, Lavoisier)
    elif any(k in nome_up for k in ['DELBONI', 'FLEURY', 'ALTA', 'LAVOISIER', 'A+ MEDICINA', 'DIAGNÓSTIC', 'DIAGNOSTIC']):
        area = "Facilities & Operações de Atendimento Diagnóstico / Compras Indiretas"
        cargos = "Gerente de Facilities & Operações de Unidades | Compras Indiretas | Supervisor de Atendimento ao Paciente"
        lideres = "Gerência de Facilities Grupo Fleury/Dasa | Supervisores de Unidade (Faria Lima, Morumbi, Butantã)"
        canal = "Contato com Supervisor de Atendimento da Unidade + InMail LinkedIn para Compras Indiretas"
        script = (
            f"Olá [Nome], pacientes de exames com sedação necessitam de transporte seguro e imediato na saída da unidade diagnóstica. A Chame Táxi oferece totens de chamada ágil no balcão e integração com o sistema da clínica, garantindo que o paciente saia acompanhado de motorista cooperado profissional. Gostaria de apresentar a proposta para suas unidades da Zona Oeste/Sul."
        )
    # 9. Hospitais Gerais, Clínicas e AMAs
    else:
        area = "Compras, Suprimentos & Administração Hospitalar"
        cargos = "Gerente Administrativo | Coordenador de Compras e Suprimentos | Responsável de Facilities"
        lideres = "Administração da Unidade / Central de Compras e Atendimento"
        canal = "Visita presencial do consultor comercial Chame Táxi à administração da unidade"
        script = (
            f"Olá [Nome], sou da Cooperativa Chame Táxi, sediada próxima à sua unidade. Oferecemos faturamento quinzenal para corridas corporativas, táxis acessíveis e vouchers para funcionários que realizam plantão noturno. Gostaria de agendar 10 minutos para apresentar a tabela de convênio corporativo."
        )
        
    return {
        "Area_Decisora_Principal": area,
        "Cargos_Alvo_Decisores": cargos,
        "Nomes_Liderancas_Mapeadas": lideres,
        "Canal_Contato_Recomendado": canal,
        "Link_Busca_LinkedIn_Decisores": linkedin_url,
        "Link_Busca_Google_Decisores": google_url,
        "Script_Abordagem_LinkedIn": script
    }

def map_enterprise_decision_maker(row):
    nome = str(row.get('Nome_Empresa', '')).strip()
    setor = str(row.get('Setor_Economico', '')).strip()
    edificio = str(row.get('Edificio_Sede_Complexo', '')).strip()
    colab = str(row.get('Faixa_Colaboradores', ''))
    
    clean_name, google_url, linkedin_url = build_search_urls(nome, is_hospital=False)
    nome_up = nome.upper()
    setor_up = setor.upper()
    
    # 1. Big Techs & Startups
    if any(k in nome_up for k in ['GOOGLE', 'META', 'FACEBOOK', 'NUBANK', 'QUINTOANDAR', 'STONE', 'AMAZON', 'AWS', 'SHOPEE', 'MERCADO LIVRE', 'TIKTOK', 'BYTEDANCE', 'MICROSOFT']):
        area = "Workplace & Facilities Management / Strategic Sourcing / Total Rewards"
        cargos = "Head of Workplace | Facilities Manager | Procurement & Strategic Sourcing Lead | Travel & Mobility Specialist"
        lideres = f"Liderança de Workplace & Facilities Brasil | Procurement Specialist {clean_name}"
        canal = "LinkedIn InMail para Head of Workplace ou Procurement Manager + Pitch de Faixa Exclusiva de Ônibus"
        script = (
            f"Olá [Nome], tudo bem? Acompanho a atuação do time de Workplace da {clean_name}. Empresas de tecnologia em SP sofrem com o tempo perdido de colaboradores travados no trânsito em carros de app comuns e cancelamentos na chuva. A Chame Táxi opera com táxis homologados com acesso total às faixas e corredores de ônibus da PMSP, reduzindo trajetos em até 40%, sem tarifa dinâmica predatória e com faturamento corporativo integrado. Vamos marcar um café rápido de 15 min?"
        )
    # 2. Grandes Bancos, Financeiras & Asset Management
    elif any(k in nome_up for k in ['ITAÚ', 'ITAU', 'SANTANDER', 'BTG', 'SAFRA', 'XP', 'JP MORGAN', 'B3', 'BRADESCO', 'CITIBANK', 'CREDIT SUISSE', 'UBS']):
        area = "Superintendência de Suprimentos & Compras Indiretas / Gestão de Facilities & Viagens"
        cargos = "Superintendente de Compras Indiretas | Head de Facilities & Real Estate | Gestor de Viagens Corporativas (Travel Manager)"
        lideres = f"Superintendência de Suprimentos {clean_name} | Gerência de Contratos de Facilities Faria Lima/Berrini"
        canal = "InMail LinkedIn para Gerência de Compras Indiretas + Apresentação formal para processo de RFP de Transporte"
        script = (
            f"Olá [Nome], tudo bem? Trabalho na Cooperativa Chame Táxi. Sabemos da exigência do {clean_name} por pontualidade em deslocamentos para aeroportos (Congonhas/Guarulhos) e segurança no retorno noturno de analistas. Oferecemos frota moderna com trânsito em faixas de ônibus exclusivas, SLA de atendimento garantido e faturamento faturado corporativo. Gostaria de enviar nosso material institucional para sua área de Compras/Facilities."
        )
    # 3. Indústrias & Bens de Consumo (ESG, Metas Globais de Descarbonização)
    elif any(k in nome_up for k in ['AMBEV', 'UNILEVER', 'JOHNSON', 'BAYER', 'P&G', 'NOVARTIS', 'RAÍZEN', 'RAIZEN', 'NESTLÉ', 'NESTLE', 'NATURA', 'BASF']):
        area = "Vice-Presidência de Suprimentos / Supply Chain / Facilities & Sustentabilidade ESG"
        cargos = "Diretor / VP de Suprimentos | Head de Procurement | Facilities & Fleet Manager | Líder de Sustentabilidade & ESG"
        if 'AMBEV' in nome_up:
            lideres = "Felipe Moreira Haddad Baruque (Diretor VP Suprimentos) | Gerência de Compras Indiretas"
        elif 'UNILEVER' in nome_up:
            lideres = "Liderança de Supply Chain & Procurement Brasil (Fabio Pollice / Sourcing Leads) | Workplace Solutions"
        else:
            lideres = f"Diretoria de Suprimentos & Procurement {clean_name} | Gerência de Facilities e Frotas"
        canal = "InMail LinkedIn para Gerência de Compras Indiretas / Facilities + Pitch de Descarbonização de Frotas (Edital 4)"
        script = (
            f"Olá [Nome], tudo bem? A Chame Táxi estruturou uma solução corporativa alinhada aos compromissos de ESG e redução de pegada de carbono da {clean_name}: disponibilizamos frota de veículos 100% elétricos e híbridos (Edital 4 da Prefeitura de SP) com relatório mensal auditável de emissões evitadas para frotas corporativas. Podemos apresentar nosso case para sua equipe de Suprimentos/Facilities?"
        )
    # 4. Big Four, Consultorias Estratégicas & Auditoria
    elif any(k in nome_up for k in ['PWC', 'EY', 'DELOITTE', 'KPMG', 'MCKINSEY', 'BCG', 'BAIN', 'ACCENTURE']):
        area = "Procurement & Indirect Sourcing / Facilities & Corporate Travel Management"
        cargos = "Head of Procurement | Corporate Travel Manager | Gerente de Facilities & Real Estate | Strategic Sourcing Lead"
        lideres = f"Gerência de Compras Indiretas {clean_name} | Coordenação de Viagens Corporativas & Facilities Brasil"
        canal = "InMail LinkedIn para Corporate Travel Manager / Facilities Manager + Apresentação de Tabela Corporativa"
        script = (
            f"Olá [Nome], tudo bem? Consultores da {clean_name} perdem horas críticas no trânsito entre clientes, escritórios e o Aeroporto de Congonhas. A Chame Táxi garante trânsito livre nos corredores exclusivos de ônibus da Capital, pontualidade britânica para voos e faturamento B2B centralizado por centro de custo/projeto. Gostaria de apresentar nossos planos corporativos."
        )
    # 5. Grandes Bancas de Advocacia
    elif any(k in nome_up for k in ['PINHEIRO NETO', 'MATTOS FILHO', 'MACHADO MEYER', 'DEMAREST', 'TOZZINIFREIRE', 'LEFOSSE', 'BMA', 'SOUZA CESCON']):
        area = "Diretoria Administrativa / Gerência de Facilities & Operações de Backoffice"
        cargos = "Diretor Administrativo | Gerente de Facilities & Infraestrutura | Coordenador de Serviços Gerais & Apoio Noturno"
        lideres = f"Diretoria Executiva Administrativa {clean_name} | Gerência Predial & Facilities"
        canal = "Contato direto com Gerência de Facilities / Administração Predial da banca"
        script = (
            f"Olá [Nome], tudo bem? Sabemos da intensidade das operações da {clean_name} e da necessidade de retorno noturno seguro e confortável para advogados e estagiários. A Chame Táxi oferece vouchers eletrônicos com trava de horário/destino, faturamento mensal detalhado e motoristas profissionais cadastrados no DTP, sem cancelamentos. Podemos agendar uma apresentação de 10 minutos?"
        )
    # 6. Edifícios Corporativos, Shoppings e Coworkings
    elif any(k in nome_up for k in ['SHOPPING', 'ELDORADO', 'IGUATEMI', 'JK', 'CIDADE JARDIM', 'WEWORK', 'CENU', 'ROCHAVERÁ', 'WTORRE']):
        area = "Administração Condominial / Gestão de Facilities & Operações Prediais"
        cargos = "Superintendente do Edifício / Shopping | Gerente de Operações e Facilities | Coordenador de Estacionamento & Acesso"
        lideres = f"Administração Condominial {clean_name} | Gerência Predial & Operações"
        canal = "Visita presencial do gerente de novos negócios Chame Táxi à administração predial"
        script = (
            f"Olá [Nome], a Chame Táxi tem sua sede central no Butantã e atende de forma prioritária o complexo {clean_name}. Queremos propor um convênio de mobilidade e ponto prioritário para os lojistas, executivos e condôminos, com desconto corporativo e despacho rápido de frotas executivas e acessíveis. Quando podemos conversar pessoalmente?"
        )
    # 7. Demais Grandes Empresas
    else:
        area = "Compras Indiretas, Suprimentos & Facilities"
        cargos = "Gerente de Compras Indiretas | Gerente de Facilities & Serviços | Coordenador de Recursos Humanos / Benefícios"
        lideres = f"Central de Compras & Suprimentos {clean_name} | Gerência de Facilities"
        canal = "InMail LinkedIn para Gerência de Compras Indiretas ou Facilities"
        script = (
            f"Olá [Nome], tudo bem? Atuo na Cooperativa Chame Táxi. Oferecemos soluções corporativas sob medida para a {clean_name}: eliminação da tarifa dinâmica de apps convencionais, trânsito nas faixas exclusivas de ônibus de SP para reuniões e faturamento mensal centralizado com relatório por centro de custo. Gostaria de enviar nossa proposta de convênio empresarial."
        )
        
    return {
        "Area_Decisora_Principal": area,
        "Cargos_Alvo_Decisores": cargos,
        "Nomes_Liderancas_Mapeadas": lideres,
        "Canal_Contato_Recomendado": canal,
        "Link_Busca_LinkedIn_Decisores": linkedin_url,
        "Link_Busca_Google_Decisores": google_url,
        "Script_Abordagem_LinkedIn": script
    }

def main():
    print("=" * 80)
    print("MAPEAMENTO DE DECISORES DE MOBILIDADE B2B (COMPRAS, SUPRIMENTOS, FACILITIES)")
    print("Hospitais (94) e Grandes Empresas (96) - Raio de 5 km da Cooperativa Chame Táxi")
    print("=" * 80)

    # 1. Enriquecer Hospitais
    if HOSP_CSV_FOLDER.exists():
        df_h = pd.read_csv(HOSP_CSV_FOLDER, sep=';', low_memory=False)
    else:
        df_h = pd.read_csv(HOSP_CSV_ROOT, sep=';', low_memory=False)

    print(f"\nEnriquecendo dados de decisores para {len(df_h)} Polos Hospitalares...")
    h_dec_data = [map_hospital_decision_maker(row) for _, row in df_h.iterrows()]
    df_h_dec = pd.DataFrame(h_dec_data)

    for col in df_h_dec.columns:
        df_h[col] = df_h_dec[col]

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

    print(f"\nEnriquecendo dados de decisores para {len(df_e)} Grandes Empresas 100+...")
    e_dec_data = [map_enterprise_decision_maker(row) for _, row in df_e.iterrows()]
    df_e_dec = pd.DataFrame(e_dec_data)

    for col in df_e_dec.columns:
        df_e[col] = df_e_dec[col]

    df_e.to_csv(EMP_CSV_FOLDER, sep=';', index=False, encoding='utf-8-sig')
    df_e.to_excel(EMP_XLSX_FOLDER, index=False, engine='openpyxl')
    df_e.to_csv(EMP_CSV_ROOT, sep=';', index=False, encoding='utf-8-sig')
    df_e.to_excel(EMP_XLSX_ROOT, index=False, engine='openpyxl')
    print(f" -> 96 Empresas atualizadas com {len(df_e.columns)} colunas em CSV e Excel!")

    print("\n" + "=" * 80)
    print("MAPEAMENTO CONCLUÍDO COM SUCESSO!")
    print(f"Total de colunas em Hospitais: {len(df_h.columns)}")
    print(f"Total de colunas em Empresas: {len(df_e.columns)}")
    print("=" * 80)

if __name__ == '__main__':
    main()
