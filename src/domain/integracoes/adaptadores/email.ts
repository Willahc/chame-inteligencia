import type {
  AdaptadorIntegracao,
  OpcoesExecucaoSimulada,
  PayloadEmail,
  RespostaSimuladaIntegracao,
} from "../tipos";

export class AdaptadorEmailSimulador implements AdaptadorIntegracao<PayloadEmail> {
  readonly tipo = "EMAIL" as const;

  validarPayload(payload: PayloadEmail): { valido: boolean; erros: string[] } {
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
    if (!payload.destinatarioEmail || !payload.destinatarioEmail.includes("@")) {
      erros.push("Endereço de e-mail corporativo do destinatário é obrigatório e deve ser válido.");
    }
    if (!payload.assunto || payload.assunto.trim() === "") {
      erros.push("Assunto do e-mail é obrigatório.");
    }
    if (!payload.corpoMensagem || payload.corpoMensagem.trim() === "") {
      erros.push("Corpo da mensagem de e-mail é obrigatório.");
    }

    return { valido: erros.length === 0, erros };
  }

  sanitizarPayload(payload: PayloadEmail): Record<string, unknown> {
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
      destinatarioEmail: payload.destinatarioEmail,
      assunto: payload.assunto,
      tamanhoCorpoCaracteres: payload.corpoMensagem.length,
      previaMensagem: payload.corpoMensagem.slice(0, 150) + (payload.corpoMensagem.length > 150 ? "..." : ""),
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
    payload: PayloadEmail,
    opcoes?: OpcoesExecucaoSimulada
  ): Promise<RespostaSimuladaIntegracao> {
    const validacao = this.validarPayload(payload);
    if (!validacao.valido) {
      return {
        sucesso: false,
        transacaoId: `SIM-EML-ERR-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Simulação de e-mail bloqueada por payload inválido: ${validacao.erros.join("; ")}`,
        detalhesSimulacao: { erros: validacao.erros },
        chamadaExternaRealizada: false,
        tempoRespostaMs: 10,
      };
    }

    const transacaoId = `SIM-EML-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const tempoRespostaMs = opcoes?.tempoEsperaMs ?? 20;

    if (opcoes?.cancelarAntesExecutar) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "CANCELADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: "Envio de e-mail simulado cancelado pelo operador antes da execução.",
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
        mensagem: "Servidor SMTP simulado não respondeu dentro do limite de tempo (timeout simulado).",
        detalhesSimulacao: { codigoErro: "SMTP_TIMEOUT_SIMULADO" },
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
        mensagem: "Falha simulada no gateway de e-mail sandbox (ex: caixa de correio temporariamente indisponível).",
        detalhesSimulacao: { codigoErro: "ERR_SMTP_SANDBOX_BOUNCE" },
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
      mensagem: `E-mail corporativo simulado com sucesso no sandbox para '${payload.destinatarioEmail}'. Nenhuma mensagem real foi enviada.`,
      detalhesSimulacao: {
        destinatario: payload.destinatarioEmail,
        assunto: payload.assunto,
        servidorSimulado: "smtp.sandbox.local",
        messageIdSimulado: `<sim-${transacaoId}@chame.sandbox.local>`,
      },
      chamadaExternaRealizada: false,
      tempoRespostaMs,
    };
  }
}
