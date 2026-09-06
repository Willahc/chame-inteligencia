import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { NivelConfianca, StatusLote, StatusRevisao, TipoDado } from "@prisma/client";
import { carregarMapeamentoCNPJInstituicoes, garantirFontePNCP, ID_FONTE_PNCP } from "./importador-pncp";

export const CAMINHO_CONTRATOS_PNCP = "data/raw/pncp/contratos_pncp_saude_mobilidade_sp_2026.json";

export interface ItemContratoBruto {
  numeroContrato?: string;
  numeroControlePNCP?: string | null;
  tipoContrato?: string;
  objeto?: string;
  orgao?: {
    cnpj?: string;
    razaoSocial?: string;
    esfera?: string;
  };
  unidade?: {
    codigo?: string;
    nome?: string;
    uf?: string;
    municipio?: string;
  };
  fornecedor?: {
    tipoPessoa?: string;
    niFornecedor?: string;
    nomeRazaoSocial?: string;
  };
  valores?: {
    valorInicial?: number;
    valorGlobal?: number;
    valorParcela?: number;
  };
  vigencia?: {
    dataAssinatura?: string;
    dataVigenciaInicio?: string;
    dataVigenciaFim?: string;
  };
  sinalMobilidade?: boolean;
  termosIdentificados?: string[];
  dataPublicacaoPncp?: string;
  urlPublica?: string | null;
}

export interface ResultadoIngestaoContratosPNCP {
  loteId: string;
  arquivoOrigem: string;
  hashArquivo: string;
  totalLidos: number;
  totalInseridos: number;
  totalAtualizados: number;
  totalInalterados: number;
  totalVinculadosCNPJ: number;
  totalSemVinculo: number;
}

export async function importarContratosConfirmadosPNCP(
  caminhoArquivo: string = CAMINHO_CONTRATOS_PNCP,
): Promise<ResultadoIngestaoContratosPNCP> {
  const caminhoAbsoluto = resolve(process.cwd(), caminhoArquivo);
  if (!existsSync(caminhoAbsoluto)) {
    throw new Error(`Arquivo local de contratos do PNCP não encontrado: ${caminhoAbsoluto}`);
  }

  await garantirFontePNCP();

  const buffer = readFileSync(caminhoAbsoluto);
  const hashArquivo = createHash("sha256").update(buffer).digest("hex");
  const itens = JSON.parse(buffer.toString("utf-8")) as ItemContratoBruto[];

  const mapaCNPJ = await carregarMapeamentoCNPJInstituicoes();

  const dataInicio = new Date();
  const loteId = `LOTE_PNCP_CONTRATOS_${dataInicio.toISOString().slice(0, 10)}`;

  const lote = await prisma.loteIngestao.upsert({
    where: { id: loteId },
    update: {
      arquivoNome: caminhoArquivo,
      inicio: dataInicio,
      status: StatusLote.EM_PROCESSAMENTO,
      hashArquivo,
    },
    create: {
      id: loteId,
      fonteId: ID_FONTE_PNCP,
      arquivoNome: caminhoArquivo,
      fonteUrl: "https://pncp.gov.br/api/consulta/v1/contratos",
      dataReferencia: new Date("2026-09-06"),
      inicio: dataInicio,
      status: StatusLote.EM_PROCESSAMENTO,
      versaoImportador: "1.1.0",
      hashArquivo,
    },
  });

  const existentes = await prisma.sinalContratacaoPublica.findMany({
    select: { id: true, identificadorPNCP: true, valorEstimado: true },
  });
  const mapaExistentes = new Map(existentes.map((e) => [e.identificadorPNCP, e]));

  let totalLidos = 0;
  let totalInseridos = 0;
  let totalAtualizados = 0;
  let totalInalterados = 0;
  let totalVinculadosCNPJ = 0;
  let totalSemVinculo = 0;

  for (let idx = 0; idx < itens.length; idx++) {
    const item = itens[idx];
    totalLidos++;

    const cnpjOrgao = (item.orgao?.cnpj || "").replace(/\D/g, "").padStart(14, "0");
    const numContrato = (item.numeroContrato || `NE-${idx}`).trim();
    const itemHash = createHash("sha1")
      .update(JSON.stringify(item) + "_" + idx)
      .digest("hex")
      .slice(0, 10);

    // Deterministic unique ID
    const identificador = item.numeroControlePNCP
      ? `${item.numeroControlePNCP}`
      : `CONTRATO-${cnpjOrgao}-${numContrato}-${itemHash}`;

    const id = `contrato-pncp-${createHash("sha1").update(identificador).digest("hex").slice(0, 16)}`;

    const objeto = (item.objeto || "Contrato sem objeto especificado").trim();
    const modalidade = item.tipoContrato || "Contrato";
    const valor = item.valores?.valorGlobal || item.valores?.valorInicial || null;
    const razaoSocialOrgao = item.unidade?.nome
      ? `${item.orgao?.razaoSocial || "Órgão Público"} — ${item.unidade.nome}`
      : item.orgao?.razaoSocial || "Órgão Público Estadual/Municipal";

    const fornecedorCnpj = (item.fornecedor?.niFornecedor || "").replace(/\D/g, "").padStart(14, "0");
    const fornecedorNome = item.fornecedor?.nomeRazaoSocial || null;

    let dataPub = new Date();
    if (item.dataPublicacaoPncp) {
      const d = new Date(item.dataPublicacaoPncp);
      if (!isNaN(d.getTime())) dataPub = d;
    } else if (item.vigencia?.dataAssinatura) {
      const d = new Date(item.vigencia.dataAssinatura);
      if (!isNaN(d.getTime())) dataPub = d;
    }

    // Vínculo estrito por CNPJ (órgão do hospital)
    let instituicaoId: string | null = null;
    let metodoVinculo: string | null = null;
    let confiancaVinculo: NivelConfianca | null = null;

    if (cnpjOrgao && cnpjOrgao !== "00000000000000") {
      const vinculo = mapaCNPJ.get(cnpjOrgao);
      if (vinculo) {
        instituicaoId = vinculo.instituicaoId;
        metodoVinculo = vinculo.metodoVinculo;
        confiancaVinculo = vinculo.confiancaVinculo === "ALTA" ? NivelConfianca.ALTA : NivelConfianca.MEDIA;
        totalVinculadosCNPJ++;
      } else {
        metodoVinculo = "SEM_VINCULO";
        totalSemVinculo++;
      }
    } else {
      metodoVinculo = "SEM_VINCULO";
      totalSemVinculo++;
    }

    const hashRegistro = createHash("sha256")
      .update(JSON.stringify({ identificador, objeto, valor, cnpjOrgao, numContrato }))
      .digest("hex");

    const anterior = mapaExistentes.get(identificador);
    if (!anterior) {
      await prisma.sinalContratacaoPublica.create({
        data: {
          id,
          identificadorPNCP: identificador,
          objeto,
          modalidade,
          dataPublicacao: dataPub,
          valorEstimado: valor,
          cnpjOrgao: cnpjOrgao || null,
          razaoSocialOrgao,
          municipio: item.unidade?.municipio || "São Paulo",
          uf: item.unidade?.uf || "SP",
          palavrasChave: (item.termosIdentificados || []).join(", "),
          sinalMobilidade: Boolean(item.sinalMobilidade),
          categoriaPNCP: "CONTRATO_CONFIRMADO",
          tipoContrato: item.tipoContrato || "Contrato",
          fornecedorCNPJ: fornecedorCnpj && fornecedorCnpj !== "00000000000000" ? fornecedorCnpj : null,
          fornecedorNome,
          urlPublica: item.urlPublica || null,
          fonteId: ID_FONTE_PNCP,
          loteId: lote.id,
          dataReferencia: dataPub,
          tipoDado: TipoDado.FATO_PUBLICO,
          confianca: NivelConfianca.ALTA,
          statusRevisao: StatusRevisao.APROVADA,
          hashRegistro,
          instituicaoId,
          metodoVinculo,
          confiancaVinculo,
        },
      });
      mapaExistentes.set(identificador, { id, identificadorPNCP: identificador, valorEstimado: valor });
      totalInseridos++;
    } else {
      if (anterior.valorEstimado !== valor) {
        await prisma.sinalContratacaoPublica.update({
          where: { identificadorPNCP: identificador },
          data: {
            valorEstimado: valor,
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
      quantidadePublicada: totalInseridos,
      quantidadeAtualizada: totalAtualizados,
    },
  });

  return {
    loteId: lote.id,
    arquivoOrigem: caminhoArquivo,
    hashArquivo,
    totalLidos,
    totalInseridos,
    totalAtualizados,
    totalInalterados,
    totalVinculadosCNPJ,
    totalSemVinculo,
  };
}
