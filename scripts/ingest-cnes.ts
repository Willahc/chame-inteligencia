import { importarCNES } from "../src/ingestao/persistencia/importar-cnes";

async function main() {
  const arquivo = process.argv[2];
  if (!arquivo) { console.error("Uso: npm run ingest:cnes -- <caminho-do-csv> [AAAA-MM-DD]"); process.exit(1); }
  const referencia = process.argv[3] ? new Date(`${process.argv[3]}T00:00:00-03:00`) : new Date();
  const resultado = await importarCNES(arquivo, referencia);
  console.log(JSON.stringify(resultado, null, 2));
}
main().catch((erro) => { console.error(erro); process.exit(1); });
