# Gate 4 — Camada Auxiliar de Enriquecimento por Fontes de Terceiros

**Data do relatório:** 06/09/2026  
**Status da execução:** Concluída com 100% de sucesso  
**Classificação canônica:** `DADO_TERCEIRO_NAO_CANONICO`  
**Governança:** Dados estritamente auxiliares e transitórios. Nenhum dado oficial da Receita Federal ou do CNES foi substituído. Nenhum dado pessoal (CPF, sócios, administradores, e-mails, telefones) foi ingerido.

---

## 1. Contexto e Autorização

Em razão da indisponibilidade técnica persistente do transporte oficial da Receita Federal (`dadosabertos.rfb.gov.br` em timeout de rede e WebDAV restrito com HTTP 401), o usuário autorizou expressamente a execução de uma **camada auxiliar de fontes de terceiros** para enriquecimento dos **2.996 CNPJs únicos válidos** do universo prioritário.

A ordem obrigatória de avaliação e tentativas foi:
1. **BrasilAPI:** Provedor primário autorizado.
2. **Casa dos Dados:** Avaliado apenas caso houvesse bloqueio ou cobertura insuficiente da BrasilAPI.

---

## 2. Avaliação dos Provedores

### 2.1. BrasilAPI (Provedor Utilizado)
- **URL Base:** `https://brasilapi.com.br/api/cnpj/v1/{CNPJ}`
- **Condições de Uso:** API pública e comunitária sob licença MIT/Open Source, sem necessidade de credenciais privadas ou tokens no código.
- **Teste Prévio de Conectividade (3 CNPJs):**
  - CNPJ `60970371000128` (Hospital Einstein): HTTP 200 OK (66 ms).
  - CNPJ `60747318000162` (IAMSPE): HTTP 200 OK (411 ms).
  - CNPJ `43202472000130` (Unimed Paulistana): HTTP 200 OK (397 ms).
- **Piloto Inicial Controlado (10 CNPJs):**
  - **10 de 10 resolvidos com sucesso (100% de taxa de sucesso)** em 5,99s (~380 ms/requisição).
- **Lote Completo (2.996 CNPJs):**
  - Executado via worker pool com concorrência calibrada e backoff dinâmico de 8 segundos em eventuais códigos HTTP 429 (Rate Limit).
  - **Total de CNPJs no escopo prioritário:** 2.996.
  - **Resolvidos com sucesso (HTTP 200):** **2.996 (100,0% de cobertura)**.
  - **Não encontrados (HTTP 404):** 0.
  - **Erros não recuperáveis:** 0.

### 2.2. Casa dos Dados (Avaliação Técnica)
- **Status:** **Descartada / Bloqueada.**
- **Motivo:** Casa dos Dados não oferece API pública e gratuita aberta sem autenticação. Exige aquisição de planos comerciais, chave de API privada paga e o portal web possui proteção contra automação (Cloudflare). Em cumprimento estrito às regras do projeto (proibição de cadastrar tokens pagos ou solicitar segredos), nenhuma chamada foi feita à Casa dos Dados, uma vez que a BrasilAPI atingiu 100% de sucesso.

---

## 3. Modelo de Dados e Segregação Lógica

Para assegurar que dados de terceiros jamais se misturem com fatos oficiais da Receita Federal ou do CNES, foi criada no Prisma uma entidade completamente separada:

```prisma
model EnriquecimentoCNPJTerceiro {
  id                  String         @id @default(cuid())
  cnpj                String         @unique
  provedor            String         // "BRASIL_API"
  razaoSocial         String?
  nomeFantasia        String?
  situacaoCadastral   String?
  dataSituacao        DateTime?
  dataInicioAtividade DateTime?
  cnaePrincipal       String?
  naturezaJuridica    String?
  porte               String?
  capitalSocial       Float?
  municipio           String?
  uf                  String?
  matrizFilial        String?        // "MATRIZ" ou "FILIAL"
  fonteUrl            String
  dataConsulta        DateTime       @default(now())
  dataReferencia      DateTime?
  hashResposta        String
  tipoDado            TipoDado       @default(DADO_TERCEIRO_NAO_CANONICO)
  confianca           NivelConfianca @default(MEDIA)
  statusRevisao       StatusRevisao  @default(PENDENTE)
  criadoEm            DateTime       @default(now())
  atualizadoEm        DateTime       @updatedAt

  @@index([cnpj])
  @@index([provedor])
  @@index([tipoDado, confianca])
  @@index([uf, municipio])
}
```

### Regras de Governança e Segregação:
- **`EmpresaReceita`:** Permanece com **0 registros** (preservada para quando a Receita Federal estiver disponível).
- **`ResolucaoCNPJ`:** Permanece com **0 registros** (resoluções oficiais não foram geradas por fontes terceiras).
- **`Instituicao` e `GrupoEconomico`:** Mantiveram inalteradas todas as suas 8.212 instituições reais (`FATO_OFICIAL`) e regras de agrupamento 1.0.0.
- **`IndicePrioridade` (IPH) e `ContaComercial` (IPC):** Nenhuma fórmula, componente ou faixa foi modificado.

---

## 4. Minimização de Dados e Conformidade com a LGPD

A resposta bruta da BrasilAPI foi submetida a um filtro rigoroso de sanitização antes de qualquer persistência:

### Campos Corporativos Aproveitados:
- CNPJ completo (14 dígitos desformatados);
- Razão Social / Nome Empresarial;
- Nome Fantasia;
- Situação Cadastral (ex.: `ATIVA`, `BAIXADA`);
- Data da Situação Cadastral;
- Data de Início de Atividade;
- CNAE Principal (código e descrição);
- Natureza Jurídica;
- Porte Empresarial (ex.: `DEMAIS`, `MICRO EMPRESA`);
- Capital Social;
- Município e UF;
- Identificador Matriz / Filial (`MATRIZ` ou `FILIAL`).

### Campos Pessoais Descartados e Proibidos:
- **`qsa` (Quadro de Sócios e Administradores):** Descartado integralmente (nomes de sócios, percentuais societários, qualificações);
- **CPF:** Nenhum CPF foi extraído, processado ou gravado no banco;
- **Telefones (`ddd_telefone_1`, `ddd_telefone_2`, `ddd_fax`):** Descartados;
- **E-mails (`email`):** Descartados;
- **Endereços residenciais / dados de representantes:** Descartados.

---

## 5. Rastreabilidade, Checkpoint e Idempotência

1. **Checkpoint:**
   - Arquivo: `data/raw/receita/checkpoint_cnpj_terceiro.json`.
   - Registra o status individual de cada um dos 2.996 CNPJs, timestamp da consulta e metadados básicos.
   - Permite retomada transparente sem repetição de requisições.
2. **Hash Criptográfico:**
   - Cada registro possui um hash SHA-256 (`hashResposta`) gerado determinística e exclusivamente sobre os atributos cadastrais corporativos sanitizados.
3. **Idempotência Comprovada:**
   - Execuções consecutivas do comando `npm run cnpj:terceiro` detectam os 2.996 CNPJs já concluídos no checkpoint e no banco de dados.
   - Resultado da segunda execução: **0 novas linhas, 0 duplicidades, 0 alterações nos hashes existentes**.

---

## 6. Interface de Usuário

Foi criado o componente dedicado [`SecaoDadosCadastraisTerceiros`](file:///C:/Users/kbadmin/Documents/Projetos/Chame%20T%C3%A1xi/chame-inteligencia/src/components/secao-dados-cadastrais-terceiros.tsx), integrado às telas:
- **Detalhe da Instituição:** [`src/app/instituicoes/[slug]/page.tsx`](file:///C:/Users/kbadmin/Documents/Projetos/Chame%20T%C3%A1xi/chame-inteligencia/src/app/instituicoes/[slug]/page.tsx).
- **Detalhe da Conta Comercial:** [`src/app/contas/[id]/page.tsx`](file:///C:/Users/kbadmin/Documents/Projetos/Chame%20T%C3%A1xi/chame-inteligencia/src/app/contas/[id]/page.tsx).

### Características da Exibição:
- **Alerta explícito:** *“Fonte auxiliar de terceiros — não substitui a Receita Federal. Estes dados cadastrais foram obtidos via BRASIL_API como suporte transitório e não alteram o cadastro oficial do CNES nem o Índice de Prioridade Comercial.”*
- **Badge visível:** `DADO TERCEIRO NÃO CANÔNICO` em destaque âmbar.
- **Totalmente segregado** das seções de Evidências Oficiais, Contratos do PNCP e Contatos Profissionais.
