# Revisão da lista de cooperativas e organizações de táxi — 2026-10-27

## Escopo

Revisão da feature de cooperativas iniciada pelo Antigravity em `chame-inteligencia`.
O objetivo foi responder se a lista de cooperativas, centrais, associações e empresas
de táxi estava correta e rastreável, preservando a base oficial e sem transformar
inferência em fato.

Arquivos revisados:

- `src/lib/cooperativas-taxi.ts`
- `src/components/cooperativas-taxi-client.tsx`
- `src/app/api/cooperativas-taxi/route.ts`
- `src/app/cooperativas-taxi/page.tsx`

Fonte preservada, sem alteração:

- `mapeamento_2026-09-29/data/processed/empresas_taxi_pj_ativas_sp.csv`
- Universo de CNAEs definido em `mapeamento_2026-09-29/scripts/extract_taxistas_cnae_receita.py`:
  - `4923001` — Serviço de táxi
  - `4923002` — Transporte de passageiros / locação de automóveis com motorista
  - `5229001` — Serviços de apoio ao transporte por táxi, inclusive centrais de chamada

## Problemas encontrados na implementação anterior

1. **Filtro excessivamente amplo.** A regra considerava qualquer cooperativa,
   associação ou sindicato com CNAE de transporte, além de qualquer registro com
   `TAXI`, `TRANSP`, `RADIO` ou CNAE iniciado em `49`. Isso incluía escolas,
   transporte de cargas, turismo, guincho, saúde, telecomunicações, facilities,
   esportes e estacionamentos.
2. **CSV desalinhado.** O parser usava `split(";")`. Em 295 linhas o campo
   `CNAE_TAXI_DESCRICAO` contém `;` dentro de aspas
   (`"4923001=Servico de taxi; 4923002=..."`), o que deslocava todas as colunas
   seguintes e corrompia endereço, contato e classificação.
3. **Ano fixo.** `calcularAnosAtuacao` usava `2026` literal; em 2027 os anos de
   atuação ficariam errados.
4. **Rótulo incorreto de CNPJ.** O registro escolhido podia ser uma filial, mas a
   interface sempre exibia "CNPJ Principal (Matriz)".
5. **Capital social zero.** Era exibido como "Sem fins lucrativos", embora o dado
   apenas indique capital não informado/zerado.
6. **Classificação sem evidência.** A categoria era atribuída sem registrar o
   motivo, o nível de evidência ou o status de revisão.
7. **API sem autorização.** O `POST` aceitava qualquer chamada e qualquer `id`,
   sem permissão de operador, validação de formato ou confirmação de existência.

## Método de classificação adotado

Cada registro é classificado individualmente antes da consolidação por raiz de CNPJ
(8 primeiros dígitos). A decisão combina:

- **CNAE principal** `4923001` ou `5229001` → evidência forte.
- **CNAE secundário** `4923001` ou `5229001` → evidência forte somente se houver
  nome de táxi/rádio-táxi; caso contrário, evidência moderada e revisão pendente.
- **Nome/fantasia** com táxi, taxista, rádio-táxi → evidência de nome.
- **Natureza jurídica** de cooperativa, associação ou sindicato → identidade
  organizacional.
- **Termos de segmento incompatível** (escola, carga, logística, saúde, guincho,
  turismo, telecom, facilities, esports, estacionamento etc.):
  - sem menção a táxi e sem CNAE principal de táxi → **excluído**;
  - com CNAE principal de táxi → **pendente de revisão**, para não descartar
    evidência oficial conflitante com o nome.
- `4923002` isolado não confirma táxi: é um CNAE amplo de locação com motorista.
  Quando o nome contém táxi, o registro fica pendente.

Status e evidência são exportados em cada registro:

- `CONFIRMADO` + `FORTE`: CNAE principal de táxi ou nome de táxi com CNAE
  secundário de táxi.
- `PENDENTE_REVISAO` + `MODERADA`: CNAE de táxi apenas secundário com identidade
  organizacional, nome de táxi com CNAE amplo, ou conflito entre CNAE principal e
  segmento do nome.

## Resultado após a revisão

Base de entrada: **5.558 registros PJ ativos**, **5.462 raízes de CNPJ**.

| Indicador | Antes | Depois |
| --- | ---: | ---: |
| Grupos na lista | 307 | **151** |
| Cooperativas | — | **12** |
| Centrais de rádio-táxi | — | **19** |
| Associações/sindicatos | — | **4** |
| Empresas de táxi PJ | — | **116** |
| Confirmados | — | **135** |
| Pendentes de revisão | — | **16** |
| Grupos excluídos | — | **5.311** |

Exclusões por motivo (registros):

- sem evidência de táxi no nome ou na atividade principal: **4.012**;
- CNAE de táxi apenas secundário, sem identidade de táxi: **464**;
- segmento incompatível no nome: **931**.

## Pendentes de revisão (16)

Cooperativas/centrais:

- COOPERATIVA DE TRANSPORTE SAO PAULO — COOTRASP
- COOPERAZUL COOPERATIVA DE TRANSPORTES INTERMODAIS BRASILEIRA
- GUARUCOOPER — COOPERATIVA DE TRANSPORTES GUARULHENSE
- ERICKRAFA ESPORTS E LOG LTDA

Empresas com conflito entre CNAE principal de táxi e nome de outro segmento:

- A D AUTOSSOCORRO LTDA.
- APOLO TRANSPORTE E LOGISTICA LTDA
- ATF — SERVICOS DE TRANSPORTE E LOGISTICA LTDA
- CRG Transporte e Turismo LTDA
- DENILSON SANCHES OLIVEIRA LTDA (FERINHA AUTO SOCORRO)
- FACILITY CALL CENTER LTDA
- FIVEMOVE TRANSPORTE E LOGISTICA LTDA
- J A GOMES TRANSPORTE LTDA (ARRAES E GOMES HORTIFRUTI)
- MERIDIANO SERVICOS LTDA (UEDA PARK)
- R M SANTOS TRANSPORTES E TURISMO LTDA (TYAXI REGINALDO DOS SANTOS)
- RM TRANSPORTE DE JORNAIS E REVISTAS LTDA
- TAXI TONELLI LTDA (CNAE 4923002, sem CNAE núcleo de táxi)

Esses registros permanecem visíveis com selo âmbar e não são promovidos a Tier 1
antes da revisão humana.

## Falsos positivos removidos (amostra)

- COOPER BRASVIAS — COOPERATIVA DE TRANSPORTES E LOGISTICA
- INTEGRA COOPERATIVA DOS PROFISSIONAIS AUTONOMOS DA AREA DA SAUDE
- Cooperativas escolares, de cargas, turismo, facilities e telecomunicações
- Empresas de guincho, reboque, saúde, esportes e estacionamento que tinham CNAE
  de táxi apenas como secundário

## Mudanças de interface

- Selo de revisão (`Confirmada` / `Pendente de revisão`) em cada card.
- Filtro “Revisão: todas / somente confirmadas / somente pendentes”.
- Bloco de evidências no card e no modal, com CNAE, nome, natureza e conflito.
- Trilha de auditoria com registros da fonte, excluídos e motivos de exclusão.
- Rótulo dinâmico “CNPJ do estabelecimento (Matriz/Filial)”.
- Capital social zero exibido como “Não informado”.
- Tempo de atuação calculado com o ano corrente.
- Exportação CSV com status de revisão, nível de evidência, motivo e evidências.
- Erro de salvamento exibido no modal em vez de falhar silenciosamente.

## Segurança da API

`POST /api/cooperativas-taxi` agora:

- exige `PLANEJAR_ACOES` via `exigirPermissaoOperador` (perfil `REVISOR` ou superior);
- valida `id` no formato `COOP-12345678` ou `12345678`;
- valida status e tamanho das anotações com Zod;
- retorna `404` para cooperativa inexistente e `403` para perfil sem permissão;
- registra `atualizadoPor` no arquivo de abordagens para auditoria.

Observação operacional: sem `WINS_HUB_TAXI_PERFIL_OPERADOR=REVISOR` (ou superior) e
`WINS_HUB_TAXI_USUARIO_OPERADOR` no ambiente, o salvamento retorna `403` por design.

## Validação executada

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Ressalvas

- CNAE declarado não comprova alvará, condutax ou operação ativa no DTP/PMSP.
- A consolidação por raiz de CNPJ pode reunir matriz e filiais com atividades
  diferentes; o registro exibido é o de maior evidência e a contagem de
  estabelecimentos na base é mantida para transparência.
- Contatos são institucionais e públicos, limitados à prospecção B2B.
