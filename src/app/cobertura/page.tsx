import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CoberturaClient } from "@/components/cobertura-client";
import { obterMetricasCoberturaFontes } from "@/lib/cobertura";

export const metadata: Metadata = {
  title: "Cobertura de Dados e Fontes | Chame Inteligência",
  description: "Auditoria e monitoramento de cobertura territorial, cadastral e de compras públicas por fonte de dados.",
};

export const dynamic = "force-dynamic";

export default async function CoberturaPage() {
  const dados = await obterMetricasCoberturaFontes();

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <CabecalhoPagina
        titulo="Cobertura de Dados e Painel de Fontes"
        descricao="Auditoria completa da abrangência, proveniência e rastreabilidade dos conjuntos de dados públicos e oficiais integrados."
      />

      <div className="mt-7">
        <CoberturaClient dados={dados} />
      </div>
    </main>
  );
}
