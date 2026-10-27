-- 1. Habilita PostGIS no banco principal de desenvolvimento (wins_hub_taxi_dev)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Cria banco de testes separado para garantir isolamento absoluto
CREATE DATABASE wins_hub_taxi_test OWNER wins_user;

-- 3. Habilita PostGIS no banco de testes
\c wins_hub_taxi_test
CREATE EXTENSION IF NOT EXISTS postgis;
