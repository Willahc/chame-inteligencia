import "server-only";
import type { Prisma } from "@prisma/client";
import { qualidadeGeralEvidencias } from "@/domain/governanca";
import type {
  EvidenciaDominio,
  FaixaPrioridade,
  InstituicaoAssistente,
  InstituicaoRadar,
  NivelConfianca,
  StatusRevisao,
  TipoDado,
} from "@/domain/tipos";
import { prisma } from "./prisma";

export const incluirInstituicao = {
  grupoEconomico: true,
  tipoEstabelecimento: true,
  unidades: { include: { endereco: true }, orderBy: { nome: "asc" as const } },
  servicos: { orderBy: { nome: "asc" as const } },
  sinaisExpansao: { include: { evidencias: { include: { fonte: true } } } },
  necessidades: true,
  areasDecisoras: true,
  evidencias: { include: { fonte: true }, orderBy: { dataColeta: "desc" as const } },
  indice: { include: { componentes: { include: { evidencias: { include: { fonte: true } } }, orderBy: { peso: "desc" as const } } } },
  acoesComerciais: { orderBy: { prioridade: "asc" as const } },
} satisfies Prisma.InstituicaoInclude;

export type InstituicaoCompleta = Prisma.InstituicaoGetPayload<{ include: typeof incluirInstituicao }>;

export async function listarInstituicoes(): Promise<InstituicaoCompleta[]> {
  return prisma.instituicao.findMany({
    include: incluirInstituicao,
    orderBy: { indice: { total: "desc" } },
  });
}

export async function obterInstituicaoPorSlug(slug: string): Promise<InstituicaoCompleta | null> {
  return prisma.instituicao.findUnique({ where: { slug }, include: incluirInstituicao });
}

export function mapearEvidencia(item: InstituicaoCompleta["evidencias"][number]): EvidenciaDominio {
  return {
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    observacao: item.observacao ?? undefined,
    dataColeta: item.dataColeta.toISOString(),
    dataReferencia: item.dataReferencia?.toISOString(),
    tipo: item.tipo as TipoDado,
    confianca: item.confianca as NivelConfianca,
    statusRevisao: item.statusRevisao as StatusRevisao,
    fonte: {
      id: item.fonte.id,
      nome: item.fonte.nome,
      url: item.fonte.url ?? undefined,
      identificador: item.fonte.identificador ?? undefined,
      tipoDado: item.fonte.tipoDado as TipoDado,
    },
  };
}

export function mapearParaRadar(item: InstituicaoCompleta): InstituicaoRadar {
  const evidencias = item.evidencias.map(mapearEvidencia);
  const componentePrincipal = item.indice?.componentes
    .filter((componente) => componente.valorObtido > 0)
    .sort((a, b) => b.valorObtido - a.valorObtido)[0];
  const municipios = [...new Set(item.unidades.map((unidade) => unidade.endereco?.municipio).filter((valor): valor is string => Boolean(valor)))];
  return {
    id: item.id,
    slug: item.slug,
    nome: item.nome,
    grupo: item.grupoEconomico?.nome ?? null,
    municipio: municipios[0] ?? "Não informado",
    municipios,
    tipo: item.tipoEstabelecimento.nome,
    quantidadeUnidades: item.unidades.length,
    operacao24h: item.operacao24h,
    possuiExpansao: item.sinaisExpansao.length > 0,
    indice: item.indice?.total ?? 0,
    faixa: (item.indice?.faixa ?? "BAIXA") as FaixaPrioridade,
    principalMotivo: componentePrincipal?.rotulo ?? "Sem componente aplicável",
    qualidadeEvidencias: qualidadeGeralEvidencias(evidencias),
    acaoRecomendada: item.acoesComerciais[0]?.titulo ?? "Revisar evidências antes de agir",
    tipoDado: item.tipoDado as TipoDado,
  };
}

export function mapearParaAssistente(item: InstituicaoCompleta): InstituicaoAssistente {
  return {
    ...mapearParaRadar(item),
    descricao: item.descricao,
    evidencias: item.evidencias.map(mapearEvidencia),
  };
}
