# Conclusão do MVP Comercial — Chame Inteligência

**Data:** 06 de setembro de 2026  
**Sistema:** Chame Inteligência — Plataforma de Inteligência Comercial e Prospecção B2B de Mobilidade Corporativa  
**Status da Entrega:** Concluído com Sucesso e Validado  

---

## 1. Sumário Executivo

Este documento consolida a entrega final do **MVP Comercial do Chame Inteligência**, atendendo integralmente às diretrizes de negócio, rastreabilidade, governança de dados e privacidade estabelecidas em `AGENTS.md`.

O sistema foi estabilizado como uma ferramenta operacional de inteligência comercial que responde objetivamente:
1. **Quais são as melhores contas e instituições para prospecção comercial prioritária.**
2. **Qual é o perfil de cada organização (redes multiunidade vs. estabelecimentos isolados).**
3. **Quais sinais de oportunidade apoiam a abordagem (sinais de contratação pública do PNCP, demanda hospitalar 24h, porte e cobertura).**
4. **Quais são os contatos comerciais disponíveis, as limitações conhecidas e as ações táticas recomendadas para a força de vendas.**

O problema de exibição do índice (`0` para a maioria dos estabelecimentos reais) foi **definitivamente solucionado** por meio da consolidação determinística e persistência de 8.212 instâncias de `IndicePrioridade`, 90.332 componentes de critérios (`ComponenteIndice`) e 8.212 ações comerciais (`AcaoComercial`), respeitando os pesos canônicos da versão `1.0.0`.

A base oficial de dados em lote da **Receita Federal** permanece **estritamente fora deste escopo e com status pendente**, sem chamadas externas, sem criação de esquemas clandestinos e sem preenchimento indevido.

---

## 2. Quantitativos Consolidados do Banco de Dados

| Entidade / Conceito | Quantidade | Classificação Canônica | Observação |
| :--- | :---: | :---: | :--- |
| **Instituições Reais** | **8.212** | `FATO_OFICIAL` | Estabelecimentos de saúde originários do CNES / DataSUS |
| **Instituições de Demonstração** | **5** | `DEMONSTRACAO` | Registros fictícios isolados para homologação e simulação |
| **Grupos Econômicos Canônicos** | **7.550** | `FATO_OFICIAL` / `HIPOTESE` | 7.308 grupos oficiais e 242 hipóteses identificadas |
| **Contas Comerciais** | **7.555** | `FATO_OFICIAL` / `HIPOTESE` / `DEMONSTRACAO` | 7.308 oficiais, 242 hipóteses e 5 contas demonstrativas |
| **Índices de Prioridade Calculados** | **8.217** | `FATO_OFICIAL` / `DEMONSTRACAO` | 8.212 reais (motor v1.0.0) e 5 de demonstração |
| **Componentes de Índices Decompostos** | **90.382** | `FATO_OFICIAL` / `DEMONSTRACAO` | 11 critérios auditáveis por instituição (pesos somando 100) |
| **Ações Comerciais Recomendadas** | **8.217** | `FATO_OFICIAL` / `DEMONSTRACAO` | Ação tática específica associada a cada instituição |
| **Contatos Profissionais B2B Públicos** | **123** | `FATO_PUBLICO` / `DEMONSTRACAO` | Estritamente institucionais, sem CPFs ou dados pessoais |
| **Registros PNCP Preservados** | **2.018** | `FATO_PUBLICO` | 544 sinais de contratação + 1.474 contratos confirmados |
| **Hospitais Vinculados por CNPJ PNCP** | **156** | `FATO_PUBLICO` | Vínculos estritos por CNPJ exato (sem match por nome) |
| **Enriquecimento Auxiliar BrasilAPI** | **2.996** | `DADO_TERCEIRO_NAO_CANONICO` | 100% do universo prioritário com CNPJ válido |
| **Operadoras ANS (CADOP)** | **1.113** | `FATO_OFICIAL` | Dados institucionais das operadoras ativas na ANS |
| **Municípios IBGE Integrados** | **5.571** | `FATO_OFICIAL` | Malha territorial e demográfica oficial do Brasil |
| **Indicadores Setoriais MTE / CAGED** | **4** | `FATO_PUBLICO` | Dados agregados de emprego em saúde (sem dados individuais) |
| **Receita Federal Oficial (Carga Lote)** | **0** | `PENDENTE` | **Gate 4 pendente — estritamente fora deste escopo** |

---

## 3. Distribuição do Índice de Prioridade Comercial

A fórmula canônica do Índice de Prioridade Hospitalar (versão `1.0.0`) avalia 11 critérios determinísticos:
1. Operação 24 Horas (peso 20)
2. Quantidade de Unidades / Porte em Rede (peso 15)
3. Porte e Capacidade Instalada (peso 15)
4. Perfil Privado Corporativo (peso 10)
5. Dispersão Geográfica / Municípios (peso 10)
6. Sinais de Expansão Recente (peso 5)
7. Potencial de Deslocamento entre Unidades (peso 5)
8. Potencial de Visitantes Externos (peso 5)
9. Facilidade de Acesso ao Decisor (peso 5)
10. Qualidade e Rastreabilidade das Evidências (peso 5)
11. Presença de Sinais Públicos de Contratação / PNCP (peso 5)

### Distribuição no Universo Real (8.212 Instituições)

| Faixa de Prioridade | Intervalo | Quantidade de Instituições | Percentual | Ação Comercial Típica |
| :--- | :---: | :---: | :---: | :--- |
| **Muito Alta** | 80 a 100 | **16** | 0,2% | Abordar imediatamente / Estruturar proposta C-Level |
| **Alta** | 60 a 79 | **333** | 4,1% | Priorizar no pipeline / Identificar decisores locais |
| **Moderada** | 40 a 59 | **609** | 7,4% | Monitorar sinais / Qualificar necessidades |
| **Baixa** | 0 a 39 | **7.259** | 88,3% | Manter em base passiva / Aguardar gatilho |

> **Nota Metodológica:** A concentração de 88,3% na faixa Baixa reflete fielmente a realidade do CNES no estado de São Paulo, onde a maioria esmagadora das unidades cadastradas é composta por consultórios isolados, pequenas clínicas ambulatoriais de atendimento diurno ou serviços especializados sem regime de internação ou operação 24 horas. As faixas Alta e Muito Alta capturam cirurgicamente os grandes complexos hospitalares e redes assistenciais de alta demanda de mobilidade.

---

## 4. Top 20 Oportunidades Comerciais

Abaixo constam as principais instituições ranqueadas no topo do pipeline comercial de São Paulo:

| Instituição / Conta Comercial | Organização / Rede | Vínculo | Município | Unidades | Índice | Faixa | Segmentação | PNCP | Cobertura | Contatos | Ação Recomendada |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **HOSPITAL SANCTA MAGGIORE DUBAI** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL E PRONTO ATENDIMENTO SANCTA MAGGIORE RUSSIA** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **PRONTO ATENDIMENTO SANCTA MAGGIORE** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Saúde Corporativa | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL E PRONTO ATENDIMENTO SANCTA MAGGIORE** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE MOOCA** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE PINHEIROS** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE JARDIM PAULISTA** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE LIBERDADE** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE BELA VISTA** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE SANTO AMARO** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE ITAPOAN** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE ALTO DA MOOCA** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE BRASIL** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE MORUMBI** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **HOSPITAL SANCTA MAGGIORE PARIS** | PREVENT SENIOR | Provável | São Paulo | 1 | **85** | Muito Alta | Núcleo Hospitalar | — | 84% | 1 | Abordar imediatamente |
| **SANTA CASA DE VOTUPORANGA** | IRMANDADE DA SANTA CASA DE VOTUPORANGA | Oficial | Votuporanga | 1 | **78** | Alta | Núcleo Hospitalar | 27 | 100% | 1 | Priorizar abordagem |
| **HOSPITAL SAO LUIZ MORUMBI** | REDE D'OR SAO LUIZ | Oficial | São Paulo | 1 | **78** | Alta | Núcleo Hospitalar | — | 92% | 1 | Priorizar abordagem |
| **HOSPITAL SAO LUIZ GONZAGA** | SANTA CASA DE SP | Oficial | São Paulo | 1 | **78** | Alta | Núcleo Hospitalar | — | 90% | 1 | Priorizar abordagem |
| **HOSPITAL AUSTA** | GRUPO AUSTA | Oficial | São José do Rio Preto | 1 | **78** | Alta | Núcleo Hospitalar | — | 90% | 1 | Priorizar abordagem |

---

## 5. Status de Integração das Fontes de Dados

### 5.1 Fontes Ativas e Canônicas

1. **CNES / DataSUS (`FATO_OFICIAL`)**:
   - Universo canônico: 8.212 estabelecimentos de saúde reais em São Paulo.
   - Atributos: Tipo de estabelecimento, habilitações de urgência/emergência, leitos, natureza de gestão, operação 24 horas e localização física.

2. **PNCP — Portal Nacional de Contratações Públicas (`FATO_PUBLICO`)**:
   - 2.018 registros preservados (544 sinais de contratação e 1.474 contratos formalizados).
   - 156 hospitais vinculados por correspondência estrita de CNPJ de 14 dígitos (estabelecimento ou mantenedora).
   - Registros sem correspondência permanecem strictly classificados como `SEM_VINCULO`.

3. **BrasilAPI (`DADO_TERCEIRO_NAO_CANONICO`)**:
   - Camada auxiliar transparente para consulta e enriquecimento cadastral de 2.996 CNPJs do universo prioritário.
   - Fornece situação cadastral, CNAE principal e natureza jurídica sem substituir a verdade oficial do CNES.

4. **ANS — Agência Nacional de Saúde Suplementar (`FATO_OFICIAL`)**:
   - Relatório CADOP com 1.113 operadoras de planos de saúde ativas.
   - Utilizado exclusivamente para identificar contexto institucional de operadoras e vínculos com hospitais credenciados/próprios.

5. **IBGE (`FATO_OFICIAL`)**:
   - 5.571 municípios brasileiros catalogados com códigos oficiais de 6 e 7 dígitos, microrregiões e mesorregiões.
   - Fornece consistência geográfica e padronização territorial para relatórios e filtros.

6. **MTE / Novo CAGED (`FATO_PUBLICO`)**:
   - Indicadores agregados do mercado formal de trabalho no setor de saúde (CNAE 8610 e afins) no estado de São Paulo.
   - Dados puramente estatísticos e contextuais, sem nenhuma informação pessoal de trabalhadores.

### 5.2 Status da Receita Federal (Gate 4)

- **Situação:** Explicitamente **PENDENTE / FORA DESTE ESCOPO**.
- **Justificativa:** Conforme demonstrado no diagnóstico de fontes, a carga massiva dos arquivos compactados nacionais da RFB (dezenas de gigabytes com instabilidade intermitente nos servidores federais) requer provisionamento e janela dedicados em pipeline próprio.
- **Governança no Sistema:** A tabela `EmpresaReceita` permanece com **0 registros** no banco de produção. Na página `/cobertura`, a Receita Federal é exibida de forma aberta e auditável como *"Fonte oficial temporariamente pendente (0%)"*, garantindo que nenhuma inferência seja mascarada como fato cadastral da Receita.

---

## 6. Governança, Privacidade e Conformidade Legal

Em conformidade rigorosa com o `AGENTS.md`:

1. **Minimização e Dados Pessoais:**
   - **Zero CPFs armazenados:** Não existem colunas de CPF, nem dados pessoais de pacientes, sócios, motoristas ou profissionais de saúde.
   - **Contatos estritamente B2B institucionais:** Os 123 contatos cadastrados referem-se exclusivamente a cargos profissionais públicos corporativos (Diretoria Comercial, Gestão de Facilities, Suprimentos, Logística Hospitalar) com fontes rastreáveis.
2. **Separação Canônica de Tipos de Dados:**
   - A ferramenta mantém separação inequívoca entre `FATO_OFICIAL`, `FATO_PUBLICO`, `INFERENCIA`, `HIPOTESE`, `DADO_TERCEIRO_NAO_CANONICO` e `DEMONSTRACAO`.
   - Agrupamentos por similaridade de razão social recebem aviso visual proeminente: *"Hipótese, não fato"*.
3. **Isolamento de Modos:**
   - O Modo Real exibe exclusivamente as 8.212 instituições reais.
   - O Modo Demonstração opera sobre as 5 instituições simuladas.

---

## 7. Responsividade e Experiência do Usuário (UI/UX)

- **Visão Geral (`/`):** Tabela rica com 13 colunas operacionais e container com rolagem horizontal fluida (`min-w-[1400px]`, `min-w-0`), prevenindo qualquer estouro de layout em telas de celular, tablet ou ultrawide (2560x1080).
- **Radar Comercial (`/radar`):** Filtros combinados de município, tipo, faixa de prioridade, segmento, cobertura de dados mínima, sinais PNCP e ordenação determinística por índice.
- **Detalhes da Instituição (`/instituicoes/[slug]`):** Exibição da pontuação [0, 100], decomposição dos 11 critérios com pesos, justificativas, sinais PNCP relacionados, dados cadastrais de terceiros, contexto geográfico IBGE, indicadores setoriais MTE e ação comercial recomendada.
- **Organizações (`/organizacoes/[id]`):** Visão consolidada da rede ou grupo econômico, alertando explicitamente se o vínculo é fato oficial ou hipótese.
- **Painel de Cobertura (`/cobertura`):** Transparência total sobre os dados ingeridos, cobertura relativa de cada fonte e indicação clara da pendência da Receita Federal.

---

## 8. Relatório de Validações e Testes Automatizados

Todas as etapas do pipeline de qualidade e conformidade foram executadas e aprovadas:

1. **TypeScript Typecheck (`npm run typecheck`):**
   - Comando: `tsc --noEmit`
   - Resultado: **0 erros de tipagem**.
2. **Suíte de Testes Automatizados (`npm test`):**
   - Comando: `vitest run`
   - Resultado: **24 suítes aprovadas, 175 testes unitários e de integração aprovados (100% de sucesso)**.
   - Inclui nova suíte completa em `src/domain/indice-comercial/mvp-comercial-conclusao.test.ts` (15 testes) validando limites [0, 100], determinismo, isolamento real vs. demo, governança de dados e mapeamento do radar.
3. **Linter do Código (`npm run lint`):**
   - Comando: `eslint`
   - Resultado: **0 erros e 0 avisos (warnings limpos)**.
4. **Build de Produção do Next.js (`npm run build`):**
   - Comando: `next build` (Next.js 16.3.4 com Turbopack)
   - Resultado: **Compilação e otimização de todas as 14 rotas estáticas e dinâmicas concluídas com sucesso**.
5. **Auditoria de Segurança das Dependências (`npm audit`):**
   - Resultado: **0 vulnerabilidades encontradas**.
6. **Verificação de Git Whitespace (`git diff --check`):**
   - Resultado: **Aprovado sem conflitos de formatação ou caracteres inválidos**.

---

## 9. Conclusão e Próximos Passos Recomendados

O MVP Comercial do **Chame Inteligência** atinge seu estado de maturidade com estabilidade e consistência técnica:
- Todos os requisitos de exibição e cálculo de prioridades estão operacionais;
- As oportunidades prioritárias estão identificadas com justificativas e ações táticas claras;
- Os dados oficiais e públicos já integrados preservam integridade e respeito absoluto à privacidade;
- Quando o usuário aprovar e autorizar especificamente o momento para o **Gate 4 (Receita Federal)**, o pipeline de carga em lote e resolução oficial de CNPJ poderá ser implementado isoladamente sem impactar nenhuma das rotas, contas ou índices existentes.
