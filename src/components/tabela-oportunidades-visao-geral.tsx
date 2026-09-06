"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { ClasseFaixa, ClasseSegmento } from "./rotulos";
import type { InstituicaoRadar, ModoDados } from "@/domain/tipos";

export function TabelaOportunidadesVisaoGeral({
  instituicoes,
  modo,
}: {
  instituicoes: InstituicaoRadar[];
  modo: ModoDados;
}) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(15);

  const totalPaginas = Math.max(1, Math.ceil(instituicoes.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = instituicoes.slice(inicio, inicio + porPagina);
  const prioritarias = instituicoes.filter((item) => item.indice >= 60).length;

  return (
    <article className="painel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--borda)] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--azul-profundo)]">Oportunidades comerciais</h2>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            {modo === "MODO_DEMONSTRACAO"
              ? "MODO DEMONSTRAÇÃO — 5 contas simuladas com dados fictícios"
              : `MODO REAL — ${instituicoes.length.toLocaleString("pt-BR")} contas reais ordenadas por prioridade hospitalar`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {prioritarias} com alta prioridade (≥ 60)
          </span>
          <label className="flex items-center gap-1.5 text-xs text-[var(--texto-suave)]">
            <span>Por página:</span>
            <select
              className="rounded-lg border border-[var(--borda)] bg-white px-2 py-1 text-xs font-semibold text-[var(--texto)]"
              value={porPagina}
              onChange={(e) => {
                setPorPagina(Number(e.target.value));
                setPagina(1);
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-slate-50 text-sm text-[var(--texto-suave)]">
            <tr>
              <th className="px-6 py-3 font-semibold">Instituição</th>
              <th className="px-4 py-3 font-semibold">Município</th>
              <th className="px-4 py-3 font-semibold">Índice</th>
              <th className="px-4 py-3 font-semibold">Faixa</th>
              <th className="px-4 py-3 font-semibold">Segmento</th>
              <th className="px-4 py-3 font-semibold">Principal motivo</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((item) => (
              <tr className="border-t border-[var(--borda)] text-sm hover:bg-slate-50/60" key={item.id}>
                <td className="px-6 py-4">
                  <Link className="font-bold text-[var(--azul)] hover:underline" href={`/instituicoes/${item.slug}`}>
                    {item.nome}
                  </Link>
                  <span
                    className={`mt-1 block text-xs font-semibold ${
                      item.tipoDado === "DEMONSTRACAO" ? "text-amber-700" : "text-teal-700"
                    }`}
                  >
                    {item.tipoDado === "DEMONSTRACAO" ? "DEMONSTRAÇÃO" : "FATO OFICIAL"}
                  </span>
                </td>
                <td className="px-4 py-4 text-[var(--texto-suave)]">{item.municipio}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--azul-profundo)] font-bold text-white">
                    {item.indice}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <ClasseFaixa faixa={item.faixa} />
                </td>
                <td className="px-4 py-4">
                  {item.segmentacao ? (
                    <ClasseSegmento segmento={item.segmentacao.segmento} />
                  ) : (
                    <span className="text-xs text-[var(--texto-suave)]">—</span>
                  )}
                </td>
                <td className="max-w-xs px-4 py-4 text-[var(--texto-suave)]">{item.principalMotivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borda)] px-5 py-3 sm:px-6">
        <p className="text-xs text-[var(--texto-suave)]">
          Exibindo <strong className="text-[var(--texto)]">{inicio + 1}</strong> a{" "}
          <strong className="text-[var(--texto)]">{Math.min(inicio + porPagina, instituicoes.length)}</strong> de{" "}
          <strong className="text-[var(--texto)]">{instituicoes.length.toLocaleString("pt-BR")}</strong> instituições · Página{" "}
          {paginaAtual} de {totalPaginas}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            type="button"
          >
            Próxima
          </button>
          <Link
            className="ml-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--azul)] hover:underline"
            href="/radar"
          >
            Abrir radar <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
