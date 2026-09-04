import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, GitBranch, ListChecks, MapPin, UserRound } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ClasseNatureza, ClasseSegmento, ClasseVinculo, MarcadorTipo, rotuloConfianca, rotuloStatusRevisao } from "@/components/rotulos";
import { obterOrganizacao } from "@/lib/dados";
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
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
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
        <div className="flex items-center gap-3"><UserRound className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Contatos profissionais públicos</h2></div>
        <p className="mt-2 text-sm leading-6 text-[var(--texto-suave)]">Contatos reproduzidos em fontes públicas para prospecção B2B. O papel comercial é uma inferência e não confirma poder de decisão.</p>
        {organizacao.contatos.length === 0 ? <p className="mt-5 text-sm text-[var(--texto-suave)]">Nenhum contato público confirmado.</p> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{organizacao.contatos.map((contato) => <article className="rounded-xl border border-[var(--borda)] bg-slate-50 p-5" key={contato.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{contato.nome}</h3><p className="mt-1 text-sm text-[var(--texto-suave)]">{contato.cargo ?? "Cargo não informado"}{contato.area ? ` — ${contato.area}` : ""}</p></div><span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">Fato público</span></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Papel comercial</dt><dd className="mt-1">{contato.papelComercial ?? "Não definido"} <span className="text-xs text-[var(--texto-suave)]">(inferência)</span></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Confiança</dt><dd className="mt-1">{rotuloConfianca[contato.confianca]}</dd></div></dl><div className="mt-4 flex flex-wrap gap-3 text-sm">{contato.linkedinUrl && <a className="font-bold text-[var(--azul)] hover:underline" href={contato.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn público</a>}{contato.paginaProfissionalUrl && !contato.linkedinUrl && <a className="font-bold text-[var(--azul)] hover:underline" href={contato.paginaProfissionalUrl} target="_blank" rel="noreferrer">Fonte profissional pública</a>}</div><p className="mt-3 text-xs leading-5 text-[var(--texto-suave)]">Fonte: <a className="underline" href={contato.fonte.url ?? "#"} target="_blank" rel="noreferrer">{contato.fonte.nome}</a> · Evidência de {new Date(contato.dataEvidencia).toLocaleDateString("pt-BR")}</p>{contato.observacao && <p className="mt-3 text-xs leading-5 text-[var(--texto-suave)]">{contato.observacao}</p>}</article>)}</div>}
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
