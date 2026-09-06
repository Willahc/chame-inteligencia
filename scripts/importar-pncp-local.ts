import { importarSinaisPNCPLocal } from "../src/ingestao/pncp/importador-pncp";

async function main() {
  console.log("===============================================================");
  console.log("INICIANDO INGESTÃO OFICIAL LOCAL — SINAIS DE CONTRATAÇÃO PNCP");
  console.log("===============================================================\n");

  const inicio = Date.now();
  try {
    const resultado = await importarSinaisPNCPLocal();
    const duracaoMs = Date.now() - inicio;

    console.log("Ingestão concluída com sucesso!");
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
    console.log(`- Sinais de Mobilidade:      ${resultado.totalMobilidade}`);
    console.log(`- Vinculados por CNPJ CNES:  ${resultado.totalVinculadosCNPJ}`);
    console.log(`- Sem Vínculo Institucional: ${resultado.totalSemVinculo}`);

    if (resultado.rejeicoes.length > 0) {
      console.log("\nREGISTROS REJEITADOS:");
      for (const r of resultado.rejeicoes) {
        console.log(`  - Linha/Índice ${r.indice}: ${r.motivo}`);
      }
    }

    console.log("\n===============================================================");
  } catch (err) {
    console.error("\nFALHA NA INGESTÃO DO PNCP:", err);
    process.exit(1);
  }
}

main();
