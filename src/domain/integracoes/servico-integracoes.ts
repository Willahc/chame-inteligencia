import { prisma } from "@/lib/prisma";
import type {
  IntegracaoExterna,
  EventoIntegracao,
  TipoIntegracaoExterna,
  AmbienteIntegracao,
  ContaComercial,
  ContatoProfissional,
  AcaoComercialPlanejada,
  Fonte,
  Prisma,
} from "@prisma/client";
import {
  AVISO_BLOQUEIO_PRODUCAO,
  AVISO_INTEGRACOES_SIMULACAO,
  LIMITE_MAXIMO_LOTE_SIMULACAO,
  type PreviaSimulacao,
  type ResumoContadoresIntegracoes,
  type SolicitacaoSimulacaoInput,
  type FiltrosEventosIntegracao,
  type RespostaSimuladaIntegracao,
  type PayloadCRM,
  type PayloadEmail,
  type PayloadWhatsApp,
  type PayloadDiscador,
} from "./tipos";
import { AdaptadorCRMSimulador } from "./adaptadores/crm";
import { AdaptadorEmailSimulador } from "./adaptadores/email";
import { AdaptadorWhatsAppSimulador } from "./adaptadores/whatsapp";
import { AdaptadorDiscadorSimulador } from "./adaptadores/discador";
import {
  AdaptadorEmailHomologacao,
  circuitBreakerHomologacao,
  rateLimiterHomologacao,
  isKillSwitchAtivo,
  ativarKillSwitch,
  desativarKillSwitch,
  resetarEstadoHomologacao,
  carregarCredenciaisSandbox,
  obterDiagnosticoMailtrapSandbox,
  getContadorMensagensGate11,
  getLimiteMensagensGate11,
  setLimiteMensagensGate11,
  resetarContadorMensagensGate11,
  LIMITE_MAXIMO_MENSAGENS_GATE_11,
  ENDPOINT_SANDBOX_MAILTRAP_BASE,
  AVISO_HOMOLOGACAO_SANDBOX,
  TIMEOUT_HOMOLOGACAO_MS,
  LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO,
} from "./adaptadores/email-homologacao";

const adaptadorCRM = new AdaptadorCRMSimulador();
const adaptadorEmail = new AdaptadorEmailSimulador();
const adaptadorEmailHomologacao = new AdaptadorEmailHomologacao();
const adaptadorWhatsApp = new AdaptadorWhatsAppSimulador();
const adaptadorDiscador = new AdaptadorDiscadorSimulador();

const REGEX_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const PROVEDORES_EMAIL_PESSOAL = [
  "@gmail.com",
  "@hotmail.com",
  "@yahoo.com",
  "@yahoo.com.br",
  "@outlook.com",
  "@live.com",
  "@icloud.com",
  "@bol.com.br",
  "@uol.com.br",
  "@ig.com.br",
  "@terra.com.br",
];

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

export async function obterOuInicializarIntegracoes(): Promise<IntegracaoExterna[]> {
  const existentes = await prisma.integracaoExterna.findMany({
    orderBy: { criadoEm: "asc" },
  });

  if (existentes.length > 0) {
    // Migração transparente de configuração legada do conector de e-mail para o Gate 10 (Mailtrap Sandbox)
    const emailLegado = existentes.find(
      (i) => i.tipo === "EMAIL" && i.nome === "Servidor de E-mail Corporativo B2B"
    );
    if (emailLegado) {
      await prisma.integracaoExterna.update({
        where: { id: emailLegado.id },
        data: {
          nome: "Servidor de E-mail Corporativo (Mailtrap Sandbox)",
          ambiente: "HOMOLOGACAO",
          configuracaoJson: JSON.stringify({
            provedor: "Mailtrap Email Sandbox API",
            sandbox: true,
            endpoint: "https://sandbox.api.mailtrap.io/api/send",
            timeoutMs: 3000,
            limiteTaxaPorMinuto: 5,
          }),
          descricao:
            "Adaptador de envio de e-mails corporativos homologado no Gate 10 via sandbox do Mailtrap.",
        },
      });
      return prisma.integracaoExterna.findMany({
        orderBy: { criadoEm: "asc" },
      });
    }
    return existentes;
  }

  const padroes: Array<{
    nome: string;
    tipo: TipoIntegracaoExterna;
    ambiente: AmbienteIntegracao;
    configuracaoJson: string;
    descricao: string;
  }> = [
    {
      nome: "CRM Comercial Corporativo",
      tipo: "CRM",
      ambiente: "SIMULACAO",
      configuracaoJson: JSON.stringify({
        provedor: "Simulador CRM B2B",
        sandbox: true,
        versaoApi: "v1-sandbox",
        limiteTaxaPorMinuto: 60,
      }),
      descricao: "Conector desacoplado para sincronização de contas, contatos corporativos e oportunidades em sandbox.",
    },
    {
      nome: "Servidor de E-mail Corporativo (Mailtrap Sandbox)",
      tipo: "EMAIL",
      ambiente: "HOMOLOGACAO",
      configuracaoJson: JSON.stringify({
        provedor: "Mailtrap Email Sandbox API",
        sandbox: true,
        endpoint: "https://sandbox.api.mailtrap.io/api/send",
        timeoutMs: 3000,
        limiteTaxaPorMinuto: 5,
      }),
      descricao: "Adaptador de envio de e-mails corporativos homologado no Gate 10 via sandbox do Mailtrap.",
    },
    {
      nome: "WhatsApp Oficial Corporativo (B2B)",
      tipo: "WHATSAPP",
      ambiente: "SIMULACAO",
      configuracaoJson: JSON.stringify({
        provedor: "Simulador WhatsApp Cloud API",
        sandbox: true,
        formatoTelefone: "E.164",
      }),
      descricao: "Conector para envio de comunicações operacionais via WhatsApp em ambiente restrito de simulação.",
    },
    {
      nome: "Central Telefônica / Discador B2B",
      tipo: "DISCADOR",
      ambiente: "SIMULACAO",
      configuracaoJson: JSON.stringify({
        provedor: "Simulador SIP Trunk Corporativo",
        sandbox: true,
        protocolo: "SIP/2.0",
      }),
      descricao: "Adaptador para centrais telefônicas e discadores de SDR operando estritamente em simulação.",
    },
  ];

  await prisma.$transaction(
    padroes.map((p) =>
      prisma.integracaoExterna.create({
        data: {
          nome: p.nome,
          tipo: p.tipo,
          ambiente: p.ambiente,
          status: "ATIVA",
          configuracaoJson: p.configuracaoJson,
          descricao: p.descricao,
        },
      })
    )
  );

  return prisma.integracaoExterna.findMany({
    orderBy: { criadoEm: "asc" },
  });
}

export type ContaComInstituicoes = ContaComercial & {
  grupoEconomico?: {
    instituicoes: { id: string }[];
  } | null;
};

export type ContatoComFonte = ContatoProfissional & {
  fonte: Fonte;
};

export async function validarElegibilidadeIntegracao(
  input: SolicitacaoSimulacaoInput
): Promise<{
  elegivel: boolean;
  erros: string[];
  avisos: string[];
  integracao: IntegracaoExterna | null;
  conta: ContaComInstituicoes | null;
  contato: ContatoComFonte | null;
  acao: AcaoComercialPlanejada | null;
}> {
  const erros: string[] = [];
  const avisos: string[] = [AVISO_INTEGRACOES_SIMULACAO];

  // 1. Validar campos de governança humana
  if (!input.usuarioSolicitante || input.usuarioSolicitante.trim() === "") {
    erros.push("Usuário solicitante é obrigatório para acionar a integração.");
  }
  if (!input.justificativa || input.justificativa.trim() === "") {
    erros.push("Justificativa formal do operador é obrigatória.");
  }
  if (!input.finalidadeComercial || input.finalidadeComercial.trim() === "") {
    erros.push("Finalidade comercial registrada é obrigatória para compliance LGPD.");
  }

  // 2. Validar integração
  const integracao = await prisma.integracaoExterna.findUnique({
    where: { id: input.integracaoId },
  });

  if (!integracao) {
    erros.push(`Integração com ID '${input.integracaoId}' não encontrada.`);
    return {
      elegivel: false,
      erros,
      avisos,
      integracao: null,
      conta: null,
      contato: null,
      acao: null,
    };
  }

  if (integracao.status !== "ATIVA") {
    erros.push(
      `Integração '${integracao.nome}' não está ativa para operações. Status atual: '${integracao.status}'.`
    );
  }

  // Trava de segurança: Modo de produção terminantemente bloqueado
  if (integracao.ambiente === "PRODUCAO") {
    erros.push(
      `${AVISO_BLOQUEIO_PRODUCAO} Ambiente configurado: 'PRODUCAO'. O acesso ao ambiente de produção permanece terminantemente proibido.`
    );
  } else if (integracao.ambiente === "HOMOLOGACAO") {
    if (integracao.tipo !== "EMAIL") {
      erros.push(
        `Apenas o conector de E-mail Corporativo (Mailtrap Sandbox) está homologado no Gate 10 e 11. Conectores do tipo '${integracao.tipo}' operam exclusivamente em SIMULACAO.`
      );
    }
    if (isKillSwitchAtivo()) {
      erros.push(
        "Operação de homologação bloqueada pelo Kill-Switch de segurança (INTEGRACOES_KILL_SWITCH ativo)."
      );
    }
    if (circuitBreakerHomologacao.isAberto()) {
      erros.push(
        `Conexão de homologação bloqueada pelo Circuit Breaker após ${circuitBreakerHomologacao.getFalhasConsecutivas()} falhas consecutivas. Aguarde o período de esfriamento.`
      );
    }
    if (!rateLimiterHomologacao.podeExecutar()) {
      erros.push(
        `Limite de taxa de homologação excedido (máximo de ${LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO} requisições por minuto).`
      );
    }
    if (getContadorMensagensGate11() >= getLimiteMensagensGate11()) {
      erros.push(
        `Limite máximo de ${getLimiteMensagensGate11()} mensagens para homologação do Gate 11 atingido. Novos disparos bloqueados por segurança.`
      );
    }
    avisos.push(AVISO_HOMOLOGACAO_SANDBOX);
  } else if (integracao.ambiente === "DESABILITADA") {
    erros.push(`Integração '${integracao.nome}' está desabilitada.`);
  }

  // 3. Validar conta comercial
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
    erros.push(`Conta comercial '${input.contaComercialId}' não encontrada.`);
    return {
      elegivel: false,
      erros,
      avisos,
      integracao,
      conta: null,
      contato: null,
      acao: null,
    };
  }

  const instituicoes = resolverInstituicoesConta(conta);
  if (instituicoes.length === 0) {
    erros.push(
      `Conta comercial '${conta.nome}' não possui instituição de saúde vinculada ou agrupamento econômico válido.`
    );
  }

  if (integracao.ambiente === "HOMOLOGACAO" && conta.tipoDado !== "DEMONSTRACAO") {
    erros.push(
      "O ambiente de homologação autoriza exclusivamente contas de demonstração (DEMONSTRACAO). Contas reais são estritamente bloqueadas."
    );
  }

  // 4. Validar contato se informado
  let contato: ContatoComFonte | null = null;
  if (input.contatoProfissionalId) {
    contato = await prisma.contatoProfissional.findUnique({
      where: { id: input.contatoProfissionalId },
      include: { fonte: true },
    });

    if (!contato) {
      erros.push(`Contato profissional '${input.contatoProfissionalId}' não encontrado.`);
    } else {
      // Regra Gate 7 & LGPD: contato deve estar formalmente APROVADO e ATIVO
      if (contato.statusDecisao !== "APROVADO") {
        erros.push(
          `Contato '${contato.nome}' não está aprovado (status atual: '${contato.statusDecisao}'). Apenas contatos com decisão 'APROVADO' podem ser alvo de integração.`
        );
      }
      if (!contato.ativo) {
        erros.push(
          `Contato '${contato.nome}' está inativo ou desativado. Não é permitido acionar integrações para contatos inativos.`
        );
      }
      if (contato.statusRevisao === "REJEITADA") {
        erros.push(`Contato '${contato.nome}' foi rejeitado na revisão humana de dados.`);
      }

      // Fonte pública e evidência documental
      if (!contato.fonteId || contato.fonteId.trim() === "" || !contato.fonte) {
        erros.push(`Contato '${contato.nome}' não possui fonte pública verificável vinculada.`);
      }
      if (!contato.dataEvidencia) {
        erros.push(`Contato '${contato.nome}' não possui data de evidência documental.`);
      }

      // Isolamento estrito entre DEMONSTRACAO e FATO_OFICIAL / FATO_PUBLICO
      if (conta.tipoDado === "DEMONSTRACAO" && contato.tipoDado !== "DEMONSTRACAO") {
        erros.push(
          "Violação de isolamento canônico: Conta DEMONSTRACAO não pode ser vinculada a contato real."
        );
      }
      if (conta.tipoDado !== "DEMONSTRACAO" && contato.tipoDado === "DEMONSTRACAO") {
        erros.push(
          "Violação de isolamento canônico: Conta real não pode ser vinculada a contato DEMONSTRACAO."
        );
      }

      if (integracao.ambiente === "HOMOLOGACAO" && contato.tipoDado !== "DEMONSTRACAO") {
        erros.push(
          "O ambiente de homologação autoriza exclusivamente contatos de demonstração (DEMONSTRACAO). Contatos reais são estritamente bloqueados."
        );
      }

      // Validar presença de canal correspondente ao tipo de integração
      if (integracao.tipo === "EMAIL") {
        const emailAlvo = (input.dadosEspecificos?.destinatarioEmail as string) || contato.emailCorporativo;
        if (!emailAlvo || !emailAlvo.includes("@")) {
          erros.push(`Contato '${contato.nome}' não possui e-mail corporativo válido publicado.`);
        } else if (PROVEDORES_EMAIL_PESSOAL.some((dom) => emailAlvo.toLowerCase().endsWith(dom))) {
          erros.push("Uso proibido de endereço de e-mail pessoal não corporativo.");
        } else if (integracao.ambiente === "HOMOLOGACAO" && !emailAlvo.toLowerCase().endsWith(".example")) {
          erros.push(
            "O destinatário em ambiente de homologação deve pertencer estritamente ao domínio reservado '.example' (RFC 2606). Destinatários reais são proibidos."
          );
        }
      }
      if (integracao.tipo === "WHATSAPP" || integracao.tipo === "DISCADOR") {
        const tel = contato.telefoneProfissional || contato.telefoneDepartamental;
        if (!tel || tel.replace(/\D/g, "").length < 8) {
          erros.push(
            `Contato '${contato.nome}' não possui telefone corporativo válido registrado.`
          );
        }
      }
    }
  }

  // 5. Validar ação comercial se vinculada (Gate 8)
  let acao: AcaoComercialPlanejada | null = null;
  if (input.acaoComercialId) {
    acao = await prisma.acaoComercialPlanejada.findUnique({
      where: { id: input.acaoComercialId },
    });

    if (!acao) {
      erros.push(`Ação comercial '${input.acaoComercialId}' não encontrada.`);
    } else {
      if (acao.status !== "APROVADA_PARA_SIMULACAO" && acao.status !== "SIMULADA") {
        erros.push(
          `Ação comercial '${acao.id}' está com status '${acao.status}'. Apenas ações aprovadas para simulação ('APROVADA_PARA_SIMULACAO' ou 'SIMULADA') podem ser integradas.`
        );
      }
    }
  }

  // 6. Validar dados específicos, credenciais proibidas e dados pessoais restritos (CPF)
  if (input.dadosEspecificos) {
    const chaves = Object.keys(input.dadosEspecificos).map((k) => k.toLowerCase());
    const chavesProibidas = ["senha", "password", "token", "secret", "apikey", "bearer", "authorization"];
    if (chaves.some((k) => chavesProibidas.some((p) => k.includes(p)))) {
      erros.push("Payload contém credencial, senha ou token de acesso proibido.");
    }

    const valoresTexto = Object.values(input.dadosEspecificos).filter(
      (v): v is string => typeof v === "string"
    );
    if (valoresTexto.some((v) => REGEX_CPF.test(v))) {
      erros.push("Payload contém CPF ou dado pessoal proibido por regras de privacidade.");
    }
  }

  if (REGEX_CPF.test(input.justificativa) || REGEX_CPF.test(input.finalidadeComercial)) {
    erros.push("A justificativa ou finalidade contém CPF proibido.");
  }

  return {
    elegivel: erros.length === 0,
    erros,
    avisos,
    integracao,
    conta,
    contato,
    acao,
  };
}

export async function gerarPreviaSimulacao(
  input: SolicitacaoSimulacaoInput
): Promise<PreviaSimulacao> {
  const validacao = await validarElegibilidadeIntegracao(input);
  const { integracao, conta, contato, acao, elegivel, erros, avisos } = validacao;

  let payloadSanitizado: Record<string, unknown> = {};

  if (integracao && conta) {
    const base = {
      contaId: conta.id,
      contaNome: conta.nome,
      contatoId: contato?.id,
      contatoNome: contato?.nome,
      cargo: contato?.cargo,
      finalidadeComercial: input.finalidadeComercial || "Apresentação de soluções corporativas B2B",
      justificativa: input.justificativa || "Simulação operacional prévia para validação técnica",
      usuarioSolicitante: input.usuarioSolicitante || "operador-sistema",
      modoSimulacao: true as const,
      acaoId: acao?.id,
      tipoDado: conta.tipoDado,
    };

    switch (integracao.tipo) {
      case "CRM": {
        const estagio =
          input.dadosEspecificos?.estagioOportunidade === "QUALIFICACAO" ||
          input.dadosEspecificos?.estagioOportunidade === "CONTATO_INICIAL"
            ? input.dadosEspecificos.estagioOportunidade
            : "PROSPECCAO";
        const payload: PayloadCRM = {
          ...base,
          estagioOportunidade: estagio,
          valorEstimado: typeof input.dadosEspecificos?.valorEstimado === "number" ? input.dadosEspecificos.valorEstimado : undefined,
          notas: typeof input.dadosEspecificos?.notas === "string" ? input.dadosEspecificos.notas : undefined,
        };
        payloadSanitizado = adaptadorCRM.sanitizarPayload(payload);
        break;
      }
      case "EMAIL": {
        const payload: PayloadEmail = {
          ...base,
          destinatarioEmail: contato?.emailCorporativo || "contato@empresa.com.br",
          assunto: typeof input.dadosEspecificos?.assunto === "string" ? input.dadosEspecificos.assunto : "Apresentação Corporativa - Chame Táxi B2B",
          corpoMensagem: typeof input.dadosEspecificos?.corpoMensagem === "string" ? input.dadosEspecificos.corpoMensagem : (acao?.mensagemRascunho || "Mensagem de apresentação institucional."),
        };
        payloadSanitizado =
          integracao.ambiente === "HOMOLOGACAO"
            ? adaptadorEmailHomologacao.sanitizarPayload(payload)
            : adaptadorEmail.sanitizarPayload(payload);
        break;
      }
      case "WHATSAPP": {
        const tel = contato?.telefoneProfissional || contato?.telefoneDepartamental || "71999999999";
        const payload: PayloadWhatsApp = {
          ...base,
          destinatarioTelefone: tel,
          mensagem: typeof input.dadosEspecificos?.mensagem === "string" ? input.dadosEspecificos.mensagem : (acao?.mensagemRascunho || "Olá, gostaríamos de apresentar nossa solução corporativa."),
        };
        payloadSanitizado = adaptadorWhatsApp.sanitizarPayload(payload);
        break;
      }
      case "DISCADOR": {
        const tel = contato?.telefoneProfissional || contato?.telefoneDepartamental || "7133334444";
        const campanha =
          input.dadosEspecificos?.tipoCampanha === "PESQUISA_QUALIFICACAO"
            ? "PESQUISA_QUALIFICACAO"
            : "SDR_HUMANO";
        const payload: PayloadDiscador = {
          ...base,
          numeroTelefone: tel,
          tipoCampanha: campanha,
          roteiroSugestao: typeof input.dadosEspecificos?.roteiroSugestao === "string" ? input.dadosEspecificos.roteiroSugestao : "Alinhamento de demanda corporativa",
        };
        payloadSanitizado = adaptadorDiscador.sanitizarPayload(payload);
        break;
      }
      default: {
        payloadSanitizado = {
          ...base,
          tipoIntegracao: integracao.tipo,
        };
      }
    }
  }

  return {
    elegivel,
    erros,
    avisos,
    integracao: integracao
      ? {
          id: integracao.id,
          nome: integracao.nome,
          tipo: integracao.tipo,
          ambiente: integracao.ambiente,
          status: integracao.status,
        }
      : {
          id: input.integracaoId,
          nome: "Não identificada",
          tipo: "OUTRO",
          ambiente: "SIMULACAO",
          status: "INATIVA",
        },
    conta: conta
      ? {
          id: conta.id,
          nome: conta.nome,
          tipoDado: conta.tipoDado,
          naturezaJuridica: null,
        }
      : {
          id: input.contaComercialId,
          nome: "Conta não encontrada",
          tipoDado: "DEMONSTRACAO",
        },
    contato: contato
      ? {
          id: contato.id,
          nome: contato.nome,
          cargo: contato.cargo,
          email: contato.emailCorporativo,
          telefone: contato.telefoneProfissional || contato.telefoneDepartamental,
          statusDecisao: contato.statusDecisao,
          ativo: contato.ativo,
          tipoDado: contato.tipoDado,
        }
      : null,
    acao: acao
      ? {
          id: acao.id,
          tipoAcao: acao.tipoAcao,
          status: acao.status,
          canal: acao.canal,
        }
      : null,
    payloadSanitizado,
    finalidadeComercial: input.finalidadeComercial,
    usuarioSolicitante: input.usuarioSolicitante,
    justificativa: input.justificativa,
  };
}

export async function executarSimulacaoControlada(
  input: SolicitacaoSimulacaoInput
): Promise<{
  evento: EventoIntegracao;
  resposta: RespostaSimuladaIntegracao;
}> {
  // Regra 9: Execução sem confirmação humana prévia deve ser bloqueada
  if (!input.confirmacaoHumana) {
    throw new Error(
      "A simulação exige confirmação humana explícita prévia após conferência do preview do payload."
    );
  }

  const validacao = await validarElegibilidadeIntegracao(input);
  const { integracao, conta, contato, acao, elegivel, erros } = validacao;

  // Se bloqueado por regra de elegibilidade, registrar EventoIntegracao com status BLOQUEADO
  if (!elegivel || !integracao || !conta) {
    const eventoBloqueado = await prisma.eventoIntegracao.create({
      data: {
        integracaoId: input.integracaoId,
        contaComercialId: conta?.id ?? null,
        contatoProfissionalId: contato?.id ?? null,
        acaoComercialId: acao?.id ?? null,
        tipoEvento: `SIMULACAO_${integracao?.tipo ?? "EXTERNA"}_BLOQUEADA`,
        status: "BLOQUEADO",
        payloadResumo: JSON.stringify({
          motivo: "Bloqueio por não conformidade com as regras de governança e segurança",
          erros,
        }),
        resultadoResumo: JSON.stringify({
          bloqueado: true,
          chamadaExternaRealizada: false,
        }),
        erro: erros.join("; "),
        usuarioSolicitante: input.usuarioSolicitante || "desconhecido",
        justificativa: input.justificativa || "Não fornecida",
      },
    });

    const respostaBloqueada: RespostaSimuladaIntegracao = {
      sucesso: false,
      transacaoId: `BLOQ-${eventoBloqueado.id}`,
      statusEvento: "BLOQUEADO",
      tipoIntegracao: integracao?.tipo ?? "OUTRO",
      ambiente: "SIMULACAO",
      timestamp: new Date().toISOString(),
      mensagem: `Simulação bloqueada: ${erros.join("; ")}`,
      detalhesSimulacao: { erros },
      chamadaExternaRealizada: false,
      tempoRespostaMs: 5,
    };

    return { evento: eventoBloqueado, resposta: respostaBloqueada };
  }

  const basePayload = {
    contaId: conta.id,
    contaNome: conta.nome,
    contatoId: contato?.id,
    contatoNome: contato?.nome,
    cargo: contato?.cargo,
    finalidadeComercial: input.finalidadeComercial,
    justificativa: input.justificativa,
    usuarioSolicitante: input.usuarioSolicitante,
    modoSimulacao: true as const,
    acaoId: acao?.id,
    tipoDado: conta.tipoDado,
  };

  let payloadSanitizado: Record<string, unknown> = {};
  let resposta: RespostaSimuladaIntegracao;

  const opcoes = {
    simularFalha: input.simularFalha,
    simularTimeout: input.simularTimeout,
    cancelarAntesExecutar: input.cancelarAntesExecutar,
    autorizacaoSandboxReal: input.autorizacaoSandboxReal,
  };

  switch (integracao.tipo) {
    case "CRM": {
      const estagio =
        input.dadosEspecificos?.estagioOportunidade === "QUALIFICACAO" ||
        input.dadosEspecificos?.estagioOportunidade === "CONTATO_INICIAL"
          ? input.dadosEspecificos.estagioOportunidade
          : "PROSPECCAO";
      const payload: PayloadCRM = {
        ...basePayload,
        estagioOportunidade: estagio,
        valorEstimado: typeof input.dadosEspecificos?.valorEstimado === "number" ? input.dadosEspecificos.valorEstimado : undefined,
        notas: typeof input.dadosEspecificos?.notas === "string" ? input.dadosEspecificos.notas : undefined,
      };
      payloadSanitizado = adaptadorCRM.sanitizarPayload(payload);
      resposta = await adaptadorCRM.executarSimulacao(payload, opcoes);
      break;
    }
    case "EMAIL": {
      const payload: PayloadEmail = {
        ...basePayload,
        destinatarioEmail: contato?.emailCorporativo || (input.dadosEspecificos?.destinatarioEmail as string) || "contato@empresa.com.br",
        assunto: typeof input.dadosEspecificos?.assunto === "string" ? input.dadosEspecificos.assunto : "Apresentação Corporativa - Chame Táxi B2B",
        corpoMensagem: typeof input.dadosEspecificos?.corpoMensagem === "string" ? input.dadosEspecificos.corpoMensagem : (acao?.mensagemRascunho || "Mensagem institucional simulada."),
      };
      if (integracao.ambiente === "HOMOLOGACAO") {
        payloadSanitizado = adaptadorEmailHomologacao.sanitizarPayload(payload);
        resposta = await adaptadorEmailHomologacao.executarSimulacao(payload, opcoes);
      } else {
        payloadSanitizado = adaptadorEmail.sanitizarPayload(payload);
        resposta = await adaptadorEmail.executarSimulacao(payload, opcoes);
      }
      break;
    }
    case "WHATSAPP": {
      const tel = contato?.telefoneProfissional || contato?.telefoneDepartamental || (input.dadosEspecificos?.destinatarioTelefone as string) || "71999999999";
      const payload: PayloadWhatsApp = {
        ...basePayload,
        destinatarioTelefone: tel,
        mensagem: typeof input.dadosEspecificos?.mensagem === "string" ? input.dadosEspecificos.mensagem : (acao?.mensagemRascunho || "Mensagem WhatsApp simulada."),
      };
      payloadSanitizado = adaptadorWhatsApp.sanitizarPayload(payload);
      resposta = await adaptadorWhatsApp.executarSimulacao(payload, opcoes);
      break;
    }
    case "DISCADOR": {
      const tel = contato?.telefoneProfissional || contato?.telefoneDepartamental || (input.dadosEspecificos?.numeroTelefone as string) || "7133334444";
      const campanha =
        input.dadosEspecificos?.tipoCampanha === "PESQUISA_QUALIFICACAO"
          ? "PESQUISA_QUALIFICACAO"
          : "SDR_HUMANO";
      const payload: PayloadDiscador = {
        ...basePayload,
        numeroTelefone: tel,
        tipoCampanha: campanha,
        roteiroSugestao: typeof input.dadosEspecificos?.roteiroSugestao === "string" ? input.dadosEspecificos.roteiroSugestao : "Sondagem de demanda de mobilidade",
      };
      payloadSanitizado = adaptadorDiscador.sanitizarPayload(payload);
      resposta = await adaptadorDiscador.executarSimulacao(payload, opcoes);
      break;
    }
    default: {
      throw new Error(`Adaptador para o tipo '${integracao.tipo}' não está configurado.`);
    }
  }

  // Persistir EventoIntegracao imutável
  const evento = await prisma.$transaction(async (tx) => {
    const ev = await tx.eventoIntegracao.create({
      data: {
        integracaoId: integracao.id,
        contaComercialId: conta.id,
        contatoProfissionalId: contato?.id ?? null,
        acaoComercialId: acao?.id ?? null,
        tipoEvento:
          integracao.ambiente === "HOMOLOGACAO"
            ? `HOMOLOGACAO_${integracao.tipo}`
            : `SIMULACAO_${integracao.tipo}`,
        status: resposta.statusEvento,
        payloadResumo: JSON.stringify(payloadSanitizado),
        resultadoResumo: JSON.stringify({
          transacaoId: resposta.transacaoId,
          mensagem: resposta.mensagem,
          detalhes: resposta.detalhesSimulacao,
          chamadaExternaRealizada: resposta.chamadaExternaRealizada,
          tempoRespostaMs: resposta.tempoRespostaMs,
        }),
        erro: resposta.sucesso ? null : resposta.mensagem,
        usuarioSolicitante: input.usuarioSolicitante,
        justificativa: input.justificativa,
      },
    });

    await tx.integracaoExterna.update({
      where: { id: integracao.id },
      data: { atualizadoEm: new Date() },
    });

    return ev;
  });

  return { evento, resposta };
}

export async function executarLoteSimulacao(
  lote: SolicitacaoSimulacaoInput[]
): Promise<Array<{ evento: EventoIntegracao; resposta: RespostaSimuladaIntegracao }>> {
  // Regra 8: Solicitações em massa sem limite rígido (máximo 10 itens por lote em simulação)
  if (lote.length > LIMITE_MAXIMO_LOTE_SIMULACAO) {
    throw new Error(
      `Limite máximo de simulação em lote excedido. O limite permitido é de ${LIMITE_MAXIMO_LOTE_SIMULACAO} itens por lote. Solicitados: ${lote.length}.`
    );
  }

  const resultados: Array<{ evento: EventoIntegracao; resposta: RespostaSimuladaIntegracao }> = [];
  for (const item of lote) {
    const res = await executarSimulacaoControlada(item);
    resultados.push(res);
  }

  return resultados;
}

export async function listarEventosIntegracao(
  filtros: FiltrosEventosIntegracao = {}
): Promise<EventoIntegracao[]> {
  const where: Prisma.EventoIntegracaoWhereInput = {};

  if (filtros.tipoIntegracao) {
    where.integracao = { tipo: filtros.tipoIntegracao };
  }
  if (filtros.status) {
    where.status = filtros.status;
  }
  if (filtros.contaId) {
    where.contaComercialId = filtros.contaId;
  }
  if (filtros.contatoId) {
    where.contatoProfissionalId = filtros.contatoId;
  }
  if (filtros.busca && filtros.busca.trim() !== "") {
    const termo = filtros.busca.trim();
    where.OR = [
      { usuarioSolicitante: { contains: termo } },
      { justificativa: { contains: termo } },
      { payloadResumo: { contains: termo } },
      { resultadoResumo: { contains: termo } },
    ];
  }

  return prisma.eventoIntegracao.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: filtros.limite || 50,
    include: {
      integracao: true,
      contaComercial: { select: { id: true, nome: true, tipoDado: true } },
      contatoProfissional: { select: { id: true, nome: true, cargo: true, tipoDado: true } },
      acaoComercial: { select: { id: true, tipoAcao: true, canal: true, status: true } },
    },
  });
}

export async function obterResumoContadoresIntegracoes(): Promise<ResumoContadoresIntegracoes> {
  const [
    totalIntegracoes,
    integracoesAtivas,
    totalEventos,
    sucessosSimulados,
    falhasSimuladas,
    bloqueados,
    cancelados,
    timeoutsSimulados,
  ] = await Promise.all([
    prisma.integracaoExterna.count(),
    prisma.integracaoExterna.count({ where: { status: "ATIVA" } }),
    prisma.eventoIntegracao.count(),
    prisma.eventoIntegracao.count({ where: { status: "SUCESSO_SIMULADO" } }),
    prisma.eventoIntegracao.count({ where: { status: "FALHA_SIMULADA" } }),
    prisma.eventoIntegracao.count({ where: { status: "BLOQUEADO" } }),
    prisma.eventoIntegracao.count({ where: { status: "CANCELADO" } }),
    prisma.eventoIntegracao.count({ where: { status: "TIMEOUT_SIMULADO" } }),
  ]);

  return {
    totalIntegracoes,
    integracoesAtivas,
    totalEventos,
    sucessosSimulados,
    falhasSimuladas,
    bloqueados,
    cancelados,
    timeoutsSimulados,
  };
}

export async function atualizarAmbienteIntegracao(
  integracaoId: string,
  novoAmbiente: AmbienteIntegracao
): Promise<IntegracaoExterna> {
  if (novoAmbiente === "PRODUCAO") {
    throw new Error(
      `${AVISO_BLOQUEIO_PRODUCAO} O ambiente de produção permanece terminantemente proibido.`
    );
  }

  const integracao = await prisma.integracaoExterna.findUnique({
    where: { id: integracaoId },
  });

  if (!integracao) {
    throw new Error(`Integração com ID '${integracaoId}' não encontrada.`);
  }

  if (novoAmbiente === "HOMOLOGACAO" && integracao.tipo !== "EMAIL") {
    throw new Error(
      `Apenas o conector de E-mail Corporativo (Mailtrap Sandbox) está homologado no Gate 10. Conectores do tipo '${integracao.tipo}' operam exclusivamente em SIMULACAO.`
    );
  }

  return prisma.integracaoExterna.update({
    where: { id: integracaoId },
    data: {
      ambiente: novoAmbiente,
      configuracaoJson:
        novoAmbiente === "HOMOLOGACAO"
          ? JSON.stringify({
              provedor: "Mailtrap Email Sandbox API",
              sandbox: true,
              endpoint: "https://sandbox.api.mailtrap.io/api/send",
              timeoutMs: 3000,
              limiteTaxaPorMinuto: 5,
            })
          : integracao.configuracaoJson,
    },
  });
}

export function obterStatusHomologacao() {
  const diag = obterDiagnosticoMailtrapSandbox();

  return {
    provedorHomologado: diag.provedor,
    canal: "EMAIL",
    ambienteAutorizado: "HOMOLOGACAO",
    sandboxObrigatorio: diag.sandboxObrigatorio,
    endpointFixo: diag.endpointFixo,
    tokenConfigurado: diag.tokenConfigurado,
    inboxIdConfigurado: diag.inboxIdConfigurado,
    inboxIdMascarado: diag.inboxIdMascarado,
    conectividade: diag.conectividade,
    mensagensEnviadasGate11: diag.mensagensEnviadasGate11,
    limiteMaximoGate11: diag.limiteMaximoGate11,
    mensagensRestantesGate11: diag.mensagensRestantesGate11,
    circuitBreaker: diag.circuitBreaker,
    rateLimiter: diag.rateLimiter,
    killSwitch: {
      ativo: diag.killSwitchAtivo,
    },
    aviso: diag.aviso,
  };
}

export {
  circuitBreakerHomologacao,
  rateLimiterHomologacao,
  isKillSwitchAtivo,
  ativarKillSwitch,
  desativarKillSwitch,
  resetarEstadoHomologacao,
  carregarCredenciaisSandbox,
  obterDiagnosticoMailtrapSandbox,
  getContadorMensagensGate11,
  getLimiteMensagensGate11,
  setLimiteMensagensGate11,
  resetarContadorMensagensGate11,
  LIMITE_MAXIMO_MENSAGENS_GATE_11,
  ENDPOINT_SANDBOX_MAILTRAP_BASE,
  AVISO_HOMOLOGACAO_SANDBOX,
  TIMEOUT_HOMOLOGACAO_MS,
  LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO,
};
