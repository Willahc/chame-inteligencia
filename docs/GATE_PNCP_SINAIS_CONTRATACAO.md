# GATE — Ingestão e Integração de Sinais de Contratação Pública (PNCP)

**Data de Conclusão:** 06/09/2026  
**Status:** Aprovado, Auditado e Integrado às Telas  
**Fonte Oficial:** Portal Nacional de Contratações Públicas (PNCP) — Governo Federal  
**Classificação Canônica:** `FATO_PUBLICO`  
**Nível de Confiança:** `ALTA`  
**Status de Revisão:** `APROVADA`  

---

## 1. Identificação e Metadados da Extração

- **Fonte Oficial:** Portal Nacional de Contratações Públicas (PNCP)
- **URL Base:** `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`
- **Data de Extração:** 06/09/2026
- **Arquivo de Origem:** `data/raw/pncp/consultas_pncp_sinais_contratacao.json`
- **Tamanho do Arquivo:** 581.853 bytes
- **Hash SHA-256 do Arquivo:** `FB63CFB0D2508A496AFE0227267AE4B9D865E13A36C6792783EFD905E8F8BE26`
- **Recorte Temporal:** Publicações entre `01/08/2026` e `06/09/2026`
- **Recorte Geográfico:** Estado de São Paulo (`uf=SP`)
- **Modalidades de Licitação Analisadas:** Pregão Eletrônico (código 6) e Dispensa de Licitação (código 8)

---

## 2. Métricas de Ingestão e Processamento

| Métrica | Quantidade | Observações |
| :--- | :---: | :--- |
| **Registros Totais Varridos na API** | 2.500 | 50 páginas de 50 itens consultadas |
| **Registros de Interesse no Lote Bruto** | 544 | Filtrados por termos de saúde, hospitalar e mobilidade |
| **Registros Aceitos na Ingestão** | 544 | 100% com identificador e objeto válidos |
| **Registros Rejeitados** | 0 | Nenhum registro corrompido ou sem chave primária |
| **Sinais de Saúde / Hospitalares** | 544 | Todos os 544 editais pertencem ao escopo da saúde pública estadual e municipal |
| **Sinais de Mobilidade / Transporte** | 175 | Editais com termos explícitos de locação de veículos com motorista, táxi, remoção e transporte sanitário de pacientes |
| **Órgãos Públicos Únicos (CNPJs)** | 181 | Secretarias de Saúde, prefeituras, autarquias e hospitais públicos |
| **Correspondências Exatas e Unívocas por CNPJ com CNES** | 4 | CNPJ de mantenedora ou estabelecimento sem ambiguidade |
| **Registros sem Correspondência Institucional Unívoca** | 540 | Inclui 152 mantenedoras compartilhadas, mantidas como `SEM_VINCULO` |

---

## 3. Tratamento de Limitações de Serialização e Governança

### 3.1. Defesa contra Formato Texto `@{campo=valor}`
- Durante a auditoria de consistência, constatou-se que potenciais serializações em formato texto de linguagens de script (como PowerShell `@{campo=valor}`) poderiam inviabilizar a integridade dos dados estruturados.
- O validador canônico (`src/domain/pncp/validador-pncp.ts`) implementa checagem de tipos defensiva:
  - Se `orgao` ou `unidade` forem strings ou contiverem `@{`, o sistema **NÃO** tenta realizar extrações heurísticas nem inventar campos. Os campos estruturados correspondentes são atribuídos como `null`.
  - No lote auditado, todos os 544 registros apresentaram objetos JSON legítimos com CNPJ e razão social válidos.

### 3.2. Proibição de Vínculo por Similaridade de Nome
- Em estrito respeito às diretrizes do projeto, **nenhum vínculo institucional foi inferido por similaridade fonética ou de texto**.
- Os 4 vínculos restantes foram confirmados exclusivamente por igualdade exata e unívoca do CNPJ de 14 dígitos com a base bruta do CNES, registrando `metodoVinculo = "CNPJ_MANTENEDORA"` e `confiancaVinculo = "MEDIA"`.
- Outros 152 sinais tinham CNPJ de mantenedora compartilhado por várias unidades. Eles foram preservados como `SEM_VINCULO` para evitar escolher arbitrariamente uma instituição.
- As outras 8.208 instituições reais permanecem sem vínculo direto; nenhum vínculo foi criado por similaridade de nome.
- Os 540 editais sem correspondência institucional unívoca permanecem auditáveis e classificados com `metodoVinculo = "SEM_VINCULO"` e `instituicaoId = null`.

---

## 4. Política de Idempotência e Comprovação Técnica

A ingestão foi implementada em `src/ingestao/pncp/importador-pncp.ts` e orquestrada pelo script executável `scripts/importar-pncp-local.ts`.

A idempotência foi testada em duas execuções consecutivas:
1. **Primeira Execução:**
   - 544 registros lidos;
   - 544 registros aceitos;
   - 544 novos registros inseridos na tabela `SinalContratacaoPublica`;
   - 0 atualizados, 0 inalterados.
2. **Segunda Execução:**
   - 544 registros lidos;
   - 544 registros aceitos;
   - 0 novos registros inseridos;
   - 0 atualizados;
   - **544 registros inalterados por idempotência estrita** baseada no hash determinístico SHA-256 do payload bruto original.

### 4.1. Correções de governança após auditoria

- CNPJs agora passam por validação de dígitos verificadores antes de qualquer vínculo.
- Datas de publicação ausentes ou inválidas são rejeitadas; o sistema não usa a data atual como substituta.
- CNPJs de mantenedoras compartilhados por várias instituições não são associados arbitrariamente à primeira unidade. No lote atual, 152 sinais ambíguos permanecem `SEM_VINCULO`; somente 4 vínculos unívocos são exibidos.
- Em reexecuções idempotentes, os sinais inalterados são associados ao lote mais recente para manter a rastreabilidade do processamento atual.

---

## 5. Impacto no Banco de Dados e Preservação Canônica

A adição da entidade `SinalContratacaoPublica` foi puramente aditiva:
- **`Instituicao`:** 8.212 instituições reais mantidas (`FATO_OFICIAL`) e 5 demonstrações isoladas. Nenhuma instituição foi apagada, atualizada ou reclassificada.
- **`GrupoEconomico`:** 7.550 grupos reais (7.308 `FATO_OFICIAL` + 242 `HIPOTESE`) e 1 grupo demonstrativo intactos (agrupamento 1.0.0 preservado).
- **`ContaComercial`:** 7.550 contas reais e 5 demonstrações mantidas (segmentação 2.1.0 preservada).
- **`ContatoProfissional`:** 109 contatos públicos reais ativos e 14 contatos demonstrativos inalterados. Nenhum contato foi extraído ou inferido do PNCP.
- **Tabelas do Gate 4:** `EmpresaReceita` e `ResolucaoCNPJ` permanecem com 0 registros.

---

## 6. Integração com Telas Comerciais e Salvaguardas de Governança

Os sinais de contratação pública foram integrados a todas as camadas da aplicação como **evidências de contexto**, sem alterar regras de negócio ou inventar oportunidades.

### 6.1. Detalhe da Instituição (`/instituicoes/[slug]`)
- Exibição do componente `<SecaoContratacoesRelacionadas />` com editais vinculados estritamente por CNPJ exato.
- Banner de governança obrigatório:
  > *"Aviso de Governança: Sinal público observado; não representa contrato confirmado, cliente da Chame Táxi ou oportunidade garantida. O vínculo foi estabelecido exclusivamente por igualdade exata de CNPJ oficial."*
- Exibição de objeto, órgão, data, modalidade, valor estimado formatado, distintivo de mobilidade e link oficial para o portal PNCP.

### 6.2. Detalhe da Organização (`/organizacoes/[id]`)
- Consolidação e desduplicação dos sinais de todas as unidades pertencentes à organização.
- Renderização via `<SecaoContratacoesRelacionadas />` com as mesmas salvaguardas de rastreabilidade e governança.

### 6.3. Dossiê da Conta Comercial (`/contas/[id]`)
- Seção dedicada `Sinais de Contratação Pública — PNCP`.
- Destaque quantitativo:
  - Total de processos vinculados por CNPJ oficial;
  - Total de processos com sinal de mobilidade / transporte corporativo;
  - Data de publicação do processo mais recente;
  - Lista resumo com os 3 processos mais recentes e link para visualizar todos no painel geral.
- **Salvaguarda Crítica de Governança:** O painel enfatiza textualmente que os sinais do PNCP são evidências contextuais e **NÃO** alteram o `indicePrioridadeComercial`, a `faixaPrioridadeComercial`, a `acaoRecomendada` ou o `resultadoAbordagem`.

### 6.4. Visão Geral (`/`) e Radar Comercial (`/radar`)
- **Visão Geral:** Indicador adicionado ao painel principal: *"Sinais PNCP vinculados: vínculo oficial por CNPJ"*.
- **Radar Comercial:**
  - 4 filtros adicionais implementados:
    1. `possuiSinalPNCP`: filtra apenas estabelecimentos com editais vinculados;
    2. `possuiSinalMobilidadePNCP`: filtra editais com escopo de transporte/mobilidade;
    3. `contratacaoPublicaRecente`: filtra editais com publicação recente (últimos 3 meses);
    4. `somenteVinculoPNCPExato`: filtra correspondências estritas de CNPJ.
  - **Neutralidade Absoluta:** Quando nenhum dos filtros PNCP está ativado, a lista e a ordenação do radar comportam-se exatamente como antes, sem qualquer efeito colateral.
  - **Tabela:** Tags visuais compactas `PNCP (N)` e `Mobilidade` exibidas ao lado do tipo de dado da instituição.

### 6.5. Painel Geral de Contratações (`/contratacoes-publicas`)
- Rota acessível no menu de navegação global para exploração de todos os 544 sinais do lote, com abas para "Todos", "Mobilidade" e "Vinculados CNES".

---

## 7. Validação e Qualidade Técnica

A validação automatizada foi executada no ambiente local com aprovação integral:

1. **Lint (`npm run lint`):** Zero erros e zero advertências.
2. **Typecheck (`npm run typecheck`):** Zero inconsistências TypeScript.
3. **Testes Unitários e Integração (`npm test`):** 20 arquivos de teste, **133 testes aprovados** (100% de sucesso).
4. **Build de Produção (`npm run build`):** Compilação estática e server components concluída com sucesso.
5. **Auditoria de Dependências (`npm audit`):** Zero vulnerabilidades.
