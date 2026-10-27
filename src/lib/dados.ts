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
import { ROTULOS_ACOES_COMERCIAIS } from "@/domain/acao-comercial/recomendar-acao";
import {
  mesclarContasComerciaisUnificadas,
  mesclarRadarUnificado,
  obterContaComercialDePolo5km,
  obterInstituicaoPorSlugDePolo5km,
  obterOrganizacaoDePolo5km,
  salvarAbordagemPolo5km,
} from "./clientes-corporativos-unificados";

export const incluirInstituicao = {
  grupoEconomico: {
    include: {
      _count: { select: { instituicoes: true } },
      contaComercial: true,
      contatos: {
        include: { fonte: true },
        where: { ativo: true },
        orderBy: [{ indiceQualidade: "desc" as const }, { nome: "asc" as const }],
      },
    },
  },
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
  contatosProfissionais: {
    include: { fonte: true },
    where: { ativo: true },
    orderBy: [{ indiceQualidade: "desc" as const }, { nome: "asc" as const }],
  },
  sinaisContratacaoPublica: { include: { fonte: true }, orderBy: { dataPublicacao: "desc" as const } },
} satisfies Prisma.InstituicaoInclude;

export type InstituicaoCompleta = Prisma.InstituicaoGetPayload<{ include: typeof incluirInstituicao }>;

export type ParametrosPaginacaoInstituicoes = {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
  faixa?: FaixaPrioridade;
  segmento?: string;
  apenas24h?: boolean;
  modo?: ReturnType<typeof obterModoDados>;
};

export type ResultadoPaginadoInstituicoes = {
  itens: InstituicaoCompleta[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
  totalPaginas: number;
};

export async function listarInstituicoes(modo = obterModoDados()): Promise<InstituicaoCompleta[]> {
  return prisma.instituicao.findMany({
    where: { tipoDado: tipoDadoDoModo(modo) },
    include: incluirInstituicao,
    orderBy: { indice: { total: "desc" } },
  });
}

export async function listarInstituicoesPaginadas(
  params: ParametrosPaginacaoInstituicoes = {},
): Promise<ResultadoPaginadoInstituicoes> {
  const modo = params.modo ?? obterModoDados();
  const pagina = Math.max(1, params.pagina ?? 1);
  const tamanhoPagina = Math.min(200, Math.max(1, params.tamanhoPagina ?? 50));
  const busca = params.busca?.trim();

  const where: Prisma.InstituicaoWhereInput = {
    tipoDado: tipoDadoDoModo(modo),
    ...(params.apenas24h ? { operacao24h: true } : {}),
    ...(params.faixa ? { indice: { faixa: params.faixa } } : {}),
    ...(params.segmento ? { segmentacao: { segmento: params.segmento as never } } : {}),
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca } },
            { cnes: { contains: busca } },
            { grupoEconomico: { nome: { contains: busca } } },
          ],
        }
      : {}),
  };

  const [total, itens] = await Promise.all([
    prisma.instituicao.count({ where }),
    prisma.instituicao.findMany({
      where,
      include: incluirInstituicao,
      orderBy: { indice: { total: "desc" } },
      skip: (pagina - 1) * tamanhoPagina,
      take: tamanhoPagina,
    }),
  ]);

  return {
    itens,
    total,
    pagina,
    tamanhoPagina,
    totalPaginas: Math.max(1, Math.ceil(total / tamanhoPagina)),
  };
}

/**
 * Limite de dados do assistente: o resultado nunca inclui contatos
 * profissionais, embora a consulta canônica seja reutilizada para preservar
 * a compatibilidade com Prisma 6.12 + SQLite.
 */
export async function listarInstituicoesParaAssistente(
  modo = obterModoDados(),
  limite = 250,
): Promise<InstituicaoAssistente[]> {
  const itens = await prisma.instituicao.findMany({
    where: { tipoDado: tipoDadoDoModo(modo) },
    include: incluirInstituicao,
    orderBy: { indice: { total: "desc" } },
    take: limite,
  });
  return itens.map(mapearParaAssistente);
}

export async function obterInstituicaoPorSlug(slug: string, modo = obterModoDados()): Promise<InstituicaoCompleta | null> {
  if (modo === "MODO_REAL" && slug.startsWith("polo-5km-")) {
    return obterInstituicaoPorSlugDePolo5km(slug);
  }
  return prisma.instituicao.findFirst({ where: { slug, tipoDado: tipoDadoDoModo(modo) }, include: incluirInstituicao });
}

export async function listarRadarUnificado(modo = obterModoDados()): Promise<InstituicaoRadar[]> {
  const completas = await listarInstituicoes(modo);
  const radarBase = completas.map(mapearParaRadar);
  if (modo === "MODO_DEMONSTRACAO") {
    return radarBase;
  }
  return mesclarRadarUnificado(radarBase);
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
    indice: item.indice?.total ?? (item.grupoEconomico?.contaComercial?.indicePrioridadeComercial ?? 0),
    faixa: (item.indice?.faixa ?? (item.grupoEconomico?.contaComercial?.faixaPrioridadeComercial ?? "BAIXA")) as FaixaPrioridade,
    principalMotivo: componentePrincipal?.rotulo ?? "Estrutura multiunidade",
    qualidadeEvidencias: qualidadeGeralEvidencias(evidencias),
    acaoRecomendada:
      item.acoesComerciais[0]?.titulo ??
      (item.grupoEconomico?.contaComercial?.acaoRecomendada
        ? ROTULOS_ACOES_COMERCIAIS[item.grupoEconomico.contaComercial.acaoRecomendada]
        : "Revisar evidências antes de agir"),
    tipoDado: item.tipoDado as TipoDado,
    cnes: item.cnes,
    situacaoCadastral: item.situacaoCadastral,
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
    quantidadeContatos:
      (item.contatosProfissionais ?? []).length ||
      (item.grupoEconomico?.contatos ?? []).length ||
      item.grupoEconomico?.contaComercial?.quantidadeContatos ||
      0,
    riscoOuLimitacao:
      item.grupoEconomico?.tipoVinculo === "INCERTO" || item.grupoEconomico?.tipoVinculo === "PROVAVEL"
        ? "Vínculo corporativo provável; requer validação cadastral"
        : (item.coberturaDados ?? 100) < 70
          ? "Cobertura cadastral parcial (< 70%)"
          : null,
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
  const orgs = await prisma.grupoEconomico.findMany({
    where: modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } },
    include: {
      instituicoes: { include: incluirOrganizacao, orderBy: { nome: "asc" as const } },
      contatos: {
        include: { fonte: true },
        where: { ativo: true },
        orderBy: [{ indiceQualidade: "desc" as const }, { nome: "asc" as const }],
      },
    },
    orderBy: { nome: "asc" as const },
  });
  return orgs.map((o) => ({ ...o, contatos: o.contatos.slice(0, 1) }));
}

export async function obterOrganizacao(id: string, modo = obterModoDados()): Promise<OrganizacaoCompleta | null> {
  if (modo === "MODO_REAL" && id.startsWith("grupo-polo-")) {
    return obterOrganizacaoDePolo5km(id);
  }
  const org = await prisma.grupoEconomico.findFirst({
    where: { id, ...(modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } }) },
    include: {
      instituicoes: { include: incluirOrganizacao, orderBy: { nome: "asc" as const } },
      contatos: {
        include: { fonte: true },
        where: { ativo: true },
        orderBy: [{ indiceQualidade: "desc" as const }, { nome: "asc" as const }],
      },
    },
  });
  if (!org) return null;
  return { ...org, contatos: org.contatos.slice(0, 1) };
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
        orderBy: [{ indiceQualidade: "desc" as const }, { nome: "asc" as const }],
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

/**
 * Projeção enxuta usada pela listagem. A página de contas só precisa dos
 * campos de resumo; carregar evidências, unidades e contatos completos para
 * 7.550 contas tornava cada navegação uma transferência e renderização muito
 * maior do que o necessário. O detalhe continua usando obterContaComercial.
 */
const selecionarResumoConta = {
  id: true,
  nome: true,
  tipoDado: true,
  grupoEconomicoId: true,
  natureza: true,
  quantidadeUnidades: true,
  quantidadeHospitais: true,
  quantidadeContatos: true,
  cidades: true,
  cnpjPrincipal: true,
  tipoVinculo: true,
  confiancaOrganizacional: true,
  coberturaDados: true,
  statusRevisao: true,
  indicePrioridadeComercial: true,
  faixaPrioridadeComercial: true,
  acaoRecomendada: true,
  justificativaAcao: true,
  resultadoAbordagem: true,
  grupoEconomico: {
    select: {
      instituicoes: {
        select: {
          segmentacao: { select: { segmento: true } },
        },
      },
    },
  },
} satisfies Prisma.ContaComercialSelect;

export type ContatoUnicoGrupoResumo = {
  id: string;
  nome: string;
  cargo: string | null;
  emailCorporativo: string | null;
  telefoneProfissional: string | null;
};

export type ContaComercialResumo = Prisma.ContaComercialGetPayload<{
  select: typeof selecionarResumoConta;
}> & {
  contatoPrincipal?: ContatoUnicoGrupoResumo | null;
};

export async function listarContasComerciais(modo = obterModoDados()): Promise<ContaComercialResumo[]> {
  const [contasBaseRaw, contatosAtivos] = await Promise.all([
    prisma.contaComercial.findMany({
      where: modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } },
      select: selecionarResumoConta,
      orderBy: [
        { indicePrioridadeComercial: "desc" },
        { quantidadeUnidades: "desc" },
      ],
    }),
    prisma.contatoProfissional.findMany({
      where: {
        ativo: true,
        ...(modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } }),
      },
      orderBy: [{ indiceQualidade: "desc" }, { nome: "asc" }],
      select: {
        id: true,
        grupoEconomicoId: true,
        nome: true,
        cargo: true,
        emailCorporativo: true,
        telefoneProfissional: true,
      },
    }),
  ]);

  const mapaContatoUnicoPorGrupo = new Map<string, ContatoUnicoGrupoResumo>();
  for (const ct of contatosAtivos) {
    if (ct.grupoEconomicoId && !mapaContatoUnicoPorGrupo.has(ct.grupoEconomicoId)) {
      mapaContatoUnicoPorGrupo.set(ct.grupoEconomicoId, {
        id: ct.id,
        nome: ct.nome,
        cargo: ct.cargo,
        emailCorporativo: ct.emailCorporativo,
        telefoneProfissional: ct.telefoneProfissional,
      });
    }
  }

  const contasBase: ContaComercialResumo[] = contasBaseRaw.map((c) => {
    const contatoPrincipal = c.grupoEconomicoId ? (mapaContatoUnicoPorGrupo.get(c.grupoEconomicoId) ?? null) : null;
    return {
      ...c,
      quantidadeContatos: contatoPrincipal ? 1 : Math.min(1, c.quantidadeContatos),
      contatoPrincipal,
    };
  });
  if (modo === "MODO_DEMONSTRACAO") {
    return contasBase;
  }
  return mesclarContasComerciaisUnificadas(contasBase);
}

export async function obterContaComercial(id: string, modo = obterModoDados()): Promise<ContaComercialCompleta | null> {
  if (modo === "MODO_REAL" && id.startsWith("conta-polo-")) {
    return obterContaComercialDePolo5km(id);
  }
  const conta = await prisma.contaComercial.findFirst({
    where: {
      id,
      ...(modo === "MODO_DEMONSTRACAO" ? { tipoDado: "DEMONSTRACAO" } : { NOT: { tipoDado: "DEMONSTRACAO" } }),
    },
    include: incluirContaComercial,
  });
  if (!conta) return null;
  return {
    ...conta,
    quantidadeContatos: Math.min(1, conta.quantidadeContatos),
    grupoEconomico: conta.grupoEconomico
      ? {
          ...conta.grupoEconomico,
          contatos: conta.grupoEconomico.contatos.slice(0, 1),
        }
      : null,
  };
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
  if (dados.contaComercialId.startsWith("conta-polo-")) {
    return salvarAbordagemPolo5km(dados);
  }
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
