import { prisma } from "@/lib/prisma";
import type { Prisma, StatusDecisaoContato, StatusRevisao, TipoDado } from "@prisma/client";
import type {
  ContatoParaRevisao,
  FiltrosRevisaoContatos,
  ParametrosDecisaoContato,
  RegistroHistoricoDecisao,
  ResumoContadoresRevisao,
} from "./tipos";

export async function listarContatosParaRevisao(
  filtros: FiltrosRevisaoContatos = {}
): Promise<ContatoParaRevisao[]> {
  const modo = filtros.modo ?? "MODO_REAL";

  const where: Prisma.ContatoProfissionalWhereInput = {
    ...(modo === "MODO_DEMONSTRACAO"
      ? { tipoDado: "DEMONSTRACAO" }
      : { NOT: { tipoDado: "DEMONSTRACAO" } }),
  };

  if (filtros.apenasPendentes) {
    where.statusDecisao = { in: ["PENDENTE", "REVISAR_NOVAMENTE"] };
  } else if (filtros.status && filtros.status !== "TODOS") {
    where.statusDecisao = filtros.status;
  }

  if (filtros.confianca && filtros.confianca !== "TODAS") {
    where.confianca = filtros.confianca;
  }

  if (filtros.escopo && filtros.escopo !== "TODOS") {
    where.escopoContato = filtros.escopo;
  }

  if (filtros.organizacaoId) {
    where.grupoEconomicoId = filtros.organizacaoId;
  }

  if (filtros.instituicaoId) {
    where.instituicaoId = filtros.instituicaoId;
  }

  if (filtros.fonteId) {
    where.fonteId = filtros.fonteId;
  }

  if (filtros.busca?.trim()) {
    const termo = filtros.busca.trim();
    where.OR = [
      { nome: { contains: termo } },
      { cargo: { contains: termo } },
      { empresa: { contains: termo } },
      { area: { contains: termo } },
      { papelComercial: { contains: termo } },
    ];
  }

  const contatos = await prisma.contatoProfissional.findMany({
    where,
    include: {
      fonte: true,
      grupoEconomico: { select: { id: true, nome: true } },
      instituicao: { select: { id: true, nome: true } },
      historicoDecisoes: { orderBy: { dataHora: "desc" } },
    },
    orderBy: [
      { statusDecisao: "asc" },
      { criadoEm: "desc" },
      { nome: "asc" },
    ],
  });

  return contatos.map((c) => {
    const orgOuInstNome =
      c.grupoEconomico?.nome ??
      c.instituicao?.nome ??
      c.empresa ??
      "Não informado";

    const historicoMapeado: RegistroHistoricoDecisao[] = c.historicoDecisoes.map((h) => ({
      id: h.id,
      contatoId: h.contatoId,
      usuario: h.usuario,
      dataHora: h.dataHora.toISOString(),
      acao: h.acao,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      motivo: h.motivo,
      valorAnterior: h.valorAnterior,
      valorNovo: h.valorNovo,
      observacao: h.observacao,
      evidenciaUtilizada: h.evidenciaUtilizada,
    }));

    return {
      id: c.id,
      nome: c.nome,
      cargo: c.cargo,
      area: c.area,
      empresa: c.empresa,
      escopoContato: c.escopoContato,
      organizacaoOuInstituicaoNome: orgOuInstNome,
      papelComercial: c.papelComercial,
      tipoPapelComercial: c.tipoPapelComercial as TipoDado,
      confianca: c.confianca,
      fonteNome: c.fonte?.nome ?? "Fonte não informada",
      fonteUrl: c.fonte?.url ?? null,
      dataEvidencia: c.dataEvidencia.toISOString(),
      justificativa: c.justificativaQualidade,
      limitacoes: c.observacao,
      classificacaoCanonica: c.tipoDado as TipoDado,
      statusDecisao: c.statusDecisao,
      statusRevisao: c.statusRevisao as StatusRevisao,
      ativo: c.ativo,
      emailCorporativo: c.emailCorporativo,
      telefoneProfissional: c.telefoneProfissional,
      telefoneDepartamental: c.telefoneDepartamental,
      ramal: c.ramal,
      linkedinUrl: c.linkedinUrl,
      paginaProfissionalUrl: c.paginaProfissionalUrl,
      observacao: c.observacao,
      grupoEconomicoId: c.grupoEconomicoId,
      instituicaoId: c.instituicaoId,
      historicoDecisoes: historicoMapeado,
    };
  });
}

export async function obterResumoContadoresRevisao(
  modo: "MODO_REAL" | "MODO_DEMONSTRACAO" = "MODO_REAL"
): Promise<ResumoContadoresRevisao> {
  const where: Prisma.ContatoProfissionalWhereInput = {
    ...(modo === "MODO_DEMONSTRACAO"
      ? { tipoDado: "DEMONSTRACAO" }
      : { NOT: { tipoDado: "DEMONSTRACAO" } }),
  };

  const contatos = await prisma.contatoProfissional.findMany({
    where,
    select: { statusDecisao: true },
  });

  const resumo: ResumoContadoresRevisao = {
    total: contatos.length,
    pendentes: 0,
    aprovados: 0,
    rejeitados: 0,
    desativados: 0,
    revisarNovamente: 0,
  };

  for (const c of contatos) {
    switch (c.statusDecisao) {
      case "PENDENTE":
        resumo.pendentes++;
        break;
      case "APROVADO":
        resumo.aprovados++;
        break;
      case "REJEITADO":
        resumo.rejeitados++;
        break;
      case "DESATIVADO":
        resumo.desativados++;
        break;
      case "REVISAR_NOVAMENTE":
        resumo.revisarNovamente++;
        break;
    }
  }

  return resumo;
}

export async function decidirRevisaoContato(
  params: ParametrosDecisaoContato
): Promise<ContatoParaRevisao> {
  const contato = await prisma.contatoProfissional.findUnique({
    where: { id: params.contatoId },
    include: {
      fonte: true,
      grupoEconomico: { select: { id: true, nome: true } },
      instituicao: { select: { id: true, nome: true } },
    },
  });

  if (!contato) {
    throw new Error(`Contato profissional não encontrado: ${params.contatoId}`);
  }

  const statusAnterior = contato.statusDecisao;
  let statusNovo: StatusDecisaoContato = statusAnterior;
  let novoAtivo = contato.ativo;
  let novoStatusRevisao: StatusRevisao = contato.statusRevisao as StatusRevisao;

  // 1. Regras de Transição e Validação
  switch (params.acao) {
    case "APROVAR":
      // Regra de governança: fonte pública e URL são estritamente obrigatórias para aprovação
      if (!contato.fonteId || !contato.fonte) {
        throw new Error("Governança: contato sem fonte pública comprovada não pode ser ativado.");
      }
      if (
        contato.tipoDado !== "DEMONSTRACAO" &&
        !contato.linkedinUrl &&
        !contato.paginaProfissionalUrl &&
        !contato.fonte.url
      ) {
        throw new Error(
          "Governança: contato sem URL pública verificável não pode ser ativado comercialmente."
        );
      }
      statusNovo = "APROVADO";
      novoAtivo = true;
      novoStatusRevisao = "APROVADA";
      break;

    case "REJEITAR":
      statusNovo = "REJEITADO";
      novoAtivo = false;
      novoStatusRevisao = "REJEITADA";
      break;

    case "DESATIVAR":
      statusNovo = "DESATIVADO";
      novoAtivo = false;
      novoStatusRevisao = "REJEITADA";
      break;

    case "REVISAR_NOVAMENTE":
      statusNovo = "REVISAR_NOVAMENTE";
      novoAtivo = false;
      novoStatusRevisao = "PENDENTE";
      break;

    case "CORRIGIR_CLASSIFICACAO":
      // Mantém status ou ajusta dados
      break;

    default:
      throw new Error(`Ação de revisão desconhecida: ${params.acao}`);
  }

  const valorAnteriorObj = {
    statusDecisao: contato.statusDecisao,
    statusRevisao: contato.statusRevisao,
    ativo: contato.ativo,
    papelComercial: contato.papelComercial,
    area: contato.area,
    senioridade: contato.senioridade,
  };

  const dadosAtualizacao: Prisma.ContatoProfissionalUpdateInput = {
    statusDecisao: statusNovo,
    statusRevisao: novoStatusRevisao,
    ativo: novoAtivo,
  };

  if (params.novosDados) {
    if (params.novosDados.papelComercial) {
      dadosAtualizacao.papelComercial = params.novosDados.papelComercial;
    }
    if (params.novosDados.area) {
      dadosAtualizacao.area = params.novosDados.area;
    }
    if (params.novosDados.senioridade) {
      dadosAtualizacao.senioridade = params.novosDados.senioridade;
    }
    if (params.novosDados.justificativa) {
      dadosAtualizacao.justificativaQualidade = params.novosDados.justificativa;
    }
  }

  // Anotar no campo observacao para auditoria textual
  const notaDecisao = `[${new Date().toISOString()}] ${params.acao} por ${params.usuario}${
    params.motivo ? ` — Motivo: ${params.motivo}` : ""
  }`;
  dadosAtualizacao.observacao = contato.observacao
    ? `${contato.observacao} | ${notaDecisao}`
    : notaDecisao;

  const valorNovoObj = {
    statusDecisao: statusNovo,
    statusRevisao: novoStatusRevisao,
    ativo: novoAtivo,
    papelComercial: dadosAtualizacao.papelComercial ?? contato.papelComercial,
    area: dadosAtualizacao.area ?? contato.area,
    senioridade: dadosAtualizacao.senioridade ?? contato.senioridade,
  };

  // 2. Transação atômica: atualiza contato e insere registro de auditoria imutável
  const [contatoAtualizado] = await prisma.$transaction([
    prisma.contatoProfissional.update({
      where: { id: params.contatoId },
      data: dadosAtualizacao,
      include: {
        fonte: true,
        grupoEconomico: { select: { id: true, nome: true } },
        instituicao: { select: { id: true, nome: true } },
        historicoDecisoes: { orderBy: { dataHora: "desc" } },
      },
    }),
    prisma.historicoDecisaoContato.create({
      data: {
        contatoId: params.contatoId,
        usuario: params.usuario,
        acao: params.acao,
        statusAnterior,
        statusNovo,
        motivo: params.motivo ?? null,
        valorAnterior: JSON.stringify(valorAnteriorObj),
        valorNovo: JSON.stringify(valorNovoObj),
        observacao: params.observacao ?? null,
        evidenciaUtilizada: params.evidenciaUtilizada ?? null,
      },
    }),
  ]);

  // 3. Reconciliar quantidade de contatos ativos nas contas comerciais se o status ativo mudou
  if (contato.grupoEconomicoId && contato.ativo !== novoAtivo) {
    const totalAtivos = await prisma.contatoProfissional.count({
      where: {
        grupoEconomicoId: contato.grupoEconomicoId,
        ativo: true,
        statusDecisao: "APROVADO",
      },
    });
    await prisma.contaComercial.updateMany({
      where: { grupoEconomicoId: contato.grupoEconomicoId },
      data: { quantidadeContatos: totalAtivos },
    });
  }

  const historicoMapeado: RegistroHistoricoDecisao[] = contatoAtualizado.historicoDecisoes.map(
    (h) => ({
      id: h.id,
      contatoId: h.contatoId,
      usuario: h.usuario,
      dataHora: h.dataHora.toISOString(),
      acao: h.acao,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      motivo: h.motivo,
      valorAnterior: h.valorAnterior,
      valorNovo: h.valorNovo,
      observacao: h.observacao,
      evidenciaUtilizada: h.evidenciaUtilizada,
    })
  );

  return {
    id: contatoAtualizado.id,
    nome: contatoAtualizado.nome,
    cargo: contatoAtualizado.cargo,
    area: contatoAtualizado.area,
    empresa: contatoAtualizado.empresa,
    escopoContato: contatoAtualizado.escopoContato,
    organizacaoOuInstituicaoNome:
      contatoAtualizado.grupoEconomico?.nome ??
      contatoAtualizado.instituicao?.nome ??
      contatoAtualizado.empresa,
    papelComercial: contatoAtualizado.papelComercial,
    tipoPapelComercial: contatoAtualizado.tipoPapelComercial as TipoDado,
    confianca: contatoAtualizado.confianca,
    fonteNome: contatoAtualizado.fonte?.nome ?? "Fonte não informada",
    fonteUrl: contatoAtualizado.fonte?.url ?? null,
    dataEvidencia: contatoAtualizado.dataEvidencia.toISOString(),
    justificativa: contatoAtualizado.justificativaQualidade,
    limitacoes: contatoAtualizado.observacao,
    classificacaoCanonica: contatoAtualizado.tipoDado as TipoDado,
    statusDecisao: contatoAtualizado.statusDecisao,
    statusRevisao: contatoAtualizado.statusRevisao as StatusRevisao,
    ativo: contatoAtualizado.ativo,
    emailCorporativo: contatoAtualizado.emailCorporativo,
    telefoneProfissional: contatoAtualizado.telefoneProfissional,
    telefoneDepartamental: contatoAtualizado.telefoneDepartamental,
    ramal: contatoAtualizado.ramal,
    linkedinUrl: contatoAtualizado.linkedinUrl,
    paginaProfissionalUrl: contatoAtualizado.paginaProfissionalUrl,
    observacao: contatoAtualizado.observacao,
    grupoEconomicoId: contatoAtualizado.grupoEconomicoId,
    instituicaoId: contatoAtualizado.instituicaoId,
    historicoDecisoes: historicoMapeado,
  };
}

export async function obterHistoricoDecisoesContato(
  contatoId: string
): Promise<RegistroHistoricoDecisao[]> {
  const registros = await prisma.historicoDecisaoContato.findMany({
    where: { contatoId },
    orderBy: { dataHora: "desc" },
  });

  return registros.map((r) => ({
    id: r.id,
    contatoId: r.contatoId,
    usuario: r.usuario,
    dataHora: r.dataHora.toISOString(),
    acao: r.acao,
    statusAnterior: r.statusAnterior,
    statusNovo: r.statusNovo,
    motivo: r.motivo,
    valorAnterior: r.valorAnterior,
    valorNovo: r.valorNovo,
    observacao: r.observacao,
    evidenciaUtilizada: r.evidenciaUtilizada,
  }));
}
