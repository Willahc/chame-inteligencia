import type { Metadata } from "next";
import { listarSinaisContratacao } from "@/lib/pncp";
import { ContratacoesPublicasClient } from "@/components/contratacoes-publicas-client";

export const metadata: Metadata = {
  title: "Sinais de Contratação Pública | Chame Inteligência",
  description: "Monitoramento de editais e dispensas de licitação de saúde e mobilidade via Portal Nacional de Contratações Públicas (PNCP).",
};

export const dynamic = "force-dynamic";

export default async function ContratacoesPublicasPage() {
  const sinais = await listarSinaisContratacao();

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <ContratacoesPublicasClient sinais={sinais} />
    </main>
  );
}
