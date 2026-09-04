"use client";

import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClasseFaixa, ClasseSegmento, rotuloConfianca } from "./rotulos";
import { filtrarInstituicoes, type FiltrosRadar } from "@/domain/filtros";
import type { InstituicaoRadar } from "@/domain/tipos";

export function RadarClient({ instituicoes }: { instituicoes: InstituicaoRadar[] }) {
  const [filtros, setFiltros] = useState<FiltrosRadar>({});
  const [ordem, setOrdem] = useState<"maior" | "menor">("maior");
  const municipios = useMemo(() => [...new Set(instituicoes.flatMap((item) => item.municipios))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const tipos = useMemo(() => [...new Set(instituicoes.map((item) => item.tipo))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const segmentos = useMemo(() => [...new Set(instituicoes.map((item) => item.segmentacao?.segmento).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const filtradas = useMemo(() => {
    const resultado = filtrarInstituicoes(instituicoes, filtros);
    return ordem === "maior" ? resultado : [...resultado].reverse();
  }, [filtros, instituicoes, ordem]);

  useEffect(() => {
    const contexto = document.modelContext;
    if (!contexto?.registerTool) return;
    const ciclo = new AbortController();
    const faixas = ["MUITO_ALTA", "ALTA", "MODERADA", "BAIXA"];
    const confiancas = ["ALTA", "MEDIA", "BAIXA"];

    void Promise.resolve(contexto.registerTool({
      name: "configurar_filtros_radar",
      title: "Configurar filtros do radar",
      description: "Aplica filtros à tabela visível de potenciais clientes usando apenas os dados locais.",
      inputSchema: {
        type: "object",
        properties: {
          texto: { type: "string" },
          indiceMinimo: { type: "number", minimum: 0, maximum: 100 },
          municipio: { type: "string" },
          tipo: { type: "string" },
          variasUnidades: { type: "boolean" },
          expansao: { type: "boolean" },
          operacao24h: { type: "boolean" },
          qualidadeEvidencia: { type: "string", enum: confiancas },
          faixa: { type: "string", enum: faixas },
          segmento: { type: "string" },
          somenteOportunidadesComerciais: { type: "boolean" },
          ordem: { type: "string", enum: ["maior", "menor"] },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(entrada: unknown) {
        if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new Error("Filtros inválidos.");
        const valor = entrada as Record<string, unknown>;
        const permitidas = ["texto", "indiceMinimo", "municipio", "tipo", "variasUnidades", "expansao", "operacao24h", "qualidadeEvidencia", "faixa", "segmento", "somenteOportunidadesComerciais", "ordem"];
        if (Object.keys(valor).some((chave) => !permitidas.includes(chave))) throw new Error("Filtro não reconhecido.");
        if (valor.indiceMinimo !== undefined && (typeof valor.indiceMinimo !== "number" || valor.indiceMinimo < 0 || valor.indiceMinimo > 100)) throw new Error("Índice mínimo inválido.");
        if (valor.faixa !== undefined && !faixas.includes(String(valor.faixa))) throw new Error("Faixa inválida.");
        if (valor.qualidadeEvidencia !== undefined && !confiancas.includes(String(valor.qualidadeEvidencia))) throw new Error("Confiança inválida.");
        const novosFiltros: FiltrosRadar = {
          texto: typeof valor.texto === "string" ? valor.texto : undefined,
          indiceMinimo: typeof valor.indiceMinimo === "number" ? valor.indiceMinimo : undefined,
          municipio: typeof valor.municipio === "string" ? valor.municipio : undefined,
          tipo: typeof valor.tipo === "string" ? valor.tipo : undefined,
          variasUnidades: typeof valor.variasUnidades === "boolean" ? valor.variasUnidades : undefined,
          expansao: typeof valor.expansao === "boolean" ? valor.expansao : undefined,
          operacao24h: typeof valor.operacao24h === "boolean" ? valor.operacao24h : undefined,
          qualidadeEvidencia: valor.qualidadeEvidencia as FiltrosRadar["qualidadeEvidencia"],
          faixa: valor.faixa as FiltrosRadar["faixa"],
          segmento: typeof valor.segmento === "string" ? valor.segmento : undefined,
          somenteOportunidadesComerciais: typeof valor.somenteOportunidadesComerciais === "boolean" ? valor.somenteOportunidadesComerciais : undefined,
        };
        setFiltros(novosFiltros);
        if (valor.ordem === "maior" || valor.ordem === "menor") setOrdem(valor.ordem);
        await new Promise<void>((resolver) => requestAnimationFrame(() => resolver()));
        return { estado: "aplicado", filtros: novosFiltros, ordem: valor.ordem ?? "maior" };
      },
    }, { signal: ciclo.signal })).catch(() => undefined);
    return () => ciclo.abort();
  }, []);

  function alterar<K extends keyof FiltrosRadar>(campo: K, valor: FiltrosRadar[K]) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <div className="mt-7">
      <section aria-label="Filtros do radar" className="painel p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Pesquisar</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" /><input className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white pl-10 pr-3 text-base" placeholder="Instituição, grupo ou município" value={filtros.texto ?? ""} onChange={(evento) => alterar("texto", evento.target.value)} /></span></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Índice mínimo</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.indiceMinimo ?? 0} onChange={(evento) => alterar("indiceMinimo", Number(evento.target.value))}><option value={0}>Todos</option><option value={40}>40 pontos</option><option value={60}>60 pontos</option><option value={80}>80 pontos</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Município</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.municipio ?? ""} onChange={(evento) => alterar("municipio", evento.target.value || undefined)}><option value="">Todos</option>{municipios.map((municipio) => <option key={municipio}>{municipio}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Tipo</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.tipo ?? ""} onChange={(evento) => alterar("tipo", evento.target.value || undefined)}><option value="">Todos</option>{tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Qualidade da evidência</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.qualidadeEvidencia ?? ""} onChange={(evento) => alterar("qualidadeEvidencia", (evento.target.value || undefined) as FiltrosRadar["qualidadeEvidencia"])}><option value="">Todas</option><option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Faixa de prioridade</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.faixa ?? ""} onChange={(evento) => alterar("faixa", (evento.target.value || undefined) as FiltrosRadar["faixa"])}><option value="">Todas</option><option value="MUITO_ALTA">Muito Alta</option><option value="ALTA">Alta</option><option value="MODERADA">Moderada</option><option value="BAIXA">Baixa</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Segmento</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.segmento ?? ""} onChange={(evento) => alterar("segmento", evento.target.value || undefined)}><option value="">Todos</option>{segmentos.map((segmento) => <option key={segmento} value={segmento}>{segmento}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Ordenação do índice</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={ordem} onChange={(evento) => setOrdem(evento.target.value as "maior" | "menor")}><option value="maior">Maior primeiro</option><option value="menor">Menor primeiro</option></select></label>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 xl:col-span-2">
            {[{ campo: "variasUnidades", rotulo: "Várias unidades" }, { campo: "expansao", rotulo: "Com expansão" }, { campo: "operacao24h", rotulo: "Opera 24h" }, { campo: "somenteOportunidadesComerciais", rotulo: "Somente oportunidades comerciais" }].map(({ campo, rotulo }) => <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium" key={campo}><input className="size-4 accent-[var(--azul)]" type="checkbox" checked={Boolean(filtros[campo as keyof FiltrosRadar])} onChange={(evento) => alterar(campo as keyof FiltrosRadar, evento.target.checked)} />{rotulo}</label>)}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--borda)] pt-4"><p aria-live="polite" className="text-sm text-[var(--texto-suave)]"><strong className="text-[var(--texto)]">{filtradas.length}</strong> de {instituicoes.length} instituições</p><button className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--azul)] hover:bg-slate-100" onClick={() => { setFiltros({}); setOrdem("maior"); }} type="button"><RotateCcw size={16} aria-hidden="true" />Limpar filtros</button></div>
      </section>

      <section className="painel mt-5 overflow-hidden" aria-label="Resultados do radar">
        {filtradas.length === 0 ? <div className="px-6 py-16 text-center"><h2 className="text-lg font-bold">Nenhuma instituição encontrada</h2><p className="mt-2 text-sm text-[var(--texto-suave)]">Ajuste ou limpe os filtros para ampliar a consulta.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1280px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-[var(--texto-suave)]"><tr>{["Instituição", "Grupo", "Município", "Tipo", "Unidades", "24 horas", "Índice", "Faixa", "Segmento", "Principal motivo", "Evidências", "Ação recomendada"].map((titulo) => <th className="px-4 py-3 font-semibold first:pl-6" key={titulo}>{titulo}</th>)}</tr></thead><tbody>{filtradas.map((item) => <tr className="border-t border-[var(--borda)] align-top hover:bg-slate-50/60" key={item.id}><td className="px-4 py-4 pl-6"><Link className="font-bold text-[var(--azul)] hover:underline" href={`/instituicoes/${item.slug}`}>{item.nome}</Link><span className="mt-1 block text-xs font-bold text-amber-700">DEMONSTRAÇÃO</span></td><td className="px-4 py-4 text-[var(--texto-suave)]">{item.grupo ?? "Sem grupo"}</td><td className="px-4 py-4">{item.municipio}{item.municipios.length > 1 && <span className="block text-xs text-[var(--texto-suave)]">+ {item.municipios.length - 1} município(s)</span>}</td><td className="px-4 py-4">{item.tipo}</td><td className="px-4 py-4 font-bold">{item.quantidadeUnidades}</td><td className="px-4 py-4">{item.operacao24h ? "Sim" : "Não"}</td><td className="px-4 py-4"><span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--azul-profundo)] font-bold text-white">{item.indice}</span></td><td className="px-4 py-4"><ClasseFaixa faixa={item.faixa} /></td><td className="px-4 py-4">{item.segmentacao ? <ClasseSegmento segmento={item.segmentacao.segmento} /> : <span className="text-xs text-[var(--texto-suave)]">Sem segmento</span>}</td><td className="max-w-52 px-4 py-4 text-[var(--texto-suave)]">{item.principalMotivo}</td><td className="px-4 py-4">{rotuloConfianca[item.qualidadeEvidencias]}</td><td className="max-w-56 px-4 py-4 font-medium">{item.acaoRecomendada}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
