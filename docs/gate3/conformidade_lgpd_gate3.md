# Conformidade e minimização de dados — Gate 3

## Finalidade

Inventariar/auditar canal institucional oficial relacionado à formação para Condutax. Não houve recrutamento, contato, perfilamento, decisão automatizada ou classificação comercial.

## Dados preservados e minimizados

O PDF original foi mantido como evidência pública. A auditoria registrou apenas métricas agregadas e campos institucionais da seção `CFC - TÁXI`: nome empresarial/institucional, endereço institucional, bairro, CEP e telefone publicado no cadastro institucional. Não foi criada lista derivada, enriquecida ou tratada.

## Dados excluídos

CPF, RG, CNH, placa, endereço residencial, nome/contato de motorista, instrutor, responsável técnico ou despachante pessoa física. OIAs e despachantes não foram processados porque expõem dados pessoais. CNPJ não foi extraído da seção Táxi pois não é publicado nela.

## Fontes oficiais e uso futuro

Foram usadas a página DTP de instituições, seu anexo CFC oficial manualmente obtido, página Táxi/Condutax, SP156 e landing do Portal DTP. Estar na lista de 2024 não demonstra validade atual, autorização de contato, interesse em parceria ou vínculo com pessoas específicas. Uso futuro requer fonte atualizada, base legal, transparência e canal institucional apropriado.

## Camada posterior ao Gate 3

O arquivo `data/processed/polos_formacao_taxistas_cfc_dtp.json` é derivado de uma seleção operacional de 24 CFCs e inclui telefones, endereços, coordenadas, descrição de serviços, público-alvo, estratégia comercial e campos de proveniência. Esses campos derivados não são todos publicados no PDF; `status_vigencia` está marcado como não verificado. A seleção não transforma a lista de 27 entradas do PDF em credenciamento vigente.

O monitor do Diário Oficial e o dashboard são artefatos posteriores e não alteram o escopo histórico deste Gate. Registros do DOC podem conter nomes de motoristas, processos e números de atos; o dashboard deve ser tratado como acesso restrito, com minimização, finalidade definida, base legal, controle de acesso e revisão jurídica antes de distribuição. Telefone institucional ou de ponto não constitui autorização para contato automatizado, e nenhuma ação comercial deve ocorrer sem validação de elegibilidade e autorização.

## Revisão de 29/09/2026 — dados pessoais na camada posterior

As afirmações de exclusão acima descrevem corretamente o artefato auditado neste Gate (PDF oficial de CFCs) e permanecem verdadeiras para ele. A camada posterior ao Gate 6, no entanto, **sim** consolida dados pessoais de pessoas naturais — CPF, telefone celular, e-mail, bairro e CEP residencial, gênero e faixa etária — a partir do Diário Oficial, da base de dados abertos da Receita Federal e de listas operacionais de prospecção.

Para tornar isso compatível com a minimização, o repositório passou a operar com duas camadas (`scripts/privacy.py`):

- **Camada completa** (com dados pessoais): Planilha Mestre, fila de CRM, roteiro de visitas, base de MEIs, cache do DOC, base completa da Receita e os dashboards/mapa HTML. Ficam apenas na máquina local e estão no `.gitignore`.
- **Camada pública** (minimizada): a única Planilha Mestre versionada é `planilha_mestre_taxistas_sp_2026_publico.csv`, gerada sem CPF, telefone, e-mail, gênero, ano de nascimento, bairro/CEP residencial e chaves de busca em bureau; CPF e links de WhatsApp eventualmente presentes em texto livre são redigidos.

Verificação obrigatória: `python scripts/privacy.py check` (falha com qualquer dado pessoal versionado). Restam pendentes, antes de qualquer compartilhamento externo ou contato automatizado, os requisitos de base legal, finalidade, transparência, controle de acesso e revisão jurídica. Nada nesta revisão altera o escopo histórico do Gate 3.
