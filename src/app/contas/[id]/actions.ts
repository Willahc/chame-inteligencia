"use server";

import { revalidatePath } from "next/cache";
import { registrarResultadoAbordagem } from "@/lib/dados";
import type { ResultadoAbordagem } from "@/domain/contas";

export async function salvarResultadoAbordagem(formData: FormData) {
  const contaComercialId = formData.get("contaComercialId") as string;
  const resultado = formData.get("resultado") as ResultadoAbordagem;
  const usuarioResponsavel = (formData.get("usuarioResponsavel") as string) || undefined;
  const observacao = formData.get("observacao") as string;
  const proximaAcao = (formData.get("proximaAcao") as string) || undefined;
  const fonteOuEvidencia = (formData.get("fonteOuEvidencia") as string) || undefined;

  if (!contaComercialId || !resultado || !observacao?.trim()) {
    throw new Error("Preencha os campos obrigatórios (conta, resultado e observação).");
  }

  await registrarResultadoAbordagem({
    contaComercialId,
    resultado,
    usuarioResponsavel,
    observacao,
    proximaAcao,
    fonteOuEvidencia,
  });

  revalidatePath("/contas");
  revalidatePath(`/contas/${contaComercialId}`);
}

export async function executarBuscaResponsaveis(formData: FormData) {
  const { solicitarBuscaResponsaveis } = await import("@/domain/busca-responsaveis/servico-busca");
  const contaComercialId = formData.get("contaComercialId") as string;
  const usuarioSolicitante = (formData.get("usuarioSolicitante") as string) || "analista-comercial";
  const confirmacao = formData.get("confirmacao") === "true" || formData.get("confirmacao") === "on";

  if (!contaComercialId) {
    throw new Error("Identificador da conta comercial é obrigatório.");
  }

  await solicitarBuscaResponsaveis({
    contaComercialId,
    usuarioSolicitante,
    confirmacaoUsuario: confirmacao,
  });

  revalidatePath("/contas");
  revalidatePath(`/contas/${contaComercialId}`);
}

export async function aprovarContatoAcao(formData: FormData) {
  const { ativarContatoSupervisionado } = await import("@/domain/busca-responsaveis/servico-busca");
  const contatoId = formData.get("contatoId") as string;
  const contaComercialId = formData.get("contaComercialId") as string;
  const usuarioAprovador = (formData.get("usuarioAprovador") as string) || "analista-comercial";

  if (!contatoId) {
    throw new Error("Identificador do contato é obrigatório.");
  }

  await ativarContatoSupervisionado({
    contatoId,
    usuarioAprovador,
  });

  revalidatePath("/contas");
  if (contaComercialId) {
    revalidatePath(`/contas/${contaComercialId}`);
  }
}

export async function desativarContatoAcao(formData: FormData) {
  const { desativarContatoSupervisionado } = await import("@/domain/busca-responsaveis/servico-busca");
  const contatoId = formData.get("contatoId") as string;
  const contaComercialId = formData.get("contaComercialId") as string;
  const motivo = (formData.get("motivo") as string) || "Removido por revisão humana.";
  const usuario = (formData.get("usuario") as string) || "analista-comercial";

  if (!contatoId) {
    throw new Error("Identificador do contato é obrigatório.");
  }

  await desativarContatoSupervisionado({
    contatoId,
    motivo,
    usuario,
  });

  revalidatePath("/contas");
  if (contaComercialId) {
    revalidatePath(`/contas/${contaComercialId}`);
  }
}
