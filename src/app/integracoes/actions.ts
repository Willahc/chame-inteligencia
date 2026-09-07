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

export async function obterStatusHomologacaoAction() {
  try {
    const { obterStatusHomologacao } = await import(
      "@/domain/integracoes/servico-integracoes"
    );
    const status = obterStatusHomologacao();
    return { sucesso: true, status, erro: null };
  } catch (err) {
    return {
      sucesso: false,
      status: null,
      erro: err instanceof Error ? err.message : "Erro ao obter status de homologação.",
    };
  }
}

export async function alternarKillSwitchAction(ativar: boolean) {
  try {
    const { ativarKillSwitch, desativarKillSwitch } = await import(
      "@/domain/integracoes/servico-integracoes"
    );
    if (ativar) {
      ativarKillSwitch();
    } else {
      desativarKillSwitch();
    }
    revalidatePath("/integracoes");
    return { sucesso: true, killSwitchAtivo: ativar, erro: null };
  } catch (err) {
    return {
      sucesso: false,
      killSwitchAtivo: !ativar,
      erro: err instanceof Error ? err.message : "Erro ao alternar kill-switch.",
    };
  }
}

export async function resetarCircuitBreakerAction() {
  try {
    const { circuitBreakerHomologacao } = await import(
      "@/domain/integracoes/servico-integracoes"
    );
    circuitBreakerHomologacao.resetar();
    revalidatePath("/integracoes");
    return { sucesso: true, erro: null };
  } catch (err) {
    return {
      sucesso: false,
      erro: err instanceof Error ? err.message : "Erro ao resetar circuit breaker.",
    };
  }
}

export async function configurarAmbienteIntegracaoAction(
  integracaoId: string,
  novoAmbiente: import("@prisma/client").AmbienteIntegracao
) {
  try {
    const { atualizarAmbienteIntegracao } = await import(
      "@/domain/integracoes/servico-integracoes"
    );
    const atualizada = await atualizarAmbienteIntegracao(integracaoId, novoAmbiente);
    revalidatePath("/integracoes");
    return { sucesso: true, integracao: atualizada, erro: null };
  } catch (err) {
    return {
      sucesso: false,
      integracao: null,
      erro: err instanceof Error ? err.message : "Erro ao configurar ambiente da integração.",
    };
  }
}
