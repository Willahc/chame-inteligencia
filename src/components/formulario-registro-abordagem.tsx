"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { salvarResultadoAbordagem } from "@/app/contas/[id]/actions";
import type { ResultadoAbordagem } from "@/domain/contas";

export function FormularioRegistroAbordagem({
  contaId,
  resultadoAtual,
}: {
  contaId: string;
  resultadoAtual: ResultadoAbordagem;
}) {
  const [sucesso, setSucesso] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    setMensagemErro(null);
    setSucesso(false);
    try {
      await salvarResultadoAbordagem(formData);
      setSucesso(true);
      // Limpa campos de texto
      const form = document.getElementById("form-abordagem") as HTMLFormElement;
      if (form) {
        (form.elements.namedItem("observacao") as HTMLTextAreaElement).value = "";
        (form.elements.namedItem("proximaAcao") as HTMLInputElement).value = "";
        (form.elements.namedItem("fonteOuEvidencia") as HTMLInputElement).value = "";
      }
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao registrar abordagem.");
    }
  }

  const [, formAction, isPending] = useActionState(async (_: void, formData: FormData) => {
    await handleAction(formData);
  }, undefined);

  return (
    <form id="form-abordagem" action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="contaComercialId" value={contaId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
            Novo Status Comercial *
          </span>
          <select
            name="resultado"
            defaultValue={resultadoAtual}
            required
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm font-medium"
          >
            <option value="NAO_ABORDADA">Não abordada</option>
            <option value="ABORDADA">Abordada</option>
            <option value="EM_ANALISE">Em análise</option>
            <option value="REUNIAO">Reunião agendada</option>
            <option value="PROPOSTA">Proposta enviada</option>
            <option value="CONTRATO">Contrato assinado</option>
            <option value="DESCARTADA">Descartada</option>
            <option value="AGUARDANDO_DADOS">Aguardando dados</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
            Responsável Interno
          </span>
          <input
            type="text"
            name="usuarioResponsavel"
            placeholder="Ex.: Carlos Mendes (Comercial)"
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
          Observação Comercial *
        </span>
        <textarea
          name="observacao"
          required
          rows={3}
          placeholder="Descreva o andamento do contato, feedback da reunião, interlocutor contatado ou motivo da decisão..."
          className="w-full rounded-xl border border-[var(--borda)] bg-white p-3 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
            Próxima Ação Planejada
          </span>
          <input
            type="text"
            name="proximaAcao"
            placeholder="Ex.: Enviar apresentação corporativa até sexta"
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
            Fonte / Canal da Interação
          </span>
          <input
            type="text"
            name="fonteOuEvidencia"
            placeholder="Ex.: Ligação telefônica, e-mail institucional ou reunião"
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
          />
        </label>
      </div>

      {mensagemErro && (
        <p className="text-xs font-bold text-rose-600">{mensagemErro}</p>
      )}

      {sucesso && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} />
          <span>Resultado comercial registrado com sucesso e histórico atualizado!</span>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--azul-profundo)] px-5 py-2 text-sm font-bold text-white transition hover:bg-[var(--azul)] disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Registrar resultado comercial</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
