import { PrismaClient, EnriquecimentoCNPJTerceiro } from "@prisma/client";
import { desformatarCNPJ } from "../domain/receita/validacao-cnpj";

const prisma = new PrismaClient();

export async function obterEnriquecimentoTerceiroPorCnes(
  cnes: string | null
): Promise<EnriquecimentoCNPJTerceiro | null> {
  if (!cnes) return null;

  const reg = await prisma.registroBrutoCNES.findFirst({
    where: { cnes, status: "ACEITO" },
    select: { payloadJson: true },
  });

  if (!reg || !reg.payloadJson) return null;

  try {
    const parsed = JSON.parse(reg.payloadJson);
    const rawCnpj = parsed.NU_CNPJ || parsed.cnpj;
    if (!rawCnpj) return null;

    const cnpjLimpo = desformatarCNPJ(String(rawCnpj));
    if (!cnpjLimpo) return null;

    return await prisma.enriquecimentoCNPJTerceiro.findUnique({
      where: { cnpj: cnpjLimpo },
    });
  } catch {
    return null;
  }
}

export async function obterEnriquecimentoTerceiroPorCnpj(
  cnpj: string | null
): Promise<EnriquecimentoCNPJTerceiro | null> {
  if (!cnpj) return null;
  const cnpjLimpo = desformatarCNPJ(cnpj);
  if (!cnpjLimpo) return null;

  return prisma.enriquecimentoCNPJTerceiro.findUnique({
    where: { cnpj: cnpjLimpo },
  });
}
