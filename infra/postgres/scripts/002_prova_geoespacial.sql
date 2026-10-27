BEGIN;

CREATE TEMP TABLE temp_polos_saude (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);

INSERT INTO temp_polos_saude (nome, geom) VALUES
('Hospital Samaritano', ST_SetSRID(ST_MakePoint(-46.6586, -23.5383), 4326)),
('Hospital das Clínicas FMUSP', ST_SetSRID(ST_MakePoint(-46.6713, -23.5574), 4326));

-- Distância geodésica em metros
SELECT 
    a.nome AS origem,
    b.nome AS destino,
    ROUND(ST_Distance(a.geom::geography, b.geom::geography)::numeric, 2) AS distancia_metros
FROM temp_polos_saude a, temp_polos_saude b
WHERE a.id = 1 AND b.id = 2;

-- Verificação de proximidade espacial (raio de 3km)
SELECT 
    origem.nome,
    ST_DWithin(origem.geom::geography, destino.geom::geography, 3000) AS dentro_do_raio_3km
FROM temp_polos_saude origem, temp_polos_saude destino
WHERE origem.id = 1 AND destino.id = 2;

ROLLBACK;
