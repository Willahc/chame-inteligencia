# Progresso — rodada de design dos dashboards (29/09/2026)

Registro da evolução visual dos dois dashboards oficiais (mestre 37 MB e
corporativo B2B 1,3 MB), em três commits, mais a embalagem para e-mail.

## Commits

| # | Commit | Escopo |
|---|---|---|
| 1 | `11cf1a8` | Refinamento base: design system (tokens, `.card`, `.kpi`, `.eyebrow`, `.tbl`, `.field`, `.btn*`, `.nav-tab`), ~1.100 atributos Tailwind convertidos nos 2 geradores (765 mestre + 331 corp), `Chart.defaults` centralizado |
| 2 | `8d7ca15` | Enterprise premium: topbar em gradiente com inset, KPIs monocromáticos (`.kpi-value`), tabelas densas sem zebra, campos 13px, extras de Chart.js (barras/linha/grade), fix de label KPI truncado |
| 3 | `456efee` | **Menu lateral** nos 2 dashboards + **fix dos rótulos do eixo Y** + ajustes de nav (largura, badges, alinhamento) |

## Menu lateral (commit 3)

- Estrutura: `#shell` (flex) → `<aside id="sidebar">` (marca, seção MÓDULOS,
  botões com badges, rodapé/CTA) + coluna com header slim, main, modais.
- **IDs e classes dos botões preservados** (`nav-btn-*`, `nav-tab`,
  `is-active`) → `switchMainTab`/`switchB2BTab` intactos, sem tocar no JS.
- Media query ≤1100px: rail de 4.5rem só com ícones (textos/badges ocultos).
- Ajustes feitos na validação visual: sidebar 15rem → **16.5rem**, botão com
  `min-height` (label quebra em 2 linhas quando longo), badge com
  `flex:0 0 auto` (não é mais cortado), `text-align:left` (labels quebrados
  não ficam centralizados — herança do `<button>`).

## Fix dos rótulos do eixo Y (bug presente desde o v2)

- **Sintoma**: primeiros caracteres dos rótulos do eixo Y cortados no canvas
  (`1.000` → `.000`). Reproduzido em screenshots `v2`, `v3` e `v4`.
- **Causa**: `initCharts()` roda no `DOMContentLoaded` e o Chart.js mede os
  rótulos antes da webfont Plus Jakarta Sans carregar (fonte fallback, mais
  estreita); o Chromium então repinta o canvas com a fonte final e o texto
  excede o espaço alocado (`chartArea.left`).
- **Correção**: re-`update()` de todos os charts em `document.fonts.ready`
  (apenas no gerador mestre — o corp não instancia charts).

## Verificações executadas

- `python <util>/verify_html.py`: 0 placeholders vazando, nav HTML/JS
  presente (mestre 4/8, corp 3/6), nenhum `nav-btn-*` sem `nav-tab`,
  charts da seção Dados Abertos presentes.
- `python scripts/privacy.py check` → **59 arquivos, 0 violações**.
- `python scripts/test_doc_scraper.py` → 6 testes OK.
- Screenshots Edge headless 1700×1300 (`Temp\opencode\v6_*`) + validação por
  pixels (PIL): rótulos começam em x=313 vs. content-left=314 (sem corte);
  texto do sidebar até x=230 (limite 253).

## Embalagem para e-mail (decisão do usuário)

- Artefato: **`mapeamento_2026-09-29.zip` — 17,63 MB / 119 arquivos**
  (limite do Gmail/Outlook.com é 25 MB), variantes medidas:
  50,4 MB (tudo menos .git/OSM/raw/private), 38,1 MB (−xlsx), 27,1 MB
  (−pasta Novos), 17,6 MB (−pasta Novos −xlsx) e 6,1 MB (mínimo).
- Inclui: dashboards HTML, planilha mestre em CSV (completa e `_publico`),
  `data/processed/`, `scripts/`, `docs/`, `logs/`, README, requirements.
- Exclui: `.git` (34 MB), `data/external/` (OSM, 1,7 GB), `data/raw/`
  (456 MB, rebaixável), `data/private/` (**LGPD — não enviar por e-mail**),
  `.xlsx`/`.zip` internos e a pasta `Novos Alvarás 2026` (duplicatas + PDFs).
- Reprodutor: `python scripts/make_email_zip.py` (gera a variante B por
  padrão; argumentos permitem variante mínima/tudo).

## Próximos passos / pendências

1. Tabela B2B: coluna "Mobilidade Atual & DOR" é a mais apertada (quebra em
   várias linhas) — opcional: reordenar larguras ou mover para tooltip.
2. Conferir o rail do sidebar (≤1100px) em tela real/touch.
3. `xlsx` e PDFs de editais ficaram fora do zip por tamanho — se precisar
   enviar, montar zip específico (ambos são ~12 MB juntos).
4. Reavaliar se `data/processed/` deve mesmo ir no pacote de e-mail
   (~12 MB do zip; é regenerável pelos scripts).
