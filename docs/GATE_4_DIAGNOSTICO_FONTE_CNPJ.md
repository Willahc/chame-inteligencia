# Gate 4 — Diagnóstico da Fonte Oficial de CNPJ (Receita Federal)

**Data do diagnóstico:** 06/09/2026 (Atualizado às 18:05 BRT / 21:05 UTC)  
**Status do Gate:** Ingestão autorizada, mas bloqueada por indisponibilidade técnica do transporte oficial  
**Declaração formal:** `GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL`  
**Governança:** Nenhuma fonte de terceiros, agregador privado ou base clandestina foi consultada. O banco de dados canônico permanece 100% íntegro e inalterado.

---

## 1. Declaração Formal e Resumo Executivo

```text
================================================================================
GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL
Motivo: Os servidores oficiais de arquivos abertos da RFB (dadosabertos.rfb.gov.br)
        permanecem inoperantes/inacessíveis por timeout de rede (ETIMEDOUT > 6s).
        Os canais autenticados SERPRO+ (arquivos.receitafederal.gov.br) retornam
        HTTP 401 Unauthorized.
Governança: Nenhuma fonte alternativa, API privada, espelho comercial ou clone
            de terceiros foi utilizado como fato canônico.
            Zero alterações realizadas no banco de dados canônico.
================================================================================
```

O objetivo de enriquecer os **2.996 CNPJs únicos válidos** (pertencentes a **2.451 CNPJs básicos**) do universo prioritário foi submetido à ordem rigorosa de tentativas prevista na governança do projeto, conforme detalhado a seguir.

---

## 2. Avaliação Sequencial das Opções de Obtenção

### Opção 1 — Catálogo Oficial pelo Gov.br
Foram consultados os portais e catálogos oficiais do Governo Federal:
1. `https://www.gov.br/receitafederal/dados`:
   - Resposta: **HTTP 200 OK** (118 ms, 89.648 bytes).
   - Análise: Página institucional em Plone CMS listando portarias (Portaria 319/2023), fundos municipais (FDCA/FDI) e relatórios aduaneiros (OEA). Não disponibiliza arquivos cadastrais de CNPJ em lote nem APIs diretas.
2. `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf`:
   - Resposta: **HTTP 200 OK** (134 ms, 59.315 bytes).
   - Arquivo baixado e armazenado em `data/raw/receita/cnpj-metadados.pdf`.
   - **SHA-256:** `0A52D6BDFB61CD60BC3543A758410EEB515FD8EBFEC8FC107A07E20E3E8531BD`.
   - Conteúdo: Dicionário oficial de campos dos arquivos de Empresas (7 campos), Estabelecimentos (30 campos), Sócios (11 campos) e tabelas de domínio. Confirma que o layout oficial é delimitado por ponto e vírgula (`;`) com codificação Latin1.
3. `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros`:
   - Resposta: **HTTP 200 OK** (907 ms, 180.390 bytes).
   - Redireciona o usuário para o catálogo geral `dados.gov.br`.
4. `https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj`:
   - Resposta: **HTTP 200 OK** (42 ms, 9.632 bytes no container SPA).
   - Análise: A página web carrega uma interface SPA. As chamadas de API automatizadas (`/api/publico/conjuntos-dados/...`) retornam **HTTP 401 Unauthorized**. Todos os links de download catalogados apontam exclusivamente para o host externo `https://dadosabertos.rfb.gov.br/CNPJ/`.
- **Resultado da Opção 1:** Não existem arquivos pequenos ou consultas seletivas em lote disponíveis no catálogo. Todos os apontamentos conduzem à base massiva em `dadosabertos.rfb.gov.br`.

---

### Opção 2 — Download Oficial Direto com Retomada
Foi avaliada a viabilidade técnica e o estado de conectividade direta com o repositório oficial de download:
- **Endpoints testados com timeout e verificação de cabeçalhos:**
  - `https://dadosabertos.rfb.gov.br/` -> **FALHA (Timeout ETIMEDOUT > 6s)**
  - `https://dadosabertos.rfb.gov.br/CNPJ/` -> **FALHA (Timeout ETIMEDOUT > 6s)**
  - `https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/` -> **FALHA (Timeout ETIMEDOUT > 6s)**
  - `https://dadosabertos.rfb.gov.br/CNPJ/Empresas0.zip` -> **FALHA (Timeout ETIMEDOUT > 6s)**
  - `https://dadosabertos.rfb.gov.br/CNPJ/Estabelecimentos0.zip` -> **FALHA (Timeout ETIMEDOUT > 6s)**

- **Diagnóstico de Recursos e Capacidade Local:**
  - **Espaço em disco local disponível:** **156,57 GB livres** (Total: 952,87 GB).
  - **Partições estritamente necessárias:**
    - `Empresas0.zip` a `Empresas9.zip` (10 arquivos): ~2,5 a ~3,0 GB compactados (~8 a ~10 GB descompactados).
    - `Estabelecimentos0.zip` a `Estabelecimentos9.zip` (10 arquivos): ~12 a ~15 GB compactados (~35 a ~40 GB descompactados).
  - **Bases expressamente excluídas do escopo:**
    - `Socios0.zip` a `Socios9.zip` (proibido por privacidade/LGPD; não ingere QSA nem CPF).
    - Tabelas auxiliares dispensáveis (`Cnaes.zip`, `Municipios.zip`, `Naturezas.zip`) cujo domínio já é normalizado internamente.
  - **Tempo estimado de download:** ~25 a 35 minutos em conexão de 10 MB/s para ~15-18 GB compactados.
  - **Espaço local:** Plenamente suficiente (156,57 GB livres atendem aos ~55 GB totais necessários para arquivo bruto + descompactação + índice temporário).
- **Resultado da Opção 2:** Apesar de haver espaço e capacidade técnica local, o servidor oficial da RFB está inoperante (descarte de pacotes em nível de rede/firewall do SERPRO). Impossível iniciar download direto com retomada.

---

### Opção 3 — Reexecução Controlada e Estratégia de Partição
Foi realizada nova bateria de testes controlados em horário alternativo (2026-09-06T21:03Z / 18:03 BRT), com tentativa única por endpoint, sem loops, sem Playwright e sem credenciais privadas:

| Endpoint Oficial | Método | Horário (UTC) | Status HTTP | Duração | Erro / Diagnóstico |
|---|---|:---:|:---:|---:|---|
| `https://dadosabertos.rfb.gov.br/` | GET | 21:03:32Z | *Nenhum* | 6.029 ms | Timeout de rede (`ETIMEDOUT > 6s`) |
| `https://dadosabertos.rfb.gov.br/CNPJ/` | GET | 21:03:38Z | *Nenhum* | 6.014 ms | Timeout de rede (`ETIMEDOUT > 6s`) |
| `https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/` | GET | 21:03:44Z | *Nenhum* | 6.015 ms | Timeout de rede (`ETIMEDOUT > 6s`) |
| `https://dadosabertos.rfb.gov.br/CNPJ/Empresas0.zip` | HEAD | 21:03:50Z | *Nenhum* | 6.024 ms | Timeout de rede (`ETIMEDOUT > 6s`) |
| `https://dadosabertos.rfb.gov.br/CNPJ/Estabelecimentos0.zip` | HEAD | 21:03:56Z | *Nenhum* | 6.020 ms | Timeout de rede (`ETIMEDOUT > 6s`) |
| `https://arquivos.receitafederal.gov.br/public.php/webdav/...` | GET | 21:04:14Z | **401** | 167 ms | HTTP 401 Unauthorized (Repositório corporativo restrito) |

- **Resultado da Opção 3:** Servidor oficial permanece indisponível. Conforme a regra do projeto:
  1. Não foram inventados dados.
  2. Não foram utilizados espelhos não autorizados.
  3. Não foi feito download cego.
  4. O pipeline seletivo em streaming permanece testado e pronto em `src/ingestao/receita/importador-receita.ts`.
  5. O Gate é declarado formalmente como `GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL`.

---

### Opção 4 — Fonte de Terceiros (Somente com Autorização Separada)
**ESTADO:** **NÃO EXECUTADA** (Nenhum serviço externo foi consultado).

Como as três opções oficiais falharam por indisponibilidade técnica da infraestrutura governamental, registra-se o diagnóstico técnico e as regras de governança para uma eventual autorização futura de camada auxiliar (ex.: BrasilAPI ou Casa dos Dados):
- **Finalidade:** Obter unicamente os dados cadastrais públicos das pessoas jurídicas já identificadas no CNES para os 2.996 CNPJs prioritários.
- **Classificação Canônica Obrigatória:** Qualquer dado obtido por essas fontes **NUNCA** poderá ser classificado como `FATO_OFICIAL`. Deverá receber obrigatoriamente a classificação:
  ```text
  tipoDado = "DADO_TERCEIRO_NAO_CANONICO"
  ```
- **Regras Invioláveis dessa Camada:**
  1. **Nunca substituir a Receita Federal:** Os dados de terceiros figuram apenas como enriquecimento suplementar temporário e auditado.
  2. **Nunca alterar `FATO_OFICIAL`:** O cadastro de instituições, unidades e grupos do CNES não sofre alterações de fatos oficiais.
  3. **Nunca promover automaticamente vínculo institucional:** Relações de mantenedora ou grupos econômicos continuam restritas às regras canônicas do CNES e de agrupamento 1.0.0.
  4. **Nunca alimentar o índice de prioridade sem revisão:** Dados de terceiros não alteram faixas do IPH ou do IPC sem homologação humana explícita.
  5. **Rastreabilidade completa:** Registro individual de URL da fonte, data da coleta, licença declarada, confiança (`MEDIA` ou `BAIXA`) e status de revisão (`PENDENTE_REVISAO`).
  6. **Segregação física e lógica:** Os registros de terceiros devem residir em entidade própria ou campos segregados, sem misturar com a resolução oficial do CNPJ.
  7. **Privacidade estrita:** Proibição absoluta de captura de CPF, sócios, administradores ou contatos pessoais (apenas contatos corporativos e institucionais públicos).

---

## 3. Universo Candidato Prioritário

O levantamento dos estabelecimentos candidatos foi consolidado na base canônica ([`prisma/dev.db`](file:///C:/Users/kbadmin/Documents/Projetos/Chame%20T%C3%A1xi/chame-inteligencia/prisma/dev.db)), lendo o campo `NU_CNPJ` dos registros aceitos do CNES (`RegistroBrutoCNES`):

| Recorte de Negócio | Unidades Analisadas | Com CNPJ Válido | Com CNPJ Inválido | Sem CNPJ (Ausentes) | CNPJs Únicos Válidos | CNPJs Básicos Válidos (8 dígitos) |
|---|---:|---:|---:|---:|---:|---:|
| **1. Núcleo Hospitalar Privado** | 334 | 323 (96,7%) | 0 | 11 (3,3%) | **322** | **216** |
| *• Redes privadas no Núcleo Hospitalar* | 220 | 218 (99,1%) | 0 | 2 (0,9%) | **217** | **41** |
| *• Isolados privados do Núcleo Hospitalar* | 203 | 193 (95,1%) | 0 | 10 (4,9%) | **193** | **183** |
| **2. Organizações Privadas Multiunidade (Geral)** | 793 | 777 (98,0%) | 0 | 16 (2,0%) | **762** | **262** |
| **3. Saúde Corporativa Expandida Privada** | 2.399 | 2.325 (96,9%) | 0 | 74 (3,1%) | **2.323** | **2.127** |
| **4. Universo Prioritário Unificado (Total Deduplicado)** | **3.104** | **3.011 (97,0%)** | **0 (0,0%)** | **93 (3,0%)** | **2.996** | **2.451** |

### Cobertura e Diagnóstico de Ausências
- **Validade matemática:** 100% dos 3.011 CNPJs presentes no CNES foram matematicamente validados por algoritmo de módulo 11 (zero CNPJs inválidos).
- **Ausências no CNES:** 93 unidades de saúde cadastradas não possuem CNPJ preenchido na base bruta do CNES (são mantidas documentadas como `NAO_RESOLVIDO` com método `CNPJ_AUSENTE_NO_CNES`).

---

## 4. Testes Automatizados e Garantias de Governança

Foi adicionada e validada uma suíte abrangente de testes (`src/domain/receita/receita-regras-governanca.test.ts` e suítes correlatas), totalizando **141 testes automatizados** no projeto:
- **Dígitos verificadores e CNPJ:** Testes para cálculo oficial do módulo 11 (D1 e D2), rejeição de sequências repetidas e tamanhos divergentes.
- **Tipos de Resolução:** Testes unitários para `EXATO_CNPJ`, `MATRIZ_FILIAL`, `MESMO_CNPJ_BASICO`, `CONFLITO` e `NAO_RESOLVIDO`.
- **Situação Cadastral:** Testes para preservação dos códigos oficiais da RFB (01=Nula, 02=Ativa, 03=Suspensa, 04=Inapta, 08=Baixada).
- **Fonte, Lote e Hash:** Rastreamento obrigatório de SHA-256 e proveniência `FATO_OFICIAL`.
- **Idempotência:** Validação de dupla execução com fixtures sem gerar duplicidades nem divergências.
- **Proteção de Privacidade (LGPD):** Validação estrita de que o parser e os modelos **não contêm** campos de CPF, QSA, sócios, administradores ou dados pessoais.
- **Preservação de Negócio:** Garantia de que a resolução da Receita não altera o Agrupamento 1.0.0, não perde instituições do CNES e não modifica os parâmetros da Segmentação Comercial 2.1.0.

---

## 5. Decisão Final do Gate

**GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL**

O sistema encontra-se 100% preparado tecnicamente para realizar a ingestão no momento em que a Receita Federal restabelecer a conectividade de seu servidor de dados abertos (`dadosabertos.rfb.gov.br`). Nenhuma alteração foi realizada no banco de dados e nenhum dado de terceiros foi ingerido sem aprovação formal.

