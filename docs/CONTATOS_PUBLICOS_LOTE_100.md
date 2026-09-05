# Contatos públicos — manifesto lote 100.0.0

Data da coleta: **05/09/2026**  
Status: **parcial e auditável; 8 de 100 contatos persistidos**

## Resultado

- Contatos encontrados no manifesto: **8**
- Contatos persistidos como `FATO_PUBLICO`: **8**
- Organizações cobertas: **5**
- Contatos rejeitados: **1 candidato**, não persistido
- Saldo para a meta de 100: **92**
- Execuções do importador: **2**, ambas idempotentes (`8` encontrados e `8` persistidos)

Os contatos públicos existentes foram consolidados no manifesto versionado `100.0.0`. A meta de 100 ainda não foi declarada concluída porque não foram incluídas pessoas sem conferência direta de uma página pública.

## Organizações, cargos e áreas

| Organização | Contatos | Cargos/áreas reproduzidos |
| --- | ---: | --- |
| FLEURY S A | 2 | Gerente sênior — Facilities; Profissional de Compras — Strategic Sourcing |
| SOCIEDADE BENEFICENTE DE SENHORAS HOSPITAL SIRIO LIBANES | 3 | Comprador sênior; Profissional de compras; Coordenador de Compras |
| REDE DOR SAO LUIZ S A | 1 | Profissional de Gestão de Compras |
| CEMA HOSPITAL ESPECIALIZADO LIMITADA | 1 | Gestor administrativo e operacional — Facilities e Operações |
| ASSOCIACAO CONGREGACAO DESANTA CATARINA | 1 | Profissional de Compras |

## Fontes utilizadas

Todas as fontes são URLs públicas de perfis ou publicação profissional no LinkedIn, reproduzidas sem login. A fonte e a URL pública são armazenadas por contato no manifesto e na tabela `Fonte` como `FATO_PUBLICO`.

Não foram utilizados agregadores clandestinos, bases vazadas, scraping autenticado, CAPTCHA contornado ou fontes externas para deduzir dados ausentes.

## Campos ausentes e confiança

- Os 8 contatos não têm e-mail corporativo confirmado; os campos permanecem vazios.
- Os 8 contatos não têm telefone profissional confirmado; os campos permanecem vazios.
- Confiança dos fatos de identidade/cargo: `ALTA`, com revisão `APROVADA`.
- O papel comercial (`Compras`, `Facilities`, `Operações` ou `Influenciador estratégico`) é uma `INFERENCIA`, nunca um fato de poder decisório.
- Não foram armazenados e-mail pessoal, telefone pessoal, CPF ou endereço residencial.

## Rejeições e validações

O candidato **Gustavo Taboas**, encontrado em página pública do SindHosp, foi rejeitado e não entrou no manifesto: o grupo CNES correspondente ao Hospital Albert Einstein não possui instituição segmentada como `NUCLEO_HOSPITALAR` no banco canônico. O importador também rejeita antes do upsert: ID duplicado no manifesto, contato sem nome/cargo/área/empresa, URL que não seja HTTPS, fonte divergente da URL pública, grupo inexistente, grupo `DEMONSTRACAO`, grupo não privado ou sem instituição oficial do `NUCLEO_HOSPITALAR`, e e-mail/telefone previamente não comprovado.

## Limitações

O LinkedIn foi usado apenas como página pública, sem login; disponibilidade, conteúdo e cargo podem mudar. Grupos com vínculo `HIPOTESE` continuam marcados como hipótese no modelo canônico. A cobertura atual é 8/100; os 92 contatos restantes dependem de novas páginas públicas que possam ser abertas e conferidas individualmente.

## Escopo ampliado em 05/09/2026

Foi confirmado que a meta operacional é **pelo menos um contato público específico por instituição CNES real**. O universo contém 8.212 instituições `FATO_OFICIAL`; nenhuma possui atualmente contato público ativo ligado diretamente por `instituicaoId`. Os 8 contatos deste manifesto estão ligados somente a organizações (`grupoEconomicoId`) e, portanto, não são contados como cobertura institucional. A nova lacuna é de **8.212 instituições**, a ser tratada em lotes verificáveis.

Nenhuma instituição real foi alterada ou removida. A ingestão não iniciou campanhas, CRM, discador, WhatsApp, e-mail, IA, Receita Federal ou ANS.
