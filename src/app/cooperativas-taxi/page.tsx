import React from "react";
import { carregarCooperativasEFrotasTaxiSP } from "@/lib/cooperativas-taxi";
import { CooperativasTaxiClient } from "@/components/cooperativas-taxi-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cooperativas & Rádio-Táxis (Oferta SaaS) • WiNS Hub Táxi",
  description:
    "Mapeamento de Cooperativas de Táxi, Centrais de Rádio-Táxi, Associações de Taxistas e Frotas de Táxi PJ em São Paulo para oferta comercial do WiNS Hub Táxi.",
};

export default function PaginaCooperativasTaxi() {
  const resumo = carregarCooperativasEFrotasTaxiSP();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <CooperativasTaxiClient resumoInicial={resumo} />
    </main>
  );
}
