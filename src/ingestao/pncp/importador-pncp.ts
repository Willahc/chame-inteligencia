import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ArquivoPNCPBruto,
  RegistroPNCPBruto,
  ResultadoIngestaoPNCP,
} from "@/domain/pncp/tipos";
import { validarLoteRegistrosPNCP } from "@/domain/pncp/validador-pncp";

export const ID_FONTE_PNCP = "FONTE_PNCP";
export const CAMINHO_PADRAO_PNCP = "data/raw/pncp/consultas_pncp_sinais_contratacao.json";

export interface MapeamentoCNPJInstituicao {
  instituicaoId: string;
  metodoVinculo: "CNPJ_ESTABELECIMENTO" | "CNPJ_MANTENEDORA";
  confiancaVinculo: "ALTA" | "MEDIA";
}

export async function carregarMapeamentoCNPJInstituicoes(): Promise<Map<string, MapeamentoCNPJInstituicao>> {
  const mapa = new Map<string, MapeamentoCNPJInstituicao>();
  const mantenedoras = new Map<string, Set<string>>();

  try {
    // Buscar registros brutos do CNES associados a instituições reais
    const registrosBrutos = await prisma.registroBrutoCNES.findMany({
      select: {
        cnes: true,
        payloadJson: true,
      },
    });

    // Mapear cnes -> instituicaoId
    const instituicoes = await prisma.instituicao.findMany({
      where: { tipoDado: "FATO_OFICIAL", cnes: { not: null } },
      select: { id: true, cnes: true },
    });

    const cnesParaInstId = new Map<string, string>();
    for (const inst of instituicoes) {
      if (inst.cnes) {
        cnesParaInstId.set(inst.cnes, inst.id);
      }
    }

    for (const rb of registrosBrutos) {
      if (!rb.cnes || !cnesParaInstId.has(rb.cnes)) continue;
      const instId = cnesParaInstId.get(rb.cnes)!;

      try {
        const payload = JSON.parse(rb.payloadJson) as Record<string, unknown>;
        const cnpjEstab = typeof payload.NU_CNPJ === "string" ? payload.NU_CNPJ.replace(/\D/g, "").padStart(14, "0") : "";
        const cnpjMant = typeof payload.NU_CNPJ_MANTENEDORA === "string" ? payload.NU_CNPJ_MANTENEDORA.replace(/\D/g, "").padStart(14, "0") : "";

        if (cnpjEstab.length === 14 && !mapa.has(cnpjEstab)) {
          mapa.set(cnpjEstab, {
            instituicaoId: instId,
            metodoVinculo: "CNPJ_ESTABELECIMENTO",
            confiancaVinculo: "ALTA",
          });
        }
        if (cnpjMant.length === 14) {
          if (!mantenedoras.has(cnpjMant)) mantenedoras.set(cnpjMant, new Set());
          mantenedoras.get(cnpjMant)!.add(instId);
        }
      } catch {
        // Ignorar payload com JSON corrompido
      }
    }
  } catch (err) {
    console.warn("Aviso ao carregar mapeamento de CNPJ CNES:", err);
  }

  // Uma mantenedora pode administrar várias unidades. Só é seguro apontar
  // para uma instituição quando o CNPJ mantenedor identifica exatamente uma.
  for (const [cnpjMant, instituicoes] of mantenedoras) {
    if (instituicoes.size !== 1 || mapa.has(cnpjMant)) continue;
    mapa.set(cnpjMant, {
      instituicaoId: [...instituicoes][0],
      metodoVinculo: "CNPJ_MANTENEDORA",
      confiancaVinculo: "MEDIA",
    });
  }

  return mapa;
}

export async function garantirFontePNCP(): Promise<void> {
  await prisma.fonte.upsert({
    where: { id: ID_FONTE_PNCP },
    update: {
      nome: "Portal Nacional de Contratações Públicas",
      url: "https://pncp.gov.br/",
      identificador: "PNCP-DADOS-ABERTOS",
      tipoDado: "FATO_PUBLICO",
    },
    create: {
      id: ID_FONTE_PNCP,
      nome: "Portal Nacional de Contratações Públicas",
      url: "https://pncp.gov.br/",
      identificador: "PNCP-DADOS-ABERTOS",
      tipoDado: "FATO_PUBLICO",
    },
  });
}

export async function importarSinaisPNCPLocal(
  caminhoArquivo = CAMINHO_PADRAO_PNCP
): Promise<ResultadoIngestaoPNCP> {
  const caminhoAbsoluto = resolve(process.cwd(), caminhoArquivo);
  if (!existsSync(caminhoAbsoluto)) {
    throw new Error(`Arquivo PNCP local não encontrado em: ${caminhoAbsoluto}`);
  }

  // 1. Ler e calcular hash SHA-256 do arquivo local
  const conteudoBuffer = readFileSync(caminhoAbsoluto);
  const hashArquivo = createHash("sha256").update(conteudoBuffer).digest("hex").toUpperCase();
  const jsonParsed = JSON.parse(conteudoBuffer.toString("utf-8")) as ArquivoPNCPBruto;

  const registrosBrutos: RegistroPNCPBruto[] = Array.isArray(jsonParsed.registros)
    ? jsonParsed.registros
    : [];

  // 2. Garantir fonte oficial
  await garantirFontePNCP();

  // 3. Validar todos os registros defensivamente
  const validacao = validarLoteRegistrosPNCP(registrosBrutos);

  // 4. Carregar mapeamento oficial de CNPJ do CNES
  const mapaCNPJ = await carregarMapeamentoCNPJInstituicoes();

  // 5. Criar lote de ingestão com rastreabilidade
  const dataInicio = new Date();
  const dataReferencia = jsonParsed.dataExtracao ? new Date(jsonParsed.dataExtracao) : new Date("2026-09-06");
  const loteId = `LOTE_PNCP_${dataInicio.toISOString().replace(/[-:T.]/g, "").slice(0, 14)}`;

  const lote = await prisma.loteIngestao.create({
    data: {
      id: loteId,
      fonteId: ID_FONTE_PNCP,
      arquivoNome: "consultas_pncp_sinais_contratacao.json",
      fonteUrl: jsonParsed.urlBase || "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao",
      dataReferencia,
      inicio: dataInicio,
      status: "EM_PROCESSAMENTO",
      hashArquivo,
      versaoImportador: "1.0.0",
      quantidadeLida: validacao.totalLidos,
      quantidadeRejeitada: validacao.rejeitados.length,
      errosJson: validacao.rejeitados.length > 0 ? JSON.stringify(validacao.rejeitados) : null,
    },
  });

  // 6. Ingestão idempotente dos registros válidos
  let totalInseridos = 0;
  let totalAtualizados = 0;
  let totalInalterados = 0;
  let totalVinculadosCNPJ = 0;
  let totalSemVinculo = 0;

  for (const sinal of validacao.validos) {
    // Vínculo estrito por CNPJ (sem similaridade de nome)
    let instituicaoId: string | null = null;
    let metodoVinculo: string | null = null;
    let confiancaVinculo: "ALTA" | "MEDIA" | null = null;

    if (sinal.cnpjOrgao) {
      const cnpjPad = sinal.cnpjOrgao.padStart(14, "0");
      const vinculo = mapaCNPJ.get(cnpjPad);
      if (vinculo) {
        instituicaoId = vinculo.instituicaoId;
        metodoVinculo = vinculo.metodoVinculo;
        confiancaVinculo = vinculo.confiancaVinculo;
        totalVinculadosCNPJ++;
      } else {
        metodoVinculo = "SEM_VINCULO";
        totalSemVinculo++;
      }
    } else {
      metodoVinculo = "SEM_VINCULO";
      totalSemVinculo++;
    }

    // Verificar existência prévia para garantir idempotência
    const existente = await prisma.sinalContratacaoPublica.findUnique({
      where: { identificadorPNCP: sinal.identificadorPNCP },
    });

    const payloadCreate: Prisma.SinalContratacaoPublicaCreateInput = {
      id: existente?.id || `sinal-pncp-${createHash("sha1").update(sinal.identificadorPNCP).digest("hex").slice(0, 16)}`,
      identificadorPNCP: sinal.identificadorPNCP,
      objeto: sinal.objeto,
      modalidade: sinal.modalidade,
      dataPublicacao: sinal.dataPublicacao,
      valorEstimado: sinal.valorEstimado,
      cnpjOrgao: sinal.cnpjOrgao,
      razaoSocialOrgao: sinal.razaoSocialOrgao,
      municipio: sinal.municipio,
      uf: sinal.uf,
      palavrasChave: JSON.stringify(sinal.palavrasChave),
      sinalMobilidade: sinal.sinalMobilidade,
      urlPublica: sinal.urlPublica,
      dataReferencia,
      tipoDado: "FATO_PUBLICO",
      confianca: "ALTA",
      statusRevisao: "APROVADA",
      hashRegistro: sinal.hashRegistro,
      metodoVinculo,
      confiancaVinculo,
      fonte: { connect: { id: ID_FONTE_PNCP } },
      lote: { connect: { id: lote.id } },
      ...(instituicaoId ? { instituicao: { connect: { id: instituicaoId } } } : {}),
    };

    if (!existente) {
      await prisma.sinalContratacaoPublica.create({
        data: payloadCreate,
      });
      totalInseridos++;
    } else if (existente.hashRegistro !== sinal.hashRegistro || existente.metodoVinculo !== metodoVinculo) {
      await prisma.sinalContratacaoPublica.update({
        where: { id: existente.id },
        data: {
          objeto: sinal.objeto,
          modalidade: sinal.modalidade,
          dataPublicacao: sinal.dataPublicacao,
          valorEstimado: sinal.valorEstimado,
          cnpjOrgao: sinal.cnpjOrgao,
          razaoSocialOrgao: sinal.razaoSocialOrgao,
          municipio: sinal.municipio,
          uf: sinal.uf,
          palavrasChave: JSON.stringify(sinal.palavrasChave),
          sinalMobilidade: sinal.sinalMobilidade,
          urlPublica: sinal.urlPublica,
          hashRegistro: sinal.hashRegistro,
          metodoVinculo,
          confiancaVinculo,
          loteId: lote.id,
          instituicaoId,
        },
      });
      totalAtualizados++;
    } else {
      // Mantém a relação do sinal com o lote mais recente sem alterar seu conteúdo.
      // Assim, a última execução continua auditável e a operação permanece idempotente.
      await prisma.sinalContratacaoPublica.update({
        where: { id: existente.id },
        data: { loteId: lote.id, dataReferencia },
      });
      totalInalterados++;
    }
  }

  const dataFim = new Date();
  await prisma.loteIngestao.update({
    where: { id: lote.id },
    data: {
      status: "CONCLUIDO",
      quantidadeAceita: validacao.validos.length,
      quantidadeAtualizada: totalAtualizados,
      quantidadePublicada: totalInseridos + totalAtualizados + totalInalterados,
      fim: dataFim,
    },
  });

  return {
    loteId: lote.id,
    arquivoOrigem: caminhoArquivo,
    hashArquivo,
    dataReferencia,
    totalLidos: validacao.totalLidos,
    totalAceitos: validacao.validos.length,
    totalRejeitados: validacao.rejeitados.length,
    totalInseridos,
    totalAtualizados,
    totalInalterados,
    totalMobilidade: validacao.totalMobilidade,
    totalVinculadosCNPJ,
    totalSemVinculo,
    rejeicoes: validacao.rejeitados,
  };
}
