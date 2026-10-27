import { NextResponse } from "next/server";
import { z } from "zod";
import {
  carregarCooperativasEFrotasTaxiSP,
  salvarAbordagemCooperativa,
} from "@/lib/cooperativas-taxi";
import { exigirPermissaoOperador } from "@/lib/operador-local";

export const dynamic = "force-dynamic";

const abordagemSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^(COOP-)?\d{8}$/, "Identificador de cooperativa inválido."),
  statusAbordagem: z.enum([
    "NAO_ABORDADA",
    "ABORDADA",
    "DEMONSTRACAO_AGENDADA",
    "PROPOSTA_ENVIADA",
    "CLIENTE_ATIVO",
    "DESCARTADA",
  ]),
  anotacoesComerciais: z.string().trim().max(500).optional(),
});

export async function GET() {
  const resumo = carregarCooperativasEFrotasTaxiSP();
  return NextResponse.json(resumo);
}

export async function POST(request: Request) {
  const corpo = abordagemSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!corpo.success) {
    return NextResponse.json(
      {
        erro: "Parâmetros inválidos para atualização da abordagem da cooperativa.",
        detalhes: corpo.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  let operador: string;
  try {
    operador = exigirPermissaoOperador("PLANEJAR_ACOES");
  } catch {
    return NextResponse.json(
      {
        erro: "Seu perfil de operador não permite registrar abordagens. Solicite perfil REVISOR ou superior.",
      },
      { status: 403 },
    );
  }

  try {
    const resumo = carregarCooperativasEFrotasTaxiSP();
    const alvo = resumo.cooperativas.find(
      (cooperativa) =>
        cooperativa.id === corpo.data.id || cooperativa.raizCnpj === corpo.data.id,
    );

    if (!alvo) {
      return NextResponse.json(
        { erro: "Cooperativa não encontrada na base revisada." },
        { status: 404 },
      );
    }

    salvarAbordagemCooperativa(
      alvo.id,
      corpo.data.statusAbordagem,
      corpo.data.anotacoesComerciais,
      operador,
    );

    return NextResponse.json({
      ok: true,
      id: alvo.id,
      statusAbordagem: corpo.data.statusAbordagem,
      anotacoesComerciais: corpo.data.anotacoesComerciais ?? "",
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: operador,
    });
  } catch (erro) {
    console.error("Erro ao salvar abordagem de cooperativa:", erro);
    return NextResponse.json(
      { erro: "Erro ao salvar abordagem da cooperativa." },
      { status: 500 },
    );
  }
}

