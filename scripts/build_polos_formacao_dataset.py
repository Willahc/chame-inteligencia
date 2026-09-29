# -*- coding: utf-8 -*-
"""
scripts/build_polos_formacao_dataset.py
Estrutura a base operacional de CFCs, Sede Central do DTP e Pista de Aferição do IPEM-SP.
A base de CFCs é uma seleção de 24 registros associada ao PDF institucional auditado no Gate 3;
a vigência individual em 2026 não está demonstrada.

Saídas:
  - data/processed/polos_formacao_taxistas_cfc_dtp.csv
  - data/processed/polos_formacao_taxistas_cfc_dtp.json
"""

import json
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
OUTPUT_CSV = PROCESSED_DIR / "polos_formacao_taxistas_cfc_dtp.csv"
OUTPUT_JSON = PROCESSED_DIR / "polos_formacao_taxistas_cfc_dtp.json"

POLOS = [
    # 1. Sede Central do DTP (O Gargalo Físico Obrigatório)
    {
        "id": "DTP_SEDE_CENTRAL",
        "tipo": "ORGAO_REGULADOR",
        "nome": "DTP - Departamento de Transportes Públicos (Sede Central / Vistoria)",
        "endereco": "Rua Joaquim Carlos, 655",
        "bairro": "Pari / Canindé",
        "cep": "03019-000",
        "subprefeitura": "Mooca",
        "regiao": "CENTRO",
        "telefone": "+55 11 2796-3400; +55 11 2692-3322",
        "lat": -23.5265,
        "lon": -46.6180,
        "servicos": "Emissão física do CONDUTAX, Vistoria Mecânica e de Segurança, Homologação e Transferência de Alvarás",
        "publico_alvo": "100% dos novos taxistas e motoristas em renovação ou transferência",
        "estrategia_chame_taxi": "Ação presencial permanente de promotores na saída do pátio e ponto de atendimento."
    },
    # 2. Pista de Lacre de Taxímetro IPEM-SP
    {
        "id": "IPEM_AFERICAO_TAXIMETRO",
        "tipo": "AFERICAO_METROLOGICA",
        "nome": "Pista de Aferição e Lacre de Taxímetro - IPEM-SP",
        "endereco": "Av. Condessa Elisabeth de Robiano, s/n (Marginal Tietê)",
        "bairro": "Belém / Tatuapé",
        "cep": "03074-000",
        "subprefeitura": "Mooca",
        "regiao": "LESTE",
        "telefone": "+55 11 3581-2000",
        "lat": -23.5280,
        "lon": -46.5650,
        "servicos": "Aferição metrológica oficial de pista (1 km) e aposição de lacre amarelo do taxímetro",
        "publico_alvo": "Taxistas com veículos recém-caracterizados prontos para rodar",
        "estrategia_chame_taxi": "Material gráfico e abordagem na área de espera dos veículos."
    },
    # 3. Centros de Formação de Condutores (CFCs) da seleção operacional
    {
        "id": "CFC_SENAT_TATUAPE",
        "tipo": "CFC_TAXISTA",
        "nome": "SEST SENAT - Unidade Tatuapé (Serviço Nacional de Aprendizagem do Transporte)",
        "endereco": "Rua Tuiuti, 9",
        "bairro": "Tatuapé",
        "cep": "03081-000",
        "subprefeitura": "Mooca",
        "regiao": "LESTE",
        "telefone": "+55 11 2207-8840",
        "lat": -23.5385,
        "lon": -46.5765,
        "servicos": "Curso de Capacitação de Taxistas (Condutax), Primeiros Socorros, Relações Humanas e Direção Defensiva",
        "publico_alvo": "Maior polo formador de motoristas profissionais da Zona Leste",
        "estrategia_chame_taxi": "Parceria institucional na formatura das turmas; stand na entrada."
    },
    {
        "id": "CFC_SEST_SENAT_JAGUARA",
        "tipo": "CFC_TAXISTA",
        "nome": "SEST SENAT - Unidade Vila Jaguara",
        "endereco": "Av. Cândido Portinari, 1100",
        "bairro": "Vila Jaguara",
        "cep": "05114-001",
        "subprefeitura": "Lapa",
        "regiao": "OESTE",
        "telefone": "+55 11 3623-1300",
        "lat": -23.5135,
        "lon": -46.7480,
        "servicos": "Curso de Taxista (Condutax) presencial e simuladores",
        "publico_alvo": "Motoristas da Zona Oeste e municípios vizinhos (Osasco/Barueri)",
        "estrategia_chame_taxi": "Totem com QR Code e bônus de filiação."
    },
    {
        "id": "CFC_EDUCATRAN_JABAQUARA",
        "tipo": "CFC_TAXISTA",
        "nome": "Educatran - Centro de Formação de Condutores",
        "endereco": "Av. Eng. Armando de Arruda Pereira, 439",
        "bairro": "Jabaquara",
        "cep": "04309-010",
        "subprefeitura": "Jabaquara",
        "regiao": "SUL",
        "telefone": "+55 11 5583-0456; +55 11 5589-4329",
        "lat": -23.6425,
        "lon": -46.6418,
        "servicos": "Formação de taxistas e cursos especializados DTP",
        "publico_alvo": "Grande fluxo de alunos da Zona Sul e região do Aeroporto de Congonhas",
        "estrategia_chame_taxi": "Convênio de indicação com a secretaria do CFC."
    },
    {
        "id": "CFC_SP_CURSOS_SANTANA",
        "tipo": "CFC_TAXISTA",
        "nome": "SP Cursos EAD & Presencial",
        "endereco": "Rua Urupiara, 107, Sala 01",
        "bairro": "Santana",
        "cep": "02032-000",
        "subprefeitura": "Santana-Tucuruvi",
        "regiao": "NORTE",
        "telefone": "+55 11 2221-5433",
        "lat": -23.5020,
        "lon": -46.6260,
        "servicos": "Curso de Condutax em modalidade EAD homologado pelo DTP e presencial",
        "publico_alvo": "Alunos de toda a capital fazendo curso à distância",
        "estrategia_chame_taxi": "Inserção de banner e e-mail marketing conjunto na entrega do certificado."
    },
    {
        "id": "CFC_CENTRO_PAULISTA_JURUBATUBA",
        "tipo": "CFC_TAXISTA",
        "nome": "Centro Paulista de Treinamentos (EAD e Presencial)",
        "endereco": "Rua Galeno de Castro, 61",
        "bairro": "Jurubatuba / Santo Amaro",
        "cep": "04696-040",
        "subprefeitura": "Santo Amaro",
        "regiao": "SUL",
        "telefone": "+55 11 5521-2187",
        "lat": -23.6820,
        "lon": -46.6980,
        "servicos": "Cursos especiais de capacitação de condutores de táxi",
        "publico_alvo": "Taxistas da região Sul extrema e Santo Amaro",
        "estrategia_chame_taxi": "Material de boas-vindas com 30 dias grátis de cooperativa."
    },
    {
        "id": "CFC_GOLDEN_CAR_VILA_MATILDE",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Golden Car",
        "endereco": "Rua Leopoldo de Freitas, 817",
        "bairro": "Vila Matilde",
        "cep": "03645-010",
        "subprefeitura": "Penha",
        "regiao": "LESTE",
        "telefone": "+55 11 2684-2815",
        "lat": -23.5310,
        "lon": -46.5290,
        "servicos": "Curso especial de taxista presencial",
        "publico_alvo": "Condutores da Zona Leste 1",
        "estrategia_chame_taxi": "Cartazes e panfletagem na secretaria."
    },
    {
        "id": "CFC_SD_TRANS_PATRIARCA",
        "tipo": "CFC_TAXISTA",
        "nome": "SD Trans - Serv. Desenv. Profissional",
        "endereco": "Av. Antônio Estevão de Carvalho, 2594",
        "bairro": "Cidade Patriarca",
        "cep": "03540-200",
        "subprefeitura": "Penha",
        "regiao": "LESTE",
        "telefone": "+55 11 2685-2507; +55 11 2685-2525",
        "lat": -23.5350,
        "lon": -46.5020,
        "servicos": "Treinamento profissional de taxistas DTP",
        "publico_alvo": "Bairros da Radial Leste e Itaquera",
        "estrategia_chame_taxi": "Apresentação da Chame Táxi no encerramento das turmas."
    },
    {
        "id": "CFC_FOCO_PERDIZES",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Foco S/S Ltda",
        "endereco": "Rua Turiassu, 1048",
        "bairro": "Perdizes",
        "cep": "05005-001",
        "subprefeitura": "Lapa",
        "regiao": "OESTE",
        "telefone": "+55 11 3862-9007",
        "lat": -23.5315,
        "lon": -46.6730,
        "servicos": "Curso de taxista credenciado DTP",
        "publico_alvo": "Polo Zona Oeste (Perdizes, Pompeia, Barra Funda)",
        "estrategia_chame_taxi": "Folder explicativo sobre ganhos com corridas corporativas."
    },
    {
        "id": "CFC_MORAES_GARCIA_LAPA",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Moraes e Garcia",
        "endereco": "Rua Faustolo, 1736",
        "bairro": "Lapa",
        "cep": "05041-001",
        "subprefeitura": "Lapa",
        "regiao": "OESTE",
        "telefone": "+55 11 3862-0497; +55 11 3801-9312",
        "lat": -23.5220,
        "lon": -46.6970,
        "servicos": "Curso de Condutax presencial",
        "publico_alvo": "Região da Lapa, Leopoldina e Pirituba",
        "estrategia_chame_taxi": "Balcão de informações Chame Táxi."
    },
    {
        "id": "CFC_SAO_LUIS",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC São Luis",
        "endereco": "Rua Geraldo Fraga de Oliveira, 667",
        "bairro": "Jardim São Luís",
        "cep": "05843-000",
        "subprefeitura": "M'Boi Mirim",
        "regiao": "SUL",
        "telefone": "+55 11 5511-5452",
        "lat": -23.6660,
        "lon": -46.7410,
        "servicos": "Formação de taxistas e renovação de Condutax",
        "publico_alvo": "Região de M'Boi Mirim e Campo Limpo",
        "estrategia_chame_taxi": "Proposta de integração às corridas do centro expandido."
    },
    {
        "id": "CFC_DUTRA_CIDADE_DUTRA",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Dutra",
        "endereco": "Av. do Jangadeiro, 84",
        "bairro": "Cidade Dutra",
        "cep": "04815-010",
        "subprefeitura": "Capela do Socorro",
        "regiao": "SUL",
        "telefone": "+55 11 5666-3044; +55 11 5668-9866",
        "lat": -23.7080,
        "lon": -46.6990,
        "servicos": "Curso de Condutax para o extremo sul",
        "publico_alvo": "Taxistas de Interlagos, Grajaú e Cidade Dutra",
        "estrategia_chame_taxi": "Captação para atender demandas de eventos de Interlagos."
    },
    {
        "id": "CFC_ZONA_OESTE_BRASILANDIA",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Zona Oeste",
        "endereco": "Rua Parapuã, 1420",
        "bairro": "Vila Brasilândia",
        "cep": "02831-001",
        "subprefeitura": "Freguesia-Brasilândia",
        "regiao": "NORTE",
        "telefone": "+55 11 3921-9870; +55 11 3921-0337",
        "lat": -23.4750,
        "lon": -46.6920,
        "servicos": "Cursos especiais DTP",
        "publico_alvo": "Zona Norte / Noroeste",
        "estrategia_chame_taxi": "Incentivo à cooperativa para novos motoristas."
    },
    {
        "id": "CFC_CECON_SANTA_CATARINA",
        "tipo": "CFC_TAXISTA",
        "nome": "Cecon - Centro de Ensino de Condutores",
        "endereco": "Rua Dr. Djalma Pinheiro Franco, 971",
        "bairro": "Vila Santa Catarina",
        "cep": "04368-000",
        "subprefeitura": "Jabaquara",
        "regiao": "SUL",
        "telefone": "+55 11 5566-3738",
        "lat": -23.6520,
        "lon": -46.6620,
        "servicos": "Curso especial de taxista",
        "publico_alvo": "Corredor Washington Luís e imediações de Congonhas",
        "estrategia_chame_taxi": "Captação prioritária para frotas e cooperados de aeroporto."
    },
    {
        "id": "CFC_CET_CAMPO_LIMPO",
        "tipo": "CFC_TAXISTA",
        "nome": "CET - Centro de Escolas de Trânsito",
        "endereco": "Av. Carlos Lacerda, 1143",
        "bairro": "Jardim Rosana / Campo Limpo",
        "cep": "05789-001",
        "subprefeitura": "Campo Limpo",
        "regiao": "SUL",
        "telefone": "+55 11 5842-0702",
        "lat": -23.6490,
        "lon": -46.7720,
        "servicos": "Formação de taxistas",
        "publico_alvo": "Bairros populosos da Zona Sul-Oeste",
        "estrategia_chame_taxi": "Plano de acolhimento para novos motoristas da região."
    },
    {
        "id": "CFC_CULTURA_MAZZEI",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Cultura",
        "endereco": "Rua Manoel Gaya, 132",
        "bairro": "Vila Nova Mazzei",
        "cep": "02313-000",
        "subprefeitura": "Jaçanã-Tremembé",
        "regiao": "NORTE",
        "telefone": "+55 11 2991-9591",
        "lat": -23.4680,
        "lon": -46.6020,
        "servicos": "Curso presencial de taxista",
        "publico_alvo": "Extremo Norte da capital",
        "estrategia_chame_taxi": "Parceria de descontos e indicação."
    },
    {
        "id": "CFC_INTERLAGOS",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Interlagos",
        "endereco": "Av. Interlagos, 2406",
        "bairro": "Campo Grande",
        "cep": "04660-003",
        "subprefeitura": "Santo Amaro",
        "regiao": "SUL",
        "telefone": "+55 11 5631-4860",
        "lat": -23.6790,
        "lon": -46.6850,
        "servicos": "Cursos especiais DTP",
        "publico_alvo": "Eixo Interlagos / Sabará / Washington Luís",
        "estrategia_chame_taxi": "Ação com promotores nos dias de prova."
    },
    {
        "id": "CFC_GABRIELLE_SAUDE",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Gabrielle",
        "endereco": "Av. do Cursino, 329",
        "bairro": "Saúde",
        "cep": "04133-000",
        "subprefeitura": "Vila Mariana",
        "regiao": "SUL",
        "telefone": "+55 11 5061-7740",
        "lat": -23.6060,
        "lon": -46.6190,
        "servicos": "Curso especial de taxista presencial",
        "publico_alvo": "Zona Sul Central (Ipiranga, Saúde, Vila Mariana)",
        "estrategia_chame_taxi": "Prospecção direta na retirada de certificados."
    },
    {
        "id": "CFC_ZEP_VILA_GUILHERME",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC ZEP",
        "endereco": "Rua Maria Cândida, 1070",
        "bairro": "Vila Guilherme",
        "cep": "02071-002",
        "subprefeitura": "Vila Maria-Vila Guilherme",
        "regiao": "NORTE",
        "telefone": "+55 11 2218-2005",
        "lat": -23.5130,
        "lon": -46.6040,
        "servicos": "Curso de taxista e vistorias",
        "publico_alvo": "Polo Zona Norte (próximo à Marginal e DTP)",
        "estrategia_chame_taxi": "Ponto estratégico de proximidade com o DTP Pari."
    },
    {
        "id": "CFC_CENTTRAN_SAO_MATEUS",
        "tipo": "CFC_TAXISTA",
        "nome": "Centtran - CFC São Mateus",
        "endereco": "Rua André de Almeida, 2102",
        "bairro": "São Mateus",
        "cep": "03950-000",
        "subprefeitura": "São Mateus",
        "regiao": "LESTE",
        "telefone": "+55 11 2919-8956",
        "lat": -23.6010,
        "lon": -46.4780,
        "servicos": "Curso de Condutax",
        "publico_alvo": "Zona Leste Extrema e ABC",
        "estrategia_chame_taxi": "Acolhimento de taxistas periféricos."
    },
    {
        "id": "CFC_CAMPO_GRANDE",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Campo Grande",
        "endereco": "Rua Arnaldo Magniccaro, 1026",
        "bairro": "Campo Grande",
        "cep": "04691-060",
        "subprefeitura": "Santo Amaro",
        "regiao": "SUL",
        "telefone": "+55 11 2389-4677; +55 11 2389-4676",
        "lat": -23.6890,
        "lon": -46.6890,
        "servicos": "Formação de condutores de táxi",
        "publico_alvo": "Sul de Santo Amaro e Jurubatuba",
        "estrategia_chame_taxi": "Comunicação visual e panfletagem."
    },
    {
        "id": "CFC_TUKA_VILA_MARIA",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC AB Tuka",
        "endereco": "Rua Araritagua, 609",
        "bairro": "Vila Maria Alta",
        "cep": "02122-010",
        "subprefeitura": "Vila Maria-Vila Guilherme",
        "regiao": "NORTE",
        "telefone": "+55 11 3895-9855",
        "lat": -23.5040,
        "lon": -46.5810,
        "servicos": "Treinamento de condutores de táxi",
        "publico_alvo": "Eixo Dutra / Fernão Dias / Marginal",
        "estrategia_chame_taxi": "Parceria com instrutores teóricos."
    },
    {
        "id": "CFC_AUTOTRANSITO_LUZ",
        "tipo": "CFC_TAXISTA",
        "nome": "Autotrânsito Centro de Formação",
        "endereco": "Rua Eduardo Chaves, 152",
        "bairro": "Luz",
        "cep": "01109-060",
        "subprefeitura": "Sé",
        "regiao": "CENTRO",
        "telefone": "+55 11 3228-4945",
        "lat": -23.5280,
        "lon": -46.6290,
        "servicos": "Cursos especiais DTP",
        "publico_alvo": "Região central da capital (Luz, Bom Retiro, Brás)",
        "estrategia_chame_taxi": "Visitas comerciais semanais."
    },
    {
        "id": "CFC_MOTA_MELO_PIRITUBA",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC Mota Melo",
        "endereco": "Av. Benedito Andrade, 313",
        "bairro": "Pirituba",
        "cep": "02936-000",
        "subprefeitura": "Pirituba-Jaraguá",
        "regiao": "NORTE",
        "telefone": "+55 11 3972-6092",
        "lat": -23.4900,
        "lon": -46.7210,
        "servicos": "Formação de taxistas e cursos de atualização",
        "publico_alvo": "Pirituba, Jaraguá e Anhanguera",
        "estrategia_chame_taxi": "Afiliação para atender polos industriais locais."
    },
    {
        "id": "CFC_JOAO_DIAS_SANTO_AMARO",
        "tipo": "CFC_TAXISTA",
        "nome": "CFC João Dias (EAD & Presencial)",
        "endereco": "Av. João Dias, 1617",
        "bairro": "Santo Amaro",
        "cep": "04723-002",
        "subprefeitura": "Santo Amaro",
        "regiao": "SUL",
        "telefone": "+55 11 5642-2273",
        "lat": -23.6480,
        "lon": -46.7110,
        "servicos": "Cursos especiais para taxistas",
        "publico_alvo": "Santo Amaro, Socorro e Chácara Santo Antônio",
        "estrategia_chame_taxi": "Voucher de 30 dias grátis na formatura."
    }
]

def prepare_records(records: list[dict]) -> list[dict]:
    prepared = []
    for item in records:
        row = dict(item)
        is_cfc = row.get("tipo") == "CFC_TAXISTA"
        row["fonte"] = (
            "Seleção operacional derivada da relação institucional CFC/Táxi do Gate 3; coordenadas, serviços e público-alvo são enriquecimento operacional não verificado"
            if is_cfc
            else "Base operacional interna; confirmar fonte e vigência"
        )
        row["data_fonte"] = "2024-10-02" if is_cfc else ""
        row["status_vigencia"] = "Não verificada em 2026"
        row["observacao"] = (
            "Seleção operacional de 24 CFCs; o PDF auditado continha 27 entradas e não publicava coordenadas, serviços ou público-alvo."
            if is_cfc
            else "Instituição operacional; não integra a contagem de CFCs do PDF; confirmar fonte, coordenadas e vigência."
        )
        prepared.append(row)
    return prepared


def main():
    records = prepare_records(POLOS)
    print(f"Estruturando {len(records)} registros operacionais de formação, documentação e aferição...")

    with open(OUTPUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()), delimiter=";")
        writer.writeheader()
        writer.writerows(records)
    print(f"-> CSV gerado em: {OUTPUT_CSV}")

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"-> JSON gerado em: {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
