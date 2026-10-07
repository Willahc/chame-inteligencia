# Guia Rápido: Como Abrir e Executar o Projeto em Outro Computador

Este pacote contém todo o código-fonte, dados processados, inteligência estratégica e a fila operacional de CRM do projeto **Mapeamento e Prospecção de Taxistas SP 2026 (Chame Táxi)**.

---

## 1. O que está incluído no pacote
1. **Fila Operacional CRM (Excel)**:
   - Arquivo: `Novos Alvarás 2026/fila_prospeccao_crm_taxistas_2026.xlsx`
   - **12.236 leads operacionais** com telefones validados, links diretos de WhatsApp (`wa.me`) para celulares e testes em linhas fixas comerciais, scripts de abordagem e pontuação comercial (Tiers 1 a 4).
2. **Mapa Estratégico de Cooperativas de SP (Excel)**:
   - Arquivo: `Novos Alvarás 2026/mapa_estrategico_cooperativas_chame_taxi.xlsx`
   - Cruzamento territorial competitivo (Chame Táxi Butantã vs Coopertax vs Vermelho e Branco vs Guarucoop).
3. **Base Mestre de Motoristas (CSV)**:
   - Arquivo: `planilha_mestre_taxistas_sp_2026.csv`
   - Todos os **16.863 motoristas** com **99 colunas** de atributos consolidados.
4. **Todos os Scripts do Pipeline (`scripts/`)**:
   - 47 scripts Python para mineração, enriquecimento fonético, auditoria de WhatsApp fixo, cruzamento territorial, geração de relatórios e suíte de testes unitários.
5. **Dossiês e Bases Processadas (`data/processed/`)**:
   - Enriquecimentos fonéticos, servidores públicos municipais (SEI/DOC), histórico de sorteios, polos CFC/DTP e cadastros.

---

## 2. Como Configurar no Novo Computador (3 Passos Simples)

### Passo 1: Descompactar o arquivo
Extraia o conteúdo do arquivo `.zip` em uma pasta de sua preferência (exemplo: `C:\Projetos\Mapeamento`).

### Passo 2: Instalar as bibliotecas Python (se for executar scripts)
Abra o terminal (PowerShell ou Prompt de Comando) na pasta do projeto e execute:
```bash
python -m pip install -r requirements.txt
```

### Passo 3: Gerar o Super Excel de 20 Abas e o Dashboard Web
Para reconstruir a Super Planilha Excel (`planilha_mestre_taxistas_sp_2026.xlsx` - 20 abas) e o Dashboard HTML interativo no novo computador, basta executar:
```bash
python scripts/build_master_spreadsheet.py
python scripts/generate_master_dashboard.py
```
Em menos de 1 minuto, o Super Excel e o Dashboard Web estarão gerados na raiz do projeto!

---

## 3. Uso Imediato no Excel (Sem Necessidade de Python)
Se você precisa apenas usar a planilha no dia a dia com a equipe comercial:
- Abra diretamente o arquivo:
  `Novos Alvarás 2026\fila_prospeccao_crm_taxistas_2026.xlsx`
- Todos os links de WhatsApp funcionam com 1 clique direto no navegador.
