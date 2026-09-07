"use client";

import { useActionState, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  History,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  CanalAcaoComercial,
  PreviaAcaoComercial,
  ResumoContadoresAutomacao,
  StatusAcaoComercial,
} from "@/domain/automacao-comercial/tipos";
import {
  AVISO_CANAL_PLANEJADO,
  AVISO_SIMULACAO_CONTROLADA,
  ROTULOS_CANAIS_ACAO,
  ROTULOS_STATUS_ACAO,
  TIPOS_ACOES_PREDEFINIDAS,
} from "@/domain/automacao-comercial/tipos";
import {
  criarRascunhoAction,
  submeterRevisaoAction,
  aprovarSimulacaoAction,
  executarSimulacaoAction,
  cancelarAcaoAction,
  bloquearAcaoAction,
  obterPreviaAction,
  obterHistoricoAction,
} from "@/app/planejamento-comercial/actions";
import Link from "next/link";

export interface AcaoPlanejadaLinha {
  id: string;
  contaComercialId: string;
  contatoProfissionalId: string | null;
  tipoAcao: string;
  canal: CanalAcaoComercial;
  objetivo: string;
  mensagemRascunho: string;
  status: StatusAcaoComercial;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  justificativa: string | null;
  tipoDado: string;
  statusRevisao: string;
  contaComercial: {
    id: string;
    nome: string;
    cidades: string;
    faixaPrioridadeComercial: string;
    indicePrioridadeComercial: number;
    natureza: string;
  };
  contatoProfissional: {
    id: string;
    nome: string;
    cargo: string | null;
    area: string | null;
    empresa: string;
    emailCorporativo: string | null;
    telefoneProfissional: string | null;
    telefoneDepartamental: string | null;
    linkedinUrl: string | null;
    paginaProfissionalUrl: string | null;
    confianca: string;
    papelComercial: string | null;
    tipoPapelComercial: string;
    statusDecisao: string;
    fonte: { nome: string; url: string | null } | null;
  } | null;
  ultimoHistorico?: {
    acao: string;
    usuario: string;
    dataHora: string;
    justificativa: string;
  } | null;
}

export interface ContaItemDropdown {
  id: string;
  nome: string;
  cidades: string;
  faixaPrioridade: string;
  indicePrioridade: number;
  grupoEconomicoId: string | null;
  instituicoesIds: string[];
}

export interface ContatoItemDropdown {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  empresa: string;
  emailCorporativo: string | null;
  telefoneProfissional: string | null;
  telefoneDepartamental: string | null;
  linkedinUrl: string | null;
  paginaProfissionalUrl: string | null;
  confianca: string;
  papelComercial: string | null;
  tipoPapelComercial: string;
  statusDecisao: string;
  grupoEconomicoId: string | null;
  instituicaoId: string | null;
  fonteNome: string;
  fonteUrl: string | null;
}

export interface EventoHistoricoLinha {
  id?: string;
  acao: string;
  usuario: string;
  dataHora: string | Date;
  statusAnterior?: string | null;
  novoStatus: string;
  justificativa: string;
  observacao?: string | null;
}

export interface ReciboSimulacao {
  acaoId: string;
  contaAlvo: string;
  contatoAlvo: string;
  canal: CanalAcaoComercial;
  executadoPor: string;
  disparoExternoRealizado: boolean;
  statusFinal: string;
}

interface PlanejamentoComercialClientProps {
  acoesIniciais: AcaoPlanejadaLinha[];
  resumo: ResumoContadoresAutomacao;
  contasDropdown: ContaItemDropdown[];
  contatosDropdown: ContatoItemDropdown[];
  modoDados: "MODO_REAL" | "MODO_DEMONSTRACAO";
}

export function PlanejamentoComercialClient({
  acoesIniciais,
  resumo,
  contasDropdown,
  contatosDropdown,
  modoDados,
}: PlanejamentoComercialClientProps) {
  // Filtros
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusAcaoComercial | "TODOS">("TODOS");
  const [canalFiltro, setCanalFiltro] = useState<CanalAcaoComercial | "TODOS">("TODOS");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("TODAS");

  // Modais de Criação e Ação
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalPreviaAberto, setModalPreviaAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [modalAprovacaoAberto, setModalAprovacaoAberto] = useState(false);
  const [modalSimulacaoAberto, setModalSimulacaoAberto] = useState(false);
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);

  // Ação em foco
  const [acaoFoco, setAcaoFoco] = useState<AcaoPlanejadaLinha | null>(null);
  const [previaCarregada, setPreviaCarregada] = useState<PreviaAcaoComercial | null>(null);
  const [historicoCarregado, setHistoricoCarregado] = useState<EventoHistoricoLinha[]>([]);
  const [carregandoModal, setCarregandoModal] = useState(false);

  // Formulário de Nova Ação
  const [novaContaId, setNovaContaId] = useState("");
  const [novoContatoId, setNovoContatoId] = useState("");
  const [novoTipoAcao, setNovoTipoAcao] = useState("APRESENTACAO_INSTITUCIONAL");
  const [novoCanal, setNovoCanal] = useState<CanalAcaoComercial>("EMAIL");
  const [novoObjetivo, setNovoObjetivo] = useState(
    "Apresentar soluções integradas de transporte corporativo para o corpo clínico e administrativo."
  );
  const [novaMensagem, setNovaMensagem] = useState(
    "Olá,\n\nIdentificamos que sua instituição possui alta demanda de mobilidade e logística médica. Gostaríamos de agendar uma breve conversa para apresentar nossa proposta corporativa com faturamento quinzenal e gestão em tempo real.\n\nAtenciosamente,\nEquipe Comercial Chame Táxi"
  );
  const [novoCriadoPor, setNovoCriadoPor] = useState("analista-comercial");
  const [novaJustificativa, setNovaJustificativa] = useState(
    "Instituição elegível mapeada no radar com alta relevância para mobilidade corporativa."
  );

  // Campos de modais de transição
  const [usuarioOperacao, setUsuarioOperacao] = useState("gestor-comercial");
  const [justificativaOperacao, setJustificativaOperacao] = useState("");
  const [resultadoSimulacao, setResultadoSimulacao] = useState<ReciboSimulacao | null>(null);

  // Feedback geral
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Server Action wrappers
  const [, formCriarAction, criandoAcao] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      await criarRascunhoAction(formData);
      setModalNovoAberto(false);
      setFeedback({
        tipo: "sucesso",
        texto: "Planejamento comercial criado em rascunho com sucesso.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao criar rascunho de ação comercial.",
      });
    }
  }, undefined);

  const [, formSubmeterAction, submetendo] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      await submeterRevisaoAction(formData);
      setFeedback({
        tipo: "sucesso",
        texto: "Ação submetida à revisão humana com sucesso.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao submeter para revisão.",
      });
    }
  }, undefined);

  const [, formAprovarAction, aprovando] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      await aprovarSimulacaoAction(formData);
      setModalAprovacaoAberto(false);
      setFeedback({
        tipo: "sucesso",
        texto: "Ação aprovada formalmente para simulação em ambiente controlado.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao aprovar ação para simulação.",
      });
    }
  }, undefined);

  const [, formSimularAction, simulando] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      const res = await executarSimulacaoAction(formData);
      setResultadoSimulacao(res);
      setFeedback({
        tipo: "sucesso",
        texto: "Simulação executada com sucesso em ambiente de testes. Nenhuma mensagem externa foi disparada.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao executar simulação.",
      });
    }
  }, undefined);

  const [, formCancelarAction, cancelando] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      await cancelarAcaoAction(formData);
      setModalCancelamentoAberto(false);
      setFeedback({
        tipo: "sucesso",
        texto: "Ação comercial cancelada com sucesso.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao cancelar ação comercial.",
      });
    }
  }, undefined);

  const [, formBloquearAction, bloqueando] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      await bloquearAcaoAction(formData);
      setModalBloqueioAberto(false);
      setFeedback({
        tipo: "sucesso",
        texto: "Ação comercial bloqueada por governança com sucesso.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao bloquear ação comercial.",
      });
    }
  }, undefined);

  // Filtragem de contatos elegíveis para a conta selecionada no modal novo
  const contatosDaContaSelecionada = useMemo(() => {
    if (!novaContaId) return [];
    const conta = contasDropdown.find((c) => c.id === novaContaId);
    if (!conta) return [];

    return contatosDropdown.filter((ct) => {
      if (conta.grupoEconomicoId && ct.grupoEconomicoId === conta.grupoEconomicoId) {
        return true;
      }
      if (ct.instituicaoId && conta.instituicoesIds.includes(ct.instituicaoId)) {
        return true;
      }
      return false;
    });
  }, [novaContaId, contasDropdown, contatosDropdown]);

  // Filtragem no cliente para tabela
  const acoesFiltradas = useMemo(() => {
    return acoesIniciais.filter((a) => {
      if (statusFiltro !== "TODOS" && a.status !== statusFiltro) {
        return false;
      }
      if (canalFiltro !== "TODOS" && a.canal !== canalFiltro) {
        return false;
      }
      if (
        prioridadeFiltro !== "TODAS" &&
        a.contaComercial.faixaPrioridadeComercial !== prioridadeFiltro
      ) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const contaNome = a.contaComercial.nome.toLowerCase();
        const contatoNome = a.contatoProfissional?.nome.toLowerCase() || "";
        const obj = a.objetivo.toLowerCase();
        if (!contaNome.includes(termo) && !contatoNome.includes(termo) && !obj.includes(termo)) {
          return false;
        }
      }
      return true;
    });
  }, [acoesIniciais, statusFiltro, canalFiltro, prioridadeFiltro, busca]);

  // Abrir modal de prévia
  async function abrirPrevia(acao: AcaoPlanejadaLinha) {
    setAcaoFoco(acao);
    setCarregandoModal(true);
    setModalPreviaAberto(true);
    try {
      const p = await obterPreviaAction(acao.id);
      setPreviaCarregada(p);
    } catch {
      setPreviaCarregada(null);
    } finally {
      setCarregandoModal(false);
    }
  }

  // Abrir modal de histórico
  async function abrirHistorico(acao: AcaoPlanejadaLinha) {
    setAcaoFoco(acao);
    setCarregandoModal(true);
    setModalHistoricoAberto(true);
    try {
      const h = await obterHistoricoAction(acao.id);
      setHistoricoCarregado(h);
    } catch {
      setHistoricoCarregado([]);
    } finally {
      setCarregandoModal(false);
    }
  }

  function getCanalIcon(canal: CanalAcaoComercial) {
    switch (canal) {
      case "EMAIL":
        return <Mail size={14} className="text-sky-400" />;
      case "TELEFONE":
        return <Phone size={14} className="text-emerald-400" />;
      case "WHATSAPP":
        return <MessageSquare size={14} className="text-green-400" />;
      case "LINKEDIN":
        return <ExternalLink size={14} className="text-blue-400" />;
      default:
        return <Send size={14} className="text-slate-400" />;
    }
  }

  function getStatusBadge(status: StatusAcaoComercial) {
    switch (status) {
      case "RASCUNHO":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-500/20">
            <Clock size={11} /> {ROTULOS_STATUS_ACAO.RASCUNHO}
          </span>
        );
      case "AGUARDANDO_REVISAO":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/20">
            <Clock size={11} /> {ROTULOS_STATUS_ACAO.AGUARDANDO_REVISAO}
          </span>
        );
      case "APROVADA_PARA_SIMULACAO":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/20">
            <CheckCircle2 size={11} /> {ROTULOS_STATUS_ACAO.APROVADA_PARA_SIMULACAO}
          </span>
        );
      case "SIMULADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20">
            <Play size={11} /> {ROTULOS_STATUS_ACAO.SIMULADA}
          </span>
        );
      case "CANCELADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-500/20">
            <X size={11} /> {ROTULOS_STATUS_ACAO.CANCELADA}
          </span>
        );
      case "BLOQUEADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/20">
            <Ban size={11} /> {ROTULOS_STATUS_ACAO.BLOQUEADA}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de Governança Gate 8 */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              GATE 8 — Automação Comercial Controlada (Modo Preparação e Simulação)
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Este ambiente é restrito ao <strong>planejamento, simulação sandbox e aprovação humana</strong>.
              Nenhuma mensagem real, disparo de e-mail, chamada telefônica, mensagem de WhatsApp ou requisição a
              CRMs ou APIs de redes sociais é transmitida. O estado canônico do sistema e o banco de dados
              permanecem 100% preservados e rastreáveis.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            feedback.tipo === "sucesso"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
              : "border-red-500/30 bg-red-950/20 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipo === "sucesso" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.texto}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Cabeçalho da Página e Botão de Novo Planejamento */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarClock className="size-6 text-[var(--ciano)]" />
            Planejamento Comercial
          </h1>
          <p className="text-sm text-slate-400">
            Estruturação de abordagens B2B com prévia auditada e simulação assistida
            {modoDados === "MODO_DEMONSTRACAO" && (
              <span className="ml-2 inline-flex items-center rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                MODO DEMONSTRAÇÃO
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            setNovaContaId(contasDropdown[0]?.id || "");
            setModalNovoAberto(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--ciano)] px-4 py-2.5 text-sm font-semibold text-[var(--azul-profundo)] shadow-sm hover:brightness-110 transition"
        >
          <Plus size={16} />
          Novo Planejamento de Ação
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Total de Ações</p>
          <p className="mt-1 text-2xl font-bold text-white">{resumo.total}</p>
        </div>

        <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Rascunhos</p>
          <p className="mt-1 text-2xl font-bold text-slate-300">{resumo.rascunhos}</p>
        </div>

        <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Aguardando Revisão</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{resumo.aguardandoRevisao}</p>
        </div>

        <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Aprovadas p/ Simulação</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">{resumo.aprovadasParaSimulacao}</p>
        </div>

        <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Simuladas (Sandbox)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{resumo.simuladas}</p>
        </div>

        <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Canceladas / Bloqueadas</p>
          <p className="mt-1 text-2xl font-bold text-rose-400">
            {resumo.canceladas + resumo.bloqueadas}
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por conta comercial, contato ou objetivo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-[var(--borda)] bg-black/20 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-[var(--ciano)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusAcaoComercial | "TODOS")}
            className="rounded-lg border border-[var(--borda)] bg-black/20 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="AGUARDANDO_REVISAO">Aguardando Revisão</option>
            <option value="APROVADA_PARA_SIMULACAO">Aprovada para Simulação</option>
            <option value="SIMULADA">Simulada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="BLOQUEADA">Bloqueada</option>
          </select>

          <select
            value={canalFiltro}
            onChange={(e) => setCanalFiltro(e.target.value as CanalAcaoComercial | "TODOS")}
            className="rounded-lg border border-[var(--borda)] bg-black/20 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
          >
            <option value="TODOS">Todos os Canais</option>
            <option value="EMAIL">E-mail Corporativo</option>
            <option value="TELEFONE">Telefone Corporativo</option>
            <option value="WHATSAPP">WhatsApp Comercial</option>
            <option value="LINKEDIN">LinkedIn Profissional</option>
            <option value="OUTRO">Outro Canal</option>
          </select>

          <select
            value={prioridadeFiltro}
            onChange={(e) => setPrioridadeFiltro(e.target.value)}
            className="rounded-lg border border-[var(--borda)] bg-black/20 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
          >
            <option value="TODAS">Todas as Prioridades</option>
            <option value="ALTA">Prioridade Alta</option>
            <option value="MEDIA">Prioridade Média</option>
            <option value="BAIXA">Prioridade Baixa</option>
          </select>
        </div>
      </div>

      {/* Tabela de Ações Comerciais Planejadas */}
      <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-[var(--borda)] bg-black/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Conta Comercial</th>
                <th className="px-4 py-3">Contato Alvo</th>
                <th className="px-4 py-3">Canal Planejado</th>
                <th className="px-4 py-3">Objetivo da Ação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criação / Responsável</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--borda)]">
              {acoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhuma ação comercial planejada encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                acoesFiltradas.map((acao) => (
                  <tr key={acao.id} className="hover:bg-white/[0.02] transition">
                    {/* Conta Comercial */}
                    <td className="px-4 py-3">
                      <div>
                        <Link
                          href={`/contas/${acao.contaComercial.id}`}
                          className="font-medium text-white hover:text-[var(--ciano)] transition"
                        >
                          {acao.contaComercial.nome}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                              acao.contaComercial.faixaPrioridadeComercial === "ALTA"
                                ? "bg-red-500/20 text-red-300"
                                : acao.contaComercial.faixaPrioridadeComercial === "MEDIA"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            Prioridade {acao.contaComercial.faixaPrioridadeComercial} ({acao.contaComercial.indicePrioridadeComercial})
                          </span>
                          <span className="text-xs text-slate-500">
                            {acao.contaComercial.cidades}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contato Alvo */}
                    <td className="px-4 py-3">
                      {acao.contatoProfissional ? (
                        <div>
                          <p className="font-medium text-slate-200">
                            {acao.contatoProfissional.nome}
                          </p>
                          <p className="text-xs text-slate-400">
                            {acao.contatoProfissional.cargo || "Cargo não informado"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-500">
                              Inferência: {acao.contatoProfissional.papelComercial || "Contato Corporativo"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          Abordagem direta na conta
                        </span>
                      )}
                    </td>

                    {/* Canal Planejado */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getCanalIcon(acao.canal)}
                        <span className="text-xs font-medium text-slate-200">
                          {ROTULOS_CANAIS_ACAO[acao.canal]}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-400/80 mt-0.5">Sem envio externo</p>
                    </td>

                    {/* Objetivo */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-xs text-slate-300" title={acao.objetivo}>
                        {acao.objetivo}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">{getStatusBadge(acao.status)}</td>

                    {/* Criação / Responsável */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      <div>
                        <span>{new Date(acao.criadoEm).toLocaleDateString("pt-BR")}</span>
                        <p className="text-slate-500 text-[11px]">{acao.criadoPor}</p>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirPrevia(acao)}
                          title="Ver Prévia Completa"
                          className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => abrirHistorico(acao)}
                          title="Ver Histórico Auditável"
                          className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                        >
                          <History size={15} />
                        </button>

                        {acao.status === "RASCUNHO" && (
                          <form
                            action={async (formData) => {
                              formData.append("id", acao.id);
                              formData.append("usuario", "analista-comercial");
                              formData.append("justificativa", "Submissão para revisão humana formal.");
                              await formSubmeterAction(formData);
                            }}
                          >
                            <button
                              type="submit"
                              disabled={submetendo}
                              title="Submeter para Revisão"
                              className="rounded bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition disabled:opacity-50"
                            >
                              Submeter
                            </button>
                          </form>
                        )}

                        {acao.status === "AGUARDANDO_REVISAO" && (
                          <button
                            onClick={() => {
                              setAcaoFoco(acao);
                              setJustificativaOperacao("Aprovado após conferência documental de dados públicos.");
                              setModalAprovacaoAberto(true);
                            }}
                            title="Aprovar para Simulação"
                            className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition"
                          >
                            Aprovar
                          </button>
                        )}

                        {acao.status === "APROVADA_PARA_SIMULACAO" && (
                          <button
                            onClick={() => {
                              setAcaoFoco(acao);
                              setJustificativaOperacao("Execução de teste funcional controlado no sandbox.");
                              setResultadoSimulacao(null);
                              setModalSimulacaoAberto(true);
                            }}
                            title="Executar Simulação Controlada"
                            className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition flex items-center gap-1"
                          >
                            <Play size={12} /> Simular
                          </button>
                        )}

                        {acao.status !== "CANCELADA" && acao.status !== "BLOQUEADA" && (
                          <>
                            <button
                              onClick={() => {
                                setAcaoFoco(acao);
                                setJustificativaOperacao("");
                                setModalCancelamentoAberto(true);
                              }}
                              title="Cancelar Ação"
                              className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition"
                            >
                              <X size={15} />
                            </button>

                            <button
                              onClick={() => {
                                setAcaoFoco(acao);
                                setJustificativaOperacao("Bloqueio preventivo de conformidade de governança.");
                                setModalBloqueioAberto(true);
                              }}
                              title="Bloquear Ação por Governança"
                              className="rounded p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            >
                              <Ban size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Novo Planejamento de Ação Comercial */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-[var(--ciano)]" />
                <h2 className="text-lg font-bold text-white">Novo Planejamento de Ação Comercial</h2>
              </div>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aviso Obrigatório de Canal Planejado */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0 text-amber-400" />
                <span>
                  <strong>Regra de Salvaguarda:</strong> {AVISO_CANAL_PLANEJADO}
                </span>
              </div>
            </div>

            <form
              action={async (formData) => {
                await formCriarAction(formData);
              }}
              className="space-y-4"
            >
              {/* Seleção de Conta Comercial */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Conta Comercial Elegível *
                </label>
                <select
                  name="contaComercialId"
                  value={novaContaId}
                  onChange={(e) => {
                    setNovaContaId(e.target.value);
                    setNovoContatoId("");
                  }}
                  required
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                >
                  {contasDropdown.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — Prioridade {c.faixaPrioridade} ({c.cidades || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Contato Aprovado */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contato Profissional Aprovado (Revisão Humana)
                </label>
                <select
                  name="contatoProfissionalId"
                  value={novoContatoId}
                  onChange={(e) => setNovoContatoId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                >
                  <option value="">Nenhum contato direto (Abordagem institucional na conta)</option>
                  {contatosDaContaSelecionada.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.nome} — {ct.cargo || "Sem cargo"} ({ct.empresa}) [Fonte: {ct.fonteNome}]
                    </option>
                  ))}
                </select>
                {contatosDaContaSelecionada.length === 0 && novaContaId && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nenhum contato aprovado diretamente vinculado a esta conta no momento.
                  </p>
                )}
              </div>

              {/* Canal e Tipo de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Canal Planejado *
                  </label>
                  <select
                    name="canal"
                    value={novoCanal}
                    onChange={(e) => setNovoCanal(e.target.value as CanalAcaoComercial)}
                    required
                    className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                  >
                    <option value="EMAIL">E-mail Corporativo</option>
                    <option value="TELEFONE">Telefone Corporativo</option>
                    <option value="WHATSAPP">WhatsApp Comercial</option>
                    <option value="LINKEDIN">LinkedIn Profissional</option>
                    <option value="OUTRO">Outro Canal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Ação *
                  </label>
                  <select
                    name="tipoAcao"
                    value={novoTipoAcao}
                    onChange={(e) => setNovoTipoAcao(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                  >
                    {TIPOS_ACOES_PREDEFINIDAS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Objetivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Objetivo Comercial da Ação *
                </label>
                <input
                  type="text"
                  name="objetivo"
                  value={novoObjetivo}
                  onChange={(e) => setNovoObjetivo(e.target.value)}
                  required
                  placeholder="Ex: Apresentar proposta de convênio para transporte de equipes médicas..."
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              {/* Mensagem Rascunho */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mensagem Rascunho (Prévia Editável) *
                </label>
                <textarea
                  name="mensagemRascunho"
                  rows={4}
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Proibido incluir CPF, RG, telefone pessoal ou dados sensíveis de saúde.
                </p>
              </div>

              {/* Identificação do Usuário e Justificativa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Usuário Responsável *
                  </label>
                  <input
                    type="text"
                    name="criadoPor"
                    value={novoCriadoPor}
                    onChange={(e) => setNovoCriadoPor(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Justificativa Comercial Inicial
                  </label>
                  <input
                    type="text"
                    name="justificativaInicial"
                    value={novaJustificativa}
                    onChange={(e) => setNovaJustificativa(e.target.value)}
                    className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--borda)] pt-4">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criandoAcao}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--ciano)] px-4 py-2 text-sm font-semibold text-[var(--azul-profundo)] hover:brightness-110 disabled:opacity-50"
                >
                  {criandoAcao ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Salvar Rascunho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Prévia Completa da Ação */}
      {modalPreviaAberto && previaCarregada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="size-5 text-[var(--ciano)]" />
                <h2 className="text-lg font-bold text-white">Prévia da Ação Comercial</h2>
              </div>
              <button
                onClick={() => setModalPreviaAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Alerta de Simulação */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-xs text-cyan-200">
              <p className="font-semibold text-cyan-300">Aviso Canônico:</p>
              <p className="mt-0.5">{previaCarregada.acao.avisoCanalPlanejado}</p>
            </div>

            <div className="space-y-3 text-sm">
              {/* Conta */}
              <div className="rounded-lg border border-[var(--borda)] bg-black/20 p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conta Comercial Alvo
                </p>
                <p className="text-base font-bold text-white mt-1">
                  {previaCarregada.conta.nome}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                  <span>Prioridade: <strong>{previaCarregada.conta.faixaPrioridade} ({previaCarregada.conta.indicePrioridade})</strong></span>
                  <span>Cidades: {previaCarregada.conta.cidades}</span>
                  <span>Classificação: {previaCarregada.conta.tipoDado}</span>
                </div>
              </div>

              {/* Contato */}
              {previaCarregada.contato ? (
                <div className="rounded-lg border border-[var(--borda)] bg-black/20 p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Contato Profissional Vinculado
                  </p>
                  <p className="text-base font-bold text-white mt-1">
                    {previaCarregada.contato.nome}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400">Cargo:</span> {previaCarregada.contato.cargo || "N/A"}
                    </div>
                    <div>
                      <span className="text-slate-400">Área:</span> {previaCarregada.contato.area || "N/A"}
                    </div>
                    <div>
                      <span className="text-slate-400">Papel Inferido:</span>{" "}
                      <span className="font-semibold text-amber-300">{previaCarregada.contato.papelComercial || "N/A"} ({previaCarregada.contato.tipoPapelComercial})</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Confiança:</span> {previaCarregada.contato.confianca}
                    </div>
                    <div>
                      <span className="text-slate-400">Canal Destino:</span>{" "}
                      {previaCarregada.contato.canalAlvo || "N/A"}
                    </div>
                    <div>
                      <span className="text-slate-400">Fonte Pública:</span>{" "}
                      {previaCarregada.contato.fonte?.nome}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--borda)] bg-black/20 p-3 text-xs text-slate-400 italic">
                  Abordagem institucional na conta (sem contato pessoal individualizado).
                </div>
              )}

              {/* Detalhes da Ação */}
              <div className="rounded-lg border border-[var(--borda)] bg-black/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase">
                    Canal: {previaCarregada.acao.rotuloCanal}
                  </span>
                  <span className="text-xs font-semibold text-cyan-300">
                    Status: {previaCarregada.acao.rotuloStatus}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Objetivo:</p>
                  <p className="text-xs font-medium text-white">{previaCarregada.acao.objetivo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Mensagem Planejada:</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-black/40 p-3 font-mono text-xs text-slate-200 border border-white/10">
                    {previaCarregada.acao.mensagemRascunho}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--borda)] pt-3">
              <button
                onClick={() => setModalPreviaAberto(false)}
                className="rounded-lg bg-[var(--ciano)] px-4 py-2 text-sm font-semibold text-[var(--azul-profundo)]"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Aprovação Humana Formal */}
      {modalAprovacaoAberto && acaoFoco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Aprovação Humana para Simulação</h2>
              </div>
              <button
                onClick={() => setModalAprovacaoAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Você está aprovando formalmente a ação comercial planejada para a conta{" "}
              <strong className="text-white">{acaoFoco.contaComercial.nome}</strong>. Esta aprovação
              habilita a simulação controlada e é registrada de forma imutável na auditoria.
            </p>

            <form
              action={async (formData) => {
                formData.append("id", acaoFoco.id);
                await formAprovarAction(formData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuário Aprovador *
                </label>
                <input
                  type="text"
                  name="usuarioAprovador"
                  value={usuarioOperacao}
                  onChange={(e) => setUsuarioOperacao(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Justificativa Formal *
                </label>
                <textarea
                  name="justificativa"
                  rows={3}
                  value={justificativaOperacao}
                  onChange={(e) => setJustificativaOperacao(e.target.value)}
                  required
                  placeholder="Informe a justificativa formal para aprovação..."
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--borda)] pt-3">
                <button
                  type="button"
                  onClick={() => setModalAprovacaoAberto(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aprovando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-900 hover:brightness-110 disabled:opacity-50"
                >
                  {aprovando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirmar Aprovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Execução de Simulação Controlada */}
      {modalSimulacaoAberto && acaoFoco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <Play className="size-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Executar Simulação Controlada</h2>
              </div>
              <button
                onClick={() => {
                  setModalSimulacaoAberto(false);
                  setResultadoSimulacao(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aviso Obrigatório */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200">
              <p className="font-semibold text-emerald-300">Salvaguarda de Isolamento:</p>
              <p className="mt-0.5">{AVISO_SIMULACAO_CONTROLADA}</p>
            </div>

            {resultadoSimulacao ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 size={16} />
                    Recibo da Simulação Sandbox
                  </div>
                  <p><strong>Ação ID:</strong> {resultadoSimulacao.acaoId}</p>
                  <p><strong>Conta Alvo:</strong> {resultadoSimulacao.contaAlvo}</p>
                  <p><strong>Contato Alvo:</strong> {resultadoSimulacao.contatoAlvo}</p>
                  <p><strong>Canal Simulado:</strong> {ROTULOS_CANAIS_ACAO[resultadoSimulacao.canal as CanalAcaoComercial]}</p>
                  <p><strong>Executado por:</strong> {resultadoSimulacao.executadoPor}</p>
                  <p><strong>Disparo externo realizado:</strong> <span className="text-emerald-400 font-bold">NÃO (0 chamadas externas)</span></p>
                  <p><strong>Status Final:</strong> SIMULADA</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setModalSimulacaoAberto(false);
                      setResultadoSimulacao(null);
                    }}
                    className="rounded-lg bg-[var(--ciano)] px-4 py-2 text-sm font-semibold text-[var(--azul-profundo)]"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form
                action={async (formData) => {
                  formData.append("id", acaoFoco.id);
                  await formSimularAction(formData);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Operador da Simulação *
                  </label>
                  <input
                    type="text"
                    name="usuario"
                    value={usuarioOperacao}
                    onChange={(e) => setUsuarioOperacao(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Justificativa do Teste *
                  </label>
                  <input
                    type="text"
                    name="justificativa"
                    value={justificativaOperacao}
                    onChange={(e) => setJustificativaOperacao(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[var(--borda)] pt-3">
                  <button
                    type="button"
                    onClick={() => setModalSimulacaoAberto(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={simulando}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-900 hover:brightness-110 disabled:opacity-50"
                  >
                    {simulando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    Disparar Simulação Sandbox
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: Cancelamento de Ação */}
      {modalCancelamentoAberto && acaoFoco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <X className="size-5 text-red-400" />
                <h2 className="text-lg font-bold text-white">Cancelar Planejamento Comercial</h2>
              </div>
              <button
                onClick={() => setModalCancelamentoAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Informe a justificativa para o cancelamento desta ação. O registro permanecerá no
              histórico imutável de governança.
            </p>

            <form
              action={async (formData) => {
                formData.append("id", acaoFoco.id);
                await formCancelarAction(formData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuário *
                </label>
                <input
                  type="text"
                  name="usuario"
                  value={usuarioOperacao}
                  onChange={(e) => setUsuarioOperacao(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo / Justificativa do Cancelamento *
                </label>
                <textarea
                  name="justificativa"
                  rows={3}
                  value={justificativaOperacao}
                  onChange={(e) => setJustificativaOperacao(e.target.value)}
                  required
                  placeholder="Descreva o motivo do cancelamento..."
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--borda)] pt-3">
                <button
                  type="button"
                  onClick={() => setModalCancelamentoAberto(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={cancelando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {cancelando ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                  Confirmar Cancelamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Bloqueio de Ação por Governança */}
      {modalBloqueioAberto && acaoFoco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <Ban className="size-5 text-rose-400" />
                <h2 className="text-lg font-bold text-white">Bloquear Ação por Governança</h2>
              </div>
              <button
                onClick={() => setModalBloqueioAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              O bloqueio impede qualquer simulação desta ação caso haja revogação de conformidade, suspeita de inconsistência cadastral ou revisão de dados.
            </p>

            <form
              action={async (formData) => {
                formData.append("id", acaoFoco.id);
                await formBloquearAction(formData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuário *
                </label>
                <input
                  type="text"
                  name="usuario"
                  value={usuarioOperacao}
                  onChange={(e) => setUsuarioOperacao(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Justificativa do Bloqueio *
                </label>
                <textarea
                  name="justificativa"
                  rows={3}
                  value={justificativaOperacao}
                  onChange={(e) => setJustificativaOperacao(e.target.value)}
                  required
                  placeholder="Descreva a razão de governança ou compliance..."
                  className="w-full rounded-lg border border-[var(--borda)] bg-black/30 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--borda)] pt-3">
                <button
                  type="button"
                  onClick={() => setModalBloqueioAberto(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={bloqueando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {bloqueando ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: Histórico Auditável Imutável */}
      {modalHistoricoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--borda)] bg-[var(--azul-profundo)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <History className="size-5 text-[var(--ciano)]" />
                <h2 className="text-lg font-bold text-white">Histórico Auditável da Ação</h2>
              </div>
              <button
                onClick={() => setModalHistoricoAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {carregandoModal ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[var(--ciano)]" />
                Carregando registros de auditoria...
              </div>
            ) : historicoCarregado.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Nenhum registro histórico localizado para esta ação.
              </p>
            ) : (
              <div className="space-y-3">
                {historicoCarregado.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="rounded-lg border border-[var(--borda)] bg-black/20 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[var(--ciano)]" />
                        {h.acao}
                      </span>
                      <span className="text-slate-400">
                        {new Date(h.dataHora).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>Status: <strong className="text-cyan-300">{h.novoStatus}</strong></span>
                      {h.statusAnterior && <span>(Anterior: {h.statusAnterior})</span>}
                      <span>• Operador: <strong>{h.usuario}</strong></span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      <strong>Justificativa:</strong> {h.justificativa}
                    </p>
                    {h.observacao && (
                      <p className="text-slate-400 text-[11px]">
                        <strong>Observação:</strong> {h.observacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-[var(--borda)] pt-3">
              <button
                onClick={() => setModalHistoricoAberto(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
