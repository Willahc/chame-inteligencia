# Gate 4 — Enriquecimento oficial de CNPJ / Receita Federal

Data da atualização: 06/09/2026 (13:23 BRT / 16:23 UTC)

## Situação do Gate

**GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL**
*(Pipeline de ingestão estruturado, testado e pronto para execução offline/local assim que a fonte oficial for restabelecida)*

A autorização para tentar o download da base oficial foi concedida em 06/09/2026. Foram realizadas tentativas controladas de conexão e download exclusivamente nos endpoints governamentais oficiais (`npm run receita:diagnostico`). O repositório oficial de download (`dadosabertos.rfb.gov.br`) permanece inacessível por timeout de rede (`ETIMEDOUT` após 5s) e o repositório alternativo (`arquivos.receitafederal.gov.br`) responde `401 Unauthorized` exigindo credenciais privadas do SERPRO+. Em estrito cumprimento à governança do projeto, nenhum espelho de terceiros, agregador comercial (Minha Receita, BrasilAPI, CNPJ.ws), scraping com Playwright, bypass de CAPTCHA ou clone comunitário foi utilizado. Nenhum dado real foi alterado no banco de dados de produção.

O pipeline de importação seguro em streaming, o modelo de dados canônico de proveniência e o contrato determinístico de resolução permanecem construídos e validados com testes unitários e de integração utilizando fixtures demonstrativas dedicadas.

---

## 1. Resultado da Conectividade Oficial

Executada verificação controlada e pontual de conectividade (sem repetição em loop e sem tentativa de bypass):

| Endpoint Oficial | Protocolo / Método | Resultado Técnico | Diagnóstico |
|---|---|---|---|
| `https://dadosabertos.rfb.gov.br/CNPJ/` | HTTPS (443) GET | **BLOQUEADO (Timeout 5s / `ETIMEDOUT`)** | Host oficial da RFB/Serpro (`200.152.38.155`) inoperante / descartando pacotes. |
| `https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ/` | HTTPS (443) WebDAV GET | **BLOQUEADO (`HTTP 401 Unauthorized`)** | Repositório corporativo SERPRO+ restrito que requer autenticação privada. |
| `https://dados.gov.br/api/publico/conjuntos-dados/visualizar/...` | HTTPS (443) JSON GET | **BLOQUEADO (`HTTP 401 Unauthorized`)** | A API direta do portal restringe requisições não autenticadas. |
| `https://www.gov.br/receitafederal/dados` | HTTPS (443) HTML GET | **DISPONÍVEL (`HTTP 200 OK`)** | Página institucional estática e metadados em PDF (`cnpj-metadados.pdf`). Não disponibiliza arquivos brutos ZIP diretamente. |

---

## 2. Universo Candidato do Núcleo Hospitalar

Fonte local: `Instituicao` `FATO_OFICIAL`, `SegmentacaoComercial`, `GrupoEconomico` e `RegistroBrutoCNES` aceito. O CNPJ foi lido exclusivamente de `NU_CNPJ` do payload CNES já preservado. Nenhum CNPJ foi buscado por nome:

| Recorte | Unidades | CNPJs Únicos | Válidos | Inválidos | Ausentes | CNPJs Básicos Válidos |
|---|---:|---:|---:|---:|---:|---:|
| **Todas as privadas do Núcleo Hospitalar** | 334 | 322 | 322 | 0 | 11 | 216 |
| **Redes privadas com presença no Núcleo Hospitalar** | 220 | 217 | 217 | 0 | 2 | 41 |
| **Isoladas privadas do Núcleo Hospitalar** | 203 | 193 | 193 | 0 | 10 | 183 |
| **Privadas da Saúde Corporativa Expandida (futuro)** | 2.399 | 2.323 | 2.323 | 0 | 74 | 2.127 |

---

## 3. Pipeline de Ingestão e Modelo de Dados

O pipeline opera com segurança estrita, memória constante e sem dependência de APIs externas de terceiros:

1. **Validação de Cabeçalho e Leiaute (`src/ingestao/receita/validador-leiaute.ts`):**
   - Suporta arquivos oficiais delimitados por ponto e vírgula (`;`) conforme `cnpj-metadados.pdf`.
   - Valida 7 colunas obrigatórias para `EMPRESAS` e 30 colunas para `ESTABELECIMENTOS`.
   - Trata codificação ISO-8859-1 (Latin1) e escapes de aspas.

2. **Validação Matemática de CNPJ (`src/domain/receita/validacao-cnpj.ts`):**
   - Validação completa dos 14 dígitos e dos dois dígitos verificadores (D1 e D2 com pesos RFB).
   - Rejeição de sequências inválidas conhecidas (dígitos todos iguais ou tamanhos divergentes).
   - Extração padronizada de raiz/CNPJ básico (8 dígitos).

3. **Processamento Streaming com Filtro em Memória Constante (`src/ingestao/receita/importador-receita.ts`):**
   - Utiliza `readline` sobre streams Node.js, lendo arquivos nacionais de múltiplos gigabytes linha a linha sem carregar a base inteira na memória.
   - **Estratégia de filtragem:** extrai o CNPJ básico nos primeiros bytes da linha e descarta imediatamente registros que não pertençam ao universo de candidatos priorizados (322 CNPJs válidos e 216 básicos).
   - Calcula o hash criptográfico **SHA-256** do arquivo bruto para auditoria.

4. **Contrato Determinístico de Resolução (`src/domain/receita/resolucao-cnpj.ts`):**
   - `EXATO_CNPJ`: o CNPJ da unidade CNES coincide com o CNPJ completo do estabelecimento Receita.
   - `MATRIZ_FILIAL`: a unidade compartilha o mesmo CNPJ básico da empresa e a Receita identifica a matriz oficial (`identificadorMatrizFilial = 1`).
   - `MESMO_CNPJ_BASICO`: a unidade compartilha a raiz de 8 dígitos com outro estabelecimento filial registrado.
   - `NAO_RESOLVIDO`: CNPJ ausente ou não informado no CNES, ou CNPJ não encontrado na base oficial.
   - `CONFLITO`: múltiplos registros conflitantes ou divergências cadastrais na base oficial que exigem revisão.

5. **Modelo Prisma e Proveniência (`prisma/schema.prisma`):**
   - Modelo `EmpresaReceita` com identificação cadastral, situação (01=Nula, 02=Ativa, 03=Suspensa, 04=Inapta, 08=Baixada), CNAE, natureza jurídica, capital social, porte, endereço e proveniência obrigatória (`tipoDado: FATO_OFICIAL`, `fonteId`, `loteId`, `competencia`, `dataReferencia`, `hashRegistro`, `confianca: ALTA`, `statusRevisao: APROVADA`).
   - Modelo `ResolucaoCNPJ` vinculando `Instituicao` à `EmpresaReceita` com método, justificativa e divergências.

---

## 4. Comandos CLI Disponíveis

Três comandos dedicados estão disponíveis no `package.json`:

| Comando | Script | Finalidade |
|---|---|---|
| `npm run receita:diagnostico` | `scripts/diagnostico-receita.ts` | Executa 1 teste controlado de conectividade por endpoint oficial (timeout de 5s), resume o universo candidato do banco e emite a declaração formal do Gate. |
| `npm run receita:importar` | `scripts/importar-receita-local.ts` | Importa arquivos oficiais locais (`--estabelecimentos=...`, `--empresas=...`, `--competencia=...`). Por padrão opera em modo de simulação segura (`dry-run`); persiste lote e resoluções auditadas somente com a flag explícita `--persistir`. |
| `npm run receita:idempotencia` | `scripts/testar-idempotencia-receita.ts` | Executa o pipeline completo duas vezes consecutivas sobre fixtures de teste e verifica a estrita igualdade de hashes, contagens e resoluções. |

---

## 5. Idempotência e Testes com Fixtures

- **Idempotência Comprovada:** O teste executado via `npm run receita:idempotencia` atesta 100% de igualdade entre a primeira e a segunda passagem:
  - Hash SHA-256 idêntico para estabelecimentos e empresas;
  - Mesma quantidade de linhas lidas (5) e carregadas (3);
  - Mesma distribuição de resoluções (`EXATO_CNPJ: 2`, `NAO_RESOLVIDO: 1`, `CONFLITO: 0`).
- **Fixtures Demonstrativas:** `src/ingestao/receita/__fixtures__/estabelecimentos-demo.csv` e `empresas-demo.csv`.
- **Suíte de Testes Automatizados:**
  - `src/domain/receita/validacao-cnpj.test.ts`: 6 testes.
  - `src/domain/receita/resolucao-cnpj.test.ts`: 6 testes.
  - `src/ingestao/receita/importador-receita.test.ts`: 4 testes.
  - **Total no projeto:** 105 testes aprovados (`npm test`).

---

## 6. Auditoria de Integridade Canônica no Banco (`prisma/dev.db`)

A migração no SQLite foi puramente aditiva (`CREATE TABLE IF NOT EXISTS`). Nenhuma linha foi alterada, resetada ou excluída:

- **Registros na tabela `EmpresaReceita`:** **0** (nenhum dado real ou fictício inserido no banco de produção).
- **Registros na tabela `ResolucaoCNPJ`:** **0**.
- **Instituições reais:** **8.212** preservadas intactas (`FATO_OFICIAL`) + 5 `DEMONSTRACAO`.
- **Grupos econômicos:** **7.550** grupos reais preservados intactos + 1 demonstrativo.
- **Contas comerciais:** **7.550** contas comerciais reais preservadas intactas + 5 demonstrativas.
- **Contatos profissionais:** **109** contatos corporativos ativos (`FATO_PUBLICO`) em 79 organizações + 14 `DEMONSTRACAO`.
- **Agrupamento `1.0.0` e Segmentação `2.1.0`:** rigorosamente preservados.

---

## 7. Limitações e Próximos Passos

1. **Sem QSA / Dados de Sócios:** A tabela de QSA (Sócios) permanece expressamente excluída para evitar tratamento de dados pessoais desnecessários (LGPD).
2. **Sem inferência abusiva de grupo econômico:** A relação matriz/filial pela Receita Federal fundamenta uma relação empresarial oficial, mas não altera automaticamente a regra canônica de agrupamento econômico `1.0.0` sem evidência documental correspondente.
3. **Prontidão Operacional:** O importador local está pronto para execução. Assim que os arquivos oficiais forem disponibilizados pela Receita Federal, a carga poderá ser realizada de forma segura e auditada via `npm run receita:importar -- --estabelecimentos=<caminho> --empresas=<caminho> --persistir`.

---

## 8. Estado do Working Tree

O working tree contém os arquivos implementados, tipados e testados, sem commit automatizado:

```text
M docs/GATE_4_ENRIQUECIMENTO_CNPJ_RECEITA.md
M package.json
M prisma/schema.prisma
?? scripts/diagnostico-receita.ts
?? scripts/importar-receita-local.ts
?? scripts/testar-idempotencia-receita.ts
?? src/domain/receita/
?? src/ingestao/receita/
```
