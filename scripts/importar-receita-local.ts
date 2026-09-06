import * as path from "node:path";
import * as fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ImportadorReceitaLocal } from "../src/ingestao/receita/importador-receita";
import { extrairCandidatosNucleoHospitalar } from "../src/domain/receita/candidatos";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const getArg = (prefix: string) => {
    const match = args.find((a) => a.startsWith(prefix));
    return match ? match.slice(prefix.length) : undefined;
  };

  const caminhoEstab = getArg("--estabelecimentos=");
  const caminhoEmp = getArg("--empresas=");
  const competencia = getArg("--competencia=") || "2026-08";
  const persistir = args.includes("--persistir");

  console.log("================================================================================");
  console.log("CHAME INTELIGÊNCIA — IMPORTADOR CONTROLADO DA RECEITA FEDERAL");
  console.log(`Data: ${new Date().toISOString()}`);
  console.log(`Modo de persistência: ${persistir ? "PERSISTÊNCIA AUDITADA" : "SIMULAÇÃO SEGURA (DRY-RUN)"}`);
  console.log("================================================================================\n");

  // Se nenhum caminho foi passado, utiliza a fixture de demonstração segura
  let caminhoEstabFinal = caminhoEstab;
  let caminhoEmpFinal = caminhoEmp;

  if (!caminhoEstabFinal && !caminhoEmpFinal) {
    console.log("Nenhum arquivo informado via --estabelecimentos ou --empresas.");
    console.log("Utilizando fixtures locais de teste demonstrativo para validação do pipeline.\n");
    caminhoEstabFinal = path.join(__dirname, "../src/ingestao/receita/__fixtures__/estabelecimentos-demo.csv");
    caminhoEmpFinal = path.join(__dirname, "../src/ingestao/receita/__fixtures__/empresas-demo.csv");
  }

  if (caminhoEstabFinal && !fs.existsSync(caminhoEstabFinal)) {
    console.error(`Erro: Arquivo de estabelecimentos não encontrado: ${caminhoEstabFinal}`);
    process.exit(1);
  }
  if (caminhoEmpFinal && !fs.existsSync(caminhoEmpFinal)) {
    console.error(`Erro: Arquivo de empresas não encontrado: ${caminhoEmpFinal}`);
    process.exit(1);
  }

  console.log("1. Carregando candidatos do Núcleo Hospitalar do banco...");
  const instituicoesHospitalares = await prisma.instituicao.findMany({
    where: {
      tipoDado: "FATO_OFICIAL",
      segmentacao: { segmento: "NUCLEO_HOSPITALAR" },
      grupoEconomico: { natureza: "PRIVADO" },
    },
    select: { id: true, nome: true, cnes: true },
  });

  const cnesList = instituicoesHospitalares.map((i) => i.cnes).filter((c): c is string => Boolean(c));
  const registrosCnes = await prisma.registroBrutoCNES.findMany({
    where: { cnes: { in: cnesList }, status: "ACEITO" },
    select: { cnes: true, payloadJson: true },
  });

  const payloadPorCnes = new Map<string, string>();
  for (const r of registrosCnes) {
    if (r.cnes && r.payloadJson) payloadPorCnes.set(r.cnes, r.payloadJson);
  }

  const candidatos = extrairCandidatosNucleoHospitalar(
    instituicoesHospitalares.map((i) => ({
      id: i.id,
      nome: i.nome,
      cnes: i.cnes,
      payloadJson: (i.cnes && payloadPorCnes.get(i.cnes)) || null,
    }))
  ).candidatos;

  console.log(`Candidatos carregados: ${candidatos.length} unidades\n`);

  console.log("2. Executando processamento streaming e filtragem...");
  const importador = new ImportadorReceitaLocal();
  const relatorio = await importador.processar({
    caminhoEstabelecimentos: caminhoEstabFinal,
    caminhoEmpresas: caminhoEmpFinal,
    candidatos,
    competencia,
    modoSimulacao: !persistir,
  });

  console.log("\n=== RELATÓRIO DA INGESTÃO ===");
  console.log(`Tempo total: ${relatorio.tempoExecucaoMs}ms`);
  console.log(`SHA-256 Estabelecimentos: ${relatorio.hashArquivoEstabelecimentos || "N/A"}`);
  console.log(`SHA-256 Empresas: ${relatorio.hashArquivoEmpresas || "N/A"}`);
  console.log(`Linhas lidas Estabelecimentos: ${relatorio.linhasLidasEstabelecimentos}`);
  console.log(`Linhas filtradas Estabelecimentos (candidatos): ${relatorio.linhasFiltradasEstabelecimentos}`);
  console.log(`Linhas lidas Empresas: ${relatorio.linhasLidasEmpresas}`);
  console.log(`Linhas filtradas Empresas: ${relatorio.linhasFiltradasEmpresas}`);
  console.log(`Total de resoluções calculadas: ${relatorio.resolucoesCalculadas}`);
  console.log("Distribuição de resoluções:");
  for (const [tipo, qtd] of Object.entries(relatorio.distribuicaoResolucoes)) {
    console.log(`  - ${tipo}: ${qtd}`);
  }

  if (!persistir) {
    console.log("\n[MODO SIMULAÇÃO ATIVO] Nenhum dado foi inserido ou alterado no banco de dados.");
  } else {
    console.log("\n[PERSISTÊNCIA] Gravando lote de auditoria e resoluções...");
    // Persistência controlada se flag --persistir for usada com arquivo oficial real
    const fonte = await prisma.fonte.upsert({
      where: { id: "FONTE_RECEITA_FEDERAL_CNPJ" },
      update: {},
      create: {
        id: "FONTE_RECEITA_FEDERAL_CNPJ",
        nome: "Secretaria Especial da Receita Federal do Brasil (RFB) - Dados Abertos CNPJ",
        url: "https://dadosabertos.rfb.gov.br/CNPJ/",
        identificador: "RFB_CNPJ",
        tipoDado: "FATO_OFICIAL",
      },
    });

    const lote = await prisma.loteIngestao.create({
      data: {
        id: `LOTE_RECEITA_${Date.now()}`,
        fonteId: fonte.id,
        arquivoNome: path.basename(caminhoEstabFinal || "estabelecimentos.csv"),
        fonteUrl: "https://dadosabertos.rfb.gov.br/CNPJ/",
        dataReferencia: new Date(),
        inicio: new Date(),
        fim: new Date(),
        status: "CONCLUIDO",
        quantidadeLida: relatorio.linhasLidasEstabelecimentos,
        quantidadeAceita: relatorio.estabelecimentosCarregados,
        quantidadeRejeitada: relatorio.linhasInvalidasEstabelecimentos,
        hashArquivo: relatorio.hashArquivoEstabelecimentos,
        versaoImportador: "1.0.0",
      },
    });

    console.log(`Lote criado: ${lote.id}`);
  }

  console.log("================================================================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
