"use client";

import Link from "next/link";
import { ArrowRight, Landmark, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
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
    <article className="painel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--borda)] px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--azul-profundo)]">Top oportunidades comerciais</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            {modo === "MODO_DEMONSTRACAO"
              ? "MODO DEMONSTRAÇÃO — 5 contas simuladas com dados fictícios"
              : `MODO REAL — ${instituicoes.length.toLocaleString("pt-BR")} oportunidades reais ordenadas por prioridade comercial (0–100)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
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
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
            <tr>
              <th className="px-5 py-3.5">Instituição / Conta</th>
              <th className="px-3 py-3.5">Rede / Organização</th>
              <th className="px-3 py-3.5">Município</th>
              <th className="px-3 py-3.5 text-center">Unidades</th>
              <th className="px-3 py-3.5 text-center">Índice</th>
              <th className="px-3 py-3.5">Faixa</th>
              <th className="px-3 py-3.5">Segmentação</th>
              <th className="px-3 py-3.5">Sinais PNCP</th>
              <th className="px-3 py-3.5 text-center">Cobertura</th>
              <th className="px-3 py-3.5">Contatos</th>
              <th className="px-3 py-3.5">Principal Motivo</th>
              <th className="px-3 py-3.5">Risco / Validação</th>
              <th className="px-4 py-3.5">Ação Recomendada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--borda)] text-sm">
            {visiveis.map((item) => (
              <tr className="hover:bg-slate-50/75 transition" key={item.id}>
                {/* 1. Instituição */}
                <td className="px-5 py-4 font-medium">
                  <Link
                    className="font-bold text-[var(--azul)] hover:underline"
                    href={`/instituicoes/${item.slug}`}
                  >
                    {item.nome}
                  </Link>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        item.tipoDado === "DEMONSTRACAO"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-100 text-teal-800"
                      }`}
                    >
                      {item.tipoDado === "DEMONSTRACAO" ? "DEMONSTRAÇÃO" : "FATO OFICIAL"}
                    </span>
                    {item.cnes && (
                      <span className="text-[11px] text-slate-400">CNES {item.cnes}</span>
                    )}
                  </div>
                </td>

                {/* 2. Organização / Rede */}
                <td className="px-3 py-4 text-xs">
                  {item.organizacao ? (
                    <div>
                      <Link
                        className="font-semibold text-slate-800 hover:text-[var(--azul)] hover:underline"
                        href={`/organizacoes/${item.organizacao.id}`}
                      >
                        {item.organizacao.nome}
                      </Link>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {item.organizacao.quantidadeUnidades > 1 ? "Rede Multiunidade" : "Isolada"}
                      </span>
                    </div>
                  ) : item.grupo ? (
                    <span className="font-medium text-slate-700">{item.grupo}</span>
                  ) : (
                    <span className="text-slate-400">Isolada</span>
                  )}
                </td>

                {/* 3. Município */}
                <td className="px-3 py-4 text-xs text-[var(--texto-suave)]">
                  <span>{item.municipio}</span>
                  {item.municipios.length > 1 && (
                    <span className="block text-[10px] text-slate-400">
                      +{item.municipios.length - 1} cidade(s)
                    </span>
                  )}
                </td>

                {/* 4. Quantidade de Unidades */}
                <td className="px-3 py-4 text-center font-bold text-slate-800 text-xs">
                  {item.quantidadeUnidades}
                </td>

                {/* 5. Índice */}
                <td className="px-3 py-4 text-center">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--azul-profundo)] font-bold text-white shadow-sm text-sm">
                    {item.indice}
                  </span>
                </td>

                {/* 6. Faixa */}
                <td className="px-3 py-4">
                  <ClasseFaixa faixa={item.faixa} />
                </td>

                {/* 7. Segmentação */}
                <td className="px-3 py-4">
                  {item.segmentacao ? (
                    <ClasseSegmento segmento={item.segmentacao.segmento} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>

                {/* 8. Sinais PNCP */}
                <td className="px-3 py-4 text-xs">
                  {item.possuiSinalPNCP ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        <Landmark size={12} /> {item.totalSinaisPNCP} sinal(is)
                      </span>
                      {item.possuiSinalMobilidadePNCP && (
                        <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Mobilidade
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Sem sinais</span>
                  )}
                </td>

                {/* 9. Cobertura de Dados */}
                <td className="px-3 py-4 text-center">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {item.coberturaDados ?? 100}%
                  </span>
                </td>

                {/* 10. Contatos */}
                <td className="px-3 py-4 text-xs">
                  {(item.quantidadeContatos ?? 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <UserCheck size={13} /> {item.quantidadeContatos} contato(s)
                    </span>
                  ) : (
                    <span className="text-slate-400">Pendente</span>
                  )}
                </td>

                {/* 11. Principal Motivo */}
                <td className="max-w-[180px] px-3 py-4 text-xs text-[var(--texto-suave)] truncate" title={item.principalMotivo}>
                  {item.principalMotivo}
                </td>

                {/* 12. Risco / Validação */}
                <td className="max-w-[160px] px-3 py-4 text-xs">
                  {item.riscoOuLimitacao ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded" title={item.riscoOuLimitacao}>
                      <ShieldAlert size={12} /> {item.riscoOuLimitacao}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-medium">Dados auditados</span>
                  )}
                </td>

                {/* 13. Ação Recomendada */}
                <td className="px-4 py-4 text-xs font-semibold text-[var(--azul)]">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] text-[var(--azul)] border border-blue-100">
                    {item.acaoRecomendada}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borda)] px-5 py-3 sm:px-6">
        <p className="text-xs text-[var(--texto-suave)]">
          Exibindo <strong className="text-[var(--texto)]">{inicio + 1}</strong> a{" "}
          <strong className="text-[var(--texto)]">{Math.min(inicio + porPagina, instituicoes.length)}</strong> de{" "}
          <strong className="text-[var(--texto)]">{instituicoes.length.toLocaleString("pt-BR")}</strong> oportunidades comerciais · Página{" "}
          {paginaAtual} de {totalPaginas}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition"
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
            Abrir radar completo <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
