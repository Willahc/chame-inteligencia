import { Building, Info } from "lucide-react";
import type { EnriquecimentoCNPJTerceiro } from "@prisma/client";

interface SecaoDadosCadastraisTerceirosProps {
  dados: EnriquecimentoCNPJTerceiro | null;
}

export function SecaoDadosCadastraisTerceiros({ dados }: SecaoDadosCadastraisTerceirosProps) {
  if (!dados) return null;

  const capitalFormatado =
    dados.capitalSocial !== null
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dados.capitalSocial)
      : "Não informado";

  const dataConsultaFormatada = new Date(dados.dataConsulta).toLocaleDateString("pt-BR");

  return (
    <section className="painel mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Building className="text-[var(--azul)]" size={21} aria-hidden="true" />
          <h2 className="text-lg font-bold">Informações Cadastrais Suplementares</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
            DADO TERCEIRO NÃO CANÔNICO
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            Confiança {dados.confianca}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <Info className="mt-0.5 shrink-0 text-amber-700" size={18} aria-hidden="true" />
        <div>
          <p>
            <strong>Aviso de Governança:</strong> Fonte auxiliar de terceiros — não substitui a Receita Federal.
            Estes dados cadastrais foram obtidos via {dados.provedor} como suporte transitório e não alteram o cadastro
            oficial do CNES nem o Índice de Prioridade Comercial.
          </p>
          <p className="mt-2 text-xs font-semibold text-amber-800/90">
            Status da Receita Federal Oficial: <span className="underline">Fonte oficial pendente</span> (aguardando disponibilização de arquivos públicos de CNPJ em lote pelos servidores federais; base oficial preservada sem registros fictícios).
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Razão Social</dt>
          <dd className="mt-2 text-sm font-bold text-[var(--azul-profundo)] break-words">
            {dados.razaoSocial || "Não informada"}
          </dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Nome Fantasia</dt>
          <dd className="mt-2 text-sm font-bold text-[var(--azul-profundo)] break-words">
            {dados.nomeFantasia || "Não informado"}
          </dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Situação Cadastral</dt>
          <dd className="mt-2 text-sm font-bold">
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
              dados.situacaoCadastral === "ATIVA"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-800"
            }`}>
              {dados.situacaoCadastral || "Não informada"}
            </span>
          </dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Matriz / Filial</dt>
          <dd className="mt-2 text-sm font-bold">{dados.matrizFilial || "Não informada"}</dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">CNAE Principal</dt>
          <dd className="mt-2 text-xs font-semibold leading-5 text-[var(--texto-suave)]">
            {dados.cnaePrincipal || "Não informado"}
          </dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Porte / Capital</dt>
          <dd className="mt-2 text-sm font-bold">
            {dados.porte || "—"} · {capitalFormatado}
          </dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Município / UF</dt>
          <dd className="mt-2 text-sm font-bold">
            {dados.municipio || "—"}/{dados.uf || "—"}
          </dd>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Provedor / Consulta</dt>
          <dd className="mt-2 text-xs text-[var(--texto-suave)]">
            <strong>{dados.provedor}</strong> · {dataConsultaFormatada}
          </dd>
        </div>
      </dl>
    </section>
  );
}
