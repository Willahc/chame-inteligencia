import type {
  AdaptadorIntegracao,
  OpcoesExecucaoSimulada,
  PayloadWhatsApp,
  RespostaSimuladaIntegracao,
} from "../tipos";

export class AdaptadorWhatsAppSimulador implements AdaptadorIntegracao<PayloadWhatsApp> {
  readonly tipo = "WHATSAPP" as const;

  validarPayload(payload: PayloadWhatsApp): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (!payload.contaId || payload.contaId.trim() === "") {
      erros.push("ID da conta comercial é obrigatório.");
    }
    if (!payload.contaNome || payload.contaNome.trim() === "") {
      erros.push("Nome da conta comercial é obrigatório.");
    }
    if (!payload.finalidadeComercial || payload.finalidadeComercial.trim() === "") {
      erros.push("Finalidade comercial da integração é obrigatória.");
    }
    if (!payload.justificativa || payload.justificativa.trim() === "") {
      erros.push("Justificativa do operador é obrigatória.");
    }
    if (!payload.usuarioSolicitante || payload.usuarioSolicitante.trim() === "") {
      erros.push("Usuário solicitante é obrigatório.");
    }
    if (!payload.modoSimulacao) {
      erros.push("Modo simulação é estritamente obrigatório no Gate 9.");
    }
    if (!payload.destinatarioTelefone || payload.destinatarioTelefone.replace(/\D/g, "").length < 8) {
      erros.push("Número de telefone corporativo do destinatário é obrigatório e deve ter no mínimo 8 dígitos.");
    }
    if (!payload.mensagem || payload.mensagem.trim() === "") {
      erros.push("Conteúdo da mensagem de WhatsApp é obrigatório.");
    }

    return { valido: erros.length === 0, erros };
  }

  sanitizarPayload(payload: PayloadWhatsApp): Record<string, unknown> {
    const digitos = payload.destinatarioTelefone.replace(/\D/g, "");
    const telefoneOfuscado =
      digitos.length >= 8
        ? `${digitos.slice(0, 2)}*****${digitos.slice(-4)}`
        : "Telefone inválido";

    const sanitizado: Record<string, unknown> = {
      tipoIntegracao: this.tipo,
      modoSimulacao: true,
      ambiente: "SIMULACAO",
      conta: {
        id: payload.contaId,
        nome: payload.contaNome,
        tipoDado: payload.tipoDado,
      },
      finalidadeComercial: payload.finalidadeComercial,
      justificativa: payload.justificativa,
      usuarioSolicitante: payload.usuarioSolicitante,
      destinatarioTelefoneOfuscado: telefoneOfuscado,
      tamanhoMensagem: payload.mensagem.length,
      previaMensagem: payload.mensagem.slice(0, 100) + (payload.mensagem.length > 100 ? "..." : ""),
      acaoId: payload.acaoId ?? null,
    };

    if (payload.contatoId) {
      sanitizado.contato = {
        id: payload.contatoId,
        nome: payload.contatoNome ?? "Não informado",
        cargo: payload.cargo ?? null,
      };
    }

    return sanitizado;
  }

  async executarSimulacao(
    payload: PayloadWhatsApp,
    opcoes?: OpcoesExecucaoSimulada
  ): Promise<RespostaSimuladaIntegracao> {
    const validacao = this.validarPayload(payload);
    if (!validacao.valido) {
      return {
        sucesso: false,
        transacaoId: `SIM-WPP-ERR-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Simulação de WhatsApp bloqueada por payload inválido: ${validacao.erros.join("; ")}`,
        detalhesSimulacao: { erros: validacao.erros },
        chamadaExternaRealizada: false,
        tempoRespostaMs: 10,
      };
    }

    const transacaoId = `SIM-WPP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const tempoRespostaMs = opcoes?.tempoEsperaMs ?? 20;

    if (opcoes?.cancelarAntesExecutar) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "CANCELADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: "Envio de WhatsApp simulado cancelado pelo operador antes da execução.",
        detalhesSimulacao: { canceladoPor: payload.usuarioSolicitante },
        chamadaExternaRealizada: false,
        tempoRespostaMs,
      };
    }

    if (opcoes?.simularTimeout) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "TIMEOUT_SIMULADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: "API simulada de WhatsApp excedeu tempo limite de resposta.",
        detalhesSimulacao: { codigoErro: "WPP_GATEWAY_TIMEOUT" },
        chamadaExternaRealizada: false,
        tempoRespostaMs: 50,
      };
    }

    if (opcoes?.simularFalha) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "FALHA_SIMULADA",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: "Falha simulada na entrega da mensagem (ex: número não corporativo ou sandbox restrito).",
        detalhesSimulacao: { codigoErro: "ERR_WPP_SANDBOX_DELIVERY" },
        chamadaExternaRealizada: false,
        tempoRespostaMs,
      };
    }

    return {
      sucesso: true,
      transacaoId,
      statusEvento: "SUCESSO_SIMULADO",
      tipoIntegracao: this.tipo,
      ambiente: "SIMULACAO",
      timestamp: new Date().toISOString(),
      mensagem: `Mensagem WhatsApp simulada com sucesso no sandbox para '${payload.destinatarioTelefone}'. Nenhuma mensagem real foi transmitida.`,
      detalhesSimulacao: {
        destinatario: payload.destinatarioTelefone,
        canal: "WHATSAPP_SANDBOX",
        wamidSimulado: `wamid.${transacaoId}`,
      },
      chamadaExternaRealizada: false,
      tempoRespostaMs,
    };
  }
}
