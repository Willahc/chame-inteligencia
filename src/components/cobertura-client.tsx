"use client";

import { useState, useMemo } from "react";
import {
  Database,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building,
  Landmark,
  MapPin,
  Users,
  Filter,
} from "lucide-react";
import type { ResumoCoberturaFontes } from "@/lib/cobertura";

interface CoberturaClientProps {
  dados: ResumoCoberturaFontes;
}

export function CoberturaClient({ dados }: CoberturaClientProps) {
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [filtroTipoDado, setFiltroTipoDado] = useState<string>("TODOS");

  const fontesFiltradas = useMemo(() => {
    return dados.fontes.filter((f) => {
      if (filtroStatus !== "TODOS" && f.statusDisponibilidade !== filtroStatus) return false;
      if (filtroTipoDado !== "TODOS" && f.tipoDado !== filtroTipoDado) return false;
      return true;
    });
  }, [dados.fontes, filtroStatus, filtroTipoDado]);

  const obterBadgeStatus = (status: string) => {
    switch (status) {
      case "ATIVA":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">Disponível e Ativa</span>;
      case "AUXILIAR_TERCEIRO":
        return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300">Auxiliar de Terceiros</span>;
      case "LOCAL_PRESERVADA":
        return <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">Localmente Preservada</span>;
      case "PENDENTE":
        return <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">Fonte Oficial Pendente</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{status}</span>;
    }
  };

  const obterBadgeTipoDado = (tipo: string) => {
    switch (tipo) {
      case "FATO_OFICIAL":
        return <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">Fato Oficial</span>;
      case "FATO_PUBLICO":
        return <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">Fato Público</span>;
      case "DADO_TERCEIRO_NAO_CANONICO":
        return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">Não Canônico (3º)</span>;
      default:
        return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{tipo}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Resumo Quantitativo Geral */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="painel p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Instituições Reais</span>
            <Building size={18} className="text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[var(--azul-profundo)]">
            {dados.totalInstituicoesReais.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">100% canônicas (CNES DataSUS)</p>
        </div>

        <div className="painel p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Contas Comerciais</span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[var(--azul-profundo)]">
            {dados.totalContasComerciais.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Grupos econômicos e independentes</p>
        </div>

        <div className="painel p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Enriquecimento Cadastral</span>
            <Database size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-amber-900">
            {dados.coberturaBrasilAPI.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">CNPJs enriquecidos via BrasilAPI (100% prioritários)</p>
        </div>

        <div className="painel p-5 border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Contratações Públicas</span>
            <Landmark size={18} className="text-teal-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[var(--azul-profundo)]">
            {(dados.totalProcessosPNCP ?? dados.fontes.find((f) => f.nome.includes("PNCP"))?.totalRegistros ?? 2018).toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {dados.totalInstituicoesVinculoExatoPNCP ?? dados.coberturaPNCP} instituição com vínculo exato ({dados.totalPNCPRegistrosVinculados ?? 4} processos)
          </p>
        </div>
      </div>

      {/* Seção de Cobertura Relativa por Conjunto de Dados */}
      <section className="painel p-6">
        <h2 className="text-base font-bold text-[var(--azul-profundo)]">
          Taxa de Cobertura sobre o Universo Prioritário de Saúde
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Percentual de estabelecimentos e entidades contemplados por cada fonte integrada localmente
        </p>

        <div className="mt-6 space-y-4">
          {/* CNES */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Building size={14} className="text-blue-600" /> CNES (Cadastro Nacional de Estabelecimentos de Saúde)
              </span>
              <span className="text-blue-700">100% (8.212 instituições)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-blue-600" style={{ width: "100%" }} />
            </div>
          </div>

          {/* IBGE */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-800">
                <MapPin size={14} className="text-sky-600" /> IBGE (Divisão Territorial e Geográfica)
              </span>
              <span className="text-sky-700">100% (5.571 municípios cadastrados)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-sky-500" style={{ width: "100%" }} />
            </div>
          </div>

          {/* MTE */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Users size={14} className="text-indigo-600" /> MTE / Novo CAGED (Estatísticas Setoriais de Saúde)
              </span>
              <span className="text-indigo-700">100% contextual no estado de SP</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-indigo-500" style={{ width: "100%" }} />
            </div>
          </div>

          {/* BrasilAPI */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Database size={14} className="text-amber-600" /> BrasilAPI (Camada Auxiliar de CNPJs Prioritários)
              </span>
              <span className="text-amber-800 font-bold">100% do universo prioritário (2.996 CNPJs)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-amber-500" style={{ width: "36.5%" }} />
            </div>
          </div>

          {/* PNCP */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Landmark size={14} className="text-teal-600" /> PNCP (Processos e Contratos de Compras Públicas)
              </span>
              <span className="text-teal-700">
                {dados.totalInstituicoesVinculoExatoPNCP ?? dados.coberturaPNCP} instituição com vínculo exato ({dados.totalPNCPRegistrosVinculados ?? 4} processos) · {(dados.totalPNCPRegistrosSemVinculo ?? 2014).toLocaleString("pt-BR")} registros sem vínculo
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-teal-500" style={{ width: "1%" }} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Quantidade de sinais: <strong className="text-slate-700">{(dados.totalSinaisPNCP ?? 544).toLocaleString("pt-BR")}</strong></span>
              <span>·</span>
              <span>Quantidade de contratos: <strong className="text-slate-700">{(dados.totalContratosPNCP ?? 1474).toLocaleString("pt-BR")}</strong></span>
              <span>·</span>
              <span>Registros sem vínculo: <strong className="text-slate-700">{(dados.totalPNCPRegistrosSemVinculo ?? 2014).toLocaleString("pt-BR")}</strong></span>
              <span>·</span>
              <span className="text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200 font-medium">Registros ambíguos: órgãos centrais (SES/SMS) preservados sem vínculo forçado</span>
            </div>
          </div>

          {/* Receita Federal Oficial */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1 text-slate-400">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={14} className="text-rose-500" /> Receita Federal Oficial (Carga em Lote Nacional)
              </span>
              <span className="text-rose-600 font-bold">0% (Fonte oficial temporariamente pendente)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-slate-300" style={{ width: "0%" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Painel Interativo de Fontes de Dados */}
      <section className="painel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--azul-profundo)]">
              Painel Geral de Fontes de Dados
            </h2>
            <p className="text-xs text-slate-500">
              Detalhamento de custódia, confiança, formato, tipo canônico e atualização de cada base
            </p>
          </div>

          {/* Filtros do Painel */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter size={14} />
              <span>Status:</span>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="ATIVA">Disponível e Ativa</option>
                <option value="AUXILIAR_TERCEIRO">Auxiliar de Terceiros</option>
                <option value="LOCAL_PRESERVADA">Localmente Preservada</option>
                <option value="PENDENTE">Fonte Oficial Pendente</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Tipo de Dado:</span>
              <select
                value={filtroTipoDado}
                onChange={(e) => setFiltroTipoDado(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
              >
                <option value="TODOS">Todas as Classificações</option>
                <option value="FATO_OFICIAL">Fato Oficial</option>
                <option value="FATO_PUBLICO">Fato Público</option>
                <option value="DADO_TERCEIRO_NAO_CANONICO">Dado de Terceiro (Não Canônico)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid de Cartões de Fontes */}
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {fontesFiltradas.map((fonte) => (
            <div
              key={fonte.nome}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                fonte.statusDisponibilidade === "PENDENTE"
                  ? "border-rose-200 bg-rose-50/20"
                  : fonte.statusDisponibilidade === "AUXILIAR_TERCEIRO"
                  ? "border-amber-200 bg-amber-50/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  {obterBadgeStatus(fonte.statusDisponibilidade)}
                  {obterBadgeTipoDado(fonte.tipoDado)}
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
                  {fonte.nome}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{fonte.orgao}</p>

                <p className="mt-3 text-xs leading-5 text-slate-600">
                  {fonte.descricao}
                </p>

                {fonte.avisoGovernança && (
                  <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2.5 text-[11px] leading-4 text-amber-900">
                    <strong>Aviso:</strong> {fonte.avisoGovernança}
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span>Registros locais:</span>
                  <strong className="font-mono text-slate-900">
                    {fonte.totalRegistros.toLocaleString("pt-BR")}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span>Última carga / extração:</span>
                  <span className="font-medium text-slate-700">{fonte.dataUltimaAtualizacao}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-xs">
                  <a
                    href={fonte.urlOficial}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[var(--azul)] hover:underline"
                  >
                    Portal Oficial
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                  <span className="text-[11px] text-slate-400">Origem Rastreável</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
