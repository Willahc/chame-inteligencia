import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CoberturaClient } from "@/components/cobertura-client";
import { obterMetricasCoberturaFontes } from "@/lib/cobertura";

export const metadata: Metadata = {
  title: "Cobertura de Dados e Fontes | WiNS Hub Táxi",
  description: "Auditoria e monitoramento de cobertura territorial, cadastral e de compras públicas por fonte de dados.",
};

export const dynamic = "force-dynamic";

export default async function CoberturaPage() {
  const dados = await obterMetricasCoberturaFontes();

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <CabecalhoPagina
        titulo="Cobertura de Dados e Painel de Fontes"
        descricao="Auditoria completa da abrangência, proveniência e rastreabilidade dos conjuntos de dados públicos e oficiais integrados."
      />

      <div className="mt-7">
        <CoberturaClient dados={dados} />
      </div>
    </div>
  );
}
