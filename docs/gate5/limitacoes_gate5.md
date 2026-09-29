# Limitações e Ressalvas Técnicas — Gate 5

## 1. Cobertura Espacial e Volumetria de Pareamento

- **Taxa de Pareamento do Edital 2024 (22,0%)**: Dos 1.187 pontos com vagas abertas para sorteio no Edital 2024, 261 foram vinculados com alta e média confiança a coordenadas do OpenStreetMap. Os 926 pontos restantes não puderam ser georreferenciados diretamente porque o OpenStreetMap possui cobertura incompleta de pontos de táxi na capital paulista (apenas 593 feições mapeadas no município, concentradas no centro expandido).
- **Feições OSM sem Correspondência (332)**: As 332 feições de táxi do OSM não vinculadas ao DTP não representam necessariamente erros. O Edital DTP 2024 é restrito aos pontos com saldo de vagas aberto para sorteio; pontos totalmente ocupados (com ocupação 100% e saldo 0) ou pontos extintos/remanescentes não integraram o edital de 2024, mas continuam existindo fisicamente e mapeados no OSM.
- **Vazios Periféricos no OSM**: 14 das 32 subprefeituras possuem pontos no Edital 2024 e **zero pareamento** com o OSM (vazios absolutos: Perus-Anhanguera, Pirituba-Jaraguá, Cidade Ademar, Campo Limpo, M'Boi Mirim, Capela do Socorro, Penha, Ermelino Matarazzo, São Miguel Paulista, Itaim Paulista, Aricanduva-Formosa-Carrão, Itaquera, Guaianases e Cidade Tiradentes). Outras 3 subprefeituras (Parelheiros, Sapopemba e "Não informado") não têm pontos no edital e por isso não entram nessa contagem. O matching espacial nessas regiões depende de uma fonte vetorial primária adicional.

## 2. Incerteza em Vias Estruturais com Múltiplos Pontos (Ambiguidades 1:N)

- Vias longas de grande circulação (ex: Avenida Paulista, Avenida Rebouças, Avenida Santo Amaro) abrigam múltiplos pontos de táxi regulamentados ao longo de sua extensão. Como a tabela do DTP não publica número predial métrico de referência, não é possível discernir algoritmicamente qual nó OSM corresponde a qual ponto DTP apenas pelo nome da via.
- Todos esses 36 casos foram mantidos sem atribuição forçada e preservados no log de auditoria `log_discrepancias_matching.jsonl`.

## 3. Divergências de Capacidade (`CAP` DTP vs `capacity` OSM)

- Em diversos pontos pareados com sucesso, a quantidade de vagas declarada no DTP difere da contada em campo no OSM (ex: DTP declara 4 vagas e OSM declara 6). Isso decorre de alterações físicas na demarcação viária da CET/DTP posteriores à publicação ou imprecisão do mapeamento colaborativo. Todas as divergências foram sinalizadas na coluna `discrepancy_flags`.

## 4. Próxima Ação Recomendada

- Utilizar a minuta oficial preparada no Gate 4 (`docs/gate4/minuta_solicitacao_oficial_pontos_taxi.md`) para requerer formalmente à SMT/DTP/GeoInfo o shapefile/camada vetorial completa do censo de pontos de táxi do município, eliminando a dependência do mapeamento colaborativo para os 926 pontos pendentes.
