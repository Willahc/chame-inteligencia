# -*- coding: utf-8 -*-
"""
scripts/extract_hospitals_corporate_5km.py
Mapeia clientes corporativos e complexos hospitalares em um raio de até 5 km
da sede da Cooperativa Chame Táxi (Av. Vital Brasil, Butantã, São Paulo - SP).
Gera dados enriquecidos para captação B2B (Faturamento corporativo, Vouchers,
Táxi Acessível PcD e Frotas Híbridas/Elétricas ESG).
"""

import os
import re
import math
import json
import urllib.request
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "Novos Alvarás 2026"
OUTPUT_CSV = OUTPUT_DIR / "clientes_corporativos_hospitais_5km.csv"
OUTPUT_XLSX = OUTPUT_DIR / "clientes_corporativos_hospitais_5km.xlsx"

CHAME_LAT = -23.5714
CHAME_LON = -46.7083
CHAME_SEDE_NOME = "Cooperativa Chame Táxi (Sede Butantã)"
CHAME_SEDE_END = "Av. Vital Brasil, Butantã, São Paulo - SP"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

# Complexos e Hospitais de Referência Primária mapeados na Região (Butantã, Morumbi, Pinheiros, Rebouças, Lapa)
CURATED_HEALTHCARE = [
    # BUTANTÃ & VITAL BRASIL (RAIO < 2.5 KM)
    {
        "nome": "Hospital Vital Brazil (Instituto Butantan)",
        "grupo": "Governo do Estado de SP / Instituto Butantan",
        "tipo": "Hospital Especializado & Pesquisa Toxicológica",
        "logradouro": "Av. Vital Brasil",
        "numero": "1500",
        "bairro": "Butantã",
        "cep": "05503-900",
        "lat": -23.5670,
        "lon": -46.7170,
        "telefone": "(11) 2627-9500",
        "leitos_est": 50,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Transferência de pacientes, pesquisadores, equipes médicas e visitantes do parque.",
        "pitch": "Vizinho de calçada da Chame Táxi (Av. Vital Brasil). Atendimento em 2 minutos para plantonistas, pesquisadores e visitantes."
    },
    {
        "nome": "Hospital Universitário da USP (HU-USP)",
        "grupo": "Universidade de São Paulo (Público Estadual)",
        "tipo": "Hospital Geral Universitário de Ensino",
        "logradouro": "Av. Prof. Lineu Prestes",
        "numero": "2565",
        "bairro": "Cidade Universitária (USP) / Butantã",
        "cep": "05508-000",
        "lat": -23.5661,
        "lon": -46.7327,
        "telefone": "(11) 3091-9200",
        "leitos_est": 250,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Alta",
        "perfil_demanda": "Alta demanda de altas hospitalares, residentes, professores da FMUSP e pacientes da comunidade USP.",
        "pitch": "Acesso rápido pela Av. Corifeu / Portão 3 da USP. Atendimento prioritário para altas médicas e transporte de docentes/médicos."
    },
    {
        "nome": "Hospital São Camilo Butantã (Antigo Lefort Butantã)",
        "grupo": "Sociedade Beneficente São Camilo",
        "tipo": "Hospital Geral Privado e Pronto Atendimento",
        "logradouro": "Av. Albert Bartholomé",
        "numero": "231",
        "bairro": "Jardim Peri Peri / Butantã",
        "cep": "05541-000",
        "lat": -23.5855,
        "lon": -46.7262,
        "telefone": "(11) 3723-5000",
        "leitos_est": 110,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Cirurgias eletivas, pronto-socorro adulto e infantil, consultórios e exames.",
        "pitch": "Parceria de vouchers corporativos para médicos e colaboradores no pós-plantão e convênio para altas ambulatoriais."
    },
    {
        "nome": "AME Butantã (Ambulatório Médico de Especialidades)",
        "grupo": "Secretaria da Saúde de SP (Gestão OSS)",
        "tipo": "Centro Ambulatorial de Especialidades e Cirurgias Dia",
        "logradouro": "Av. Corifeu de Azevedo Marques",
        "numero": "3596",
        "bairro": "Butantã",
        "cep": "05339-001",
        "lat": -23.5702,
        "lon": -46.7390,
        "telefone": "(11) 3719-2100",
        "leitos_est": 30,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Baixa",
        "demanda_esg": "Média",
        "perfil_demanda": "Exames de alta complexidade, cirurgias dia e pacientes com mobilidade reduzida.",
        "pitch": "Polo central de Táxi Acessível da Zona Oeste. Atendimento programado para cadeirantes e pacientes em reabilitação."
    },
    {
        "nome": "Hospital Lefort Morumbi",
        "grupo": "Dasa Hospitais",
        "tipo": "Hospital Geral de Alta Complexidade & Centro de Oncologia",
        "logradouro": "Rua dos Três Irmãos",
        "numero": "120",
        "bairro": "Jardim Guedala / Morumbi",
        "cep": "05615-190",
        "lat": -23.5858,
        "lon": -46.7118,
        "telefone": "(11) 3723-4700",
        "leitos_est": 180,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Transplantes, oncologia, neurocirurgia e exames laboratoriais premium (Dasa).",
        "pitch": "A 2 km da Chame Táxi via Francisco Morato. Convênio B2B com faturamento corporativo para corpo clínico e pacientes oncológicos."
    },

    # MORUMBI & JARDIM GUEDALA (RAIO 2.5 A 4.0 KM)
    {
        "nome": "Hospital Israelita Albert Einstein (Sede Morumbi)",
        "grupo": "Sociedade Beneficente Israelita Brasileira Albert Einstein",
        "tipo": "Hospital Privado de Excelência Internacional & Quaternário",
        "logradouro": "Av. Albert Einstein",
        "numero": "627",
        "bairro": "Morumbi",
        "cep": "05652-900",
        "lat": -23.5996,
        "lon": -46.7153,
        "telefone": "(11) 2151-1233",
        "leitos_est": 650,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Muito Alta",
        "perfil_demanda": "O maior polo hospitalar privado da América Latina. Demanda gigantesca 24h para médicos, executivos, estrangeiros, altas e acessíveis.",
        "pitch": "A 3.6 km da sede Chame Táxi. Oferecer frota homologada híbrida/elétrica (Edital 4) e frota de acessibilidade com elevador para desospitalização VIP."
    },
    {
        "nome": "Hospital São Luiz Morumbi",
        "grupo": "Rede D'Or São Luiz",
        "tipo": "Hospital Geral Privado de Alta Complexidade & Maternidade",
        "logradouro": "Rua Engenheiro Oscar Americano",
        "numero": "840",
        "bairro": "Morumbi / Cidade Jardim",
        "cep": "05673-050",
        "lat": -23.5912,
        "lon": -46.7020,
        "telefone": "(11) 3093-1100",
        "leitos_est": 220,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Pronto-Socorro nobre, maternidade Star/São Luiz, corpo médico renomado e alta rotatividade de pacientes particulares.",
        "pitch": "Apenas 3 km da sede pelo corredor da Ponte Cidade Jardim. Solução de vouchers faturados para diretoria clínica e equipe de enfermagem de plantão."
    },
    {
        "nome": "Hospital Infantil Darcy Vargas",
        "grupo": "Governo do Estado de SP",
        "tipo": "Hospital Pediátrico Especializado & Oncologia Infantil",
        "logradouro": "Rua Dr. Seráfico de Assis Carvalho",
        "numero": "34",
        "bairro": "Morumbi",
        "cep": "05616-010",
        "lat": -23.5925,
        "lon": -46.7110,
        "telefone": "(11) 3723-3700",
        "leitos_est": 100,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Alta",
        "perfil_demanda": "Tratamento de crianças em oncologia, hematologia e nefrologia. Transporte humanizado com acessibilidade.",
        "pitch": "Atendimento especializado a famílias e crianças com táxis adaptados e motoristas treinados em transporte humanizado."
    },
    {
        "nome": "Hospital Sancta Maggiore Morumbi (Prevent Senior)",
        "grupo": "Prevent Senior",
        "tipo": "Hospital Geral & Centro de Especialidades Geriátricas",
        "logradouro": "Av. Giovanni Gronchi",
        "numero": "1314",
        "bairro": "Morumbi",
        "cep": "05724-001",
        "lat": -23.5980,
        "lon": -46.7210,
        "telefone": "(11) 3003-6284",
        "leitos_est": 120,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Média",
        "perfil_demanda": "Público 60+ (idosos), alta demanda de retorno de consultas, fisioterapia, exames e altas hospitalares com cadeira de rodas.",
        "pitch": "Parceria estratégica com o plano Prevent Senior para transferências agendadas e desospitalização com Táxi Acessível."
    },

    # PINHEIROS, CERQUEIRA CÉSAR & REBOUÇAS (RAIO 2.5 A 4.8 KM)
    {
        "nome": "Instituto do Câncer do Estado de SP - ICESP (HCFMUSP)",
        "grupo": "Complexo Hospital das Clínicas / FMUSP",
        "tipo": "Centro Oncológico Quaternário de Referência",
        "logradouro": "Av. Dr. Arnaldo",
        "numero": "251",
        "bairro": "Cerqueira César / Pinheiros",
        "cep": "01246-000",
        "lat": -23.5552,
        "lon": -46.6715,
        "telefone": "(11) 3893-2000",
        "leitos_est": 500,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Pacientes em quimioterapia e radioterapia, pesquisadores oncológicos, cirurgias complexas e desospitalização contínua.",
        "pitch": "Acesso expresso pela Rebouças/Dr. Arnaldo. Transporte diário de pacientes em tratamento ambulatorial e corpo médico acadêmico."
    },
    {
        "nome": "InCor - Instituto do Coração (HCFMUSP)",
        "grupo": "Complexo Hospital das Clínicas / FMUSP",
        "tipo": "Centro Cardiológico & Pneumológico Quaternário",
        "logradouro": "Av. Dr. Enéas de Carvalho Aguiar",
        "numero": "44",
        "bairro": "Cerqueira César / Pinheiros",
        "cep": "05403-900",
        "lat": -23.5568,
        "lon": -46.6698,
        "telefone": "(11) 2661-5000",
        "leitos_est": 535,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Cardiologistas renomados, pacientes pós-cirurgia cardíaca que não podem dirigir, transporte de órgãos e plantonistas.",
        "pitch": "Corredor direto Rebouças-Consolação. Convênio corporativo para pacientes em reabilitação cardíaca e corpo docente da USP."
    },
    {
        "nome": "Instituto de Ortopedia e Traumatologia - IOT (HCFMUSP)",
        "grupo": "Complexo Hospital das Clínicas / FMUSP",
        "tipo": "Referência Máxima em Ortopedia, Trauma & Reabilitação",
        "logradouro": "Rua Dr. Ovídio Pires de Campos",
        "numero": "333",
        "bairro": "Cerqueira César / Pinheiros",
        "cep": "05403-010",
        "lat": -23.5575,
        "lon": -46.6708,
        "telefone": "(11) 2661-6000",
        "leitos_est": 170,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Média",
        "perfil_demanda": "Maior centro de trauma ortopédico de SP. 100% dos pacientes necessitam de transporte com acessibilidade, muletas ou cadeira de rodas.",
        "pitch": "Polo número 1 para operação dos novos Alvarás de Táxi Acessível (Editais 6, 7 e 8) da Chame Táxi. Atendimento com rampa e fixação Inmetro."
    },
    {
        "nome": "Instituto Central do Hospital das Clínicas - ICHC (HCFMUSP)",
        "grupo": "Complexo Hospital das Clínicas / FMUSP",
        "tipo": "Hospital Quaternário Geral & Maior Polo de Saúde Pública",
        "logradouro": "Av. Dr. Enéas de Carvalho Aguiar",
        "numero": "255",
        "bairro": "Cerqueira César / Pinheiros",
        "cep": "05403-000",
        "lat": -23.5582,
        "lon": -46.6701,
        "telefone": "(11) 2661-0000",
        "leitos_est": 900,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Maior complexo médico-hospitalar da América Latina com mais de 20 mil profissionais e fluxo diário superior a 40 mil pessoas.",
        "pitch": "Ponto de táxi nobre e alta demanda contínua de corridas corporativas via voucher e aplicativo 24 horas."
    },
    {
        "nome": "Instituto da Criança e do Adolescente - ICr (HCFMUSP)",
        "grupo": "Complexo Hospital das Clínicas / FMUSP",
        "tipo": "Hospital Pediátrico de Alta Complexidade & Doenças Raras",
        "logradouro": "Av. Dr. Enéas de Carvalho Aguiar",
        "numero": "647",
        "bairro": "Cerqueira César / Pinheiros",
        "cep": "05403-000",
        "lat": -23.5562,
        "lon": -46.6710,
        "telefone": "(11) 2661-8500",
        "leitos_est": 220,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Média",
        "perfil_demanda": "Tratamento de recém-nascidos, bebês e crianças em pós-operatório e patologias crônicas.",
        "pitch": "Transporte seguro e pontual para mães e crianças com atendimento humanizado cooperativo."
    },
    {
        "nome": "Hospital Sancta Maggiore Pinheiros (Prevent Senior)",
        "grupo": "Prevent Senior",
        "tipo": "Hospital Geral & Centro Cirúrgico Geriátrico",
        "logradouro": "Rua Cristiano Viana",
        "numero": "890",
        "bairro": "Pinheiros",
        "cep": "05411-001",
        "lat": -23.5565,
        "lon": -46.6785,
        "telefone": "(11) 3003-6284",
        "leitos_est": 130,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Média",
        "perfil_demanda": "Pacientes idosos em procedimentos cirúrgicos e exames avançados em Pinheiros.",
        "pitch": "Linha dedicada para desospitalização de pacientes seniores no eixo Pinheiros / Butantã."
    },
    {
        "nome": "Rede Hora Certa Pinheiros (Hospital Dia)",
        "grupo": "Prefeitura Municipal de São Paulo",
        "tipo": "Hospital Dia & Cirurgias Eletivas Municipais",
        "logradouro": "Av. Rebouças",
        "numero": "3101",
        "bairro": "Pinheiros",
        "cep": "05401-350",
        "lat": -23.5700,
        "lon": -46.6905,
        "telefone": "(11) 3031-6455",
        "leitos_est": 35,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Baixa",
        "demanda_esg": "Alta",
        "perfil_demanda": "Cirurgias ambulatoriais, exames especializados e retorno pós-operatório.",
        "pitch": "No coração da Rebouças, a 2 km da Chame Táxi. Atendimento imediato aos pacientes liberados de cirurgias dia."
    },

    # LAPA, VILA ROMANA & POMPEIA (RAIO 3.8 A 5.0 KM)
    {
        "nome": "Hospital Metropolitano (Lapa)",
        "grupo": "Amil / UnitedHealth Group (Rede Americas)",
        "tipo": "Hospital Geral Privado de Grande Porte & Pronto-Socorro",
        "logradouro": "Rua Marcelina",
        "numero": "441",
        "bairro": "Vila Romana / Lapa",
        "cep": "05040-010",
        "lat": -23.5305,
        "lon": -46.6980,
        "telefone": "(11) 3677-2000",
        "leitos_est": 230,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Centro de referência da Zona Oeste para planos premium e corporativos (Amil One, Bradesco, SulAmérica).",
        "pitch": "Conexão rápida pelo eixo Cerro Corá / Heitor Penteado. Contratos de vouchers corporativos para corpo de enfermagem e médicos."
    },
    {
        "nome": "Hospital Albert Sabin (Lapa)",
        "grupo": "Hospital Albert Sabin de SP",
        "tipo": "Hospital Geral Privado & Centro Cardiológico",
        "logradouro": "Rua Maranguape",
        "numero": "211",
        "bairro": "Vila Romana / Lapa",
        "cep": "05044-010",
        "lat": -23.5285,
        "lon": -46.6955,
        "telefone": "(11) 3838-4655",
        "leitos_est": 110,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Alta",
        "demanda_esg": "Média",
        "perfil_demanda": "UTI adulto, cirurgias ortopédicas e pronto-atendimento tradicional da Lapa.",
        "pitch": "Atendimento corporativo faturado para médicos e suporte para altas ortopédicas."
    },
    {
        "nome": "Hospital e Maternidade São Camilo Pompeia",
        "grupo": "Sociedade Beneficente São Camilo",
        "tipo": "Hospital Geral de Alta Complexidade & Maternidade",
        "logradouro": "Av. Pompeia",
        "numero": "1178",
        "bairro": "Pompeia / Perdizes",
        "cep": "05022-001",
        "lat": -23.5350,
        "lon": -46.6850,
        "telefone": "(11) 3677-4444",
        "leitos_est": 320,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Polo de cirurgias robóticas, UTI neonatal, maternidade de referência e corpo clínico com mais de 1.500 médicos.",
        "pitch": "A 4.8 km pelo eixo Alto de Pinheiros. Convênio de transporte executivo para médicos e pacientes da maternidade."
    },

    # POLOS DE MEDICINA DIAGNÓSTICA CORPORATIVA (FARIA LIMA, REBOUÇAS E PINHEIROS)
    {
        "nome": "Grupo Fleury - Sede Operacional & Centro Diagnóstico Faria Lima",
        "grupo": "Grupo Fleury",
        "tipo": "Mega Unidade de Medicina Diagnóstica & Sede Corporativa",
        "logradouro": "Av. Brigadeiro Faria Lima",
        "numero": "2223",
        "bairro": "Jardim Paulistano / Pinheiros",
        "cep": "01452-000",
        "lat": -23.5780,
        "lon": -46.6890,
        "telefone": "(11) 3145-3145",
        "leitos_est": 0,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Muito Alta",
        "perfil_demanda": "Sede de diretoria e executivos do Grupo Fleury + centenas de pacientes particulares em check-ups de alto padrão diariamente.",
        "pitch": "A 2.5 km pela Ponte Eusébio Matoso / Faria Lima. Frotas híbridas elétricas para o board executivo e vouchers corporativos."
    },
    {
        "nome": "Alta Excelência Diagnóstica (Dasa) - Unidade Rebouças",
        "grupo": "Dasa",
        "tipo": "Centro Diagnóstico Premium & Imagem de Alta Precisão",
        "logradouro": "Av. Rebouças",
        "numero": "3500",
        "bairro": "Pinheiros",
        "cep": "05402-000",
        "lat": -23.5725,
        "lon": -46.6930,
        "telefone": "(11) 3003-5553",
        "leitos_est": 0,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Exames de ressonância, medicina genômica e check-ups executivos para presidentes de empresas.",
        "pitch": "Apenas 1.7 km da Chame Táxi. Atendimento VIP para clientes corporativos de alto padrão com faturamento mensal unificado."
    },
    {
        "nome": "Instituto de Medicina Física e Reabilitação - IMREA Lucy Montoro",
        "grupo": "Rede de Reabilitação Lucy Montoro / HCFMUSP",
        "tipo": "Centro de Reabilitação Física e Robótica Especializada",
        "logradouro": "Rua Domingo de Soto",
        "numero": "100",
        "bairro": "Jardim das Bandeiras / Pinheiros",
        "cep": "05436-040",
        "lat": -23.5510,
        "lon": -46.6895,
        "telefone": "(11) 3818-4200",
        "leitos_est": 40,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Alta",
        "perfil_demanda": "Maior centro público de tecnologia assistiva, robótica de marcha e reabilitação de lesões medulares do Brasil.",
        "pitch": "Alvo número 1 para contratos de Táxi Acessível. Pacientes em cadeiras de rodas elétricas e convencionais com rotinas de 3 a 5 sessões semanais."
    },
    {
        "nome": "Hospital Dia e Pronto Atendimento Caxingui",
        "grupo": "Grupo NotreDame Intermédica (Hapvida NDI)",
        "tipo": "Pronto-Socorro & Hospital Dia",
        "logradouro": "Av. Eliseu de Almeida",
        "numero": "1015",
        "bairro": "Caxingui / Butantã",
        "cep": "05533-000",
        "lat": -23.5788,
        "lon": -46.7202,
        "telefone": "(11) 3724-9000",
        "leitos_est": 45,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Alta",
        "demanda_esg": "Média",
        "perfil_demanda": "Pronto-atendimento 24h na Av. Eliseu de Almeida com alto fluxo de pacientes da Zona Oeste e Taboão da Serra.",
        "pitch": "A 1.5 km da sede da Chame Táxi. Parceria de transferências inter-hospitalares e transporte de plantonistas."
    },
    {
        "nome": "Delboni Auriemo Medicina Diagnóstica - Unidade Butantã",
        "grupo": "Dasa",
        "tipo": "Centro Diagnóstico & Laboratório de Análises Clínicas",
        "logradouro": "Av. Vital Brasil",
        "numero": "670",
        "bairro": "Butantã",
        "cep": "05503-001",
        "lat": -23.5720,
        "lon": -46.7115,
        "telefone": "(11) 3049-6999",
        "leitos_est": 0,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Média",
        "perfil_demanda": "Coleta laboratorial, ultrassonografia, mamografia e exames de imagem no coração do Butantã.",
        "pitch": "A 300 metros da sede da Chame Táxi na mesma avenida. Suporte imediato aos pacientes em jejum e exames sedados."
    },
    {
        "nome": "Hospital Sancta Maggiore Butantã (Prevent Senior)",
        "grupo": "Prevent Senior",
        "tipo": "Hospital Geral & Pronto Atendimento Especializado",
        "logradouro": "Av. Prof. Francisco Morato",
        "numero": "1177",
        "bairro": "Butantã",
        "cep": "05513-000",
        "lat": -23.5790,
        "lon": -46.7150,
        "telefone": "(11) 3003-6284",
        "leitos_est": 140,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Hospital de retaguarda e pronto-socorro geriátrico no Butantã. Alta necessidade de táxis com rampa para pacientes idosos.",
        "pitch": "Apenas 1.1 km da sede da Chame Táxi. Ponto de apoio imediato para transferências e altas hospitalares de conveniados Prevent Senior."
    },
    {
        "nome": "Hospital São Luiz Itaim",
        "grupo": "Rede D'Or São Luiz",
        "tipo": "Hospital Geral Quaternário de Alta Complexidade & Maternidade",
        "logradouro": "Rua Dr. Alceu de Campos Rodrigues",
        "numero": "95",
        "bairro": "Itaim Bibi / Vila Nova Conceição",
        "cep": "04544-000",
        "lat": -23.5857,
        "lon": -46.6775,
        "telefone": "(11) 3040-1100",
        "leitos_est": 280,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Muito Alta",
        "perfil_demanda": "Polo médico executivo no Itaim Bibi. Mais de 2.000 médicos credenciados, vouchers corporativos faturados para plantões e executivos.",
        "pitch": "A 3.5 km da sede via Av. Cidade Jardim / Faria Lima. Convênio de faturamento corporativo mensal para corpo clínico e transporte executivo."
    },
    {
        "nome": "Hospital Santa Paula",
        "grupo": "Dasa Hospitais",
        "tipo": "Hospital Geral de Alta Complexidade & Centro de Oncologia",
        "logradouro": "Av. Santo Amaro",
        "numero": "2468",
        "bairro": "Vila Nova Conceição / Itaim Bibi",
        "cep": "04556-100",
        "lat": -23.5960,
        "lon": -46.6770,
        "telefone": "(11) 3040-8000",
        "leitos_est": 200,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Centro de excelência em cardiologia, oncologia e cirurgias robóticas no polo corporativo da Berrini/Itaim.",
        "pitch": "A 4.2 km pela Marginal Pinheiros / Juscelino Kubitschek. Pacote de vouchers corporativos para transferências inter-hospitalares e plantões."
    },
    {
        "nome": "Hospital Sírio-Libanês (Unidade Itaim Bibi)",
        "grupo": "Sociedade Beneficente de Senhoras Hospital Sírio-Libanês",
        "tipo": "Centro de Diagnóstico, Hospital Dia & Centro de Oncologia",
        "logradouro": "Rua Joaquim Floriano",
        "numero": "533",
        "bairro": "Itaim Bibi",
        "cep": "04534-011",
        "lat": -23.5828,
        "lon": -46.6780,
        "telefone": "(11) 3394-0200",
        "leitos_est": 40,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Muito Alta",
        "demanda_esg": "Muito Alta",
        "perfil_demanda": "Público particular e corporativo A+, quimioterapia ambulatorial, pequenos procedimentos e exames de alto padrão.",
        "pitch": "A 3.3 km da Chame Táxi. Atendimento exclusivo com frota híbrida/elétrica (ESG) e motoristas selecionados em viagens executivas e desospitalização."
    },
    {
        "nome": "ITACI - Instituto de Tratamento do Câncer Infantil (HCFMUSP)",
        "grupo": "Fundação Criança / Complexo HCFMUSP",
        "tipo": "Hospital Onco-Hematológico Pediátrico Especializado",
        "logradouro": "Rua Galeno de Almeida",
        "numero": "148",
        "bairro": "Pinheiros / Sumaré",
        "cep": "05410-030",
        "lat": -23.5550,
        "lon": -46.6790,
        "telefone": "(11) 3897-3800",
        "leitos_est": 60,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Média",
        "demanda_esg": "Alta",
        "perfil_demanda": "Crianças e adolescentes em tratamento oncológico de alta complexidade e transplante de medula óssea.",
        "pitch": "A 3.5 km pelo corredor Rebouças. Transporte humanizado com acessibilidade para crianças imunossuprimidas e familiares."
    },
    {
        "nome": "Instituto de Psiquiatria - IPq (HCFMUSP)",
        "grupo": "Complexo Hospital das Clínicas / FMUSP",
        "tipo": "Hospital & Centro de Pesquisa Psiquiátrica Quaternária",
        "logradouro": "Rua Dr. Ovídio Pires de Campos",
        "numero": "785",
        "bairro": "Cerqueira César / Pinheiros",
        "cep": "05403-010",
        "lat": -23.5570,
        "lon": -46.6710,
        "telefone": "(11) 2661-6970",
        "leitos_est": 110,
        "demanda_acessivel": "Alta",
        "demanda_vouchers": "Alta",
        "demanda_esg": "Média",
        "perfil_demanda": "Polo nacional de saúde mental, médicos psiquiatras, pesquisadores e internações especializadas.",
        "pitch": "A 4.1 km no complexo Clínicas. Atendimento discreto e programado para altas e pacientes em acompanhamento ambulatorial."
    },
    {
        "nome": "CEMA Hospital da Visão (Unidade Shopping Eldorado)",
        "grupo": "Hospital CEMA",
        "tipo": "Hospital Especializado em Oftalmologia & Otorrinolaringologia",
        "logradouro": "Av. Rebouças",
        "numero": "3970",
        "bairro": "Pinheiros",
        "cep": "05402-600",
        "lat": -23.5740,
        "lon": -46.6960,
        "telefone": "(11) 2602-8000",
        "leitos_est": 20,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Alta",
        "demanda_esg": "Alta",
        "perfil_demanda": "Pacientes após cirurgias de catarata, retina e correção de visão com dilatação de pupila e necessidade de retorno seguro para casa sem dirigir.",
        "pitch": "Apenas 1.3 km da sede da Chame Táxi. Convênio direto para pacientes pós-cirúrgicos com alta sensibilidade à luz e idosos."
    },
    {
        "nome": "Pronto Atendimento e Especialidades Butantã (AMA / UBS)",
        "grupo": "Prefeitura Municipal de São Paulo / OSS Einstein",
        "tipo": "Pronto Atendimento Municipal & Unidade de Especialidades",
        "logradouro": "Rua Cabral de Menezes",
        "numero": "51",
        "bairro": "Butantã",
        "cep": "05537-020",
        "lat": -23.5720,
        "lon": -46.7200,
        "telefone": "(11) 3726-2488",
        "leitos_est": 25,
        "demanda_acessivel": "Muito Alta",
        "demanda_vouchers": "Baixa",
        "demanda_esg": "Média",
        "perfil_demanda": "Urgências, consultas e transferências de pacientes do distrito do Butantã.",
        "pitch": "A 1.1 km da Chame Táxi. Atendimento ágil e prioritário com táxis comuns e acessíveis no polo central de saúde do Butantã."
    }
]

def query_osm_health():
    """Consulta Overpass API para mapear clínicas, UPAs e unidades médicas adicionais no raio de 5km."""
    print("Consultando OpenStreetMap (Overpass API) para unidades de saúde no raio de 5 km...")
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = """
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:5000, -23.5714, -46.7083);
      way["amenity"="hospital"](around:5000, -23.5714, -46.7083);
      node["amenity"="clinic"](around:5000, -23.5714, -46.7083);
      way["amenity"="clinic"](around:5000, -23.5714, -46.7083);
    );
    out center tags;
    """
    try:
        req = urllib.request.Request(
            overpass_url, 
            data=query.encode('utf-8'),
            headers={'User-Agent': 'ChameTaxiEnterpriseProspector/1.0'}
        )
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elements = data.get('elements', [])
            print(f"-> Overpass API retornou {len(elements)} estabelecimentos de saúde brutos.")
            return elements
    except Exception as e:
        print(f"Aviso ao consultar Overpass API ({e}). Prosseguindo com base curada de referência e GeoSampa.")
        return []

def main():
    print("=" * 80)
    print("MAPEAMENTO DE CLIENTES CORPORATIVOS & POLOS HOSPITALARES (RAIO 5 KM CHAME TÁXI)")
    print("=" * 80)

    # 1. Carregar Pontos de Táxi para Cruzamento de Entorno
    pontos_csv = BASE_DIR / "data" / "processed" / "pontos_taxi_sp_consolidado.csv"
    pontos_geo = []
    if pontos_csv.exists():
        pdf = pd.read_csv(pontos_csv, sep=';', low_memory=False)
        for _, pr in pdf.iterrows():
            lat = pr.get('latitude')
            lon = pr.get('longitude')
            if pd.notna(lat) and pd.notna(lon):
                try:
                    pontos_geo.append({
                        "id": str(pr.get('dtp_ponto_id', '')),
                        "end": str(pr.get('dtp_endereco', '')),
                        "lat": float(lat),
                        "lon": float(lon),
                        "cap": int(pr.get('dtp_vagas_capacidade', 0)) if pd.notna(pr.get('dtp_vagas_capacidade')) else 0
                    })
                except Exception:
                    pass
    print(f"Indexados {len(pontos_geo):,} pontos de táxi georreferenciados para calcular proximidade aos hospitais.")

    # 2. Processar Dados Curados
    osm_elements = query_osm_health()
    
    # Processar elementos adicionais do OSM
    osm_added = []
    seen_names = set()
    for item in CURATED_HEALTHCARE:
        seen_names.add(item['nome'].strip().upper())

    for el in osm_elements:
        tags = el.get('tags', {})
        nome = tags.get('name', tags.get('official_name', ''))
        if not nome or len(nome) < 4:
            continue
        nome_upper = nome.strip().upper()
        if any(sn in nome_upper for sn in seen_names) or any(nome_upper in sn for sn in seen_names):
            continue
        
        # Filtros de relevância médica
        if any(ign in nome_upper for ign in ['VETERIN', 'PET', 'DENT', 'ODONTO', 'ESTÉTICA', 'ESTETICA', 'PILATES']):
            continue

        lat = el.get('lat') or (el.get('center', {}).get('lat') if 'center' in el else None)
        lon = el.get('lon') or (el.get('center', {}).get('lon') if 'center' in el else None)
        if not lat or not lon:
            continue

        dist = haversine(CHAME_LAT, CHAME_LON, float(lat), float(lon))
        if dist > 5.05:
            continue

        logr = tags.get('addr:street', '')
        num = tags.get('addr:housenumber', '')
        bairro = tags.get('addr:suburb', 'Zona Oeste / Butantã')
        cep = tags.get('addr:postcode', '')
        tel = tags.get('phone', tags.get('contact:phone', '—'))
        
        amenity = tags.get('amenity', 'clinic')
        tipo = "Hospital / Pronto Atendimento" if amenity == 'hospital' else "Clínica Médica / Centro de Saúde"

        osm_added.append({
            "nome": nome,
            "grupo": tags.get('operator', 'Rede Privada / Municipal'),
            "tipo": tipo,
            "logradouro": logr if logr else "Via Local",
            "numero": num if num else "S/N",
            "bairro": bairro,
            "cep": cep,
            "lat": float(lat),
            "lon": float(lon),
            "telefone": tel,
            "leitos_est": 50 if amenity == 'hospital' else 10,
            "demanda_acessivel": "Alta" if amenity == 'hospital' else "Média",
            "demanda_vouchers": "Alta" if amenity == 'hospital' else "Média",
            "demanda_esg": "Alta" if dist <= 3.0 else "Média",
            "perfil_demanda": f"Unidade de saúde ({tipo}) mapeada no OpenStreetMap a {dist} km da sede.",
            "pitch": f"Estabelecimento de saúde na área de atuação direta da Chame Táxi ({dist} km). Oferta de faturamento mensal unificado e chamadas via app corporativo."
        })
        seen_names.add(nome_upper)

    all_establishments = CURATED_HEALTHCARE + osm_added
    print(f"Total de polos de saúde consolidados no raio de 5 km: {len(all_establishments):,}")

    rows = []
    for idx, est in enumerate(all_establishments, start=1):
        lat = est['lat']
        lon = est['lon']
        dist = haversine(CHAME_LAT, CHAME_LON, lat, lon)

        # Encontrar ponto de táxi DTP mais próximo
        closest_ponto = "Nenhum mapeado a < 500m"
        ponto_dist_min = 999.0
        ponto_id_found = ""
        for p in pontos_geo:
            pd_km = haversine(lat, lon, p['lat'], p['lon'])
            if pd_km < ponto_dist_min:
                ponto_dist_min = pd_km
                ponto_id_found = p['id']
                closest_ponto = f"Ponto {p['id']} - {p['end']} ({p['cap']} vagas a {int(pd_km*1000)}m)"

        # Determinar Tier de Potencial Comercial para a Chame Táxi
        # Tier A (Hospitais Quaternários e Grandes Complexos)
        # Tier B (Hospitais Gerais e Médios)
        # Tier C (Clínicas e Centros de Especialidades)
        if any(kw in est['nome'].upper() for kw in ['EINSTEIN', 'CLÍNICAS', 'CLINICAS', 'SÃO LUIZ', 'SAO LUIZ', 'LEFORT', 'INCOR', 'ICESP', 'IOT', 'SÃO CAMILO', 'SAO CAMILO', 'METROPOLITANO', 'FLEURY', 'MONTORO']):
            tier_potencial = "Tier A - Estratégico (Grande Complexo / Alto Volume)"
            score_b2b = 95 if dist <= 3.5 else 90
            est_corridas = "500 a 2.500 corridas/mês"
        elif est['tipo'].startswith('Hospital'):
            tier_potencial = "Tier B - Alta Relevância (Hospital Geral / Desospitalização)"
            score_b2b = 85 if dist <= 3.5 else 78
            est_corridas = "150 a 500 corridas/mês"
        else:
            tier_potencial = "Tier C - Oportunidade Local (Clínica / Diagnóstico)"
            score_b2b = 75 if dist <= 2.5 else 65
            est_corridas = "50 a 150 corridas/mês"

        # Endereço completo formatado
        end_completo = f"{est['logradouro']}, {est['numero']} - {est['bairro']}, São Paulo - SP"
        if est['cep']:
            end_completo += f" (CEP: {est['cep']})"

        link_maps = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
        link_rota_chame = f"https://www.google.com/maps/dir/?api=1&origin={CHAME_LAT},{CHAME_LON}&destination={lat},{lon}"

        rows.append({
            "ID_Prospect_B2B": f"CORP-SAUDE-{idx:03d}",
            "Nome_Instituicao": est['nome'],
            "Grupo_Mantenedor": est['grupo'],
            "Tipo_Estabelecimento": est['tipo'],
            "Tier_Potencial_Comercial": tier_potencial,
            "Score_Afinidade_Chame_Taxi": score_b2b,
            "Distancia_Sede_Chame_Taxi_km": dist,
            "Tempo_Estimado_Deslocamento_min": int(max(3, dist * 3.2)),
            "Endereco_Completo": end_completo,
            "Bairro": est['bairro'],
            "CEP": est['cep'],
            "Telefone_Central": est['telefone'],
            "Demanda_Taxi_Acessivel": est['demanda_acessivel'],
            "Demanda_Vouchers_Plantoes": est['demanda_vouchers'],
            "Demanda_Frota_ESG_Eletrica": est['demanda_esg'],
            "Estimativa_Potencial_Corridas_Mes": est_corridas,
            "Ponto_Taxi_Mais_Proximo": closest_ponto,
            "Ponto_Taxi_ID": ponto_id_found,
            "Distancia_Ponto_Taxi_Metros": int(ponto_dist_min * 1000) if ponto_dist_min < 900 else "—",
            "Perfil_Demanda_Detalhado": est['perfil_demanda'],
            "Proposta_Valor_Pitch_Chame_Taxi": est['pitch'],
            "Canal_Decisao_Abordagem": "Diretoria de Facilities / Compras / Recursos Humanos / Serviço Social de Desospitalização",
            "Latitude": lat,
            "Longitude": lon,
            "Link_Google_Maps": link_maps,
            "Link_Rota_Sede_Chame": link_rota_chame
        })

    df_hosp = pd.DataFrame(rows)
    df_hosp.sort_values(by=['Distancia_Sede_Chame_Taxi_km', 'Score_Afinidade_Chame_Taxi'], ascending=[True, False], inplace=True)

    print(f"\nResumo por Tier de Potencial Comercial:")
    print(df_hosp['Tier_Potencial_Comercial'].value_counts())

    print(f"\nTop 10 Estabelecimentos Mais Próximos da Sede (Av. Vital Brasil):")
    for _, r in df_hosp.head(10).iterrows():
        print(f"[{r['Distancia_Sede_Chame_Taxi_km']} km] {r['Nome_Instituicao']} ({r['Bairro']}) | {r['Tier_Potencial_Comercial']}")

    # Salvar CSV e Excel
    root_csv = BASE_DIR / "clientes_corporativos_hospitais_5km.csv"
    root_xlsx = BASE_DIR / "clientes_corporativos_hospitais_5km.xlsx"

    print(f"\nSalvando CSV:")
    print(f"-> Raiz: {root_csv}")
    print(f"-> Pasta: {OUTPUT_CSV}")
    df_hosp.to_csv(root_csv, sep=';', index=False, encoding='utf-8-sig')
    df_hosp.to_csv(OUTPUT_CSV, sep=';', index=False, encoding='utf-8-sig')

    print(f"\nSalvando Excel:")
    print(f"-> Raiz: {root_xlsx}")
    print(f"-> Pasta: {OUTPUT_XLSX}")
    with pd.ExcelWriter(root_xlsx, engine='openpyxl') as writer:
        df_hosp.to_excel(writer, sheet_name='Clientes_Corp_Saude_5km', index=False)
    with pd.ExcelWriter(OUTPUT_XLSX, engine='openpyxl') as writer:
        df_hosp.to_excel(writer, sheet_name='Clientes_Corp_Saude_5km', index=False)

    print("=" * 80)
    print("MAPEAMENTO DE HOSPITAIS & CLIENTES CORPORATIVOS GERADO COM SUCESSO!")
    print(f"-> Arquivos CSV e Excel prontos (Raiz e Novos Alvarás 2026)")
    print("=" * 80)

if __name__ == "__main__":
    main()
