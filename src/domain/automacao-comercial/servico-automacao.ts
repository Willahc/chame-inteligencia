import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  CriarRascunhoAcaoInput,
  EditarRascunhoAcaoInput,
  SubmeterRevisaoInput,
  AprovarSimulacaoInput,
  ExecutarSimulacaoInput,
  CancelarAcaoInput,
  BloquearAcaoInput,
  FiltrosAcoesPlanejadas,
  ResumoContadoresAutomacao,
  PreviaAcaoComercial,
} from "./tipos";
import {
  AVISO_CANAL_PLANEJADO,
  AVISO_SIMULACAO_CONTROLADA,
  ROTULOS_CANAIS_ACAO,
  ROTULOS_STATUS_ACAO,
} from "./tipos";
import { validarElegibilidadeAcao } from "./elegibilidade";

export function resolverInstituicoesConta(conta: {
  id: string;
  tipoDado: string;
  grupoEconomico?: { instituicoes: Array<{ id: string }> } | null;
}): Array<{ id: string }> {
  const instituicoes = conta.grupoEconomico?.instituicoes ?? [];
  if (conta.tipoDado === "DEMONSTRACAO" && instituicoes.length === 0) {
    const instDemoId = conta.id.replace("conta-", "");
    return [{ id: instDemoId }];
  }
  return instituicoes;
}

export async function criarRascunhoAcao(input: CriarRascunhoAcaoInput) {
  if (!input.criadoPor || input.criadoPor.trim() === "") {
    throw new Error("Usuário responsável pela criação da ação é obrigatório.");
  }
  if (!input.objetivo || input.objetivo.trim() === "") {
    throw new Error("O objetivo da ação comercial é obrigatório.");
  }
  if (!input.mensagemRascunho || input.mensagemRascunho.trim() === "") {
    throw new Error("A mensagem rascunho é obrigatória.");
  }

  // 1. Obter e validar conta comercial
  const conta = await prisma.contaComercial.findUnique({
    where: { id: input.contaComercialId },
    include: {
      grupoEconomico: {
        include: {
          instituicoes: { select: { id: true } },
        },
      },
    },
  });

  if (!conta) {
    throw new Error(`Conta comercial '${input.contaComercialId}' não encontrada.`);
  }

  const instituicoesConta = resolverInstituicoesConta(conta);

  // 2. Obter e validar contato se informado
  let contato = null;
  if (input.contatoProfissionalId) {
    contato = await prisma.contatoProfissional.findUnique({
      where: { id: input.contatoProfissionalId },
      include: {
        fonte: true,
      },
    });
    if (!contato) {
      throw new Error(`Contato profissional '${input.contatoProfissionalId}' não encontrado.`);
    }
  }

  // 3. Validação de elegibilidade estrita
  const validacao = validarElegibilidadeAcao({
    conta: {
      id: conta.id,
      nome: conta.nome,
      tipoDado: conta.tipoDado,
      situacaoCadastral: conta.situacaoCadastral,
      grupoEconomicoId: conta.grupoEconomicoId,
      instituicoes: instituicoesConta,
    },
    contato: contato
      ? {
          id: contato.id,
          nome: contato.nome,
          tipoDado: contato.tipoDado,
          ativo: contato.ativo,
          statusDecisao: contato.statusDecisao,
          fonteId: contato.fonteId,
          fonte: contato.fonte,
          dataEvidencia: contato.dataEvidencia,
          grupoEconomicoId: contato.grupoEconomicoId,
          instituicaoId: contato.instituicaoId,
          tipoPapelComercial: contato.tipoPapelComercial,
          papelComercial: contato.papelComercial,
          emailCorporativo: contato.emailCorporativo,
          telefoneProfissional: contato.telefoneProfissional,
          telefoneDepartamental: contato.telefoneDepartamental,
          ramal: contato.ramal,
          linkedinUrl: contato.linkedinUrl,
          paginaProfissionalUrl: contato.paginaProfissionalUrl,
        }
      : null,
    canal: input.canal,
    mensagemRascunho: input.mensagemRascunho,
  });

  if (!validacao.elegivel) {
    throw new Error(`Ação não elegível: ${validacao.erros.join("; ")}`);
  }

  // Prevenir duplicidade idêntica de rascunho ativo para mesma conta, contato e canal
  const acaoExistente = await prisma.acaoComercialPlanejada.findFirst({
    where: {
      contaComercialId: input.contaComercialId,
      contatoProfissionalId: input.contatoProfissionalId ?? null,
      canal: input.canal,
      status: { in: ["RASCUNHO", "AGUARDANDO_REVISAO", "APROVADA_PARA_SIMULACAO"] },
    },
  });

  if (acaoExistente) {
    throw new Error(
      `Já existe uma ação comercial em andamento (${ROTULOS_STATUS_ACAO[acaoExistente.status]}) para esta conta, contato e canal.`
    );
  }

  const tipoDadoAcao =
    conta.tipoDado === "DEMONSTRACAO" || contato?.tipoDado === "DEMONSTRACAO"
      ? "DEMONSTRACAO"
      : "FATO_OFICIAL";

  return prisma.$transaction(async (tx) => {
    const novaAcao = await tx.acaoComercialPlanejada.create({
      data: {
        contaComercialId: input.contaComercialId,
        contatoProfissionalId: input.contatoProfissionalId ?? null,
        tipoAcao: input.tipoAcao,
        canal: input.canal,
        objetivo: input.objetivo,
        mensagemRascunho: input.mensagemRascunho,
        status: "RASCUNHO",
        criadoPor: input.criadoPor,
        justificativa: input.justificativaInicial || null,
        tipoDado: tipoDadoAcao,
        statusRevisao: "PENDENTE",
      },
      include: {
        contaComercial: true,
        contatoProfissional: true,
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: novaAcao.id,
        acao: "CRIACAO_RASCUNHO",
        usuario: input.criadoPor,
        statusAnterior: null,
        novoStatus: "RASCUNHO",
        justificativa: input.justificativaInicial || "Criação de planejamento comercial em rascunho.",
        observacao: "Ação criada em modo planejamento. Nenhuma mensagem externa será enviada.",
        evidencias: contato?.fonteId ? `Fonte: ${contato.fonteId}` : undefined,
        conta: conta.nome,
        contato: contato?.nome ?? null,
        canal: input.canal,
      },
    });

    return novaAcao;
  });
}

export async function editarRascunhoAcao(id: string, input: EditarRascunhoAcaoInput) {
  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: {
        include: {
          grupoEconomico: {
            include: {
              instituicoes: { select: { id: true } },
            },
          },
        },
      },
      contatoProfissional: {
        include: { fonte: true },
      },
    },
  });

  if (!acao) {
    throw new Error(`Ação comercial '${id}' não encontrada.`);
  }

  if (acao.status !== "RASCUNHO" && acao.status !== "AGUARDANDO_REVISAO") {
    throw new Error(`Apenas ações em 'RASCUNHO' ou 'AGUARDANDO_REVISAO' podem ser editadas. Status atual: '${acao.status}'.`);
  }

  if (!input.usuario || input.usuario.trim() === "") {
    throw new Error("Usuário responsável pela edição é obrigatório.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    throw new Error("Justificativa para a alteração é obrigatória.");
  }

  const canalFinal = input.canal ?? acao.canal;
  const mensagemFinal = input.mensagemRascunho ?? acao.mensagemRascunho;
  const contatoIdFinal =
    input.contatoProfissionalId !== undefined ? input.contatoProfissionalId : acao.contatoProfissionalId;

  let contatoFinal = acao.contatoProfissional;
  if (contatoIdFinal && contatoIdFinal !== acao.contatoProfissionalId) {
    contatoFinal = await prisma.contatoProfissional.findUnique({
      where: { id: contatoIdFinal },
      include: { fonte: true },
    });
    if (!contatoFinal) {
      throw new Error(`Contato '${contatoIdFinal}' não encontrado.`);
    }
  } else if (contatoIdFinal === null) {
    contatoFinal = null;
  }

  const validacao = validarElegibilidadeAcao({
    conta: {
      id: acao.contaComercial.id,
      nome: acao.contaComercial.nome,
      tipoDado: acao.contaComercial.tipoDado,
      situacaoCadastral: acao.contaComercial.situacaoCadastral,
      grupoEconomicoId: acao.contaComercial.grupoEconomicoId,
      instituicoes: resolverInstituicoesConta(acao.contaComercial),
    },
    contato: contatoFinal
      ? {
          id: contatoFinal.id,
          nome: contatoFinal.nome,
          tipoDado: contatoFinal.tipoDado,
          ativo: contatoFinal.ativo,
          statusDecisao: contatoFinal.statusDecisao,
          fonteId: contatoFinal.fonteId,
          fonte: contatoFinal.fonte,
          dataEvidencia: contatoFinal.dataEvidencia,
          grupoEconomicoId: contatoFinal.grupoEconomicoId,
          instituicaoId: contatoFinal.instituicaoId,
          tipoPapelComercial: contatoFinal.tipoPapelComercial,
          papelComercial: contatoFinal.papelComercial,
          emailCorporativo: contatoFinal.emailCorporativo,
          telefoneProfissional: contatoFinal.telefoneProfissional,
          telefoneDepartamental: contatoFinal.telefoneDepartamental,
          ramal: contatoFinal.ramal,
          linkedinUrl: contatoFinal.linkedinUrl,
          paginaProfissionalUrl: contatoFinal.paginaProfissionalUrl,
        }
      : null,
    canal: canalFinal,
    mensagemRascunho: mensagemFinal,
  });

  if (!validacao.elegivel) {
    throw new Error(`Ação não elegível após edição: ${validacao.erros.join("; ")}`);
  }

  return prisma.$transaction(async (tx) => {
    const acaoAtualizada = await tx.acaoComercialPlanejada.update({
      where: { id },
      data: {
        tipoAcao: input.tipoAcao ?? acao.tipoAcao,
        canal: canalFinal,
        objetivo: input.objetivo ?? acao.objetivo,
        mensagemRascunho: mensagemFinal,
        contatoProfissionalId: contatoIdFinal,
        justificativa: input.justificativa,
      },
      include: {
        contaComercial: true,
        contatoProfissional: true,
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: id,
        acao: "EDICAO_RASCUNHO",
        usuario: input.usuario,
        statusAnterior: acao.status,
        novoStatus: acao.status,
        justificativa: input.justificativa,
        observacao: "Edição de parâmetros do planejamento comercial.",
        conta: acao.contaComercial.nome,
        contato: contatoFinal?.nome ?? null,
        canal: canalFinal,
      },
    });

    return acaoAtualizada;
  });
}

export async function submeterParaRevisao(id: string, input: SubmeterRevisaoInput) {
  if (!input.usuario || input.usuario.trim() === "") {
    throw new Error("Usuário solicitante é obrigatório para submissão.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    throw new Error("Justificativa de submissão é obrigatória.");
  }

  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: {
        include: {
          grupoEconomico: {
            include: {
              instituicoes: { select: { id: true } },
            },
          },
        },
      },
      contatoProfissional: {
        include: { fonte: true },
      },
    },
  });

  if (!acao) {
    throw new Error(`Ação comercial '${id}' não encontrada.`);
  }

  if (acao.status !== "RASCUNHO") {
    throw new Error(`Apenas ações em 'RASCUNHO' podem ser submetidas para revisão. Status atual: '${acao.status}'.`);
  }

  // Revalidar elegibilidade antes da submissão
  const validacao = validarElegibilidadeAcao({
    conta: {
      id: acao.contaComercial.id,
      nome: acao.contaComercial.nome,
      tipoDado: acao.contaComercial.tipoDado,
      situacaoCadastral: acao.contaComercial.situacaoCadastral,
      grupoEconomicoId: acao.contaComercial.grupoEconomicoId,
      instituicoes: resolverInstituicoesConta(acao.contaComercial),
    },
    contato: acao.contatoProfissional
      ? {
          id: acao.contatoProfissional.id,
          nome: acao.contatoProfissional.nome,
          tipoDado: acao.contatoProfissional.tipoDado,
          ativo: acao.contatoProfissional.ativo,
          statusDecisao: acao.contatoProfissional.statusDecisao,
          fonteId: acao.contatoProfissional.fonteId,
          fonte: acao.contatoProfissional.fonte,
          dataEvidencia: acao.contatoProfissional.dataEvidencia,
          grupoEconomicoId: acao.contatoProfissional.grupoEconomicoId,
          instituicaoId: acao.contatoProfissional.instituicaoId,
          tipoPapelComercial: acao.contatoProfissional.tipoPapelComercial,
          papelComercial: acao.contatoProfissional.papelComercial,
          emailCorporativo: acao.contatoProfissional.emailCorporativo,
          telefoneProfissional: acao.contatoProfissional.telefoneProfissional,
          telefoneDepartamental: acao.contatoProfissional.telefoneDepartamental,
          ramal: acao.contatoProfissional.ramal,
          linkedinUrl: acao.contatoProfissional.linkedinUrl,
          paginaProfissionalUrl: acao.contatoProfissional.paginaProfissionalUrl,
        }
      : null,
    canal: acao.canal,
    mensagemRascunho: acao.mensagemRascunho,
  });

  if (!validacao.elegivel) {
    throw new Error(`Submissão bloqueada por inelegibilidade: ${validacao.erros.join("; ")}`);
  }

  return prisma.$transaction(async (tx) => {
    const atualizada = await tx.acaoComercialPlanejada.update({
      where: { id },
      data: {
        status: "AGUARDANDO_REVISAO",
        justificativa: input.justificativa,
      },
      include: {
        contaComercial: true,
        contatoProfissional: true,
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: id,
        acao: "SUBMISSAO_REVISAO",
        usuario: input.usuario,
        statusAnterior: "RASCUNHO",
        novoStatus: "AGUARDANDO_REVISAO",
        justificativa: input.justificativa,
        observacao: "Ação submetida à revisão humana para validação prévia de simulação.",
        conta: acao.contaComercial.nome,
        contato: acao.contatoProfissional?.nome ?? null,
        canal: acao.canal,
      },
    });

    return atualizada;
  });
}

export async function aprovarParaSimulacao(id: string, input: AprovarSimulacaoInput) {
  if (!input.usuarioAprovador || input.usuarioAprovador.trim() === "") {
    throw new Error("Usuário aprovador é obrigatório para aprovação da ação.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    throw new Error("Justificativa formal é obrigatória para aprovação humana.");
  }

  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: {
        include: {
          grupoEconomico: {
            include: {
              instituicoes: { select: { id: true } },
            },
          },
        },
      },
      contatoProfissional: {
        include: { fonte: true },
      },
    },
  });

  if (!acao) {
    throw new Error(`Ação comercial '${id}' não encontrada.`);
  }

  if (acao.status !== "AGUARDANDO_REVISAO" && acao.status !== "RASCUNHO") {
    throw new Error(`Ação em status '${acao.status}' não pode ser aprovada. Deve estar em 'AGUARDANDO_REVISAO'.`);
  }

  // Validação estrita de elegibilidade
  const validacao = validarElegibilidadeAcao({
    conta: {
      id: acao.contaComercial.id,
      nome: acao.contaComercial.nome,
      tipoDado: acao.contaComercial.tipoDado,
      situacaoCadastral: acao.contaComercial.situacaoCadastral,
      grupoEconomicoId: acao.contaComercial.grupoEconomicoId,
      instituicoes: resolverInstituicoesConta(acao.contaComercial),
    },
    contato: acao.contatoProfissional
      ? {
          id: acao.contatoProfissional.id,
          nome: acao.contatoProfissional.nome,
          tipoDado: acao.contatoProfissional.tipoDado,
          ativo: acao.contatoProfissional.ativo,
          statusDecisao: acao.contatoProfissional.statusDecisao,
          fonteId: acao.contatoProfissional.fonteId,
          fonte: acao.contatoProfissional.fonte,
          dataEvidencia: acao.contatoProfissional.dataEvidencia,
          grupoEconomicoId: acao.contatoProfissional.grupoEconomicoId,
          instituicaoId: acao.contatoProfissional.instituicaoId,
          tipoPapelComercial: acao.contatoProfissional.tipoPapelComercial,
          papelComercial: acao.contatoProfissional.papelComercial,
          emailCorporativo: acao.contatoProfissional.emailCorporativo,
          telefoneProfissional: acao.contatoProfissional.telefoneProfissional,
          telefoneDepartamental: acao.contatoProfissional.telefoneDepartamental,
          ramal: acao.contatoProfissional.ramal,
          linkedinUrl: acao.contatoProfissional.linkedinUrl,
          paginaProfissionalUrl: acao.contatoProfissional.paginaProfissionalUrl,
        }
      : null,
    canal: acao.canal,
    mensagemRascunho: acao.mensagemRascunho,
  });

  if (!validacao.elegivel) {
    throw new Error(`Aprovação rejeitada: ${validacao.erros.join("; ")}`);
  }

  return prisma.$transaction(async (tx) => {
    const atualizada = await tx.acaoComercialPlanejada.update({
      where: { id },
      data: {
        status: "APROVADA_PARA_SIMULACAO",
        aprovadoPor: input.usuarioAprovador,
        aprovadoEm: new Date(),
        justificativa: input.justificativa,
        statusRevisao: "APROVADA",
      },
      include: {
        contaComercial: true,
        contatoProfissional: true,
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: id,
        acao: "APROVACAO_SIMULACAO",
        usuario: input.usuarioAprovador,
        statusAnterior: acao.status,
        novoStatus: "APROVADA_PARA_SIMULACAO",
        justificativa: input.justificativa,
        observacao: input.observacao || "Ação comercial formalmente aprovada por operador humano para simulação controlada.",
        evidencias: acao.contatoProfissional?.fonteId ? `Fonte: ${acao.contatoProfissional.fonteId}` : undefined,
        conta: acao.contaComercial.nome,
        contato: acao.contatoProfissional?.nome ?? null,
        canal: acao.canal,
      },
    });

    return atualizada;
  });
}

export async function executarSimulacao(id: string, input: ExecutarSimulacaoInput) {
  if (!input.usuario || input.usuario.trim() === "") {
    throw new Error("Usuário executor da simulação é obrigatório.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    throw new Error("Justificativa para a execução da simulação é obrigatória.");
  }

  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: true,
      contatoProfissional: {
        include: { fonte: true },
      },
    },
  });

  if (!acao) {
    throw new Error(`Ação comercial '${id}' não encontrada.`);
  }

  if (acao.status !== "APROVADA_PARA_SIMULACAO") {
    throw new Error(
      `Apenas ações com status 'APROVADA_PARA_SIMULACAO' podem ser simuladas. Status atual: '${acao.status}'.`
    );
  }

  /*
   * REGRA DE SEGURANÇA ABSOLUTA GATE 8:
   * NÃO enviar e-mail.
   * NÃO disparar WhatsApp.
   * NÃO discar telefone.
   * NÃO realizar chamadas à API do LinkedIn.
   * NÃO consultar CRM externo.
   * A simulação é puramente local e auditável em banco.
   */
  const resultadoSimulacao = {
    acaoId: acao.id,
    executadoPor: input.usuario,
    executadoEm: new Date().toISOString(),
    statusFinal: "SIMULADA" as const,
    canal: acao.canal,
    contaAlvo: acao.contaComercial.nome,
    contatoAlvo: acao.contatoProfissional?.nome ?? "Conta sem contato direto",
    disparoExternoRealizado: false,
    mensagemAlerta: AVISO_SIMULACAO_CONTROLADA,
  };

  await prisma.$transaction(async (tx) => {
    await tx.acaoComercialPlanejada.update({
      where: { id },
      data: {
        status: "SIMULADA",
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: id,
        acao: "EXECUCAO_SIMULACAO",
        usuario: input.usuario,
        statusAnterior: "APROVADA_PARA_SIMULACAO",
        novoStatus: "SIMULADA",
        justificativa: input.justificativa,
        observacao: `Simulação concluída com sucesso em ambiente de testes. ${AVISO_SIMULACAO_CONTROLADA}`,
        conta: acao.contaComercial.nome,
        contato: acao.contatoProfissional?.nome ?? null,
        canal: acao.canal,
      },
    });
  });

  return resultadoSimulacao;
}

export async function cancelarAcao(id: string, input: CancelarAcaoInput) {
  if (!input.usuario || input.usuario.trim() === "") {
    throw new Error("Usuário responsável pelo cancelamento é obrigatório.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    throw new Error("Justificativa de cancelamento é obrigatória.");
  }

  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: true,
      contatoProfissional: true,
    },
  });

  if (!acao) {
    throw new Error(`Ação comercial '${id}' não encontrada.`);
  }

  if (acao.status === "CANCELADA") {
    throw new Error("A ação comercial já está cancelada.");
  }

  return prisma.$transaction(async (tx) => {
    const atualizada = await tx.acaoComercialPlanejada.update({
      where: { id },
      data: {
        status: "CANCELADA",
      },
      include: {
        contaComercial: true,
        contatoProfissional: true,
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: id,
        acao: "CANCELAMENTO",
        usuario: input.usuario,
        statusAnterior: acao.status,
        novoStatus: "CANCELADA",
        justificativa: input.justificativa,
        observacao: input.observacao || "Ação comercial cancelada pelo usuário.",
        conta: acao.contaComercial.nome,
        contato: acao.contatoProfissional?.nome ?? null,
        canal: acao.canal,
      },
    });

    return atualizada;
  });
}

export async function bloquearAcao(id: string, input: BloquearAcaoInput) {
  if (!input.usuario || input.usuario.trim() === "") {
    throw new Error("Usuário responsável pelo bloqueio é obrigatório.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    throw new Error("Justificativa de bloqueio é obrigatória.");
  }

  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: true,
      contatoProfissional: true,
    },
  });

  if (!acao) {
    throw new Error(`Ação comercial '${id}' não encontrada.`);
  }

  return prisma.$transaction(async (tx) => {
    const atualizada = await tx.acaoComercialPlanejada.update({
      where: { id },
      data: {
        status: "BLOQUEADA",
      },
      include: {
        contaComercial: true,
        contatoProfissional: true,
      },
    });

    await tx.historicoAcaoComercial.create({
      data: {
        acaoComercialId: id,
        acao: "BLOQUEIO",
        usuario: input.usuario,
        statusAnterior: acao.status,
        novoStatus: "BLOQUEADA",
        justificativa: input.justificativa,
        observacao: input.observacao || "Ação bloqueada por inconformidade de governança ou contato revogado.",
        conta: acao.contaComercial.nome,
        contato: acao.contatoProfissional?.nome ?? null,
        canal: acao.canal,
      },
    });

    return atualizada;
  });
}

export async function listarAcoesPlanejadas(filtros: FiltrosAcoesPlanejadas = {}) {
  const modo = filtros.modo ?? "MODO_REAL";
  const where: Prisma.AcaoComercialPlanejadaWhereInput = {
    ...(modo === "MODO_DEMONSTRACAO"
      ? { tipoDado: "DEMONSTRACAO" }
      : { NOT: { tipoDado: "DEMONSTRACAO" } }),
  };

  if (filtros.status) {
    where.status = filtros.status;
  }

  if (filtros.canal) {
    where.canal = filtros.canal;
  }

  if (filtros.faixaPrioridade) {
    where.contaComercial = {
      is: {
        faixaPrioridadeComercial: filtros.faixaPrioridade,
      },
    };
  }

  if (filtros.busca && filtros.busca.trim() !== "") {
    const termo = filtros.busca.trim();
    where.OR = [
      { objetivo: { contains: termo } },
      { mensagemRascunho: { contains: termo } },
      { contaComercial: { nome: { contains: termo } } },
      { contatoProfissional: { nome: { contains: termo } } },
    ];
  }

  return prisma.acaoComercialPlanejada.findMany({
    where,
    include: {
      contaComercial: true,
      contatoProfissional: {
        include: { fonte: true },
      },
      historico: {
        orderBy: { dataHora: "desc" },
        take: 1,
      },
    },
    orderBy: { criadoEm: "desc" },
  });
}

export async function obterResumoContadoresAutomacao(
  modo: "MODO_REAL" | "MODO_DEMONSTRACAO" = "MODO_REAL"
): Promise<ResumoContadoresAutomacao> {
  const whereModo =
    modo === "MODO_DEMONSTRACAO"
      ? { tipoDado: "DEMONSTRACAO" as const }
      : { NOT: { tipoDado: "DEMONSTRACAO" as const } };

  const [
    total,
    rascunhos,
    aguardandoRevisao,
    aprovadasParaSimulacao,
    simuladas,
    canceladas,
    bloqueadas,
  ] = await Promise.all([
    prisma.acaoComercialPlanejada.count({ where: whereModo }),
    prisma.acaoComercialPlanejada.count({ where: { ...whereModo, status: "RASCUNHO" } }),
    prisma.acaoComercialPlanejada.count({ where: { ...whereModo, status: "AGUARDANDO_REVISAO" } }),
    prisma.acaoComercialPlanejada.count({ where: { ...whereModo, status: "APROVADA_PARA_SIMULACAO" } }),
    prisma.acaoComercialPlanejada.count({ where: { ...whereModo, status: "SIMULADA" } }),
    prisma.acaoComercialPlanejada.count({ where: { ...whereModo, status: "CANCELADA" } }),
    prisma.acaoComercialPlanejada.count({ where: { ...whereModo, status: "BLOQUEADA" } }),
  ]);

  return {
    total,
    rascunhos,
    aguardandoRevisao,
    aprovadasParaSimulacao,
    simuladas,
    canceladas,
    bloqueadas,
  };
}

export async function obterPreviaAcao(id: string): Promise<PreviaAcaoComercial | null> {
  const acao = await prisma.acaoComercialPlanejada.findUnique({
    where: { id },
    include: {
      contaComercial: true,
      contatoProfissional: {
        include: { fonte: true },
      },
    },
  });

  if (!acao) {
    return null;
  }

  return {
    id: acao.id,
    conta: {
      id: acao.contaComercial.id,
      nome: acao.contaComercial.nome,
      cidades: acao.contaComercial.cidades,
      natureza: acao.contaComercial.natureza,
      faixaPrioridade: acao.contaComercial.faixaPrioridadeComercial,
      indicePrioridade: acao.contaComercial.indicePrioridadeComercial,
      tipoDado: acao.contaComercial.tipoDado,
    },
    contato: acao.contatoProfissional
      ? {
          id: acao.contatoProfissional.id,
          nome: acao.contatoProfissional.nome,
          cargo: acao.contatoProfissional.cargo,
          area: acao.contatoProfissional.area,
          empresa: acao.contatoProfissional.empresa,
          canalAlvo:
            acao.canal === "EMAIL"
              ? acao.contatoProfissional.emailCorporativo
              : acao.canal === "TELEFONE" || acao.canal === "WHATSAPP"
              ? acao.contatoProfissional.telefoneProfissional ||
                acao.contatoProfissional.telefoneDepartamental
              : acao.contatoProfissional.linkedinUrl ||
                acao.contatoProfissional.paginaProfissionalUrl,
          fonte: acao.contatoProfissional.fonte
            ? {
                nome: acao.contatoProfissional.fonte.nome,
                url: acao.contatoProfissional.fonte.url,
              }
            : null,
          confianca: acao.contatoProfissional.confianca,
          papelComercial: acao.contatoProfissional.papelComercial,
          tipoPapelComercial: acao.contatoProfissional.tipoPapelComercial,
          statusDecisao: acao.contatoProfissional.statusDecisao,
          dataEvidencia: acao.contatoProfissional.dataEvidencia.toISOString(),
        }
      : null,
    acao: {
      tipoAcao: acao.tipoAcao,
      canal: acao.canal,
      rotuloCanal: ROTULOS_CANAIS_ACAO[acao.canal],
      objetivo: acao.objetivo,
      mensagemRascunho: acao.mensagemRascunho,
      status: acao.status,
      rotuloStatus: ROTULOS_STATUS_ACAO[acao.status],
      criadoPor: acao.criadoPor,
      criadoEm: acao.criadoEm.toISOString(),
      aprovadoPor: acao.aprovadoPor,
      aprovadoEm: acao.aprovadoEm?.toISOString() ?? null,
      justificativa: acao.justificativa,
      avisoCanalPlanejado: AVISO_CANAL_PLANEJADO,
      avisoSimulacao: AVISO_SIMULACAO_CONTROLADA,
    },
  };
}

export async function obterHistoricoAcao(acaoComercialId: string) {
  return prisma.historicoAcaoComercial.findMany({
    where: { acaoComercialId },
    orderBy: { dataHora: "asc" },
  });
}
