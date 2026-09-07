"use server";

import { revalidatePath } from "next/cache";
import {
  criarRascunhoAcao,
  editarRascunhoAcao,
  submeterParaRevisao,
  aprovarParaSimulacao,
  executarSimulacao,
  cancelarAcao,
  bloquearAcao,
  obterPreviaAcao,
  obterHistoricoAcao,
} from "@/domain/automacao-comercial/servico-automacao";
import type { CanalAcaoComercial } from "@/domain/automacao-comercial/tipos";

export async function criarRascunhoAction(formData: FormData) {
  const contaComercialId = formData.get("contaComercialId") as string;
  const contatoProfissionalId = (formData.get("contatoProfissionalId") as string) || undefined;
  const tipoAcao = formData.get("tipoAcao") as string;
  const canal = formData.get("canal") as CanalAcaoComercial;
  const objetivo = formData.get("objetivo") as string;
  const mensagemRascunho = formData.get("mensagemRascunho") as string;
  const criadoPor = (formData.get("criadoPor") as string) || "analista-comercial";
  const justificativaInicial = (formData.get("justificativaInicial") as string) || undefined;

  if (!contaComercialId || !tipoAcao || !canal || !objetivo || !mensagemRascunho) {
    throw new Error("Campos obrigatórios não preenchidos.");
  }

  const novaAcao = await criarRascunhoAcao({
    contaComercialId,
    contatoProfissionalId: contatoProfissionalId && contatoProfissionalId.trim() !== "" ? contatoProfissionalId : undefined,
    tipoAcao,
    canal,
    objetivo,
    mensagemRascunho,
    criadoPor,
    justificativaInicial,
  });

  revalidatePath("/planejamento-comercial");
  revalidatePath(`/contas/${contaComercialId}`);
  return novaAcao;
}

export async function editarRascunhoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const tipoAcao = (formData.get("tipoAcao") as string) || undefined;
  const canal = (formData.get("canal") as CanalAcaoComercial) || undefined;
  const objetivo = (formData.get("objetivo") as string) || undefined;
  const mensagemRascunho = (formData.get("mensagemRascunho") as string) || undefined;
  const contatoProfissionalIdRaw = formData.get("contatoProfissionalId");
  const contatoProfissionalId =
    contatoProfissionalIdRaw === "" ? null : (contatoProfissionalIdRaw as string | undefined);
  const usuario = (formData.get("usuario") as string) || "analista-comercial";
  const justificativa = (formData.get("justificativa") as string) || "Edição de rascunho de planejamento.";

  if (!id) {
    throw new Error("ID da ação não fornecido.");
  }

  const atualizada = await editarRascunhoAcao(id, {
    tipoAcao,
    canal,
    objetivo,
    mensagemRascunho,
    contatoProfissionalId,
    usuario,
    justificativa,
  });

  revalidatePath("/planejamento-comercial");
  return atualizada;
}

export async function submeterRevisaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const usuario = (formData.get("usuario") as string) || "analista-comercial";
  const justificativa = (formData.get("justificativa") as string) || "Submissão para revisão humana formal.";

  if (!id) {
    throw new Error("ID da ação não fornecido.");
  }

  const atualizada = await submeterParaRevisao(id, {
    usuario,
    justificativa,
  });

  revalidatePath("/planejamento-comercial");
  return atualizada;
}

export async function aprovarSimulacaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const usuarioAprovador = (formData.get("usuarioAprovador") as string) || "gestor-comercial";
  const justificativa = (formData.get("justificativa") as string) || "Aprovação humana para ambiente de simulação.";
  const observacao = (formData.get("observacao") as string) || undefined;

  if (!id) {
    throw new Error("ID da ação não fornecido.");
  }

  const atualizada = await aprovarParaSimulacao(id, {
    usuarioAprovador,
    justificativa,
    observacao,
  });

  revalidatePath("/planejamento-comercial");
  return atualizada;
}

export async function executarSimulacaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const usuario = (formData.get("usuario") as string) || "operador-sandbox";
  const justificativa = (formData.get("justificativa") as string) || "Execução de teste funcional controlado.";
  const observacao = (formData.get("observacao") as string) || undefined;

  if (!id) {
    throw new Error("ID da ação não fornecido.");
  }

  const resultado = await executarSimulacao(id, {
    usuario,
    justificativa,
    observacao,
  });

  revalidatePath("/planejamento-comercial");
  return resultado;
}

export async function cancelarAcaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const usuario = (formData.get("usuario") as string) || "analista-comercial";
  const justificativa = (formData.get("justificativa") as string) || "Cancelamento de planejamento comercial.";
  const observacao = (formData.get("observacao") as string) || undefined;

  if (!id) {
    throw new Error("ID da ação não fornecido.");
  }

  const atualizada = await cancelarAcao(id, {
    usuario,
    justificativa,
    observacao,
  });

  revalidatePath("/planejamento-comercial");
  return atualizada;
}

export async function bloquearAcaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const usuario = (formData.get("usuario") as string) || "auditor-compliance";
  const justificativa = (formData.get("justificativa") as string) || "Bloqueio preventivo de conformidade.";
  const observacao = (formData.get("observacao") as string) || undefined;

  if (!id) {
    throw new Error("ID da ação não fornecido.");
  }

  const atualizada = await bloquearAcao(id, {
    usuario,
    justificativa,
    observacao,
  });

  revalidatePath("/planejamento-comercial");
  return atualizada;
}

export async function obterPreviaAction(id: string) {
  return obterPreviaAcao(id);
}

export async function obterHistoricoAction(id: string) {
  return obterHistoricoAcao(id);
}
