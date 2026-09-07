"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import type { SolicitacaoBuscaVisual, CandidatoResponsavel } from "@/domain/busca-responsaveis/tipos";
import {
  aprovarContatoAcao,
  desativarContatoAcao,
  executarBuscaResponsaveis,
} from "@/app/contas/[id]/actions";
import { rotuloConfianca } from "./rotulos";

interface SecaoBuscaResponsaveisProps {
  contaId: string;
  contaNome: string;
  tipoDadoConta: string;
  ultimaPesquisa: SolicitacaoBuscaVisual | null;
  historicoPesquisas: SolicitacaoBuscaVisual[];
}

export function SecaoBuscaResponsaveis({
  contaId,
  contaNome,
  tipoDadoConta,
  ultimaPesquisa,
  historicoPesquisas,
}: SecaoBuscaResponsaveisProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [usuarioSolicitante, setUsuarioSolicitante] = useState("analista-comercial");
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Formulário de busca
  const [, acaoBusca, buscando] = useActionState(async (_: void, formData: FormData) => {
    setMensagemStatus(null);
    try {
      await executarBuscaResponsaveis(formData);
      setModalAberto(false);
      setMensagemStatus({
        tipo: "sucesso",
        texto: "Busca supervisionada executada com sucesso e registrada no histórico de auditoria.",
      });
    } catch (err: unknown) {
      setMensagemStatus({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao executar busca supervisionada.",
      });
    }
  }, undefined);

  // Aprovação de contato
  const [, acaoAprovar, aprovando] = useActionState(async (_: void, formData: FormData) => {
    setMensagemStatus(null);
    try {
      await aprovarContatoAcao(formData);
      setMensagemStatus({
        tipo: "sucesso",
        texto: "Contato aprovado por revisão humana e ativado com sucesso.",
      });
    } catch (err: unknown) {
      setMensagemStatus({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao aprovar contato.",
      });
    }
  }, undefined);

  // Desativação de contato
  const [, acaoDesativar, desativando] = useActionState(async (_: void, formData: FormData) => {
    setMensagemStatus(null);
    try {
      await desativarContatoAcao(formData);
      setMensagemStatus({
        tipo: "sucesso",
        texto: "Contato desativado e removido da exibição ativa com registro de motivo.",
      });
    } catch (err: unknown) {
      setMensagemStatus({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao desativar contato.",
      });
    }
  }, undefined);

  return (
    <section
      aria-label="Busca supervisionada de responsáveis"
      className="painel mt-6 p-6 border-2 border-indigo-200 bg-gradient-to-b from-white to-indigo-50/20"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--borda)] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--azul-profundo)]">
                Busca Supervisionada de Responsáveis (Gate 6)
              </h2>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                Sob demanda
              </span>
              {tipoDadoConta === "DEMONSTRACAO" && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                  Modo Demonstração
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--texto-suave)]">
              Pesquisa auditável e controlada de decisores e lideranças corporativas em fontes públicas abertas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          disabled={buscando}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {buscando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Pesquisando em fontes públicas...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Buscar responsáveis</span>
            </>
          )}
        </button>
      </div>

      {/* Mensagem de Feedback */}
      {mensagemStatus && (
        <div
          className={`mt-4 flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-medium ${
            mensagemStatus.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {mensagemStatus.tipo === "sucesso" ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-600" />
          )}
          <span>{mensagemStatus.texto}</span>
        </div>
      )}

      {/* Estado da Última Pesquisa Realizada */}
      {ultimaPesquisa ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[var(--borda)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[var(--texto-suave)] uppercase tracking-wider">
                  Status da última pesquisa:
                </span>
                <BadgeStatusBusca status={ultimaPesquisa.status} />
                <span className="text-xs text-[var(--texto-suave)] flex items-center gap-1">
                  <Calendar size={13} />
                  {new Date(ultimaPesquisa.dataSolicitacao).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--texto-suave)]">Solicitante:</span>
                <strong className="text-[var(--azul-profundo)]">{ultimaPesquisa.usuarioSolicitante}</strong>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                  Confiança: {rotuloConfianca[ultimaPesquisa.confianca] ?? ultimaPesquisa.confianca}
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs space-y-2">
              <p className="text-sm font-medium text-[var(--texto)]">
                <strong>Resultado:</strong> {ultimaPesquisa.resultado}
              </p>
              {ultimaPesquisa.limitacoes && (
                <p className="text-[var(--texto-suave)] italic">
                  <strong>Limitações e ressalvas:</strong> {ultimaPesquisa.limitacoes}
                </p>
              )}
            </div>

            {/* Fontes e Termos */}
            <div className="mt-4 grid gap-3 pt-3 border-t border-slate-100 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Fontes consultadas:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[var(--texto-suave)]">
                  {ultimaPesquisa.fontesConsultadas.map((fonte, idx) => (
                    <li key={idx}>{fonte}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Termos utilizados:</span>
                <div className="flex flex-wrap gap-1">
                  {ultimaPesquisa.termosBusca.map((termo, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800"
                    >
                      {termo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Contatos Encontrados nesta Pesquisa */}
          {ultimaPesquisa.contatosEncontrados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                  Profissionais Identificados para Revisão Humana ({ultimaPesquisa.contatosEncontrados.length})
                </h3>
                <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  Revisão prévia obrigatória antes de ativar
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {ultimaPesquisa.contatosEncontrados.map((candidato, idx) => (
                  <CardCandidatoResponsavel
                    key={candidato.id ?? idx}
                    candidato={candidato}
                    contaId={contaId}
                    acaoAprovar={acaoAprovar}
                    aprovando={aprovando}
                    acaoDesativar={acaoDesativar}
                    desativando={desativando}
                  />
                ))}
              </div>
            </div>
          )}

          {ultimaPesquisa.status === "SEM_CONTATO_VERIFICAVEL" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 flex items-start gap-3">
              <Search className="size-5 shrink-0 text-slate-500 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Nenhum responsável corporativo verificável nesta conta.</p>
                <p className="mt-1 leading-relaxed text-[var(--texto-suave)]">
                  Em estrita conformidade com as regras de não-fabricação, o sistema não inventa nomes, não infere e-mails
                  por regras genéricas e não atribui responsabilidade de compras a equipes assistenciais ou clínicas.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--borda)] p-6 text-center text-xs text-[var(--texto-suave)]">
          <Bot size={28} className="mx-auto mb-2 text-indigo-400" />
          <p className="font-medium text-[var(--texto)]">Nenhuma busca de responsáveis solicitada para esta conta.</p>
          <p className="mt-1">
            Clique no botão <strong>Buscar responsáveis</strong> acima para iniciar uma pesquisa auditável em fontes públicas abertas.
          </p>
        </div>
      )}

      {/* Histórico de Solicitações Anteriores */}
      {historicoPesquisas.length > 1 && (
        <div className="mt-6 pt-4 border-t border-[var(--borda)]">
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-[var(--azul)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
              Histórico de Solicitações ({historicoPesquisas.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
            {historicoPesquisas.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2.5"
              >
                <div className="flex items-center gap-2">
                  <BadgeStatusBusca status={h.status} />
                  <span className="text-[var(--texto-suave)]">
                    {new Date(h.dataSolicitacao).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(h.dataSolicitacao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-medium text-[var(--azul-profundo)] truncate max-w-xs">{h.resultado}</span>
                </div>
                <span className="text-slate-400 text-[11px]">{h.usuarioSolicitante}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de Governança e Salvaguardas Éticas */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-indigo-950">
        <ShieldCheck className="size-5 shrink-0 text-indigo-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-indigo-900">Salvaguardas de Privacidade e Governança B2B (LGPD / Gate 6)</p>
          <p className="leading-relaxed text-[var(--texto-suave)]">
            Apenas contatos profissionais públicos estritamente B2B são pesquisados e armazenados. É proibida a coleta de
            CPF, e-mails privados, telefones residenciais ou móveis pessoais. Qualquer contato localizado permanece
            inativo até revisão humana explícita de um analista comercial.
          </p>
        </div>
      </div>

      {/* Modal de Confirmação Obrigatória */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-indigo-600" />
                <h3 className="text-base font-bold text-[var(--azul-profundo)]">
                  Confirmar Busca Supervisionada
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={acaoBusca} className="mt-4 space-y-4">
              <input type="hidden" name="contaComercialId" value={contaId} />
              <input type="hidden" name="confirmacao" value={confirmado ? "true" : "false"} />

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle size={15} className="shrink-0" />
                  Regras de Operação Supervisionada:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-amber-900">
                  <li>A busca consultará páginas abertas, portais institucionais e editais públicos para <strong>{contaNome}</strong>.</li>
                  <li>Não haverá consulta automática por robôs, nem scraping com login, nem bypass de CAPTCHA.</li>
                  <li>Nenhum e-mail ou telefone deduzido por padrão será aceito.</li>
                  <li>O papel comercial será sempre registrado como <strong>INFERÊNCIA COMERCIAL</strong>.</li>
                  <li>Contatos encontrados permanecerão inativos aguardando sua revisão manual.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)] mb-1">
                  Usuário Solicitante *
                </label>
                <input
                  type="text"
                  name="usuarioSolicitante"
                  value={usuarioSolicitante}
                  onChange={(e) => setUsuarioSolicitante(e.target.value)}
                  required
                  placeholder="Ex.: analista-comercial"
                  className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  required
                  className="mt-0.5 size-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-indigo-950">
                  Declaro que a busca possui finalidade legítima de prospecção corporativa B2B e confirmo explicitamente a execução desta pesquisa.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-[var(--borda)] px-4 py-2 text-xs font-semibold text-[var(--texto)] hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!confirmado || buscando}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {buscando ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Confirmar e Pesquisar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function BadgeStatusBusca({ status }: { status: string }) {
  switch (status) {
    case "AGUARDANDO_REVISAO":
      return (
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
          Aguardando Revisão
        </span>
      );
    case "SEM_CONTATO_VERIFICAVEL":
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
          Sem Contato Verificável
        </span>
      );
    case "CONCLUIDA":
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
          Concluída
        </span>
      );
    case "EM_PESQUISA":
      return (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
          Em Pesquisa
        </span>
      );
    case "ERRO":
      return (
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-200">
          Erro
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
          {status}
        </span>
      );
  }
}

function CardCandidatoResponsavel({
  candidato,
  contaId,
  acaoAprovar,
  aprovando,
  acaoDesativar,
  desativando,
}: {
  candidato: CandidatoResponsavel;
  contaId: string;
  acaoAprovar: (payload: FormData) => void;
  aprovando: boolean;
  acaoDesativar: (payload: FormData) => void;
  desativando: boolean;
}) {
  return (
    <article className="rounded-xl border border-indigo-200 bg-white p-4 shadow-xs text-xs space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-[var(--azul-profundo)]">{candidato.nome}</h4>
          <p className="text-[var(--texto-suave)] font-medium">
            {candidato.cargo} {candidato.area ? `· ${candidato.area}` : ""}
          </p>
          <p className="text-[11px] text-[var(--texto-suave)] mt-0.5">Empresa: {candidato.empresa}</p>
        </div>

        {/* Separadores visuais obrigatórios */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${
              candidato.tipoDado === "DEMONSTRACAO"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-teal-50 text-teal-800 border-teal-200"
            }`}
          >
            {candidato.tipoDado === "DEMONSTRACAO" ? "DEMONSTRAÇÃO" : "Fato público"}
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
            Inferência comercial
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-2.5 space-y-1 text-[11px]">
        <p>
          <strong>Papel inferido:</strong> {candidato.papelComercial}
        </p>
        <p>
          <strong>Justificativa:</strong> {candidato.justificativa}
        </p>
        <p className="text-slate-500">
          Fonte: {candidato.fonteNome} · Evidência de {new Date(candidato.dataEvidencia).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="space-y-1 text-[11px]">
        {candidato.urlPublica && (
          <a
            href={candidato.urlPublica}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[var(--azul)] hover:underline"
          >
            Ver perfil/página pública <ExternalLink size={11} />
          </a>
        )}
        {candidato.emailCorporativo && (
          <p>
            <span className="font-semibold text-slate-700">E-mail corporativo:</span> {candidato.emailCorporativo}
          </p>
        )}
        {candidato.telefoneDepartamental && (
          <p>
            <span className="font-semibold text-slate-700">Central / Depto:</span> {candidato.telefoneDepartamental}
            {candidato.ramal ? ` (ramal ${candidato.ramal})` : ""}
          </p>
        )}
      </div>

      {/* Ações de Revisão Humana */}
      {candidato.id && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-amber-700">
            {candidato.ativo ? "Ativo" : "Pendente de validação"}
          </span>

          <div className="flex items-center gap-2">
            {!candidato.ativo && (
              <form action={acaoAprovar}>
                <input type="hidden" name="contatoId" value={candidato.id} />
                <input type="hidden" name="contaComercialId" value={contaId} />
                <input type="hidden" name="usuarioAprovador" value="analista-comercial" />
                <button
                  type="submit"
                  disabled={aprovando}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <UserCheck size={12} />
                  <span>Aprovar e Ativar</span>
                </button>
              </form>
            )}

            <form action={acaoDesativar}>
              <input type="hidden" name="contatoId" value={candidato.id} />
              <input type="hidden" name="contaComercialId" value={contaId} />
              <input type="hidden" name="motivo" value="Desativado na revisão humana do Gate 6." />
              <input type="hidden" name="usuario" value="analista-comercial" />
              <button
                type="submit"
                disabled={desativando}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <UserX size={12} />
                <span>Desativar</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
