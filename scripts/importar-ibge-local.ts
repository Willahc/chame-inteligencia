import { importarMunicipiosIBGELocal } from "../src/ingestao/ibge/importador-ibge";

async function main() {
  console.log("===============================================================");
  console.log("INICIANDO INGESTÃO OFICIAL LOCAL — MUNICÍPIOS E REGIÕES IBGE");
  console.log("===============================================================\n");

  const inicio = Date.now();
  try {
    const resultado = await importarMunicipiosIBGELocal();
    const duracaoMs = Date.now() - inicio;

    console.log("Ingestão do IBGE concluída com sucesso!");
    console.log(`Arquivo Origem:          ${resultado.arquivoOrigem}`);
    console.log(`Hash SHA-256 do Arquivo: ${resultado.hashArquivo}`);
    console.log(`Duração:                 ${(duracaoMs / 1000).toFixed(2)}s\n`);

    console.log("MÉTRICAS DO PROCESSAMENTO:");
    console.log(`- Registros Lidos:           ${resultado.totalLidos}`);
    console.log(`- Novos Inseridos:           ${resultado.totalInseridos}`);
    console.log(`- Atualizados:               ${resultado.totalAtualizados}`);
    console.log(`- Inalterados (Idempotência):${resultado.totalInalterados}`);
    console.log("\n===============================================================");
  } catch (err) {
    console.error("\nFALHA NA INGESTÃO DO IBGE:", err);
    process.exit(1);
  }
}

main();
