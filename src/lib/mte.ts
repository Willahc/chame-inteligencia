import "server-only";
import { prisma } from "./prisma";

export interface IndicadorMTEItem {
  id: string;
  municipio: string;
  uf: string;
  setorCnae: string;
  descricaoSetor: string;
  periodo: string;
  indicador: string;
  quantidadeAgregada: string;
  detalhesAgregados: Record<string, unknown> | null;
  tipoDado: string;
  confianca: string;
  statusRevisao: string;
  fonte: {
    id: string;
    nome: string;
    url: string | null;
  };
}

export async function obterIndicadoresMTEMunicipio(
  municipio: string = "São Paulo",
  uf: string = "SP",
): Promise<IndicadorMTEItem[]> {
  const itens = await prisma.indicadorMTE.findMany({
    where: {
      uf: { equals: uf },
      OR: [
        { municipio: { equals: municipio } },
        { municipio: "São Paulo" }, // fallback contexto capital
      ],
    },
    include: {
      fonte: {
        select: { id: true, nome: true, url: true },
      },
    },
  });

  return itens.map((item) => {
    let detalhesAgregados: Record<string, unknown> | null = null;
    if (item.detalhesAgregadosJson) {
      try {
        detalhesAgregados = JSON.parse(item.detalhesAgregadosJson);
      } catch {
        detalhesAgregados = null;
      }
    }

    return {
      id: item.id,
      municipio: item.municipio,
      uf: item.uf,
      setorCnae: item.setorCnae,
      descricaoSetor: item.descricaoSetor,
      periodo: item.periodo,
      indicador: item.indicador,
      quantidadeAgregada: item.quantidadeAgregada,
      detalhesAgregados,
      tipoDado: item.tipoDado,
      confianca: item.confianca,
      statusRevisao: item.statusRevisao,
      fonte: item.fonte,
    };
  });
}

export async function contarIndicadoresMTE(): Promise<number> {
  return prisma.indicadorMTE.count();
}
