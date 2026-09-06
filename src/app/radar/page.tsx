import Link from "next/link";
import { Network } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { RadarClient } from "@/components/radar-client";
import { listarInstituicoes, mapearParaRadar } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const instituicoes = (await listarInstituicoes()).map(mapearParaRadar);
  return <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10"><CabecalhoPagina titulo="Radar de Potenciais Clientes" descricao="Pesquise, filtre e ordene as instituições disponíveis no modo de dados atual pelos sinais e pelo Índice de Prioridade Hospitalar." acao={<Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-white px-4 py-2 text-sm font-bold text-[var(--azul)] hover:bg-slate-50" href="/organizacoes"><Network size={17} aria-hidden="true" />Organizações e Redes</Link>} /><RadarClient instituicoes={instituicoes} /></div>;
}
