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
