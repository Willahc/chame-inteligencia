# -*- coding: utf-8 -*-
"""
scripts/enrich_mobility_services_corporate.py
Enriquece a base de 94 Hospitais e 96 Grandes Empresas (190 prospects corporativos B2B)
com mapeamento de serviços de mobilidade atuais, fornecedores prováveis, principais gargalos/dores,
nível de vulnerabilidade contratual e estratégias comerciais de ataque/substituição para a Cooperativa Chame Táxi.
"""

import os
import pandas as pd
from pathlib import Path

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

def classify_hospital_mobility(row):
    nome = str(row.get('Nome_Instituicao', '')).upper()
    tipo = str(row.get('Tipo_Estabelecimento', '')).upper()
    grupo = str(row.get('Grupo_Mantenedor', '')).upper()
    tier = str(row.get('Tier_Potencial_Comercial', ''))
    dist = float(row.get('Distancia_Sede_Chame_Taxi_km', 99))

    # 1. Grandes Hospitais Quaternários e Redes Privadas (Einstein, HCFMUSP, São Luiz, Sírio, Lefort, Santa Paula)
    if any(k in nome for k in ['EINSTEIN', 'CLÍNICAS', 'CLINICAS', 'SÃO LUIZ', 'SAO LUIZ', 'SÍRIO', 'SIRIO', 'LEFORT', 'INCOR', 'ICESP', 'IOT', 'SANTA PAULA', 'SÃO CAMILO', 'SAO CAMILO', 'METROPOLITANO']):
        possui = "Sim (Contrato Misto: Ponto DTP + Uber Business + Ambulâncias)"
        tipo_servico = "Ponto Fixo DTP na Portaria + Reembolso/Voucher Uber Business para Plantonistas + Ambulâncias Terceirizadas para Altas"
        fornecedor = "Ponto DTP Credenciado + Uber for Business + Locadoras de Ambulâncias"
        dor = "Custo astronômico com ambulâncias para altas simples; desospitalização lenta (leitos ocupados horas a mais); tarifa dinâmica do Uber em dias de chuva para plantonistas; escassez de táxi acessível com rampa."
        vuln = "Alta Vulnerabilidade (Oportunidade Crítica de Desospitalização & Acessibilidade)"
        estrategia = "Apresentar convênio direto da Chame Táxi com a frota acessível (Editais 6, 7 e 8) para acelerar a desospitalização com custo até 60% menor que ambulância, e vouchers corporativos fixos para médicos plantonistas sem tarifa dinâmica."
        receita = "R$ 45.000 a R$ 110.000 / mês"

    # 2. Hospitais Geriátricos / Prevent Senior / Idosos (Sancta Maggiore, Luz Butantã, etc.)
    elif any(k in nome for k in ['SANCTA MAGGIORE', 'PREVENT SENIOR', 'LUZ BUTANTÃ', 'LUZ BUTANTA', 'GERIÁTR', 'GERIATR', 'VITAL BRAZIL']):
        possui = "Sim (Ponto DTP Local + Chamadas Avulsas de Aplicativos por Familiares)"
        tipo_servico = "Ponto de Táxi na Calçada + Familiares chamando Ubers/99 avulsos na saída"
        fornecedor = "Ponto DTP Local / Aplicativos Comuns (Sem Contrato Centralizado)"
        dor = "Motoristas de app recusam corridas com idosos com andadores/cadeiras de rodas dobráveis; motoristas sem treinamento para auxílio no embarque; filas no ponto em horários de pico matinal e vespertino."
        vuln = "Alta Vulnerabilidade (Oportunidade Imediata de Credenciamento Oficial)"
        estrategia = "Credenciamento oficial da Cooperativa Chame Táxi no balcão de atendimento e alta hospitalar; motoristas cooperados treinados para atendimento humanizado da terceira idade e faturamento direto com a operadora de saúde."
        receita = "R$ 25.000 a R$ 60.000 / mês"

    # 3. Centros de Reabilitação, Ortopedia & Oncologia (IMREA Lucy Montoro, Darcy Vargas, ITACI, CEMA)
    elif any(k in nome for k in ['MONTORO', 'REABILITAÇÃO', 'REABILITACAO', 'DARCY VARGAS', 'ITACI', 'CEMA', 'APAE', 'AACD']):
        possui = "Sim (Transporte Sanitário Municipal / Vans Adaptadas + Táxi Avulso)"
        tipo_servico = "Transporte Sanitário Público + Táxis Avulsos contratados por pacientes"
        fornecedor = "Transporte Sanitário SP / Reembolso Particular"
        dor = "Falta crônica de veículos acessíveis homologados com rampa para transporte diário de cadeirantes e pacientes pós-cirúrgicos sem autonomia motora."
        vuln = "Alta Vulnerabilidade (Nicho Exclusivo do Táxi Acessível da Cooperativa)"
        estrategia = "Proposta direta de convênio institucional com a nova frota de 338 táxis acessíveis (Editais 6, 7 e 8), garantindo agendamento prévio com pontualidade para sessões contínuas de fisioterapia, radioterapia e consultas."
        receita = "R$ 30.000 a R$ 75.000 / mês"

    # 4. Laboratórios e Centros Diagnósticos (Delboni, Alta, Fleury, Lavoisier, CDB)
    elif any(k in nome for k in ['DELBONI', 'ALTA', 'FLEURY', 'LAVOISIER', 'DIAGNÓST', 'DIAGNOST', 'LABORATÓRIO', 'LABORATORIO', 'EXAMES']):
        possui = "Não Centralizado (Reembolso Avulso / Paciente Dependente de App Avulso)"
        tipo_servico = "Chamada Avulsa por Paciente em Aplicativo Próprio"
        fornecedor = "Nenhum Fornecedor Centralizado (Demanda Reprimida de Balcão)"
        dor = "Pacientes que realizam exames com sedação (endoscopia, colonoscopia, ressonâncias) são impedidos de dirigir por determinação médica e sofrem com cancelamentos de corridas em apps convencionais."
        vuln = "Alta Vulnerabilidade (Conta Aberta sem Concorrência)"
        estrategia = "Instalação de Totem Digital ou botão de chamada rápida Chame Táxi na recepção da unidade com garantia de carro na porta em menos de 4 minutos para pacientes pós-sedação."
        receita = "R$ 15.000 a R$ 40.000 / mês"

    # 5. Demais Clínicas Médicas, AMAs, UBSs e Polos Locais
    else:
        possui = "Não Centralizado (Reembolso Avulso ou Chamada Pelo Ponto da Rua)"
        tipo_servico = "Reembolso Avulso de Despesas / Chamada Espontânea no Ponto Próximo"
        fornecedor = "Ponto de Táxi DTP Mais Próximo da Via Pública"
        dor = "Falta de controle orçamentário e demora para conseguir carros em dias chuvosos para médicos e pacientes."
        vuln = "Média Vulnerabilidade (Oportunidade de Padronização com Faturamento PJ)"
        estrategia = "Oferta de convênio corporativo simplificado com centro de custo, eliminando notas em papel para diretores e funcionários."
        receita = "R$ 5.000 a R$ 15.000 / mês"

    return {
        "Possui_Servico_Mobilidade_Ativo": possui,
        "Tipo_Servico_Mobilidade_Atual": tipo_servico,
        "Fornecedor_Atual_Provavel": fornecedor,
        "Gargalo_Dor_Atual": dor,
        "Nivel_Vulnerabilidade_Contrato": vuln,
        "Estrategia_Ataque_Chame_Taxi": estrategia,
        "Potencial_Receita_Mensal_Estimada": receita
    }

def classify_enterprise_mobility(row):
    nome = str(row.get('Nome_Empresa', '')).upper()
    setor = str(row.get('Setor_Economico', '')).upper()
    tier = str(row.get('Tier_Potencial_Comercial', ''))
    colab = str(row.get('Qtd_Colaboradores_Presenciais_Est', ''))
    faixa = str(row.get('Faixa_Colaboradores', ''))

    # 1. Big Techs, Startups Unicórnios e Plataformas (Google, Meta, Nubank, QuintoAndar, Stone, AWS, Shopee, PicPay, Loft)
    if any(k in nome for k in ['GOOGLE', 'META', 'FACEBOOK', 'NUBANK', 'QUINTOANDAR', 'STONE', 'LINX', 'AMAZON', 'AWS', 'SHOPEE', 'PICPAY', 'LOFT', 'UBER', 'LINKEDIN', 'CISCO', 'VTEX', 'CREDITAS']):
        possui = "Sim (Apps Corporativos - Uber for Business / 99 Empresas)"
        tipo_servico = "Uber for Business Corporativo Integrado ao SAP/Concur + 99 Empresas"
        fornecedor = "Uber for Business & 99 Empresas"
        dor = "Tarifa dinâmica abusiva de 2x a 3x na chuva e no pico das 18h-20h; recusa constante de viagens curtas; colaboradores presos no trânsito pesado por não poderem trafegar nas faixas exclusivas de ônibus de SP; metas corporativas globais de neutralização de carbono (ESG) não atendidas por carros comuns."
        vuln = "Alta Vulnerabilidade (Oportunidade de Desbancar Apps com Faixa de Ônibus & Frota Elétrica)"
        estrategia = "Apresentar o 'Plano Corredor Livre & Frota Zero Emissão': carros híbridos e elétricos (Edital 4) rodando nas faixas de ônibus exclusivas da Faria Lima, Rebouças e Nações Unidas com ganho de até 40% de tempo, sem tarifa dinâmica e faturamento unificado para PJ."
        receita = "R$ 40.000 a R$ 100.000 / mês"

    # 2. Bancos de Investimento e Mercado Financeiro (Itaú BBA, BTG Pactual, Santander, XP, Safra, JP Morgan, Goldman Sachs, B3, BofA, Morgan Stanley)
    elif any(k in nome for k in ['ITAÚ', 'ITAU', 'BTG', 'SANTANDER', 'XP', 'SAFRA', 'JP MORGAN', 'J.P. MORGAN', 'GOLDMAN', 'BANK OF AMERICA', 'MORGAN STANLEY', 'B3', 'BRADESCO', 'UBS', 'CREDIT SUISSE', 'BV', 'VOTORANTIM']):
        possui = "Sim (Rádio Táxi Corporativo Tradicional + Uber Business para Juniores)"
        tipo_servico = "Contrato Corporativo com Rádio Táxi Tradicional (Diretoria/Sócios) + Uber Business (Analistas)"
        fornecedor = "UseTáxi / Coopetasp / Rádio Táxi Vermelho e Branco + Uber Business"
        dor = "Cooperativas tradicionais da concorrência demoram mais de 15 minutos para chegar (bases no Centro ou Zona Sul); frotas antigas sem opção elétrica; custos elevados e ferramentas de gestão online defasadas."
        vuln = "Média Vulnerabilidade (Oportunidade de Substituição em Renovação de Contrato / RFP)"
        estrategia = "Garantir SLA agressivo de 3 a 5 minutos saindo da base Vital Brasil / Butantã / Rebouças; frota executiva 2026 com carros elétricos/híbridos; aplicativo corporativo moderno com controle de centro de custo e faturamento quinzenal com desconto cooperativo."
        receita = "R$ 50.000 a R$ 130.000 / mês"

    # 3. Big Four e Consultorias Globais (PwC, EY, Deloitte, Accenture, McKinsey, BCG, Bain, KPMG)
    elif any(k in nome for k in ['MCKINSEY', 'BCG', 'BAIN', 'PWC', 'PRICEWATERHOUSE', 'EY', 'ERNST', 'DELOITTE', 'ACCENTURE', 'KPMG', 'OLIVER WYMAN', 'ROLAND BERGER']):
        possui = "Sim (Uber for Business Global + Reembolso de Táxi Avulso em Horas Extras)"
        tipo_servico = "Uber for Business como padrão + Reembolso Avulso de Táxi para quem precisa pegar voo em Congonhas ou trabalhar após as 21h"
        fornecedor = "Uber for Business + Reembolso Avulso (Sem Fornecedor Único de Táxi)"
        dor = "Consultores e auditores perdem pontes aéreas em Congonhas por estarem travados fora do corredor de ônibus no Uber; despesas de táxi avulso geram pilhas de recibos manuais para reembolso no financeiro."
        vuln = "Alta Vulnerabilidade (Oportunidade Imediata de Formalização Corporativa)"
        estrategia = "Oferecer conta corporativa digitalizada Chame Táxi com agendamento prioritário para os aeroportos de Congonhas e Guarulhos via corredor de ônibus, com faturamento direto quinzenal e eliminação de 100% dos reembolsos manuais."
        receita = "R$ 35.000 a R$ 90.000 / mês"

    # 4. Grandes Escritórios de Advocacia (Pinheiro Neto, Mattos Filho, Demarest, Machado Meyer, TozziniFreire, Lefosse, BMA, Trench Rossi, Cescon)
    elif any(k in nome for k in ['ADVOGADO', 'PINHEIRO NETO', 'MATTOS FILHO', 'DEMAREST', 'MACHADO MEYER', 'TOZZINI', 'LEFOSSE', 'BMA', 'TRENCH ROSSI', 'CESCON', 'SIQUEIRA']):
        possui = "Sim (Contrato Histórico de Rádio Táxi Noturno para Advogados)"
        tipo_servico = "Convênio Corporativo de Táxi Noturno (Direito garantido em política interna para saídas após 20h/21h)"
        fornecedor = "UseTáxi / Coopetasp / Rádio Táxi Paulista"
        dor = "Reajustes anuais pesados da concorrência; demora no envio de carros no fechamento de grandes operações de M&A às 22h-01h; falta de transparência nos relatórios de auditoria de despesas."
        vuln = "Média Vulnerabilidade (Concorrência Direta em Preço, Carros Novos e SLA)"
        estrategia = "Plantão noturno com carros novos da safra 2026 posicionados a menos de 5 min dos escritórios nos eixos Faria Lima, Pinheiros e JK; faturamento com desconto de volume corporativo e relatório detalhado por processo/cliente."
        receita = "R$ 25.000 a R$ 70.000 / mês"

    # 5. Bens de Consumo, Indústria e Energia (Ambev, Unilever, J&J, P&G, Novartis, Bayer, Raízen, Cosan, Butantan, Sabesp, Cetesb)
    elif any(k in nome for k in ['AMBEV', 'UNILEVER', 'JOHNSON', 'PROCTER', 'P&G', 'NOVARTIS', 'BAYER', 'RAÍZEN', 'RAIZEN', 'COSAN', 'CCR', 'SABESP', 'CETESB', 'CONTINENTAL', 'BUTANTAN', 'IPT', 'FIPE']):
        possui = "Sim (Fretamento Diurno de Linha + Apps / Reembolso para Horas Extras)"
        tipo_servico = "Fretamento de Ônibus/Vans para turnos padrão + Táxi/Uber Corporativo para horas extras e diretoria"
        fornecedor = "Operadoras de Fretamento (Urubupungá/Himalaia) + Uber Business / Ponto Local"
        dor = "Fretados não atendem quem sai fora do horário padrão ou tem compromisso externo; metas rígidas de ESG exigindo comprovação de redução de emissões no transporte de funcionários."
        vuln = "Alta Vulnerabilidade (Forte Demanda por Frotas Elétricas ESG)"
        estrategia = "Pitch sustentabilidade: apresentação da frota elétrica/híbrida do Edital 4 da Chame Táxi como complemento ecológico para horas extras e reuniões executivas, fornecendo relatórios auditáveis de pegada de carbono reduzida."
        receita = "R$ 30.000 a R$ 85.000 / mês"

    # 6. Mídia, Comunicação e Grandes Serviços (Globo, Band, Abril, Cultura, CEAGESP, Protege, DHL, FedEx, Sodexo)
    elif any(k in nome for k in ['GLOBO', 'BANDEIRANTES', 'BAND', 'ABRIL', 'CULTURA', 'CEAGESP', 'PROTEGE', 'DHL', 'FEDEX', 'SODEXO', 'PLUXEE']):
        possui = "Sim (Cooperativas de Táxi Credenciadas + Vans Operacionais)"
        tipo_servico = "Contratos com Cooperativas para Jornalismo, Convidados e Plantões 24 Horas"
        fornecedor = "Cooperativas Tradicionais Locais / Pontos Confinados"
        dor = "Exigência de atendimento imediato em qualquer horário (madrugada/feriados); necessidade de motoristas com alto conhecimento da malha viária de SP que usem faixas exclusivas para cumprir pautas e transmissões ao vivo."
        vuln = "Média Vulnerabilidade (Oportunidade de Homologação como Fornecedor Primário)"
        estrategia = "Base de rádio táxi Chame Táxi no Butantã operando 24 horas por dia, com prioridade de despacho para equipes de reportagem e faturamento com prazos diferenciados para empresas de mídia."
        receita = "R$ 35.000 a R$ 80.000 / mês"

    # 7. Complexos Corporativos, Shoppings e Coworkings (Eldorado, Iguatemi, CENU, Rochaverá, Cidade Jardim, WeWork, Spaces)
    else:
        possui = "Sim (Ponto DTP Confinado + Shuttles Privados + Reembolso Avulso de Lojistas)"
        tipo_servico = "Ponto Fixo DTP na Entrada Principal + Shuttles Circulares para Estações CPTM/Metrô"
        fornecedor = "Ponto Oficial DTP do Edifício + Vans Shuttles Privadas"
        dor = "Lojas e escritórios menores usam reembolso avulso e sofrem com falta de carros após o fechamento (22h); shuttles funcionam apenas nos horários de pico."
        vuln = "Alta Vulnerabilidade (Captura de Centenas de Contas Menores em Pacote Único)"
        estrategia = "Acordo de parceria comercial com a administração predial para inclusão da Chame Táxi como aplicativo oficial do condomínio e pacotes com desconto corporativo para lojistas e residentes das torres."
        receita = "R$ 50.000 a R$ 160.000 / mês"

    return {
        "Possui_Servico_Mobilidade_Ativo": possui,
        "Tipo_Servico_Mobilidade_Atual": tipo_servico,
        "Fornecedor_Atual_Provavel": fornecedor,
        "Gargalo_Dor_Atual": dor,
        "Nivel_Vulnerabilidade_Contrato": vuln,
        "Estrategia_Ataque_Chame_Taxi": estrategia,
        "Potencial_Receita_Mensal_Estimada": receita
    }

def main():
    print("=" * 80)
    print("ENRIQUECIMENTO DE DADOS DE MOBILIDADE CORPORATIVA B2B")
    print("Hospitais (94) e Grandes Empresas (96) - Raio de 5 km da Cooperativa Chame Táxi")
    print("=" * 80)

    # 1. Enriquecer Hospitais
    if HOSP_CSV_FOLDER.exists():
        df_h = pd.read_csv(HOSP_CSV_FOLDER, sep=';', low_memory=False)
    else:
        df_h = pd.read_csv(HOSP_CSV_ROOT, sep=';', low_memory=False)

    print(f"\nEnriquecendo {len(df_h)} Polos Hospitalares e Centros de Saúde...")
    h_mobility_data = [classify_hospital_mobility(row) for _, row in df_h.iterrows()]
    df_h_mob = pd.DataFrame(h_mobility_data)

    for col in df_h_mob.columns:
        df_h[col] = df_h_mob[col]

    # Salvar Hospitais atualizados
    df_h.to_csv(HOSP_CSV_FOLDER, sep=';', index=False, encoding='utf-8-sig')
    df_h.to_excel(HOSP_XLSX_FOLDER, index=False, engine='openpyxl')
    df_h.to_csv(HOSP_CSV_ROOT, sep=';', index=False, encoding='utf-8-sig')
    df_h.to_excel(HOSP_XLSX_ROOT, index=False, engine='openpyxl')
    print(f" -> Hospitais salvos com {len(df_h.columns)} colunas em CSV e Excel.")

    # 2. Enriquecer Empresas
    if EMP_CSV_FOLDER.exists():
        df_e = pd.read_csv(EMP_CSV_FOLDER, sep=';', low_memory=False)
    else:
        df_e = pd.read_csv(EMP_CSV_ROOT, sep=';', low_memory=False)

    print(f"\nEnriquecendo {len(df_e)} Grandes Empresas Não-Hospitalares (100+ Colaboradores)...")
    e_mobility_data = [classify_enterprise_mobility(row) for _, row in df_e.iterrows()]
    df_e_mob = pd.DataFrame(e_mobility_data)

    for col in df_e_mob.columns:
        df_e[col] = df_e_mob[col]

    # Salvar Empresas atualizadas
    df_e.to_csv(EMP_CSV_FOLDER, sep=';', index=False, encoding='utf-8-sig')
    df_e.to_excel(EMP_XLSX_FOLDER, index=False, engine='openpyxl')
    df_e.to_csv(EMP_CSV_ROOT, sep=';', index=False, encoding='utf-8-sig')
    df_e.to_excel(EMP_XLSX_ROOT, index=False, engine='openpyxl')
    print(f" -> Empresas salvas com {len(df_e.columns)} colunas em CSV e Excel.")

    print("\n" + "=" * 80)
    print("RESUMO DE VULNERABILIDADE & OPORTUNIDADE DE MOBILIDADE B2B:")
    print("HOSPITAIS:")
    print(df_h['Nivel_Vulnerabilidade_Contrato'].value_counts())
    print("\nEMPRESAS:")
    print(df_e['Nivel_Vulnerabilidade_Contrato'].value_counts())
    print("=" * 80)

if __name__ == '__main__':
    main()
