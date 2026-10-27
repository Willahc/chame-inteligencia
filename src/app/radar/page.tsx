import Link from "next/link";
import { Network } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { RadarClient } from "@/components/radar-client";
import { listarRadarUnificado } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const instituicoes = await listarRadarUnificado();
  return <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10"><CabecalhoPagina titulo="Radar Unificado de Potenciais Clientes (Saúde + Empresas B2B)" descricao="Base unificada: 8.212 instituições de saúde CNES + 96 grandes empresas corporativas e 94 polos de saúde no raio de 5 km com pontos de táxi DTP e decisores mapeados." acao={<Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-white px-4 py-2 text-sm font-bold text-[var(--azul)] hover:bg-slate-50" href="/organizacoes"><Network size={17} aria-hidden="true" />Organizações e Redes</Link>} /><RadarClient instituicoes={instituicoes} /></div>;
}
