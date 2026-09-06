import { AssistenteClient } from "@/components/assistente-client";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { listarInstituicoes, mapearParaAssistente } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function AssistentePage() {
  const instituicoes = (await listarInstituicoes()).map(mapearParaAssistente);
  return <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10"><CabecalhoPagina titulo="Assistente Comercial Local" descricao="Consultas predefinidas, sem inteligência artificial externa e sem criação de informações." /><AssistenteClient instituicoes={instituicoes} /></div>;
}
