"use server";

import { revalidatePath } from "next/cache";
import { decidirRevisaoContato } from "@/domain/revisao-contatos/servico-revisao";
import type { AcaoRevisaoContato } from "@/domain/revisao-contatos/tipos";

export async function processarDecisaoRevisao(formData: FormData) {
  const contatoId = formData.get("contatoId") as string;
  const usuario = (formData.get("usuario") as string) || "analista-qualidade";
  const acao = formData.get("acao") as AcaoRevisaoContato;
  const motivo = (formData.get("motivo") as string) || undefined;
  const observacao = (formData.get("observacao") as string) || undefined;
  const evidenciaUtilizada = (formData.get("evidenciaUtilizada") as string) || undefined;

  const papelComercial = (formData.get("papelComercial") as string) || undefined;
  const area = (formData.get("area") as string) || undefined;
  const senioridade = (formData.get("senioridade") as string) || undefined;
  const justificativa = (formData.get("justificativa") as string) || undefined;

  if (!contatoId || !acao) {
    throw new Error("Identificador do contato e ação de revisão são obrigatórios.");
  }

  await decidirRevisaoContato({
    contatoId,
    usuario,
    acao,
    motivo,
    observacao,
    evidenciaUtilizada,
    novosDados:
      papelComercial || area || senioridade || justificativa
        ? { papelComercial, area, senioridade, justificativa }
        : undefined,
  });

  revalidatePath("/revisao-contatos");
  revalidatePath("/contas");
  revalidatePath("/radar");
}
