import { AssistenteClient } from "@/components/assistente-client";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { listarInstituicoes, mapearParaAssistente } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function AssistentePage() {
  const instituicoes = (await listarInstituicoes()).map(mapearParaAssistente);
  return <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><CabecalhoPagina titulo="Assistente Comercial Local" descricao="Consultas predefinidas, sem inteligência artificial externa e sem criação de informações." /><AssistenteClient instituicoes={instituicoes} /></div>;
}
