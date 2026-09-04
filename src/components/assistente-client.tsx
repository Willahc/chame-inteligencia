"use client";

import Link from "next/link";
import { BotMessageSquare, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { InstituicaoAssistente } from "@/domain/tipos";
import type { RespostaAssistente } from "@/domain/assistente";

const perguntas = [
  "Quais instituições devo abordar primeiro?",
  "Quais possuem várias unidades?",
  "Quais possuem sinais de expansão?",
  "Quais funcionam 24 horas?",
  "Quais instituições possuem evidências fracas?",
  "Quais pertencem ao Núcleo Hospitalar?",
  "Quais oportunidades comerciais devo priorizar?",
  "Por que esta instituição está priorizada?",
  "Prepare um resumo comercial desta instituição.",
];

export function AssistenteClient({ instituicoes }: { instituicoes: InstituicaoAssistente[] }) {
  const [pergunta, setPergunta] = useState(perguntas[0]);
  const [slug, setSlug] = useState(instituicoes[0]?.slug ?? "");
  const [resultado, setResultado] = useState<RespostaAssistente | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function consultar() {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, slugSelecionado: slug || undefined }),
      });
      setResultado(await resposta.json());
    } catch {
      setResultado({ resposta: "Não foi possível consultar os dados locais agora.", instituicoes: [], intencaoReconhecida: false });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <section className="painel p-6" aria-labelledby="perguntas-assistente">
        <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ciano-claro)] text-[var(--azul)]"><BotMessageSquare size={22} aria-hidden="true" /></span><div><h2 className="text-lg font-bold" id="perguntas-assistente">Consulta orientada</h2><p className="mt-1 text-sm leading-6 text-[var(--texto-suave)]">Escolha uma pergunta. O mecanismo usa regras fixas e somente a base SQLite local.</p></div></div>
        <fieldset className="mt-6 space-y-2"><legend className="mb-2 text-sm font-bold">Perguntas disponíveis</legend>{perguntas.map((item) => <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm leading-5 transition ${pergunta === item ? "border-[var(--ciano)] bg-[var(--ciano-claro)]" : "border-[var(--borda)] hover:bg-slate-50"}`} key={item}><input className="mt-0.5 accent-[var(--azul)]" type="radio" name="pergunta" value={item} checked={pergunta === item} onChange={() => setPergunta(item)} /><span>{item}</span></label>)}</fieldset>
        <label className="mt-5 block"><span className="mb-1.5 block text-sm font-bold">Instituição para perguntas específicas</span><select className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-base" value={slug} onChange={(evento) => setSlug(evento.target.value)}>{instituicoes.map((item) => <option value={item.slug} key={item.id}>{item.nome}</option>)}</select></label>
        <button className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--azul-profundo)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--azul)] disabled:opacity-60" disabled={carregando} onClick={consultar} type="button">{carregando ? "Consultando dados locais..." : "Consultar assistente"}<Send size={17} aria-hidden="true" /></button>
      </section>

      <section className="painel min-h-[420px] p-6" aria-live="polite" aria-labelledby="resposta-assistente">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--borda)] pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--azul)]">Resposta determinística</p><h2 className="mt-1 text-lg font-bold" id="resposta-assistente">Resultado da consulta</h2></div><ShieldCheck className="text-[var(--sucesso)]" size={24} aria-label="Consulta protegida por regras de governança" /></div>
        {!resultado ? <div className="flex min-h-72 flex-col items-center justify-center text-center"><BotMessageSquare className="text-slate-300" size={44} aria-hidden="true" /><p className="mt-4 max-w-sm text-sm leading-6 text-[var(--texto-suave)]">A resposta aparecerá aqui com as instituições relacionadas e sem geração livre de conteúdo.</p></div> : <div className="pt-6"><p className="text-base font-medium leading-7">{resultado.resposta}</p>{resultado.instituicoes.length > 0 && <ul className="mt-5 space-y-3">{resultado.instituicoes.map((item, indice) => <li className="flex items-center gap-4 rounded-xl border border-[var(--borda)] bg-slate-50 p-4" key={item.slug}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[var(--azul)]">{indice + 1}</span><div className="flex-1"><Link className="font-bold text-[var(--azul)] hover:underline" href={`/instituicoes/${item.slug}`}>{item.nome}</Link><p className="mt-0.5 text-sm text-[var(--texto-suave)]">Índice de prioridade: {item.indice}</p></div></li>)}</ul>}<div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Esta resposta não substitui a revisão das evidências nem a decisão do time comercial.</div></div>}
      </section>
    </div>
  );
}
