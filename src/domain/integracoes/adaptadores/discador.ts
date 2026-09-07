import type {
  AdaptadorIntegracao,
  OpcoesExecucaoSimulada,
  PayloadDiscador,
  RespostaSimuladaIntegracao,
} from "../tipos";

export class AdaptadorDiscadorSimulador implements AdaptadorIntegracao<PayloadDiscador> {
  readonly tipo = "DISCADOR" as const;

  validarPayload(payload: PayloadDiscador): { valido: boolean; erros: string[] } {
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
    if (!payload.numeroTelefone || payload.numeroTelefone.replace(/\D/g, "").length < 8) {
      erros.push("Número de telefone corporativo é obrigatório e deve ter no mínimo 8 dígitos.");
    }
    const campanhasValidas = ["SDR_HUMANO", "PESQUISA_QUALIFICACAO"];
    if (!campanhasValidas.includes(payload.tipoCampanha)) {
      erros.push(`Tipo de campanha inválido: ${payload.tipoCampanha}. Esperado: ${campanhasValidas.join(", ")}`);
    }

    return { valido: erros.length === 0, erros };
  }

  sanitizarPayload(payload: PayloadDiscador): Record<string, unknown> {
    const digitos = payload.numeroTelefone.replace(/\D/g, "");
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
      numeroTelefoneOfuscado: telefoneOfuscado,
      tipoCampanha: payload.tipoCampanha,
      roteiroSugestao: payload.roteiroSugestao ? payload.roteiroSugestao.slice(0, 100) + "..." : null,
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
    payload: PayloadDiscador,
    opcoes?: OpcoesExecucaoSimulada
  ): Promise<RespostaSimuladaIntegracao> {
    const validacao = this.validarPayload(payload);
    if (!validacao.valido) {
      return {
        sucesso: false,
        transacaoId: `SIM-VOX-ERR-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Simulação de discador bloqueada por payload inválido: ${validacao.erros.join("; ")}`,
        detalhesSimulacao: { erros: validacao.erros },
        chamadaExternaRealizada: false,
        tempoRespostaMs: 10,
      };
    }

    const transacaoId = `SIM-VOX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const tempoRespostaMs = opcoes?.tempoEsperaMs ?? 20;

    if (opcoes?.cancelarAntesExecutar) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "CANCELADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: "Operação de discagem simulada cancelada pelo operador antes da execução.",
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
        mensagem: "Central telefônica virtual (SIP sandbox) não respondeu dentro do limite de tempo.",
        detalhesSimulacao: { codigoErro: "SIP_SANDBOX_TIMEOUT" },
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
        mensagem: "Falha simulada na fila de discagem (ex: ramal ou canal ocupado no simulador).",
        detalhesSimulacao: { codigoErro: "ERR_SIP_CIRCUIT_BUSY" },
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
      mensagem: `Chamada simulada com sucesso para central telefônica corporativa '${payload.numeroTelefone}'. Nenhuma linha discou e nenhuma chamada real foi realizada.`,
      detalhesSimulacao: {
        numeroAlvo: payload.numeroTelefone,
        campanha: payload.tipoCampanha,
        callIdSimulado: `call-${transacaoId}`,
        troncoSimulado: "SIP-SANDBOX-LOCAL",
      },
      chamadaExternaRealizada: false,
      tempoRespostaMs,
    };
  }
}
