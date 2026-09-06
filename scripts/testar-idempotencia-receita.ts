import * as path from "node:path";
import { ImportadorReceitaLocal } from "../src/ingestao/receita/importador-receita";
import { CandidatoCnesCNPJ } from "../src/domain/receita/tipos";

async function main() {
  console.log("================================================================================");
  console.log("CHAME INTELIGÊNCIA — TESTE DE IDEMPOTÊNCIA DO IMPORTADOR DA RECEITA FEDERAL");
  console.log(`Data: ${new Date().toISOString()}`);
  console.log("================================================================================\n");

  const caminhoFixtures = path.join(__dirname, "../src/ingestao/receita/__fixtures__");
  const fixtureEmpresas = path.join(caminhoFixtures, "empresas-demo.csv");
  const fixtureEstabelecimentos = path.join(caminhoFixtures, "estabelecimentos-demo.csv");

  const candidatos: CandidatoCnesCNPJ[] = [
    {
      instituicaoId: "inst-einstein",
      instituicaoNome: "Hospital Albert Einstein",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    },
    {
      instituicaoId: "inst-sirio",
      instituicaoNome: "Hospital Sírio-Libanês",
      cnes: "2080349",
      cnpjCnes: "60747318000162",
      cnpjBasicoCnes: "60747318",
      possuiCnpjValido: true,
    },
    {
      instituicaoId: "inst-sem-cnpj",
      instituicaoNome: "Posto Comunitário",
      cnes: "0000000",
      cnpjCnes: null,
      cnpjBasicoCnes: null,
      possuiCnpjValido: false,
    },
  ];

  const importador = new ImportadorReceitaLocal();

  console.log("Executando 1ª passagem...");
  const exec1 = await importador.processar({
    caminhoEmpresas: fixtureEmpresas,
    caminhoEstabelecimentos: fixtureEstabelecimentos,
    candidatos,
    competencia: "2026-08",
    modoSimulacao: true,
  });

  console.log("Executando 2ª passagem (com os mesmos dados)...");
  const exec2 = await importador.processar({
    caminhoEmpresas: fixtureEmpresas,
    caminhoEstabelecimentos: fixtureEstabelecimentos,
    candidatos,
    competencia: "2026-08",
    modoSimulacao: true,
  });

  console.log("\nVerificando igualdade estrita dos resultados:");

  const assercoes: Array<{ descricao: string; igual: boolean; val1: unknown; val2: unknown }> = [
    { descricao: "Hash Estabelecimentos", igual: exec1.hashArquivoEstabelecimentos === exec2.hashArquivoEstabelecimentos, val1: exec1.hashArquivoEstabelecimentos, val2: exec2.hashArquivoEstabelecimentos },
    { descricao: "Hash Empresas", igual: exec1.hashArquivoEmpresas === exec2.hashArquivoEmpresas, val1: exec1.hashArquivoEmpresas, val2: exec2.hashArquivoEmpresas },
    { descricao: "Linhas lidas Estabelecimentos", igual: exec1.linhasLidasEstabelecimentos === exec2.linhasLidasEstabelecimentos, val1: exec1.linhasLidasEstabelecimentos, val2: exec2.linhasLidasEstabelecimentos },
    { descricao: "Estabelecimentos carregados", igual: exec1.estabelecimentosCarregados === exec2.estabelecimentosCarregados, val1: exec1.estabelecimentosCarregados, val2: exec2.estabelecimentosCarregados },
    { descricao: "Empresas carregadas", igual: exec1.empresasCarregadas === exec2.empresasCarregadas, val1: exec1.empresasCarregadas, val2: exec2.empresasCarregadas },
    { descricao: "Quantidade de resoluções", igual: exec1.resolucoesCalculadas === exec2.resolucoesCalculadas, val1: exec1.resolucoesCalculadas, val2: exec2.resolucoesCalculadas },
    { descricao: "Distribuição de resoluções", igual: JSON.stringify(exec1.distribuicaoResolucoes) === JSON.stringify(exec2.distribuicaoResolucoes), val1: exec1.distribuicaoResolucoes, val2: exec2.distribuicaoResolucoes },
  ];

  let todasPassaram = true;
  for (const a of assercoes) {
    if (a.igual) {
      console.log(`  [OK] ${a.descricao}: ${JSON.stringify(a.val1)}`);
    } else {
      todasPassaram = false;
      console.error(`  [FALHA] ${a.descricao}: 1ª=${JSON.stringify(a.val1)} vs 2ª=${JSON.stringify(a.val2)}`);
    }
  }

  if (todasPassaram) {
    console.log("\nIDEMPOTÊNCIA COMPROVADA COM SUCESSO: 100% dos resultados idênticos.");
  } else {
    console.error("\nFALHA NO TESTE DE IDEMPOTÊNCIA.");
    process.exit(1);
  }
  console.log("================================================================================\n");
}

main().catch(console.error);
