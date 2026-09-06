import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { NivelConfianca, StatusLote, StatusRevisao, TipoDado } from "@prisma/client";

export const ID_FONTE_ANS = "FONTE_ANS_CADOP";
export const CAMINHO_PADRAO_ANS = "data/raw/ans/2026-09-04/Relatorio_cadop.csv";

export interface RegistroANSSanitizado {
  registroAns: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  modalidade: string;
  situacao: string;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  cep: string | null;
  regiaoComercializacao: number | null;
  dataRegistroAns: Date | null;
}

export interface ResultadoIngestaoANS {
  loteId: string;
  arquivoOrigem: string;
  hashArquivo: string;
  totalLidos: number;
  totalAceitos: number;
  totalRejeitados: number;
  totalInseridos: number;
  totalAtualizados: number;
  totalInalterados: number;
}

export async function garantirFonteANS(): Promise<void> {
  await prisma.fonte.upsert({
    where: { id: ID_FONTE_ANS },
    update: {
      nome: "Agência Nacional de Saúde Suplementar — Operadoras Ativas (CADOP)",
      url: "https://dados.gov.br/dados/conjuntos-dados/operadoras-de-planos-de-saude-ativas",
      identificador: "ANS-CADOP-2026",
      tipoDado: TipoDado.FATO_OFICIAL,
    },
    create: {
      id: ID_FONTE_ANS,
      nome: "Agência Nacional de Saúde Suplementar — Operadoras Ativas (CADOP)",
      url: "https://dados.gov.br/dados/conjuntos-dados/operadoras-de-planos-de-saude-ativas",
      identificador: "ANS-CADOP-2026",
      tipoDado: TipoDado.FATO_OFICIAL,
    },
  });
}

function limparValor(val: string | undefined): string {
  if (!val) return "";
  let v = val.trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function parseLinhaCSV(linha: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let emAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    if (char === '"') {
      if (emAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        emAspas = !emAspas;
      }
    } else if (char === ";" && !emAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += char;
    }
  }
  campos.push(atual);
  return campos;
}

export function sanitizarLinhaANS(cabecalho: string[], linha: string): RegistroANSSanitizado | null {
  const campos = parseLinhaCSV(linha);
  if (campos.length < cabecalho.length) return null;

  const item: Record<string, string> = {};
  for (let i = 0; i < cabecalho.length; i++) {
    item[cabecalho[i]] = limparValor(campos[i]);
  }

  const registroAns = item.REGISTRO_OPERADORA;
  const cnpjLimpo = (item.CNPJ || "").replace(/\D/g, "").padStart(14, "0");
  const razaoSocial = item.RAZAO_SOCIAL;
  const modalidade = item.MODALIDADE || "Não informada";
  const cidade = item.CIDADE || "Não informada";
  const uf = (item.UF || "").toUpperCase();

  if (!registroAns || !cnpjLimpo || cnpjLimpo.length !== 14 || !razaoSocial) {
    return null;
  }

  let dataRegistro: Date | null = null;
  if (item.DATA_REGISTRO_ANS) {
    const d = new Date(item.DATA_REGISTRO_ANS);
    if (!isNaN(d.getTime())) {
      dataRegistro = d;
    }
  }

  let regiaoComercializacao: number | null = null;
  if (item.REGIAO_DE_COMERCIALIZACAO && !isNaN(Number(item.REGIAO_DE_COMERCIALIZACAO))) {
    regiaoComercializacao = Number(item.REGIAO_DE_COMERCIALIZACAO);
  }

  // DESCARTAR TOTALMENTE: REPRESENTANTE, TELEFONE, FAX, ENDERECO_ELETRONICO
  return {
    registroAns,
    cnpj: cnpjLimpo,
    razaoSocial,
    nomeFantasia: item.NOME_FANTASIA || null,
    modalidade,
    situacao: "Ativa",
    logradouro: item.LOGRADOURO || null,
    numero: item.NUMERO || null,
    complemento: item.COMPLEMENTO || null,
    bairro: item.BAIRRO || null,
    cidade,
    uf,
    cep: item.CEP || null,
    regiaoComercializacao,
    dataRegistroAns: dataRegistro,
  };
}

export async function importarOperadorasANSLocal(
  caminhoArquivo: string = CAMINHO_PADRAO_ANS,
): Promise<ResultadoIngestaoANS> {
  const caminhoAbsoluto = resolve(process.cwd(), caminhoArquivo);
  if (!existsSync(caminhoAbsoluto)) {
    throw new Error(`Arquivo local da ANS não encontrado: ${caminhoAbsoluto}`);
  }

  await garantirFonteANS();

  const buffer = readFileSync(caminhoAbsoluto);
  const hashArquivo = createHash("sha256").update(buffer).digest("hex");
  const dataLote = new Date();
  const loteId = `lote-ans-cadop-${dataLote.toISOString().slice(0, 10)}`;

  const lote = await prisma.loteIngestao.upsert({
    where: { id: loteId },
    update: {
      arquivoNome: caminhoArquivo,
      inicio: dataLote,
      status: StatusLote.EM_PROCESSAMENTO,
      hashArquivo,
    },
    create: {
      id: loteId,
      fonteId: ID_FONTE_ANS,
      arquivoNome: caminhoArquivo,
      fonteUrl: "https://dados.gov.br/dados/conjuntos-dados/operadoras-de-planos-de-saude-ativas",
      dataReferencia: new Date("2026-09-04"),
      inicio: dataLote,
      status: StatusLote.EM_PROCESSAMENTO,
      versaoImportador: "1.0.0",
      hashArquivo,
    },
  });

  const texto = buffer.toString("latin1");
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (linhas.length < 2) {
    throw new Error("Arquivo da ANS vazio ou sem cabeçalho válido.");
  }

  const cabecalho = parseLinhaCSV(linhas[0]).map(limparValor);
  let totalLidos = 0;
  let totalAceitos = 0;
  let totalRejeitados = 0;
  let totalInseridos = 0;
  let totalAtualizados = 0;
  let totalInalterados = 0;

  // Carregar operadoras existentes para checagem de idempotência
  const existentes = await prisma.operadoraANS.findMany({
    select: {
      id: true,
      registroAns: true,
      cnpj: true,
      razaoSocial: true,
      nomeFantasia: true,
      modalidade: true,
    },
  });
  const mapaExistentes = new Map(existentes.map((e) => [e.registroAns, e]));

  for (let i = 1; i < linhas.length; i++) {
    totalLidos++;
    const sanitizado = sanitizarLinhaANS(cabecalho, linhas[i]);
    if (!sanitizado) {
      totalRejeitados++;
      continue;
    }

    totalAceitos++;
    const anterior = mapaExistentes.get(sanitizado.registroAns);

    if (!anterior) {
      await prisma.operadoraANS.create({
        data: {
          id: `ans-op-${sanitizado.registroAns}`,
          registroAns: sanitizado.registroAns,
          cnpj: sanitizado.cnpj,
          razaoSocial: sanitizado.razaoSocial,
          nomeFantasia: sanitizado.nomeFantasia,
          modalidade: sanitizado.modalidade,
          situacao: sanitizado.situacao,
          logradouro: sanitizado.logradouro,
          numero: sanitizado.numero,
          complemento: sanitizado.complemento,
          bairro: sanitizado.bairro,
          cidade: sanitizado.cidade,
          uf: sanitizado.uf,
          cep: sanitizado.cep,
          regiaoComercializacao: sanitizado.regiaoComercializacao,
          dataRegistroAns: sanitizado.dataRegistroAns,
          fonteId: ID_FONTE_ANS,
          loteId: lote.id,
          tipoDado: TipoDado.FATO_OFICIAL,
          confianca: NivelConfianca.ALTA,
          statusRevisao: StatusRevisao.APROVADA,
        },
      });
      totalInseridos++;
    } else {
      const houveMudanca =
        anterior.cnpj !== sanitizado.cnpj ||
        anterior.razaoSocial !== sanitizado.razaoSocial ||
        anterior.nomeFantasia !== sanitizado.nomeFantasia ||
        anterior.modalidade !== sanitizado.modalidade;

      if (houveMudanca) {
        await prisma.operadoraANS.update({
          where: { registroAns: sanitizado.registroAns },
          data: {
            cnpj: sanitizado.cnpj,
            razaoSocial: sanitizado.razaoSocial,
            nomeFantasia: sanitizado.nomeFantasia,
            modalidade: sanitizado.modalidade,
            cidade: sanitizado.cidade,
            uf: sanitizado.uf,
            atualizadoEm: new Date(),
          },
        });
        totalAtualizados++;
      } else {
        totalInalterados++;
      }
    }
  }

  await prisma.loteIngestao.update({
    where: { id: lote.id },
    data: {
      fim: new Date(),
      status: StatusLote.CONCLUIDO,
      quantidadeLida: totalLidos,
      quantidadeAceita: totalAceitos,
      quantidadeRejeitada: totalRejeitados,
      quantidadeAtualizada: totalAtualizados,
      quantidadePublicada: totalInseridos,
    },
  });

  return {
    loteId: lote.id,
    arquivoOrigem: caminhoArquivo,
    hashArquivo,
    totalLidos,
    totalAceitos,
    totalRejeitados,
    totalInseridos,
    totalAtualizados,
    totalInalterados,
  };
}
