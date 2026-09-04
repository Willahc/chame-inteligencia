# Chame Inteligência

Aplicação local demonstrativa para apoiar a prospecção comercial da Chame Táxi, começando pelo **Radar de Potenciais Clientes do Setor de Saúde**.

> **Aviso de governança:** todos os dados atuais são fictícios e estão marcados como `DEMONSTRACAO`. Nenhuma instituição, evidência, fonte ou endereço representa uma operação real.

## Objetivo e problema de negócio

A Chame busca captar mais clientes corporativos, com preferência inicial pelo setor de saúde e hospitalar. A ferramenta organiza sinais públicos, evidencia por que uma conta pode merecer atenção e recomenda um próximo passo verificável. Ela não substitui sistemas atuais, não faz contato automático e não usa inteligência artificial externa neste Gate.

## Funcionalidades do Gate 1

- Visão Geral com indicadores, distribuições, Top 10 e principais motivos;
- Radar pesquisável, filtrável e ordenável;
- detalhe completo da instituição e de suas evidências;
- Índice de Prioridade Hospitalar determinístico e explicável;
- camada explícita de governança e rastreabilidade;
- Assistente Comercial local baseado em perguntas e regras predefinidas;
- SQLite com cinco instituições fictícias variadas;
- contratos e documentação para futura ingestão de fontes públicas;
- testes automatizados para domínio, governança, filtros e assistente.

## Tecnologias

- Node.js 22 LTS;
- Next.js 16 com App Router;
- React 19 e TypeScript estrito;
- Tailwind CSS 4;
- SQLite e Prisma 6;
- Zod para validação;
- Vitest para testes unitários.

## Arquitetura

```text
src/app/             rotas, páginas e API interna do Next.js
src/components/      componentes visuais e interativos
src/domain/          regras puras: índice, filtros, governança e assistente
src/data/            conjunto canônico de demonstração usado na carga
src/ingestao/        contratos inativos para conectores futuros
src/lib/             acesso ao SQLite e transformação em modelos de tela
prisma/              esquema relacional, banco local ignorado e carga inicial
docs/                modelo de dados, ingestão e agentes futuros
```

Páginas e consultas ao SQLite executam no servidor. Apenas filtros e interação do assistente são componentes de cliente. A API `POST /api/assistente` valida a entrada, consulta a base local e chama o mesmo domínio determinístico coberto por testes.

## Instalação no Windows

Pré-requisito: Node.js 22 LTS ativo.

```powershell
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
```

O projeto usa `DATABASE_URL="file:./dev.db"`. O arquivo é criado em `prisma/dev.db` e não é versionado.

## Execução

```powershell
npm run dev
```

Acesse `http://localhost:3000`. Para validar o modo de produção local:

```powershell
npm run build
npm start
```

## Testes e qualidade

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Para recriar somente a base fictícia local:

```powershell
npm run db:reset-demo
```

## Modelo de dados

`Instituicao` pode pertencer a `GrupoEconomico`, possui um `TipoEstabelecimento` e se relaciona com `Unidade`, `Endereco`, `ServicoSaude`, `SinalExpansao`, `NecessidadeMobilidade`, `AreaDecisora`, `Evidencia`, `Fonte`, `IndicePrioridade`, `ComponenteIndice` e `AcaoComercial`.

O modelo detalhado está em [docs/MODELO_DE_DADOS.md](docs/MODELO_DE_DADOS.md) e o esquema executável em `prisma/schema.prisma`.

## Governança

As categorias canônicas são:

- `FATO_OFICIAL`: informação emitida por fonte oficial;
- `FATO_PUBLICO`: informação publicamente verificável;
- `INFERENCIA`: conclusão derivada e justificada;
- `HIPOTESE`: possibilidade que exige validação;
- `DEMONSTRACAO`: conteúdo fictício para validação do produto.

Toda evidência registra instituição, fonte, URL ou identificador, datas de coleta e referência, tipo, confiança (`ALTA`, `MEDIA`, `BAIXA`), título, descrição, observação e status de revisão. Inferências e hipóteses nunca podem ser apresentadas como fatos.

## Índice de Prioridade Hospitalar

O motor puro em `src/domain/indice` calcula de 0 a 100. Os pesos ficam separados em `pesos.ts`, somam 100 e cobrem: operação 24h, quantidade de unidades, porte, perfil corporativo, dispersão geográfica, expansão, deslocamento entre unidades, visitantes externos, acesso provável ao decisor e qualidade das evidências.

Cada execução retorna total, versão, faixa, valor por componente, peso, justificativa e evidências relacionadas. Faixas:

- 80–100: Prioridade Muito Alta;
- 60–79: Prioridade Alta;
- 40–59: Prioridade Moderada;
- 0–39: Prioridade Baixa.

O índice orienta atenção; não substitui revisão humana nem decisão comercial.

## Dados de demonstração

A carga contém somente:

- Rede Saúde Exemplo;
- Hospital Demonstração Alfa;
- Hospital Modelo Sul;
- Centro Diagnóstico Modelo;
- Instituto Clínico Demonstração.

O conjunto cobre instituição única, grupo econômico, múltiplas unidades, operação contínua e diurna, presença e ausência de expansão, prioridades diferentes e evidências fortes, médias, fracas e pendentes.

## Ingestão CNES

O fluxo obrigatório é **Coleta → Normalização → Resolução de entidade → Validação → Evidência → Índice → Publicação**. A ingestão CNES está ativa e os dados reais de São Paulo (8.212 instituições) foram carregados via `npm run ingest:cnes`. O seed preserva dados reais; `npm run db:seed` pode ser executado com segurança. Veja [docs/CNES.md](docs/CNES.md) e [docs/INGESTAO.md](docs/INGESTAO.md).

## Próximos Gates

Possibilidades futuras, sempre mediante novo escopo: conectores públicos controlados, revisão e publicação assistida de evidências, histórico de alterações, comparação territorial e agentes de apoio. Agentes futuros não serão fonte primária da verdade; veja [docs/AGENTES_FUTUROS.md](docs/AGENTES_FUTUROS.md).
## Gate 2 — ingestão CNES

O radar aceita dados reais somente pelo importador governado do CNES/DATASUS. A fonte, os filtros e o fluxo de proveniência estão em `docs/CNES.md` e `docs/GOVERNANCA_DADOS_REAIS.md`. Registros reais e `DEMONSTRACAO` permanecem separados; não há CNPJ, ANS ou IA nesta etapa.
