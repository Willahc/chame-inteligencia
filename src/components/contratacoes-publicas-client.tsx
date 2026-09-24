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

  const totalProcessos = sinais.length;
  const quantidadeSinais = useMemo(() => sinais.filter((s) => s.categoriaPNCP !== "CONTRATO_CONFIRMADO").length, [sinais]);
  const quantidadeContratos = useMemo(() => sinais.filter((s) => s.categoriaPNCP === "CONTRATO_CONFIRMADO").length, [sinais]);
  const totalMobilidade = useMemo(() => sinais.filter((s) => s.sinalMobilidade).length, [sinais]);
  const processosVinculados = useMemo(() => sinais.filter((s) => s.instituicao !== null).length, [sinais]);
  const instituicoesComVinculoExato = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sinais) {
      if (s.instituicao?.id) ids.add(s.instituicao.id);
    }
    return ids.size;
  }, [sinais]);
  const registrosSemVinculo = useMemo(() => sinais.filter((s) => s.instituicao === null).length, [sinais]);
  const registrosAmbiguos = registrosSemVinculo;

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
    <div className="pncp-claro space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--ciano)]/15 text-[var(--ciano)]">
            <Landmark size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--azul-profundo)] lg:text-3xl">
              Portal Nacional de Contratações Públicas (PNCP)
            </h1>
            <p className="text-sm text-[var(--texto-suave)]">
              Editais, dispensas de licitação e contratos formalizados da saúde e mobilidade no estado de SP
            </p>
          </div>
        </div>
      </div>

      {/* Aviso de Governança */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="space-y-2 text-sm text-amber-900">
            <p className="font-semibold text-amber-900">
              Aviso de Governança — Registros Oficiais PNCP (Fato Público)
            </p>
            <p className="leading-relaxed text-amber-950">
              Estes dados são extraídos diretamente do <strong>Portal Nacional de Contratações Públicas (PNCP)</strong>.
              A ferramenta distingue rigorosamente entre <strong>quantidade de sinais</strong> (544 editais/dispensas em curso) e <strong>quantidade de contratos</strong> (1.474 contratos e empenhos formalizados).
            </p>
            <p className="leading-relaxed text-amber-950">
              <strong>Vínculo estrito por CNPJ:</strong> há exatamente <strong>1 instituição com vínculo exato</strong> por CNPJ unívoco (Hospital do Servidor Público Estadual / IAMSPE, com 4 processos vinculados).
              Os demais <strong>2.014 registros sem vínculo direto</strong> pertencem a órgãos públicos gerais ou centrais (como a Secretaria de Estado da Saúde de SP, que administra mais de 200 hospitais, Secretarias Municipais e Fazenda). Por serem <strong>registros ambíguos</strong> em nível de estabelecimento hospitalar individual, foram preservados estritamente como <em>sem vínculo</em>, garantindo que correspondências aproximadas nunca sejam promovidas a fato oficial.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-[var(--borda)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Processos</span>
            <FileSearch size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[var(--azul-profundo)]">{totalProcessos.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">
            {quantidadeSinais} sinais · {quantidadeContratos} contratos · {totalMobilidade} mobilidade
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--borda)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Quantidade de Sinais</span>
            <FileSearch size={16} className="text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-sky-800">{quantidadeSinais.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">Editais e dispensas em curso</p>
        </div>

        <div className="rounded-2xl border border-[var(--borda)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Quantidade de Contratos</span>
            <FileCheck size={16} className="text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-800">{quantidadeContratos.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">Contratos assinados e empenhos</p>
        </div>

        <div className="rounded-2xl border border-[var(--borda)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Instituições com Vínculo Exato</span>
            <Building size={16} className="text-[var(--azul)]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[var(--azul)]">{instituicoesComVinculoExato}</p>
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">{processosVinculados} processos via CNPJ unívoco</p>
        </div>

        <div className="rounded-2xl border border-[var(--borda)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Registros sem Vínculo</span>
            <Building size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">{registrosSemVinculo.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">Visíveis no painel geral de compras</p>
        </div>

        <div className="rounded-2xl border border-[var(--borda)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Registros Ambíguos</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-800">{registrosAmbiguos.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">Órgãos centrais sem vínculo forçado</p>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="space-y-4 rounded-2xl border border-[var(--borda)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
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
              className="w-full rounded-xl border border-[var(--borda)] bg-white pl-10 pr-4 py-2.5 text-sm text-[var(--texto)] placeholder:text-slate-400 focus:border-[var(--ciano)] focus:outline-none"
            />
          </div>

          {/* Categoria */}
          <div>
            <select
              value={filtroCategoria}
              onChange={(e) => atualizarFiltroCategoria(e.target.value as "TODAS" | "SINAIS" | "CONTRATOS")}
              className="w-full rounded-xl border border-[var(--borda)] bg-white px-3 py-2.5 text-sm text-[var(--texto)] focus:border-[var(--ciano)] focus:outline-none"
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
              className="w-full rounded-xl border border-[var(--borda)] bg-white px-3 py-2.5 text-sm text-[var(--texto)] focus:border-[var(--ciano)] focus:outline-none"
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
              className="w-full rounded-xl border border-[var(--borda)] bg-white px-3 py-2.5 text-sm text-[var(--texto)] focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS">Vínculo: Todos os Processos ({totalProcessos.toLocaleString("pt-BR")})</option>
              <option value="VINCULADOS">Instituições com Vínculo Exato ({instituicoesComVinculoExato} inst. · {processosVinculados} proc.)</option>
              <option value="SEM_VINCULO">Registros sem Vínculo / Órgãos Centrais ({registrosSemVinculo.toLocaleString("pt-BR")})</option>
            </select>
          </div>

          {/* Município */}
          <div>
            <select
              value={filtroMunicipio}
              onChange={(e) => atualizarFiltroMunicipio(e.target.value)}
              className="w-full rounded-xl border border-[var(--borda)] bg-white px-3 py-2.5 text-sm text-[var(--texto)] focus:border-[var(--ciano)] focus:outline-none"
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
              className="w-full rounded-xl border border-[var(--borda)] bg-white px-3 py-2.5 text-sm text-[var(--texto)] focus:border-[var(--ciano)] focus:outline-none"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borda)] pt-3 text-xs text-[var(--texto-suave)]">
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
          <div className="rounded-2xl border border-dashed border-[var(--borda)] bg-white p-12 text-center shadow-sm">
            <Filter className="mx-auto size-8 text-slate-400" />
            <p className="mt-3 text-base font-medium text-[var(--azul-profundo)]">Nenhum processo encontrado para os filtros selecionados</p>
            <p className="mt-1 text-xs text-[var(--texto-suave)]">Tente ajustar os critérios de busca ou redefinir os filtros</p>
          </div>
        ) : (
          paginados.map((sinal) => {
            const isContrato = sinal.categoriaPNCP === "CONTRATO_CONFIRMADO";

            return (
              <div
                key={sinal.id}
                className={`rounded-2xl border p-5 transition shadow-sm ${
                  isContrato
                    ? "border-indigo-200 bg-indigo-50/40"
                    : sinal.sinalMobilidade
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-[var(--borda)] bg-white"
                }`}
              >
                <div className="space-y-4">
                  {/* Linha superior: Categoria / Modalidade e Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isContrato
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : "bg-slate-100 text-slate-800 border border-slate-200"
                        }`}
                      >
                        {isContrato ? `Contrato Confirmado · ${sinal.modalidade}` : `Sinal PNCP · ${sinal.modalidade}`}
                      </span>

                      <span className="text-xs text-[var(--texto-suave)]">
                        Publicado em {formatarData(sinal.dataPublicacao)}
                      </span>

                      {sinal.sinalMobilidade && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                          <Car size={13} aria-hidden="true" />
                          Mobilidade / Transporte
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                        {sinal.tipoDado}
                      </span>
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        Confiança: {sinal.confianca}
                      </span>
                    </div>
                  </div>

                  {/* Objeto */}
                  <div>
                    <h2 className="text-base font-semibold leading-snug text-[var(--azul-profundo)]">
                      {sinal.objeto}
                    </h2>
                  </div>

                  {/* Detalhes do Órgão e Localização */}
                  <div className="grid grid-cols-1 gap-3 text-xs text-[var(--texto)] sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Building className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-[var(--azul-profundo)]">{sinal.razaoSocialOrgao || "Órgão público não nomeado"}</p>
                        <p className="text-[var(--texto-suave)]">CNPJ: {formatarCNPJ(sinal.cnpjOrgao)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-[var(--azul-profundo)]">
                          {sinal.municipio ? `${sinal.municipio}, ${sinal.uf || "SP"}` : "Localização sob consulta"}
                        </p>
                        <p className="text-[var(--texto-suave)]">ID PNCP: {sinal.identificadorPNCP}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start lg:justify-end gap-2">
                      <div className="text-right sm:text-left lg:text-right">
                        <p className="text-[11px] uppercase tracking-wider text-[var(--texto-suave)]">
                          {isContrato ? "Valor do Contrato" : "Valor Estimado"}
                        </p>
                        <p className="text-sm font-bold text-[var(--azul-profundo)]">{formatarMoeda(sinal.valorEstimado)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhe de Fornecedor (quando contrato confirmado) */}
                  {sinal.fornecedorNome && (
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
                      <span className="font-semibold text-slate-800">Fornecedor Contratado: </span>
                      <span className="text-[var(--azul-profundo)] font-medium">{sinal.fornecedorNome}</span>
                      {sinal.fornecedorCNPJ && (
                        <span className="text-[var(--texto-suave)]"> · CNPJ: {formatarCNPJ(sinal.fornecedorCNPJ)}</span>
                      )}
                    </div>
                  )}

                  {/* Vínculo Institucional e Botão PNCP */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borda)] pt-3">
                    <div>
                      {sinal.instituicao ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--texto-suave)]">Vínculo Oficial por CNPJ:</span>
                          <Link
                            href={`/instituicoes/${sinal.instituicao.slug}`}
                            className="font-semibold text-[var(--azul)] hover:underline"
                          >
                            {sinal.instituicao.nome}
                          </Link>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-200">
                            {sinal.metodoVinculo}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--texto-suave)]">
                          Sem correspondência direta no cadastro do CNES (Licitação Municipal / Órgão Público Geral)
                        </span>
                      )}
                    </div>

                    {sinal.urlPublica && (
                      <a
                        href={sinal.urlPublica}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--borda)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--texto)] transition hover:bg-slate-50 hover:text-[var(--azul)]"
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--borda)] bg-white p-4 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina(1)}
              className="rounded-lg border border-[var(--borda)] bg-white px-3 py-1.5 font-semibold text-[var(--texto)] hover:bg-slate-50 disabled:opacity-30"
            >
              Primeira
            </button>
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--borda)] bg-white px-3 py-1.5 font-semibold text-[var(--texto)] hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
          </div>

          <span className="text-[var(--texto-suave)]">
            Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong> ({sinaisFiltrados.length} processos)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--borda)] bg-white px-3 py-1.5 font-semibold text-[var(--texto)] hover:bg-slate-50 disabled:opacity-30"
            >
              Próxima <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina(totalPaginas)}
              className="rounded-lg border border-[var(--borda)] bg-white px-3 py-1.5 font-semibold text-[var(--texto)] hover:bg-slate-50 disabled:opacity-30"
            >
              Última
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
