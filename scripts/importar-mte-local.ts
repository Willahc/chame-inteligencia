import { importarIndicadoresMTELocal } from "../src/ingestao/mte/importador-mte";

async function main() {
  console.log("===============================================================");
  console.log("INICIANDO INGESTÃO OFICIAL LOCAL — INDICADORES SETORIAIS MTE / NOVO CAGED");
  console.log("===============================================================\n");

  const inicio = Date.now();
  try {
    const resultado = await importarIndicadoresMTELocal();
    const duracaoMs = Date.now() - inicio;

    console.log("Ingestão do MTE concluída com sucesso!");
    console.log(`Hash SHA-256 do Arquivo: ${resultado.hashArquivo}`);
    console.log(`Duração:                 ${(duracaoMs / 1000).toFixed(2)}s\n`);

    console.log("MÉTRICAS DO PROCESSAMENTO:");
    console.log(`- Novos Inseridos:           ${resultado.totalInseridos}`);
    console.log(`- Inalterados (Idempotência):${resultado.totalInalterados}`);
    console.log("\n===============================================================");
  } catch (err) {
    console.error("\nFALHA NA INGESTÃO DO MTE:", err);
    process.exit(1);
  }
}

main();
