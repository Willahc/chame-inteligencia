# Arquitetura de ingestão futura

Nenhuma fonte real é consultada no Gate 1. Os contratos em `src/ingestao` apenas definem a fronteira para conectores futuros de CNES/DATASUS, Receita Federal/CNPJ, ANS, sites institucionais, eventos do setor e dados geográficos públicos.

## Fluxo obrigatório

```text
COLETA → NORMALIZAÇÃO → RESOLUÇÃO DE ENTIDADE → VALIDAÇÃO → EVIDÊNCIA → ÍNDICE → PUBLICAÇÃO
```

1. **Coleta:** armazena origem, identificador externo, instante de coleta e conteúdo bruto, respeitando termos de uso e limites técnicos.
2. **Normalização:** converte formatos externos para campos canônicos sem apagar a referência original.
3. **Resolução de entidade:** relaciona o registro a uma instituição existente; correspondências ambíguas exigem revisão humana.
4. **Validação:** verifica esquema, completude, datas, fonte e coerência. Registros inválidos não seguem adiante.
5. **Evidência:** cria um registro rastreável, classificado como fato, inferência, hipótese ou demonstração, com confiança e revisão.
6. **Índice:** recalcula o índice determinístico usando apenas dados elegíveis e a versão explícita dos pesos.
7. **Publicação:** disponibiliza somente registros aprovados para a interface e mantém a trilha de auditoria.

## Controles mínimos para o próximo Gate

- execução incremental e repetível;
- identificação e deduplicação da origem;
- retenção da data de referência e da data de coleta;
- revisão humana para conflitos de identidade;
- registro de erros sem publicar dados parciais;
- proibição de dados pessoais desnecessários;
- testes de contrato por conector;
- autorização explícita antes de chamar qualquer serviço externo.
## Gate 2 — CNES real

Prepare o CSV oficial conforme `docs/CNES.md` e execute `npm run ingest:cnes -- caminho\\cnes_estabelecimentos.csv 2026-09-04`. O importador registra o lote, preserva linhas inválidas, filtra São Paulo/SP e faz upsert por CNES. Não baixar bases CNPJ/ANS neste Gate.
