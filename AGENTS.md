<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras do projeto Chame Inteligência

Estas regras valem para qualquer agente que trabalhe neste repositório:

- Todo conteúdo visível na interface deve estar em português do Brasil e usar equivalentes naturais para termos de negócio.
- Nunca inventar dados reais. Registros fictícios devem estar marcados como `DEMONSTRACAO` em todas as camadas pertinentes.
- Preservar a rastreabilidade entre instituição, evidência e fonte, incluindo datas, confiança e status de revisão.
- Nunca apresentar `INFERENCIA` ou `HIPOTESE` como fato. A interface deve diferenciar todas as categorias canônicas.
- Não alterar pesos, faixas ou versão do Índice de Prioridade Hospitalar sem justificativa documentada e testes atualizados.
- Executar lint, verificação de tipos, testes e build antes de declarar uma alteração pronta.
- Preservar o modelo canônico em `prisma/schema.prisma` e a separação entre domínio, acesso a dados, ingestão e interface.
- Não adicionar dependências sem necessidade concreta e registrada no escopo.
- Não coletar, armazenar ou exibir dados pessoais.
- Não chamar serviços externos, bases públicas ou APIs de inteligência artificial sem autorização explícita.
- Agentes e assistentes nunca são fontes primárias da verdade; dados estruturados e evidências permanecem canônicos.
- Não integrar sistemas internos da Chame nem substituir ferramentas atuais sem novo escopo aprovado.
