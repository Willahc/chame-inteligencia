"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building,
  Car,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileSearch,
  Filter,
  Landmark,
  MapPin,
  Search,
  SlidersHorizontal,
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
  const [filtroCategoria, setFiltroCategoria] = useState<"TODAS" | "SINAIS" | "CONTRATOS">("TODAS");
  const [filtroMobilidade, setFiltroMobilidade] = useState<"TODOS" | "MOBILIDADE" | "SEM_MOBILIDADE">("TODOS");
  const [filtroVinculo, setFiltroVinculo] = useState<"TODOS" | "VINCULADOS" | "SEM_VINCULO">("TODOS");
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>("TODOS");
  const [filtroModalidade, setFiltroModalidade] = useState<string>("TODOS");
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 15;

  const totalSinais = sinais.length;
  const totalSinaisEdital = useMemo(() => sinais.filter((s) => s.categoriaPNCP !== "CONTRATO_CONFIRMADO").length, [sinais]);
  const totalContratosConfirmados = useMemo(() => sinais.filter((s) => s.categoriaPNCP === "CONTRATO_CONFIRMADO").length, [sinais]);
  const totalMobilidade = useMemo(() => sinais.filter((s) => s.sinalMobilidade).length, [sinais]);
  const totalVinculados = useMemo(() => sinais.filter((s) => s.instituicao !== null).length, [sinais]);

  // Municípios e modalidades disponíveis
  const municipiosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const s of sinais) {
      if (s.municipio) set.add(s.municipio);
    }
    return Array.from(set).sort();
  }, [sinais]);

  const modalidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const s of sinais) {
      if (s.modalidade) set.add(s.modalidade);
    }
    return Array.from(set).sort();
  }, [sinais]);

  const sinaisFiltrados = useMemo(() => {
    return sinais.filter((s) => {
      if (filtroCategoria === "SINAIS" && s.categoriaPNCP === "CONTRATO_CONFIRMADO") return false;
      if (filtroCategoria === "CONTRATOS" && s.categoriaPNCP !== "CONTRATO_CONFIRMADO") return false;

      if (filtroMobilidade === "MOBILIDADE" && !s.sinalMobilidade) return false;
      if (filtroMobilidade === "SEM_MOBILIDADE" && s.sinalMobilidade) return false;

      if (filtroVinculo === "VINCULADOS" && !s.instituicao) return false;
      if (filtroVinculo === "SEM_VINCULO" && s.instituicao) return false;

      if (filtroMunicipio !== "TODOS" && s.municipio !== filtroMunicipio) return false;
      if (filtroModalidade !== "TODOS" && s.modalidade !== filtroModalidade) return false;

      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      const obj = (s.objeto || "").toLowerCase();
      const org = (s.razaoSocialOrgao || "").toLowerCase();
      const mun = (s.municipio || "").toLowerCase();
      const id = (s.identificadorPNCP || "").toLowerCase();
      const cnpj = (s.cnpjOrgao || "").toLowerCase();
      const forn = (s.fornecedorNome || "").toLowerCase();

      return (
        obj.includes(q) ||
        org.includes(q) ||
        mun.includes(q) ||
        id.includes(q) ||
        cnpj.includes(q) ||
        forn.includes(q)
      );
    });
  }, [sinais, filtroCategoria, filtroMobilidade, filtroVinculo, filtroMunicipio, filtroModalidade, busca]);

  const atualizarBusca = (val: string) => {
    setBusca(val);
    setPagina(1);
  };
  const atualizarFiltroCategoria = (val: "TODAS" | "SINAIS" | "CONTRATOS") => {
    setFiltroCategoria(val);
    setPagina(1);
  };
  const atualizarFiltroMobilidade = (val: "TODOS" | "MOBILIDADE" | "SEM_MOBILIDADE") => {
    setFiltroMobilidade(val);
    setPagina(1);
  };
  const atualizarFiltroVinculo = (val: "TODOS" | "VINCULADOS" | "SEM_VINCULO") => {
    setFiltroVinculo(val);
    setPagina(1);
  };
  const atualizarFiltroMunicipio = (val: string) => {
    setFiltroMunicipio(val);
    setPagina(1);
  };
  const atualizarFiltroModalidade = (val: string) => {
    setFiltroModalidade(val);
    setPagina(1);
  };

  const totalPaginas = Math.ceil(sinaisFiltrados.length / itensPorPagina) || 1;
  const inicio = (pagina - 1) * itensPorPagina;
  const paginados = sinaisFiltrados.slice(inicio, inicio + itensPorPagina);
  const registrosRestantes = Math.max(0, sinaisFiltrados.length - (inicio + paginados.length));

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
              Portal Nacional de Contratações Públicas (PNCP)
            </h1>
            <p className="text-sm text-slate-300">
              Editais, dispensas de licitação e contratos formalizados da saúde e mobilidade no estado de SP
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
              Aviso de Governança — Registros Oficiais PNCP (Fato Público)
            </p>
            <p className="leading-relaxed text-slate-300">
              Estes dados são extraídos diretamente do <strong>Portal Nacional de Contratações Públicas (PNCP)</strong>.
              A ferramenta distingue rigorosamente entre <strong>sinais de contratação</strong> (editais/dispensas em curso) e <strong>contratos confirmados</strong> (empenhos/contratos formalizados).
              Nenhum processo configura cliente garantido da Chame Táxi. Vínculos a instituições do CNES ocorrem estritamente por coincidência exata de CNPJ oficial (mantenedora ou estabelecimento).
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Processos</span>
            <FileSearch size={18} className="text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{totalSinais.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-400">
            {totalSinaisEdital} editais/dispensas · {totalContratosConfirmados} contratos
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Contratos Confirmados</span>
            <FileCheck size={18} className="text-indigo-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-indigo-300">{totalContratosConfirmados.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-400">Contratos assinados e empenhos</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Sinais de Mobilidade</span>
            <Car size={18} className="text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-300">{totalMobilidade.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-400">Transporte, frotas, ambulâncias e táxi</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Vínculos por CNPJ</span>
            <Building size={18} className="text-[var(--ciano)]" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[var(--ciano)]">{totalVinculados.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-400">Ligados a hospitais do CNES</p>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <SlidersHorizontal size={14} /> Filtros de Pesquisa e Segmentação
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Busca textual */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por objeto, órgão, fornecedor, CNPJ ou ID..."
              value={busca}
              onChange={(e) => atualizarBusca(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-[var(--ciano)] focus:outline-none"
            />
          </div>

          {/* Categoria */}
          <div>
            <select
              value={filtroCategoria}
              onChange={(e) => atualizarFiltroCategoria(e.target.value as "TODAS" | "SINAIS" | "CONTRATOS")}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODAS">Todas as Categorias</option>
              <option value="SINAIS">Apenas Sinais de Compra (Editais/Dispensas)</option>
              <option value="CONTRATOS">Apenas Contratos Confirmados</option>
            </select>
          </div>

          {/* Mobilidade */}
          <div>
            <select
              value={filtroMobilidade}
              onChange={(e) => atualizarFiltroMobilidade(e.target.value as "TODOS" | "MOBILIDADE" | "SEM_MOBILIDADE")}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS">Mobilidade: Todos</option>
              <option value="MOBILIDADE">Apenas com Sinal de Mobilidade</option>
              <option value="SEM_MOBILIDADE">Sem Sinal de Mobilidade</option>
            </select>
          </div>

          {/* Vínculo Institucional */}
          <div>
            <select
              value={filtroVinculo}
              onChange={(e) => atualizarFiltroVinculo(e.target.value as "TODOS" | "VINCULADOS" | "SEM_VINCULO")}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS">Vínculo: Todos os Registros</option>
              <option value="VINCULADOS">Apenas Vinculados ao CNES</option>
              <option value="SEM_VINCULO">Apenas Não Vinculados (Geral)</option>
            </select>
          </div>

          {/* Município */}
          <div>
            <select
              value={filtroMunicipio}
              onChange={(e) => atualizarFiltroMunicipio(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS">Todos os Municípios</option>
              {municipiosDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div className="lg:col-span-2">
            <select
              value={filtroModalidade}
              onChange={(e) => atualizarFiltroModalidade(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS">Todas as Modalidades / Tipos</option>
              {modalidadesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumo da filtragem */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>
            Mostrando <strong>{sinaisFiltrados.length > 0 ? inicio + 1 : 0}</strong> a{" "}
            <strong>{Math.min(inicio + itensPorPagina, sinaisFiltrados.length)}</strong> de{" "}
            <strong>{sinaisFiltrados.length}</strong> resultados {registrosRestantes > 0 && `(${registrosRestantes} restantes)`}
          </span>
          <span>
            Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
          </span>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-4">
        {paginados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <Filter className="mx-auto size-8 text-slate-500" />
            <p className="mt-3 text-base font-medium text-white">Nenhum processo encontrado para os filtros selecionados</p>
            <p className="mt-1 text-xs text-slate-400">Tente ajustar os critérios de busca ou redefinir os filtros</p>
          </div>
        ) : (
          paginados.map((sinal) => {
            const isContrato = sinal.categoriaPNCP === "CONTRATO_CONFIRMADO";

            return (
              <div
                key={sinal.id}
                className={`rounded-2xl border p-5 transition hover:border-white/20 ${
                  isContrato
                    ? "border-indigo-500/30 bg-indigo-950/15"
                    : sinal.sinalMobilidade
                    ? "border-emerald-500/30 bg-emerald-950/15"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="space-y-4">
                  {/* Linha superior: Categoria / Modalidade e Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isContrato
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {isContrato ? `Contrato Confirmado · ${sinal.modalidade}` : `Sinal PNCP · ${sinal.modalidade}`}
                      </span>

                      <span className="text-xs text-slate-400">
                        Publicado em {formatarData(sinal.dataPublicacao)}
                      </span>

                      {sinal.sinalMobilidade && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                          <Car size={13} aria-hidden="true" />
                          Mobilidade / Transporte
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-blue-400/30 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                        {sinal.tipoDado}
                      </span>
                      <span className="rounded-md border border-emerald-400/30 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        Confiança: {sinal.confianca}
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
                        <p className="text-[11px] uppercase tracking-wider text-slate-400">
                          {isContrato ? "Valor do Contrato" : "Valor Estimado"}
                        </p>
                        <p className="text-sm font-bold text-white">{formatarMoeda(sinal.valorEstimado)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhe de Fornecedor (quando contrato confirmado) */}
                  {sinal.fornecedorNome && (
                    <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300 border border-white/5">
                      <span className="font-semibold text-slate-200">Fornecedor Contratado: </span>
                      <span className="text-white font-medium">{sinal.fornecedorNome}</span>
                      {sinal.fornecedorCNPJ && (
                        <span className="text-slate-400"> · CNPJ: {formatarCNPJ(sinal.fornecedorCNPJ)}</span>
                      )}
                    </div>
                  )}

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
                          Sem correspondência direta no cadastro do CNES (Licitação Municipal / Órgão Público Geral)
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
            );
          })
        )}
      </div>

      {/* Controles de Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina(1)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-30"
            >
              Primeira
            </button>
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
          </div>

          <span className="text-slate-300">
            Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong> ({sinaisFiltrados.length} processos)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-30"
            >
              Próxima <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina(totalPaginas)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-30"
            >
              Última
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
