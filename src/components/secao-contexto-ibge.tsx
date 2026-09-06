"use client";

import { MapPin, ShieldCheck, Globe, Navigation } from "lucide-react";
import type { ContextoGeograficoIBGE } from "@/lib/ibge";

interface SecaoContextoIBGEProps {
  ibge: ContextoGeograficoIBGE | null;
}

export function SecaoContextoIBGE({ ibge }: SecaoContextoIBGEProps) {
  if (!ibge) {
    return null;
  }

  return (
    <article className="painel overflow-hidden border border-sky-200/60 p-6 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <MapPin size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Contexto Geográfico e Territorial (IBGE)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                <ShieldCheck size={12} aria-hidden="true" /> Fato Oficial
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Malha Territorial Oficial do Instituto Brasileiro de Geografia e Estatística
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-700">
          <Globe size={13} aria-hidden="true" /> IBGE: {ibge.codigoIbge}
        </span>
      </div>

      {/* Grid de Dados Geográficos */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Município / UF</span>
          <span className="mt-1 block font-bold text-slate-900">
            {ibge.municipio} — {ibge.ufSigla}
          </span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Código CNES / IBGE 6</span>
          <span className="mt-1 block font-mono font-semibold text-slate-900">{ibge.codigoIbge6}</span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Grande Região</span>
          <span className="mt-1 block font-semibold text-sky-800">{ibge.regiaoNome}</span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Estado Federativo</span>
          <span className="mt-1 block font-semibold text-slate-900">{ibge.ufNome}</span>
        </div>

        {ibge.mesorregiao && (
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="block text-xs font-medium text-slate-500">Mesorregião</span>
            <span className="mt-1 block text-slate-900">{ibge.mesorregiao}</span>
          </div>
        )}

        {ibge.microrregiao && (
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="block text-xs font-medium text-slate-500">Microrregião</span>
            <span className="mt-1 block text-slate-900">{ibge.microrregiao}</span>
          </div>
        )}

        {ibge.regiaoIntermediaria && (
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="block text-xs font-medium text-slate-500">Região Intermediária</span>
            <span className="mt-1 block text-slate-900">{ibge.regiaoIntermediaria}</span>
          </div>
        )}

        {ibge.regiaoImediata && (
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="block text-xs font-medium text-slate-500">Região Imediata</span>
            <span className="mt-1 block text-slate-900">{ibge.regiaoImediata}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1">
          <Navigation size={12} aria-hidden="true" /> Divisão Territorial Brasileira — Base Cartográfica IBGE 2026
        </span>
        <span>Rastreabilidade: Código Municipal Oficial</span>
      </div>
    </article>
  );
}
