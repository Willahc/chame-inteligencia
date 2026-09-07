# Auditoria Final e Entrega do MVP Comercial — Chame Inteligência

**Data da Auditoria:** 07 de setembro de 2026  
**Sistema:** Chame Inteligência — Plataforma de Inteligência Comercial e Prospecção B2B de Mobilidade Corporativa  
**Escopo:** Auditoria final rigorosa de conformidade, resolução definitiva da divergência PNCP, auditoria do índice comercial, validação visual/responsiva das telas e entrega do MVP Comercial sem abertura de novos Gates.  
**Diretrizes Canônicas:** `AGENTS.md` e regras absolutas de governança.

---

## 1. Regras Absolutas e Governança

Durante todo este ciclo de trabalho:
- **Receita Federal:** Nenhuma consulta, download, scraping ou implementação foi realizada. A tabela `EmpresaReceita` permanece rigorosamente vazia (`0` registros) e o **Gate 4 (Receita Federal Oficial)** permanece com status **PENDENTE** e fora do escopo.
- **Iniciações Proibidas:** Não foram iniciadas buscas automáticas de responsáveis, scraping de LinkedIn, campanhas de e-mail/WhatsApp, discadores, integrações de CRM, chamadas a APIs de IA externa, adição de novas fontes ou alterações não autorizadas dos dados canônicos.
- **Minimização e LGPD:** Não foram coletados nem armazenados CPFs, dados pessoais de saúde, quadros societários pessoais (QSA), endereços ou telefones privados. Todos os contatos profissionais disponíveis são B2B, públicos, rastreáveis e dotados de evidência de fonte oficial ou jornalística legítima.
- **Segurança de Segredos:** Nenhum arquivo `.env`, token de acesso ou chave privada foi adicionado ou rastreado pelo controle de versão Git.

---

## 2. Contagens Auditadas Diretamente no Banco de Dados

A auditoria direta executada via Prisma Client no banco de dados canônico confirmou com 100% de exatidão os quantitativos acordados:

| Entidade / Conceito | Quantidade Auditada | Classificação Canônica | Status de Verificação |
| :--- | :---: | :---: | :--- |
| **Instituições Reais** | **8.212** | `FATO_OFICIAL` | Auditado e confirmado (CNES / DataSUS) |
| **Instituições de Demonstração** | **5** | `DEMONSTRACAO` | Auditado e confirmado (registros fictícios isolados) |
| **Total de Instituições Cadastradas** | **8.217** | Híbrido | 8.212 reais + 5 de demonstração |
| **Agrupamentos Econômicos Reais** | **7.550** | `FATO_OFICIAL` / `HIPOTESE` | 7.308 grupos oficiais e 242 hipóteses inferidas |
| **Agrupamento de Demonstração** | **1** | `DEMONSTRACAO` | Grupo isolado de demonstração |
| **Contas Comerciais Reais** | **7.550** | `FATO_OFICIAL` / `HIPOTESE` | Mapeamento 1:1 com os grupos econômicos reais |
| **Contas Comerciais de Demonstração** | **5** | `DEMONSTRACAO` | Contas isoladas para o modo demonstração |
| **Total de Contas Comerciais** | **7.555** | Híbrido | Auditado e confirmado no banco |
| **Contatos Profissionais B2B Públicos** | **123** | `FATO_PUBLICO` / `DEMONSTRACAO` | Auditado e confirmado (118 reais + 5 demo) |
| **Sinais de Contratação PNCP (Editais/Dispensas)** | **544** | `FATO_PUBLICO` | Auditado e confirmado (`categoriaPNCP: SINAL_CONTRATACAO`) |
| **Contratos Confirmados PNCP (Contratos/Empenhos)** | **1.474** | `FATO_PUBLICO` | Auditado e confirmado (`categoriaPNCP: CONTRATO_CONFIRMADO`) |
| **Total de Registros PNCP Preservados** | **2.018** | `FATO_PUBLICO` | Auditado e confirmado (`544 + 1.474 = 2.018`) |
| **Enriquecimentos BrasilAPI** | **2.996** | `DADO_TERCEIRO_NAO_CANONICO` | Auditado e confirmado (100% dos prioritários com CNPJ) |
| **Registros de Operadoras ANS (CADOP)** | **1.113** | `FATO_OFICIAL` | Auditado e confirmado (dados institucionais CADOP) |
| **Municípios IBGE Integrados** | **5.571** | `FATO_OFICIAL` | Auditado e confirmado (malha territorial nacional) |
| **Indicadores Agregados MTE / CAGED** | **4** | `FATO_PUBLICO` | Auditado e confirmado (estatísticas setoriais do setor Q/86) |
| **EmpresaReceita (Carga Oficial da Receita)** | **0** | `FATO_OFICIAL` | Auditado e confirmado (`EmpresaReceita = 0`) |

---

## 3. Investigação e Resolução da Divergência PNCP

### 3.1. Origem Real da Diferença (Diagnóstico Anterior 4 vs. Painel 156)
A divergência documentada entre os 4 vínculos institucionais exatos e o número 156 anteriormente exibido na interface/documentação foi minuciosamente investigada na raiz:

1. **Inexistência de 156 no Banco:** No banco de dados canônico, **nunca existiram 156 hospitais vinculados**. A contagem real de registros com `instituicaoId !== null` sempre foi de exatamente **4 processos**, todos vinculados a **1 única instituição hospitalar**: `HOSPITAL DO SERV PUB EST FCO MORATO DE OLIVEIRA SAO PAULO` (IAMSPE - CNES `2058502`), cujo CNPJ unívoco de mantenedora é `60.747.318/0001-62`.
2. **Origem do Número 156:** O número 156 originou-se de uma inferência descritiva/hardcoded no front-end (`src/components/cobertura-client.tsx`, linha 180) e no documento preliminar `INTEGRACAO_VISUAL_TODAS_FONTES.md`. O autor daquele commit subtraiu 156 de 2.018 para estimar "1.862 registros gerais", projetando que os contratos hospitalares estaduais pudessem representar estabelecimentos distintos vinculados.
3. **Por que os outros 2.014 registros não possuem vínculo:**
   - No PNCP, a imensa maioria dos contratos e editais de saúde do estado de São Paulo é formalizada pelos CNPJs centrais das Secretarias de Estado e Municípios:
     - **Secretaria de Estado da Saúde de SP (CNPJ `46.374.500/0001-94`):** responde por **969 processos** (817 contratos confirmados e 152 sinais de compra). No CNES, este CNPJ é a mantenedora de **202 hospitais e unidades de saúde**.
     - **Secretaria da Fazenda e Planejamento de SP (CNPJ `63.025.530/0001-04`):** responde por **649 contratos confirmados**.
     - **Secretaria Municipal de Saúde de SP (CNPJ `60.448.040/0001-22`):** responde por **6 contratos confirmados** e atua como mantenedora de 4 unidades.
     - **Prefeituras e Órgãos Municipais diversos:** respondem pelos demais processos.
   - De acordo com as regras canônicas de governança do Chame Inteligência, um CNPJ mantenedor que administra dezenas ou centenas de estabelecimentos é **cadastralmente ambíguo em nível de unidade individual**. Vincular um contrato geral da Secretaria de Saúde a um único hospital arbitrário configuraria **falsa atribuição factual**.
   - Por essa razão, os importadores oficiais (`importador-pncp.ts` e `importador-contratos-pncp.ts`) atribuíram rigorosamente `metodoVinculo: "SEM_VINCULO"` e `instituicaoId: null` a esses 2.014 registros, preservando a integridade canônica.

### 3.2. Verificações Específicas Realizadas
- **156 representa instituições distintas ou processos?** Nenhum dos dois no banco. O número 156 foi um valor estático preliminar no componente visual. No banco real, há **1 instituição distinta** com **4 processos vinculados**.
- **Sinais e contratos contados separadamente?** Sim. São 544 sinais de contratação e 1.474 contratos confirmados (total: 2.018 processos). Dos 4 vínculos institucionais exatos, todos os 4 são sinais de compra; 0 contratos possuem vínculo direto unívoco com unidade hospitalar isolada.
- **Há duplicidade por identificador PNCP?** Não. A auditoria confirmou exatamente 2.018 registros e 2.018 identificadores únicos (`identificadorPNCP` é chave única).
- **O vínculo usa CNPJ completo de 14 dígitos?** Sim. O importador higieniza caracteres não numéricos e completa à esquerda com zeros (`padStart(14, '0')`), exigindo correspondência exata de 14 dígitos.
- **Algum vínculo foi criado por nome, município ou aproximação?** Não. Todos os 4 vínculos existentes utilizam estritamente o método `CNPJ_MANTENEDORA` com confiança `MEDIA` para CNPJ unívoco. Nenhum vínculo foi ou pode ser criado por aproximação de nome.
- **Contratos e sinais compartilham o mesmo loteId?** Não. Sinais pertencem ao lote `LOTE_PNCP_20260906203034` e contratos ao lote `LOTE_PNCP_CONTRATOS_2026-09-06`.
- **Registros ambíguos estão marcados como SEM_VINCULO?** Sim. Todos os 2.014 registros de órgãos centrais e secretarias possuem `metodoVinculo = "SEM_VINCULO"` e `instituicaoId = null`.

### 3.3. Correção de Lógica e Rótulos Inequívocos
A lógica e a interface foram ajustadas para erradicar qualquer ambiguidade, adotando estritamente os rótulos exigidos:
- **“Instituições com vínculo exato”**: **1** instituição única (IAMSPE / Hospital do Servidor Público Estadual, CNES `2058502`), associada a 4 processos de mobilidade/saúde via CNPJ unívoco.
- **“Quantidade de sinais”**: **544** editais e dispensas de licitação ativas/concluídas no PNCP.
- **“Quantidade de contratos”**: **1.474** contratos confirmados e termos de empenho formalizados.
- **“Registros sem vínculo”**: **2.014** processos de compras da saúde visíveis e pesquisáveis no painel geral sem vínculo forçado.
- **“Registros ambíguos”**: **2.014** registros de órgãos centrais (SES-SP, SMS-SP, Secretaria da Fazenda e Prefeituras) que, por administrarem múltiplas unidades de saúde, são mantidos sem vinculação institucional direta para evitar falsas inferências de mercado.

---

## 4. Auditoria do Índice de Prioridade Comercial

A auditoria matemática e de integridade do Índice de Prioridade Hospitalar (versão canônica `1.0.0`) confirmou:
1. **Totalidade:** Todas as **8.212 instituições reais** possuem registro ativo em `IndicePrioridade`, 11 componentes decompostos em `ComponenteIndice` e uma ação em `AcaoComercial`.
2. **Intervalo Válido:** Todos os índices persistidos estão estritamente contidos no intervalo contínuo de **0 a 100**. Não há valores negativos, nulos ou superiores a 100.
3. **Soma de Pesos:** Os 11 critérios comerciais totalizam exatamente **peso 100**:
   - Operação 24 Horas: 20
   - Quantidade de Unidades / Porte em Rede: 15
   - Porte e Capacidade Instalada: 15
   - Perfil Privado Corporativo: 10
   - Dispersão Geográfica / Municípios: 10
   - Sinais de Expansão Recente: 5
   - Potencial de Deslocamento entre Unidades: 5
   - Potencial de Visitantes Externos: 5
   - Facilidade de Acesso ao Decisor: 5
   - Qualidade e Rastreabilidade das Evidências: 5
   - Presença de Sinais Públicos de Contratação: 5
   *(Soma total: 100)*.
4. **Soma dos Componentes:** Para todas as 8.212 instituições, a soma exata dos valores obtidos de cada componente (`valorObtido`) é rigorosamente idêntica ao valor total persistido do índice (`Math.abs(soma - total) === 0`).
5. **Versão Registrada:** A versão `1.0.0` está registrada e documentada em 100% dos registros de índice.
6. **Determinação e Consistência:** A pontuação é puramente determinística. Nenhuma instituição possui discrepância entre o índice exibido no nível institucional e o índice da respectiva `ContaComercial` (`diferencaContaComercial = 0`).
7. **Classificação em Faixas:** 100% das instituições estão categorizadas na faixa exata estipulada pelo motor:
   - **Muito Alta (≥ 80):** 16 instituições (0,2%)
   - **Alta (60 a 79):** 333 instituições (4,1%)
   - **Moderada (40 a 59):** 609 instituições (7,4%)
   - **Baixa (0 a 39):** 7.259 instituições (88,3%)
8. **Ausência de Fatos Fictícios:** Hipóteses de segmentação e de vínculo econômico são expressamente sinalizadas nos componentes do índice e na interface; nenhuma hipótese é convertida em fato canônico.

---

## 5. Auditoria das Telas e Experiência do Usuário

Todas as 7 rotas principais do sistema foram auditadas estruturalmente e visualmente:

1. **Visão Geral (`/`)**:
   - Indicadores globais em cards com dados reais (8.212 instituições reais, 5 demo, 349 contas prioritárias, 2.018 processos PNCP).
   - Tabela de Top Oportunidades com paginação ativa, seletor de itens por página (10, 15, 25, 50, 100), ordenação decrescente por índice e ausência de cortes artificiais (`slice(0, 10)` proibido).
   - Gráficos de distribuição por faixa, tipo de estabelecimento e segmentação comercial.
2. **Radar de Clientes (`/radar`)**:
   - Listagem completa paginada (50 itens/página) de todas as oportunidades.
   - Filtros combinados ativos: busca textual, município, tipo de estabelecimento, faixa de prioridade, segmento, vínculo, operação 24h, sinais de expansão e sinais PNCP.
   - Alternância de ordenação por prioridade (maior/menor).
3. **Contas Comerciais (`/contas`)**:
   - Exibição de 7.550 contas reais no modo real e 5 no modo demonstração.
   - Filtros por faixa comercial, natureza jurídica, tipo de vínculo e contatos públicos.
4. **Painel Geral de Contratações Públicas (`/contratacoes-publicas`)**:
   - 6 cards métricos com rótulos inequívocos: Total de Processos (2.018), Quantidade de Sinais (544), Quantidade de Contratos (1.474), Instituições com Vínculo Exato (1), Registros sem Vínculo (2.014) e Registros Ambíguos (2.014).
   - Aviso de governança contextualizado e filtros por categoria (sinais vs contratos), mobilidade, município e modalidade.
5. **Cobertura de Dados (`/cobertura`)**:
   - Matriz completa de fontes com 7 bases catalogadas.
   - Exibição da Receita Federal com status visual explícito de *"Pendente"* e 0 registros.
   - Exibição da BrasilAPI como *"Camada Auxiliar de Terceiros (Não Canônica)"*.
   - Rótulos inequívocos na barra de cobertura do PNCP (1 instituição com vínculo exato · 2.014 sem vínculo forçado).
6. **Detalhe da Instituição (`/instituicoes/[slug]`)**:
   - Cabeçalho com nome, porte, CNES oficial, badge de fato oficial e organização vinculada.
   - Seções integradas: Informações Cadastrais Auxiliares BrasilAPI, Operadora ANS, Contexto Territorial IBGE, Indicadores Setoriais de Trabalho MTE e Histórico de Contratações Públicas PNCP.
7. **Detalhe da Conta Comercial e Organização (`/contas/[id]` e `/organizacoes/[id]`)**:
   - Visão consolidada em nível de rede/mantenedora, listando as unidades hospitalares filiadas, contatos públicos B2B vinculados e justificativas determinísticas da classificação de vínculo.

### Responsividade e Layout
- **Mobile (Celular):** Header sticky compacto, barra de navegação com rolagem horizontal sem quebra de linha, tabelas com contêiner `overflow-x-auto` sem desconfiguração de colunas e botões operacionais com touch target superior a 44px.
- **Ultrawide (2560×1080):** Contêiner principal limitado com `max-w-[2560px]`, preservando proporção harmônica de grid sem expansão indesejada de textos nem botões inacessíveis.
- **Integridade de Visualização:** Nenhuma oportunidade comercial é oculta por limites estáticos arbitrários.

---

## 6. Governança, Rastreabilidade e Fontes Integradas

A ferramenta preserva com rigor a hierarquia canônica de dados:

1. **CNES / DataSUS (`FATO_OFICIAL`)**: Base canônica estrutural de 8.212 estabelecimentos de saúde em SP.
2. **PNCP (`FATO_PUBLICO`)**: 2.018 processos de compras públicas de saúde e mobilidade em SP (544 editais/dispensas e 1.474 contratos confirmados). Vínculos ocorrem estritamente por CNPJ unívoco de 14 dígitos.
3. **ANS / CADOP (`FATO_OFICIAL`)**: 1.113 operadoras de planos de saúde ativas. 31 hospitais com vínculo cadastral de operadora no CNES exibem dados de registro, modalidade e situação operacional.
4. **IBGE (`FATO_OFICIAL`)**: 5.571 municípios do território nacional integrados para contexto territorial, mesorregião e microrregião.
5. **MTE / Novo CAGED (`FATO_PUBLICO`)**: 4 registros agregados setoriais da saúde humana (CNAE 86 / Seção Q), sem qualquer dado de trabalhador individual.
6. **BrasilAPI (`DADO_TERCEIRO_NAO_CANONICO`)**: Camada auxiliar transparente com 2.996 registros de CNPJs prioritários. Nenhum dado de terceiro foi promovido a registro canônico da Receita Federal.
7. **Receita Federal do Brasil (`FATO_OFICIAL`)**: Mantida estritamente em **0 registros** com status **PENDENTE**. O Gate 4 permanece suspenso até restabelecimento da conectividade governamental oficial.

---

## 7. Suíte de Testes e Validação Obrigatória

A conformidade do código e dos dados foi validada por meio de execução automatizada completa:

| Comando | Resultado | Observações |
| :--- | :---: | :--- |
| `npm run lint` | **Passou (0 erros, 0 warnings)** | ESLint validado em 100% dos arquivos do projeto |
| `npm run typecheck` | **Passou (0 erros)** | TypeScript `tsc --noEmit` sem qualquer inconsistência de tipos |
| `npm test` | **Passou (25 suítes / 182 testes)** | 100% de aprovação no Vitest em tempo médio de 17s |
| `npm run build` | **Passou (0 erros)** | Next.js build com Turbopack concluído com todas as rotas estáticas/dinâmicas |
| `npm audit` | **Passou (0 vulnerabilidades)** | Dependências limpas sem alertas de segurança |
| `git diff --check` | **Passou (código limpo)** | Sem conflitos, espaços em branco espúrios ou quebras de formatação |

### Novo Teste Específico Criado:
- **`src/domain/pncp/divergencia-contagem-pncp.test.ts`**:
  - Testa e documenta formalmente a contagem de 2.018 processos (544 sinais + 1.474 contratos).
  - Confirma unicidade estrita de identificadores (zero duplicatas).
  - Comprova que exatamente 1 instituição hospitalar possui vínculo exato via CNPJ com 4 processos.
  - Comprova que os 2.014 processos de órgãos centrais (SES-SP, SMS-SP, Fazenda, etc.) permanecem como `SEM_VINCULO`.
  - Valida que a função de métricas de cobertura reflete os dados auditados com 100% de consistência.

---

## 8. Preservação do Banco de Dados e Limitações

- **Preservação de Dados:** Nenhuma instituição, unidade ou registro do banco foi apagado, alterado ou corrompido durante esta auditoria. A integridade referencial entre lotes, fontes, evidências, índices e instituições foi plenamente mantida.
- **Limitações Conhecidas:**
  - O Gate 4 da Receita Federal permanece pendente; a camada societária oficial em lote ainda não foi ingerida.
  - A quase totalidade das compras públicas de hospitais estaduais de SP é contratada pelo CNPJ central da Secretaria de Estado da Saúde de SP (e não pelo CNPJ filial do hospital), fazendo com que esses processos permaneçam no painel geral de compras sem vinculação direta a uma unidade específica.
  - Contatos corporativos disponíveis representam uma amostra prioritária validada de 123 perfis públicos; abordagens em massa requerem etapas subsequentes de qualificação humana.

---

## 9. Conclusão da Entrega e Próximos Passos

O **MVP Comercial do Chame Inteligência** está auditado, testado, estável e pronto para homologação e uso pela equipe comercial.

Recomenda-se para o commit final:
```bash
git add src/lib/cobertura.ts src/components/cobertura-client.tsx src/components/contratacoes-publicas-client.tsx src/domain/pncp/divergencia-contagem-pncp.test.ts docs/CONCLUSAO_MVP_COMERCIAL.md docs/AUDITORIA_FINAL_MVP_COMERCIAL.md
git commit -m "chore: conclui auditoria final do MVP comercial e resolve divergencia PNCP"
```
