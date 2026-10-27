import { NextRequest, NextResponse } from "next/server";
import { consultarTaxistasMapeados } from "@/lib/ecossistema-unificado";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("busca") ?? "";
  const edital = searchParams.get("edital") ?? "TODOS";
  const status = searchParams.get("status") ?? "TODOS";
  const tier = searchParams.get("tier") ?? "TODOS";
  const mei = searchParams.get("mei") ?? "TODOS";
  const pagina = Number(searchParams.get("pagina") ?? "1") || 1;
  const tamanhoPagina = Number(searchParams.get("tamanhoPagina") ?? "50") || 50;

  const resultado = consultarTaxistasMapeados({
    busca,
    edital,
    status,
    tier,
    mei,
    pagina,
    tamanhoPagina,
  });

  return NextResponse.json(resultado);
}
