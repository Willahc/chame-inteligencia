import "server-only";
import { prisma } from "./prisma";

export interface ContextoGeograficoIBGE {
  codigoIbge: string;
  codigoIbge6: string;
  municipio: string;
  ufSigla: string;
  ufNome: string;
  regiaoNome: string;
  microrregiao: string | null;
  mesorregiao: string | null;
  regiaoImediata: string | null;
  regiaoIntermediaria: string | null;
  populacao: number | null;
  tipoDado: string;
  confianca: string;
}

export async function obterContextoGeograficoIBGE(
  identificadorOuNome: string,
): Promise<ContextoGeograficoIBGE | null> {
  if (!identificadorOuNome) return null;

  const termoLimpo = identificadorOuNome.trim();
  const apenasDigitos = termoLimpo.replace(/\D/g, "");

  let mun = null;

  if (apenasDigitos.length === 6) {
    mun = await prisma.municipioIBGE.findFirst({
      where: { codigoIbge6: apenasDigitos },
    });
  } else if (apenasDigitos.length === 7) {
    mun = await prisma.municipioIBGE.findUnique({
      where: { id: apenasDigitos },
    });
  }

  if (!mun) {
    mun = await prisma.municipioIBGE.findFirst({
      where: {
        nome: {
          equals: termoLimpo,
        },
      },
    });
  }

  if (!mun) {
    // Fallback padrão São Paulo para estabelecimentos da capital
    if (termoLimpo.toLowerCase().includes("são paulo") || termoLimpo.toLowerCase().includes("sao paulo")) {
      mun = await prisma.municipioIBGE.findFirst({
        where: { codigoIbge6: "355030" },
      });
    }
  }

  if (!mun) return null;

  return {
    codigoIbge: mun.id,
    codigoIbge6: mun.codigoIbge6,
    municipio: mun.nome,
    ufSigla: mun.ufSigla,
    ufNome: mun.ufNome,
    regiaoNome: mun.regiaoNome,
    microrregiao: mun.microrregiao,
    mesorregiao: mun.mesorregiao,
    regiaoImediata: mun.regiaoImediata,
    regiaoIntermediaria: mun.regiaoIntermediaria,
    populacao: mun.populacao,
    tipoDado: mun.tipoDado,
    confianca: mun.confianca,
  };
}

export async function contarMunicipiosIBGE(): Promise<number> {
  return prisma.municipioIBGE.count();
}

export async function listarMunicipiosSP(): Promise<Array<{ id: string; nome: string; codigoIbge6: string }>> {
  return prisma.municipioIBGE.findMany({
    where: { ufSigla: "SP" },
    select: { id: true, nome: true, codigoIbge6: true },
    orderBy: { nome: "asc" },
  });
}
