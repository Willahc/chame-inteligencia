import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { RadarClient } from "@/components/radar-client";
import { listarInstituicoes, mapearParaRadar } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const instituicoes = (await listarInstituicoes()).map(mapearParaRadar);
  return <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><CabecalhoPagina titulo="Radar de Potenciais Clientes" descricao="Pesquise, filtre e ordene instituições fictícias pelos sinais e pelo índice de prioridade hospitalar." /><RadarClient instituicoes={instituicoes} /></div>;
}
