# -*- coding: utf-8 -*-
"""
=============================================================================
GERADOR DO DASHBOARD WEB & SUÍTE OPERACIONAL: BASE MESTRE TAXISTAS SP 2026
=============================================================================
Autor: Senior Data Scientist
Gera uma aplicação HTML/JS standalone rica, responsiva, moderna e 100% autônoma
que integra:
  1. Base Mestre Universal & Analytics (16.863 motoristas, KPIs e Gráficos)
  2. Central de Prospecção CRM (WhatsApp em 1 Clique & Gestão de Funil de Vendas)
  3. Mapa Tático Geográfico GIS (Leaflet com Sede Butantã, Rotas e 1.188 Pontos)
  4. Dossiê 360° do Motorista (Ficha completa com impressão e links regulatórios)
=============================================================================
"""

import os
import sys
import io
import re
import glob
import json
import pandas as pd
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def generate_dashboard():
    print("=" * 80)
    print("INICIANDO CONSTRUÇÃO DA CENTRAL INTEGRADA DE INTELIGÊNCIA & CRM TAXISTAS 2026")
    print("=" * 80)
    
    csv_path = 'planilha_mestre_taxistas_sp_2026.csv'
    if not os.path.exists(csv_path):
        print(f"Erro: {csv_path} não encontrado.")
        return

    print("Carregando planilha mestre consolidada...")
    df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', low_memory=False)
    print(f"Base carregada: {len(df):,} linhas e {len(df.columns)} colunas.")

    # 1. Estatísticas por Edital
    edital_stats = []
    edital_names = {
        1: "Edital 1: PcD Comum",
        2: "Edital 2: Tempo de Exercício",
        3: "Edital 3: Mulheres Taxistas",
        4: "Edital 4: Elétrico / Híbrido",
        5: "Edital 5: Ampla Concorrência",
        6: "Edital 6: PcD Acessível",
        7: "Edital 7: Tempo Acessível",
        8: "Edital 8: Ampla Acessível"
    }
    for ed_num in range(1, 9):
        sub = df[df['Edital_Numero'] == ed_num]
        insc = len(sub)
        vagas = int(sub['Vagas_Ofertadas'].iloc[0]) if insc > 0 and pd.notna(sub['Vagas_Ofertadas'].iloc[0]) else 0
        cont = int(sub['Status_Sorteio_2026'].str.startswith('CONTEMPLADO').sum())
        esp = int((sub['Status_Sorteio_2026'] == 'ESPERA').sum())
        taxa = round(cont / insc * 100, 2) if insc > 0 else 0
        rel = round(insc / vagas, 2) if vagas > 0 else 0
        fem = int((sub['Genero'] == 'Feminino').sum())
        masc = int((sub['Genero'] == 'Masculino').sum())
        edital_stats.append({
            'ed': ed_num,
            'nome': edital_names.get(ed_num, f"Edital {ed_num}"),
            'insc': insc,
            'vagas': vagas,
            'cont': cont,
            'esp': esp,
            'taxa': taxa,
            'rel': rel,
            'fem': fem,
            'masc': masc
        })

    tier_counts = df['Tier_Prioridade_Comercial'].value_counts().to_dict()
    top_pontos = df[df['Ponto_Numero'].notna() & (df['Ponto_Numero'] != '')]['Ponto_Numero'].value_counts().head(10).to_dict()
    decadas_counts = df[df['Decada_Entrada_Praca'].notna() & (df['Decada_Entrada_Praca'] != 'Não aplicável')]['Decada_Entrada_Praca'].value_counts().to_dict()

    print("Formatando registros da Base Mestre para o navegador...")
    records = []
    for _, r in df.iterrows():
        records.append({
            "id": str(r.get('ID_Master', '')),
            "orig": str(r.get('Origem_Principal', '')),
            "bases": str(r.get('Bases_Identificadas', '')),
            "nom": str(r.get('Nome_Completo', '')),
            "nom_limpo": str(r.get('Nome_Limpo_Sem_Acento', '')),
            "gen": str(r.get('Genero', '')),
            "cad": str(r.get('Cadastro_DTP_Condutax', '') if pd.notna(r.get('Cadastro_DTP_Condutax')) else ''),
            "prt": str(r.get('Numero_Protocolo_Inscricao', '') if pd.notna(r.get('Numero_Protocolo_Inscricao')) else ''),
            "sei": str(r.get('Processo_SEI_DTP', '') if pd.notna(r.get('Processo_SEI_DTP')) else ''),
            "cpf": str(r.get('CPF_Identificado', '') if pd.notna(r.get('CPF_Identificado')) else ''),
            "st": str(r.get('Status_Sorteio_2026', '')),
            "ed": int(r.get('Edital_Numero')) if pd.notna(r.get('Edital_Numero')) and str(r.get('Edital_Numero')).replace('.0','').isdigit() else 0,
            "ed_desc": str(r.get('Edital_Descricao', '') if pd.notna(r.get('Edital_Descricao')) else ''),
            "cat": str(r.get('Categoria_Veiculo', '') if pd.notna(r.get('Categoria_Veiculo')) else ''),
            "mod": str(r.get('Modalidade_Cota', '') if pd.notna(r.get('Modalidade_Cota')) else ''),
            "rdef": int(r.get('Classificacao_Definitiva')) if pd.notna(r.get('Classificacao_Definitiva')) and str(r.get('Classificacao_Definitiva')).replace('.0','').isdigit() else None,
            "rnf": int(r.get('Posicao_Sorteio_NF')) if pd.notna(r.get('Posicao_Sorteio_NF')) and str(r.get('Posicao_Sorteio_NF')).replace('.0','').isdigit() else None,
            "fila": int(r.get('Posicao_Fila_Espera')) if pd.notna(r.get('Posicao_Fila_Espera')) and str(r.get('Posicao_Fila_Espera')).replace('.0','').isdigit() else 0,
            "supl": str(r.get('Classificacao_Suplencia_Fila', '') if pd.notna(r.get('Classificacao_Suplencia_Fila')) else ''),
            "prev_supl": str(r.get('Previsao_Convocacao_Suplente', '') if pd.notna(r.get('Previsao_Convocacao_Suplente')) else ''),
            "desist_est": str(r.get('Estimativa_Desistencias_Edital', '') if pd.notna(r.get('Estimativa_Desistencias_Edital')) else ''),
            "anos": float(r.get('Tempo_Servico_Anos')) if pd.notna(r.get('Tempo_Servico_Anos')) and str(r.get('Tempo_Servico_Anos')).replace('.','',1).isdigit() else None,
            "dec": str(r.get('Decada_Entrada_Praca', '') if pd.notna(r.get('Decada_Entrada_Praca')) else ''),
            "safra": str(r.get('Safra_Cadastro_DTP', '') if pd.notna(r.get('Safra_Cadastro_DTP')) else ''),
            "score": int(r.get('Score_Chame_Taxi')) if pd.notna(r.get('Score_Chame_Taxi')) and str(r.get('Score_Chame_Taxi')).replace('.0','').isdigit() else None,
            "tier": str(r.get('Tier_Prioridade_Comercial', '')),
            "just_sc": str(r.get('Justificativa_Score', '') if pd.notna(r.get('Justificativa_Score')) else ''),
            "seg": str(r.get('Segmento_Comercial', '') if pd.notna(r.get('Segmento_Comercial')) else ''),
            "acao": str(r.get('Acao_Comercial_Recomendada', '') if pd.notna(r.get('Acao_Comercial_Recomendada')) else ''),
            "pto_st": str(r.get('Vinculo_Ponto_Privativo', '') if pd.notna(r.get('Vinculo_Ponto_Privativo')) else ''),
            "pto_num": str(r.get('Ponto_Numero', '') if pd.notna(r.get('Ponto_Numero')) and str(r.get('Ponto_Numero')) != '—' else ''),
            "pto_end": str(r.get('Ponto_Endereco', '') if pd.notna(r.get('Ponto_Endereco')) and str(r.get('Ponto_Endereco')) != '—' else ''),
            "pto_reg": str(r.get('Ponto_Regiao', '') if pd.notna(r.get('Ponto_Regiao')) and str(r.get('Ponto_Regiao')) != '—' else ''),
            "pto_sub": str(r.get('Ponto_Subprefeitura', '') if pd.notna(r.get('Ponto_Subprefeitura')) else ''),
            "pto_cap": str(r.get('Ponto_Capacidade_Vagas', '') if pd.notna(r.get('Ponto_Capacidade_Vagas')) else ''),
            "pto_saldo": str(r.get('Ponto_Saldo_Vagas', '') if pd.notna(r.get('Ponto_Saldo_Vagas')) else ''),
            "pto_tel": str(r.get('Ponto_Telefone', '') if pd.notna(r.get('Ponto_Telefone')) and str(r.get('Ponto_Telefone')) != '—' else ''),
            "tel1": str(r.get('Telefone_Celular_1', '') if pd.notna(r.get('Telefone_Celular_1')) else ''),
            "tel2": str(r.get('Telefone_Celular_2', '') if pd.notna(r.get('Telefone_Celular_2')) else ''),
            "wpp": str(r.get('WhatsApp_Ativo', 'Não verificado') if pd.notna(r.get('WhatsApp_Ativo')) else 'Não verificado'),
            "email": str(r.get('Email_Principal', '') if pd.notna(r.get('Email_Principal')) else ''),
            "bairro": str(r.get('Bairro_Residencial', '') if pd.notna(r.get('Bairro_Residencial')) else ''),
            "cep": str(r.get('CEP', '') if pd.notna(r.get('CEP')) else ''),
            "status_enriq": str(r.get('Status_Enriquecimento', '')),
            "mei": str(r.get('Possui_MEI_Ativo', 'Não')),
            "cnpj": str(r.get('MEI_CNPJ', '') if pd.notna(r.get('MEI_CNPJ')) else ''),
            "razao": str(r.get('MEI_Razao_Social', '') if pd.notna(r.get('MEI_Razao_Social')) else ''),
            "fantasia": str(r.get('MEI_Nome_Fantasia', '') if pd.notna(r.get('MEI_Nome_Fantasia')) else ''),
            "mei_abertura": str(r.get('MEI_Data_Abertura', '') if pd.notna(r.get('MEI_Data_Abertura')) else ''),
            "mei_dist": str(r.get('MEI_Distancia_Sede_Chame_Taxi_km', '') if pd.notna(r.get('MEI_Distancia_Sede_Chame_Taxi_km')) else ''),
            "mei_reg": str(r.get('MEI_Regiao_Macro', '') if pd.notna(r.get('MEI_Regiao_Macro')) else ''),
            "veic_exig": str(r.get('Exigencia_Veiculo_DTP', '') if pd.notna(r.get('Exigencia_Veiculo_DTP')) else ''),
            "veic_mod": str(r.get('Modelos_Homologados_Recomendados', '') if pd.notna(r.get('Modelos_Homologados_Recomendados')) else ''),
            "veic_prazo": str(r.get('Prazo_Estimado_Vistoria_DTP', '') if pd.notna(r.get('Prazo_Estimado_Vistoria_DTP')) else ''),
            "doc": str(r.get('Possui_Publicacao_DOC_2026', 'Não')),
            "doc_data": str(r.get('DOC_Data_Publicacao', '') if pd.notna(r.get('DOC_Data_Publicacao')) else ''),
            "doc_ato": str(r.get('DOC_Tipo_Ato', '') if pd.notna(r.get('DOC_Tipo_Ato')) else ''),
            "doc_cat": str(r.get('DOC_Categoria_Veiculo', '') if pd.notna(r.get('DOC_Categoria_Veiculo')) else ''),
            "doc_st": str(r.get('DOC_Status_Despacho', '') if pd.notna(r.get('DOC_Status_Despacho')) else ''),
            "doc_ced": str(r.get('DOC_Cedente_Anterior', '') if pd.notna(r.get('DOC_Cedente_Anterior')) else ''),
            "doc_alv": str(r.get('DOC_Alvara_Numero', '') if pd.notna(r.get('DOC_Alvara_Numero')) else ''),
            "doc_url": str(r.get('DOC_URL_Publicacao', '') if pd.notna(r.get('DOC_URL_Publicacao')) else ''),
            "doc_resumo": str(r.get('DOC_Resumo_Texto', '') if pd.notna(r.get('DOC_Resumo_Texto')) else ''),
            "sort_part": str(r.get('Participou_Sorteio_Pontos_2024', 'Não')),
            "sort_alv": str(r.get('Sorteio_Pontos_Alvara_Historico', '') if pd.notna(r.get('Sorteio_Pontos_Alvara_Historico')) else ''),
            "sort_st": str(r.get('Sorteio_Pontos_Status', '') if pd.notna(r.get('Sorteio_Pontos_Status')) else '')
        })

    # 2. Carregar Fila de Prospecção CRM (WhatsApp e Funil)
    crm_path = os.path.join('Novos Alvarás 2026', 'fila_prospeccao_crm_taxistas_2026.csv')
    crm_records = []
    if os.path.exists(crm_path):
        crm_df = pd.read_csv(crm_path, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, cr in crm_df.iterrows():
            crm_records.append({
                "id": str(cr.get('ID_Master', '')),
                "nom": str(cr.get('Nome_Motorista', '')),
                "cpf": str(cr.get('CPF_Completo', '—')),
                "tel": str(cr.get('Telefone_Principal', '')),
                "tel2": str(cr.get('Telefone_Secundario', '—')),
                "wpp_url": str(cr.get('Link_WhatsApp_Mensagem_Pronta', '')),
                "wpp_dir": str(cr.get('Link_Direto_WhatsApp', '')),
                "msg_txt": str(cr.get('Texto_Mensagem_WhatsApp', '')),
                "funil": str(cr.get('Status_Funil_CRM', '1 - Novo Lead')),
                "status": str(cr.get('Status_Alvara_2026', '')),
                "ed": str(cr.get('Edital_Numero', '')).replace('.0', ''),
                "ed_desc": str(cr.get('Edital_Descricao', '')),
                "cat": str(cr.get('Categoria_Veiculo', '')),
                "veic_exig": str(cr.get('Exigencia_Veiculo_DTP', '—')),
                "veic_mod": str(cr.get('Modelos_Homologados_Recomendados', '—')),
                "score": int(cr.get('Score_Chame_Taxi', 50)) if pd.notna(cr.get('Score_Chame_Taxi')) and str(cr.get('Score_Chame_Taxi')).replace('.0','').isdigit() else 50,
                "tier": str(cr.get('Tier_Prioridade', 'Tier 2')),
                "dist": str(cr.get('Distancia_Sede_Butanta_km', '—')),
                "reg": str(cr.get('Regiao_Macro', '—')),
                "pitch": str(cr.get('Script_Comercial_Sugerido', '')),
                "bairro": str(cr.get('Bairro_Atuacao', '')),
                "endereco": str(cr.get('Endereco_MEI', '')),
                "cep": str(cr.get('CEP', '')),
                "cnpj": str(cr.get('CNPJ_MEI', '')),
                "razao": str(cr.get('Razao_Social_MEI', '')),
                "sei": str(cr.get('Processo_SEI_DTP', '—')),
                "ponto": str(cr.get('Ponto_Privativo', '—')),
            })
    print(f"CRM Leads carregados: {len(crm_records):,} contatos operacionais.")

    # 3. Carregar Roteiro Tático de Pontos de Táxi (Geocodificados)
    roteiro_path = os.path.join('Novos Alvarás 2026', 'roteiro_tatico_visitas_pontos_2026.csv')
    pontos_records = []
    if os.path.exists(roteiro_path):
        rot_df = pd.read_csv(roteiro_path, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, pr in rot_df.iterrows():
            lat = pr.get('latitude')
            lon = pr.get('longitude')
            if pd.notna(lat) and pd.notna(lon):
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except Exception:
                    continue
                pontos_records.append({
                    "id": str(pr.get('Ponto_Numero', '')),
                    "rota": str(pr.get('Cluster_Rota', '')),
                    "tier": str(pr.get('Tier_Visita_Campo', '')),
                    "score": int(pr.get('Score_Prioridade_Visita', 30)) if pd.notna(pr.get('Score_Prioridade_Visita')) else 30,
                    "end": str(pr.get('Endereco_Completo', '')),
                    "sub": str(pr.get('Subprefeitura', '')),
                    "dist": float(pr.get('Distancia_Sede_Chame_Taxi_km', 99)) if pd.notna(pr.get('Distancia_Sede_Chame_Taxi_km')) else None,
                    "horario": str(pr.get('Horario_Ideal_Visita', '')),
                    "estrategia": str(pr.get('Estrategia_Abordagem_Campo', '')),
                    "qtd_mot": int(pr.get('Qtd_Motoristas_Mapeados', 0)) if pd.notna(pr.get('Qtd_Motoristas_Mapeados')) else 0,
                    "nomes_mot": str(pr.get('Nomes_Motoristas_Mapeados', '—')),
                    "tel_mot": str(pr.get('Telefones_Motoristas_Ponto', '—')),
                    "tel_ponto": str(pr.get('Telefone_Ponto', '—')),
                    "cap": int(pr.get('Capacidade_Total_Vagas', 0)) if pd.notna(pr.get('Capacidade_Total_Vagas')) else 0,
                    "saldo": int(pr.get('Saldo_Vagas_Disponiveis', 0)) if pd.notna(pr.get('Saldo_Vagas_Disponiveis')) else 0,
                    "lat": lat_f,
                    "lon": lon_f
                })
    print(f"Pontos Georreferenciados para o Mapa: {len(pontos_records):,} locais.")

    # 4. Carregar Clientes Corporativos & Polos Hospitalares (Raio 5 km)
    hosp_path = os.path.join('Novos Alvarás 2026', 'clientes_corporativos_hospitais_5km.csv')
    hosp_records = []
    if os.path.exists(hosp_path):
        hdf = pd.read_csv(hosp_path, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, hr in hdf.iterrows():
            lat = hr.get('Latitude')
            lon = hr.get('Longitude')
            if pd.notna(lat) and pd.notna(lon):
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except Exception:
                    continue
                hosp_records.append({
                    "id": str(hr.get('ID_Prospect_B2B', '')),
                    "nome": str(hr.get('Nome_Instituicao', '')),
                    "grupo": str(hr.get('Grupo_Mantenedor', '')),
                    "tipo": str(hr.get('Tipo_Estabelecimento', '')),
                    "tier": str(hr.get('Tier_Potencial_Comercial', '')),
                    "score": int(hr.get('Score_Afinidade_Chame_Taxi', 80)) if pd.notna(hr.get('Score_Afinidade_Chame_Taxi')) else 80,
                    "dist": float(hr.get('Distancia_Sede_Chame_Taxi_km', 0)),
                    "tempo": int(hr.get('Tempo_Estimado_Deslocamento_min', 5)) if pd.notna(hr.get('Tempo_Estimado_Deslocamento_min')) else 5,
                    "end": str(hr.get('Endereco_Completo', '')),
                    "bairro": str(hr.get('Bairro', '')),
                    "tel": str(hr.get('Telefone_Central', '')),
                    "acessivel": str(hr.get('Demanda_Taxi_Acessivel', 'Alta')),
                    "vouchers": str(hr.get('Demanda_Vouchers_Plantoes', 'Alta')),
                    "esg": str(hr.get('Demanda_Frota_ESG_Eletrica', 'Alta')),
                    "corridas": str(hr.get('Estimativa_Potencial_Corridas_Mes', '')),
                    "ponto": str(hr.get('Ponto_Taxi_Mais_Proximo', '')),
                    "pitch": str(hr.get('Proposta_Valor_Pitch_Chame_Taxi', '')),
                    "mob_ativo": str(hr.get('Possui_Servico_Mobilidade_Ativo', '—')),
                    "mob_tipo": str(hr.get('Tipo_Servico_Mobilidade_Atual', '—')),
                    "mob_forn": str(hr.get('Fornecedor_Atual_Provavel', '—')),
                    "mob_dor": str(hr.get('Gargalo_Dor_Atual', '—')),
                    "mob_vuln": str(hr.get('Nivel_Vulnerabilidade_Contrato', '—')),
                    "mob_ataque": str(hr.get('Estrategia_Ataque_Chame_Taxi', '—')),
                    "mob_rec": str(hr.get('Potencial_Receita_Mensal_Estimada', '—')),
                    "dec_area": str(hr.get('Area_Decisora_Principal', '')),
                    "dec_cargos": str(hr.get('Cargos_Alvo_Decisores', '')),
                    "dec_lideres": str(hr.get('Nomes_Liderancas_Mapeadas', '')),
                    "dec_canal": str(hr.get('Canal_Contato_Recomendado', '')),
                    "dec_linkedin": str(hr.get('Link_Busca_LinkedIn_Decisores', '')),
                    "dec_google": str(hr.get('Link_Busca_Google_Decisores', '')),
                    "dec_script": str(hr.get('Script_Abordagem_LinkedIn', '')),
                    "email_dom": str(hr.get('Dominio_Email_Corporativo', '')),
                    "email_padrao": str(hr.get('Padrao_Sintaxe_Email', '')),
                    "email_inst": str(hr.get('Email_Canal_Compras_Institucional', '')),
                    "email_dec": str(hr.get('Email_Provavel_Decisor_Mapeado', '')),
                    "link_hunter": str(hr.get('Link_Hunter_Busca_Emails', '')),
                    "link_google_email": str(hr.get('Link_Google_Dork_Emails', '')),
                    "lat": lat_f,
                    "lon": lon_f
                })
    print(f"Polos de Saúde & Hospitais B2B (Raio 5km): {len(hosp_records):,} locais.")

    # 5. Carregar Clientes Corporativos - Grandes Empresas Não-Hospitalares (100+ Colaboradores)
    emp_path = os.path.join('Novos Alvarás 2026', 'clientes_corporativos_empresas_5km.csv')
    if not os.path.exists(emp_path):
        emp_path = 'clientes_corporativos_empresas_5km.csv'
    emp_records = []
    if os.path.exists(emp_path):
        edf = pd.read_csv(emp_path, sep=';', encoding='utf-8-sig', low_memory=False)
        for _, er in edf.iterrows():
            lat = er.get('Latitude')
            lon = er.get('Longitude')
            if pd.notna(lat) and pd.notna(lon):
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except Exception:
                    continue
                emp_records.append({
                    "id": str(er.get('ID_Prospect_B2B', '')),
                    "nome": str(er.get('Nome_Empresa', '')),
                    "razao": str(er.get('Razao_Social_Holding', '')),
                    "setor": str(er.get('Setor_Economico', '')),
                    "colab": str(er.get('Qtd_Colaboradores_Presenciais_Est', '')),
                    "faixa": str(er.get('Faixa_Colaboradores', '')),
                    "edificio": str(er.get('Edificio_Sede_Complexo', '')),
                    "end": str(er.get('Endereco_Completo', '')),
                    "bairro": str(er.get('Bairro', '')),
                    "lat": lat_f,
                    "lon": lon_f,
                    "dist": float(er.get('Distancia_Sede_Chame_Taxi_km', 0)),
                    "tempo": int(er.get('Tempo_Estimado_Deslocamento_min', 5)) if pd.notna(er.get('Tempo_Estimado_Deslocamento_min')) else 5,
                    "ponto": str(er.get('Ponto_Taxi_Mais_Proximo', '')),
                    "vouchers": str(er.get('Demanda_Vouchers_Horas_Extras_Noturno', 'Alta')),
                    "aero": str(er.get('Demanda_Viagens_Aeroportos', 'Alta')),
                    "esg": str(er.get('Demanda_Frota_ESG_Eletrica', 'Alta')),
                    "faixa_onibus": str(er.get('Vantagem_Faixa_Onibus_Reunioes', 'Muito Alta')),
                    "corridas": str(er.get('Estimativa_Potencial_Corridas_Mes', '')),
                    "tier": str(er.get('Tier_Potencial_Comercial', '')),
                    "score": int(er.get('Score_Afinidade_Chame_Taxi', 85)) if pd.notna(er.get('Score_Afinidade_Chame_Taxi')) else 85,
                    "pitch": str(er.get('Script_Pitch_Comercial_Chame_Taxi', '')),
                    "mob_ativo": str(er.get('Possui_Servico_Mobilidade_Ativo', '—')),
                    "mob_tipo": str(er.get('Tipo_Servico_Mobilidade_Atual', '—')),
                    "mob_forn": str(er.get('Fornecedor_Atual_Provavel', '—')),
                    "mob_dor": str(er.get('Gargalo_Dor_Atual', '—')),
                    "mob_vuln": str(er.get('Nivel_Vulnerabilidade_Contrato', '—')),
                    "mob_ataque": str(er.get('Estrategia_Ataque_Chame_Taxi', '—')),
                    "mob_rec": str(er.get('Potencial_Receita_Mensal_Estimada', '—')),
                    "dec_area": str(er.get('Area_Decisora_Principal', '')),
                    "dec_cargos": str(er.get('Cargos_Alvo_Decisores', '')),
                    "dec_lideres": str(er.get('Nomes_Liderancas_Mapeadas', '')),
                    "dec_canal": str(er.get('Canal_Contato_Recomendado', '')),
                    "dec_linkedin": str(er.get('Link_Busca_LinkedIn_Decisores', '')),
                    "dec_google": str(er.get('Link_Busca_Google_Decisores', '')),
                    "dec_script": str(er.get('Script_Abordagem_LinkedIn', '')),
                    "email_dom": str(er.get('Dominio_Email_Corporativo', '')),
                    "email_padrao": str(er.get('Padrao_Sintaxe_Email', '')),
                    "email_inst": str(er.get('Email_Canal_Compras_Institucional', '')),
                    "email_dec": str(er.get('Email_Provavel_Decisor_Mapeado', '')),
                    "link_hunter": str(er.get('Link_Hunter_Busca_Emails', '')),
                    "link_google_email": str(er.get('Link_Google_Dork_Emails', '')),
                    "tel": str(er.get('Telefone_Central', '')),
                    "site": str(er.get('Website_Corporativo', ''))
                })
    print(f"Grandes Empresas Corporativas (100+ Colaboradores): {len(emp_records):,} locais.")

    # 6. Dados abertos municipais e estaduais (SMT/SGTP, Detran-SP, Receita e Infosiga)
    def _ler_aberto(*caminhos):
        for p in caminhos:
            if os.path.exists(p):
                try:
                    return pd.read_csv(p, sep=';', encoding='utf-8-sig', low_memory=False)
                except Exception as exc:
                    print(f"  [aviso] nao foi possivel ler {p}: {exc}")
        return None

    def _br(n):
        return f"{int(n):,}".replace(",", ".")

    df_sgtp = _ler_aberto(r'data\processed\sgtp_licencas_taxi_mensal.csv')
    df_frota = _ler_aberto(r'data\processed\frota_ativa_sp_por_municipio_2026-08.csv')
    df_sin_tax = _ler_aberto(r'data\processed\sinistros_vitimas_taxistas_infosiga_mensal.csv')
    df_emp_pj = _ler_aberto(r'data\processed\empresas_taxi_pj_ativas_sp.csv')
    df_acid_sub = _ler_aberto(*sorted(glob.glob(r'data\processed\acidentes_sp_por_subprefeitura_*.csv'), reverse=True))
    df_acid_mes = _ler_aberto(*sorted(glob.glob(r'data\processed\acidentes_sp_mensal_*.csv'), reverse=True))

    sgtp_total, sgtp_rotulo = 0, ''
    if df_sgtp is not None and len(df_sgtp):
        mes_cols = [c for c in df_sgtp.columns if re.match(r'^[a-z]{3}_\d{4}$', c)]
        if mes_cols:
            ult_mes = mes_cols[-1]
            sgtp_total = int(pd.to_numeric(
                df_sgtp.loc[df_sgtp['categoria'] == '(subtotal)', ult_mes], errors='coerce').sum())
            sgtp_rotulo = ult_mes.replace('_', '/')

    frota_estado = frota_capital = 0
    frota_periodo = ''
    if df_frota is not None and len(df_frota):
        frota_estado = int(pd.to_numeric(df_frota['frota_total'], errors='coerce').sum())
        frota_capital = int(pd.to_numeric(
            df_frota.loc[df_frota['e_capital'] == 'sim', 'frota_total'], errors='coerce').sum())
        frota_periodo = str(df_frota['periodo'].iloc[0])

    pj_total = len(df_emp_pj) if df_emp_pj is not None else 0

    vit_taxista, vit_fatais = 0, 0
    if df_sin_tax is not None and len(df_sin_tax):
        sp_vit = df_sin_tax[df_sin_tax['municipio'] == 'SAO PAULO']
        vit_taxista = int(pd.to_numeric(sp_vit['vitimas_taxista'], errors='coerce').sum())
        vit_fatais = int(pd.to_numeric(sp_vit['fatais'], errors='coerce').sum())

    SEM_GEO = ['Sem coordenada', 'Fora dos poligonos']
    acid_total = acid_fatais = acid_atrop = acid_local = 0
    acid_periodo, acid_top, acid_mes_series = '', [], []
    if df_acid_sub is not None and len(df_acid_sub):
        acid_total = int(pd.to_numeric(df_acid_sub['sinistros'], errors='coerce').sum())
        acid_fatais = int(pd.to_numeric(df_acid_sub['sinistros_fatais'], errors='coerce').sum())
        acid_atrop = int(pd.to_numeric(df_acid_sub['atropelamentos'], errors='coerce').sum())
        acid_local = acid_total - int(pd.to_numeric(
            df_acid_sub.loc[df_acid_sub['subprefeitura'].isin(SEM_GEO), 'sinistros'],
            errors='coerce').sum())
        acid_periodo = str(df_acid_sub['periodo'].iloc[0])
        top = df_acid_sub[~df_acid_sub['subprefeitura'].isin(SEM_GEO)].head(10)
        acid_top = [{
            "sub": str(r['subprefeitura']) if len(str(r['subprefeitura'])) <= 3
            else str(r['subprefeitura']).title(),
            "sin": int(r['sinistros']),
            "fatais": int(r['sinistros_fatais']),
            "atrop": int(r['atropelamentos']),
            "env": int(r['envolvidos_total']),
        } for _, r in top.iterrows()]
    if df_acid_mes is not None and len(df_acid_mes):
        acid_mes_series = [{
            "mes": str(r['ano_mes']),
            "sin": int(r['sinistros']),
            "fatais": int(r['sinistros_fatais']),
            "atrop": int(r['atropelamentos']),
        } for _, r in df_acid_mes.iterrows()]

    cobertura_pct = round(acid_local / acid_total * 100, 1) if acid_total else 0.0
    kpis_abertos = [
        {"label": "Licenças de Táxi (SGTP)", "valor": _br(sgtp_total), "icone": "ph-id-card",
         "bg": "bg-sky-50", "txt": "text-sky-600", "sub": f"{sgtp_rotulo} | SMT/DTP"},
        {"label": "Frota Ativa (Estado SP)", "valor": _br(frota_estado), "icone": "ph-car",
         "bg": "bg-blue-50", "txt": "text-blue-600", "sub": f"{frota_periodo} | capital {_br(frota_capital)}"},
        {"label": "PJ de Táxi Ativas", "valor": _br(pj_total), "icone": "ph-buildings",
         "bg": "bg-purple-50", "txt": "text-purple-600", "sub": "Receita Federal | CNAE táxi"},
        {"label": "Sinistros no Município", "valor": _br(acid_total), "icone": "ph-warning",
         "bg": "bg-rose-50", "txt": "text-rose-600", "sub": f"{acid_periodo} | {_br(acid_fatais)} fatais"},
        {"label": "Vítimas Taxistas", "valor": _br(vit_taxista), "icone": "ph-steering-wheel",
         "bg": "bg-amber-50", "txt": "text-amber-600", "sub": f"12 meses | {vit_fatais} fatal(is) | Infosiga"},
        {"label": "Sinistros Geolocalizados", "valor": f"{cobertura_pct}%".replace('.', ','), "icone": "ph-map-pin",
         "bg": "bg-emerald-50", "txt": "text-emerald-600", "sub": f"{_br(acid_local)} de {_br(acid_total)} com coordenada"},
    ]

    kpis_html = ''.join(
        '        <div class="card kpi group">\n'
        f'          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg {k["bg"]} {k["txt"]} flex items-center justify-center text-lg">\n'
        f'            <i class="ph-bold {k["icone"]}"></i>\n'
        '          </div>\n'
        f'          <span class="eyebrow">{k["label"]}</span>\n'
        f'          <div class="kpi-value mt-1">{k["valor"]}</div>\n'
        f'          <div class="text-[11px] text-slate-500 mt-0.5">{k["sub"]}</div>\n'
        '        </div>\n'
        for k in kpis_abertos)

    linhas_abertos = ''.join(
        '                <tr class="hover:bg-slate-50">\n'
        f'                  <td class="py-2 px-3 font-semibold text-slate-800">{t["sub"]}</td>\n'
        f'                  <td class="py-2 px-3 text-right">{_br(t["sin"])}</td>\n'
        f'                  <td class="py-2 px-3 text-right text-slate-500">{_br(t["sin"] - t["fatais"])}</td>\n'
        f'                  <td class="py-2 px-3 text-right font-bold text-rose-600">{_br(t["fatais"])}</td>\n'
        f'                  <td class="py-2 px-3 text-right text-amber-600">{_br(t["atrop"])}</td>\n'
        f'                  <td class="py-2 px-3 text-right text-slate-500">{_br(t["env"])}</td>\n'
        '                </tr>\n'
        for t in acid_top)

    print(f"Dados abertos carregados: SGTP {sgtp_total} licenças | frota {frota_estado} | "
          f"PJ {pj_total} | sinistros {acid_total} | vítimas taxista {vit_taxista}.")

    json_data = json.dumps(records, ensure_ascii=False)
    json_stats = json.dumps(edital_stats, ensure_ascii=False)
    json_tiers = json.dumps(tier_counts, ensure_ascii=False)
    json_pontos = json.dumps(top_pontos, ensure_ascii=False)
    json_decadas = json.dumps(decadas_counts, ensure_ascii=False)
    json_crm = json.dumps(crm_records, ensure_ascii=False)
    json_map_pontos = json.dumps(pontos_records, ensure_ascii=False)
    json_hospitais = json.dumps(hosp_records, ensure_ascii=False)
    json_empresas = json.dumps(emp_records, ensure_ascii=False)
    json_abertos = json.dumps({
        "sub_labels": [t["sub"] for t in acid_top],
        "sub_sinistros": [t["sin"] for t in acid_top],
        "sub_fatais": [t["fatais"] for t in acid_top],
        "mes_labels": [m["mes"] for m in acid_mes_series],
        "mes_sinistros": [m["sin"] for m in acid_mes_series],
        "mes_fatais": [m["fatais"] for m in acid_mes_series],
        "mes_atrop": [m["atrop"] for m in acid_mes_series],
    }, ensure_ascii=False)

    print("Montando aplicação HTML com os 3 módulos (Base Mestre, CRM WhatsApp e Mapa GIS)...")

    html_template = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Central de Inteligência & CRM Operacional: Taxistas SP 2026</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <!-- Leaflet CSS & JS (jsdelivr CDN para evitar bloqueios de firewall) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css"/>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
  <!-- Phosphor Icons (jsdelivr CDN) -->
  <script src="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/index.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

    /* ===== ENTERPRISE DESIGN SYSTEM ===== */
    :root{
      --accent:#f59e0b; --accent-ink:#0a101c; --accent-ring:rgba(245,158,11,.32);
      --ink:#111827; --ink-2:#374151; --ink-3:#6b7280;
      --line:#e5e7eb; --line-soft:#f0f1f3;
      --canvas:#f4f5f7; --surface:#ffffff;
      --r-sm:.5rem; --r-lg:.625rem; --r-xl:.75rem;
      --sh-1:0 1px 2px rgba(16,24,40,.05), 0 6px 18px -12px rgba(16,24,40,.14);
      --sh-focus:0 0 0 3px var(--accent-ring);
    }
    body{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
      background-color:var(--canvas);color:var(--ink);
      -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;}
    ::selection{background:#fde68a;color:#0f172a;}
    :focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
    @media (prefers-reduced-motion: reduce){*{animation-duration:.01ms !important;transition-duration:.01ms !important;}}

    /* ===== Topbar ===== */
    #topbar{background:linear-gradient(115deg,#0a101c 0%,#101828 55%,#0a101c 100%);}
    #topbar{box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 14px 34px -22px rgba(2,6,23,.95);}
    #topbar{border-bottom:1px solid rgba(255,255,255,.07);}
    #topbar h1{font-size:1.0625rem;font-weight:800;letter-spacing:-.012em;}
    #topbar p{color:#94a3b8;}

    /* ===== Nav ===== */
    .nav-tab{display:inline-flex;align-items:center;gap:.45rem;height:2.125rem;padding:0 .9rem;
      border-radius:var(--r-sm);font-size:.75rem;font-weight:600;letter-spacing:.01em;line-height:1;
      transition:background-color .15s ease,color .15s ease,box-shadow .15s ease;}
    .nav-tab:not(.is-active):hover{background:rgba(255,255,255,.08);color:#fff;}
    .nav-tab.is-active{font-weight:700;box-shadow:0 1px 2px rgba(2,6,23,.35);}

    /* ===== Cards / KPIs ===== */
    .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh-1);}
    .kpi{padding:.95rem 1.05rem 1rem;position:relative;overflow:hidden;transition:box-shadow .15s ease,border-color .15s ease;}
    .kpi:hover{box-shadow:0 2px 4px rgba(16,24,40,.06), 0 14px 34px -18px rgba(16,24,40,.22);border-color:#dde1e6;}
    .kpi::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;pointer-events:none;
      background:linear-gradient(90deg,var(--accent) 0%,rgba(0,0,0,0) 75%);opacity:.9;}
    .eyebrow{font-size:.6875rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3);}
    .kpi > span.eyebrow{display:block;padding-right:2.5rem;}
    .kpi-value{font-size:1.625rem;font-weight:800;line-height:1.08;letter-spacing:-.025em;color:var(--ink);
      font-variant-numeric:tabular-nums;margin-top:.3rem;}
    .section-title{font-size:.6875rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#475569;}

    /* ===== Tabelas ===== */
    .tbl{border-collapse:collapse;font-size:.8125rem;color:var(--ink-2);}
    .tbl thead tr{background:#fafbfc;color:var(--ink-3);border-bottom:1px solid var(--line);}
    .tbl thead th{padding:.5625rem .875rem;font-size:.65625rem;font-weight:600;letter-spacing:.07em;
      text-transform:uppercase;color:var(--ink-3);}
    .tbl tbody td{padding:.625rem .875rem;border-bottom:1px solid var(--line-soft);vertical-align:middle;
      font-variant-numeric:tabular-nums;}
    .tbl tbody td:first-child{font-weight:600;color:var(--ink);}
    .tbl tbody tr:last-child td{border-bottom:0;}
    .tbl tbody tr{transition:background-color .12s ease;}
    .tbl tbody tr:hover{background:#f8fafc;}

    /* ===== Campos ===== */
    .field{display:block;border:1px solid var(--line);border-radius:var(--r-sm);background:#fff;
      color:var(--ink-2);font-size:.8125rem;transition:border-color .15s ease,box-shadow .15s ease;}
    .field:hover{border-color:#cbd2da;}
    .field:focus{outline:none;border-color:var(--accent);box-shadow:var(--sh-focus);}
    .field::placeholder{color:#9ca3af;}

    /* ===== Botoes ===== */
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;height:2rem;padding:0 .8125rem;
      border:1px solid transparent;border-radius:var(--r-sm);font-size:.75rem;font-weight:600;letter-spacing:.01em;
      line-height:1;cursor:pointer;white-space:nowrap;user-select:none;
      box-shadow:0 1px 2px rgba(16,24,40,.06);
      transition:background-color .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease,filter .15s ease;}
    .btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
    .btn-ghost{background:#fff;border-color:var(--line);color:var(--ink-2);box-shadow:0 1px 2px rgba(16,24,40,.04);}
    .btn-ghost:hover{background:#f9fafb;border-color:#d1d5db;color:var(--ink);}
    .btn-soft{background:#f3f4f6;border-color:transparent;color:var(--ink-2);box-shadow:none;}
    .btn-soft:hover{background:#e5e7eb;color:var(--ink);}
    .btn-dark{background:#111827;border-color:#111827;color:#f9fafb;box-shadow:0 1px 2px rgba(16,24,40,.2);}
    .btn-dark:hover{background:#1f2937;border-color:#1f2937;}
    .btn-accent{background:var(--accent);border-color:transparent;color:#0a101c;
      box-shadow:0 1px 2px rgba(16,24,40,.18);}
    .btn-accent:hover{filter:brightness(1.06);}
    .btn-xs{height:1.75rem;padding:0 .5rem;font-size:.6875rem;border-radius:.375rem;}

    /* ===== Infra ===== */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    #leaflet-map { height: calc(100vh - 240px); min-height: 550px; border-radius: var(--r-lg); z-index: 10; }
    @media print {
      body * { visibility: hidden; }
      #dossier-print-container, #dossier-print-container * { visibility: visible; }
      #dossier-print-container { position: absolute; left: 0; top: 0; width: 100%; }
    }
  </style>
</head>
<body class="text-slate-800 min-h-screen flex flex-col">

  <!-- TOP HEADER & MAIN NAVIGATION -->
  <header id="topbar" class="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
    <div class="max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      
      <!-- LOGO & TITULO -->
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xl">
          <i class="ph-bold ph-taxi"></i>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-base sm:text-lg font-bold tracking-tight text-white leading-none">Chame Táxi: Central Integrada de Inteligência & CRM 2026</h1>
            <span class="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">Enterprise Suite</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Sede Butantã (Av. Vital Brasil) | Alvarás 2026, MEIs Receita Federal, DOC & Regulação DTP</p>
        </div>
      </div>

      <!-- MAIN MODULE TABS (3 FRENTES DE TRABALHO) -->
      <div class="flex items-center bg-white/5 p-1 rounded-lg border border-white/10 text-xs font-semibold">
        <button id="nav-btn-master" onclick="switchMainTab('master')" class="nav-tab is-active bg-amber-500 text-slate-950">
          <i class="ph-bold ph-table"></i>
          <span>1. Base Mestre Universal</span>
        </button>
        <button id="nav-btn-crm" onclick="switchMainTab('crm')" class="nav-tab text-slate-300 hover:text-white">
          <i class="ph-bold ph-whatsapp-logo text-emerald-400 text-sm"></i>
          <span>2. Fila CRM & WhatsApp</span>
          <span class="ml-1 bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full text-[10px]">2.391</span>
        </button>
        <button id="nav-btn-map" onclick="switchMainTab('map')" class="nav-tab text-slate-300 hover:text-white">
          <i class="ph-bold ph-map-pin text-sky-400 text-sm"></i>
          <span>3. Mapa Tático GIS (SP)</span>
          <span class="ml-1 bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded-full text-[10px]">6 Rotas</span>
        </button>
        <button id="nav-btn-corp" onclick="switchMainTab('corp')" class="nav-tab text-slate-300 hover:text-white">
          <i class="ph-bold ph-buildings text-purple-400 text-sm"></i>
          <span>4. Clientes Corporativos B2B</span>
          <span class="ml-1 bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-full text-[10px]">190 Alvos</span>
        </button>
      </div>

      <!-- GLOBAL QUICK ACTIONS -->
      <div class="flex items-center space-x-2 text-xs">
        <div class="bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-300 flex items-center space-x-1.5 hidden xl:flex">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>16.863 Motoristas | 99 Colunas</span>
        </div>
        <button onclick="exportFilteredCSV()" class="btn btn-accent">
          <i class="ph-bold ph-download-simple"></i>
          <span>Exportar Dados</span>
        </button>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-[1750px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

    <!-- ===================================================================== -->
    <!-- TAB 1: BASE MESTRE UNIVERSAL & ANALYTICS                             -->
    <!-- ===================================================================== -->
    <div id="tab-content-master" class="space-y-6">
      
      <!-- EXECUTIVE KPI CARDS -->
      <section class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-users-four"></i>
          </div>
          <span class="eyebrow">Base Mestre Total</span>
          <div class="kpi-value mt-1">16.863</div>
          <div class="text-[11px] text-slate-500 mt-0.5">16.783 Alv + 80 DOC</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-certificate"></i>
          </div>
          <span class="eyebrow">Contemplados 2026</span>
          <div class="kpi-value mt-1">2.140</div>
          <div class="text-[11px] text-emerald-700 font-medium mt-0.5">1.802 Comum + 338 Acess.</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-hourglass-high"></i>
          </div>
          <span class="eyebrow">Suplentes Prioritários</span>
          <div class="kpi-value mt-1">370</div>
          <div class="text-[11px] text-amber-700 font-medium mt-0.5">Top Margem Desistência</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-target"></i>
          </div>
          <span class="eyebrow">Tier 1 Comercial</span>
          <div class="kpi-value mt-1">161</div>
          <div class="text-[11px] text-rose-700 font-medium mt-0.5">Score &ge; 80 (VIP Conversão)</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-phone-call"></i>
          </div>
          <span class="eyebrow">Telefones Validados</span>
          <div class="kpi-value mt-1">2.423</div>
          <div class="text-[11px] text-indigo-700 font-medium mt-0.5">2.425 MEIs Cadastrados</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-identification-card"></i>
          </div>
          <span class="eyebrow">CPFs Completos</span>
          <div class="kpi-value mt-1">914</div>
          <div class="text-[11px] text-cyan-700 font-medium mt-0.5">2.391 Fila Ativa CRM</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-newspaper"></i>
          </div>
          <span class="eyebrow">Processos SEI / DOC</span>
          <div class="kpi-value mt-1">646</div>
          <div class="text-[11px] text-purple-700 font-medium mt-0.5">100% Contemplados DOC</div>
        </div>
      </section>

      <!-- CHARTS SECTION -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="card p-4 lg:col-span-2 flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h2 class="section-title flex items-center gap-1.5">
                <i class="ph-bold ph-chart-bar text-amber-500 text-sm"></i>
                Funil Concorrencial: Demanda vs Vagas por Edital (2026)
              </h2>
              <p class="text-[11px] text-slate-400">Inscritos, Contemplados e Suplentes em Fila de Espera</p>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Editais 1 a 8</span>
          </div>
          <div class="h-60 w-full flex-1">
            <canvas id="chart-editais"></canvas>
          </div>
        </div>

        <div class="card p-4 flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h2 class="section-title flex items-center gap-1.5">
                <i class="ph-bold ph-target text-rose-500 text-sm"></i>
                Scoring Comercial Chame Táxi
              </h2>
              <p class="text-[11px] text-slate-400">Tiers de Propensão e Atratividade para Adesão</p>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">2.220 Alvos</span>
          </div>
          <div class="h-60 w-full flex-1">
            <canvas id="chart-tiers"></canvas>
          </div>
        </div>
      </section>

      <!-- EXPLORER TABLE & FILTERS -->
      <section class="card overflow-hidden flex flex-col">
        <div class="p-4 border-b border-slate-100 bg-white space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <i class="ph-bold ph-magnifying-glass text-amber-500"></i>
                Explorador Unificado da Base Mestre de Taxistas
              </h2>
              <p class="text-xs text-slate-500">Consulte qualquer um dos 16.863 motoristas por Nome, CPF, Condutax, SEI ou Telefone e abra o Dossiê 360°.</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="resetAllFilters()" class="btn btn-ghost">
                <i class="ph-bold ph-arrow-counter-clockwise"></i>
                <span>Limpar Filtros</span>
              </button>
              <button onclick="filterTier1()" class="btn text-rose-700 bg-rose-50 hover:bg-rose-100">
                <i class="ph-bold ph-star"></i>
                <span>Tier 1 VIP (50)</span>
              </button>
              <button onclick="filterSuplentes()" class="btn text-amber-800 bg-amber-50 hover:bg-amber-100">
                <i class="ph-bold ph-hourglass-high"></i>
                <span>Suplentes Top (370)</span>
              </button>
              <button onclick="filterMEIs()" class="btn text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                <i class="ph-bold ph-phone"></i>
                <span>Com Telefone (2.423)</span>
              </button>
            </div>
          </div>

          <!-- CONTROLES DE FILTRO -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-1">
            <div>
              <label class="eyebrow block mb-1">Edital / Categoria</label>
              <select id="filter-edital" onchange="applyFilters()" class="field w-full px-2.5 py-1.5">
                <option value="ALL">Todos os Editais</option>
                <option value="1">Edital 1 (PcD Comum)</option>
                <option value="2">Edital 2 (Tempo Comum)</option>
                <option value="3">Edital 3 (Mulheres Comum)</option>
                <option value="4">Edital 4 (Elétrico/Híbrido)</option>
                <option value="5">Edital 5 (Ampla Comum)</option>
                <option value="6">Edital 6 (PcD Acessível)</option>
                <option value="7">Edital 7 (Tempo Acessível)</option>
                <option value="8">Edital 8 (Ampla Acessível)</option>
                <option value="DOC">Diário Oficial (Apenas DOC)</option>
              </select>
            </div>

            <div>
              <label class="eyebrow block mb-1">Situação / Alvará</label>
              <select id="filter-status" onchange="applyFilters()" class="field w-full px-2.5 py-1.5">
                <option value="ALL">Todas as Situações</option>
                <option value="CONTEMPLADO">Contemplados (Titulares)</option>
                <option value="SUPLENTE_ALTA">Suplente Alta Probabilidade</option>
                <option value="ESPERA">Fila de Espera Geral</option>
                <option value="INABILITADO">Inabilitados na Fase Doc</option>
              </select>
            </div>

            <div>
              <label class="eyebrow block mb-1">Tier Prioridade</label>
              <select id="filter-tier" onchange="applyFilters()" class="field w-full px-2.5 py-1.5">
                <option value="ALL">Todos os Tiers</option>
                <option value="Tier 1">Tier 1 (Ultra Quente / Score &ge; 80) 🔥</option>
                <option value="Tier 2">Tier 2 (Alta Receptividade / Score 65-79) ⭐</option>
                <option value="Tier 3">Tier 3 (Oportunidade Tática / Score 50-64)</option>
                <option value="Tier 4">Tier 4 (Base Ampla / Score &lt; 50)</option>
              </select>
            </div>

            <div>
              <label class="eyebrow block mb-1">Vínculo de Ponto</label>
              <select id="filter-ponto" onchange="applyFilters()" class="field w-full px-2.5 py-1.5">
                <option value="ALL">Todos os Tipos de Ponto</option>
                <option value="VINCULADO">Ponto Privativo Vinculado</option>
                <option value="SORTEIO">Tentou Sorteio de Ponto</option>
                <option value="LIVRE">Ponto Livre (Sem Ponto)</option>
              </select>
            </div>

            <div>
              <label class="eyebrow block mb-1">Contato / Telefone</label>
              <select id="filter-contato" onchange="applyFilters()" class="field w-full px-2.5 py-1.5">
                <option value="ALL">Todos</option>
                <option value="COM_TEL">Com Telefone Validado</option>
                <option value="COM_CPF">Com CPF Completo</option>
                <option value="COM_DOC">Com Processo SEI / DOC</option>
              </select>
            </div>

            <div>
              <label class="eyebrow block mb-1">Proximidade Butantã</label>
              <select id="filter-distancia" onchange="applyFilters()" class="field w-full px-2.5 py-1.5">
                <option value="ALL">Todas as Regiões</option>
                <option value="5KM">Até 5 km da Sede (Hiperlocal)</option>
                <option value="10KM">Até 10 km (Zona Oeste)</option>
                <option value="15KM">Até 15 km da Sede</option>
              </select>
            </div>

            <div>
              <label class="eyebrow block mb-1">Busca Geral</label>
              <div class="relative">
                <input type="text" id="search-input" oninput="applyFilters()" placeholder="Nome, CPF, Condutax, SEI..." class="field w-full pl-7 pr-2.5 py-1.5">
                <i class="ph-bold ph-magnifying-glass absolute left-2 top-2 text-slate-400 text-xs"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- TABELA DE RESULTADOS UNIVERSAL -->
        <div class="overflow-x-auto custom-scrollbar flex-1">
          <table class="tbl w-full text-left">
            <thead>
              <tr class="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider select-none">
                <th class="py-2.5 px-3">Motorista / Nome</th>
                <th class="py-2.5 px-3">Identificadores (CPF / Condutax)</th>
                <th class="py-2.5 px-3">Edital / Categoria</th>
                <th class="py-2.5 px-3">Status / Convocação</th>
                <th class="py-2.5 px-3">Contato & Distância</th>
                <th class="py-2.5 px-3 text-center">Score Chame</th>
                <th class="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody id="table-body" class="text-slate-700">
              <!-- Renderizado via JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- PAGINAÇÃO -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="text-slate-500" id="pagination-info">Mostrando 0 a 0 de 0 registros</div>
          <div class="flex items-center space-x-1" id="pagination-controls">
            <!-- Botões dinâmicos de paginação -->
          </div>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- DADOS ABERTOS MUNICIPAIS E ESTADUAIS (SMT, DETRAN-SP, RECEITA, INFOSIGA)-->
      <!-- ===================================================================== -->
      <section class="card overflow-hidden">
        <div class="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <i class="ph-bold ph-database text-sky-600"></i>
              Dados Abertos Municipais e Estaduais
            </h2>
            <p class="text-xs text-slate-500">Licenças SGTP e frota Detran, PJ ativas da Receita e sinistros de trânsito no município de São Paulo, com recorte territorial por subprefeitura.</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">6 indicadores</span>
        </div>

        <div class="p-4 space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
__KPIS_ABERTOS__
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="card p-4 lg:col-span-2 flex flex-col">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h2 class="section-title flex items-center gap-1.5">
                    <i class="ph-bold ph-map-trifold text-rose-500 text-sm"></i>
                    Risco de Trânsito por Subprefeitura (Top 10)
                  </h2>
                  <p class="text-[11px] text-slate-400">Sinistros de trânsito localizados por coordenada dentro dos polígonos oficiais do GeoSampa</p>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">Infosiga / Detran-SP</span>
              </div>
              <div class="h-64 w-full flex-1">
                <canvas id="chart-abertos-subpref"></canvas>
              </div>
            </div>

            <div class="card p-4 flex flex-col">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h2 class="section-title flex items-center gap-1.5">
                    <i class="ph-bold ph-chart-line-up text-sky-500 text-sm"></i>
                    Série Mensal no Município
                  </h2>
                  <p class="text-[11px] text-slate-400">Sinistros, fatais e atropelamentos por mês</p>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200">12 meses</span>
              </div>
              <div class="h-64 w-full flex-1">
                <canvas id="chart-abertos-mes"></canvas>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto custom-scrollbar">
            <table class="tbl w-full text-left">
              <thead>
                <tr class="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider select-none">
                  <th class="py-2.5 px-3">Subprefeitura</th>
                  <th class="py-2.5 px-3 text-right">Sinistros</th>
                  <th class="py-2.5 px-3 text-right">Não Fatais</th>
                  <th class="py-2.5 px-3 text-right">Fatais</th>
                  <th class="py-2.5 px-3 text-right">Atropelamentos</th>
                  <th class="py-2.5 px-3 text-right">Envolvidos</th>
                </tr>
              </thead>
              <tbody id="tbody-abertos" class="text-slate-700">
__LINHAS_ABERTOS__
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>

    <!-- ===================================================================== -->
    <!-- TAB 2: CENTRAL DE PROSPECÇÃO CRM & WHATSAPP (EM 1 CLIQUE)             -->
    <!-- ===================================================================== -->
    <div id="tab-content-crm" class="hidden space-y-6">
      
      <!-- HEADER DO FUNIL CRM -->
      <section class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-md">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-lg">
                <i class="ph-bold ph-whatsapp-logo"></i>
              </span>
              <h2 class="text-lg font-bold">Fila de Prospecção Operacional & Funil WhatsApp</h2>
            </div>
            <p class="text-xs text-slate-300 mt-1">2.391 motoristas qualificados com telefones e mensagens personalizadas prontas para disparo em 1 clique.</p>
          </div>

          <!-- CONTADORES DE FUNIL DINÂMICOS -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <div class="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Novos Leads</span>
              <span id="crm-count-novos" class="text-sm font-black text-amber-400">0</span>
            </div>
            <div class="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Contatados</span>
              <span id="crm-count-contatados" class="text-sm font-black text-sky-400">0</span>
            </div>
            <div class="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Visitas Agendadas</span>
              <span id="crm-count-agendados" class="text-sm font-black text-purple-400">0</span>
            </div>
            <div class="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Filiados Cooperados</span>
              <span id="crm-count-filiados" class="text-sm font-black text-emerald-400">0</span>
            </div>
          </div>
        </div>
      </section>

      <!-- BARRA DE FILTROS RÁPIDOS CRM -->
      <section class="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="setCRMFilter('ALL')" id="crm-btn-all" class="btn bg-amber-500 text-slate-950">
            Todos (2.391)
          </button>
          <button onclick="setCRMFilter('TIER1')" id="crm-btn-tier1" class="btn bg-rose-50 hover:bg-rose-100 text-rose-800">
            <i class="ph-bold ph-fire text-rose-600"></i>
            <span>Tier 1: Ultra Quente (Score &ge; 80) 🔥</span>
          </button>
          <button onclick="setCRMFilter('CONTEMPLADOS')" id="crm-btn-contemplados" class="btn btn-soft">
            <i class="ph-bold ph-certificate text-emerald-600"></i>
            <span>Contemplados VIP (302)</span>
          </button>
          <button onclick="setCRMFilter('BUTANTA')" id="crm-btn-butanta" class="btn btn-soft">
            <i class="ph-bold ph-map-pin text-sky-600"></i>
            <span>Zona Oeste / Butantã (622)</span>
          </button>
          <button onclick="setCRMFilter('ELETRICOS')" id="crm-btn-eletricos" class="btn btn-soft">
            <i class="ph-bold ph-lightning text-amber-500"></i>
            <span>Híbrido/Elétrico (Edital 4)</span>
          </button>
          <button onclick="setCRMFilter('MULHERES')" id="crm-btn-mulheres" class="btn btn-soft">
            <i class="ph-bold ph-gender-female text-rose-500"></i>
            <span>Mulheres Taxistas (Edital 3)</span>
          </button>
          <button onclick="setCRMFilter('SUPLENTES')" id="crm-btn-suplentes" class="btn btn-soft">
            <i class="ph-bold ph-hourglass text-purple-600"></i>
            <span>Suplentes Top (47)</span>
          </button>
        </div>

        <div class="relative w-full sm:w-64">
          <input type="text" id="crm-search-input" oninput="applyCRMFilters()" placeholder="Buscar motorista no CRM..." class="field w-full pl-7 pr-2.5 py-1.5">
          <i class="ph-bold ph-magnifying-glass absolute left-2 top-2 text-slate-400 text-xs"></i>
        </div>
      </section>

      <!-- TABELA OPERACIONAL CRM -->
      <section class="card overflow-hidden flex flex-col">
        <div class="overflow-x-auto custom-scrollbar">
          <table class="tbl w-full text-left">
            <thead>
              <tr class="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider select-none">
                <th class="py-2.5 px-3">Motorista</th>
                <th class="py-2.5 px-3 text-center">Score / Tier</th>
                <th class="py-2.5 px-3">Edital / Veículo</th>
                <th class="py-2.5 px-3">Distância Butantã</th>
                <th class="py-2.5 px-3 text-center">Disparo WhatsApp</th>
                <th class="py-2.5 px-3">Status do Funil</th>
                <th class="py-2.5 px-3">Anotações do Operador</th>
                <th class="py-2.5 px-3 text-right">Dossiê</th>
              </tr>
            </thead>
            <tbody id="crm-table-body" class="text-slate-700">
              <!-- Renderizado via JavaScript -->
            </tbody>
          </table>
        </div>
        
        <!-- PAGINAÇÃO CRM -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="text-slate-500" id="crm-pagination-info">Mostrando 0 a 0 de 0 leads</div>
          <div class="flex items-center space-x-1" id="crm-pagination-controls"></div>
        </div>
      </section>

    </div>

    <!-- ===================================================================== -->
    <!-- TAB 3: MAPA TÁTICO GEOGRÁFICO GIS (SP & ROTAS COMERCIAIS)             -->
    <!-- ===================================================================== -->
    <div id="tab-content-map" class="hidden space-y-6">
      
      <!-- CONTROLES DO MAPA E ROTAS -->
      <section class="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <i class="ph-bold ph-map-pin-line text-sky-500"></i>
            Mapa Territorial e Roteiros de Visitas aos Pontos de Táxi
          </h2>
          <p class="text-xs text-slate-500">Localização da Sede da Chame Táxi (Butantã), 1.188 pontos oficiais e roteiros de captação de campo.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <div>
            <label class="eyebrow block mb-0.5">Camada Base (Tiles)</label>
            <select id="map-tile-provider" onchange="switchTileProvider(this.value)" class="field px-2.5 py-1.5 font-semibold text-slate-700">
              <option value="esri_street" selected>Esri Ruas (100% Liberado / Sem Bloqueio) ⭐</option>
              <option value="google">Google Maps (Padrão Vias)</option>
              <option value="carto">CartoDB Voyager (Claro)</option>
              <option value="esri_satellite">Esri Satélite (Fotografia Aérea)</option>
              <option value="esri_topo">Esri Topográfico</option>
            </select>
          </div>

          <div>
            <label class="eyebrow block mb-0.5">Filtrar Mapa & Rotas</label>
            <select id="map-route-filter" onchange="filterMapByRoute()" class="field px-2.5 py-1.5 font-semibold text-slate-700">
              <option value="ALL">Todos os Pontos, Hospitais & Empresas</option>
              <option value="MOB_VULN_ALTA">🔥 Contratos Alta Vulnerabilidade (Substituição Imediata)</option>
              <option value="MOB_APPS">📱 Clientes Presos no Uber/99 (Ganho Faixa Ônibus SP)</option>
              <option value="MOB_DESP">♿ Hospitais com Demanda de Desospitalização Ágil</option>
              <option value="EMPRESAS">🏢 Todas as 96 Grandes Empresas (100+ Colab.)</option>
              <option value="EMP_TIERA">🏢 Mega Corporações Tier A (&gt; 1.000 Colab.)</option>
              <option value="EMP_TECH">💻 Big Techs & Startups (Google, Nubank, Stone...)</option>
              <option value="EMP_FINANCE">🏦 Bancos & Fundos (Itaú BBA, BTG, Santander, XP...)</option>
              <option value="EMP_CONSULT">📊 Big Four & Consultorias (PwC, EY, Deloitte, MBB...)</option>
              <option value="EMP_LEGAL">⚖️ Bancas de Advocacia (Pinheiro Neto, Mattos Filho...)</option>
              <option value="HOSPITAIS">🏥 Todos os 94 Polos Hospitalares (5 km)</option>
              <option value="HOSP_TIERA">🏥 Hospitais Tier A (19 Quaternários VIP)</option>
              <option value="HOSP_ACES">♿ Foco Táxi Acessível (28 Polos)</option>
              <option value="Rota 1">Rota 1: Butantã & USP (&lt; 4 km)</option>
              <option value="Rota 2">Rota 2: Pinheiros & Faria Lima</option>
              <option value="Rota 3">Rota 3: Lapa & Leopoldina</option>
              <option value="Rota 4">Rota 4: Morumbi & Berrini</option>
              <option value="Rota 5">Rota 5: Paulista & Jardins</option>
              <option value="Rota 6">Rota 6: Terminais & Congonhas</option>
            </select>
          </div>

          <div class="pt-3.5 flex items-center gap-2">
            <button onclick="centerMapOnSede()" class="btn bg-amber-500 hover:bg-amber-400 text-slate-950">
              <i class="ph-bold ph-crosshair"></i>
              <span>Sede Butantã</span>
            </button>
            <button id="btn-toggle-hospitais" onclick="toggleHospitalsLayer()" class="btn bg-rose-600 hover:bg-rose-500 text-white" title="Exibir ou ocultar os 94 hospitais e clínicas B2B no raio de 5 km">
              <span>🏥 Hospitais 5km (94)</span>
            </button>
            <button id="btn-toggle-empresas" onclick="toggleEmpresasLayer()" class="btn bg-blue-600 hover:bg-blue-500 text-white" title="Exibir ou ocultar as 96 grandes empresas e edifícios corporativos no raio de 5 km">
              <span>🏢 Empresas 100+ (96)</span>
            </button>
          </div>
        </div>
      </section>

      <!-- MAPA & PAINEL DE ROTEIROS LADO A LADO -->
      <section class="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        <!-- CONTAINER DO MAPA LEAFLET -->
        <div class="card lg:col-span-3 p-2.5 relative">
          <div id="leaflet-map"></div>
          
          <!-- LEGENDA FLUTUANTE -->
          <div class="absolute bottom-5 left-5 z-[500] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-lg text-[11px] space-y-1.5 pointer-events-auto max-h-[300px] overflow-y-auto">
            <span class="font-bold text-slate-800 uppercase tracking-wider block text-[10px]">Legenda do Território</span>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> <span>Rota 1: Butantã / Sede</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> <span>Rota 2: Pinheiros / Faria Lima</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> <span>Rota 3: Lapa / Leopoldina</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> <span>Rota 4: Morumbi / Berrini</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span> <span>Rota 5: Paulista / Centro</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> <span>Rota 6: Congonhas / Terminais</span></div>
            <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100"><span class="w-3 h-3 rounded-full bg-amber-400 border border-slate-900 inline-block"></span> <b>⭐ Sede Chame Táxi</b></div>
            <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100"><span style="font-size:12px;">🏥</span> <b class="text-rose-700">Polos Hospitalares (5 km):</b></div>
            <div class="flex items-center gap-1.5 pl-3 text-[10px] text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span> <span>Tier A: Quaternários (Einstein, HC...)</span></div>
            <div class="flex items-center gap-1.5 pl-3 text-[10px] text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> <span>Tier B: Hospitais Gerais & PS</span></div>
            <div class="flex items-center gap-1.5 pl-3 text-[10px] text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> <span>Tier C: Diagnósticos & Clínicas</span></div>
            <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100"><span style="font-size:12px;">🏢</span> <b class="text-blue-700">Empresas 100+ Presenciais (5 km):</b></div>
            <div class="flex items-center gap-1.5 pl-3 text-[10px] text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> <span>Tier A: Mega Corporações (&gt;1.000)</span></div>
            <div class="flex items-center gap-1.5 pl-3 text-[10px] text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> <span>Tier B: Grandes Empresas (300-1.000)</span></div>
            <div class="flex items-center gap-1.5 pl-3 text-[10px] text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span> <span>Tier C: Médio Porte (100-300)</span></div>
          </div>
        </div>

        <!-- PAINEL LATERAL: PONTOS PRIORITÁRIOS DA ROTA -->
        <div class="card p-4 flex flex-col h-[calc(100vh-240px)] min-h-[550px]">
          <div class="pb-3 border-b border-slate-100 mb-2">
            <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Pontos Prioritários</span>
              <span id="route-panel-count" class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-[10px]">0</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">Visitas presenciais recomendadas</p>
          </div>

          <div id="route-points-list" class="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            <!-- Cards de pontos dinâmicos -->
          </div>
        </div>

      </section>

    </div>

    <!-- ===================================================================== -->
    <!-- TAB 4: CLIENTES CORPORATIVOS B2B (HOSPITAIS & GRANDES EMPRESAS 5KM) -->
    <!-- ===================================================================== -->
    <div id="tab-content-corp" class="space-y-6 hidden">
      
      <!-- EXECUTIVE KPI CARDS -->
      <section class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-buildings"></i>
          </div>
          <span class="eyebrow">Total Prospects B2B</span>
          <div class="kpi-value mt-1">190</div>
          <div class="text-[11px] text-purple-600 font-semibold mt-0.5">Raio 5 km Butantã</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-first-aid"></i>
          </div>
          <span class="eyebrow">Polos de Saúde</span>
          <div class="kpi-value mt-1">94</div>
          <div class="text-[11px] text-slate-500 mt-0.5">20 Quaternários Tier A</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-briefcase"></i>
          </div>
          <span class="eyebrow">Empresas 100+</span>
          <div class="kpi-value mt-1">96</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Grandes Sedes Presenciais</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-fire"></i>
          </div>
          <span class="eyebrow">Alta Vulnerabilidade</span>
          <div class="kpi-value mt-1">85</div>
          <div class="text-[11px] text-red-700 font-semibold mt-0.5">Substituição Imediata (44.7%)</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-currency-circle-dollar"></i>
          </div>
          <span class="eyebrow">Receita Mensal Estimada</span>
          <div class="text-xl font-black text-emerald-600 mt-1">R$ 3.83M</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Contratos B2B Faturados</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-wheelchair"></i>
          </div>
          <span class="eyebrow">Foco Táxi Acessível</span>
          <div class="kpi-value mt-1">28</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Desospitalização & PcD</div>
        </div>

        <div class="card kpi group">
          <div class="absolute right-3 top-3 w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-lg">
            <i class="ph-bold ph-leaf"></i>
          </div>
          <span class="eyebrow">Frota Elétrica ESG</span>
          <div class="kpi-value mt-1">32</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Edital 4 (Descarbonização)</div>
        </div>
      </section>

      <!-- FILTROS AVANÇADOS & BARRA DE BUSCA -->
      <section class="card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <i class="ph-bold ph-buildings text-purple-600 text-lg"></i>
              <span>Diretório de Clientes Corporativos B2B (Raio 5 km Sede Butantã)</span>
            </h2>
            <span id="corp-total-badge" class="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-200">
              190 alvos mapeados
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="exportCorpCSV()" class="btn bg-slate-800 hover:bg-slate-700 text-white">
              <i class="ph-bold ph-download-simple"></i>
              <span>Exportar Base B2B (CSV)</span>
            </button>
            <button onclick="switchMainTab('map')" class="btn bg-sky-600 hover:bg-sky-500 text-white">
              <i class="ph-bold ph-map-pin"></i>
              <span>Ver Alvos no Mapa GIS</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- BUSCA RÁPIDA -->
          <div class="lg:col-span-2">
            <label class="eyebrow block mb-1">Buscar Empresa / Hospital / Decisor</label>
            <div class="relative">
              <i class="ph-bold ph-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
              <input type="text" id="corp-search-query" oninput="applyCorpFilters()" placeholder="Nome, hospital, bairro, decisor, cargo, dor..." class="field w-full pl-9 pr-3 py-1.5 text-slate-800"/>
            </div>
          </div>

          <!-- FILTRO POR SEGMENTO -->
          <div>
            <label class="eyebrow block mb-1">Segmento / Setor</label>
            <select id="corp-segment-filter" onchange="applyCorpFilters()" class="field w-full px-2.5 py-1.5 font-medium text-slate-700">
              <option value="ALL">Todos os Segmentos (190)</option>
              <option value="HOSPITAIS">🏥 Apenas Hospitais & Saúde (94)</option>
              <option value="EMPRESAS">🏢 Apenas Grandes Empresas (96)</option>
              <option value="HOSP_TIERA">🏥 Quaternários Tier A (Einstein, HC...)</option>
              <option value="TECH">💻 Big Techs & Startups</option>
              <option value="FINANCE">🏦 Bancos & Financeiras</option>
              <option value="INDUSTRY">🌿 Indústrias & Bens de Consumo</option>
              <option value="CONSULT">📊 Big Four & Consultorias</option>
              <option value="LEGAL">⚖️ Bancas de Advocacia</option>
              <option value="SHOPPING">🏢 Shoppings & Complexos</option>
            </select>
          </div>

          <!-- FILTRO POR VULNERABILIDADE -->
          <div>
            <label class="eyebrow block mb-1">Vulnerabilidade Contratual</label>
            <select id="corp-vuln-filter" onchange="applyCorpFilters()" class="field w-full px-2.5 py-1.5 font-medium text-slate-700">
              <option value="ALL">Todas as Vulnerabilidades</option>
              <option value="Alta">🔥 Alta Vulnerabilidade (85)</option>
              <option value="Média">⏳ Média Vulnerabilidade (105)</option>
            </select>
          </div>

          <!-- FILTRO POR DEMANDA ESPECIAL -->
          <div>
            <label class="eyebrow block mb-1">Foco de Demanda</label>
            <select id="corp-demand-filter" onchange="applyCorpFilters()" class="field w-full px-2.5 py-1.5 font-medium text-slate-700">
              <option value="ALL">Todas as Demandas</option>
              <option value="ACES">♿ Táxi Acessível / Desospitalização</option>
              <option value="VOUCHERS">🌙 Vouchers Noturnos / Horas Extras</option>
              <option value="ESG">⚡ Frotas Elétricas / ESG (Edital 4)</option>
              <option value="FAIXA">🚌 Benefício Faixa Exclusiva Ônibus</option>
            </select>
          </div>

          <!-- FILTRO POR DISTÂNCIA DA SEDE -->
          <div>
            <label class="eyebrow block mb-1">Distância Sede Butantã</label>
            <select id="corp-dist-filter" onchange="applyCorpFilters()" class="field w-full px-2.5 py-1.5 font-medium text-slate-700">
              <option value="ALL">Todas (< 5.0 km)</option>
              <option value="2.5">📍 Raio Imediato (< 2.5 km)</option>
              <option value="4.0">📍 Raio Próximo (< 4.0 km)</option>
            </select>
          </div>
        </div>
      </section>

      <!-- TABELA INTERATIVA DE CLIENTES CORPORATIVOS B2B -->
      <section class="card overflow-hidden flex flex-col">
        <div class="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800" id="corp-results-count">Exibindo 0 clientes</span>
            <span class="text-slate-400">|</span>
            <span class="text-slate-500">Clique em qualquer linha para abrir o <b>Dossiê Completo B2B</b></span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[11px]">Itens por página:</span>
            <select id="corp-page-size" onchange="changeCorpPageSize()" class="field px-2 py-0.5 text-slate-700">
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="190">Todos (190)</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
          <table class="tbl w-full text-left">
            <thead>
              <tr class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th class="py-2.5 px-3">Prospect / Instituição</th>
                <th class="py-2.5 px-3">Segmento & Local</th>
                <th class="py-2.5 px-3 text-center">Dist. Sede</th>
                <th class="py-2.5 px-3">Mobilidade Atual & Dor</th>
                <th class="py-2.5 px-3 text-center">Vulnerab.</th>
                <th class="py-2.5 px-3">Potencial Receita</th>
                <th class="py-2.5 px-3">Decisores & E-mails</th>
                <th class="py-2.5 px-3 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody id="corp-table-body" class="">
              <!-- Linhas geradas via JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- PAGINAÇÃO -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs" id="corp-pagination">
          <!-- Controles de paginação dinâmicos -->
        </div>
      </section>

    </div>

  </main>

  <!-- ===================================================================== -->
  <!-- MODAL / DOSSIÊ 360° DO MOTORISTA                                      -->
  <!-- ===================================================================== -->
  <div id="driver-modal" class="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm hidden flex items-center justify-center p-3 sm:p-5">
    <div class="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" id="dossier-print-container">
      
      <!-- MODAL HEADER -->
      <div class="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between border-b border-slate-800">
        <div class="flex items-center space-x-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/20" id="modal-avatar">
            CT
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight" id="modal-name">Nome do Motorista</h3>
              <span id="modal-status-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Contemplado
              </span>
              <span id="modal-supl-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 hidden">
                Suplente Alta Probabilidade
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
              <span id="modal-cpf-top">CPF: —</span>
              <span>•</span>
              <span id="modal-condutax-top">Condutax: —</span>
              <span>•</span>
              <span id="modal-id-top">ID: —</span>
            </div>
          </div>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-xl">
          <i class="ph-bold ph-x"></i>
        </button>
      </div>

      <!-- MODAL BODY (SCROLLABLE DOSSIÊ) -->
      <div class="p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs flex-1">
        
        <!-- CARD 1: STATUS, SCORE & SUCESSO -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Score Chame Táxi</span>
            <div class="flex items-baseline gap-2">
              <span id="modal-score" class="kpi-value">—</span>
              <span id="modal-tier" class="text-[10px] font-bold text-slate-500">Sem Score</span>
            </div>
            <p id="modal-just-score" class="text-[11px] text-slate-500 mt-1 italic leading-tight">Sem pontuação comercial atribuída.</p>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Classificação no Edital</span>
            <div class="text-xl font-bold text-slate-900" id="modal-rank">Posição —</div>
            <p id="modal-fila" class="text-[11px] text-slate-500 mt-1">Fila de Espera: 0</p>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Senioridade DTP</span>
            <div class="text-xl font-bold text-slate-900" id="modal-tempo">— anos</div>
            <p id="modal-safra" class="text-[11px] text-slate-500 mt-1">Safra: Não informada</p>
          </div>
        </div>

        <!-- CARD 2: PREVISÃO DE CHAMAMENTO & SUPLÊNCIA (SE APLICÁVEL) -->
        <div id="modal-supl-container" class="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 hidden">
          <div class="flex items-center gap-1.5 font-bold text-xs text-purple-950 mb-1">
            <i class="ph-bold ph-hourglass-high text-purple-600 text-sm"></i>
            <span>Inteligência de Suplência & Fila de Espera DTP</span>
          </div>
          <p id="modal-supl-previsao" class="text-xs leading-relaxed text-purple-950 font-medium">—</p>
        </div>

        <!-- CARD 3: AÇÃO COMERCIAL RECOMENDADA -->
        <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <div class="flex items-center gap-1.5 font-bold text-xs text-amber-950 mb-1">
            <i class="ph-bold ph-lightbulb text-amber-600 text-sm"></i>
            <span>Estratégia de Captação Chame Táxi</span>
          </div>
          <p id="modal-acao" class="text-xs leading-relaxed text-amber-950 font-medium">Nenhuma ação recomendada.</p>
        </div>

        <!-- CARD 4: REQUISITOS REGULATÓRIOS DO VEÍCULO (DTP) -->
        <div class="space-y-1.5">
          <h4 class="section-title border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <i class="ph-bold ph-car-profile text-amber-500"></i>
            Homologação Veicular & Exigências DTP
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span class="eyebrow">Regra do Veículo</span>
              <span id="modal-veic-exig" class="font-bold text-slate-800">—</span>
            </div>
            <div>
              <span class="eyebrow">Modelos Homologados Aceitos</span>
              <span id="modal-veic-mod" class="font-semibold text-emerald-800 leading-tight block">—</span>
            </div>
            <div>
              <span class="eyebrow">Prazo Vistoria DTP</span>
              <span id="modal-veic-prazo" class="font-bold text-rose-700">—</span>
            </div>
          </div>
        </div>

        <!-- CARD 5: DETALHES DO SORTEIO 2026 -->
        <div class="space-y-1.5">
          <h4 class="section-title border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <i class="ph-bold ph-file-text text-slate-500"></i>
            Dados Oficiais do Edital
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span class="eyebrow">Edital</span>
              <span id="modal-edital" class="font-semibold text-slate-800">—</span>
            </div>
            <div>
              <span class="eyebrow">Modalidade Cota</span>
              <span id="modal-cota" class="font-semibold text-slate-800">—</span>
            </div>
            <div>
              <span class="eyebrow">Protocolo Inscrição</span>
              <span id="modal-protocolo" class="font-semibold text-slate-800">—</span>
            </div>
            <div>
              <span class="eyebrow">Gênero / Faixa</span>
              <span id="modal-gen" class="font-semibold text-slate-800">—</span>
            </div>
          </div>
        </div>

        <!-- CARD 6: CONTATOS, WHATSAPP & TERRITORIALIDADE -->
        <div class="space-y-1.5">
          <h4 class="section-title border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <i class="ph-bold ph-phone-call text-emerald-600"></i>
            Contatos, Endereço & Distância até a Sede
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span class="eyebrow">Telefone Principal</span>
              <span id="modal-tel1" class="font-bold text-slate-900">—</span>
            </div>
            <div>
              <span class="eyebrow">Distância Sede Butantã</span>
              <span id="modal-dist-km" class="font-black text-indigo-700">—</span>
            </div>
            <div>
              <span class="eyebrow">Bairro / Região</span>
              <span id="modal-bairro" class="font-semibold text-slate-800">—</span>
            </div>
            <div>
              <span class="eyebrow">CEP</span>
              <span id="modal-cep" class="font-semibold text-slate-800">—</span>
            </div>
          </div>
        </div>

        <!-- CARD 7: PROCESSO SEI, DOC & PONTO DE TÁXI -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-purple-50/50 border border-purple-200">
            <span class="text-[10px] uppercase font-bold text-purple-700 block mb-1">Processo SEI / Diário Oficial</span>
            <div class="space-y-1">
              <p class="font-bold text-slate-900" id="modal-sei-proc">Processo: —</p>
              <p class="text-[11px] text-slate-600" id="modal-doc-resumo">Sem publicações recentes no DOC</p>
              <div class="pt-1.5 flex gap-2">
                <a id="modal-link-sei" href="#" target="_blank" class="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-0.5">
                  <i class="ph-bold ph-arrow-square-out"></i> Pesquisar SEI PMSP
                </a>
                <a id="modal-link-doc" href="#" target="_blank" class="text-[10px] font-bold text-cyan-700 hover:underline flex items-center gap-0.5">
                  <i class="ph-bold ph-newspaper"></i> Abrir Diário Oficial
                </a>
              </div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-sky-50/50 border border-sky-200">
            <span class="text-[10px] uppercase font-bold text-sky-700 block mb-1">Ponto de Táxi Oficial</span>
            <div class="space-y-1">
              <p class="font-bold text-slate-900" id="modal-ponto-end">Ponto Livre / Sem Ponto Privativo</p>
              <p class="text-[11px] text-slate-600" id="modal-ponto-meta">Vagas: — | Saldo: —</p>
              <p class="text-[11px] text-slate-600" id="modal-ponto-tel">Telefone Ponto: —</p>
            </div>
          </div>
        </div>

      </div>

      <!-- MODAL FOOTER -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <a id="modal-btn-wpp-ready" href="#" target="_blank" class="btn bg-emerald-600 hover:bg-emerald-500 text-white">
            <i class="ph-bold ph-whatsapp-logo text-sm"></i>
            <span>Disparar WhatsApp (Mensagem Pronta)</span>
          </a>
          <button onclick="window.print()" class="btn bg-slate-800 hover:bg-slate-700 text-white">
            <i class="ph-bold ph-printer"></i>
            <span>Imprimir Ficha Dossiê</span>
          </button>
        </div>
        <button onclick="closeModal()" class="btn bg-slate-200 text-slate-800 hover:bg-slate-300">
          Fechar Dossiê
        </button>
      </div>

    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- MODAL / DOSSIÊ 360° DO CLIENTE CORPORATIVO B2B                        -->
  <!-- ===================================================================== -->
  <div id="corp-dossier-modal" class="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm hidden flex items-center justify-center p-3 sm:p-5">
    <div class="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- MODAL HEADER -->
      <div class="p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white flex items-start justify-between border-b border-slate-800">
        <div class="flex items-center space-x-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-500/20" id="corp-modal-avatar">
            🏢
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight" id="corp-modal-name">Nome do Prospect</h3>
              <span id="corp-modal-tier-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Tier A
              </span>
              <span id="corp-modal-score-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Score: 95 pts
              </span>
              <span id="corp-modal-vuln-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                Alta Vulnerabilidade
              </span>
            </div>
            <p class="text-xs text-slate-300 mt-1" id="corp-modal-subtitle">Segmento &bull; Endereço</p>
          </div>
        </div>
        <button onclick="closeCorpModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition">
          <i class="ph-bold ph-x text-base"></i>
        </button>
      </div>

      <!-- MODAL BODY (SCROLLÁVEL) -->
      <div class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-xs">
        
        <!-- GRID DE CARDS ESTRATÉGICOS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          <!-- CARD 1: DIAGNÓSTICO DE MOBILIDADE ATUAL -->
          <div class="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
            <span class="text-[10px] uppercase font-bold text-rose-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-car text-sm"></i>
              <span>Diagnóstico de Mobilidade & Fornecedor Atual</span>
            </span>
            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-rose-200/60">
              <div>
                <span class="eyebrow">Fornecedor Atual</span>
                <span id="corp-modal-forn" class="font-bold text-slate-900">—</span>
              </div>
              <div>
                <span class="eyebrow">Modelo de Operação</span>
                <span id="corp-modal-tipo-mob" class="font-semibold text-slate-800">—</span>
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-rose-700 uppercase block">Principal Gargalo / Dor</span>
              <p id="corp-modal-dor" class="text-slate-800 italic mt-0.5 leading-snug">—</p>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-rose-200/60">
              <div>
                <span class="eyebrow">Corridas Estimadas</span>
                <span id="corp-modal-corridas" class="font-bold text-slate-900">—</span>
              </div>
              <div>
                <span class="eyebrow">Potencial de Receita</span>
                <span id="corp-modal-rec" class="font-black text-emerald-600">—</span>
              </div>
            </div>
          </div>

          <!-- CARD 2: LOCALIZAÇÃO & LOGÍSTICA SEDE BUTANTÃ -->
          <div class="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
            <span class="text-[10px] uppercase font-bold text-blue-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-map-pin text-sm"></i>
              <span>Localização & Proximidade Sede Butantã</span>
            </span>
            <div class="pt-1 border-t border-blue-200/60">
              <span class="eyebrow">Endereço Completo</span>
              <span id="corp-modal-end" class="font-bold text-slate-900 leading-snug block">—</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="eyebrow">Distância Sede</span>
                <span id="corp-modal-dist" class="font-bold text-blue-700">—</span>
              </div>
              <div>
                <span class="eyebrow">Tempo de Deslocamento</span>
                <span id="corp-modal-tempo" class="font-bold text-slate-800">—</span>
              </div>
            </div>
            <div>
              <span class="eyebrow">Ponto de Táxi DTP Próximo</span>
              <span id="corp-modal-ponto" class="font-semibold text-slate-800">—</span>
            </div>
          </div>

        </div>

        <!-- CARD 3: DECISORES DE COMPRAS, SUPRIMENTOS & FACILITIES -->
        <div class="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-users text-sm"></i>
              <span>Decisores de Contratação (Compras, Suprimentos & Facilities)</span>
            </span>
            <span class="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Procurement B2B</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 border-t border-emerald-200/60">
            <div>
              <span class="eyebrow">Área Decisora</span>
              <span id="corp-modal-dec-area" class="font-bold text-slate-900 block">—</span>
            </div>
            <div>
              <span class="eyebrow">Cargos-Alvo Prioritários</span>
              <span id="corp-modal-dec-cargos" class="font-semibold text-slate-800 block">—</span>
            </div>
            <div>
              <span class="eyebrow">Liderança Mapeada / Canal</span>
              <span id="corp-modal-dec-lideres" class="font-bold text-indigo-700 block">—</span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1.5 border-t border-emerald-200/60">
            <div>
              <span class="eyebrow">Padrão de E-mail Corporativo</span>
              <span id="corp-modal-email-padrao" class="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200 block">—</span>
            </div>
            <div>
              <span class="eyebrow">E-mail Provável do Decisor / Canal</span>
              <span id="corp-modal-email-dec" class="font-mono text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 block">—</span>
            </div>
          </div>
        </div>

        <!-- CARD 4: BOTÕES DE AÇÃO RÁPIDA 1-CLIQUE -->
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span class="text-[10px] uppercase font-bold text-slate-600 tracking-wider block">Ações Rápidas de Prospecção</span>
          <div class="flex flex-wrap gap-2">
            <a id="corp-modal-link-linkedin" href="#" target="_blank" class="btn bg-[#0a66c2] hover:bg-[#004182] text-white">
              <i class="ph-bold ph-linkedin-logo"></i>
              <span>Buscar no LinkedIn Web ↗</span>
            </a>
            <a id="corp-modal-link-google" href="#" target="_blank" class="btn bg-slate-800 hover:bg-slate-700 text-white">
              <i class="ph-bold ph-google-logo"></i>
              <span>Ver Perfis no Google (Sem Login) ↗</span>
            </a>
            <a id="corp-modal-link-hunter" href="#" target="_blank" class="btn bg-[#e11d48] hover:bg-[#be123c] text-white">
              <i class="ph-bold ph-target"></i>
              <span>Hunter.io (E-mails do Domínio) ↗</span>
            </a>
            <a id="corp-modal-link-dork-email" href="#" target="_blank" class="btn bg-emerald-600 hover:bg-emerald-500 text-white">
              <i class="ph-bold ph-envelope"></i>
              <span>Google Dork E-mails ↗</span>
            </a>
            <a id="corp-modal-link-maps" href="#" target="_blank" class="btn bg-blue-600 hover:bg-blue-500 text-white">
              <i class="ph-bold ph-navigation-arrow"></i>
              <span>Rota Google Maps ↗</span>
            </a>
            <button id="corp-modal-btn-locate" onclick="locateCurrentCorpOnMap()" class="btn bg-amber-500 hover:bg-amber-400 text-slate-950">
              <i class="ph-bold ph-crosshair"></i>
              <span>Ver no Mapa GIS</span>
            </button>
            <a id="corp-modal-link-tel" href="#" class="btn bg-slate-200 hover:bg-slate-300 text-slate-800">
              <i class="ph-bold ph-phone"></i>
              <span id="corp-modal-tel-txt">Ligar Central</span>
            </a>
          </div>
        </div>

        <!-- CARD 5: SCRIPT DE ABORDAGEM PERSONALIZADO (INMAIL / EMAIL) -->
        <div class="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-chat-text text-sm"></i>
              <span>Script Personalizado de Abordagem Comercial (InMail / Cold Email)</span>
            </span>
            <button onclick="copyCorpScript()" class="btn bg-amber-500 hover:bg-amber-400 text-slate-950">
              <i class="ph-bold ph-copy"></i>
              <span id="corp-copy-script-btn-txt">Copiar Mensagem Pronta</span>
            </button>
          </div>
          <p id="corp-modal-script-text" class="text-slate-800 bg-white p-3 rounded-lg border border-amber-200 font-medium leading-relaxed select-all">
            Carregando script personalizado...
          </p>
        </div>

        <!-- CARD 6: GESTÃO DO LEAD CRM B2B (PERSISTÊNCIA LOCALSTORAGE) -->
        <div class="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-purple-800 tracking-wider flex items-center gap-1">
              <i class="ph-bold ph-kanban text-sm"></i>
              <span>Gestão de Contato CRM B2B & Histórico</span>
            </span>
            <span id="corp-crm-saved-indicator" class="text-[10px] font-bold text-emerald-600 hidden">✓ Salvo localmente</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status do Funil B2B</label>
              <select id="corp-crm-status" class="field w-full px-2.5 py-1.5 font-semibold text-slate-800">
                <option value="1 - Novo Prospect">1 - Novo Prospect</option>
                <option value="2 - Decisor Conectado no LinkedIn">2 - Decisor Conectado no LinkedIn</option>
                <option value="3 - E-mail / Apresentação Enviada">3 - E-mail / Apresentação Enviada</option>
                <option value="4 - Reunião Agendada">4 - Reunião Agendada</option>
                <option value="5 - Proposta Comercial em Análise">5 - Proposta Comercial em Análise</option>
                <option value="6 - Contrato Homologado">6 - Contrato Homologado ⭐</option>
                <option value="7 - Standby / Retornar em 60 dias">7 - Standby / Retornar em 60 dias</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anotações do Contato / Próximos Passos</label>
              <div class="flex gap-2">
                <input type="text" id="corp-crm-notes" placeholder="Ex: Falou com Felipe no LinkedIn, reunião pré-agendada para quinta..." class="field flex-1 px-3 py-1.5 text-slate-800"/>
                <button onclick="saveCorpCRM()" class="btn bg-purple-600 hover:bg-purple-500 text-white shrink-0">
                  <i class="ph-bold ph-floppy-disk"></i>
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- MODAL FOOTER -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-500" id="corp-modal-footer-id">ID Prospect: CORP-000</span>
        </div>
        <button onclick="closeCorpModal()" class="btn bg-slate-200 text-slate-800 hover:bg-slate-300">
          Fechar Dossiê B2B
        </button>
      </div>

    </div>
  </div>

  <!-- SCRIPT & DADOS EMBUTIDOS -->
  <script>
    const RAW_DATA = __RAW_DATA_PLACEHOLDER__;
    const EDITAL_STATS = __EDITAL_STATS_PLACEHOLDER__;
    const TIER_STATS = __TIER_STATS_PLACEHOLDER__;
    const CRM_LEADS = __CRM_DATA_PLACEHOLDER__;
    const MAP_PONTOS = __MAP_PONTOS_PLACEHOLDER__;
    const ABERTOS = __ABERTOS_PLACEHOLDER__;
    const HOSPITAIS_5KM = __HOSPITAIS_PLACEHOLDER__;
    const EMPRESAS_5KM = __EMPRESAS_PLACEHOLDER__;

    const ALL_CORP_CLIENTS = [
      ...HOSPITAIS_5KM.map(h => ({ ...h, isHosp: true, tipo_entidade: 'Hospital / Polo Saúde', setor: h.tipo || 'Hospital / Saúde' })),
      ...EMPRESAS_5KM.map(e => ({ ...e, isHosp: false, tipo_entidade: 'Grande Empresa (100+)', setor: e.setor || 'Corporativo' }))
    ];

    let currentMainTab = 'master';
    let filteredMaster = [...RAW_DATA];
    let filteredCRM = [...CRM_LEADS];
    let filteredCorp = [...ALL_CORP_CLIENTS];
    let currentMasterPage = 1;
    let currentCRMPage = 1;
    let currentCorpPage = 1;
    const pageSize = 50;
    let corpPageSize = 25;
    let currentCorpModalId = null;

    let leafletMapInstance = null;
    let mapMarkersLayer = null;
    let hospitalsMarkersLayer = null;
    let empresasMarkersLayer = null;
    let isHospitalsVisible = true;
    let isEmpresasVisible = true;

    // Sede Chame Táxi
    const CHAME_LAT = -23.5715;
    const CHAME_LON = -46.7082;

    window.addEventListener('DOMContentLoaded', () => {
      initCharts();
      applyFilters();
      applyCRMFilters();
      updateCRMStats();
      applyCorpFilters();
    });

    // TROCA DE ABAS PRINCIPAIS
    function switchMainTab(tab) {
      currentMainTab = tab;
      
      const tabMaster = document.getElementById('tab-content-master');
      const tabCRM = document.getElementById('tab-content-crm');
      const tabMap = document.getElementById('tab-content-map');
      const tabCorp = document.getElementById('tab-content-corp');
      
      const btnMaster = document.getElementById('nav-btn-master');
      const btnCRM = document.getElementById('nav-btn-crm');
      const btnMap = document.getElementById('nav-btn-map');
      const btnCorp = document.getElementById('nav-btn-corp');

      tabMaster.classList.add('hidden');
      tabCRM.classList.add('hidden');
      tabMap.classList.add('hidden');
      if (tabCorp) tabCorp.classList.add('hidden');

      btnMaster.className="nav-tab text-slate-300 hover:text-white";
      btnCRM.className="nav-tab text-slate-300 hover:text-white";
      btnMap.className="nav-tab text-slate-300 hover:text-white";
      if (btnCorp) btnCorp.className="nav-tab text-slate-300 hover:text-white";

      if (tab === 'master') {
        tabMaster.classList.remove('hidden');
        btnMaster.className="nav-tab is-active bg-amber-500 text-slate-950";
      } else if (tab === 'crm') {
        tabCRM.classList.remove('hidden');
        btnCRM.className="nav-tab is-active bg-emerald-500 text-slate-950";
      } else if (tab === 'map') {
        tabMap.classList.remove('hidden');
        btnMap.className="nav-tab is-active bg-sky-500 text-slate-950";
        initLeafletMap();
      } else if (tab === 'corp') {
        if (tabCorp) tabCorp.classList.remove('hidden');
        if (btnCorp) btnCorp.className="nav-tab is-active bg-purple-600 text-white";
        applyCorpFilters();
      }
    }

    // =========================================================================
    // INICIALIZAÇÃO DO MAPA GIS LEAFLET (COM PROVEDORES CORPORATIVOS LIVRES)
    // =========================================================================
    let currentTileLayer = null;
    const TILE_PROVIDERS = {
      'esri_street': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attr: '&copy; Esri World Street Map (Corporativo)'
      },
      'google': {
        url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attr: '&copy; Google Maps'
      },
      'carto': {
        url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attr: '&copy; CARTO Voyager'
      },
      'esri_satellite': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: '&copy; Esri World Imagery (Satélite)'
      },
      'esri_topo': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attr: '&copy; Esri Topo Map'
      }
    };

    function switchTileProvider(key) {
      if (!leafletMapInstance || !TILE_PROVIDERS[key]) return;
      if (currentTileLayer) {
        leafletMapInstance.removeLayer(currentTileLayer);
      }
      const prov = TILE_PROVIDERS[key];
      currentTileLayer = L.tileLayer(prov.url, {
        maxZoom: 19,
        attribution: prov.attr
      }).addTo(leafletMapInstance);
      currentTileLayer.bringToBack();
    }

    function initLeafletMap() {
      if (typeof L === 'undefined') {
        const mapContainer = document.getElementById('leaflet-map');
        if (mapContainer) {
          mapContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
              <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl font-bold">
                🗺️
              </div>
              <h3 class="text-sm font-bold text-slate-800">Modo de Roteiro Tático Ativo</h3>
              <p class="text-xs text-slate-500 max-w-md">O navegador está em rede com restrição de componentes externos. Você pode navegar pelos 345 pontos prioritários no painel ao lado e abrir as rotas diretamente no Google Maps!</p>
            </div>
          `;
        }
        return;
      }

      if (leafletMapInstance) {
        setTimeout(() => { leafletMapInstance.invalidateSize(); }, 200);
        return;
      }

      try {
        leafletMapInstance = L.map('leaflet-map', {
          zoomControl: true,
          fadeAnimation: true
        }).setView([CHAME_LAT, CHAME_LON], 13);

        // Define Esri Ruas como padrão inicial (100% liberado)
        switchTileProvider('esri_street');

        // Sede Chame Táxi
        const sedeIcon = L.divIcon({
          className: 'custom-sede-icon',
          html: `<div style="background-color:#d97706; color:#000; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:2px solid #000; font-weight:bold; font-size:18px; box-shadow:0 4px 14px rgba(0,0,0,0.35);">⭐</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const sedeMarker = L.marker([CHAME_LAT, CHAME_LON], { icon: sedeIcon }).addTo(leafletMapInstance);
        sedeMarker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; line-height:1.4;">
            <b style="font-size:14px; color:#d97706;">COOPERATIVA CHAME TÁXI</b><br>
            <b>Sede Operacional & Central de Rádio:</b> Av. Vital Brasil, Butantã, São Paulo - SP<br>
            <span style="color:#059669; font-weight:bold;">Pólo Estratégico da Zona Oeste</span><br>
            <div style="margin-top:6px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${CHAME_LAT},${CHAME_LON}" target="_blank" style="display:inline-block; background:#d97706; color:#000; font-weight:bold; padding:4px 8px; border-radius:6px; text-decoration:none; font-size:10px;">Como Chegar (Google Maps) ↗</a>
            </div>
          </div>
        `);

        // Círculos de Raio da Sede
        L.circle([CHAME_LAT, CHAME_LON], { radius: 3000, color: '#d97706', fillOpacity: 0.05, weight: 1.5, dashArray: '4, 4' }).addTo(leafletMapInstance);
        L.circle([CHAME_LAT, CHAME_LON], { radius: 5000, color: '#2563eb', fillOpacity: 0.03, weight: 1.5, dashArray: '4, 4' }).addTo(leafletMapInstance);
        L.circle([CHAME_LAT, CHAME_LON], { radius: 10000, color: '#9333ea', fillOpacity: 0.02, weight: 1, dashArray: '4, 4' }).addTo(leafletMapInstance);

        mapMarkersLayer = L.layerGroup().addTo(leafletMapInstance);
        hospitalsMarkersLayer = L.layerGroup().addTo(leafletMapInstance);
        empresasMarkersLayer = L.layerGroup().addTo(leafletMapInstance);
        renderMapPoints(MAP_PONTOS);
        renderHospitalMarkers(HOSPITAIS_5KM);
        renderEmpresasMarkers(EMPRESAS_5KM);
        setTimeout(() => { if (leafletMapInstance) leafletMapInstance.invalidateSize(); }, 250);
      } catch (err) {
        console.error("Erro na inicialização do mapa Leaflet:", err);
      }
    }

    function getRouteColor(rota) {
      if (rota.includes('Rota 1')) return '#10b981'; // verde
      if (rota.includes('Rota 2')) return '#3b82f6'; // azul
      if (rota.includes('Rota 3')) return '#a855f7'; // roxo
      if (rota.includes('Rota 4')) return '#f59e0b'; // amber
      if (rota.includes('Rota 5')) return '#06b6d4'; // cyan
      if (rota.includes('Rota 6')) return '#ef4444'; // vermelho
      return '#64748b'; // slate
    }

    function renderMapPoints(points) {
      if (!mapMarkersLayer) return;
      mapMarkersLayer.clearLayers();

      const listContainer = document.getElementById('route-points-list');
      listContainer.innerHTML = '';
      document.getElementById('route-panel-count').innerText = `${points.length} pontos`;

      points.forEach(p => {
        const color = getRouteColor(p.rota);
        const radius = p.qtd_mot > 0 ? 8 : (p.saldo > 0 ? 6 : 5);

        const circleMarker = L.circleMarker([p.lat, p.lon], {
          radius: radius,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(mapMarkersLayer);

        circleMarker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:11px; line-height:1.4; max-width:270px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <b style="font-size:13px; color:#1e293b;">Ponto ${p.id}</b>
              <span style="background:${color}; color:#fff; padding:1px 6px; border-radius:4px; font-size:9px; font-weight:bold;">${p.rota.split(' - ')[0]}</span>
            </div>
            <b>Endereço:</b> ${p.end}<br>
            <b>Distância Sede:</b> ${p.dist ? p.dist + ' km' : '—'}<br>
            <b>Vagas Totais:</b> ${p.cap} | <b>Saldo Livres:</b> <span style="color:${p.saldo > 0 ? '#059669' : '#64748b'}; font-weight:bold;">${p.saldo}</span><br>
            <b>Motoristas da Base Mestre:</b> <b style="color:#d97706;">${p.qtd_mot}</b><br>
            ${p.nomes_mot !== '—' ? '<div style="margin-top:4px; padding:4px; background:#f1f5f9; border-radius:4px; font-size:10px;"><b>Taxistas Mapeados:</b> ' + p.nomes_mot + '</div>' : ''}
            <div style="margin-top:4px; font-size:10px; color:#475569;"><b>Horário Ideal:</b> ${p.horario}</div>
            <div style="margin-top:6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" style="display:inline-block; background:#0284c7; color:#fff; font-weight:bold; padding:3px 8px; border-radius:4px; text-decoration:none; font-size:10px;">Abrir no Google Maps ↗</a>
            </div>
          </div>
        `);

        // Adicionar ao painel lateral
        const card = document.createElement('div');
        card.className="p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 bg-slate-50/60 hover:bg-sky-50/40 transition cursor-pointer text-[11px]";
        card.onclick = () => {
          if (leafletMapInstance) {
            leafletMapInstance.setView([p.lat, p.lon], 16);
            circleMarker.openPopup();
          }
        };
        card.innerHTML = `
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-slate-800">Ponto ${p.id}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style="background:${color};">${p.dist ? p.dist + ' km' : ''}</span>
          </div>
          <p class="text-slate-600 line-clamp-2 leading-tight">${p.end}</p>
          <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60">
            <span>Saldo: <b>${p.saldo}</b></span>
            <span>Motoristas: <b class="text-amber-700">${p.qtd_mot}</b></span>
            <a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" onclick="event.stopPropagation();" class="text-sky-600 hover:underline font-bold">Maps ↗</a>
          </div>
        `;
        listContainer.appendChild(card);
      });
    }

    // RENDERIZAR MARCADORES HOSPITALARES NO MAPA
    function renderHospitalMarkers(hospitals) {
      if (!hospitalsMarkersLayer) return;
      hospitalsMarkersLayer.clearLayers();

      hospitals.forEach(h => {
        const isTierA = h.tier.includes('Tier A');
        const isTierB = h.tier.includes('Tier B');
        const bgColor = isTierA ? '#e11d48' : (isTierB ? '#d97706' : '#0284c7');
        const sz = isTierA ? 26 : (isTierB ? 22 : 18);
        const iconSize = isTierA ? 12 : (isTierB ? 11 : 9);

        const hospIcon = L.divIcon({
          className: 'custom-hosp-marker',
          html: `<div style="background:${bgColor}; color:#fff; width:${sz}px; height:${sz}px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; font-size:${iconSize}px; box-shadow:0 2px 6px rgba(0,0,0,0.35); font-weight:bold; cursor:pointer;" title="${h.nome}">🏥</div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2]
        });

        const marker = L.marker([h.lat, h.lon], { icon: hospIcon }).addTo(hospitalsMarkersLayer);

        const vulnBadgeColor = h.mob_vuln === 'Alta' ? '#dc2626' : (h.mob_vuln === 'Média' ? '#d97706' : '#16a34a');

        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:11px; line-height:1.45; max-width:330px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; gap:8px;">
              <div>
                <b style="font-size:13px; color:#0f172a; display:block;">${h.nome}</b>
                <span style="font-size:10px; color:#64748b;">${h.grupo || 'Rede de Saúde'} &bull; ${h.tipo}</span>
              </div>
              <span style="background:${bgColor}; color:#fff; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; white-space:nowrap;">
                ${h.tier.split(' ')[0]} ${h.tier.split(' ')[1]} (${h.score} pts)
              </span>
            </div>

            <!-- DIAGNÓSTICO DE MOBILIDADE ATUAL -->
            <div style="margin-bottom:6px; background:#fef2f2; padding:6px; border-radius:6px; border:1px solid #fecaca;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <b style="color:#991b1b; font-size:10px; text-transform:uppercase;">🚗 Mobilidade Atual & Vulnerabilidade</b>
                <span style="background:${vulnBadgeColor}; color:#fff; font-size:8px; font-weight:bold; padding:1px 5px; border-radius:3px;">Vuln: ${h.mob_vuln}</span>
              </div>
              <b>Fornecedor:</b> <span style="color:#0f172a;">${h.mob_forn}</span><br>
              <b>Modelo:</b> <span style="color:#475569;">${h.mob_tipo}</span><br>
              <b>Gargalo/Dor:</b> <span style="color:#b91c1c; font-style:italic;">${h.mob_dor}</span><br>
              <b>Receita Estimada:</b> <b style="color:#059669;">${h.mob_rec}</b>
            </div>

            <!-- DECISORES DE COMPRAS & BUSCA LINKEDIN/GOOGLE/EMAIL -->
            <div style="margin-bottom:6px; background:#f0fdf4; padding:6px; border-radius:6px; border:1px solid #bbf7d0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <b style="color:#166534; font-size:10px; text-transform:uppercase;">👤 Decisores de Compras & Mobilidade</b>
                <span style="background:#16a34a; color:#fff; font-size:8px; font-weight:bold; padding:1px 5px; border-radius:3px;">Procurement B2B</span>
              </div>
              <b>Área:</b> <span style="color:#0f172a;">${h.dec_area || 'Suprimentos & Compras'}</span><br>
              <b>Cargos:</b> <span style="color:#334155;">${h.dec_cargos || 'Gerente de Compras | Facilities'}</span><br>
              <b>Liderança:</b> <span style="color:#1e40af; font-weight:600;">${h.dec_lideres || 'Central de Suprimentos'}</span><br>
              <b>Padrão E-mail:</b> <span style="color:#0f172a; font-family:monospace; font-size:9.5px;">${h.email_padrao || '{nome}.{sobrenome}@' + h.email_dom}</span><br>
              <b>E-mail Estimado / Canal:</b> <span style="color:#047857; font-weight:bold; font-size:10px;">${h.email_dec || h.email_inst}</span>
              <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
                ${h.dec_linkedin ? `<a href="${h.dec_linkedin}" target="_blank" style="background:#0a66c2; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🔍 LinkedIn ↗</a>` : ''}
                ${h.dec_google ? `<a href="${h.dec_google}" target="_blank" style="background:#1e293b; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🌐 Google Dork ↗</a>` : ''}
                ${h.link_hunter ? `<a href="${h.link_hunter}" target="_blank" style="background:#e11d48; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🎯 Hunter.io ↗</a>` : ''}
                ${h.link_google_email ? `<a href="${h.link_google_email}" target="_blank" style="background:#059669; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">📧 Dork E-mail ↗</a>` : ''}
              </div>
            </div>

            <div style="margin-bottom:6px; background:#f8fafc; padding:6px; border-radius:6px; border:1px solid #e2e8f0;">
              <b>Endereço:</b> ${h.end} (${h.bairro})<br>
              <b>Distância Sede Chame Táxi:</b> <span style="color:#2563eb; font-weight:bold;">${h.dist} km</span> (~${h.tempo} min)<br>
              <b>Ponto Táxi DTP Próximo:</b> ${h.ponto}<br>
              <b>Demanda Estimada:</b> <b style="color:#059669;">${h.corridas}</b>
            </div>
            <div style="margin-bottom:6px; font-size:10px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
              <div style="background:#fef2f2; padding:3px 5px; border-radius:4px; border:1px solid #fee2e2;">
                <b>Táxi Acessível:</b> <span style="color:#dc2626; font-weight:bold;">${h.acessivel}</span>
              </div>
              <div style="background:#f0fdf4; padding:3px 5px; border-radius:4px; border:1px solid #dcfce7;">
                <b>Vouchers B2B:</b> <span style="color:#16a34a; font-weight:bold;">${h.vouchers}</span>
              </div>
            </div>
            <div style="margin-bottom:6px; font-size:10px; background:#fffbeb; padding:5px; border-radius:4px; border:1px solid #fef3c7;">
              <b>Estratégia de Abordagem Chame Táxi:</b><br>
              <span style="color:#78350f;">${h.mob_ataque || h.pitch}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:4px; border-top:1px solid #f1f5f9;">
              ${h.tel && h.tel !== '—' ? `<a href="tel:${h.tel.replace(/\\D/g, '')}" style="color:#0284c7; font-weight:bold; font-size:10px; text-decoration:none;">📞 ${h.tel}</a>` : '<span style="color:#94a3b8; font-size:10px;">Central Hosp.</span>'}
              <a href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}" target="_blank" style="display:inline-block; background:#e11d48; color:#fff; font-weight:bold; padding:3px 8px; border-radius:4px; text-decoration:none; font-size:10px;">Rota Google Maps ↗</a>
            </div>
          </div>
        `);
      });
    }

    // RENDERIZAR LISTA LATERAL DE POLOS HOSPITALARES
    function renderHospitalsList(hospitals) {
      const listContainer = document.getElementById('route-points-list');
      if (!listContainer) return;
      listContainer.innerHTML = '';
      document.getElementById('route-panel-count').innerText = `${hospitals.length} hospitais`;

      hospitals.forEach(h => {
        const isTierA = h.tier.includes('Tier A');
        const isTierB = h.tier.includes('Tier B');
        const color = isTierA ? '#e11d48' : (isTierB ? '#d97706' : '#0284c7');
        const vulnBadge = h.mob_vuln === 'Alta' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-amber-700 bg-amber-50 border-amber-200';

        const card = document.createElement('div');
        card.className="p-2.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-slate-50/60 hover:bg-rose-50/40 transition cursor-pointer text-[11px]";
        card.onclick = () => {
          if (leafletMapInstance) {
            leafletMapInstance.setView([h.lat, h.lon], 16);
            if (hospitalsMarkersLayer) {
              hospitalsMarkersLayer.eachLayer(layer => {
                if (layer.getLatLng && Math.abs(layer.getLatLng().lat - h.lat) < 0.0001 && Math.abs(layer.getLatLng().lng - h.lon) < 0.0001) {
                  layer.openPopup();
                }
              });
            }
          }
        };

        card.innerHTML = `
          <div class="flex items-start justify-between gap-1 mb-1">
            <span class="font-bold text-slate-900 leading-tight">🏥 ${h.nome}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shrink-0" style="background:${color};">${h.dist} km</span>
          </div>
          <div class="text-[10px] text-slate-500 line-clamp-1">${h.tipo} &bull; ${h.grupo || 'Rede de Saúde'}</div>
          <div class="flex items-center gap-1.5 my-1">
            <span class="text-[9px] px-1 py-0.5 rounded border font-semibold ${vulnBadge}">Vuln: ${h.mob_vuln}</span>
            <span class="text-[10px] text-slate-700 font-medium truncate" title="${h.mob_forn}">Mob: ${h.mob_forn.split('(')[0]}</span>
          </div>
          <div class="flex items-center gap-1 my-1">
            ${h.dec_linkedin ? `<a href="${h.dec_linkedin}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-1.5 py-0.5 rounded">LinkedIn ↗</a>` : ''}
            ${h.dec_google ? `<a href="${h.dec_google}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-slate-700 hover:bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded">Google ↗</a>` : ''}
          </div>
          <p class="text-slate-600 line-clamp-1 leading-tight text-[10px] mt-0.5">${h.end}</p>
          <div class="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60 gap-1">
            <span class="text-emerald-700 font-bold">${h.mob_rec.split('(')[0]}</span>
            <span class="text-rose-700 font-bold">♿ Acess: ${h.acessivel}</span>
            <a href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}" target="_blank" onclick="event.stopPropagation();" class="text-rose-600 hover:underline font-bold">Maps ↗</a>
          </div>
        `;
        listContainer.appendChild(card);
      });
    }

    // ALTERNAR VISIBILIDADE DA CAMADA DE HOSPITAIS
    function toggleHospitalsLayer() {
      if (!leafletMapInstance || !hospitalsMarkersLayer) return;
      isHospitalsVisible = !isHospitalsVisible;
      const btn = document.getElementById('btn-toggle-hospitais');
      if (isHospitalsVisible) {
        hospitalsMarkersLayer.addTo(leafletMapInstance);
        if (btn) {
          btn.className="btn bg-rose-600 hover:bg-rose-500 text-white";
          btn.innerHTML = `<span>🏥 Hospitais 5km (${HOSPITAIS_5KM.length})</span>`;
        }
      } else {
        leafletMapInstance.removeLayer(hospitalsMarkersLayer);
        if (btn) {
          btn.className="btn bg-slate-200 hover:bg-slate-300 text-slate-700";
          btn.innerHTML = `<span>🏥 Hospitais (Oculto)</span>`;
        }
      }
    }

    // RENDERIZAR MARCADORES DE GRANDES EMPRESAS NO MAPA
    function renderEmpresasMarkers(empresas) {
      if (!empresasMarkersLayer) return;
      empresasMarkersLayer.clearLayers();

      empresas.forEach(e => {
        const isTierA = e.tier.includes('Tier A');
        const isTierB = e.tier.includes('Tier B');
        const bgColor = isTierA ? '#2563eb' : (isTierB ? '#4f46e5' : '#7c3aed');
        const sz = isTierA ? 26 : (isTierB ? 22 : 18);
        const iconSize = isTierA ? 12 : (isTierB ? 11 : 9);
        const vulnBadgeColor = e.mob_vuln === 'Alta' ? '#dc2626' : (e.mob_vuln === 'Média' ? '#d97706' : '#16a34a');

        const empIcon = L.divIcon({
          className: 'custom-emp-marker',
          html: `<div style="background:${bgColor}; color:#fff; width:${sz}px; height:${sz}px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; font-size:${iconSize}px; box-shadow:0 2px 6px rgba(0,0,0,0.35); font-weight:bold; cursor:pointer;" title="${e.nome}">🏢</div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2]
        });

        const marker = L.marker([e.lat, e.lon], { icon: empIcon }).addTo(empresasMarkersLayer);

        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:11px; line-height:1.45; max-width:340px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; gap:8px;">
              <div>
                <b style="font-size:13px; color:#0f172a; display:block;">${e.nome}</b>
                <span style="font-size:10px; color:#64748b;">${e.setor} &bull; ${e.edificio || 'Sede'}</span>
              </div>
              <span style="background:${bgColor}; color:#fff; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; white-space:nowrap;">
                ${e.tier.split(' ')[0]} ${e.tier.split(' ')[1]} (${e.score} pts)
              </span>
            </div>

            <!-- DIAGNÓSTICO DE MOBILIDADE ATUAL -->
            <div style="margin-bottom:6px; background:#eff6ff; padding:6px; border-radius:6px; border:1px solid #bfdbfe;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <b style="color:#1e40af; font-size:10px; text-transform:uppercase;">🚗 Mobilidade Atual & Vulnerabilidade</b>
                <span style="background:${vulnBadgeColor}; color:#fff; font-size:8px; font-weight:bold; padding:1px 5px; border-radius:3px;">Vuln: ${e.mob_vuln}</span>
              </div>
              <b>Fornecedor:</b> <span style="color:#0f172a;">${e.mob_forn}</span><br>
              <b>Modelo:</b> <span style="color:#475569;">${e.mob_tipo}</span><br>
              <b>Gargalo/Dor:</b> <span style="color:#b91c1c; font-style:italic;">${e.mob_dor}</span><br>
              <b>Receita Estimada:</b> <b style="color:#059669;">${e.mob_rec}</b>
            </div>

            <!-- DECISORES DE COMPRAS & BUSCA LINKEDIN/GOOGLE/EMAIL -->
            <div style="margin-bottom:6px; background:#f0fdf4; padding:6px; border-radius:6px; border:1px solid #bbf7d0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <b style="color:#166534; font-size:10px; text-transform:uppercase;">👤 Decisores de Compras & Mobilidade</b>
                <span style="background:#16a34a; color:#fff; font-size:8px; font-weight:bold; padding:1px 5px; border-radius:3px;">Procurement B2B</span>
              </div>
              <b>Área:</b> <span style="color:#0f172a;">${e.dec_area || 'Compras Indiretas & Facilities'}</span><br>
              <b>Cargos:</b> <span style="color:#334155;">${e.dec_cargos || 'Head of Workplace | Procurement Manager'}</span><br>
              <b>Liderança:</b> <span style="color:#1e40af; font-weight:600;">${e.dec_lideres || 'Central de Compras'}</span><br>
              <b>Padrão E-mail:</b> <span style="color:#0f172a; font-family:monospace; font-size:9.5px;">${e.email_padrao || '{nome}.{sobrenome}@' + e.email_dom}</span><br>
              <b>E-mail Estimado / Canal:</b> <span style="color:#047857; font-weight:bold; font-size:10px;">${e.email_dec || e.email_inst}</span>
              <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
                ${e.dec_linkedin ? `<a href="${e.dec_linkedin}" target="_blank" style="background:#0a66c2; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🔍 LinkedIn ↗</a>` : ''}
                ${e.dec_google ? `<a href="${e.dec_google}" target="_blank" style="background:#1e293b; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🌐 Google Dork ↗</a>` : ''}
                ${e.link_hunter ? `<a href="${e.link_hunter}" target="_blank" style="background:#e11d48; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🎯 Hunter.io ↗</a>` : ''}
                ${e.link_google_email ? `<a href="${e.link_google_email}" target="_blank" style="background:#059669; color:#fff; padding:3px 7px; border-radius:4px; font-size:9px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">📧 Dork E-mail ↗</a>` : ''}
              </div>
            </div>

            <div style="margin-bottom:6px; background:#f8fafc; padding:6px; border-radius:6px; border:1px solid #e2e8f0;">
              <b>Colaboradores Presenciais:</b> <b style="color:#1d4ed8;">${e.colab}</b><br>
              <b>Endereço:</b> ${e.end}<br>
              <b>Distância Sede Chame Táxi:</b> <span style="color:#2563eb; font-weight:bold;">${e.dist} km</span> (~${e.tempo} min)<br>
              <b>Ponto Táxi DTP Próximo:</b> ${e.ponto}<br>
              <b>Demanda Estimada:</b> <b style="color:#059669;">${e.corridas}</b>
            </div>
            <div style="margin-bottom:6px; font-size:10px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
              <div style="background:#eff6ff; padding:3px 5px; border-radius:4px; border:1px solid #dbeafe;">
                <b>Vouchers Noturnos:</b> <span style="color:#1d4ed8; font-weight:bold;">${e.vouchers}</span>
              </div>
              <div style="background:#f5f3ff; padding:3px 5px; border-radius:4px; border:1px solid #ede9fe;">
                <b>Viagens Aeroportos:</b> <span style="color:#6d28d9; font-weight:bold;">${e.aero}</span>
              </div>
            </div>
            <div style="margin-bottom:6px; font-size:10px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
              <div style="background:#f0fdf4; padding:3px 5px; border-radius:4px; border:1px solid #dcfce7;">
                <b>Frota Elétrica ESG:</b> <span style="color:#16a34a; font-weight:bold;">${e.esg}</span>
              </div>
              <div style="background:#fffbeb; padding:3px 5px; border-radius:4px; border:1px solid #fef3c7;">
                <b>Faixa Ônibus SP:</b> <span style="color:#b45309; font-weight:bold;">${e.faixa_onibus}</span>
              </div>
            </div>
            <div style="margin-bottom:6px; font-size:10px; background:#f0fdf4; padding:5px; border-radius:4px; border:1px solid #bbf7d0;">
              <b>Estratégia de Abordagem Chame Táxi B2B:</b><br>
              <span style="color:#14532d;">${e.mob_ataque || e.pitch}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:4px; border-top:1px solid #f1f5f9;">
              ${e.tel && e.tel !== '—' ? `<a href="tel:${e.tel.replace(/\\D/g, '')}" style="color:#2563eb; font-weight:bold; font-size:10px; text-decoration:none;">📞 ${e.tel}</a>` : (e.site ? `<a href="${e.site}" target="_blank" style="color:#2563eb; font-weight:bold; font-size:10px; text-decoration:none;">🌐 Site Oficial</a>` : '<span style="color:#94a3b8; font-size:10px;">Central B2B</span>')}
              <a href="https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}" target="_blank" style="display:inline-block; background:#2563eb; color:#fff; font-weight:bold; padding:3px 8px; border-radius:4px; text-decoration:none; font-size:10px;">Rota Google Maps ↗</a>
            </div>
          </div>
        `);
      });
    }

    // RENDERIZAR LISTA LATERAL DE GRANDES EMPRESAS
    function renderEmpresasList(empresas) {
      const listContainer = document.getElementById('route-points-list');
      if (!listContainer) return;
      listContainer.innerHTML = '';
      document.getElementById('route-panel-count').innerText = `${empresas.length} empresas`;

      empresas.forEach(e => {
        const isTierA = e.tier.includes('Tier A');
        const isTierB = e.tier.includes('Tier B');
        const color = isTierA ? '#2563eb' : (isTierB ? '#4f46e5' : '#7c3aed');
        const vulnBadge = e.mob_vuln === 'Alta' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-amber-700 bg-amber-50 border-amber-200';

        const card = document.createElement('div');
        card.className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50/60 hover:bg-blue-50/40 transition cursor-pointer text-[11px]";
        card.onclick = () => {
          if (leafletMapInstance) {
            leafletMapInstance.setView([e.lat, e.lon], 16);
            if (empresasMarkersLayer) {
              empresasMarkersLayer.eachLayer(layer => {
                if (layer.getLatLng && Math.abs(layer.getLatLng().lat - e.lat) < 0.0001 && Math.abs(layer.getLatLng().lng - e.lon) < 0.0001) {
                  layer.openPopup();
                }
              });
            }
          }
        };

        card.innerHTML = `
          <div class="flex items-start justify-between gap-1 mb-1">
            <span class="font-bold text-slate-900 leading-tight">🏢 ${e.nome}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shrink-0" style="background:${color};">${e.dist} km</span>
          </div>
          <div class="text-[10px] text-slate-500 line-clamp-1">${e.setor} &bull; ${e.bairro}</div>
          <div class="flex items-center gap-1.5 my-1">
            <span class="text-[9px] px-1 py-0.5 rounded border font-semibold ${vulnBadge}">Vuln: ${e.mob_vuln}</span>
            <span class="text-[10px] text-slate-700 font-medium truncate" title="${e.mob_forn}">Mob: ${e.mob_forn.split('(')[0]}</span>
          </div>
          <div class="flex items-center gap-1 my-1">
            ${e.dec_linkedin ? `<a href="${e.dec_linkedin}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-1.5 py-0.5 rounded">LinkedIn ↗</a>` : ''}
            ${e.dec_google ? `<a href="${e.dec_google}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-slate-700 hover:bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded">Google ↗</a>` : ''}
          </div>
          <div class="text-[10px] text-indigo-700 font-semibold mt-0.5">${e.colab.split('(')[0]}</div>
          <p class="text-slate-600 line-clamp-1 leading-tight text-[10px] mt-0.5">${e.end}</p>
          <div class="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60 gap-1">
            <span class="text-emerald-700 font-bold">${e.mob_rec.split('(')[0]}</span>
            <span class="text-blue-700 font-bold">${e.corridas.split(' ')[0]} corr/mês</span>
            <a href="https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}" target="_blank" onclick="event.stopPropagation();" class="text-blue-600 hover:underline font-bold">Maps ↗</a>
          </div>
        `;
        listContainer.appendChild(card);
      });
    }

    // ALTERNAR VISIBILIDADE DA CAMADA DE EMPRESAS
    function toggleEmpresasLayer() {
      if (!leafletMapInstance || !empresasMarkersLayer) return;
      isEmpresasVisible = !isEmpresasVisible;
      const btn = document.getElementById('btn-toggle-empresas');
      if (isEmpresasVisible) {
        empresasMarkersLayer.addTo(leafletMapInstance);
        if (btn) {
          btn.className="btn bg-blue-600 hover:bg-blue-500 text-white";
          btn.innerHTML = `<span>🏢 Empresas 100+ (${EMPRESAS_5KM.length})</span>`;
        }
      } else {
        leafletMapInstance.removeLayer(empresasMarkersLayer);
        if (btn) {
          btn.className="btn bg-slate-200 hover:bg-slate-300 text-slate-700";
          btn.innerHTML = `<span>🏢 Empresas (Oculto)</span>`;
        }
      }
    }

    // RENDERIZAR LISTA COMBINADA (HOSPITAIS + EMPRESAS)
    function renderCombinedList(hospitals, empresas, title) {
      const listContainer = document.getElementById('route-points-list');
      if (!listContainer) return;
      listContainer.innerHTML = '';
      document.getElementById('route-panel-count').innerText = `${hospitals.length + empresas.length} alvos`;

      // Hospitais primeiro
      hospitals.forEach(h => {
        const card = document.createElement('div');
        card.className="p-2 rounded-lg border border-rose-200 hover:border-rose-400 bg-rose-50/50 hover:bg-rose-100/50 transition cursor-pointer text-[11px]";
        card.onclick = () => {
          if (leafletMapInstance) {
            leafletMapInstance.setView([h.lat, h.lon], 16);
            if (hospitalsMarkersLayer) {
              hospitalsMarkersLayer.eachLayer(layer => {
                if (layer.getLatLng && Math.abs(layer.getLatLng().lat - h.lat) < 0.0001 && Math.abs(layer.getLatLng().lng - h.lon) < 0.0001) layer.openPopup();
              });
            }
          }
        };
        card.innerHTML = `
          <div class="flex items-start justify-between gap-1 mb-0.5">
            <span class="font-bold text-slate-900 leading-tight">🏥 ${h.nome}</span>
            <span class="text-[9px] font-bold px-1 py-0.2 rounded text-white bg-rose-600 shrink-0">${h.dist} km</span>
          </div>
          <div class="text-[10px] text-slate-600 font-medium">Mob: ${h.mob_forn.split('(')[0]}</div>
          <div class="text-[10px] text-rose-800 italic mt-0.5 line-clamp-1">${h.mob_dor}</div>
          <div class="flex items-center gap-1 my-1">
            ${h.dec_linkedin ? `<a href="${h.dec_linkedin}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-1 py-0.2 rounded">LinkedIn ↗</a>` : ''}
            ${h.dec_google ? `<a href="${h.dec_google}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-slate-700 hover:bg-slate-800 text-white font-bold px-1 py-0.2 rounded">Google ↗</a>` : ''}
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-0.5 border-t border-rose-200/60">
            <span class="text-emerald-700 font-bold">${h.mob_rec.split('(')[0]}</span>
            <span class="text-rose-700 font-bold text-[9px] px-1 py-0.2 rounded bg-rose-100">Vuln: ${h.mob_vuln}</span>
          </div>
        `;
        listContainer.appendChild(card);
      });

      // Empresas em seguida
      empresas.forEach(e => {
        const card = document.createElement('div');
        card.className="p-2 rounded-lg border border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-100/50 transition cursor-pointer text-[11px]";
        card.onclick = () => {
          if (leafletMapInstance) {
            leafletMapInstance.setView([e.lat, e.lon], 16);
            if (empresasMarkersLayer) {
              empresasMarkersLayer.eachLayer(layer => {
                if (layer.getLatLng && Math.abs(layer.getLatLng().lat - e.lat) < 0.0001 && Math.abs(layer.getLatLng().lng - e.lon) < 0.0001) layer.openPopup();
              });
            }
          }
        };
        card.innerHTML = `
          <div class="flex items-start justify-between gap-1 mb-0.5">
            <span class="font-bold text-slate-900 leading-tight">🏢 ${e.nome}</span>
            <span class="text-[9px] font-bold px-1 py-0.2 rounded text-white bg-blue-600 shrink-0">${e.dist} km</span>
          </div>
          <div class="text-[10px] text-slate-600 font-medium">Mob: ${e.mob_forn.split('(')[0]}</div>
          <div class="text-[10px] text-blue-800 italic mt-0.5 line-clamp-1">${e.mob_dor}</div>
          <div class="flex items-center gap-1 my-1">
            ${e.dec_linkedin ? `<a href="${e.dec_linkedin}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-1 py-0.2 rounded">LinkedIn ↗</a>` : ''}
            ${e.dec_google ? `<a href="${e.dec_google}" target="_blank" onclick="event.stopPropagation();" class="text-[9px] bg-slate-700 hover:bg-slate-800 text-white font-bold px-1 py-0.2 rounded">Google ↗</a>` : ''}
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-0.5 border-t border-blue-200/60">
            <span class="text-emerald-700 font-bold">${e.mob_rec.split('(')[0]}</span>
            <span class="text-blue-700 font-bold text-[9px] px-1 py-0.2 rounded bg-blue-100">Vuln: ${e.mob_vuln}</span>
          </div>
        `;
        listContainer.appendChild(card);
      });
    }

    // FILTRO COMBINADO: ROTAS, POLOS HOSPITALARES, GRANDES EMPRESAS & MOBILIDADE
    function filterMapByRoute() {
      const sel = document.getElementById('map-route-filter').value;
      if (sel === 'ALL') {
        renderMapPoints(MAP_PONTOS);
        if (isHospitalsVisible) renderHospitalMarkers(HOSPITAIS_5KM);
        if (isEmpresasVisible) renderEmpresasMarkers(EMPRESAS_5KM);
      } else if (sel === 'MOB_VULN_ALTA') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        const vulnHosps = HOSPITAIS_5KM.filter(h => h.mob_vuln === 'Alta');
        const vulnEmps = EMPRESAS_5KM.filter(e => e.mob_vuln === 'Alta');
        renderHospitalMarkers(vulnHosps);
        renderEmpresasMarkers(vulnEmps);
        renderCombinedList(vulnHosps, vulnEmps, 'Contratos Alta Vulnerabilidade');
      } else if (sel === 'MOB_APPS') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        const appHosps = HOSPITAIS_5KM.filter(h => (h.mob_tipo && h.mob_tipo.includes('Aplicativo')) || (h.mob_forn && h.mob_forn.includes('Uber')));
        const appEmps = EMPRESAS_5KM.filter(e => (e.mob_tipo && e.mob_tipo.includes('Aplicativo')) || (e.mob_forn && e.mob_forn.includes('Uber')));
        renderHospitalMarkers(appHosps);
        renderEmpresasMarkers(appEmps);
        renderCombinedList(appHosps, appEmps, 'Presos em Apps sem Faixa de Ônibus');
      } else if (sel === 'MOB_DESP') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (empresasMarkersLayer) empresasMarkersLayer.clearLayers();
        const desp = HOSPITAIS_5KM.filter(h => (h.mob_dor && (h.mob_dor.includes('Desospitalização') || h.mob_dor.includes('Sedação') || h.mob_dor.includes('Ambulância'))) || h.acessivel === 'Alta' || h.acessivel === 'Crítica');
        renderHospitalMarkers(desp);
        renderHospitalsList(desp);
      } else if (sel === 'EMPRESAS') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (hospitalsMarkersLayer) hospitalsMarkersLayer.clearLayers();
        renderEmpresasMarkers(EMPRESAS_5KM);
        renderEmpresasList(EMPRESAS_5KM);
      } else if (sel === 'EMP_TIERA') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (hospitalsMarkersLayer) hospitalsMarkersLayer.clearLayers();
        const tierA = EMPRESAS_5KM.filter(e => e.tier.includes('Tier A'));
        renderEmpresasMarkers(tierA);
        renderEmpresasList(tierA);
      } else if (sel === 'EMP_TECH') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (hospitalsMarkersLayer) hospitalsMarkersLayer.clearLayers();
        const tech = EMPRESAS_5KM.filter(e => e.setor.includes('Tecnologia') || e.setor.includes('Fintech') || e.setor.includes('Big Tech') || e.setor.includes('Software'));
        renderEmpresasMarkers(tech);
        renderEmpresasList(tech);
      } else if (sel === 'EMP_FINANCE') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (hospitalsMarkersLayer) hospitalsMarkersLayer.clearLayers();
        const fin = EMPRESAS_5KM.filter(e => e.setor.includes('Banco') || e.setor.includes('Financeir') || e.setor.includes('Investimento') || e.setor.includes('Bolsa'));
        renderEmpresasMarkers(fin);
        renderEmpresasList(fin);
      } else if (sel === 'EMP_CONSULT') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (hospitalsMarkersLayer) hospitalsMarkersLayer.clearLayers();
        const cons = EMPRESAS_5KM.filter(e => e.setor.includes('Consultoria') || e.setor.includes('Auditoria'));
        renderEmpresasMarkers(cons);
        renderEmpresasList(cons);
      } else if (sel === 'EMP_LEGAL') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (hospitalsMarkersLayer) hospitalsMarkersLayer.clearLayers();
        const leg = EMPRESAS_5KM.filter(e => e.setor.includes('Advocacia') || e.setor.includes('Jurídic'));
        renderEmpresasMarkers(leg);
        renderEmpresasList(leg);
      } else if (sel === 'HOSPITAIS') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (empresasMarkersLayer) empresasMarkersLayer.clearLayers();
        renderHospitalMarkers(HOSPITAIS_5KM);
        renderHospitalsList(HOSPITAIS_5KM);
      } else if (sel === 'HOSP_TIERA') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (empresasMarkersLayer) empresasMarkersLayer.clearLayers();
        const tierA = HOSPITAIS_5KM.filter(h => h.tier.includes('Tier A'));
        renderHospitalMarkers(tierA);
        renderHospitalsList(tierA);
      } else if (sel === 'HOSP_ACES') {
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();
        if (empresasMarkersLayer) empresasMarkersLayer.clearLayers();
        const aces = HOSPITAIS_5KM.filter(h => h.acessivel === 'Alta' || h.acessivel === 'Crítica');
        renderHospitalMarkers(aces);
        renderHospitalsList(aces);
      } else {
        const filtered = MAP_PONTOS.filter(p => p.rota.includes(sel));
        renderMapPoints(filtered);
      }
    }

    function centerMapOnSede() {
      if (leafletMapInstance) {
        leafletMapInstance.setView([CHAME_LAT, CHAME_LON], 14);
      }
    }

    // =========================================================================
    // MÓDULO CRM & WHATSAPP
    // =========================================================================
    let currentCRMCategory = 'ALL';

    function setCRMFilter(cat) {
      currentCRMCategory = cat;
      ['all', 'tier1', 'contemplados', 'butanta', 'eletricos', 'mulheres', 'suplentes'].forEach(k => {
        const b = document.getElementById(`crm-btn-${k}`);
        if (b) {
          b.className="btn btn-soft";
        }
      });

      const activeBtn = document.getElementById(`crm-btn-${cat.toLowerCase()}`);
      if (activeBtn) {
        activeBtn.className="btn bg-rose-600 text-white";
      }
      applyCRMFilters();
    }

    function applyCRMFilters() {
      const q = (document.getElementById('crm-search-input')?.value || '').toLowerCase().trim();

      filteredCRM = CRM_LEADS.filter(item => {
        // Categoria
        if (currentCRMCategory === 'TIER1' && item.score < 80) return false;
        if (currentCRMCategory === 'CONTEMPLADOS' && !item.status.includes('CONTEMPLADO')) return false;
        if (currentCRMCategory === 'BUTANTA') {
          const d = parseFloat(item.dist.replace(',', '.'));
          if (isNaN(d) || d > 10.0) return false;
        }
        if (currentCRMCategory === 'ELETRICOS' && item.ed !== '4') return false;
        if (currentCRMCategory === 'MULHERES' && item.ed !== '3') return false;
        if (currentCRMCategory === 'SUPLENTES') {
          const st = (item.status || '').toUpperCase();
          if (st.includes('CONTEMPLADO')) return false;
        }

        // Texto
        if (q) {
          const m = item.nom.toLowerCase().includes(q) ||
                    item.cpf.toLowerCase().includes(q) ||
                    item.tel.includes(q) ||
                    item.bairro.toLowerCase().includes(q) ||
                    item.ed_desc.toLowerCase().includes(q);
          if (!m) return false;
        }

        return true;
      });

      currentCRMPage = 1;
      renderCRMTable();
    }

    function getLeadSavedStatus(id) {
      return localStorage.getItem(`chame_crm_status_${id}`) || '1 - Novo Lead';
    }

    function setLeadSavedStatus(id, val) {
      localStorage.setItem(`chame_crm_status_${id}`, val);
      updateCRMStats();
    }

    function getLeadSavedNote(id) {
      return localStorage.getItem(`chame_crm_note_${id}`) || '';
    }

    function setLeadSavedNote(id, val) {
      localStorage.setItem(`chame_crm_note_${id}`, val);
    }

    function updateCRMStats() {
      let cNovos = 0, cContatados = 0, cAgendados = 0, cFiliados = 0;
      CRM_LEADS.forEach(l => {
        const st = getLeadSavedStatus(l.id);
        if (st.includes('1 - Novo')) cNovos++;
        else if (st.includes('Contat') || st.includes('Tentat')) cContatados++;
        else if (st.includes('Agend')) cAgendados++;
        else if (st.includes('Filiad')) cFiliados++;
      });
      document.getElementById('crm-count-novos').innerText = cNovos;
      document.getElementById('crm-count-contatados').innerText = cContatados;
      document.getElementById('crm-count-agendados').innerText = cAgendados;
      document.getElementById('crm-count-filiados').innerText = cFiliados;
    }

    function renderCRMTable() {
      const tbody = document.getElementById('crm-table-body');
      tbody.innerHTML = '';

      const total = filteredCRM.length;
      const start = (currentCRMPage - 1) * pageSize;
      const pageData = filteredCRM.slice(start, start + pageSize);

      if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Nenhum motorista encontrado no CRM com os filtros aplicados.</td></tr>`;
        document.getElementById('crm-pagination-info').innerText = "0 de 0 leads";
        return;
      }

      pageData.forEach(r => {
        const tr = document.createElement('tr');
        tr.className="hover:bg-slate-50/80 transition";

        const savedStatus = getLeadSavedStatus(r.id);
        const savedNote = getLeadSavedNote(r.id);

        tr.innerHTML = `
          <td class="py-2.5 px-3">
            <div class="font-bold text-slate-900">${r.nom}</div>
            <div class="text-[10px] text-slate-400 font-mono">CPF: ${r.cpf} | ${r.bairro || 'São Paulo'}</div>
          </td>
          <td class="py-2.5 px-3 text-center">
            <span class="inline-block font-black text-xs px-2.5 py-0.5 rounded-full ${r.score >= 80 ? 'bg-rose-100 text-rose-700 font-black ring-1 ring-rose-300' : (r.score >= 65 ? 'bg-amber-100 text-amber-700 font-bold' : (r.score >= 50 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'))}">
              ${r.score} pts
            </span>
            <div class="text-[9px] font-bold ${r.score >= 80 ? 'text-rose-600' : (r.score >= 65 ? 'text-amber-600' : 'text-slate-500')} mt-0.5">${r.score >= 80 ? '🥇 Tier 1' : (r.score >= 65 ? '🥈 Tier 2' : (r.score >= 50 ? '🥉 Tier 3' : 'Tier 4'))}</div>
          </td>
          <td class="py-2.5 px-3">
            <span class="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${r.status.includes('CONTEMPLADO') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${r.ed ? 'Edital ' + r.ed : 'DOC 2026'}
            </span>
            <div class="text-[11px] text-slate-600 truncate max-w-[200px] mt-0.5">${r.cat || 'Táxi Comum'}</div>
          </td>
          <td class="py-2.5 px-3">
            <div class="font-bold text-indigo-700">${r.dist !== '—' ? r.dist + ' km' : '—'}</div>
            <div class="text-[10px] text-slate-400">${r.reg !== '—' ? r.reg : 'SP'}</div>
          </td>
          <td class="py-2.5 px-3 text-center">
            ${r.wpp_url ? `
              <a href="${r.wpp_url}" target="_blank" onclick="setLeadSavedStatus('${r.id}', '3 - Contatado / Conversando'); renderCRMTable();" class="btn bg-emerald-600 hover:bg-emerald-500 text-white">
                <i class="ph-bold ph-whatsapp-logo text-sm"></i>
                <span>WhatsApp</span>
              </a>
            ` : `<span class="text-slate-400 text-[10px]">Sem celular</span>`}
          </td>
          <td class="py-2.5 px-3">
            <select onchange="setLeadSavedStatus('${r.id}', this.value)" class="field px-2 py-1 font-semibold text-slate-700">
              <option value="1 - Novo Lead" ${savedStatus.includes('1 - Novo') ? 'selected' : ''}>1 - Novo Lead</option>
              <option value="2 - Tentativa de Contato" ${savedStatus.includes('2 - Tentativa') ? 'selected' : ''}>2 - Tentativa de Contato</option>
              <option value="3 - Contatado / Conversando" ${savedStatus.includes('3 - Contatado') ? 'selected' : ''}>3 - Contatado / Conversando</option>
              <option value="4 - Agendou Visita na Sede" ${savedStatus.includes('4 - Agendou') ? 'selected' : ''}>4 - Agendou Visita na Sede</option>
              <option value="5 - Filiado Cooperado" ${savedStatus.includes('5 - Filiado') ? 'selected' : ''}>5 - Filiado Cooperado ⭐</option>
              <option value="6 - Sem Interesse" ${savedStatus.includes('6 - Sem') ? 'selected' : ''}>6 - Sem Interesse</option>
            </select>
          </td>
          <td class="py-2.5 px-3">
            <input type="text" value="${savedNote}" onchange="setLeadSavedNote('${r.id}', this.value)" placeholder="Anotação rápida..." class="field w-full px-2 py-1">
          </td>
          <td class="py-2.5 px-3 text-right">
            <button onclick="openDriverModal('${r.id}')" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition" title="Ver Dossiê 360°">
              <i class="ph-bold ph-identification-card text-base"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Paginação
      const totalPages = Math.ceil(total / pageSize) || 1;
      document.getElementById('crm-pagination-info').innerText = `Mostrando ${start + 1} a ${Math.min(start + pageSize, total)} de ${total.toLocaleString('pt-BR')} leads`;
      
      const pctrl = document.getElementById('crm-pagination-controls');
      pctrl.innerHTML = `
        <button onclick="if(currentCRMPage>1){currentCRMPage--; renderCRMTable();}" class="btn btn-ghost btn-xs" ${currentCRMPage===1?'disabled':''}>Anterior</button>
        <span class="px-2 text-slate-500 font-bold">${currentCRMPage} / ${totalPages}</span>
        <button onclick="if(currentCRMPage<${totalPages}){currentCRMPage++; renderCRMTable();}" class="btn btn-ghost btn-xs" ${currentCRMPage===totalPages?'disabled':''}>Próxima</button>
      `;
    }

    // =========================================================================
    // MÓDULO BASE MESTRE & FILTROS
    // =========================================================================
    function applyFilters() {
      const edital = document.getElementById('filter-edital').value;
      const status = document.getElementById('filter-status').value;
      const tier = document.getElementById('filter-tier').value;
      const ponto = document.getElementById('filter-ponto').value;
      const contato = document.getElementById('filter-contato').value;
      const distancia = document.getElementById('filter-distancia').value;
      const q = (document.getElementById('search-input').value || '').toLowerCase().trim();

      filteredMaster = RAW_DATA.filter(r => {
        // Edital
        if (edital !== 'ALL') {
          if (edital === 'DOC' && r.orig !== 'Diário Oficial') return false;
          else if (edital !== 'DOC' && r.ed !== parseInt(edital)) return false;
        }

        // Status
        if (status !== 'ALL') {
          if (status === 'CONTEMPLADO' && !r.st.includes('CONTEMPLADO')) return false;
          else if (status === 'SUPLENTE_ALTA' && !r.supl.includes('Alta Probabilidade')) return false;
          else if (status === 'ESPERA' && r.st !== 'ESPERA') return false;
          else if (status === 'INABILITADO' && !r.st.startsWith('INABILITADO')) return false;
        }

        // Tier
        if (tier !== 'ALL') {
          if (tier === 'COM_SCORE' && !r.score) return false;
          else if (tier !== 'COM_SCORE' && !r.tier.startsWith(tier)) return false;
        }

        // Ponto
        if (ponto !== 'ALL') {
          if (ponto === 'VINCULADO' && !r.pto_st.includes('Vinculado')) return false;
          else if (ponto === 'SORTEIO' && !r.pto_st.includes('Sorteio')) return false;
          else if (ponto === 'LIVRE' && (r.pto_st.includes('Vinculado') || r.pto_st.includes('Sorteio'))) return false;
        }

        // Contato
        if (contato !== 'ALL') {
          if (contato === 'COM_TEL' && !r.tel1) return false;
          else if (contato === 'COM_CPF' && !r.cpf) return false;
          else if (contato === 'COM_DOC' && !r.sei) return false;
        }

        // Distância
        if (distancia !== 'ALL') {
          const d = parseFloat(r.mei_dist.replace(',', '.'));
          if (isNaN(d)) return false;
          if (distancia === '5KM' && d > 5.0) return false;
          if (distancia === '10KM' && d > 10.0) return false;
          if (distancia === '15KM' && d > 15.0) return false;
        }

        // Busca Geral
        if (q) {
          const m = r.nom_limpo.toLowerCase().includes(q) ||
                    r.cad.toLowerCase().includes(q) ||
                    r.prt.toLowerCase().includes(q) ||
                    r.sei.toLowerCase().includes(q) ||
                    r.cpf.toLowerCase().includes(q) ||
                    r.tel1.includes(q) ||
                    r.pto_end.toLowerCase().includes(q) ||
                    r.pto_num.toLowerCase().includes(q);
          if (!m) return false;
        }

        return true;
      });

      currentMasterPage = 1;
      renderMasterTable();
    }

    function renderMasterTable() {
      const tbody = document.getElementById('table-body');
      tbody.innerHTML = '';

      const total = filteredMaster.length;
      const start = (currentMasterPage - 1) * pageSize;
      const pageData = filteredMaster.slice(start, start + pageSize);

      if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Nenhum motorista encontrado com os filtros selecionados.</td></tr>`;
        document.getElementById('pagination-info').innerText = "0 de 0 registros";
        return;
      }

      pageData.forEach(r => {
        const tr = document.createElement('tr');
        tr.className="hover:bg-amber-50/40 transition cursor-pointer";
        tr.onclick = (e) => {
          if (!e.target.closest('button') && !e.target.closest('a')) {
            openDriverModal(r.id);
          }
        };

        const isContemplado = r.st.includes('CONTEMPLADO');
        const isSuplenteTop = r.supl.includes('Alta Probabilidade');

        tr.innerHTML = `
          <td class="py-2.5 px-3">
            <div class="font-bold text-slate-900">${r.nom}</div>
            <div class="text-[10px] text-slate-400">${r.bairro || 'São Paulo'} • ID: ${r.id}</div>
          </td>
          <td class="py-2.5 px-3">
            <div class="font-mono text-emerald-700 font-bold">${r.cpf || '—'}</div>
            <div class="text-[10px] text-slate-500">Condutax: ${r.cad || '—'} (${r.safra || '—'})</div>
          </td>
          <td class="py-2.5 px-3">
            <span class="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${isContemplado ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
              ${r.ed ? 'Edital ' + r.ed : 'DOC 2026'}
            </span>
            <div class="text-[11px] text-slate-600 truncate max-w-[180px]">${r.cat || 'Táxi Comum'}</div>
          </td>
          <td class="py-2.5 px-3">
            <div class="font-bold ${isContemplado ? 'text-emerald-700' : (isSuplenteTop ? 'text-purple-700' : 'text-slate-700')}">
              ${isContemplado ? 'CONTEMPLADO' : (isSuplenteTop ? 'Suplente Top (' + r.fila + 'º)' : r.st)}
            </div>
            <div class="text-[10px] text-slate-400">${r.sei ? 'Proc: ' + r.sei : 'Sem processo SEI'}</div>
          </td>
          <td class="py-2.5 px-3">
            <div class="font-semibold text-slate-800">${r.tel1 || '—'}</div>
            <div class="text-[10px] text-indigo-700 font-bold">${r.mei_dist ? r.mei_dist + ' km da sede' : '—'}</div>
          </td>
          <td class="py-2.5 px-3 text-center">
            ${r.score ? `
              <span class="inline-block font-black text-xs px-2 py-0.5 rounded-full ${r.score >= 80 ? 'bg-rose-100 text-rose-700' : (r.score >= 65 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700')}">
                ${r.score}
              </span>
            ` : '<span class="text-slate-300">—</span>'}
          </td>
          <td class="py-2.5 px-3 text-right">
            <button onclick="openDriverModal('${r.id}')" class="btn bg-amber-50 hover:bg-amber-100 text-amber-900">
              Ver Dossiê
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      const totalPages = Math.ceil(total / pageSize) || 1;
      document.getElementById('pagination-info').innerText = `Mostrando ${start + 1} a ${Math.min(start + pageSize, total)} de ${total.toLocaleString('pt-BR')} registros`;
      
      const pctrl = document.getElementById('pagination-controls');
      pctrl.innerHTML = `
        <button onclick="if(currentMasterPage>1){currentMasterPage--; renderMasterTable();}" class="btn btn-ghost btn-xs" ${currentMasterPage===1?'disabled':''}>Anterior</button>
        <span class="px-2 text-slate-500 font-bold">${currentMasterPage} / ${totalPages}</span>
        <button onclick="if(currentMasterPage<${totalPages}){currentMasterPage++; renderMasterTable();}" class="btn btn-ghost btn-xs" ${currentMasterPage===totalPages?'disabled':''}>Próxima</button>
      `;
    }

    function resetAllFilters() {
      document.getElementById('filter-edital').value = 'ALL';
      document.getElementById('filter-status').value = 'ALL';
      document.getElementById('filter-tier').value = 'ALL';
      document.getElementById('filter-ponto').value = 'ALL';
      document.getElementById('filter-contato').value = 'ALL';
      document.getElementById('filter-distancia').value = 'ALL';
      document.getElementById('search-input').value = '';
      applyFilters();
    }

    function filterTier1() {
      resetAllFilters();
      document.getElementById('filter-tier').value = 'Tier 1';
      applyFilters();
    }

    function filterSuplentes() {
      resetAllFilters();
      document.getElementById('filter-status').value = 'SUPLENTE_ALTA';
      applyFilters();
    }

    function filterMEIs() {
      resetAllFilters();
      document.getElementById('filter-contato').value = 'COM_TEL';
      applyFilters();
    }

    // =========================================================================
    // MODAL / DOSSIÊ 360° DO MOTORISTA
    // =========================================================================
    function openDriverModal(driverId) {
      const d = RAW_DATA.find(x => x.id === driverId);
      if (!d) return;

      document.getElementById('modal-name').innerText = d.nom;
      document.getElementById('modal-avatar').innerText = d.nom.split(' ').map(n=>n[0]).slice(0,2).join('');
      document.getElementById('modal-cpf-top').innerText = 'CPF: ' + (d.cpf || 'Não identificado');
      document.getElementById('modal-condutax-top').innerText = 'Condutax: ' + (d.cad || '—');
      document.getElementById('modal-id-top').innerText = 'ID: ' + d.id;

      // Badges
      const isContemplado = d.st.includes('CONTEMPLADO');
      const isSuplente = d.supl.includes('Alta Probabilidade');

      const stBadge = document.getElementById('modal-status-badge');
      stBadge.innerText = isContemplado ? 'CONTEMPLADO (TITULAR 2026)' : d.st;
      stBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isContemplado ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'}`;

      const suplBadge = document.getElementById('modal-supl-badge');
      const suplContainer = document.getElementById('modal-supl-container');
      if (isSuplente) {
        suplBadge.classList.remove('hidden');
        suplContainer.classList.remove('hidden');
        document.getElementById('modal-supl-previsao').innerText = d.prev_supl || 'Posição de alta probabilidade na margem de desistência do DTP.';
      } else {
        suplBadge.classList.add('hidden');
        suplContainer.classList.add('hidden');
      }

      // Scores
      document.getElementById('modal-score').innerText = d.score || '—';
      document.getElementById('modal-tier').innerText = d.tier || 'Sem Score';
      document.getElementById('modal-just-score').innerText = d.just_sc || 'Sem justificativa comercial.';
      document.getElementById('modal-rank').innerText = d.rdef ? `Posição ${d.rdef}º` : (d.fila ? `Fila ${d.fila}º` : '—');
      document.getElementById('modal-fila').innerText = `Classificação NF: ${d.rnf || '—'} | Fila Espera: ${d.fila || 0}`;
      document.getElementById('modal-tempo').innerText = d.anos ? `${d.anos} anos` : '—';
      document.getElementById('modal-safra').innerText = `Safra: ${d.safra || 'Não informada'}`;

      // Ação Comercial
      document.getElementById('modal-acao').innerText = d.acao || 'Abordagem institucional e boas-vindas.';

      // Veículo & Regras DTP
      document.getElementById('modal-veic-exig').innerText = d.veic_exig || 'Regra padrão DTP';
      document.getElementById('modal-veic-mod').innerText = d.veic_mod || 'Modelos comuns aceitos pelo DTP';
      document.getElementById('modal-veic-prazo').innerText = d.veic_prazo || '90 a 120 dias para vistoria';

      // Edital
      document.getElementById('modal-edital').innerText = d.ed ? `Edital ${d.ed} (${d.ed_desc})` : 'Diário Oficial';
      document.getElementById('modal-cota').innerText = d.mod || 'Ampla Concorrência';
      document.getElementById('modal-protocolo').innerText = d.prt || '—';
      document.getElementById('modal-gen').innerText = `${d.gen || 'Não inf.'} (${d.dec || ''})`;

      // Contato & Distância
      document.getElementById('modal-tel1').innerText = d.tel1 || 'Não cadastrado';
      document.getElementById('modal-dist-km').innerText = d.mei_dist ? `${d.mei_dist} km (${d.mei_reg})` : '—';
      document.getElementById('modal-bairro').innerText = d.bairro || 'São Paulo';
      document.getElementById('modal-cep').innerText = d.cep || '—';

      // SEI & DOC
      document.getElementById('modal-sei-proc').innerText = d.sei ? `Processo SEI: ${d.sei}` : 'Nenhum Processo SEI anexado';
      document.getElementById('modal-doc-resumo').innerText = d.doc_resumo || 'Sem despachos específicos no DOC.';
      
      const linkSEI = document.getElementById('modal-link-sei');
      linkSEI.href = `https://sei.prefeitura.sp.gov.br/sei/controlador_externo.php?acao=usuario_externo_pesquisa_processo`;
      
      const linkDOC = document.getElementById('modal-link-doc');
      linkDOC.href = `https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=termo_pesquisar&txtTermo=${encodeURIComponent(d.nom)}`;

      // Ponto
      document.getElementById('modal-ponto-end').innerText = d.pto_end || (d.pto_num ? `Ponto ${d.pto_num}` : 'Ponto Livre / Sem Ponto Privativo');
      document.getElementById('modal-ponto-meta').innerText = `Capacidade: ${d.pto_cap || '—'} | Saldo de Vagas: ${d.pto_saldo || '—'}`;
      document.getElementById('modal-ponto-tel').innerText = `Telefone do Ponto: ${d.pto_tel || '—'}`;

      // WhatsApp Button
      const btnWpp = document.getElementById('modal-btn-wpp-ready');
      const crmMatch = CRM_LEADS.find(c => c.id === d.id);
      if (crmMatch && crmMatch.wpp_url) {
        btnWpp.href = crmMatch.wpp_url;
        btnWpp.classList.remove('hidden');
      } else if (d.tel1) {
        const cleanTel = d.tel1.replace(/\\D/g, '');
        btnWpp.href = `https://wa.me/55${cleanTel}`;
        btnWpp.classList.remove('hidden');
      } else {
        btnWpp.classList.add('hidden');
      }

      document.getElementById('driver-modal').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('driver-modal').classList.add('hidden');
    }

    // =========================================================================
    // ABA 4: CLIENTES CORPORATIVOS B2B & HOSPITAIS (FILTROS, TABELA E MODAL)
    // =========================================================================
    function applyCorpFilters() {
      const qInput = document.getElementById('corp-search-query');
      const q = qInput ? qInput.value.toLowerCase().trim() : '';
      
      const segInput = document.getElementById('corp-segment-filter');
      const seg = segInput ? segInput.value : 'ALL';
      
      const vulnInput = document.getElementById('corp-vuln-filter');
      const vuln = vulnInput ? vulnInput.value : 'ALL';
      
      const demandInput = document.getElementById('corp-demand-filter');
      const demand = demandInput ? demandInput.value : 'ALL';
      
      const distInput = document.getElementById('corp-dist-filter');
      const dist = distInput ? distInput.value : 'ALL';

      filteredCorp = ALL_CORP_CLIENTS.filter(item => {
        // Busca de texto
        if (q) {
          const matchNome = (item.nome || '').toLowerCase().includes(q);
          const matchId = (item.id || '').toLowerCase().includes(q);
          const matchEnd = (item.end || '').toLowerCase().includes(q);
          const matchBairro = (item.bairro || '').toLowerCase().includes(q);
          const matchLideres = (item.dec_lideres || '').toLowerCase().includes(q);
          const matchCargos = (item.dec_cargos || '').toLowerCase().includes(q);
          const matchDor = (item.mob_dor || '').toLowerCase().includes(q);
          const matchForn = (item.mob_forn || '').toLowerCase().includes(q);
          const matchDom = (item.email_dom || '').toLowerCase().includes(q);
          const matchDecEmail = (item.email_dec || '').toLowerCase().includes(q);
          const matchSetor = (item.setor || '').toLowerCase().includes(q);
          if (!matchNome && !matchId && !matchEnd && !matchBairro && !matchLideres && !matchCargos && !matchDor && !matchForn && !matchDom && !matchDecEmail && !matchSetor) {
            return false;
          }
        }

        // Filtro por Segmento
        if (seg !== 'ALL') {
          if (seg === 'HOSPITAIS' && !item.isHosp) return false;
          if (seg === 'EMPRESAS' && item.isHosp) return false;
          if (seg === 'HOSP_TIERA' && (!item.isHosp || !item.tier || !item.tier.includes('Tier A'))) return false;
          if (seg === 'TECH' && (!item.setor || (!item.setor.includes('Tecnologia') && !item.setor.includes('Software') && !item.setor.includes('Internet')))) return false;
          if (seg === 'FINANCE' && (!item.setor || (!item.setor.includes('Financeiro') && !item.setor.includes('Banc')))) return false;
          if (seg === 'INDUSTRY' && (!item.setor || (!item.setor.includes('Indústria') && !item.setor.includes('Bens') && !item.setor.includes('Farmacêutica') && !item.setor.includes('Automobilística')))) return false;
          if (seg === 'CONSULT' && (!item.setor || (!item.setor.includes('Consultoria') && !item.setor.includes('Auditoria')))) return false;
          if (seg === 'LEGAL' && (!item.setor || (!item.setor.includes('Jurídico') && !item.setor.includes('Advocacia')))) return false;
          if (seg === 'SHOPPING' && (!item.setor || (!item.setor.includes('Shopping') && !item.setor.includes('Varejo')))) return false;
        }

        // Filtro por Vulnerabilidade Contratual
        if (vuln !== 'ALL') {
          if (vuln === 'Alta' && (!item.mob_vuln || !item.mob_vuln.toLowerCase().includes('alta'))) return false;
          if (vuln === 'Média' && (!item.mob_vuln || !item.mob_vuln.toLowerCase().includes('média'))) return false;
        }

        // Filtro por Foco de Demanda
        if (demand !== 'ALL') {
          if (demand === 'ACES' && (!item.acessivel || !item.acessivel.toLowerCase().includes('alta'))) return false;
          if (demand === 'VOUCHERS' && (!item.vouchers || !item.vouchers.toLowerCase().includes('alta'))) return false;
          if (demand === 'ESG' && (!item.esg || !item.esg.toLowerCase().includes('alta'))) return false;
          if (demand === 'FAIXA' && (!item.faixa_onibus || !item.faixa_onibus.toLowerCase().includes('alta'))) {
            if (item.isHosp) return false;
          }
        }

        // Filtro por Distância da Sede
        if (dist !== 'ALL') {
          const maxDist = parseFloat(dist);
          if (item.dist > maxDist) return false;
        }

        return true;
      });

      currentCorpPage = 1;
      renderCorpTable();
      renderCorpPagination();
    }

    function renderCorpTable() {
      const tbody = document.getElementById('corp-table-body');
      if (!tbody) return;

      const resultsCount = document.getElementById('corp-results-count');
      if (resultsCount) {
        resultsCount.innerText = `Exibindo ${filteredCorp.length} clientes corporativos`;
      }

      const startIdx = (currentCorpPage - 1) * corpPageSize;
      const endIdx = Math.min(startIdx + corpPageSize, filteredCorp.length);
      const pageData = filteredCorp.slice(startIdx, endIdx);

      if (pageData.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-10 text-slate-500">
              <i class="ph-bold ph-buildings text-3xl mb-2 block text-slate-300"></i>
              Nenhum cliente corporativo encontrado com os filtros selecionados.
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      pageData.forEach(item => {
        const isHosp = item.isHosp;
        const icon = isHosp ? '🏥' : '🏢';
        const badgeColor = isHosp ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200';
        const tierBadge = item.tier.includes('Tier A') ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-amber-100 text-amber-800 border-amber-200';
        const vulnBadge = item.mob_vuln === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200';

        html += `
          <tr class="hover:bg-purple-50/40 transition cursor-pointer group" onclick="openCorpModal('${item.id}')">
            <!-- COL 1: Prospect / Instituição -->
            <td class="py-2.5 px-3">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${isHosp ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}">
                  ${icon}
                </div>
                <div>
                  <div class="font-bold text-slate-900 group-hover:text-purple-700 transition flex items-center gap-1.5">
                    <span>${item.nome}</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${tierBadge}">${item.tier.split(' ')[0]} ${item.tier.split(' ')[1]}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">${item.id} &bull; Score: <b class="text-amber-600">${item.score} pts</b></div>
                </div>
              </div>
            </td>

            <!-- COL 2: Segmento & Local -->
            <td class="py-2.5 px-3">
              <div class="font-semibold text-slate-800">${item.setor}</div>
              <div class="text-[10px] text-slate-500">${item.bairro} &bull; ${item.colab ? item.colab + ' presencial' : (item.grupo || 'Saúde')}</div>
            </td>

            <!-- COL 3: Dist. Sede -->
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                ${item.dist} km
              </span>
              <span class="block text-[9px] text-slate-400 mt-0.5">~${item.tempo} min</span>
            </td>

            <!-- COL 4: Mobilidade Atual & Dor -->
            <td class="py-2.5 px-3 max-w-[220px]">
              <div class="flex items-center gap-1">
                <span class="text-[10px] text-slate-500 font-medium">Fornecedor:</span>
                <span class="font-bold text-slate-800 text-[11px]">${item.mob_forn}</span>
              </div>
              <div class="text-[10px] text-rose-700 font-medium line-clamp-1 italic mt-0.5" title="${item.mob_dor}">
                "${item.mob_dor}"
              </div>
            </td>

            <!-- COL 5: Vulnerab. -->
            <td class="py-2.5 px-3 text-center">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${vulnBadge}">
                ${item.mob_vuln}
              </span>
            </td>

            <!-- COL 6: Potencial Receita -->
            <td class="py-2.5 px-3">
              <div class="font-black text-emerald-600 text-xs">${item.mob_rec.split('(')[0]}</div>
              <div class="text-[9px] text-slate-500">${item.corridas.split(' ')[0]} corr/mês</div>
            </td>

            <!-- COL 7: Decisores & E-mails -->
            <td class="py-2.5 px-3 max-w-[200px]">
              <div class="font-semibold text-slate-800 line-clamp-1" title="${item.dec_cargos}">
                ${item.dec_cargos.split('|')[0] || item.dec_area}
              </div>
              <div class="text-[10px] font-mono text-emerald-700 line-clamp-1" title="${item.email_dec || item.email_inst}">
                ${item.email_dec ? item.email_dec.split(';')[0] : (item.email_dom ? `@${item.email_dom}` : '—')}
              </div>
            </td>

            <!-- COL 8: Ações Rápidas -->
            <td class="py-2.5 px-3 text-center whitespace-nowrap" onclick="event.stopPropagation()">
              <div class="flex items-center justify-center gap-1">
                <button onclick="openCorpModal('${item.id}')" title="Abrir Dossiê 360°" class="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs shadow-sm transition">
                  <i class="ph-bold ph-files"></i>
                </button>
                ${item.dec_linkedin ? `
                  <a href="${item.dec_linkedin}" target="_blank" title="Buscar no LinkedIn Web" class="p-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg text-xs shadow-sm transition">
                    <i class="ph-bold ph-linkedin-logo"></i>
                  </a>
                ` : ''}
                ${item.dec_google ? `
                  <a href="${item.dec_google}" target="_blank" title="Ver Perfis do LinkedIn no Google (Sem Login)" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs shadow-sm transition">
                    <i class="ph-bold ph-google-logo"></i>
                  </a>
                ` : ''}
                <button onclick="locateCorpOnMap(${item.lat}, ${item.lon}, '${item.id}')" title="Localizar no Mapa GIS" class="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs shadow-sm transition">
                  <i class="ph-bold ph-map-pin"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    }

    function renderCorpPagination() {
      const container = document.getElementById('corp-pagination');
      if (!container) return;

      const totalItems = filteredCorp.length;
      const totalPages = Math.ceil(totalItems / corpPageSize) || 1;
      const startIdx = totalItems > 0 ? (currentCorpPage - 1) * corpPageSize + 1 : 0;
      const endIdx = Math.min(currentCorpPage * corpPageSize, totalItems);

      let html = `
        <div class="text-slate-500 text-[11px]">
          Mostrando <b>${startIdx}</b> a <b>${endIdx}</b> de <b>${totalItems}</b> clientes corporativos
        </div>
        <div class="flex items-center space-x-1">
          <button onclick="changeCorpPage(1)" ${currentCorpPage === 1 ? 'disabled' : ''} class="btn btn-ghost btn-xs">
            <i class="ph-bold ph-caret-double-left"></i>
          </button>
          <button onclick="changeCorpPage(${currentCorpPage - 1})" ${currentCorpPage === 1 ? 'disabled' : ''} class="btn btn-ghost btn-xs">
            <i class="ph-bold ph-caret-left"></i>
          </button>
      `;

      let startP = Math.max(1, currentCorpPage - 2);
      let endP = Math.min(totalPages, currentCorpPage + 2);
      for (let p = startP; p <= endP; p++) {
        if (p === currentCorpPage) {
          html += `<button class="btn bg-purple-600 text-white">${p}</button>`;
        } else {
          html += `<button onclick="changeCorpPage(${p})" class="btn btn-ghost btn-xs">${p}</button>`;
        }
      }

      html += `
          <button onclick="changeCorpPage(${currentCorpPage + 1})" ${currentCorpPage === totalPages ? 'disabled' : ''} class="btn btn-ghost btn-xs">
            <i class="ph-bold ph-caret-right"></i>
          </button>
          <button onclick="changeCorpPage(${totalPages})" ${currentCorpPage === totalPages ? 'disabled' : ''} class="btn btn-ghost btn-xs">
            <i class="ph-bold ph-caret-double-right"></i>
          </button>
        </div>
      `;

      container.innerHTML = html;
    }

    function changeCorpPage(page) {
      const totalPages = Math.ceil(filteredCorp.length / corpPageSize) || 1;
      if (page < 1 || page > totalPages) return;
      currentCorpPage = page;
      renderCorpTable();
      renderCorpPagination();
      const tabCorp = document.getElementById('tab-content-corp');
      if (tabCorp) tabCorp.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function changeCorpPageSize() {
      const select = document.getElementById('corp-page-size');
      if (select) {
        corpPageSize = parseInt(select.value, 10);
        currentCorpPage = 1;
        renderCorpTable();
        renderCorpPagination();
      }
    }

    // =========================================================================
    // MODAL / DOSSIÊ 360° DO CLIENTE CORPORATIVO B2B
    // =========================================================================
    function openCorpModal(id) {
      const item = ALL_CORP_CLIENTS.find(x => x.id === id);
      if (!item) return;

      currentCorpModalId = item.id;

      // Header
      document.getElementById('corp-modal-avatar').innerText = item.isHosp ? '🏥' : '🏢';
      document.getElementById('corp-modal-name').innerText = item.nome;
      document.getElementById('corp-modal-tier-badge').innerText = item.tier;
      document.getElementById('corp-modal-score-badge').innerText = `Score: ${item.score} pts`;
      
      const vulnBadge = document.getElementById('corp-modal-vuln-badge');
      vulnBadge.innerText = `Vuln: ${item.mob_vuln}`;
      if (item.mob_vuln === 'Alta') {
        vulnBadge.className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30";
      } else {
        vulnBadge.className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30";
      }

      const subTitle = item.isHosp 
        ? `${item.tipo} &bull; ${item.grupo || 'Rede de Saúde'} &bull; ${item.bairro}`
        : `${item.setor} &bull; ${item.colab} presencial (${item.edificio || 'Sede'}) &bull; ${item.bairro}`;
      document.getElementById('corp-modal-subtitle').innerHTML = subTitle;

      // Card 1: Diagnóstico Mobilidade
      document.getElementById('corp-modal-forn').innerText = item.mob_forn || '—';
      document.getElementById('corp-modal-tipo-mob').innerText = item.mob_tipo || '—';
      document.getElementById('corp-modal-dor').innerText = `"${item.mob_dor || 'Gargalo em validação'}"`;
      document.getElementById('corp-modal-corridas').innerText = item.corridas || '—';
      document.getElementById('corp-modal-rec').innerText = item.mob_rec || '—';

      // Card 2: Localização & Sede Butantã
      document.getElementById('corp-modal-end').innerText = item.end || '—';
      document.getElementById('corp-modal-dist').innerText = `${item.dist} km da Sede Chame Táxi`;
      document.getElementById('corp-modal-tempo').innerText = `~${item.tempo} min de deslocamento`;
      document.getElementById('corp-modal-ponto').innerText = item.ponto || 'Ponto Livre da Região';

      // Card 3: Decisores & E-mails
      document.getElementById('corp-modal-dec-area').innerText = item.dec_area || 'Compras Indiretas & Suprimentos';
      document.getElementById('corp-modal-dec-cargos').innerText = item.dec_cargos || 'Diretor de Suprimentos / Head Facilities';
      document.getElementById('corp-modal-dec-lideres').innerText = item.dec_lideres || 'Central de Compras Institucional';
      
      const emailPadrao = item.email_padrao || (item.email_dom ? `{primeiro}.{sobrenome}@${item.email_dom}` : '—');
      document.getElementById('corp-modal-email-padrao').innerText = emailPadrao;
      
      const emailDec = item.email_dec || item.email_inst || (item.email_dom ? `compras@${item.email_dom}` : '—');
      document.getElementById('corp-modal-email-dec').innerText = emailDec;

      // Card 4: Links de Prospecção 1-Clique
      const lnkLinkedin = document.getElementById('corp-modal-link-linkedin');
      if (item.dec_linkedin) {
        lnkLinkedin.href = item.dec_linkedin;
        lnkLinkedin.classList.remove('hidden');
      } else {
        lnkLinkedin.classList.add('hidden');
      }

      const lnkGoogle = document.getElementById('corp-modal-link-google');
      if (item.dec_google) {
        lnkGoogle.href = item.dec_google;
        lnkGoogle.classList.remove('hidden');
      } else {
        lnkGoogle.classList.add('hidden');
      }

      const lnkHunter = document.getElementById('corp-modal-link-hunter');
      if (item.link_hunter) {
        lnkHunter.href = item.link_hunter;
        lnkHunter.classList.remove('hidden');
      } else if (item.email_dom) {
        lnkHunter.href = `https://hunter.io/search/${item.email_dom}`;
        lnkHunter.classList.remove('hidden');
      } else {
        lnkHunter.classList.add('hidden');
      }

      const lnkDorkEmail = document.getElementById('corp-modal-link-dork-email');
      if (item.link_google_email) {
        lnkDorkEmail.href = item.link_google_email;
        lnkDorkEmail.classList.remove('hidden');
      } else {
        lnkDorkEmail.classList.add('hidden');
      }

      const lnkRoute = document.getElementById('corp-modal-link-maps');
      if (lnkRoute) {
        lnkRoute.href = `https://www.google.com/maps/dir/?api=1&origin=${CHAME_LAT},${CHAME_LON}&destination=${item.lat},${item.lon}`;
      }

      const lnkTel = document.getElementById('corp-modal-link-tel');
      const telTxt = document.getElementById('corp-modal-tel-txt');
      if (item.tel && item.tel !== '—') {
        const cleanTel = item.tel.replace(/\\D/g, '');
        lnkTel.href = `tel:${cleanTel}`;
        telTxt.innerText = `Ligar (${item.tel})`;
        lnkTel.classList.remove('hidden');
      } else {
        lnkTel.classList.add('hidden');
      }

      // Card 5: Script de Abordagem Personalizado
      const scriptText = item.dec_script || item.pitch || 'Prezado(a), identificamos oportunidade de otimização no contrato corporativo de mobilidade de sua instituição...';
      document.getElementById('corp-modal-script-text').innerText = scriptText;

      // Card 6: CRM LocalStorage
      const savedCRM = localStorage.getItem(`corp_crm_${item.id}`);
      if (savedCRM) {
        try {
          const parsed = JSON.parse(savedCRM);
          document.getElementById('corp-crm-status').value = parsed.status || '1 - Novo Prospect';
          document.getElementById('corp-crm-notes').value = parsed.notes || '';
        } catch (e) {
          document.getElementById('corp-crm-status').value = '1 - Novo Prospect';
          document.getElementById('corp-crm-notes').value = '';
        }
      } else {
        document.getElementById('corp-crm-status').value = '1 - Novo Prospect';
        document.getElementById('corp-crm-notes').value = '';
      }
      document.getElementById('corp-crm-saved-indicator').classList.add('hidden');

      // Footer
      document.getElementById('corp-modal-footer-id').innerText = `ID Prospect: ${item.id} &bull; ${item.tipo_entidade}`;

      // Show Modal
      document.getElementById('corp-dossier-modal').classList.remove('hidden');
    }

    function closeCorpModal() {
      document.getElementById('corp-dossier-modal').classList.add('hidden');
      currentCorpModalId = null;
    }

    function copyCorpScript() {
      const scriptElem = document.getElementById('corp-modal-script-text');
      if (!scriptElem) return;
      
      navigator.clipboard.writeText(scriptElem.innerText).then(() => {
        const btnTxt = document.getElementById('corp-copy-script-btn-txt');
        if (btnTxt) {
          const orig = btnTxt.innerText;
          btnTxt.innerText = "✓ Mensagem Copiada!";
          setTimeout(() => { btnTxt.innerText = orig; }, 2000);
        }
      }).catch(err => {
        alert("Não foi possível copiar automaticamente: selecione o texto e use Ctrl+C.");
      });
    }

    function saveCorpCRM() {
      if (!currentCorpModalId) return;
      const status = document.getElementById('corp-crm-status').value;
      const notes = document.getElementById('corp-crm-notes').value;
      
      const payload = {
        id: currentCorpModalId,
        status: status,
        notes: notes,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`corp_crm_${currentCorpModalId}`, JSON.stringify(payload));
      
      const indicator = document.getElementById('corp-crm-saved-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
        setTimeout(() => { indicator.classList.add('hidden'); }, 2500);
      }
    }

    function locateCurrentCorpOnMap() {
      if (!currentCorpModalId) return;
      const item = ALL_CORP_CLIENTS.find(x => x.id === currentCorpModalId);
      if (!item) return;
      closeCorpModal();
      locateCorpOnMap(item.lat, item.lon, item.id);
    }

    function locateCorpOnMap(lat, lon, id) {
      switchMainTab('map');
      setTimeout(() => {
        if (!leafletMapInstance) return;
        leafletMapInstance.setView([lat, lon], 16);
        
        // Procurar marcador em hospitais
        let found = false;
        if (hospitalsMarkersLayer) {
          hospitalsMarkersLayer.eachLayer(layer => {
            if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lon) < 0.0001) {
              layer.openPopup();
              found = true;
            }
          });
        }
        
        // Se não achou, procurar em empresas
        if (!found && empresasMarkersLayer) {
          empresasMarkersLayer.eachLayer(layer => {
            if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lon) < 0.0001) {
              layer.openPopup();
            }
          });
        }
      }, 300);
    }

    function exportCorpCSV() {
      if (!filteredCorp || filteredCorp.length === 0) {
        alert("Nenhum dado de cliente corporativo filtrado para exportar.");
        return;
      }

      let csv = "\\uFEFF";
      const headers = [
        "id", "nome", "tipo_entidade", "setor", "tier", "score", "dist", "tempo",
        "end", "bairro", "tel", "mob_forn", "mob_tipo", "mob_dor", "mob_vuln",
        "mob_rec", "corridas", "dec_area", "dec_cargos", "dec_lideres",
        "email_dom", "email_padrao", "email_dec", "dec_linkedin"
      ];
      csv += headers.join(";") + "\\n";

      filteredCorp.forEach(r => {
        const row = headers.map(h => {
          let val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        });
        csv += row.join(";") + "\\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes_corporativos_b2b_export_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // EXPORTAR FILTRADOS PARA CSV
    function exportFilteredCSV() {
      const dataToExport = currentMainTab === 'crm' ? filteredCRM : filteredMaster;
      if (!dataToExport || dataToExport.length === 0) {
        alert("Nenhum dado filtrado para exportar.");
        return;
      }

      let csv = "\\uFEFF";
      const headers = Object.keys(dataToExport[0]);
      csv += headers.join(";") + "\\n";

      dataToExport.forEach(r => {
        const row = headers.map(h => {
          let val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        });
        csv += row.join(";") + "\\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taxistas_sp_export_${currentMainTab}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // INICIALIZAÇÃO DOS GRÁFICOS CHART.JS
    function initCharts() {
  Chart.defaults.font.family = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#64748b';
  Chart.defaults.borderColor = '#e8edf3';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 7;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '700' };
  try {
    Chart.defaults.elements.bar.borderRadius = 3;
    Chart.defaults.elements.bar.maxBarThickness = 28;
    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.line.tension = 0.35;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 4;
    Chart.defaults.scale.grid.color = '#eef1f5';
  } catch (e) {}

      const ctxEditais = document.getElementById('chart-editais').getContext('2d');
      new Chart(ctxEditais, {
        type: 'bar',
        data: {
          labels: EDITAL_STATS.map(e => 'Ed ' + e.ed),
          datasets: [
            {
              label: 'Inscritos Totais',
              data: EDITAL_STATS.map(e => e.insc),
              backgroundColor: '#3b82f6',
              borderRadius: 6
            },
            {
              label: 'Contemplados',
              data: EDITAL_STATS.map(e => e.cont),
              backgroundColor: '#10b981',
              borderRadius: 6
            },
            {
              label: 'Fila de Espera',
              data: EDITAL_STATS.map(e => e.esp),
              backgroundColor: '#f59e0b',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 10 } } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
          }
        }
      });

      const ctxTiers = document.getElementById('chart-tiers').getContext('2d');
      new Chart(ctxTiers, {
        type: 'doughnut',
        data: {
          labels: ['Tier 1 (VIP >= 80)', 'Tier 2 (Alta 65-79)', 'Tier 3 (Média < 65)'],
          datasets: [{
            data: [TIER_STATS['Tier 1 (Prioridade Máxima / Score >= 80)'] || 50, TIER_STATS['Tier 2 (Prioridade Alta / Score 65-79)'] || 1500, TIER_STATS['Tier 3 (Prioridade Média / Score < 65)'] || 670],
            backgroundColor: ['#e11d48', '#f59e0b', '#64748b'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Plus Jakarta Sans', size: 10 } } }
          },
          cutout: '70%'
        }
      });

      if (ABERTOS.sub_labels.length) {
        const ctxAbertosSub = document.getElementById('chart-abertos-subpref').getContext('2d');
        new Chart(ctxAbertosSub, {
          type: 'bar',
          data: {
            labels: ABERTOS.sub_labels,
            datasets: [
              {
                label: 'Sinistros',
                data: ABERTOS.sub_sinistros,
                backgroundColor: '#f43f5e',
                borderRadius: 6
              },
              {
                label: 'Fatais',
                data: ABERTOS.sub_fatais,
                backgroundColor: '#0f172a',
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 10 } } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 9 } } },
              y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
            }
          }
        });
      }

      if (ABERTOS.mes_labels.length) {
        const ctxAbertosMes = document.getElementById('chart-abertos-mes').getContext('2d');
        new Chart(ctxAbertosMes, {
          type: 'line',
          data: {
            labels: ABERTOS.mes_labels,
            datasets: [
              {
                label: 'Sinistros',
                data: ABERTOS.mes_sinistros,
                borderColor: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                fill: true,
                tension: 0.35,
                pointRadius: 3
              },
              {
                label: 'Atropelamentos',
                data: ABERTOS.mes_atrop,
                borderColor: '#f59e0b',
                backgroundColor: 'transparent',
                tension: 0.35,
                pointRadius: 3
              },
              {
                label: 'Fatais',
                data: ABERTOS.mes_fatais,
                borderColor: '#0f172a',
                backgroundColor: 'transparent',
                tension: 0.35,
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 10 } } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 9 } } },
              y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
            }
          }
        });
      }
    }
  </script>
</body>
</html>"""

    # Injeção dos dados JSON
    final_html = html_template.replace('__RAW_DATA_PLACEHOLDER__', json_data)
    final_html = final_html.replace('__EDITAL_STATS_PLACEHOLDER__', json_stats)
    final_html = final_html.replace('__TIER_STATS_PLACEHOLDER__', json_tiers)
    final_html = final_html.replace('__CRM_DATA_PLACEHOLDER__', json_crm)
    final_html = final_html.replace('__MAP_PONTOS_PLACEHOLDER__', json_map_pontos)
    final_html = final_html.replace('__HOSPITAIS_PLACEHOLDER__', json_hospitais)
    final_html = final_html.replace('__EMPRESAS_PLACEHOLDER__', json_empresas)
    final_html = final_html.replace('__ABERTOS_PLACEHOLDER__', json_abertos)
    final_html = final_html.replace('__KPIS_ABERTOS__', kpis_html)
    final_html = final_html.replace('__LINHAS_ABERTOS__', linhas_abertos)

    out_root = 'dashboard_mestre_taxistas_sp_2026.html'
    out_folder = os.path.join('Novos Alvarás 2026', 'dashboard_alvaras_taxi_2026.html')

    print(f"Escrevendo arquivo no diretório raiz: {out_root}...")
    with open(out_root, 'w', encoding='utf-8') as f:
        f.write(final_html)

    print(f"Escrevendo arquivo na pasta 'Novos Alvarás 2026': {out_folder}...")
    with open(out_folder, 'w', encoding='utf-8') as f:
        f.write(final_html)

    sz_root = os.path.getsize(out_root) / (1024 * 1024)
    print("\n" + "=" * 80)
    print("SUÍTE OPERACIONAL E DASHBOARD GERADOS COM SUCESSO!")
    print(f"-> Arquivo HTML Raiz: {out_root} ({sz_root:.2f} MB)")
    print(f"-> Arquivo HTML Pasta: {out_folder} ({sz_root:.2f} MB)")
    print("=" * 80)

if __name__ == '__main__':
    generate_dashboard()
