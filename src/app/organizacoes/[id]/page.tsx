import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, GitBranch, ListChecks, MapPin, ShieldAlert } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ClasseNatureza, ClasseSegmento, ClasseVinculo, MarcadorTipo, rotuloConfianca, rotuloStatusRevisao } from "@/components/rotulos";
import { obterOrganizacao } from "@/lib/dados";
import { ContatosProfissionais } from "@/components/contatos-profissionais";
import type { TipoDado } from "@/domain/tipos";

export const dynamic = "force-dynamic";

export default async function OrganizacaoPage({ params }: PageProps<"/organizacoes/[id]">) {
  const { id } = await params;
  const organizacao = await obterOrganizacao(id);
  if (!organizacao) notFound();

  const municipios = [
    ...new Set(
      organizacao.instituicoes.flatMap((instituicao) =>
        instituicao.unidades.map((unidade) => unidade.endereco?.municipio).filter((valor): valor is string => Boolean(valor)),
      ),
    ),
  ];
  const instituicoesNucleo = organizacao.instituicoes.filter((instituicao) => instituicao.segmentacao?.segmento === "NUCLEO_HOSPITALAR").length;
  const tipos = new Set(organizacao.instituicoes.map((instituicao) => instituicao.tipoEstabelecimento.nome));
  const ehHipotese = organizacao.tipoVinculo === "PROVAVEL" || organizacao.tipoVinculo === "INCERTO";

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <CabecalhoPagina
        titulo={organizacao.nome}
        descricao="Agrupamento de instituições do CNES a partir de vínculo oficial ou hipótese de vínculo econômico."
        acao={<Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-white px-4 py-2 text-sm font-bold text-[var(--azul)] hover:bg-slate-50" href="/organizacoes"><ArrowLeft size={17} aria-hidden="true" />Voltar às organizações</Link>}
      />

      <section className="mt-7 flex flex-wrap items-center gap-2">
        <MarcadorTipo tipo={organizacao.tipoDado as TipoDado} />
        <ClasseVinculo vinculo={organizacao.tipoVinculo} />
        <ClasseNatureza natureza={organizacao.natureza} />
      </section>

      {ehHipotese && (
        <section aria-label="Aviso de hipótese" className="mt-5 flex gap-3 rounded-xl border border-orange-300 bg-orange-50 p-5 text-sm leading-6 text-orange-900">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p><strong>Hipótese, não fato:</strong> este agrupamento foi inferido por normalização de razão social e ainda não representa vínculo econômico confirmado. Confira os dados antes de usar como base de decisão.</p>
        </section>
      )}

      <section className="painel mt-6 p-6">
        <div className="flex items-center gap-3"><Building2 className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Composição do agrupamento</h2></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Unidades</dt><dd className="mt-2 text-2xl font-bold">{organizacao.instituicoes.length}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Municípios</dt><dd className="mt-2 text-2xl font-bold">{municipios.length}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Tipos de estabelecimento</dt><dd className="mt-2 text-2xl font-bold">{tipos.size}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Núcleo hospitalar</dt><dd className="mt-2 text-2xl font-bold">{instituicoesNucleo}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Natureza do agrupamento</dt><dd className="mt-2 text-lg font-bold">{rotuloNatureza(organizacao.natureza)}</dd></div>
        </dl>
        {municipios.length > 0 && <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[var(--texto-suave)]"><MapPin className="mt-0.5 shrink-0 text-[var(--azul)]" size={17} aria-hidden="true" />{municipios.join(", ")}</p>}
      </section>

      <section className="painel mt-6 p-6">
        <div className="flex items-center gap-3"><h2 className="text-lg font-bold">Contatos comerciais</h2></div>
        <p className="mt-2 text-sm leading-6 text-[var(--texto-suave)]">Contatos exibidos com origem, confiança e tipo de dado identificados individualmente.</p>
        <ContatosProfissionais contatos={organizacao.contatos} />
      </section>

      <section className="painel mt-6 p-6">
        <div className="flex items-center gap-3"><GitBranch className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Regra, evidência e revisão</h2></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Regra aplicada</dt><dd className="mt-2 text-sm font-bold">{organizacao.regraAgrupamento ?? "Não informada"}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Versão da regra</dt><dd className="mt-2 text-sm font-bold">{organizacao.versaoRegra ?? "—"}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Evidência</dt><dd className="mt-2 text-sm font-bold">{organizacao.tipoEvidencia ?? "Não informada"}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Confiança</dt><dd className="mt-2 text-sm font-bold">{rotuloConfianca[organizacao.nivelConfianca]}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Revisão</dt><dd className="mt-2 text-sm font-bold">{rotuloStatusRevisao[organizacao.statusRevisao] ?? organizacao.statusRevisao}</dd></div>
        </dl>
        {organizacao.dataCalculo && <p className="mt-5 flex items-center gap-2 text-xs text-[var(--texto-suave)]"><CalendarClock size={15} aria-hidden="true" />Calculado em {new Date(organizacao.dataCalculo).toLocaleString("pt-BR")}</p>}
        {organizacao.observacao && <p className="mt-5 rounded-xl border border-[var(--borda)] bg-slate-50 p-4 text-sm leading-6 text-[var(--texto-suave)]"><strong className="text-[var(--texto)]">Observação:</strong> {organizacao.observacao}</p>}
      </section>

      <section className="painel mt-6 p-6">
        <div className="flex items-center gap-3"><ShieldAlert className="text-amber-600" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Riscos e limitações do agrupamento</h2></div>
        <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--texto-suave)]">
          <p>• <strong className="text-[var(--texto)]">Base canônica CNES:</strong> este agrupamento foi gerado por regras determinísticas sobre os registros oficiais do CNES (versão {organizacao.versaoRegra ?? "1.0.0"}).</p>
          <p>• <strong className="text-[var(--texto)]">Vínculo {organizacao.tipoVinculo === "OFICIAL" ? "oficial confirmado" : organizacao.tipoVinculo === "PROVAVEL" ? "provável (hipótese)" : organizacao.tipoVinculo === "ISOLADO" ? "isolado (sem rede identificada)" : "incerto"}:</strong> {organizacao.tipoVinculo === "PROVAVEL" ? "A relação entre as unidades decorre de similaridade de razão social e deve ser confirmada por validação humana ou CNPJ mantenedora antes de abordagens estratégicas." : organizacao.tipoVinculo === "OFICIAL" ? "Vínculo documentado em fontes oficiais de cadastro." : "Instituição tratada individualmente no pipeline comercial."}</p>
          <p>• <strong className="text-[var(--texto)]">Sem integração externa não autorizada:</strong> não foram consultadas bases da Receita Federal, ANS ou serviços externos de inteligência artificial.</p>
        </div>
      </section>

      <section className="painel mt-6 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--borda)] px-6 py-5"><ListChecks className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Instituições do agrupamento</h2></div>
        {organizacao.instituicoes.length === 0 ? <div className="px-6 py-16 text-center"><p className="text-sm text-[var(--texto-suave)]">Sem instituições registradas.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[var(--texto-suave)]"><tr><th className="px-6 py-3">Instituição</th><th className="px-4 py-3">CNES</th><th className="px-4 py-3">Município</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Segmentação</th><th className="px-4 py-3 text-right">Índice</th></tr></thead><tbody>{organizacao.instituicoes.map((instituicao) => { const municipioPrimario = [...new Set(instituicao.unidades.map((unidade) => unidade.endereco?.municipio).filter((valor): valor is string => Boolean(valor)))][0]; return <tr className="border-t border-[var(--borda)] align-top" key={instituicao.id}><td className="px-6 py-4"><Link className="font-bold text-[var(--azul)] hover:underline" href={`/instituicoes/${instituicao.slug}`}>{instituicao.nome}</Link></td><td className="px-4 py-4">{instituicao.cnes ?? "—"}</td><td className="px-4 py-4">{municipioPrimario ?? "—"}</td><td className="px-4 py-4 text-[var(--texto-suave)]">{instituicao.tipoEstabelecimento.nome}</td><td className="px-4 py-4">{instituicao.segmentacao ? <ClasseSegmento segmento={instituicao.segmentacao.segmento} /> : "—"}</td><td className="px-4 py-4 text-right font-bold">{instituicao.indice?.total ?? 0}</td></tr>; })}</tbody></table></div>}
      </section>
    </div>
  );
}

function rotuloNatureza(natureza: string): string {
  return { PUBLICO: "Pública", PRIVADO: "Privada", INDETERMINADO: "Indeterminada" }[natureza] ?? natureza;
}
