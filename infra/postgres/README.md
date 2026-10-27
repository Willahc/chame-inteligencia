# Infraestrutura Local PostgreSQL + PostGIS (WiNS Hub Táxi)

Esta pasta contém a definição declarativa do container PostgreSQL 16 + PostGIS 3.4 configurado na porta local `127.0.0.1:5433` (evitando conflito com instalações nativas do PostgreSQL na porta `5432`).

## Comandos Operacionais

A partir da raiz da aplicação:

```bash
npm run postgres:up
npm run postgres:status
npm run postgres:down
```

## Bancos Inicializados Automaticamente
- `wins_hub_taxi_dev`: Banco de desenvolvimento com extensão `postgis` habilitada.
- `wins_hub_taxi_test`: Banco isolado para testes automatizados com extensão `postgis` habilitada.
