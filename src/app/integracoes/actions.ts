"use server";

import { revalidatePath } from "next/cache";
import {
  gerarPreviaSimulacao,
  executarSimulacaoControlada,
  listarEventosIntegracao,
  obterResumoContadoresIntegracoes,
} from "@/domain/integracoes/servico-integracoes";
import type {
  SolicitacaoSimulacaoInput,
  FiltrosEventosIntegracao,
} from "@/domain/integracoes/tipos";

export async function gerarPreviaSimulacaoAction(input: SolicitacaoSimulacaoInput) {
  try {
    const previa = await gerarPreviaSimulacao(input);
    return { sucesso: true, previa, erro: null };
  } catch (err) {
    return {
      sucesso: false,
      previa: null,
      erro: err instanceof Error ? err.message : "Erro ao gerar prévia da simulação.",
    };
  }
}

export async function executarSimulacaoAction(input: SolicitacaoSimulacaoInput) {
  try {
    const resultado = await executarSimulacaoControlada(input);
    revalidatePath("/integracoes");
    revalidatePath("/planejamento-comercial");
    if (input.contaComercialId) {
      revalidatePath(`/contas/${input.contaComercialId}`);
    }
    return {
      sucesso: true,
      evento: resultado.evento,
      resposta: resultado.resposta,
      erro: null,
    };
  } catch (err) {
    return {
      sucesso: false,
      evento: null,
      resposta: null,
      erro: err instanceof Error ? err.message : "Erro ao executar simulação controlada.",
    };
  }
}

export async function atualizarEventosAction(filtros: FiltrosEventosIntegracao = {}) {
  try {
    const [eventos, contadores] = await Promise.all([
      listarEventosIntegracao(filtros),
      obterResumoContadoresIntegracoes(),
    ]);
    return { sucesso: true, eventos, contadores, erro: null };
  } catch (err) {
    return {
      sucesso: false,
      eventos: [],
      contadores: null,
      erro: err instanceof Error ? err.message : "Erro ao consultar eventos de integração.",
    };
  }
}
