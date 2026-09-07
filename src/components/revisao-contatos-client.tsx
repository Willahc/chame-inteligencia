"use client";

import { useActionState, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  History,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import type {
  AcaoRevisaoContato,
  ContatoParaRevisao,
  ResumoContadoresRevisao,
  StatusDecisaoContato,
} from "@/domain/revisao-contatos/tipos";
import { processarDecisaoRevisao } from "@/app/revisao-contatos/actions";
import { rotuloConfianca } from "./rotulos";

interface RevisaoContatosClientProps {
  contatosIniciais: ContatoParaRevisao[];
  resumo: ResumoContadoresRevisao;
  modoDados: "MODO_REAL" | "MODO_DEMONSTRACAO";
}

export function RevisaoContatosClient({
  contatosIniciais,
  resumo,
  modoDados,
}: RevisaoContatosClientProps) {
  // Filtros
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusDecisaoContato | "TODOS">("TODOS");
  const [confiancaFiltro, setConfiancaFiltro] = useState<string>("TODAS");
  const [escopoFiltro, setEscopoFiltro] = useState<string>("TODOS");
  const [apenasPendentes, setApenasPendentes] = useState(false);

  // Estados dos Modais
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoParaRevisao | null>(null);
  const [modalAcao, setModalAcao] = useState<AcaoRevisaoContato | null>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);

  // Campos do formulário de decisão
  const [motivoDecisao, setMotivoDecisao] = useState("");
  const [observacaoDecisao, setObservacaoDecisao] = useState("");
  const [evidenciaUtilizada, setEvidenciaUtilizada] = useState("");
  const [usuarioRevisor, setUsuarioRevisor] = useState("analista-qualidade");

  // Campos de edição de classificação
  const [editPapel, setEditPapel] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editSenioridade, setEditSenioridade] = useState("");
  const [editJustificativa, setEditJustificativa] = useState("");

  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Action com feedback
  const [, formAction, processando] = useActionState(async (_: void, formData: FormData) => {
    setFeedback(null);
    try {
      await processarDecisaoRevisao(formData);
      setModalAcao(null);
      setModalEdicaoAberto(false);
      setContatoSelecionado(null);
      setMotivoDecisao("");
      setObservacaoDecisao("");
      setFeedback({
        tipo: "sucesso",
        texto: "Decisão de revisão registrada no histórico auditável com sucesso.",
      });
    } catch (err: unknown) {
      setFeedback({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao registrar decisão de revisão.",
      });
    }
  }, undefined);

  // Filtragem no cliente
  const contatosFiltrados = useMemo(() => {
    return contatosIniciais.filter((c) => {
      if (apenasPendentes) {
        if (c.statusDecisao !== "PENDENTE" && c.statusDecisao !== "REVISAR_NOVAMENTE") return false;
      } else if (statusFiltro !== "TODOS" && c.statusDecisao !== statusFiltro) {
        return false;
      }

      if (confiancaFiltro !== "TODAS" && c.confianca !== confiancaFiltro) {
        return false;
      }

      if (escopoFiltro !== "TODOS" && c.escopoContato !== escopoFiltro) {
        return false;
      }

      if (busca.trim()) {
        const termo = busca.trim().toLowerCase();
        const coincideNome = c.nome.toLowerCase().includes(termo);
        const coincideCargo = (c.cargo ?? "").toLowerCase().includes(termo);
        const coincideEmpresa = c.empresa.toLowerCase().includes(termo);
        const coincideArea = (c.area ?? "").toLowerCase().includes(termo);
        const coincidePapel = (c.papelComercial ?? "").toLowerCase().includes(termo);
        const coincideOrg = c.organizacaoOuInstituicaoNome.toLowerCase().includes(termo);
        if (
          !coincideNome &&
          !coincideCargo &&
          !coincideEmpresa &&
          !coincideArea &&
          !coincidePapel &&
          !coincideOrg
        ) {
          return false;
        }
      }

      return true;
    });
  }, [contatosIniciais, apenasPendentes, statusFiltro, confiancaFiltro, escopoFiltro, busca]);

  function abrirModalAcao(contato: ContatoParaRevisao, acao: AcaoRevisaoContato) {
    setContatoSelecionado(contato);
    setModalAcao(acao);
    setMotivoDecisao("");
    setObservacaoDecisao("");
    setEvidenciaUtilizada(contato.fonteUrl ?? contato.fonteNome);
  }

  function abrirModalEdicao(contato: ContatoParaRevisao) {
    setContatoSelecionado(contato);
    setEditPapel(contato.papelComercial ?? "INFERENCIA_COMERCIAL");
    setEditArea(contato.area ?? "");
    setEditSenioridade("");
    setEditJustificativa(contato.justificativa ?? "");
    setMotivoDecisao("Ajuste técnico de classificação profissional");
    setModalEdicaoAberto(true);
  }

  function abrirModalHistorico(contato: ContatoParaRevisao) {
    setContatoSelecionado(contato);
    setModalHistoricoAberto(true);
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-medium ${
            feedback.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {feedback.tipo === "sucesso" ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-red-600" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Cards de KPIs e Resumo dos Contadores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div
          onClick={() => {
            setStatusFiltro("TODOS");
            setApenasPendentes(false);
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFiltro === "TODOS" && !apenasPendentes
              ? "border-[var(--azul)] bg-blue-50/50 shadow-xs"
              : "border-[var(--borda)] bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-xs font-semibold text-[var(--texto-suave)] uppercase">Total no Modo</span>
          <p className="mt-1 text-2xl font-extrabold text-[var(--azul-profundo)]">{resumo.total}</p>
          <span className="text-[11px] text-[var(--texto-suave)]">
            {modoDados === "MODO_REAL" ? "109 fatos públicos" : "14 simulados"}
          </span>
        </div>

        <div
          onClick={() => {
            setApenasPendentes(true);
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            apenasPendentes
              ? "border-amber-400 bg-amber-50 shadow-xs"
              : "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
          }`}
        >
          <span className="text-xs font-semibold text-amber-800 uppercase">Pendentes de Revisão</span>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{resumo.pendentes + resumo.revisarNovamente}</p>
          <span className="text-[11px] text-amber-800 font-medium">Ação humana necessária</span>
        </div>

        <div
          onClick={() => {
            setStatusFiltro("APROVADO");
            setApenasPendentes(false);
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFiltro === "APROVADO" && !apenasPendentes
              ? "border-emerald-500 bg-emerald-50/60 shadow-xs"
              : "border-[var(--borda)] bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-xs font-semibold text-emerald-800 uppercase">Aprovados / Ativos</span>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{resumo.aprovados}</p>
          <span className="text-[11px] text-emerald-800 font-medium">Visíveis no comercial</span>
        </div>

        <div
          onClick={() => {
            setStatusFiltro("REJEITADO");
            setApenasPendentes(false);
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFiltro === "REJEITADO" && !apenasPendentes
              ? "border-red-400 bg-red-50 shadow-xs"
              : "border-[var(--borda)] bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-xs font-semibold text-red-800 uppercase">Rejeitados</span>
          <p className="mt-1 text-2xl font-extrabold text-red-700">{resumo.rejeitados}</p>
          <span className="text-[11px] text-red-700 font-medium">Fora do pipeline</span>
        </div>

        <div
          onClick={() => {
            setStatusFiltro("DESATIVADO");
            setApenasPendentes(false);
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFiltro === "DESATIVADO" && !apenasPendentes
              ? "border-slate-400 bg-slate-100 shadow-xs"
              : "border-[var(--borda)] bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-xs font-semibold text-slate-700 uppercase">Desativados</span>
          <p className="mt-1 text-2xl font-extrabold text-slate-700">{resumo.desativados}</p>
          <span className="text-[11px] text-slate-500 font-medium">Histórico mantido</span>
        </div>

        <div
          onClick={() => {
            setStatusFiltro("REVISAR_NOVAMENTE");
            setApenasPendentes(false);
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFiltro === "REVISAR_NOVAMENTE" && !apenasPendentes
              ? "border-violet-400 bg-violet-50 shadow-xs"
              : "border-[var(--borda)] bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-xs font-semibold text-violet-800 uppercase">Reabertos</span>
          <p className="mt-1 text-2xl font-extrabold text-violet-700">{resumo.revisarNovamente}</p>
          <span className="text-[11px] text-violet-700 font-medium">Rechecagem pedida</span>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <section aria-label="Filtros de contatos" className="painel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo, empresa, área ou organização..."
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white pl-10 pr-4 text-xs font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 cursor-pointer font-bold text-amber-900">
              <input
                type="checkbox"
                checked={apenasPendentes}
                onChange={(e) => setApenasPendentes(e.target.checked)}
                className="size-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span>Apenas pendentes ({resumo.pendentes + resumo.revisarNovamente})</span>
            </label>

            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value as StatusDecisaoContato | "TODOS");
                setApenasPendentes(false);
              }}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-white px-3 font-medium"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REJEITADO">Rejeitado</option>
              <option value="DESATIVADO">Desativado</option>
              <option value="REVISAR_NOVAMENTE">Revisar Novamente</option>
            </select>

            <select
              value={confiancaFiltro}
              onChange={(e) => setConfiancaFiltro(e.target.value)}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-white px-3 font-medium"
            >
              <option value="TODAS">Todas as Confianças</option>
              <option value="ALTA">Alta Confiança</option>
              <option value="MEDIA">Média Confiança</option>
              <option value="BAIXA">Baixa Confiança</option>
            </select>

            <select
              value={escopoFiltro}
              onChange={(e) => setEscopoFiltro(e.target.value)}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-white px-3 font-medium"
            >
              <option value="TODOS">Todos os Escopos</option>
              <option value="ORGANIZACAO">Escopo: Organização</option>
              <option value="INSTITUICAO">Escopo: Instituição</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-[var(--texto-suave)] border-t border-slate-100">
          <span>
            Exibindo <strong>{contatosFiltrados.length}</strong> de <strong>{contatosIniciais.length}</strong> contatos
            profissionais no ambiente atual.
          </span>
          <span className="flex items-center gap-1 font-medium text-indigo-700">
            <ShieldCheck size={14} /> Revisão humana mandatória antes de ativação no radar comercial
          </span>
        </div>
      </section>

      {/* Grade de Contatos */}
      {contatosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--borda)] p-12 text-center text-xs text-[var(--texto-suave)]">
          <Users className="mx-auto size-8 text-slate-300 mb-2" />
          <p className="font-semibold text-sm text-[var(--texto)]">Nenhum contato encontrado para os filtros selecionados.</p>
          <p className="mt-1">Tente ajustar a busca ou limpar os filtros de status e confiança.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {contatosFiltrados.map((contato) => (
            <article
              key={contato.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                contato.statusDecisao === "PENDENTE" || contato.statusDecisao === "REVISAR_NOVAMENTE"
                  ? "border-amber-300 bg-amber-50/10"
                  : contato.statusDecisao === "APROVADO"
                  ? "border-emerald-200"
                  : "border-slate-200 opacity-80"
              }`}
            >
              <div>
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--azul-profundo)]">{contato.nome}</h3>
                    <p className="text-xs font-semibold text-[var(--texto)] mt-0.5">
                      {contato.cargo ?? "Cargo corporativo comprovado"}
                    </p>
                    {contato.area && <p className="text-[11px] text-[var(--texto-suave)]">{contato.area}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <BadgeDecisao status={contato.statusDecisao} />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        contato.classificacaoCanonica === "DEMONSTRACAO"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-teal-50 text-teal-800 border-teal-200"
                      }`}
                    >
                      {contato.classificacaoCanonica === "DEMONSTRACAO" ? "DEMONSTRAÇÃO" : "Fato público"}
                    </span>
                  </div>
                </div>

                {/* Dados da Organização e Papel Comercial */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--texto-suave)]">Empresa:</span>
                    <strong className="text-[var(--texto)] truncate max-w-44 text-right">{contato.empresa}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--texto-suave)]">Escopo:</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {contato.escopoContato === "ORGANIZACAO" ? "Organização / Rede" : "Instituição Específica"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--texto-suave)]">Entidade:</span>
                    <span className="truncate max-w-44 text-right font-medium text-[var(--azul-profundo)]">
                      {contato.organizacaoOuInstituicaoNome}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--texto-suave)]">Papel Comercial:</span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      {contato.papelComercial ?? "INFERENCIA_COMERCIAL"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--texto-suave)]">Confiança:</span>
                    <span className="font-semibold text-slate-700">{rotuloConfianca[contato.confianca]}</span>
                  </div>
                </div>

                {/* Evidências e Fontes */}
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] space-y-1.5 border border-slate-100">
                  <p className="line-clamp-2">
                    <span className="font-semibold text-slate-700">Justificativa:</span>{" "}
                    {contato.justificativa ?? "Evidência verificada em diretório institucional público."}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-500">
                    <span className="truncate max-w-44">Fonte: {contato.fonteNome}</span>
                    <span>{new Date(contato.dataEvidencia).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {contato.fonteUrl && (
                    <a
                      href={contato.fonteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[var(--azul)] hover:underline pt-0.5"
                    >
                      Ver evidência pública <ExternalLink size={10} />
                    </a>
                  )}
                  {contato.linkedinUrl && (
                    <a
                      href={contato.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline pt-0.5 block"
                    >
                      Perfil público (LinkedIn) <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Barra de Ações Humanas de Revisão */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => abrirModalHistorico(contato)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-[var(--azul)]"
                >
                  <History size={12} />
                  <span>Histórico ({contato.historicoDecisoes.length})</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirModalEdicao(contato)}
                    title="Editar classificação técnica"
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Edit3 size={14} />
                  </button>

                  {contato.statusDecisao !== "APROVADO" && (
                    <button
                      type="button"
                      onClick={() => abrirModalAcao(contato, "APROVAR")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      <UserCheck size={12} />
                      <span>Aprovar</span>
                    </button>
                  )}

                  {contato.statusDecisao === "APROVADO" && (
                    <button
                      type="button"
                      onClick={() => abrirModalAcao(contato, "DESATIVAR")}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <UserX size={12} />
                      <span>Desativar</span>
                    </button>
                  )}

                  {contato.statusDecisao !== "REJEITADO" && contato.statusDecisao !== "APROVADO" && (
                    <button
                      type="button"
                      onClick={() => abrirModalAcao(contato, "REJEITAR")}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                    >
                      <UserX size={12} />
                      <span>Rejeitar</span>
                    </button>
                  )}

                  {contato.statusDecisao !== "REVISAR_NOVAMENTE" && (
                    <button
                      type="button"
                      onClick={() => abrirModalAcao(contato, "REVISAR_NOVAMENTE")}
                      title="Solicitar nova verificação"
                      className="rounded-lg p-1 text-violet-600 hover:bg-violet-50"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Ação de Decisão (Aprovar, Rejeitar, Desativar, Revisar Novamente) */}
      {modalAcao && contatoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[var(--azul)]" />
                <h3 className="text-base font-bold text-[var(--azul-profundo)]">
                  {modalAcao === "APROVAR" && "Aprovar e Ativar Contato"}
                  {modalAcao === "REJEITAR" && "Rejeitar Contato Profissional"}
                  {modalAcao === "DESATIVAR" && "Desativar Contato"}
                  {modalAcao === "REVISAR_NOVAMENTE" && "Solicitar Nova Verificação"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAcao(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="mt-4 space-y-4 text-xs">
              <input type="hidden" name="contatoId" value={contatoSelecionado.id} />
              <input type="hidden" name="acao" value={modalAcao} />

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                <p>
                  <strong>Profissional:</strong> {contatoSelecionado.nome} ({contatoSelecionado.cargo})
                </p>
                <p>
                  <strong>Empresa:</strong> {contatoSelecionado.empresa}
                </p>
                <p>
                  <strong>Fonte atual:</strong> {contatoSelecionado.fonteNome}
                </p>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Revisor Responsável *
                </label>
                <input
                  type="text"
                  name="usuario"
                  value={usuarioRevisor}
                  onChange={(e) => setUsuarioRevisor(e.target.value)}
                  required
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Motivo da Decisão *
                </label>
                <input
                  type="text"
                  name="motivo"
                  value={motivoDecisao}
                  onChange={(e) => setMotivoDecisao(e.target.value)}
                  required
                  placeholder="Ex.: Evidência confirmada em edital público / Cargo sem correlação comercial..."
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Evidência Utilizada (URL ou documento)
                </label>
                <input
                  type="text"
                  name="evidenciaUtilizada"
                  value={evidenciaUtilizada}
                  onChange={(e) => setEvidenciaUtilizada(e.target.value)}
                  placeholder="Ex.: https://... ou Diário Oficial de SP de 2026-09-07"
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Observação Técnica de Auditoria
                </label>
                <textarea
                  name="observacao"
                  rows={2}
                  value={observacaoDecisao}
                  onChange={(e) => setObservacaoDecisao(e.target.value)}
                  placeholder="Anotações adicionais para histórico imutável..."
                  className="w-full rounded-xl border border-[var(--borda)] bg-white p-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAcao(null)}
                  className="rounded-xl border border-[var(--borda)] px-4 py-2 text-xs font-semibold text-[var(--texto)] hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processando}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${
                    modalAcao === "APROVAR"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : modalAcao === "REJEITAR"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {processando ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Confirmar Decisão</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Classificação */}
      {modalEdicaoAberto && contatoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="size-5 text-[var(--azul)]" />
                <h3 className="text-base font-bold text-[var(--azul-profundo)]">
                  Corrigir Classificação Profissional
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicaoAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="mt-4 space-y-4 text-xs">
              <input type="hidden" name="contatoId" value={contatoSelecionado.id} />
              <input type="hidden" name="acao" value="CORRIGIR_CLASSIFICACAO" />
              <input type="hidden" name="usuario" value={usuarioRevisor} />
              <input type="hidden" name="motivo" value={motivoDecisao} />

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Papel Comercial (Inferência) *
                </label>
                <input
                  type="text"
                  name="papelComercial"
                  value={editPapel}
                  onChange={(e) => setEditPapel(e.target.value)}
                  required
                  placeholder="Ex.: Compras de Facilities / Gestão de Mobilidade..."
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Área Corporativa
                </label>
                <input
                  type="text"
                  name="area"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  placeholder="Ex.: Suprimentos e Contratos"
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Senioridade Inferida
                </label>
                <input
                  type="text"
                  name="senioridade"
                  value={editSenioridade}
                  onChange={(e) => setEditSenioridade(e.target.value)}
                  placeholder="Ex.: Gerência / Coordenação / Diretoria..."
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Justificativa Técnica
                </label>
                <textarea
                  name="justificativa"
                  rows={2}
                  value={editJustificativa}
                  onChange={(e) => setEditJustificativa(e.target.value)}
                  className="w-full rounded-xl border border-[var(--borda)] bg-white p-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEdicaoAberto(false)}
                  className="rounded-xl border border-[var(--borda)] px-4 py-2 text-xs font-semibold text-[var(--texto)] hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processando}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {processando ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico Imutável de Auditoria */}
      {modalHistoricoAberto && contatoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <History className="size-5 text-[var(--azul)]" />
                <h3 className="text-base font-bold text-[var(--azul-profundo)]">
                  Histórico Imutável de Decisões — {contatoSelecionado.nome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
              {contatoSelecionado.historicoDecisoes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p>Nenhuma decisão manual registrada no histórico deste contato ainda.</p>
                  <p className="mt-1 text-[11px]">
                    O contato foi consolidado na carga canônica inicial com status APROVADO.
                  </p>
                </div>
              ) : (
                contatoSelecionado.historicoDecisoes.map((h) => (
                  <div key={h.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
                          {h.acao}
                        </span>
                        <BadgeDecisao status={h.statusNovo} />
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(h.dataHora).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(h.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-[var(--texto)]">
                      <strong className="text-slate-700">Revisor:</strong> {h.usuario}
                    </p>

                    {h.motivo && (
                      <p className="text-slate-700">
                        <strong>Motivo:</strong> {h.motivo}
                      </p>
                    )}

                    {h.evidenciaUtilizada && (
                      <p className="text-slate-500 text-[11px]">
                        <strong>Evidência utilizada:</strong> {h.evidenciaUtilizada}
                      </p>
                    )}

                    {h.observacao && (
                      <p className="text-slate-600 text-[11px] italic">
                        <strong>Observação:</strong> {h.observacao}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-[var(--borda)] flex justify-end">
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                className="rounded-xl border border-[var(--borda)] px-4 py-2 text-xs font-semibold text-[var(--texto)] hover:bg-slate-50"
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

function BadgeDecisao({ status }: { status: StatusDecisaoContato }) {
  switch (status) {
    case "APROVADO":
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
          Aprovado
        </span>
      );
    case "PENDENTE":
      return (
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
          Pendente
        </span>
      );
    case "REJEITADO":
      return (
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800 border border-red-200">
          Rejeitado
        </span>
      );
    case "DESATIVADO":
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
          Desativado
        </span>
      );
    case "REVISAR_NOVAMENTE":
      return (
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-800 border border-violet-200">
          Revisar Novamente
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          {status}
        </span>
      );
  }
}
