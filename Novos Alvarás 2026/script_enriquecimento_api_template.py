"""
=============================================================================
SCRIPT DE ENRIQUECIMENTO AUTOMATIZADO DE CONTATOS (BUREAU DE DADOS / API)
Projeto: Sorteio de Novos Alvarás de Táxi SP 2026
Autor: Senior Data Scientist
=============================================================================
Instruções de Uso:
1. Este script lê o arquivo 'layout_enriquecimento_contemplados_2140.csv'
2. Realiza a consulta em lote via API do bureau de dados contratado
   (Exemplos configuráveis: Assertiva, BigDataCorp, Unitfour, Neoway ou Mock)
3. Salva a planilha final com telefones, WhatsApp e e-mails preenchidos.
=============================================================================
"""

import pandas as pd
import requests
import json
import time
import os

# Configurações do Bureau / API
API_URL = "https://api.exemplo-bureau.com.br/v1/enriquecimento/pessoa-fisica"
API_TOKEN = "SEU_TOKEN_AQUI"  # Insira a chave fornecida pelo seu bureau de dados
BATCH_SIZE = 50               # Quantidade de registros por lote
TIMEOUT_SECS = 15

# Caminhos dos arquivos
INPUT_CSV = "layout_enriquecimento_contemplados_2140.csv"
OUTPUT_EXCEL = "contemplados_enriquecidos_com_telefones.xlsx"

def consultar_bureau_mock(nome, municipio, uf, ano_min, ano_max):
    """
    Função de simulação de resposta de Bureau para testes locais.
    Substitua esta função pela chamada real da API contratada.
    """
    return {
        "status": "SUCESSO",
        "telefone_1": "(11) 98765-4321",
        "telefone_2": "(11) 91234-5678",
        "whatsapp_ativo": "Sim",
        "email": f"{nome.lower().split()[0]}.taxista@gmail.com",
        "bairro": "Centro",
        "cep": "01014-000"
    }

def consultar_bureau_api(nome, municipio, uf, ano_min, ano_max):
    """
    Modelo de chamada REST HTTP para Bureaus de Dados de Mercado.
    """
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "nome": nome,
        "cidade": municipio,
        "uf": uf,
        "ano_nascimento_min": ano_min,
        "ano_nascimento_max": ano_max
    }
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=TIMEOUT_SECS)
        if response.status_code == 200:
            data = response.json()
            # Mapear os campos retornados conforme o schema específico do bureau contratado
            return {
                "status": "ENRIQUECIDO",
                "telefone_1": data.get("telefone_celular_1", ""),
                "telefone_2": data.get("telefone_celular_2", ""),
                "whatsapp_ativo": "Sim" if data.get("tem_whatsapp") else "Não",
                "email": data.get("email_principal", ""),
                "bairro": data.get("bairro", ""),
                "cep": data.get("cep", "")
            }
        else:
            return {"status": f"ERRO_{response.status_code}"}
    except Exception as e:
        return {"status": f"EXCECAO_{str(e)[:30]}"}

def main():
    if not os.path.exists(INPUT_CSV):
        print(f"Erro: Arquivo '{INPUT_CSV}' não encontrado.")
        return

    print(f"Carregando {INPUT_CSV}...")
    df = pd.read_csv(INPUT_CSV, sep=';', encoding='utf-8-sig')
    print(f"Total de registros a enriquecer: {len(df)}")

    # ATENÇÃO: Alterne para 'consultar_bureau_api' após configurar o API_TOKEN e URL
    funcao_consulta = consultar_bureau_mock 

    total = len(df)
    for idx, row in df.iterrows():
        if pd.notnull(row.get('Telefone_Celular_1')) and str(row.get('Telefone_Celular_1')).strip():
            continue  # Pular já preenchidos

        nome = row['Nome_Limpo_Sem_Acento']
        municipio = row['Municipio']
        uf = row['UF']
        ano_min = row['Ano_Nascimento_Min']
        ano_max = row['Ano_Nascimento_Max']

        resultado = funcao_consulta(nome, municipio, uf, ano_min, ano_max)

        df.at[idx, 'Telefone_Celular_1'] = resultado.get('telefone_1', '')
        df.at[idx, 'Telefone_Celular_2'] = resultado.get('telefone_2', '')
        df.at[idx, 'WhatsApp_Ativo'] = resultado.get('whatsapp_ativo', '')
        df.at[idx, 'Email_Principal'] = resultado.get('email', '')
        df.at[idx, 'Bairro_Residencial'] = resultado.get('bairro', '')
        df.at[idx, 'CEP'] = resultado.get('cep', '')
        df.at[idx, 'Status_Enriquecimento'] = resultado.get('status', '')

        if (idx + 1) % 100 == 0 or (idx + 1) == total:
            print(f"Progresso: {idx + 1}/{total} ({(idx + 1)/total*100:.1f}%)")
            time.sleep(0.5)

    print(f"Exportando base final para {OUTPUT_EXCEL}...")
    df.to_excel(OUTPUT_EXCEL, index=False, engine='openpyxl')
    print("Processamento concluído com sucesso!")

if __name__ == '__main__':
    main()
