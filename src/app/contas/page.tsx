import { Building2, Sparkles, TrendingUp, Users } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ContasClient } from "@/components/contas-client";
import { listarContasComerciais } from "@/lib/dados";
import { obterModoDados } from "@/domain/modo-dados";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const modo = obterModoDados();
  const contas = await listarContasComerciais(modo);

  const totalPrioritarias = contas.filter(
    (c) =>
      c.faixaPrioridadeComercial === "MUITO_ALTA" ||
      c.faixaPrioridadeComercial === "ALTA",
  ).length;

  const totalComContatos = contas.filter(
    (c) => c.quantidadeContatos > 0,
  ).length;

  const totalAbordadas = contas.filter(
    (c) => c.resultadoAbordagem !== "NAO_ABORDADA",
  ).length;

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <CabecalhoPagina
        titulo="Contas Comerciais"
        descricao="Radar de contas B2B prioritárias para prospecção corporativa da Chame Táxi. Consolidação auditável de redes, hospitais e contatos profissionais públicos."
        acao={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
            <span className="rounded-xl bg-[var(--azul-profundo)] px-3.5 py-2 text-white">
              {contas.length} contas mapeadas
            </span>
            <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-emerald-800">
              {totalPrioritarias} prioritárias
            </span>
          </div>
        }
      />

      <section aria-label="Indicadores rápidos" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="painel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Total de Contas
            </p>
            <Building2 size={18} className="text-[var(--azul)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--azul-profundo)]">{contas.length}</p>
          <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
            {modo === "MODO_DEMONSTRACAO" ? "Modo demonstração controlado" : "Contas oficiais consolidadas"}
          </p>
        </article>

        <article className="painel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Prioridade Alta / Muito Alta
            </p>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{totalPrioritarias}</p>
          <p className="mt-0.5 text-xs text-[var(--texto-suave)]">Pontuação comercial ≥ 60</p>
        </article>

        <article className="painel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Com Contatos Públicos
            </p>
            <Users size={18} className="text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{totalComContatos}</p>
          <p className="mt-0.5 text-xs text-[var(--texto-suave)]">Contatos corporativos verificados</p>
        </article>

        <article className="painel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Abordadas no Pipeline
            </p>
            <Sparkles size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{totalAbordadas}</p>
          <p className="mt-0.5 text-xs text-[var(--texto-suave)]">Status comercial atualizado</p>
        </article>
      </section>

      <ContasClient contas={contas} />
    </div>
  );
}
