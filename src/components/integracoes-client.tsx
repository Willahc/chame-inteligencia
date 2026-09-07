"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileText,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  PhoneCall,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  IntegracaoExterna,
  StatusEventoIntegracao,
  TipoIntegracaoExterna,
} from "@prisma/client";
import {
  AVISO_INTEGRACOES_SIMULACAO,
  ROTULOS_TIPO_INTEGRACAO,
  ROTULOS_AMBIENTE_INTEGRACAO,
  ROTULOS_STATUS_INTEGRACAO,
  ROTULOS_STATUS_EVENTO,
  type PreviaSimulacao,
  type ResumoContadoresIntegracoes,
  type RespostaSimuladaIntegracao,
} from "@/domain/integracoes/tipos";
import {
  gerarPreviaSimulacaoAction,
  executarSimulacaoAction,
  atualizarEventosAction,
} from "@/app/integracoes/actions";

export interface ContaDropdown {
  id: string;
  nome: string;
  tipoDado: string;
}

export interface ContatoDropdown {
  id: string;
  nome: string;
  cargo: string | null;
  emailCorporativo: string | null;
  telefoneProfissional: string | null;
  telefoneDepartamental: string | null;
  instituicaoId: string | null;
  grupoEconomicoId: string | null;
  tipoDado: string;
}

export interface AcaoDropdown {
  id: string;
  tipoAcao: string;
  canal: string;
  status: string;
  contaComercialId: string;
  contatoProfissionalId: string | null;
  mensagemRascunho: string;
}

export interface EventoLinha {
  id: string;
  integracaoId: string;
  contaComercialId: string | null;
  contatoProfissionalId: string | null;
  acaoComercialId: string | null;
  tipoEvento: string;
  status: StatusEventoIntegracao;
  payloadResumo: string;
  resultadoResumo: string;
  erro: string | null;
  usuarioSolicitante: string;
  justificativa: string;
  criadoEm: string | Date;
  integracao?: {
    tipo: TipoIntegracaoExterna;
    nome: string;
  } | null;
  contaComercial?: {
    id: string;
    nome: string;
    tipoDado: string;
  } | null;
  contatoProfissional?: {
    id: string;
    nome: string;
    cargo: string | null;
    tipoDado: string;
  } | null;
  acaoComercial?: {
    id: string;
    tipoAcao: string;
    canal: string;
    status: string;
  } | null;
}

interface IntegracoesClientProps {
  integracoesIniciais: IntegracaoExterna[];
  resumoInicial: ResumoContadoresIntegracoes;
  eventosIniciais: EventoLinha[];
  contas: ContaDropdown[];
  contatos: ContatoDropdown[];
  acoes: AcaoDropdown[];
}

export function IntegracoesClient({
  integracoesIniciais,
  resumoInicial,
  eventosIniciais,
  contas,
  contatos,
  acoes,
}: IntegracoesClientProps) {
  const [integracoes] = useState<IntegracaoExterna[]>(integracoesIniciais);
  const [resumo, setResumo] = useState<ResumoContadoresIntegracoes>(resumoInicial);
  const [eventos, setEventos] = useState<EventoLinha[]>(eventosIniciais);

  // Filtros da tabela de eventos
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [termoBusca, setTermoBusca] = useState<string>("");

  // Modais
  const [modalSimulacaoAberto, setModalSimulacaoAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoLinha | null>(null);

  // Estados do formulário de simulação
  const [stepSimulacao, setStepSimulacao] = useState<"FORM" | "PREVIEW" | "RESULTADO">("FORM");
  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Campos do formulário
  const [integracaoIdSel, setIntegracaoIdSel] = useState<string>(
    integracoesIniciais[0]?.id || ""
  );
  const [contaIdSel, setContaIdSel] = useState<string>(contas[0]?.id || "");
  const [contatoIdSel, setContatoIdSel] = useState<string>("");
  const [acaoIdSel, setAcaoIdSel] = useState<string>("");
  const [usuarioSolicitante, setUsuarioSolicitante] = useState<string>("analista-comercial");
  const [justificativa, setJustificativa] = useState<string>("Validação de integração controlada sandbox");
  const [finalidadeComercial, setFinalidadeComercial] = useState<string>(
    "Apresentação de proposta de mobilidade corporativa B2B"
  );

  // Parâmetros específicos
  const [crmEstagio, setCrmEstagio] = useState<"PROSPECCAO" | "QUALIFICACAO" | "CONTATO_INICIAL">("PROSPECCAO");
  const [crmValor, setCrmValor] = useState<string>("15000");
  const [emailAssunto, setEmailAssunto] = useState<string>("Apresentação Corporativa - Chame Táxi B2B");
  const [emailCorpo, setEmailCorpo] = useState<string>(
    "Prezada equipe de gestão, gostaríamos de apresentar nossa solução corporativa de transporte hospitalar com faturamento centralizado."
  );
  const [wppMensagem, setWppMensagem] = useState<string>(
    "Olá! Apresentamos o portal corporativo Chame Táxi para gestão de mobilidade e faturamento B2B."
  );
  const [discadorCampanha, setDiscadorCampanha] = useState<"SDR_HUMANO" | "PESQUISA_QUALIFICACAO">("SDR_HUMANO");
  const [discadorRoteiro, setDiscadorRoteiro] = useState<string>(
    "Alinhamento com gerência administrativa hospitalar sobre custos de transporte corporativo"
  );

  // Modos de simulação
  const [modoExecucao, setModoExecucao] = useState<"NORMAL" | "FALHA" | "TIMEOUT" | "CANCELAR">("NORMAL");

  // Dados da prévia gerada
  const [previa, setPrevia] = useState<PreviaSimulacao | null>(null);

  // Resultado da execução
  const [resultadoFinal, setResultadoFinal] = useState<{
    evento: EventoLinha;
    resposta: RespostaSimuladaIntegracao;
  } | null>(null);

  // Obter integração selecionada
  const integracaoAtual = useMemo(() => {
    return integracoes.find((i) => i.id === integracaoIdSel) || integracoes[0];
  }, [integracoes, integracaoIdSel]);

  // Contatos elegíveis filtrados pela conta selecionada
  const contatosFiltrados = useMemo(() => {
    if (!contaIdSel) return contatos;
    const conta = contas.find((c) => c.id === contaIdSel);
    if (!conta) return contatos;

    return contatos.filter((ct) => {
      // Isolamento canônico: Conta DEMO só vê contato DEMO; Conta REAL só vê contato REAL
      if (conta.tipoDado === "DEMONSTRACAO" && ct.tipoDado !== "DEMONSTRACAO") return false;
      if (conta.tipoDado !== "DEMONSTRACAO" && ct.tipoDado === "DEMONSTRACAO") return false;
      return true;
    });
  }, [contas, contatos, contaIdSel]);

  // Ações filtradas pela conta selecionada
  const acoesFiltradas = useMemo(() => {
    if (!contaIdSel) return acoes;
    return acoes.filter((a) => a.contaComercialId === contaIdSel);
  }, [acoes, contaIdSel]);

  // Filtragem dos eventos na tabela
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (filtroTipo !== "TODOS" && ev.integracao?.tipo !== filtroTipo) {
        return false;
      }
      if (filtroStatus !== "TODOS" && ev.status !== filtroStatus) {
        return false;
      }
      if (termoBusca.trim() !== "") {
        const termo = termoBusca.toLowerCase();
        const nomeConta = ev.contaComercial?.nome?.toLowerCase() || "";
        const nomeContato = ev.contatoProfissional?.nome?.toLowerCase() || "";
        const usuario = ev.usuarioSolicitante?.toLowerCase() || "";
        const just = ev.justificativa?.toLowerCase() || "";
        const tipoEv = ev.tipoEvento?.toLowerCase() || "";

        if (
          !nomeConta.includes(termo) &&
          !nomeContato.includes(termo) &&
          !usuario.includes(termo) &&
          !just.includes(termo) &&
          !tipoEv.includes(termo)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [eventos, filtroTipo, filtroStatus, termoBusca]);

  // Ação para recarregar eventos
  async function recarregarEventos() {
    setCarregandoAcao(true);
    const res = await atualizarEventosAction();
    if (res.sucesso) {
      setEventos(res.eventos);
      if (res.contadores) setResumo(res.contadores);
    }
    setCarregandoAcao(false);
  }

  // Abrir modal de teste para uma integração específica
  function abrirModalParaIntegracao(integId: string) {
    setIntegracaoIdSel(integId);
    setStepSimulacao("FORM");
    setErroForm(null);
    setPrevia(null);
    setResultadoFinal(null);
    setModalSimulacaoAberto(true);
  }

  // Avançar para a prévia do payload
  async function handleGerarPrevia() {
    setErroForm(null);
    setCarregandoAcao(true);

    const dadosEspecificos: Record<string, unknown> = {};
    if (integracaoAtual?.tipo === "CRM") {
      dadosEspecificos.estagioOportunidade = crmEstagio;
      dadosEspecificos.valorEstimado = parseFloat(crmValor) || 0;
    } else if (integracaoAtual?.tipo === "EMAIL") {
      dadosEspecificos.assunto = emailAssunto;
      dadosEspecificos.corpoMensagem = emailCorpo;
    } else if (integracaoAtual?.tipo === "WHATSAPP") {
      dadosEspecificos.mensagem = wppMensagem;
    } else if (integracaoAtual?.tipo === "DISCADOR") {
      dadosEspecificos.tipoCampanha = discadorCampanha;
      dadosEspecificos.roteiroSugestao = discadorRoteiro;
    }

    const res = await gerarPreviaSimulacaoAction({
      integracaoId: integracaoIdSel,
      contaComercialId: contaIdSel,
      contatoProfissionalId: contatoIdSel || undefined,
      acaoComercialId: acaoIdSel || undefined,
      usuarioSolicitante,
      justificativa,
      finalidadeComercial,
      confirmacaoHumana: true,
      dadosEspecificos,
    });

    setCarregandoAcao(false);

    if (!res.sucesso || !res.previa) {
      setErroForm(res.erro || "Falha ao gerar prévia da simulação.");
      return;
    }

    setPrevia(res.previa);
    setStepSimulacao("PREVIEW");
  }

  // Executar simulação formal com confirmação humana
  async function handleConfirmarExecucao() {
    if (!previa) return;
    setCarregandoAcao(true);
    setErroForm(null);

    const dadosEspecificos: Record<string, unknown> = {};
    if (integracaoAtual?.tipo === "CRM") {
      dadosEspecificos.estagioOportunidade = crmEstagio;
      dadosEspecificos.valorEstimado = parseFloat(crmValor) || 0;
    } else if (integracaoAtual?.tipo === "EMAIL") {
      dadosEspecificos.assunto = emailAssunto;
      dadosEspecificos.corpoMensagem = emailCorpo;
    } else if (integracaoAtual?.tipo === "WHATSAPP") {
      dadosEspecificos.mensagem = wppMensagem;
    } else if (integracaoAtual?.tipo === "DISCADOR") {
      dadosEspecificos.tipoCampanha = discadorCampanha;
      dadosEspecificos.roteiroSugestao = discadorRoteiro;
    }

    const res = await executarSimulacaoAction({
      integracaoId: integracaoIdSel,
      contaComercialId: contaIdSel,
      contatoProfissionalId: contatoIdSel || undefined,
      acaoComercialId: acaoIdSel || undefined,
      usuarioSolicitante,
      justificativa,
      finalidadeComercial,
      confirmacaoHumana: true,
      dadosEspecificos,
      simularFalha: modoExecucao === "FALHA",
      simularTimeout: modoExecucao === "TIMEOUT",
      cancelarAntesExecutar: modoExecucao === "CANCELAR",
    });

    setCarregandoAcao(false);

    if (!res.sucesso || !res.evento) {
      setErroForm(res.erro || "Falha na execução da simulação.");
      return;
    }

    setResultadoFinal({
      evento: res.evento,
      resposta: res.resposta,
    });
    setStepSimulacao("RESULTADO");
    await recarregarEventos();
  }

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10 space-y-6">
      {/* Alerta Permanente de Simulação Controlada */}
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
            <ShieldAlert size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold tracking-wide uppercase text-amber-300">
              Ambiente de Integração em Simulação Controlada (Gate 9)
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {AVISO_INTEGRACOES_SIMULACAO}
            </p>
            <p className="text-xs text-amber-200/80 pt-1">
              Todos os adaptadores desacoplados (CRM, E-mail, WhatsApp e Discador) operam exclusivamente com sandboxes locais imutáveis.
            </p>
          </div>
        </div>
      </div>

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--ciano)] text-[var(--azul-profundo)]">
              <Cpu size={22} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Governança de Integrações Externas
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Arquitetura desacoplada, simuladores locais com sandbox auditável e travas de segurança humana.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => abrirModalParaIntegracao(integracoes[0]?.id || "")}
            className="flex items-center gap-2 rounded-xl bg-[var(--ciano)] px-4 py-2.5 text-sm font-semibold text-[var(--azul-profundo)] shadow-sm hover:brightness-110 transition"
          >
            <Play size={16} />
            Testar Simulação Individual
          </button>
          <button
            onClick={recarregarEventos}
            disabled={carregandoAcao}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition disabled:opacity-50"
            title="Recarregar eventos"
          >
            <RefreshCw size={16} className={carregandoAcao ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Cartões de Métricas e KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-[var(--azul-profundo)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Layers size={14} className="text-[var(--ciano)]" />
            Conectores
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {resumo.totalIntegracoes}
          </div>
          <p className="mt-0.5 text-xs text-emerald-400">
            {resumo.integracoesAtivas} ativos em simulação
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--azul-profundo)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Clock size={14} className="text-sky-400" />
            Total Eventos
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {resumo.totalEventos}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">simulações registradas</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--azul-profundo)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Sucessos
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {resumo.sucessosSimulados}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">respostas válidas</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--azul-profundo)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <ShieldAlert size={14} className="text-rose-400" />
            Bloqueios
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {resumo.bloqueados}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">travas de segurança</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--azul-profundo)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <AlertTriangle size={14} className="text-amber-400" />
            Falhas
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {resumo.falhasSimuladas}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">falhas simuladas</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--azul-profundo)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Ban size={14} className="text-purple-400" />
            Cancelados
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400">
            {resumo.cancelados + resumo.timeoutsSimulados}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {resumo.timeoutsSimulados} timeouts / {resumo.cancelados} canc.
          </p>
        </div>
      </div>

      {/* Tabela de Conectores Cadastrados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu size={18} className="text-[var(--ciano)]" />
            Conectores e Adaptadores de Integração
          </h2>
          <span className="text-xs text-slate-400">
            {integracoes.length} conectores configurados
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--azul-profundo)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Conector</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Ambiente</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Configuração</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-normal">
                {integracoes.map((integ) => {
                  let Icone = Cpu;
                  if (integ.tipo === "CRM") Icone = Layers;
                  if (integ.tipo === "EMAIL") Icone = Mail;
                  if (integ.tipo === "WHATSAPP") Icone = MessageSquare;
                  if (integ.tipo === "DISCADOR") Icone = PhoneCall;

                  return (
                    <tr key={integ.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-[var(--ciano)]">
                            <Icone size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{integ.nome}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {integ.descricao || "Sem descrição"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-white/10">
                          {ROTULOS_TIPO_INTEGRACAO[integ.tipo] || integ.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/20">
                          <Lock size={12} />
                          {ROTULOS_AMBIENTE_INTEGRACAO[integ.ambiente] || integ.ambiente}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                            integ.status === "ATIVA"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {ROTULOS_STATUS_INTEGRACAO[integ.status] || integ.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">
                          {integ.configuracaoJson}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => abrirModalParaIntegracao(integ.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-[var(--ciano)] hover:text-[var(--azul-profundo)] px-3 py-1.5 text-xs font-semibold text-white transition"
                        >
                          <Play size={13} />
                          Simular
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Histórico e Auditoria de Eventos */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <FileText size={18} className="text-[var(--ciano)]" />
              Histórico de Eventos de Integração
            </h2>
            <p className="text-xs text-slate-400">
              Registro imutável de todas as chamadas simuladas e bloqueios de governança.
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar conta, usuário, justificativa..."
                className="rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-[var(--ciano)] focus:outline-none"
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS" className="bg-[var(--azul-profundo)]">Todos os Conectores</option>
              <option value="CRM" className="bg-[var(--azul-profundo)]">CRM</option>
              <option value="EMAIL" className="bg-[var(--azul-profundo)]">E-mail</option>
              <option value="WHATSAPP" className="bg-[var(--azul-profundo)]">WhatsApp</option>
              <option value="DISCADOR" className="bg-[var(--azul-profundo)]">Discador</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-[var(--ciano)] focus:outline-none"
            >
              <option value="TODOS" className="bg-[var(--azul-profundo)]">Todos os Status</option>
              <option value="SUCESSO_SIMULADO" className="bg-[var(--azul-profundo)]">Sucesso Simulado</option>
              <option value="BLOQUEADO" className="bg-[var(--azul-profundo)]">Bloqueado</option>
              <option value="FALHA_SIMULADA" className="bg-[var(--azul-profundo)]">Falha Simulada</option>
              <option value="TIMEOUT_SIMULADO" className="bg-[var(--azul-profundo)]">Timeout Simulado</option>
              <option value="CANCELADO" className="bg-[var(--azul-profundo)]">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Tabela de Eventos */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--azul-profundo)] shadow-sm">
          {eventosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock size={32} className="mx-auto mb-2 text-slate-500" />
              <p className="text-sm font-medium">Nenhum evento registrado com os filtros aplicados.</p>
              <p className="text-xs text-slate-500 mt-1">
                Execute uma simulação para visualizar o histórico de eventos imutáveis.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Data / Hora</th>
                    <th className="px-6 py-3.5">Conector</th>
                    <th className="px-6 py-3.5">Conta / Contato</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Operador & Justificativa</th>
                    <th className="px-6 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-normal">
                  {eventosFiltrados.map((ev) => {
                    let statusBadgeClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
                    if (ev.status === "SUCESSO_SIMULADO") {
                      statusBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    } else if (ev.status === "BLOQUEADO") {
                      statusBadgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    } else if (ev.status === "FALHA_SIMULADA") {
                      statusBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    } else if (ev.status === "TIMEOUT_SIMULADO") {
                      statusBadgeClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
                    } else if (ev.status === "CANCELADO") {
                      statusBadgeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                    }

                    const dataFormatada = new Date(ev.criadoEm).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    return (
                      <tr key={ev.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                          {dataFormatada}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-white">
                            {ROTULOS_TIPO_INTEGRACAO[ev.integracao?.tipo as TipoIntegracaoExterna] ||
                              ev.integracao?.tipo ||
                              "Integrador"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="font-medium text-white line-clamp-1">
                              {ev.contaComercial?.nome || "Conta não vinculada"}
                            </p>
                            {ev.contatoProfissional?.nome && (
                              <p className="text-xs text-slate-400 line-clamp-1">
                                {ev.contatoProfissional.nome} ({ev.contatoProfissional.cargo || "Responsável"})
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border ${statusBadgeClass}`}
                          >
                            {ROTULOS_STATUS_EVENTO[ev.status as StatusEventoIntegracao] || ev.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="text-xs font-semibold text-slate-300">
                              {ev.usuarioSolicitante}
                            </p>
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {ev.justificativa}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => setEventoSelecionado(ev)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition"
                          >
                            <Eye size={13} />
                            Ver Payload
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Simulação Individual */}
      {modalSimulacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--azul-profundo)] shadow-2xl">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-[var(--ciano)]" />
                <h3 className="font-bold text-white text-lg">
                  {stepSimulacao === "FORM" && "Configurar Simulação de Conector"}
                  {stepSimulacao === "PREVIEW" && "Prévia do Payload e Validação de Elegibilidade"}
                  {stepSimulacao === "RESULTADO" && "Resultado da Simulação Sandbox"}
                </h3>
              </div>
              <button
                onClick={() => setModalSimulacaoAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              {erroForm && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{erroForm}</span>
                </div>
              )}

              {/* STEP 1: FORMULÁRIO */}
              {stepSimulacao === "FORM" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Conector / Adaptador
                    </label>
                    <select
                      value={integracaoIdSel}
                      onChange={(e) => setIntegracaoIdSel(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                    >
                      {integracoes.map((i) => (
                        <option key={i.id} value={i.id} className="bg-[var(--azul-profundo)]">
                          {i.nome} ({ROTULOS_TIPO_INTEGRACAO[i.tipo]})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Conta Comercial Alvo *
                      </label>
                      <select
                        value={contaIdSel}
                        onChange={(e) => {
                          setContaIdSel(e.target.value);
                          setContatoIdSel("");
                          setAcaoIdSel("");
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                      >
                        {contas.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[var(--azul-profundo)]">
                            {c.nome} {c.tipoDado === "DEMONSTRACAO" ? "(DEMO)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Contato Profissional Aprovado (Gate 7)
                      </label>
                      <select
                        value={contatoIdSel}
                        onChange={(e) => setContatoIdSel(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                      >
                        <option value="" className="bg-[var(--azul-profundo)]">Sem contato direto (Apenas Conta)</option>
                        {contatosFiltrados.map((ct) => (
                          <option key={ct.id} value={ct.id} className="bg-[var(--azul-profundo)]">
                            {ct.nome} {ct.cargo ? `- ${ct.cargo}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {acoesFiltradas.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Ação Comercial Vinculada (Gate 8, Aprovada/Simulada)
                      </label>
                      <select
                        value={acaoIdSel}
                        onChange={(e) => setAcaoIdSel(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                      >
                        <option value="" className="bg-[var(--azul-profundo)]">Nenhuma ação vinculada</option>
                        {acoesFiltradas.map((a) => (
                          <option key={a.id} value={a.id} className="bg-[var(--azul-profundo)]">
                            {a.tipoAcao} ({a.canal}) - Status: {a.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Usuário Solicitante *
                      </label>
                      <input
                        type="text"
                        value={usuarioSolicitante}
                        onChange={(e) => setUsuarioSolicitante(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Finalidade Comercial (LGPD) *
                      </label>
                      <input
                        type="text"
                        value={finalidadeComercial}
                        onChange={(e) => setFinalidadeComercial(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Justificativa Formal do Operador *
                    </label>
                    <textarea
                      rows={2}
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--ciano)] focus:outline-none"
                    />
                  </div>

                  {/* Campos específicos por conector */}
                  {integracaoAtual?.tipo === "CRM" && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                      <p className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                        Parâmetros do CRM Sandbox
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Estágio Oportunidade</label>
                          <select
                            value={crmEstagio}
                            onChange={(e) =>
                              setCrmEstagio(
                                e.target.value as
                                  | "PROSPECCAO"
                                  | "QUALIFICACAO"
                                  | "CONTATO_INICIAL"
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="PROSPECCAO">Prospecção</option>
                            <option value="QUALIFICACAO">Qualificação</option>
                            <option value="CONTATO_INICIAL">Contato Inicial</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Valor Estimado (R$)</label>
                          <input
                            type="number"
                            value={crmValor}
                            onChange={(e) => setCrmValor(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {integracaoAtual?.tipo === "EMAIL" && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                      <p className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                        Parâmetros do E-mail Sandbox
                      </p>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Assunto do E-mail</label>
                        <input
                          type="text"
                          value={emailAssunto}
                          onChange={(e) => setEmailAssunto(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Corpo da Mensagem</label>
                        <textarea
                          rows={2}
                          value={emailCorpo}
                          onChange={(e) => setEmailCorpo(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {integracaoAtual?.tipo === "WHATSAPP" && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                      <p className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                        Parâmetros do WhatsApp Sandbox
                      </p>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Mensagem Comercial</label>
                        <textarea
                          rows={2}
                          value={wppMensagem}
                          onChange={(e) => setWppMensagem(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {integracaoAtual?.tipo === "DISCADOR" && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                      <p className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                        Parâmetros do Discador SIP Sandbox
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Tipo de Campanha</label>
                          <select
                            value={discadorCampanha}
                            onChange={(e) =>
                              setDiscadorCampanha(
                                e.target.value as
                                  | "SDR_HUMANO"
                                  | "PESQUISA_QUALIFICACAO"
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="SDR_HUMANO">SDR Humano</option>
                            <option value="PESQUISA_QUALIFICACAO">Pesquisa Qualificação</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Roteiro Sugestão</label>
                          <input
                            type="text"
                            value={discadorRoteiro}
                            onChange={(e) => setDiscadorRoteiro(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cenários de Teste de Resiliência */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Cenário de Teste no Sandbox
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setModoExecucao("NORMAL")}
                        className={`rounded-lg px-2.5 py-2 text-xs font-semibold border transition ${
                          modoExecucao === "NORMAL"
                            ? "bg-[var(--ciano)] text-[var(--azul-profundo)] border-[var(--ciano)]"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        Sucesso Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoExecucao("FALHA")}
                        className={`rounded-lg px-2.5 py-2 text-xs font-semibold border transition ${
                          modoExecucao === "FALHA"
                            ? "bg-amber-400 text-[var(--azul-profundo)] border-amber-400"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        Simular Falha
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoExecucao("TIMEOUT")}
                        className={`rounded-lg px-2.5 py-2 text-xs font-semibold border transition ${
                          modoExecucao === "TIMEOUT"
                            ? "bg-orange-400 text-[var(--azul-profundo)] border-orange-400"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        Simular Timeout
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoExecucao("CANCELAR")}
                        className={`rounded-lg px-2.5 py-2 text-xs font-semibold border transition ${
                          modoExecucao === "CANCELAR"
                            ? "bg-purple-400 text-[var(--azul-profundo)] border-purple-400"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        Cancelar Antes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PREVIEW E CONFIRMAÇÃO HUMANA */}
              {stepSimulacao === "PREVIEW" && previa && (
                <div className="space-y-4">
                  {/* Status de Elegibilidade */}
                  <div
                    className={`rounded-xl border p-4 ${
                      previa.elegivel
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {previa.elegivel ? (
                        <>
                          <ShieldCheck size={18} />
                          <span>Elegível para Simulação Sandbox</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={18} />
                          <span>Bloqueado por Regras de Governança</span>
                        </>
                      )}
                    </div>
                    {previa.erros.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-xs space-y-1">
                        {previa.erros.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Resumo dos Alvos */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-slate-400 uppercase font-semibold">Conta Alvo:</span>
                      <p className="font-bold text-white mt-0.5">{previa.conta.nome}</p>
                      <p className="text-slate-400">Tipo: {previa.conta.tipoDado}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-slate-400 uppercase font-semibold">Contato Alvo:</span>
                      <p className="font-bold text-white mt-0.5">
                        {previa.contato?.nome || "Sem contato direto"}
                      </p>
                      <p className="text-slate-400">
                        {previa.contato ? `Cargo: ${previa.contato.cargo || "Responsável"}` : "Geral da instituição"}
                      </p>
                    </div>
                  </div>

                  {/* Visualizador de Payload Sanitizado */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                        Payload Sanitizado (Sem Credenciais / LGPD Minimizada)
                      </span>
                      <span className="text-xs text-slate-400">JSON Seguro</span>
                    </div>
                    <pre className="text-xs text-slate-300 font-mono overflow-x-auto p-2 bg-black/30 rounded-lg max-h-48">
                      {JSON.stringify(previa.payloadSanitizado, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-white">Trava de Segurança Humana Obrigatória:</p>
                    <p>
                      A confirmação abaixo executará exclusivamente o simulador local. Nenhuma requisição externa ou chamada telefônica será realizada.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: RESULTADO DA SIMULAÇÃO */}
              {stepSimulacao === "RESULTADO" && resultadoFinal && (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border p-4 ${
                      resultadoFinal.resposta.sucesso
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {resultadoFinal.resposta.sucesso ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <AlertTriangle size={18} />
                      )}
                      <span>
                        {ROTULOS_STATUS_EVENTO[resultadoFinal.resposta.statusEvento as StatusEventoIntegracao] ||
                          resultadoFinal.resposta.statusEvento}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-200">
                      {resultadoFinal.resposta.mensagem}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-slate-400 font-semibold">ID Transação:</span>
                      <p className="font-mono text-white mt-0.5 break-all">
                        {resultadoFinal.resposta.transacaoId}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-slate-400 font-semibold">Tempo de Resposta:</span>
                      <p className="font-bold text-white mt-0.5">
                        {resultadoFinal.resposta.tempoRespostaMs} ms
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 font-semibold">Chamada Externa:</span>
                      <p className="font-bold text-emerald-400 mt-0.5">NÃO (Simulação Local)</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                    <span className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                      Detalhes da Resposta Simulada
                    </span>
                    <pre className="text-xs text-slate-300 font-mono overflow-x-auto p-2 bg-black/30 rounded-lg max-h-48">
                      {JSON.stringify(resultadoFinal.resposta.detalhesSimulacao, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-white/[0.02]">
              {stepSimulacao === "FORM" && (
                <>
                  <button
                    onClick={() => setModalSimulacaoAberto(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGerarPrevia}
                    disabled={carregandoAcao}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--ciano)] px-4 py-2 text-xs font-bold text-[var(--azul-profundo)] hover:brightness-110 transition disabled:opacity-50"
                  >
                    <Eye size={14} />
                    {carregandoAcao ? "Validando..." : "Gerar Prévia do Payload"}
                  </button>
                </>
              )}

              {stepSimulacao === "PREVIEW" && (
                <>
                  <button
                    onClick={() => setStepSimulacao("FORM")}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Voltar e Editar
                  </button>
                  <button
                    onClick={handleConfirmarExecucao}
                    disabled={carregandoAcao || !previa || !previa.elegivel}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-[var(--azul-profundo)] hover:brightness-110 transition disabled:opacity-50"
                  >
                    <Check size={14} />
                    {carregandoAcao ? "Executando..." : "Confirmar Simulação Sandbox"}
                  </button>
                </>
              )}

              {stepSimulacao === "RESULTADO" && (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setModalSimulacaoAberto(false)}
                    className="rounded-xl bg-[var(--ciano)] px-4 py-2 text-xs font-bold text-[var(--azul-profundo)] hover:brightness-110 transition"
                  >
                    Fechar e Atualizar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Evento do Histórico */}
      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--azul-profundo)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[var(--ciano)]" />
                <h3 className="font-bold text-white text-lg">Detalhes do Evento de Integração</h3>
              </div>
              <button
                onClick={() => setEventoSelecionado(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-slate-400 font-semibold">Tipo do Conector:</span>
                  <p className="font-bold text-white mt-0.5">
                    {ROTULOS_TIPO_INTEGRACAO[eventoSelecionado.integracao?.tipo as TipoIntegracaoExterna] ||
                      eventoSelecionado.integracao?.tipo}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-slate-400 font-semibold">Status do Evento:</span>
                  <p className="font-bold text-white mt-0.5">
                    {ROTULOS_STATUS_EVENTO[eventoSelecionado.status as StatusEventoIntegracao] ||
                      eventoSelecionado.status}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-slate-400 font-semibold">Conta Alvo:</span>
                  <p className="font-bold text-white mt-0.5">
                    {eventoSelecionado.contaComercial?.nome || "Não vinculada"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-slate-400 font-semibold">Contato Alvo:</span>
                  <p className="font-bold text-white mt-0.5">
                    {eventoSelecionado.contatoProfissional?.nome || "Sem contato direto"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-slate-400 font-semibold">Operador Solicitante:</span>
                  <p className="font-bold text-white mt-0.5">
                    {eventoSelecionado.usuarioSolicitante}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-slate-400 font-semibold">Data / Hora:</span>
                  <p className="font-bold text-white mt-0.5">
                    {new Date(eventoSelecionado.criadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                <span className="text-slate-400 font-semibold">Justificativa do Operador:</span>
                <p className="text-white mt-1">{eventoSelecionado.justificativa}</p>
              </div>

              {/* Payload Sanitizado */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                <span className="text-xs font-bold text-[var(--ciano)] uppercase tracking-wider">
                  Payload Sanitizado Armazenado
                </span>
                <pre className="text-xs text-slate-300 font-mono overflow-x-auto p-2 bg-black/30 rounded-lg max-h-40">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(eventoSelecionado.payloadResumo), null, 2);
                    } catch {
                      return eventoSelecionado.payloadResumo;
                    }
                  })()}
                </pre>
              </div>

              {/* Resultado Resumo */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Resposta do Simulador Sandbox
                </span>
                <pre className="text-xs text-slate-300 font-mono overflow-x-auto p-2 bg-black/30 rounded-lg max-h-40">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(eventoSelecionado.resultadoResumo), null, 2);
                    } catch {
                      return eventoSelecionado.resultadoResumo;
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 px-6 py-4 bg-white/[0.02]">
              <button
                onClick={() => setEventoSelecionado(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
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
