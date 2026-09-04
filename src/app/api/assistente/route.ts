import { z } from "zod";
import { responderAssistente } from "@/domain/assistente";
import { listarInstituicoes, mapearParaAssistente } from "@/lib/dados";

const consultaSchema = z.object({
  pergunta: z.string().trim().min(1).max(300),
  slugSelecionado: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const corpo = consultaSchema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "Consulta inválida." }, { status: 400 });
  const instituicoes = (await listarInstituicoes()).map(mapearParaAssistente);
  return Response.json(responderAssistente(corpo.data.pergunta, instituicoes, corpo.data.slugSelecionado));
}
