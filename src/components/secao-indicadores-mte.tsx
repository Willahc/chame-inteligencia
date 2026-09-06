"use client";

import { Users, TrendingUp, AlertCircle, Briefcase, Car } from "lucide-react";
import type { IndicadorMTEItem } from "@/lib/mte";

interface SecaoIndicadoresMTEProps {
  indicadores: IndicadorMTEItem[];
}

export function SecaoIndicadoresMTE({ indicadores }: SecaoIndicadoresMTEProps) {
  if (!indicadores || indicadores.length === 0) {
    return null;
  }

  return (
    <article className="painel overflow-hidden border border-indigo-200/60 p-6 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Users size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Mercado de Trabalho e Dinâmica do Setor (MTE / Novo CAGED)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                Fato Público Agregado
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Estatísticas oficiais de emprego e porte de estabelecimentos de saúde (PDET / Novo CAGED 2026)
            </p>
          </div>
        </div>
      </div>

      {/* Aviso de Governança Obrigatório */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs leading-5 text-indigo-950">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />
        <p>
          <strong>Aviso de Governança MTE:</strong> Indicadores macroeconômicos e setoriais agregados por município e classe CNAE.{" "}
          <em>Não representam dados individuais de funcionários nem o quadro de pessoal privativo da instituição</em>.
        </p>
      </div>

      {/* Lista de Indicadores */}
      <div className="mt-5 space-y-4">
        {indicadores.map((ind) => (
          <div key={ind.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-indigo-600" aria-hidden="true" />
                <strong className="text-sm font-bold text-slate-900">{ind.indicador}</strong>
              </div>
              <span className="rounded bg-indigo-100/70 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                {ind.municipio} — {ind.uf} ({ind.periodo})
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <span className="block font-medium text-slate-500">Setor / CNAE</span>
                <span className="mt-0.5 block font-semibold text-slate-800">{ind.setorCnae}</span>
                <span className="block text-slate-500">{ind.descricaoSetor}</span>
              </div>

              <div>
                <span className="block font-medium text-slate-500">Volume Setorial Estimado</span>
                <span className="mt-0.5 block font-bold text-indigo-900">{ind.quantidadeAgregada}</span>
              </div>
            </div>

            {/* Detalhes de faixas de porte se houver */}
            {ind.detalhesAgregados && Array.isArray((ind.detalhesAgregados as Record<string, unknown>).faixasPorte) && (
              <div className="mt-3 border-t border-slate-200/50 pt-3">
                <span className="block text-xs font-semibold text-slate-600 mb-2">
                  Distribuição de Estabelecimentos por Porte (CAGED/RAIS):
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {((ind.detalhesAgregados as Record<string, unknown>).faixasPorte as Array<{ faixa: string; proporcao: string }>).map((f) => (
                    <div key={f.faixa} className="rounded bg-white p-2 border border-slate-200/50 text-center">
                      <span className="block text-[11px] text-slate-500">{f.faixa}</span>
                      <strong className="block text-xs text-indigo-700 font-bold mt-0.5">{f.proporcao}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ocupações de mobilidade mapeadas */}
            {ind.detalhesAgregados && Array.isArray((ind.detalhesAgregados as Record<string, unknown>).ocupacoesCboMapeadas) && (
              <div className="mt-3 border-t border-slate-200/50 pt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Car size={14} className="text-indigo-600" aria-hidden="true" />
                  <span>CBOs de Mobilidade e Transporte Mapeados:</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {((ind.detalhesAgregados as Record<string, unknown>).ocupacoesCboMapeadas as string[]).map((cbo) => (
                    <span key={cbo} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium border border-slate-200 text-slate-700">
                      {cbo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1">
          <TrendingUp size={12} aria-hidden="true" /> Fonte: Ministério do Trabalho e Emprego / Novo CAGED
        </span>
        <span>Agregação Territorial: 100% Anonimizada</span>
      </div>
    </article>
  );
}
