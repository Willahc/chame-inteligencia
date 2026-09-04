import Link from "next/link";
import { Network } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { RadarClient } from "@/components/radar-client";
import { listarInstituicoes, mapearParaRadar } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const instituicoes = (await listarInstituicoes()).map(mapearParaRadar);
  return <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><CabecalhoPagina titulo="Radar de Potenciais Clientes" descricao="Pesquise, filtre e ordene instituições fictícias pelos sinais e pelo índice de prioridade hospitalar." acao={<Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-white px-4 py-2 text-sm font-bold text-[var(--azul)] hover:bg-slate-50" href="/organizacoes"><Network size={17} aria-hidden="true" />Organizações e Redes</Link>} /><RadarClient instituicoes={instituicoes} /></div>;
}
