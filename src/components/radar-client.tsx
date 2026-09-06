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
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const municipios = useMemo(() => [...new Set(instituicoes.flatMap((item) => item.municipios))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const tipos = useMemo(() => [...new Set(instituicoes.map((item) => item.tipo))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const segmentos = useMemo(() => [...new Set(instituicoes.map((item) => item.segmentacao?.segmento).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const organizacoes = useMemo(() => [...new Set(instituicoes.map((item) => item.organizacao?.nome).filter((nome): nome is string => Boolean(nome)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [instituicoes]);
  const filtradas = useMemo(() => {
    const resultado = filtrarInstituicoes(instituicoes, filtros);
    return ordem === "maior" ? resultado : [...resultado].reverse();
  }, [filtros, instituicoes, ordem]);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

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
          organizacao: { type: "string" },
          natureza: { type: "string", enum: ["PUBLICO", "PRIVADO", "INDETERMINADO"] },
          tipoVinculo: { type: "string", enum: ["OFICIAL", "PROVAVEL", "ISOLADO", "INCERTO"] },
          confiancaVinculo: { type: "string", enum: confiancas },
          revisaoNecessaria: { type: "boolean" },
          somentePrivadasMultiUnidade: { type: "boolean" },
          coberturaMinima: { type: "number", minimum: 0, maximum: 100 },
          organizacaoOuIsolado: { type: "string", enum: ["EM_REDE", "ISOLADA"] },
          ordem: { type: "string", enum: ["maior", "menor"] },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(entrada: unknown) {
        if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new Error("Filtros inválidos.");
        const valor = entrada as Record<string, unknown>;
        const permitidas = ["texto", "indiceMinimo", "municipio", "tipo", "variasUnidades", "expansao", "operacao24h", "qualidadeEvidencia", "faixa", "segmento", "somenteOportunidadesComerciais", "organizacao", "natureza", "tipoVinculo", "confiancaVinculo", "revisaoNecessaria", "somentePrivadasMultiUnidade", "coberturaMinima", "organizacaoOuIsolado", "ordem"];
        if (Object.keys(valor).some((chave) => !permitidas.includes(chave))) throw new Error("Filtro não reconhecido.");
        if (valor.indiceMinimo !== undefined && (typeof valor.indiceMinimo !== "number" || valor.indiceMinimo < 0 || valor.indiceMinimo > 100)) throw new Error("Índice mínimo inválido.");
        if (valor.coberturaMinima !== undefined && (typeof valor.coberturaMinima !== "number" || valor.coberturaMinima < 0 || valor.coberturaMinima > 100)) throw new Error("Cobertura mínima inválida.");
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
          organizacao: typeof valor.organizacao === "string" ? valor.organizacao : undefined,
          natureza: (valor.natureza as FiltrosRadar["natureza"]) ?? undefined,
          tipoVinculo: (valor.tipoVinculo as FiltrosRadar["tipoVinculo"]) ?? undefined,
          confiancaVinculo: (valor.confiancaVinculo as FiltrosRadar["confiancaVinculo"]) ?? undefined,
          revisaoNecessaria: typeof valor.revisaoNecessaria === "boolean" ? valor.revisaoNecessaria : undefined,
          somentePrivadasMultiUnidade: typeof valor.somentePrivadasMultiUnidade === "boolean" ? valor.somentePrivadasMultiUnidade : undefined,
          coberturaMinima: typeof valor.coberturaMinima === "number" ? valor.coberturaMinima : undefined,
          organizacaoOuIsolado: (valor.organizacaoOuIsolado as FiltrosRadar["organizacaoOuIsolado"]) ?? undefined,
        };
        setFiltros(novosFiltros);
        setPagina(1);
        if (valor.ordem === "maior" || valor.ordem === "menor") setOrdem(valor.ordem);
        await new Promise<void>((resolver) => requestAnimationFrame(() => resolver()));
        return { estado: "aplicado", filtros: novosFiltros, ordem: valor.ordem ?? "maior" };
      },
    }, { signal: ciclo.signal })).catch(() => undefined);
    return () => ciclo.abort();
  }, []);

  function alterar<K extends keyof FiltrosRadar>(campo: K, valor: FiltrosRadar[K]) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1);
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
          <label><span className="mb-1.5 block text-sm font-semibold">Organização / Rede</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.organizacao ?? ""} onChange={(evento) => alterar("organizacao", evento.target.value || undefined)}><option value="">Todas</option>{organizacoes.map((organizacao) => <option key={organizacao}>{organizacao}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Natureza do agrupamento</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.natureza ?? ""} onChange={(evento) => alterar("natureza", (evento.target.value || undefined) as FiltrosRadar["natureza"])}><option value="">Todas</option><option value="PUBLICO">Pública</option><option value="PRIVADO">Privada</option><option value="INDETERMINADO">Indeterminada</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Vínculo do agrupamento</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.tipoVinculo ?? ""} onChange={(evento) => alterar("tipoVinculo", (evento.target.value || undefined) as FiltrosRadar["tipoVinculo"])}><option value="">Todos</option><option value="OFICIAL">Vínculo oficial</option><option value="PROVAVEL">Agrupamento provável</option><option value="ISOLADO">Instituição isolada</option><option value="INCERTO">Relação incerta</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Confiança do vínculo</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.confiancaVinculo ?? ""} onChange={(evento) => alterar("confiancaVinculo", (evento.target.value || undefined) as FiltrosRadar["confiancaVinculo"])}><option value="">Todas</option><option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Estrutura organizacional</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.organizacaoOuIsolado ?? ""} onChange={(evento) => alterar("organizacaoOuIsolado", (evento.target.value || undefined) as FiltrosRadar["organizacaoOuIsolado"])}><option value="">Todas</option><option value="EM_REDE">Em rede / grupo</option><option value="ISOLADA">Instituição isolada</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Cobertura de dados</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={filtros.coberturaMinima ?? 0} onChange={(evento) => alterar("coberturaMinima", Number(evento.target.value) || undefined)}><option value={0}>Todas</option><option value={50}>Mínimo 50%</option><option value={75}>Mínimo 75%</option><option value={80}>Mínimo 80%</option><option value={100}>Completa (100%)</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold">Ordenação do índice</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={ordem} onChange={(evento) => setOrdem(evento.target.value as "maior" | "menor")}><option value="maior">Maior primeiro</option><option value="menor">Menor primeiro</option></select></label>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 xl:col-span-2">
            {[{ campo: "variasUnidades", rotulo: "Várias unidades" }, { campo: "expansao", rotulo: "Com expansão" }, { campo: "operacao24h", rotulo: "Opera 24h" }, { campo: "somentePrivadasMultiUnidade", rotulo: "Privadas multi-unidade" }, { campo: "revisaoNecessaria", rotulo: "Revisão necessária" }, { campo: "somenteOportunidadesComerciais", rotulo: "Somente oportunidades comerciais" }].map(({ campo, rotulo }) => <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium" key={campo}><input className="size-4 accent-[var(--azul)]" type="checkbox" checked={Boolean(filtros[campo as keyof FiltrosRadar])} onChange={(evento) => alterar(campo as keyof FiltrosRadar, evento.target.checked)} />{rotulo}</label>)}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--borda)] pt-4"><p aria-live="polite" className="text-sm text-[var(--texto-suave)]"><strong className="text-[var(--texto)]">{filtradas.length}</strong> de {instituicoes.length} instituições · página {paginaAtual} de {totalPaginas}</p><button className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--azul)] hover:bg-slate-100" onClick={() => { setFiltros({}); setOrdem("maior"); setPagina(1); }} type="button"><RotateCcw size={16} aria-hidden="true" />Limpar filtros</button></div>
      </section>

      <section className="painel mt-5 overflow-hidden" aria-label="Resultados do radar">
        {filtradas.length === 0 ? <div className="px-6 py-16 text-center"><h2 className="text-lg font-bold">Nenhuma instituição encontrada</h2><p className="mt-2 text-sm text-[var(--texto-suave)]">Ajuste ou limpe os filtros para ampliar a consulta.</p></div> : <><div className="overflow-x-auto"><table className="w-full min-w-[1280px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-[var(--texto-suave)]"><tr>{["Instituição", "Organização / Rede", "Município", "Tipo", "Unidades", "24 horas", "Índice", "Faixa", "Segmento", "Principal motivo", "Evidências", "Ação recomendada"].map((titulo) => <th className="px-4 py-3 font-semibold first:pl-6" key={titulo}>{titulo}</th>)}</tr></thead><tbody>{visiveis.map((item) => <tr className="border-t border-[var(--borda)] align-top hover:bg-slate-50/60" key={item.id}><td className="px-4 py-4 pl-6"><Link className="font-bold text-[var(--azul)] hover:underline" href={`/instituicoes/${item.slug}`}>{item.nome}</Link><span className={`mt-1 block text-xs font-bold ${item.tipoDado === "FATO_OFICIAL" ? "text-teal-700" : "text-amber-700"}`}>{item.tipoDado === "FATO_OFICIAL" ? "FATO OFICIAL" : "DEMONSTRAÇÃO"}</span></td><td className="px-4 py-4">{item.organizacao ? <div><Link className="font-bold text-[var(--azul)] hover:underline" href={`/organizacoes/${item.organizacao.id}`}>{item.organizacao.nome}</Link>{item.organizacao.quantidadeUnidades > 1 && <span className="mt-1 block text-xs text-[var(--texto-suave)]">{item.organizacao.quantidadeUnidades} unidade(s)</span>}</div> : <span className="text-[var(--texto-suave)]">{item.grupo ?? "Sem grupo"}</span>}</td><td className="px-4 py-4">{item.municipio}{item.municipios.length > 1 && <span className="block text-xs text-[var(--texto-suave)]">+ {item.municipios.length - 1} município(s)</span>}</td><td className="px-4 py-4">{item.tipo}</td><td className="px-4 py-4 font-bold">{item.quantidadeUnidades}</td><td className="px-4 py-4">{item.operacao24h ? "Sim" : "Não"}</td><td className="px-4 py-4"><span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--azul-profundo)] font-bold text-white">{item.indice}</span></td><td className="px-4 py-4"><ClasseFaixa faixa={item.faixa} /></td><td className="px-4 py-4">{item.segmentacao ? <ClasseSegmento segmento={item.segmentacao.segmento} /> : <span className="text-xs text-[var(--texto-suave)]">Sem segmento</span>}</td><td className="max-w-52 px-4 py-4 text-[var(--texto-suave)]">{item.principalMotivo}</td><td className="px-4 py-4">{rotuloConfianca[item.qualidadeEvidencias]}</td><td className="max-w-56 px-4 py-4 font-medium">{item.acaoRecomendada}</td></tr>)}</tbody></table></div><div className="flex items-center justify-center gap-3 border-t border-[var(--borda)] p-4"><button className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={paginaAtual <= 1} onClick={() => setPagina((valor) => Math.max(1, valor - 1))} type="button">Anterior</button><span className="text-sm text-[var(--texto-suave)]">Página {paginaAtual} de {totalPaginas}</span><button className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))} type="button">Próxima</button></div></>}
      </section>
    </div>
  );
}
