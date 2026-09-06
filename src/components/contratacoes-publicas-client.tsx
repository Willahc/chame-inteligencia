"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building,
  Car,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Filter,
  Landmark,
  MapPin,
  Search,
} from "lucide-react";
import type { SinalContratacaoItem } from "@/lib/pncp";

interface ContratacoesPublicasClientProps {
  sinais: SinalContratacaoItem[];
}

function formatarMoeda(valor: number | null): string {
  if (valor === null || valor === undefined || valor <= 0) {
    return "Valor não informado no edital";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return isoStr;
  }
}

function formatarCNPJ(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? "Não informado";
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function ContratacoesPublicasClient({ sinais }: ContratacoesPublicasClientProps) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "MOBILIDADE" | "VINCULADOS">("TODOS");

  const totalSinais = sinais.length;
  const totalMobilidade = useMemo(() => sinais.filter((s) => s.sinalMobilidade).length, [sinais]);
  const totalVinculados = useMemo(() => sinais.filter((s) => s.instituicao !== null).length, [sinais]);
  const orgaosUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const s of sinais) {
      if (s.cnpjOrgao) set.add(s.cnpjOrgao);
    }
    return set.size;
  }, [sinais]);

  const sinaisFiltrados = useMemo(() => {
    return sinais.filter((s) => {
      if (filtroTipo === "MOBILIDADE" && !s.sinalMobilidade) return false;
      if (filtroTipo === "VINCULADOS" && !s.instituicao) return false;

      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      const obj = (s.objeto || "").toLowerCase();
      const org = (s.razaoSocialOrgao || "").toLowerCase();
      const mun = (s.municipio || "").toLowerCase();
      const id = (s.identificadorPNCP || "").toLowerCase();
      const cnpj = (s.cnpjOrgao || "").toLowerCase();

      return obj.includes(q) || org.includes(q) || mun.includes(q) || id.includes(q) || cnpj.includes(q);
    });
  }, [sinais, filtroTipo, busca]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--ciano)]/15 text-[var(--ciano)]">
            <Landmark size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Sinais de Contratação Pública
            </h1>
            <p className="text-sm text-slate-300">
              Mapeamento oficial de editais e dispensas de licitação de saúde e mobilidade no PNCP
            </p>
          </div>
        </div>
      </div>

      {/* Aviso de Governança */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
          <div className="space-y-1 text-sm text-amber-200/90">
            <p className="font-semibold text-amber-300">
              Aviso de Governança — Evidência Pública Observada (FATO_PUBLICO)
            </p>
            <p className="leading-relaxed text-slate-300">
              Estes registros são sinais públicos observados no <strong>Portal Nacional de Contratações Públicas (PNCP)</strong>.
              Eles <strong>NÃO</strong> configuram contratos fechados, clientes da Chame Táxi ou decisões tomadas,
              e <strong>NÃO</strong> alteram o cálculo canônico do Índice de Prioridade Comercial. Vínculos a instituições
              do CNES são estabelecidos estritamente por coincidência inequívoca de CNPJ oficial (mantenedora ou estabelecimento).
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Sinais</span>
            <FileSearch size={18} className="text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{totalSinais.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-400">Processos públicos analisados em SP</p>
        </div>

        <div className="rounded-2xl border border-[var(--ciano)]/30 bg-[var(--ciano)]/10 p-5">
          <div className="flex items-center justify-between text-[var(--ciano)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Mobilidade & Transporte</span>
            <Car size={18} className="text-[var(--ciano)]" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[var(--ciano)]">{totalMobilidade.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-300">Sinais com foco em táxi, pacientes ou frotas</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Órgãos Identificados</span>
            <Building size={18} className="text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{orgaosUnicos.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-400">CNPJs públicos distintos</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Vinculados ao CNES</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-400">{totalVinculados.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-300">Cruzamento estrito por CNPJ</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Pesquisar por objeto, órgão, município ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition focus:border-[var(--ciano)] focus:ring-1 focus:ring-[var(--ciano)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFiltroTipo("TODOS")}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filtroTipo === "TODOS"
                ? "bg-white text-[var(--azul-profundo)] shadow-sm"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            Todos ({totalSinais})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo("MOBILIDADE")}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filtroTipo === "MOBILIDADE"
                ? "bg-[var(--ciano)] text-[var(--azul-profundo)] shadow-sm font-bold"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            Mobilidade ({totalMobilidade})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo("VINCULADOS")}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filtroTipo === "VINCULADOS"
                ? "bg-emerald-400 text-[var(--azul-profundo)] shadow-sm font-bold"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            Vinculados CNES ({totalVinculados})
          </button>
        </div>
      </div>

      {/* Contagem de Resultados */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Exibindo {sinaisFiltrados.length} de {totalSinais} sinais</span>
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="text-[var(--ciano)] hover:underline"
          >
            Limpar busca
          </button>
        )}
      </div>

      {/* Lista de Sinais */}
      <div className="space-y-4">
        {sinaisFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <Filter className="mx-auto size-10 text-slate-500" />
            <p className="mt-3 text-base font-medium text-white">Nenhum sinal público encontrado</p>
            <p className="mt-1 text-sm text-slate-400">Tente ajustar seus termos de busca ou filtros.</p>
          </div>
        ) : (
          sinaisFiltrados.map((sinal) => (
            <div
              key={sinal.id}
              className={`rounded-2xl border p-5 transition hover:border-white/20 ${
                sinal.sinalMobilidade
                  ? "border-[var(--ciano)]/40 bg-[var(--ciano)]/[0.04]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex flex-col gap-3">
                {/* Top badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300">
                      {sinal.modalidade}
                    </span>
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                      Publicado em {formatarData(sinal.dataPublicacao)}
                    </span>
                    {sinal.sinalMobilidade ? (
                      <span className="flex items-center gap-1.5 rounded-lg bg-[var(--ciano)]/20 px-2.5 py-1 text-xs font-bold text-[var(--ciano)]">
                        <Car size={13} aria-hidden="true" />
                        Sinal de Mobilidade / Transporte
                      </span>
                    ) : (
                      <span className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs text-slate-400">
                        Serviço de Saúde / Hospitalar
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-blue-400/30 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                      FATO_PUBLICO
                    </span>
                    <span className="rounded-md border border-emerald-400/30 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      Confiança: ALTA
                    </span>
                  </div>
                </div>

                {/* Objeto */}
                <div>
                  <h2 className="text-base font-semibold leading-snug text-white">
                    {sinal.objeto}
                  </h2>
                </div>

                {/* Detalhes do Órgão e Localização */}
                <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Building className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-white">{sinal.razaoSocialOrgao || "Órgão público não nomeado"}</p>
                      <p className="text-slate-400">CNPJ: {formatarCNPJ(sinal.cnpjOrgao)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-white">
                        {sinal.municipio ? `${sinal.municipio}, ${sinal.uf || "SP"}` : "Localização sob consulta"}
                      </p>
                      <p className="text-slate-400">ID PNCP: {sinal.identificadorPNCP}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start lg:justify-end gap-2">
                    <div className="text-right sm:text-left lg:text-right">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Valor Estimado</p>
                      <p className="text-sm font-bold text-white">{formatarMoeda(sinal.valorEstimado)}</p>
                    </div>
                  </div>
                </div>

                {/* Vínculo Institucional e Botão PNCP */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                  <div>
                    {sinal.instituicao ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Vínculo Oficial por CNPJ:</span>
                        <Link
                          href={`/instituicoes/${sinal.instituicao.slug}`}
                          className="font-semibold text-[var(--ciano)] hover:underline"
                        >
                          {sinal.instituicao.nome}
                        </Link>
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          {sinal.metodoVinculo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Sem correspondência direta no cadastro do CNES (Licitação Municipal / Direta)
                      </span>
                    )}
                  </div>

                  {sinal.urlPublica && (
                    <a
                      href={sinal.urlPublica}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Ver no Portal PNCP
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
