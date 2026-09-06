import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { desformatarCNPJ, validarCNPJ } from "../src/domain/receita/validacao-cnpj";
import { sanitizarRespostaBrasilAPI } from "../src/domain/terceiros/sanitizacao-brasilapi";

const prisma = new PrismaClient();

const CAMINHO_CHECKPOINT = path.join(
  process.cwd(),
  "data",
  "raw",
  "receita",
  "checkpoint_cnpj_terceiro.json"
);

interface ItemConcluido {
  status: "SUCESSO" | "NAO_ENCONTRADO";
  dataConsulta: string;
  razaoSocial?: string | null;
  situacaoCadastral?: string | null;
}

interface ItemErro {
  erro: string;
  statusHttp?: number;
  tentativas: number;
  timestamp: string;
}

interface CheckpointData {
  ultimaAtualizacao: string;
  provedor: string;
  totalCandidatos: number;
  concluidos: Record<string, ItemConcluido>;
  erros: Record<string, ItemErro>;
}

function carregarCheckpoint(): CheckpointData {
  if (fs.existsSync(CAMINHO_CHECKPOINT)) {
    try {
      const raw = fs.readFileSync(CAMINHO_CHECKPOINT, "utf-8");
      return JSON.parse(raw);
    } catch {
      // Cria novo se arquivo corrompido
    }
  }
  return {
    ultimaAtualizacao: new Date().toISOString(),
    provedor: "BRASIL_API",
    totalCandidatos: 0,
    concluidos: {},
    erros: {},
  };
}

function salvarCheckpoint(checkpoint: CheckpointData): void {
  checkpoint.ultimaAtualizacao = new Date().toISOString();
  const dir = path.dirname(CAMINHO_CHECKPOINT);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CAMINHO_CHECKPOINT, JSON.stringify(checkpoint, null, 2), "utf-8");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function obterCnpjsCandidatos(): Promise<string[]> {
  const caminhoApuracao = path.join(
    process.cwd(),
    "data",
    "raw",
    "receita",
    "apuracao_universo_candidatos_gate4.json"
  );

  if (fs.existsSync(caminhoApuracao)) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(caminhoApuracao, "utf-8"));
      const universo = conteudo.universo_prioritario_unificado_deduplicado || conteudo.universo_prioritario_combinado;
      if (universo && Array.isArray(universo.cnpjs_unicos)) {
        return universo.cnpjs_unicos.filter(validarCNPJ);
      }
    } catch {
      // Fallback para query no banco
    }
  }

  // Consulta direta ao banco de dados canônico
  const instituicoes = await prisma.instituicao.findMany({
    where: {
      tipoDado: "FATO_OFICIAL",
      grupoEconomico: {
        natureza: "PRIVADO",
      },
      OR: [
        {
          segmentacao: {
            segmento: { in: ["NUCLEO_HOSPITALAR", "SAUDE_CORPORATIVA_EXPANDIDA"] },
          },
        },
        {
          grupoEconomico: {
            instituicoes: {
              some: {},
            },
          },
        },
      ],
    },
    select: {
      cnes: true,
    },
  });

  const cnesList = instituicoes.map((i) => i.cnes).filter((c): c is string => Boolean(c));
  const registrosCnes = await prisma.registroBrutoCNES.findMany({
    where: {
      cnes: { in: cnesList },
      status: "ACEITO",
    },
    select: {
      payloadJson: true,
    },
  });

  const cnpjsValidos = new Set<string>();
  for (const reg of registrosCnes) {
    if (!reg.payloadJson) continue;
    try {
      const parsed = JSON.parse(reg.payloadJson);
      const raw = parsed.NU_CNPJ || parsed.cnpj || "";
      const limpo = desformatarCNPJ(String(raw));
      if (validarCNPJ(limpo)) {
        cnpjsValidos.add(limpo);
      }
    } catch {
      // Ignora erro de parse
    }
  }

  return Array.from(cnpjsValidos).sort();
}

async function consultarBrasilApi(cnpj: string): Promise<{
  sucesso: boolean;
  statusHttp: number;
  data?: unknown;
  erro?: string;
}> {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "ChameInteligencia/0.1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 200) {
      const json = await res.json();
      return { sucesso: true, statusHttp: 200, data: json };
    } else if (res.status === 404) {
      return { sucesso: false, statusHttp: 404, erro: "CNPJ não encontrado na base pública (HTTP 404)" };
    } else if (res.status === 429) {
      return { sucesso: false, statusHttp: 429, erro: "Limite de requisições excedido (Rate Limit HTTP 429)" };
    } else {
      return { sucesso: false, statusHttp: res.status, erro: `HTTP ${res.status} ${res.statusText}` };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error && err.name === "AbortError" ? "Timeout de requisição (>10s)" : String(err);
    return { sucesso: false, statusHttp: 0, erro: msg };
  }
}

async function processarCnpjIndividual(
  cnpj: string,
  checkpoint: CheckpointData,
  camposDisponiveis: Set<string>
): Promise<"SUCESSO" | "NAO_ENCONTRADO" | "ERRO"> {
  let consulta = await consultarBrasilApi(cnpj);

  // Se rate limit (429), tenta uma vez após espera de 8 segundos
  if (consulta.statusHttp === 429) {
    await sleep(8000);
    consulta = await consultarBrasilApi(cnpj);
  }

  if (consulta.sucesso && consulta.data) {
    try {
      const urlFonte = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
      const sanitizado = sanitizarRespostaBrasilAPI(consulta.data, cnpj, urlFonte);

      if (sanitizado.razaoSocial) camposDisponiveis.add("razaoSocial");
      if (sanitizado.nomeFantasia) camposDisponiveis.add("nomeFantasia");
      if (sanitizado.situacaoCadastral) camposDisponiveis.add("situacaoCadastral");
      if (sanitizado.dataSituacao) camposDisponiveis.add("dataSituacao");
      if (sanitizado.dataInicioAtividade) camposDisponiveis.add("dataInicioAtividade");
      if (sanitizado.cnaePrincipal) camposDisponiveis.add("cnaePrincipal");
      if (sanitizado.naturezaJuridica) camposDisponiveis.add("naturezaJuridica");
      if (sanitizado.porte) camposDisponiveis.add("porte");
      if (sanitizado.capitalSocial !== null) camposDisponiveis.add("capitalSocial");
      if (sanitizado.municipio) camposDisponiveis.add("municipio");
      if (sanitizado.uf) camposDisponiveis.add("uf");
      if (sanitizado.matrizFilial) camposDisponiveis.add("matrizFilial");

      await prisma.enriquecimentoCNPJTerceiro.upsert({
        where: { cnpj: sanitizado.cnpj },
        create: {
          cnpj: sanitizado.cnpj,
          provedor: sanitizado.provedor,
          razaoSocial: sanitizado.razaoSocial,
          nomeFantasia: sanitizado.nomeFantasia,
          situacaoCadastral: sanitizado.situacaoCadastral,
          dataSituacao: sanitizado.dataSituacao,
          dataInicioAtividade: sanitizado.dataInicioAtividade,
          cnaePrincipal: sanitizado.cnaePrincipal,
          naturezaJuridica: sanitizado.naturezaJuridica,
          porte: sanitizado.porte,
          capitalSocial: sanitizado.capitalSocial,
          municipio: sanitizado.municipio,
          uf: sanitizado.uf,
          matrizFilial: sanitizado.matrizFilial,
          fonteUrl: sanitizado.fonteUrl,
          dataConsulta: sanitizado.dataConsulta,
          dataReferencia: sanitizado.dataReferencia,
          hashResposta: sanitizado.hashResposta,
          tipoDado: sanitizado.tipoDado,
          confianca: sanitizado.confianca,
          statusRevisao: sanitizado.statusRevisao,
        },
        update: {
          razaoSocial: sanitizado.razaoSocial,
          nomeFantasia: sanitizado.nomeFantasia,
          situacaoCadastral: sanitizado.situacaoCadastral,
          dataSituacao: sanitizado.dataSituacao,
          dataInicioAtividade: sanitizado.dataInicioAtividade,
          cnaePrincipal: sanitizado.cnaePrincipal,
          naturezaJuridica: sanitizado.naturezaJuridica,
          porte: sanitizado.porte,
          capitalSocial: sanitizado.capitalSocial,
          municipio: sanitizado.municipio,
          uf: sanitizado.uf,
          matrizFilial: sanitizado.matrizFilial,
          hashResposta: sanitizado.hashResposta,
          dataConsulta: sanitizado.dataConsulta,
          dataReferencia: sanitizado.dataReferencia,
        },
      });

      checkpoint.concluidos[cnpj] = {
        status: "SUCESSO",
        dataConsulta: new Date().toISOString(),
        razaoSocial: sanitizado.razaoSocial,
        situacaoCadastral: sanitizado.situacaoCadastral,
      };
      delete checkpoint.erros[cnpj];
      return "SUCESSO";
    } catch (err) {
      checkpoint.erros[cnpj] = {
        erro: `Erro sanitizacao: ${err}`,
        tentativas: (checkpoint.erros[cnpj]?.tentativas || 0) + 1,
        timestamp: new Date().toISOString(),
      };
      return "ERRO";
    }
  } else if (consulta.statusHttp === 404) {
    checkpoint.concluidos[cnpj] = {
      status: "NAO_ENCONTRADO",
      dataConsulta: new Date().toISOString(),
    };
    return "NAO_ENCONTRADO";
  } else {
    checkpoint.erros[cnpj] = {
      erro: consulta.erro || `HTTP ${consulta.statusHttp}`,
      statusHttp: consulta.statusHttp,
      tentativas: (checkpoint.erros[cnpj]?.tentativas || 0) + 1,
      timestamp: new Date().toISOString(),
    };
    return "ERRO";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const modoPiloto = args.includes("--piloto");
  const argLimite = args.find((a) => a.startsWith("--limite="));
  const limiteMaximo = argLimite ? parseInt(argLimite.split("=")[1], 10) : (modoPiloto ? 10 : undefined);
  const argIntervalo = args.find((a) => a.startsWith("--intervalo="));
  const intervaloMs = argIntervalo ? parseInt(argIntervalo.split("=")[1], 10) : (modoPiloto ? 250 : 180);
  const argConcorrencia = args.find((a) => a.startsWith("--concorrencia="));
  const concorrencia = argConcorrencia ? parseInt(argConcorrencia.split("=")[1], 10) : (modoPiloto ? 1 : 2);

  console.log("================================================================================");
  console.log("CHAME INTELIGÊNCIA — ENRIQUECIMENTO DE CNPJ POR FONTE AUXILIAR (BRASILAPI)");
  console.log(`Modo: ${modoPiloto ? "PILOTO (10 CNPJs)" : "LOTE COMPLETO"}`);
  console.log(`Concorrência: ${concorrencia} workers simultâneos`);
  console.log(`Intervalo base entre requisições: ${intervaloMs}ms`);
  console.log(`Data e hora: ${new Date().toISOString()}`);
  console.log("================================================================================\n");

  const checkpoint = carregarCheckpoint();
  const cnpjsCandidatos = await obterCnpjsCandidatos();
  checkpoint.totalCandidatos = cnpjsCandidatos.length;

  console.log(`Universo de CNPJs únicos válidos identificados: ${cnpjsCandidatos.length}`);
  const concluidosAnteriormente = Object.keys(checkpoint.concluidos).length;
  console.log(`CNPJs já concluídos no checkpoint: ${concluidosAnteriormente}`);

  let pendentes = cnpjsCandidatos.filter((c) => !checkpoint.concluidos[c]);
  if (limiteMaximo !== undefined) {
    pendentes = pendentes.slice(0, limiteMaximo);
  }

  console.log(`Total a processar nesta execução: ${pendentes.length}\n`);

  let sucessos = 0;
  let naoEncontrados = 0;
  let erros = 0;
  const camposDisponiveis = new Set<string>();
  const inicioLote = Date.now();

  // Execução com pool de workers concorrentes
  let indiceAtual = 0;
  let totalProcessado = 0;

  async function worker(workerId: number) {
    while (indiceAtual < pendentes.length) {
      const i = indiceAtual++;
      const cnpj = pendentes[i];
      const progresso = (((totalProcessado + 1) / pendentes.length) * 100).toFixed(1);

      const res = await processarCnpjIndividual(cnpj, checkpoint, camposDisponiveis);
      totalProcessado++;

      if (res === "SUCESSO") {
        sucessos++;
        if (totalProcessado % 25 === 0 || totalProcessado === pendentes.length || modoPiloto) {
          console.log(`[W${workerId}] [${totalProcessado}/${pendentes.length} - ${progresso}%] CNPJ ${cnpj} -> SUCESSO (${checkpoint.concluidos[cnpj]?.razaoSocial?.slice(0, 25) || "OK"})`);
        }
      } else if (res === "NAO_ENCONTRADO") {
        naoEncontrados++;
        console.log(`[W${workerId}] [${totalProcessado}/${pendentes.length} - ${progresso}%] CNPJ ${cnpj} -> NÃO ENCONTRADO (404)`);
      } else {
        erros++;
        console.log(`[W${workerId}] [${totalProcessado}/${pendentes.length} - ${progresso}%] CNPJ ${cnpj} -> ERRO (${checkpoint.erros[cnpj]?.erro})`);
      }

      if (totalProcessado % 20 === 0) {
        salvarCheckpoint(checkpoint);
      }

      if (intervaloMs > 0) {
        await sleep(intervaloMs);
      }
    }
  }

  const workers = Array.from({ length: concorrencia }, (_, id) => worker(id + 1));
  await Promise.all(workers);

  salvarCheckpoint(checkpoint);

  const tempoTotalMs = Date.now() - inicioLote;
  const taxaSucesso = pendentes.length > 0 ? ((sucessos / pendentes.length) * 100).toFixed(1) : "0.0";

  console.log("\n================================================================================");
  console.log(modoPiloto ? "RELATÓRIO DO PILOTO (10 CNPJs)" : "RELATÓRIO DE EXECUÇÃO DO LOTE");
  console.log("================================================================================");
  console.log(`Total solicitados nesta execução: ${pendentes.length}`);
  console.log(`Resolvidos com sucesso (HTTP 200): ${sucessos}`);
  console.log(`Não encontrados (HTTP 404): ${naoEncontrados}`);
  console.log(`Erros / Falhas de rede: ${erros}`);
  console.log(`Tempo total decorrido: ${(tempoTotalMs / 1000).toFixed(2)}s`);
  console.log(`Taxa de sucesso: ${taxaSucesso}%`);
  console.log(`Campos corporativos obtidos: ${Array.from(camposDisponiveis).join(", ") || "Nenhum"}`);
  console.log(`Campos pessoais descartados (LGPD): qsa, socios, administradores, cpf, telefones, emails`);
  console.log(`Classificação canônica atribuída: DADO_TERCEIRO_NAO_CANONICO`);
  console.log(`Total acumulado de CNPJs concluídos no checkpoint: ${Object.keys(checkpoint.concluidos).length}/${checkpoint.totalCandidatos}`);
  console.log("================================================================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
