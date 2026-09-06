import { importarOperadorasANSLocal } from "../src/ingestao/ans/importador-ans";

async function main() {
  console.log("===============================================================");
  console.log("INICIANDO INGESTÃO OFICIAL LOCAL — OPERADORAS ATIVAS ANS (CADOP)");
  console.log("===============================================================\n");

  const inicio = Date.now();
  try {
    const resultado = await importarOperadorasANSLocal();
    const duracaoMs = Date.now() - inicio;

    console.log("Ingestão da ANS concluída com sucesso!");
    console.log(`Lote Ingestão ID:        ${resultado.loteId}`);
    console.log(`Arquivo Origem:          ${resultado.arquivoOrigem}`);
    console.log(`Hash SHA-256 do Arquivo: ${resultado.hashArquivo}`);
    console.log(`Duração:                 ${(duracaoMs / 1000).toFixed(2)}s\n`);

    console.log("MÉTRICAS DO PROCESSAMENTO:");
    console.log(`- Registros Lidos:           ${resultado.totalLidos}`);
    console.log(`- Registros Aceitos:         ${resultado.totalAceitos}`);
    console.log(`- Registros Rejeitados:      ${resultado.totalRejeitados}`);
    console.log(`- Novos Inseridos:           ${resultado.totalInseridos}`);
    console.log(`- Atualizados:               ${resultado.totalAtualizados}`);
    console.log(`- Inalterados (Idempotência):${resultado.totalInalterados}`);
    console.log("\n===============================================================");
  } catch (err) {
    console.error("\nFALHA NA INGESTÃO DA ANS:", err);
    process.exit(1);
  }
}

main();
