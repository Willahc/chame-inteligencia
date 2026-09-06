import "server-only";
import { prisma } from "./prisma";

export interface OperadoraANSItem {
  id: string;
  registroAns: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  modalidade: string;
  situacao: string;
  cidade: string;
  uf: string;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  dataRegistroAns: string | null;
  regiaoComercializacao: number | null;
  tipoDado: string;
  confianca: string;
  fonte: {
    id: string;
    nome: string;
    url: string | null;
  };
}

export async function obterOperadoraANSPorCnpj(cnpj: string): Promise<OperadoraANSItem | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, "").padStart(14, "0");
  if (!cnpjLimpo || cnpjLimpo === "00000000000000") return null;

  const op = await prisma.operadoraANS.findFirst({
    where: {
      OR: [
        { cnpj: cnpjLimpo },
        { cnpj: { startsWith: cnpjLimpo.slice(0, 8) } },
      ],
    },
    include: {
      fonte: {
        select: { id: true, nome: true, url: true },
      },
    },
  });

  if (!op) return null;

  return {
    id: op.id,
    registroAns: op.registroAns,
    cnpj: op.cnpj,
    razaoSocial: op.razaoSocial,
    nomeFantasia: op.nomeFantasia,
    modalidade: op.modalidade,
    situacao: op.situacao,
    cidade: op.cidade,
    uf: op.uf,
    logradouro: op.logradouro,
    numero: op.numero,
    complemento: op.complemento,
    bairro: op.bairro,
    cep: op.cep,
    dataRegistroAns: op.dataRegistroAns ? op.dataRegistroAns.toISOString() : null,
    regiaoComercializacao: op.regiaoComercializacao,
    tipoDado: op.tipoDado,
    confianca: op.confianca,
    fonte: op.fonte,
  };
}

export async function obterOperadoraANSPorCnes(cnes: string): Promise<OperadoraANSItem | null> {
  if (!cnes) return null;

  // 1. Buscar CNPJ do estabelecimento no RegistroBrutoCNES
  const rb = await prisma.registroBrutoCNES.findFirst({
    where: { cnes },
    select: { payloadJson: true },
  });

  if (!rb?.payloadJson) return null;

  try {
    const payload = JSON.parse(rb.payloadJson) as Record<string, unknown>;
    const cnpjEstab = typeof payload.NU_CNPJ === "string" ? payload.NU_CNPJ.replace(/\D/g, "").padStart(14, "0") : "";
    const cnpjMant = typeof payload.NU_CNPJ_MANTENEDORA === "string" ? payload.NU_CNPJ_MANTENEDORA.replace(/\D/g, "").padStart(14, "0") : "";

    if (cnpjEstab && cnpjEstab !== "00000000000000") {
      const match = await obterOperadoraANSPorCnpj(cnpjEstab);
      if (match) return match;
    }

    if (cnpjMant && cnpjMant !== "00000000000000") {
      const match = await obterOperadoraANSPorCnpj(cnpjMant);
      if (match) return match;
    }
  } catch {
    return null;
  }

  return null;
}

export async function contarOperadorasANS(): Promise<number> {
  return prisma.operadoraANS.count();
}
