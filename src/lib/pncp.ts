import "server-only";
import { prisma } from "./prisma";

export interface SinalContratacaoItem {
  id: string;
  identificadorPNCP: string;
  objeto: string;
  modalidade: string;
  dataPublicacao: string;
  valorEstimado: number | null;
  cnpjOrgao: string | null;
  razaoSocialOrgao: string | null;
  municipio: string | null;
  uf: string | null;
  palavrasChave: string[];
  sinalMobilidade: boolean;
  urlPublica: string | null;
  metodoVinculo: string | null;
  confiancaVinculo: string | null;
  tipoDado: string;
  confianca: string;
  statusRevisao: string;
  instituicao: {
    id: string;
    nome: string;
    slug: string;
  } | null;
  fonte: {
    id: string;
    nome: string;
    url: string | null;
  };
}

export async function listarSinaisContratacao(): Promise<SinalContratacaoItem[]> {
  const itens = await prisma.sinalContratacaoPublica.findMany({
    where: { tipoDado: "FATO_PUBLICO" },
    include: {
      instituicao: {
        select: {
          id: true,
          nome: true,
          slug: true,
        },
      },
      fonte: {
        select: {
          id: true,
          nome: true,
          url: true,
        },
      },
    },
    orderBy: [
      { sinalMobilidade: "desc" },
      { dataPublicacao: "desc" },
    ],
  });

  return itens.map((item) => {
    let palavrasChave: string[] = [];
    try {
      palavrasChave = JSON.parse(item.palavrasChave);
    } catch {
      palavrasChave = [];
    }

    return {
      id: item.id,
      identificadorPNCP: item.identificadorPNCP,
      objeto: item.objeto,
      modalidade: item.modalidade,
      dataPublicacao: item.dataPublicacao.toISOString(),
      valorEstimado: item.valorEstimado,
      cnpjOrgao: item.cnpjOrgao,
      razaoSocialOrgao: item.razaoSocialOrgao,
      municipio: item.municipio,
      uf: item.uf,
      palavrasChave,
      sinalMobilidade: item.sinalMobilidade,
      urlPublica: item.urlPublica,
      metodoVinculo: item.metodoVinculo,
      confiancaVinculo: item.confiancaVinculo,
      tipoDado: item.tipoDado,
      confianca: item.confianca,
      statusRevisao: item.statusRevisao,
      instituicao: item.instituicao,
      fonte: item.fonte,
    };
  });
}
