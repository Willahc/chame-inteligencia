import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { NivelConfianca, TipoDado } from "@prisma/client";

export const ID_FONTE_IBGE = "FONTE_IBGE";
export const CAMINHO_PADRAO_IBGE = "data/raw/ibge/municipios_ibge.json";

export interface ItemIBGEBruto {
  id: number;
  nome: string;
  microrregiao?: {
    id: number;
    nome: string;
    mesorregiao?: {
      id: number;
      nome: string;
      UF?: {
        id: number;
        sigla: string;
        nome: string;
        regiao?: {
          id: number;
          sigla: string;
          nome: string;
        };
      };
    };
  };
  "regiao-imediata"?: {
    id: number;
    nome: string;
    "regiao-intermediaria"?: {
      id: number;
      nome: string;
      UF?: {
        id: number;
        sigla: string;
        nome: string;
        regiao?: {
          id: number;
          sigla: string;
          nome: string;
        };
      };
    };
  };
}

export interface ResultadoIngestaoIBGE {
  arquivoOrigem: string;
  hashArquivo: string;
  totalLidos: number;
  totalInseridos: number;
  totalAtualizados: number;
  totalInalterados: number;
}

export async function garantirFonteIBGE(): Promise<void> {
  await prisma.fonte.upsert({
    where: { id: ID_FONTE_IBGE },
    update: {
      nome: "Instituto Brasileiro de Geografia e Estatística — Divisão Territorial",
      url: "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
      identificador: "IBGE-MUNICIPIOS-2026",
      tipoDado: TipoDado.FATO_OFICIAL,
    },
    create: {
      id: ID_FONTE_IBGE,
      nome: "Instituto Brasileiro de Geografia e Estatística — Divisão Territorial",
      url: "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
      identificador: "IBGE-MUNICIPIOS-2026",
      tipoDado: TipoDado.FATO_OFICIAL,
    },
  });
}

export function lerMunicipiosIBGE(caminhoArquivo: string = CAMINHO_PADRAO_IBGE): { buffer: Buffer; itens: ItemIBGEBruto[] } {
  const caminhoAbsoluto = resolve(process.cwd(), caminhoArquivo);
  if (!existsSync(caminhoAbsoluto)) {
    throw new Error(`Arquivo local do IBGE não encontrado: ${caminhoAbsoluto}`);
  }

  const raw = readFileSync(caminhoAbsoluto);
  const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
  const texto = isGzip ? gunzipSync(raw).toString("utf-8") : raw.toString("utf-8");
  const itens = JSON.parse(texto) as ItemIBGEBruto[];
  return { buffer: raw, itens };
}

export async function importarMunicipiosIBGELocal(
  caminhoArquivo: string = CAMINHO_PADRAO_IBGE,
): Promise<ResultadoIngestaoIBGE> {
  await garantirFonteIBGE();

  const { buffer, itens } = lerMunicipiosIBGE(caminhoArquivo);
  const hashArquivo = createHash("sha256").update(buffer).digest("hex");

  const existentes = await prisma.municipioIBGE.findMany({
    select: {
      id: true,
      nome: true,
      codigoIbge6: true,
      ufSigla: true,
    },
  });
  const mapaExistentes = new Map(existentes.map((m) => [m.id, m]));

  let totalLidos = 0;
  let totalInseridos = 0;
  let totalAtualizados = 0;
  let totalInalterados = 0;

  const novosParaInserir = [];

  for (const item of itens) {
    totalLidos++;
    const id7 = String(item.id);
    const codigoIbge6 = id7.slice(0, 6);
    const nome = item.nome;
    const uf =
      item.microrregiao?.mesorregiao?.UF ||
      item["regiao-imediata"]?.["regiao-intermediaria"]?.UF;
    const ufSigla = uf?.sigla || "";
    const ufNome = uf?.nome || "";
    const regiaoNome = uf?.regiao?.nome || "";
    const microrregiao = item.microrregiao?.nome || null;
    const mesorregiao = item.microrregiao?.mesorregiao?.nome || null;
    const regiaoImediata = item["regiao-imediata"]?.nome || null;
    const regiaoIntermediaria = item["regiao-imediata"]?.["regiao-intermediaria"]?.nome || null;

    const anterior = mapaExistentes.get(id7);
    if (!anterior) {
      novosParaInserir.push({
        id: id7,
        codigoIbge6,
        nome,
        ufSigla,
        ufNome,
        regiaoNome,
        microrregiao,
        mesorregiao,
        regiaoImediata,
        regiaoIntermediaria,
        fonteId: ID_FONTE_IBGE,
        tipoDado: TipoDado.FATO_OFICIAL,
        confianca: NivelConfianca.ALTA,
      });
      totalInseridos++;
    } else {
      if (anterior.nome !== nome || anterior.ufSigla !== ufSigla) {
        await prisma.municipioIBGE.update({
          where: { id: id7 },
          data: { nome, ufSigla, ufNome, regiaoNome, microrregiao, mesorregiao },
        });
        totalAtualizados++;
      } else {
        totalInalterados++;
      }
    }
  }

  if (novosParaInserir.length > 0) {
    // Inserção em lotes de 1000
    const tamanhoLote = 1000;
    for (let i = 0; i < novosParaInserir.length; i += tamanhoLote) {
      const pedaco = novosParaInserir.slice(i, i + tamanhoLote);
      await prisma.municipioIBGE.createMany({
        data: pedaco,
      });
    }
  }

  return {
    arquivoOrigem: caminhoArquivo,
    hashArquivo,
    totalLidos,
    totalInseridos,
    totalAtualizados,
    totalInalterados,
  };
}
