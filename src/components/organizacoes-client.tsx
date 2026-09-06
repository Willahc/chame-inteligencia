"use client";

import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ClasseNatureza, ClasseVinculo, rotuloConfianca, rotuloStatusRevisao } from "./rotulos";
import type { OrganizacaoCompleta } from "@/lib/dados";

export function OrganizacoesClient({ organizacoes }: { organizacoes: OrganizacaoCompleta[] }) {
  const [texto, setTexto] = useState("");
  const [vinculo, setVinculo] = useState("");
  const [natureza, setNatureza] = useState("");
  const [somenteMultiUnidade, setSomenteMultiUnidade] = useState(true);
  const [somenteRevisao, setSomenteRevisao] = useState(false);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;

  const resumos = useMemo(
    () =>
      organizacoes.map((org) => {
        const municipios = [
          ...new Set(
            org.instituicoes.flatMap((inst) =>
              inst.unidades.map((unidade) => unidade.endereco?.municipio).filter((m): m is string => Boolean(m)),
            ),
          ),
        ];
        const tipos = [...new Set(org.instituicoes.map((inst) => inst.tipoEstabelecimento.nome))];
        const possuiNucleo = org.instituicoes.some((inst) => inst.segmentacao?.segmento === "NUCLEO_HOSPITALAR");
        return {
          id: org.id,
          nome: org.nome,
          tipoDado: org.tipoDado,
          tipoVinculo: org.tipoVinculo,
          nivelConfianca: org.nivelConfianca,
          natureza: org.natureza,
          statusRevisao: org.statusRevisao,
          observacao: org.observacao,
          regraAgrupamento: org.regraAgrupamento,
          quantidadeUnidades: org.instituicoes.length,
          municipios,
          tipos,
          possuiNucleo,
        };
      }),
    [organizacoes],
  );

  const textoNorm = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const filtradas = useMemo(
    () =>
      resumos
        .filter((org) => !textoNorm || `${org.nome} ${org.tipos.join(" ")} ${org.municipios.join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(textoNorm))
        .filter((org) => !vinculo || org.tipoVinculo === vinculo)
        .filter((org) => !natureza || org.natureza === natureza)
        .filter((org) => !somenteMultiUnidade || org.quantidadeUnidades > 1)
        .filter((org) => !somenteRevisao || org.tipoVinculo === "PROVAVEL" || org.tipoVinculo === "INCERTO")
        .sort((a, b) => b.quantidadeUnidades - a.quantidadeUnidades || a.nome.localeCompare(b.nome, "pt-BR")),
    [resumos, textoNorm, vinculo, natureza, somenteMultiUnidade, somenteRevisao],
  );

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  const vinculos = useMemo(() => [...new Set(resumos.map((org) => org.tipoVinculo))], [resumos]);
  const naturezas = useMemo(() => [...new Set(resumos.map((org) => org.natureza))], [resumos]);

  function alterarTexto(novo: string) { setTexto(novo); setPagina(1); }
  function alterarVinculo(novo: string) { setVinculo(novo); setPagina(1); }
  function alterarNatureza(novo: string) { setNatureza(novo); setPagina(1); }
  function alterarMulti(novo: boolean) { setSomenteMultiUnidade(novo); setPagina(1); }
  function alterarRevisao(novo: boolean) { setSomenteRevisao(novo); setPagina(1); }

  return (
    <div className="mt-7">
      <section aria-label="Filtros de organizações" className="painel p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Pesquisar</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" /><input className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white pl-10 pr-3 text-base" placeholder="Nome, tipo ou município" value={texto} onChange={(evento) => alterarTexto(evento.target.value)} /></span></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Vínculo</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={vinculo} onChange={(evento) => alterarVinculo(evento.target.value)}><option value="">Todos</option>{vinculos.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Natureza</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={natureza} onChange={(evento) => alterarNatureza(evento.target.value)}><option value="">Todas</option>{naturezas.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><input className="size-4 accent-[var(--azul)]" type="checkbox" checked={somenteMultiUnidade} onChange={(evento) => alterarMulti(evento.target.checked)} />Somente com múltiplas unidades</label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><input className="size-4 accent-[var(--azul)]" type="checkbox" checked={somenteRevisao} onChange={(evento) => alterarRevisao(evento.target.checked)} />Somente revisão necessária</label>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--borda)] pt-4"><p aria-live="polite" className="text-sm text-[var(--texto-suave)]"><strong className="text-[var(--texto)]">{filtradas.length}</strong> de {resumos.length} agrupamentos · página {paginaAtual} de {totalPaginas}</p><button className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--azul)] hover:bg-slate-100" onClick={() => { setTexto(""); setVinculo(""); setNatureza(""); setSomenteMultiUnidade(true); setSomenteRevisao(false); setPagina(1); }} type="button"><RotateCcw size={16} aria-hidden="true" />Limpar filtros</button></div>
      </section>

      <section className="painel mt-5 overflow-hidden" aria-label="Resultados de organizações">
        {filtradas.length === 0 ? <div className="px-6 py-16 text-center"><h2 className="text-lg font-bold">Nenhuma organização encontrada</h2><p className="mt-2 text-sm text-[var(--texto-suave)]">Ajuste ou limpe os filtros para ampliar a consulta.</p></div> : <><div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-[var(--texto-suave)]"><tr>{["Organização", "Unidades", "Vínculo", "Confiança", "Natureza", "Municípios", "Tipos", "Revisão"].map((titulo) => <th className="px-4 py-3 font-semibold first:pl-6" key={titulo}>{titulo}</th>)}</tr></thead><tbody>{visiveis.map((org) => <tr className="border-t border-[var(--borda)] align-top hover:bg-slate-50/60" key={org.id}><td className="px-4 py-4 pl-6"><Link className="font-bold text-[var(--azul)] hover:underline" href={`/organizacoes/${org.id}`}>{org.nome}</Link>{org.regraAgrupamento && <span className="mt-1 block text-xs text-[var(--texto-suave)]">{org.regraAgrupamento}</span>}</td><td className="px-4 py-4 font-bold">{org.quantidadeUnidades}</td><td className="px-4 py-4"><ClasseVinculo vinculo={org.tipoVinculo} /></td><td className="px-4 py-4">{rotuloConfianca[org.nivelConfianca]}</td><td className="px-4 py-4"><ClasseNatureza natureza={org.natureza} /></td><td className="max-w-56 px-4 py-4 text-[var(--texto-suave)]">{org.municipios.join(", ")}</td><td className="max-w-64 px-4 py-4 text-[var(--texto-suave)]">{org.tipos.join(", ")}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${org.tipoVinculo === "PROVAVEL" || org.tipoVinculo === "INCERTO" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>{rotuloStatusRevisao[org.statusRevisao] ?? org.statusRevisao}</span></td></tr>)}</tbody></table></div><div className="flex items-center justify-center gap-3 border-t border-[var(--borda)] p-4"><button className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={paginaAtual <= 1} onClick={() => setPagina((valor) => Math.max(1, valor - 1))} type="button">Anterior</button><span className="text-sm text-[var(--texto-suave)]">Página {paginaAtual} de {totalPaginas}</span><button className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))} type="button">Próxima</button></div></>}
      </section>
    </div>
  );
}