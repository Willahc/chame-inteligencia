import { PrismaClient } from "@prisma/client";
import { extrairCandidatosNucleoHospitalar } from "../src/domain/receita/candidatos";

const prisma = new PrismaClient();

interface ResultadoEndpoint {
  nome: string;
  url: string;
  metodo: string;
  status: number | null;
  erro: string | null;
  tempoMs: number;
}

async function testarEndpoint(nome: string, url: string, metodo: string = "GET"): Promise<ResultadoEndpoint> {
  const inicio = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(url, {
      method: metodo,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return {
      nome,
      url,
      metodo,
      status: resp.status,
      erro: resp.ok ? null : `HTTP ${resp.status} ${resp.statusText}`,
      tempoMs: Date.now() - inicio,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    return {
      nome,
      url,
      metodo,
      status: null,
      erro: (err instanceof Error && err.name === "AbortError") ? "Tempo limite excedido (timeout 5s)" : (err instanceof Error ? err.message : String(err)),
      tempoMs: Date.now() - inicio,
    };
  }
}

async function main() {
  console.log("================================================================================");
  console.log("CHAME INTELIGÊNCIA — DIAGNÓSTICO DE CONECTIVIDADE E CANDIDATOS RECEITA FEDERAL");
  console.log(`Data e hora: ${new Date().toISOString()}`);
  console.log("================================================================================\n");

  console.log("1. TESTANDO CONECTIVIDADE COM ENDPOINTS OFICIAIS (1 tentativa controlada):\n");

  const endpoints = [
    { nome: "Repositório Aberto RFB", url: "https://dadosabertos.rfb.gov.br/CNPJ/", metodo: "GET" },
    { nome: "WebDAV Serpro+ RFB", url: "https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ/", metodo: "GET" },
    { nome: "API Dados Abertos Gov", url: "https://dados.gov.br/api/publico/conjuntos-dados/visualizar/cadastro-nacional-da-pessoa-juridica---cnpj", metodo: "GET" },
    { nome: "Página Metadados RFB", url: "https://www.gov.br/receitafederal/dados", metodo: "GET" },
  ];

  const resultados: ResultadoEndpoint[] = [];
  for (const ep of endpoints) {
    process.stdout.write(`- [${ep.nome}] ${ep.url}... `);
    const res = await testarEndpoint(ep.nome, ep.url, ep.metodo);
    resultados.push(res);
    if (res.status === 200) {
      console.log(`DISPONÍVEL (${res.status}) [${res.tempoMs}ms]`);
    } else {
      console.log(`BLOQUEADO (${res.erro}) [${res.tempoMs}ms]`);
    }
  }

  console.log("\n2. APURAÇÃO DO UNIVERSO CANDIDATO LOCAL (NÚCLEO HOSPITALAR PRIVADO):\n");

  const instituicoesHospitalares = await prisma.instituicao.findMany({
    where: {
      tipoDado: "FATO_OFICIAL",
      segmentacao: {
        segmento: "NUCLEO_HOSPITALAR",
      },
      grupoEconomico: {
        natureza: "PRIVADO",
      },
    },
    include: {
      unidades: true,
    },
  });

  const cnesList = instituicoesHospitalares.map((i) => i.cnes).filter((c): c is string => Boolean(c));

  const registrosCnes = await prisma.registroBrutoCNES.findMany({
    where: {
      cnes: { in: cnesList },
      status: "ACEITO",
    },
    select: {
      cnes: true,
      payloadJson: true,
    },
  });

  const payloadPorCnes = new Map<string, string>();
  for (const r of registrosCnes) {
    if (r.cnes && r.payloadJson) {
      payloadPorCnes.set(r.cnes, r.payloadJson);
    }
  }

  const candidatosInput = instituicoesHospitalares.map((i) => ({
    id: i.id,
    nome: i.nome,
    cnes: i.cnes,
    payloadJson: (i.cnes && payloadPorCnes.get(i.cnes)) || null,
  }));

  const resumo = extrairCandidatosNucleoHospitalar(candidatosInput);

  console.log(`Total de unidades privadas analisadas: ${resumo.totalUnidadesAnalisadas}`);
  console.log(`Unidades com CNPJ válido: ${resumo.unidadesComCnpjValido}`);
  console.log(`Unidades sem CNPJ ou inválido (ausências): ${resumo.unidadesSemCnpjOuInvalido}`);
  console.log(`CNPJs únicos válidos: ${resumo.cnpjsUnicosValidos.length}`);
  console.log(`CNPJs básicos únicos válidos: ${resumo.cnpjsBasicosValidos.length}`);

  console.log("\n3. DECLARAÇÃO FORMAL DO GATE:\n");
  const downloadDisponivel = resultados.some((r) => r.nome === "Repositório Aberto RFB" && r.status === 200);

  if (downloadDisponivel) {
    console.log("GATE 4 — PRONTO PARA INGESTÃO");
  } else {
    console.log("GATE 4 — AGUARDANDO DISPONIBILIDADE DA FONTE OFICIAL");
    console.log("Motivo: O repositório oficial de download (dadosabertos.rfb.gov.br) permanece inacessível.");
    console.log("Governança: Nenhuma fonte alternativa de terceiros ou espelho foi utilizada.");
  }
  console.log("================================================================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
