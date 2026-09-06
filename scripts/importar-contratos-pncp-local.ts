import { importarContratosConfirmadosPNCP } from "../src/ingestao/pncp/importador-contratos-pncp";

async function main() {
  console.log("===============================================================");
  console.log("INICIANDO INGESTÃO OFICIAL LOCAL — CONTRATOS CONFIRMADOS PNCP");
  console.log("===============================================================\n");

  const inicio = Date.now();
  try {
    const resultado = await importarContratosConfirmadosPNCP();
    const duracaoMs = Date.now() - inicio;

    console.log("Ingestão de contratos do PNCP concluída com sucesso!");
    console.log(`Lote Ingestão ID:        ${resultado.loteId}`);
    console.log(`Arquivo Origem:          ${resultado.arquivoOrigem}`);
    console.log(`Hash SHA-256 do Arquivo: ${resultado.hashArquivo}`);
    console.log(`Duração:                 ${(duracaoMs / 1000).toFixed(2)}s\n`);

    console.log("MÉTRICAS DO PROCESSAMENTO:");
    console.log(`- Registros Lidos:           ${resultado.totalLidos}`);
    console.log(`- Novos Inseridos:           ${resultado.totalInseridos}`);
    console.log(`- Atualizados:               ${resultado.totalAtualizados}`);
    console.log(`- Inalterados (Idempotência):${resultado.totalInalterados}`);
    console.log(`- Vinculados por CNPJ:       ${resultado.totalVinculadosCNPJ}`);
    console.log(`- Sem Vínculo (Visíveis Geral):${resultado.totalSemVinculo}`);
    console.log("\n===============================================================");
  } catch (err) {
    console.error("\nFALHA NA INGESTÃO DE CONTRATOS DO PNCP:", err);
    process.exit(1);
  }
}

main();
