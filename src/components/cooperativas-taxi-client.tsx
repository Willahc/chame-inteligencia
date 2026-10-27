"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Filter,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import type {
  CategoriaCooperativaTaxi,
  CooperativaTaxiAlvoSaaS,
  ResumoCooperativasTaxiSaaS,
  StatusAbordagemCooperativa,
  StatusRevisaoCooperativa,
  TierPotencialSaaS,
} from "@/lib/cooperativas-taxi";

interface Props {
  resumoInicial: ResumoCooperativasTaxiSaaS;
}

const ROTULOS_STATUS: Record<
  StatusAbordagemCooperativa,
  { rotulo: string; classes: string }
> = {
  NAO_ABORDADA: {
    rotulo: "Não abordada",
    classes: "bg-slate-100 text-slate-700 border-slate-200",
  },
  ABORDADA: {
    rotulo: "Contato iniciado",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DEMONSTRACAO_AGENDADA: {
    rotulo: "Demo agendada",
    classes: "bg-amber-50 text-amber-800 border-amber-200",
  },
  PROPOSTA_ENVIADA: {
    rotulo: "Proposta enviada",
    classes: "bg-purple-50 text-purple-700 border-purple-200",
  },
  CLIENTE_ATIVO: {
    rotulo: "Cliente WiNS Hub",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DESCARTADA: {
    rotulo: "Sem fit / Pausada",
    classes: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const ROTULOS_TIER: Record<
  TierPotencialSaaS,
  { rotulo: string; classes: string }
> = {
  TIER_1_ALTA_PRIORIDADE: {
    rotulo: "Tier 1 • Alvo prioritário",
    classes: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  TIER_2_MEDIA_PRIORIDADE: {
    rotulo: "Tier 2 • Média prioridade",
    classes: "bg-amber-100 text-amber-900 border-amber-300",
  },
  TIER_3_EXPANSAO_FROTA: {
    rotulo: "Tier 3 • Expansão",
    classes: "bg-slate-100 text-slate-800 border-slate-300",
  },
};

const ROTULOS_REVISAO: Record<
  StatusRevisaoCooperativa,
  { rotulo: string; classes: string; icone: React.ReactNode }
> = {
  CONFIRMADO: {
    rotulo: "Confirmada",
    classes: "bg-emerald-50 text-emerald-800 border-emerald-300",
    icone: <BadgeCheck className="h-3.5 w-3.5" />,
  },
  PENDENTE_REVISAO: {
    rotulo: "Pendente de revisão",
    classes: "bg-amber-50 text-amber-900 border-amber-300",
    icone: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

function formatarAnos(anos: number): string {
  return anos >= 1 ? `${anos} ano(s)` : "menos de 1 ano";
}

function escaparCsv(valor: string | number): string {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

export function CooperativasTaxiClient({ resumoInicial }: Props) {
  const [cooperativas, setCooperativas] = useState<CooperativaTaxiAlvoSaaS[]>(
    resumoInicial.cooperativas,
  );
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<
    "TODAS" | CategoriaCooperativaTaxi
  >("TODAS");
  const [tierFiltro, setTierFiltro] = useState<"TODOS" | TierPotencialSaaS>(
    "TODOS",
  );
  const [revisaoFiltro, setRevisaoFiltro] = useState<
    "TODAS" | StatusRevisaoCooperativa
  >("TODAS");
  const [contatoFiltro, setContatoFiltro] = useState<
    "TODOS" | "COM_CONTATO" | "TELEFONE_E_EMAIL"
  >("TODOS");
  const [statusFiltro, setStatusFiltro] = useState<
    "TODOS" | "NAO_ABORDADA" | "EM_PIPELINE" | "CLIENTE_ATIVO"
  >("TODOS");

  const [selecionada, setSelecionada] =
    useState<CooperativaTaxiAlvoSaaS | null>(null);
  const [statusModal, setStatusModal] =
    useState<StatusAbordagemCooperativa>("NAO_ABORDADA");
  const [notasModal, setNotasModal] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");
  const [copiadoPitch, setCopiadoPitch] = useState(false);

  const abrirModal = (item: CooperativaTaxiAlvoSaaS) => {
    setSelecionada(item);
    setStatusModal(item.statusAbordagem);
    setNotasModal(item.anotacoesComerciais || "");
    setErroModal("");
    setCopiadoPitch(false);
  };

  const salvarStatusModal = async () => {
    if (!selecionada) return;
    setSalvando(true);
    setErroModal("");
    try {
      const resp = await fetch("/api/cooperativas-taxi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selecionada.id,
          statusAbordagem: statusModal,
          anotacoesComerciais: notasModal,
        }),
      });
      const dados = (await resp.json().catch(() => null)) as {
        erro?: string;
        atualizadoEm?: string;
        atualizadoPor?: string;
      } | null;

      if (!resp.ok) {
        setErroModal(
          dados?.erro ??
            "Não foi possível salvar a abordagem. Verifique seu perfil de operador.",
        );
        return;
      }

      const atualizadoEm = dados?.atualizadoEm ?? new Date().toISOString();
      const atualizadoPor = dados?.atualizadoPor;

      setCooperativas((prev) =>
        prev.map((c) =>
          c.id === selecionada.id
            ? {
                ...c,
                statusAbordagem: statusModal,
                anotacoesComerciais: notasModal,
                atualizadoEm,
                atualizadoPor,
              }
            : c,
        ),
      );
      setSelecionada((prev) =>
        prev
          ? {
              ...prev,
              statusAbordagem: statusModal,
              anotacoesComerciais: notasModal,
              atualizadoEm,
              atualizadoPor,
            }
          : null,
      );
    } catch {
      setErroModal("Falha de conexão ao salvar a abordagem.");
    } finally {
      setSalvando(false);
    }
  };

  const copiarPitch = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoPitch(true);
      setTimeout(() => setCopiadoPitch(false), 2500);
    } catch {
      // fallback silencioso
    }
  };

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return cooperativas.filter((item) => {
      if (categoriaFiltro !== "TODAS" && item.categoria !== categoriaFiltro) {
        return false;
      }
      if (tierFiltro !== "TODOS" && item.tierSaaS !== tierFiltro) {
        return false;
      }
      if (revisaoFiltro !== "TODAS" && item.statusRevisao !== revisaoFiltro) {
        return false;
      }
      if (contatoFiltro === "COM_CONTATO" && !item.possuiContatoDireto) {
        return false;
      }
      if (
        contatoFiltro === "TELEFONE_E_EMAIL" &&
        (item.telefonePrincipal === "Não informado na Receita Federal" ||
          item.emailPrincipal === "Não informado na Receita Federal")
      ) {
        return false;
      }
      if (
        statusFiltro === "NAO_ABORDADA" &&
        item.statusAbordagem !== "NAO_ABORDADA"
      ) {
        return false;
      }
      if (
        statusFiltro === "EM_PIPELINE" &&
        (item.statusAbordagem === "NAO_ABORDADA" ||
          item.statusAbordagem === "DESCARTADA")
      ) {
        return false;
      }
      if (
        statusFiltro === "CLIENTE_ATIVO" &&
        item.statusAbordagem !== "CLIENTE_ATIVO"
      ) {
        return false;
      }
      if (!termo) return true;
      const alvo = `${item.nomeExibicao} ${item.razaoSocial} ${item.cnpj} ${item.bairro} ${item.emailPrincipal} ${item.telefonePrincipal} ${item.evidencias.join(" ")}`.toLowerCase();
      return alvo.includes(termo);
    });
  }, [
    cooperativas,
    busca,
    categoriaFiltro,
    tierFiltro,
    revisaoFiltro,
    contatoFiltro,
    statusFiltro,
  ]);

  const kpis = useMemo(() => {
    const totalPipeline = cooperativas.filter(
      (c) =>
        c.statusAbordagem !== "NAO_ABORDADA" &&
        c.statusAbordagem !== "DESCARTADA",
    ).length;
    const totalClientes = cooperativas.filter(
      (c) => c.statusAbordagem === "CLIENTE_ATIVO",
    ).length;
    return {
      totalPipeline,
      totalClientes,
    };
  }, [cooperativas]);

  const exportarCsvFiltrado = () => {
    const cabecalho = [
      "ID",
      "CNPJ_DO_ESTABELECIMENTO",
      "TIPO_ESTABELECIMENTO",
      "NOME_EXIBICAO",
      "RAZAO_SOCIAL",
      "CATEGORIA",
      "STATUS_REVISAO",
      "NIVEL_EVIDENCIA",
      "MOTIVO_CLASSIFICACAO",
      "EVIDENCIAS",
      "CNAE_PRINCIPAL",
      "CNAE_PRINCIPAL_DESCRICAO",
      "TIER_SAAS",
      "SCORE_SAAS",
      "TELEFONE_PRINCIPAL",
      "EMAIL_PRINCIPAL",
      "BAIRRO",
      "ENDERECO",
      "CAPITAL_SOCIAL",
      "ANOS_ATUACAO",
      "STATUS_ABORDAGEM",
    ];
    const linhas = filtradas.map((c) =>
      [
        escaparCsv(c.id),
        escaparCsv(c.cnpj),
        escaparCsv(c.tipoEstabelecimento),
        escaparCsv(c.nomeExibicao),
        escaparCsv(c.razaoSocial),
        escaparCsv(c.rotuloCategoria),
        escaparCsv(c.statusRevisao),
        escaparCsv(c.nivelEvidencia),
        escaparCsv(c.motivoClassificacao),
        escaparCsv(c.evidencias.join(" | ")),
        escaparCsv(c.cnaePrincipalFormatado),
        escaparCsv(c.cnaePrincipalDescricao),
        escaparCsv(c.tierSaaS),
        escaparCsv(c.scorePotencialSaaS),
        escaparCsv(c.telefonePrincipal),
        escaparCsv(c.emailPrincipal),
        escaparCsv(c.bairro),
        escaparCsv(c.enderecoCompleto),
        escaparCsv(c.capitalSocialFormatado),
        escaparCsv(c.anosAtuacao),
        escaparCsv(c.statusAbordagem),
      ].join(";"),
    );
    const csv = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cooperativas_taxi_alvo_wins_hub_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Estratégico */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              Go-To-Market SaaS • 1 CNPJ e 1 Contato Principal por Organização
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Cooperativas, Rádio-Táxis e Empresas de Táxi (Alvos do WiNS Hub Táxi)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Base oficial da Receita Federal em São Paulo consolidada por raiz de
              CNPJ. A classificação combina CNAE e nome para separar cooperativas,
              centrais de rádio-táxi, associações e empresas de táxi. Registros sem
              evidência suficiente ficam fora da lista; os ambíguos aparecem como{" "}
              <strong className="text-amber-300">pendentes de revisão humana</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportarCsvFiltrado}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-amber-300 transition"
            >
              <Download className="h-4 w-4" />
              Exportar Lista ({filtradas.length})
            </button>
          </div>
        </div>

        {/* KPIs Executivos */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Organizações Incluídas</span>
              <Building2 className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {resumoInicial.totalGruposMapeados}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {resumoInicial.totalGruposAnalisados.toLocaleString("pt-BR")} raízes
              analisadas • {resumoInicial.totalGruposExcluidos.toLocaleString("pt-BR")}{" "}
              excluídas
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-200">
              <span>Confirmadas na Revisão</span>
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {resumoInicial.totalConfirmados}
            </div>
            <p className="mt-1 text-xs text-amber-200/90">
              {resumoInicial.totalPendentesRevisao} pendente(s) de revisão humana
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Com Telefone / E-mail Direto</span>
              <Phone className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {resumoInicial.totalComContatoDireto}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Contato institucional publicado na Receita Federal
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-amber-200">
              <span>Pipeline de Venda do SaaS</span>
              <Target className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {kpis.totalPipeline}{" "}
              <span className="text-sm font-normal text-amber-200">
                em negociação ({kpis.totalClientes} ativas)
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-200/80">
              Clique em uma organização para registrar a abordagem
            </p>
          </div>
        </div>

        {/* Trilha de auditoria da base */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
              <Database className="h-3.5 w-3.5 text-amber-300" />
              Auditoria da base
            </span>
            <span>
              <strong>{resumoInicial.totalRegistrosFonte.toLocaleString("pt-BR")}</strong>{" "}
              registros PJ ativos na fonte
            </span>
            <span>
              <strong>{resumoInicial.totalRegistrosExcluidos.toLocaleString("pt-BR")}</strong>{" "}
              registros excluídos
            </span>
            <span>
              Critérios: CNAE principal ou secundário de táxi, nome/fantasia e
              natureza jurídica, com bloqueio de segmentos incompatíveis.
            </span>
          </div>
          {resumoInicial.exclusoesPorMotivo.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {resumoInicial.exclusoesPorMotivo.map((item) => (
                <span
                  key={item.motivo}
                  className="rounded-md border border-white/10 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-300"
                >
                  {item.rotulo}: <strong>{item.registros.toLocaleString("pt-BR")}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Abas Rápidas por Categoria */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            valor: "TODAS" as const,
            rotulo: `Todas (${cooperativas.length})`,
          },
          {
            valor: "COOPERATIVA_TAXI" as const,
            rotulo: `Cooperativas de Táxi (${resumoInicial.totalCooperativasPuras})`,
          },
          {
            valor: "CENTRAL_RADIO_TAXI" as const,
            rotulo: `Centrais de Rádio-Táxi (${resumoInicial.totalCentraisRadioTaxi})`,
          },
          {
            valor: "ASSOCIACAO_SINDICATO" as const,
            rotulo: `Associações de Taxistas (${resumoInicial.totalAssociacoesSindicatos})`,
          },
          {
            valor: "FROTA_TAXI_EXECUTIVO" as const,
            rotulo: `Empresas de Táxi PJ (${resumoInicial.totalFrotasTaxiPj})`,
          },
        ].map((aba) => {
          const ativa = categoriaFiltro === aba.valor;
          return (
            <button
              key={aba.valor}
              type="button"
              onClick={() => setCategoriaFiltro(aba.valor)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
                ativa
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CNPJ, bairro, e-mail ou evidência..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={revisaoFiltro}
              onChange={(e) =>
                setRevisaoFiltro(
                  e.target.value as "TODAS" | StatusRevisaoCooperativa,
                )
              }
              aria-label="Filtrar por status de revisão"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="TODAS">Revisão: todas</option>
              <option value="CONFIRMADO">Somente confirmadas</option>
              <option value="PENDENTE_REVISAO">Somente pendentes</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={tierFiltro}
              onChange={(e) =>
                setTierFiltro(e.target.value as "TODOS" | TierPotencialSaaS)
              }
              aria-label="Filtrar por Tier de prioridade SaaS"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="TODOS">Todos os Tiers</option>
              <option value="TIER_1_ALTA_PRIORIDADE">Tier 1 • Alta prioridade</option>
              <option value="TIER_2_MEDIA_PRIORIDADE">Tier 2 • Média prioridade</option>
              <option value="TIER_3_EXPANSAO_FROTA">Tier 3 • Expansão</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={contatoFiltro}
              onChange={(e) =>
                setContatoFiltro(
                  e.target.value as
                    | "TODOS"
                    | "COM_CONTATO"
                    | "TELEFONE_E_EMAIL",
                )
              }
              aria-label="Filtrar por disponibilidade de contato"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="TODOS">Todos os contatos</option>
              <option value="COM_CONTATO">Com telefone ou e-mail</option>
              <option value="TELEFONE_E_EMAIL">Telefone + e-mail</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(
                  e.target.value as
                    | "TODOS"
                    | "NAO_ABORDADA"
                    | "EM_PIPELINE"
                    | "CLIENTE_ATIVO",
                )
              }
              aria-label="Filtrar por status no funil"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="TODOS">Status: todos</option>
              <option value="NAO_ABORDADA">Ainda não abordadas</option>
              <option value="EM_PIPELINE">Em negociação / abordadas</option>
              <option value="CLIENTE_ATIVO">Clientes ativos</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Exibindo <strong>{filtradas.length}</strong> de{" "}
              <strong>{cooperativas.length}</strong> organizações incluídas.
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              Fonte: Receita Federal — CNAEs 4923-0/01, 4923-0/02 e 5229-0/01 (SP)
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Cooperativas / Rádio-Táxis / Empresas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtradas.map((coop) => {
          const statusInfo = ROTULOS_STATUS[coop.statusAbordagem];
          const tierInfo = ROTULOS_TIER[coop.tierSaaS];
          const revisaoInfo = ROTULOS_REVISAO[coop.statusRevisao];
          const pendente = coop.statusRevisao === "PENDENTE_REVISAO";

          return (
            <div
              key={coop.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                pendente
                  ? "border-amber-200 hover:border-amber-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${revisaoInfo.classes}`}
                    >
                      {revisaoInfo.icone}
                      {revisaoInfo.rotulo}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tierInfo.classes}`}
                    >
                      {tierInfo.rotulo}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.classes}`}
                    >
                      {statusInfo.rotulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-300">
                    <span>Fit SaaS</span>
                    <span>{coop.scorePotencialSaaS}/100</span>
                  </div>
                </div>

                <div className="mt-3">
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {coop.nomeExibicao}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {coop.rotuloCategoria} • Tempo de mercado:{" "}
                    <strong>{formatarAnos(coop.anosAtuacao)}</strong> (desde{" "}
                    {coop.dataInicioAtividade})
                  </p>
                </div>

                {/* Bloco 1 CNPJ + 1 Contato Principal por Grupo */}
                <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-slate-700">
                      CNPJ do estabelecimento ({coop.tipoEstabelecimento}):
                    </span>
                    <div className="mt-0.5 font-mono text-slate-900">
                      {coop.cnpj}
                      {coop.unidadesConsolidadasGrupo > 1 && (
                        <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-slate-700">
                          {coop.unidadesConsolidadasGrupo} estabelecimentos na base
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">
                      Bairro / Localização:
                    </span>
                    <div className="mt-0.5 flex items-center gap-1 text-slate-800">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {coop.bairro} — {coop.enderecoCompleto}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">
                      Telefone Principal:
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5 text-slate-900">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{coop.telefonePrincipal}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">
                      E-mail Principal:
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5 text-slate-900">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                      <span className="truncate">{coop.emailPrincipal}</span>
                    </div>
                  </div>
                </div>

                {/* Evidência da classificação */}
                <div
                  className={`mt-3 rounded-xl border p-3 text-xs ${
                    pendente
                      ? "border-amber-200 bg-amber-50/70 text-amber-950"
                      : "border-slate-100 bg-slate-50/70 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {pendente ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    ) : (
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>
                      {pendente
                        ? "Classificação pendente de revisão humana"
                        : "Base da classificação"}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    {coop.evidencias.slice(0, 2).join(" • ")}
                  </p>
                  {pendente && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      Confirme a atividade antes de abordar: pode haver divergência
                      entre o CNAE declarado e o segmento real da empresa.
                    </p>
                  )}
                </div>

                {/* Argumento de Venda Resumido */}
                <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-amber-900">
                    Por que oferecer o WiNS Hub Táxi:{" "}
                  </span>
                  {coop.argumentoChaveVenda}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {coop.modulosRecomendados.slice(0, 2).map((mod) => (
                    <span
                      key={mod}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {mod}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => abrirModal(coop)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  Ver Pitch & Abordar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtradas.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhuma organização encontrada com os filtros atuais
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Limpe o termo de busca ou selecione &ldquo;Todas&rdquo; nas categorias
            acima.
          </p>
        </div>
      )}

      {/* Modal de Dossiê Comercial SaaS e Pitch */}
      {selecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      ROTULOS_REVISAO[selecionada.statusRevisao].classes
                    }`}
                  >
                    {ROTULOS_REVISAO[selecionada.statusRevisao].icone}
                    {ROTULOS_REVISAO[selecionada.statusRevisao].rotulo}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    {selecionada.rotuloCategoria} • Fit SaaS{" "}
                    {selecionada.scorePotencialSaaS}/100
                  </span>
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                  {selecionada.nomeExibicao}
                </h2>
                <p className="text-xs text-slate-500">
                  CNPJ do estabelecimento ({selecionada.tipoEstabelecimento}):{" "}
                  <span className="font-mono">{selecionada.cnpj}</span> •{" "}
                  {selecionada.naturezaJuridica} • Capital social:{" "}
                  {selecionada.capitalSocialFormatado}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelecionada(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {selecionada.statusRevisao === "PENDENTE_REVISAO" && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    Revisão humana necessária
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Este registro entrou na lista por evidência parcial. Confirme a
                    operação de táxi antes de incluí-lo em campanhas, propostas ou
                    metas comerciais.
                  </p>
                </div>
              )}

              {/* Evidências e rastreabilidade */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Database className="h-3.5 w-3.5" />
                    Evidências da classificação
                  </h4>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                    Evidência {selecionada.nivelEvidencia === "FORTE" ? "forte" : "moderada"}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-slate-700">
                  {selecionada.evidencias.map((evidencia) => (
                    <li key={evidencia} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                      <span>{evidencia}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
                  Fonte: dados abertos do CNPJ da Receita Federal, consolidados por
                  raiz de CNPJ. CNAE declarado não comprova alvará ou condutax ativo
                  no DTP/PMSP.
                </p>
              </div>

              {/* Contato Consolidado do Grupo */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-slate-600">
                    Telefone Institucional Principal:
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <span>{selecionada.telefonePrincipal}</span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">
                    E-mail Institucional Principal:
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="break-all">{selecionada.emailPrincipal}</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-semibold text-slate-600">
                    Endereço completo:
                  </span>
                  <div className="mt-0.5 text-slate-800">
                    {selecionada.enderecoCompleto} — Bairro {selecionada.bairro} —
                    CEP {selecionada.cep} ({selecionada.municipio}/{selecionada.uf})
                  </div>
                </div>
              </div>

              {/* Diagnóstico de Dor e Solução */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-xs">
                  <h4 className="font-bold text-rose-900">
                    Dor Operacional da Organização
                  </h4>
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    {selecionada.dorOperacionalMapeada}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs">
                  <h4 className="font-bold text-emerald-900">
                    Proposta de Valor WiNS Hub Táxi
                  </h4>
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    {selecionada.argumentoChaveVenda}
                  </p>
                </div>
              </div>

              {/* Pitch Pronto para Copiar */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-300">
                    Script Comercial Personalizado (WhatsApp / E-mail / Ligação)
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarPitch(selecionada.pitchWhatsAppEmail)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-300 transition"
                  >
                    {copiadoPitch ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Pitch Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar Pitch
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2.5 text-xs text-slate-200 leading-relaxed">
                  {selecionada.pitchWhatsAppEmail}
                </p>
              </div>

              {/* Atalhos de Pesquisa de Decisores (Presidente / Diretor Comercial) */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `"${selecionada.razaoSocial}" OR "${selecionada.nomeExibicao}" presidente OR diretor taxi sao paulo`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buscar Diretoria / Site no Google
                </a>
                <a
                  href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
                    selecionada.nomeExibicao.split("(")[0].trim(),
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Pesquisar Decisores no LinkedIn
                </a>
              </div>

              {/* Atualização de Status CRM */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registrar Evolução no Funil Comercial SaaS
                </h4>
                {selecionada.atualizadoEm && (
                  <p className="text-[11px] text-slate-500">
                    Última atualização:{" "}
                    {new Date(selecionada.atualizadoEm).toLocaleString("pt-BR")}
                    {selecionada.atualizadoPor
                      ? ` • por ${selecionada.atualizadoPor}`
                      : ""}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Estágio da Abordagem
                    </label>
                    <select
                      value={statusModal}
                      onChange={(e) =>
                        setStatusModal(
                          e.target.value as StatusAbordagemCooperativa,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                    >
                      <option value="NAO_ABORDADA">Não abordada</option>
                      <option value="ABORDADA">Contato iniciado</option>
                      <option value="DEMONSTRACAO_AGENDADA">
                        Demonstração agendada
                      </option>
                      <option value="PROPOSTA_ENVIADA">
                        Proposta comercial enviada
                      </option>
                      <option value="CLIENTE_ATIVO">
                        Cliente WiNS Hub Ativo
                      </option>
                      <option value="DESCARTADA">Sem fit / Pausada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Anotações da Negociação (Presidente / Contato / Retorno)
                    </label>
                    <input
                      type="text"
                      value={notasModal}
                      maxLength={500}
                      onChange={(e) => setNotasModal(e.target.value)}
                      placeholder="Ex.: Falamos com Sr. Carlos, demo marcada para quinta às 14h"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
                {erroModal && (
                  <div className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{erroModal}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelecionada(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={salvarStatusModal}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {salvando ? "Salvando..." : "Salvar Status Comercial"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
