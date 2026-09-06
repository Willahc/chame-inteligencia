import "server-only";
import type { Prisma } from "@prisma/client";
import { qualidadeGeralEvidencias } from "@/domain/governanca";
import type {
  EvidenciaDominio,
  FaixaPrioridade,
  InstituicaoAssistente,
  InstituicaoRadar,
  NivelConfianca,
  OrganizacaoRadar,
  StatusRevisao,
  TipoDado,
} from "@/domain/tipos";
import { prisma } from "./prisma";
import { obterModoDados, tipoDadoDoModo } from "@/domain/modo-dados";

export const incluirInstituicao = {
  grupoEconomico: { include: { _count: { select: { instituicoes: true } } } },
  tipoEstabelecimento: true,
  unidades: { include: { endereco: true }, orderBy: { nome: "asc" as const } },
  servicos: { orderBy: { nome: "asc" as const } },
  sinaisExpansao: { include: { evidencias: { include: { fonte: true } } } },
  necessidades: true,
  areasDecisoras: true,
  evidencias: { include: { fonte: true }, orderBy: { dataColeta: "desc" as const } },
  indice: { include: { componentes: { include: { evidencias: { include: { fonte: true } } }, orderBy: { peso: "desc" as const } } } },
  acoesComerciais: { orderBy: { prioridade: "asc" as const } },
  segmentacao: true,
  contatosProfissionais: { include: { fonte: true }, where: { ativo: true }, orderBy: { nome: "asc" as const } },
  sinaisContratacaoPublica: { include: { fonte: true }, orderBy: { dataPublicacao: "desc" as const } },
} satisfies Prisma.InstituicaoInclude;

export type InstituicaoCompleta = Prisma.InstituicaoGetPayload<{ include: typeof incluirInstituicao }>;

export async function listarInstituicoes(modo = obterModoDados()): Promise<InstituicaoCompleta[]> {
  return prisma.instituicao.findMany({
    where: { tipoDado: tipoDadoDoModo(modo) },
    include: incluirInstituicao,
    orderBy: { indice: { total: "desc" } },
  });
}
export async function obterInstituicaoPorSlug(slug: string, modo = obterModoDados()): Promise<InstituicaoCompleta | null> {
  return prisma.instituicao.findFirst({ where: { slug, tipoDado: tipoDadoDoModo(modo) }, include: incluirInstituicao });
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

export function mapearParaAssistente(item: InstituicaoCompleta): InstituicaoAssistente {
  return {
    ...mapearParaRadar(item),
    descricao: item.descricao,
    evidencias: item.evidencias.map(mapearEvidencia),
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
    organizacao: item.grupoEconomico && item.grupoEconomico.tipoDado !== "DEMONSTRACAO" ? mapearOrganizacao(item.grupoEconomico) : null,
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
    cnes: item.cnes,
    coberturaDados: item.coberturaDados,
    segmentacao: item.segmentacao
      ? {
          segmento: item.segmentacao.segmento,
          faixaAderencia: item.segmentacao.faixaAderencia,
          confianca: item.segmentacao.nivelConfianca as NivelConfianca,
          indiceAderencia: item.segmentacao.indiceAderencia,
          versaoRegra: item.segmentacao.versaoRegra,
          justificativa: item.segmentacao.justificativa,
          regraAplicada: item.segmentacao.regraAplicada,
          statusRevisao: item.segmentacao.statusRevisao,
          precisaRevisao: item.segmentacao.statusRevisao !== "APROVADO",
        }
      : null,
    totalSinaisPNCP: (item.sinaisContratacaoPublica ?? []).length,
    possuiSinalPNCP: (item.sinaisContratacaoPublica ?? []).length > 0,
    possuiSinalMobilidadePNCP: (item.sinaisContratacaoPublica ?? []).some((s) => s.sinalMobilidade),
    dataSinalPNCPMaisRecente: (item.sinaisContratacaoPublica ?? [])[0]?.dataPublicacao?.toISOString() ?? null,
    vinculoPNCPExato: (item.sinaisContratacaoPublica ?? []).some(
      (s) => s.metodoVinculo === "CNPJ_ESTABELECIMENTO" || s.metodoVinculo === "CNPJ_MANTENEDORA"
    ),
    possuiContratacaoRecente: (item.sinaisContratacaoPublica ?? []).some((s) => {
      const pub = new Date(s.dataPublicacao);
      return pub >= new Date("2026-07-01");
    }),
  };
}

type GrupoEconomicoComContagem = Prisma.InstituicaoGetPayload<{ include: typeof incluirInstituicao }>["grupoEconomico"];

export function mapearOrganizacao(grupo: NonNullable<GrupoEconomicoComContagem>): OrganizacaoRadar {
  return {
    id: grupo.id,
    nome: grupo.nome,
    nomeNormalizado: grupo.nomeNormalizado,
    tipoDado: grupo.tipoDado as TipoDado,
    tipoVinculo: grupo.tipoVinculo,
    confianca: grupo.nivelConfianca,
    natureza: grupo.natureza,
    quantidadeUnidades: grupo._count?.instituicoes ?? 0,
    statusRevisao: grupo.statusRevisao,
    regraAgrupamento: grupo.regraAgrupamento,
    versaoRegra: grupo.versaoRegra,
    tipoEvidencia: grupo.tipoEvidencia,
    observacao: grupo.observacao,
    dataCalculo: grupo.dataCalculo?.toISOString(),
    precisaRevisao: grupo.tipoVinculo === "PROVAVEL" || grupo.tipoVinculo === "INCERTO",
  };
}

export const incluirOrganizacao = {
  tipoEstabelecimento: true,
  unidades: { include: { endereco: true } },
  segmentacao: true,
  indice: true,
  sinaisContratacaoPublica: { include: { fonte: true }, orderBy: { dataPublicacao: "desc" as const } },
} satisfies Prisma.InstituicaoInclude;

export type OrganizacaoCompleta = Prisma.GrupoEconomicoGetPayload<{
  include: { instituicoes: { include: typeof incluirOrganizacao }; contatos: { include: { fonte: true } } };
}>;

export async function listarOrganizacoes(modo = obterModoDados()): Promise<OrganizacaoCompleta[]> {
  return prisma.grupoEconomico.findMany({
    where: modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } },
    include: { instituicoes: { include: incluirOrganizacao, orderBy: { nome: "asc" as const } }, contatos: { include: { fonte: true }, where: { ativo: true }, orderBy: { nome: "asc" as const } } },
    orderBy: { nome: "asc" as const },
  });
}

export async function obterOrganizacao(id: string, modo = obterModoDados()): Promise<OrganizacaoCompleta | null> {
  return prisma.grupoEconomico.findFirst({
    where: { id, ...(modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } }) },
    include: { instituicoes: { include: incluirOrganizacao, orderBy: { nome: "asc" as const } }, contatos: { include: { fonte: true }, where: { ativo: true }, orderBy: { nome: "asc" as const } } },
  });
}

export const incluirContaComercial = {
  grupoEconomico: {
    include: {
      instituicoes: {
        include: {
          tipoEstabelecimento: true,
          unidades: { include: { endereco: true } },
          segmentacao: true,
          indice: { include: { componentes: true } },
          evidencias: { include: { fonte: true }, orderBy: { dataColeta: "desc" as const } },
          sinaisContratacaoPublica: { include: { fonte: true }, orderBy: { dataPublicacao: "desc" as const } },
        },
      },
      contatos: {
        include: { fonte: true },
        where: { ativo: true },
        orderBy: { nome: "asc" as const },
      },
    },
  },
  historicoAbordagem: {
    orderBy: { data: "desc" as const },
  },
} satisfies Prisma.ContaComercialInclude;

export type ContaComercialCompleta = Prisma.ContaComercialGetPayload<{
  include: typeof incluirContaComercial;
}>;

export async function listarContasComerciais(modo = obterModoDados()): Promise<ContaComercialCompleta[]> {
  return prisma.contaComercial.findMany({
    where: modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } },
    include: incluirContaComercial,
    orderBy: [
      { indicePrioridadeComercial: "desc" },
      { quantidadeUnidades: "desc" },
    ],
  });
}

export async function obterContaComercial(id: string, modo = obterModoDados()): Promise<ContaComercialCompleta | null> {
  return prisma.contaComercial.findFirst({
    where: {
      id,
      ...(modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } }),
    },
    include: incluirContaComercial,
  });
}

export async function registrarResultadoAbordagem(dados: {
  contaComercialId: string;
  resultado: "NAO_ABORDADA" | "ABORDADA" | "EM_ANALISE" | "REUNIAO" | "PROPOSTA" | "CONTRATO" | "DESCARTADA" | "AGUARDANDO_DADOS";
  usuarioResponsavel?: string;
  observacao: string;
  proximaAcao?: string;
  fonteOuEvidencia?: string;
  tipoDado?: TipoDado;
}) {
  const conta = await prisma.contaComercial.findUnique({ where: { id: dados.contaComercialId } });
  if (!conta) throw new Error("Conta comercial não encontrada.");

  const registro = await prisma.registroAbordagem.create({
    data: {
      id: `reg-abordagem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      contaComercialId: dados.contaComercialId,
      resultado: dados.resultado,
      usuarioResponsavel: dados.usuarioResponsavel?.trim() || null,
      observacao: dados.observacao.trim(),
      proximaAcao: dados.proximaAcao?.trim() || null,
      fonteOuEvidencia: dados.fonteOuEvidencia?.trim() || null,
      tipoDado: dados.tipoDado ?? (conta.tipoDado as TipoDado),
    },
  });

  await prisma.contaComercial.update({
    where: { id: dados.contaComercialId },
    data: {
      resultadoAbordagem: dados.resultado,
    },
  });

  return registro;
}
