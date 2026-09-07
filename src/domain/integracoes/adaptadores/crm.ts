import type {
  AdaptadorIntegracao,
  OpcoesExecucaoSimulada,
  PayloadCRM,
  RespostaSimuladaIntegracao,
} from "../tipos";

export class AdaptadorCRMSimulador implements AdaptadorIntegracao<PayloadCRM> {
  readonly tipo = "CRM" as const;

  validarPayload(payload: PayloadCRM): { valido: boolean; erros: string[] } {
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
    const estagiosValidos = ["PROSPECCAO", "QUALIFICACAO", "CONTATO_INICIAL"];
    if (!estagiosValidos.includes(payload.estagioOportunidade)) {
      erros.push(`Estágio de oportunidade inválido: ${payload.estagioOportunidade}. Esperado: ${estagiosValidos.join(", ")}`);
    }

    return { valido: erros.length === 0, erros };
  }

  sanitizarPayload(payload: PayloadCRM): Record<string, unknown> {
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
      estagioOportunidade: payload.estagioOportunidade,
      valorEstimado: payload.valorEstimado ?? null,
      notas: payload.notas ?? null,
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
    payload: PayloadCRM,
    opcoes?: OpcoesExecucaoSimulada
  ): Promise<RespostaSimuladaIntegracao> {
    const validacao = this.validarPayload(payload);
    if (!validacao.valido) {
      return {
        sucesso: false,
        transacaoId: `SIM-CRM-ERR-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Simulação bloqueada por payload inválido: ${validacao.erros.join("; ")}`,
        detalhesSimulacao: { erros: validacao.erros },
        chamadaExternaRealizada: false,
        tempoRespostaMs: 10,
      };
    }

    const transacaoId = `SIM-CRM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const tempoRespostaMs = opcoes?.tempoEsperaMs ?? 25;

    if (opcoes?.cancelarAntesExecutar) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "CANCELADO",
        tipoIntegracao: this.tipo,
        ambiente: "SIMULACAO",
        timestamp: new Date().toISOString(),
        mensagem: "Operação cancelada pelo operador antes da execução da simulação.",
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
        mensagem: "Tempo limite de conexão simulado esgotado (timeout controlado de 5000ms).",
        detalhesSimulacao: { codigoErro: "ETIMEDOUT_SIMULADO" },
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
        mensagem: "Falha simulada na sincronização de oportunidade com o CRM sandbox.",
        detalhesSimulacao: { codigoErro: "ERR_SIMULACAO_CRM_INDISPONIVEL" },
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
      mensagem: `Oportunidade comercial simulada com sucesso no CRM sandbox para conta '${payload.contaNome}'.`,
      detalhesSimulacao: {
        estagio: payload.estagioOportunidade,
        valorEstimado: payload.valorEstimado ?? null,
        leadIdSimulado: `LEAD-${Date.now()}`,
      },
      chamadaExternaRealizada: false,
      tempoRespostaMs,
    };
  }
}
