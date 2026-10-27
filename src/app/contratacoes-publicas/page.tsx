import type { Metadata } from "next";
import { listarSinaisContratacao } from "@/lib/pncp";
import { ContratacoesPublicasClient } from "@/components/contratacoes-publicas-client";

export const metadata: Metadata = {
  title: "Sinais de Contratação Pública | WiNS Hub Táxi",
  description: "Monitoramento de editais e dispensas de licitação de saúde e mobilidade via Portal Nacional de Contratações Públicas (PNCP).",
};

export const dynamic = "force-dynamic";

export default async function ContratacoesPublicasPage() {
  const sinais = await listarSinaisContratacao();

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <ContratacoesPublicasClient sinais={sinais} />
    </div>
  );
}
