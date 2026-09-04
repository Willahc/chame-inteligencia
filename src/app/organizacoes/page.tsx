import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { OrganizacoesClient } from "@/components/organizacoes-client";
import { listarOrganizacoes } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function OrganizacoesPage() {
  const organizacoes = await listarOrganizacoes();
  const multi = organizacoes.filter((org) => org.instituicoes.length > 1);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <CabecalhoPagina
        titulo="Organizações e Redes"
        descricao="Agrupamentos identificados por vínculo oficial ou por normalização de razão social no CNES — hipóteses claramente marcadas."
        acao={
          <span className="rounded-xl bg-[var(--ciano-claro)] px-4 py-2.5 text-sm font-bold text-[var(--azul)]">
            {multi.length} agrupamentos com múltiplas unidades
          </span>
        }
      />
      <OrganizacoesClient organizacoes={organizacoes} />
    </div>
  );
}