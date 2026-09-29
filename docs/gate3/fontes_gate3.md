# Fontes oficiais e proveniência — Gate 3

Consulta/auditoria local: 23/09/2026, America/Sao_Paulo. O escopo é institucional: não houve consultas individuais, contatos ou coleta de dados de motoristas.

| Fonte | Órgão | URL | Situação e método |
|---|---|---|---|
| Página Táxi/Condutax | SMT / DTP / PMSP | https://prefeitura.sp.gov.br/web/mobilidade/w/saiba_como_e_e_como_funciona/3875 | Consultada no Gate 3; encaminha a escolas credenciadas pelo DTP. |
| SP156 — Condutax | DTP / SMT / PMSP | https://sp156.prefeitura.sp.gov.br/portal/servicos/informacao?a=1432&servico=4425&t=573 | Consultada no Gate 3; confirma curso em escola credenciada DTP. |
| Lista de Despachantes, OIAs e CFCs credenciados pelo DTP | SMT / DTP / PMSP | https://prefeitura.sp.gov.br/web/mobilidade/w/noticias/281259 | Página oficial de origem, datada de 02/10/2024, que vincula o anexo CFC. |
| Anexo CFC — Escolar, Motofrete, Táxi | SMT / DTP / PMSP | https://prefeitura.sp.gov.br/documents/d/mobilidade/escolar-motofrete-taxi-pdf | **Preservado e auditado no Gate 3**: PDF original manual mantido intacto em `data/raw/dtp/canais/cfc/cfc_escolar_motofrete_taxi_dtp_original.pdf.pdf`. A tentativa automatizada anterior retornou HTTP 403; o registro histórico permanece no manifesto. |
| Portal Pesquisa do DTP | DTP / PMSP | https://pesqtranspub.prefeitura.sp.gov.br/ | Landing HTML preservada. Interface com CAPTCHA; nenhum filtro submetido. |
| Anexo OIA | SMT / DTP / PMSP | https://prefeitura.sp.gov.br/documents/d/mobilidade/organismos-de-inspecao-acreditados-pdf | Não preservado/processado: expõe responsável técnico nominal, fora do escopo. |
| Anexo despachantes | SMT / DTP / PMSP | https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/mobilidade/DESPACHANTES%20E%20REPRESENTANTES%2009_08_2024.pdf | Não preservado/processado: contém dados de pessoas, fora do escopo. |

## Proveniência do PDF CFC

- URL canônica: `https://prefeitura.sp.gov.br/documents/d/mobilidade/escolar-motofrete-taxi-pdf`.
- Página oficial de origem: `https://prefeitura.sp.gov.br/web/mobilidade/w/noticias/281259`.
- Natureza: original manualmente obtido da fonte oficial; não é snapshot ou conversão local.
- Metadados técnicos: criador `Microsoft� Word 2016`; produtor `www.ilovepdf.com`; criação/modificação PDF `2025-10-02 18:16:15 UTC`. Tais metadados não comprovam vigência administrativa e não substituem a data da página de origem.

## Interface do portal público

Snapshot: `data/raw/dtp/canais/pesqtranspub_landing_20260923.html`. Tipos: Veículos, Condutores, Empresas e Despachantes. Para Empresas, há Modalidade Táxi (`T`) e tipos Escola de Condutores (`E`), OIA (`V`), Publicidade (`P`) e Transporte (`T`). Há CAPTCHA (`ChaveCaptcha`); nenhum CAPTCHA foi resolvido ou resultado coletado.
