import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Clock3, ExternalLink, MapPin, UsersRound } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ClasseFaixa, MarcadorTipo, rotuloConfianca, rotuloRevisao } from "@/components/rotulos";
import { mapearEvidencia, obterInstituicaoPorSlug } from "@/lib/dados";
import type { FaixaPrioridade, TipoDado } from "@/domain/tipos";

export const dynamic = "force-dynamic";

export default async function InstituicaoPage({ params }: PageProps<"/instituicoes/[slug]">) {
  const { slug } = await params;
  const instituicao = await obterInstituicaoPorSlug(slug);
  if (!instituicao) notFound();
  const evidencias = instituicao.evidencias.map(mapearEvidencia);
  const fontes = [...new Map(evidencias.map((item) => [item.fonte.id, item.fonte])).values()];
  const possuiAlerta = evidencias.some((item) => item.confianca === "BAIXA" || item.statusRevisao !== "APROVADA");
  const indice = instituicao.indice;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <CabecalhoPagina titulo={instituicao.nome} descricao={instituicao.descricao} acao={<Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-white px-4 py-2 text-sm font-bold text-[var(--azul)] hover:bg-slate-50" href="/radar"><ArrowLeft size={17} aria-hidden="true" />Voltar ao radar</Link>} />

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <article className="painel p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div><p className="text-sm font-semibold text-[var(--texto-suave)]">Perfil da instituição</p><h2 className="mt-1 text-xl font-bold text-[var(--azul-profundo)]">{instituicao.tipoEstabelecimento.nome}</h2><p className="mt-2 text-sm text-[var(--texto-suave)]">{instituicao.grupoEconomico?.nome ?? "Instituição sem grupo econômico registrado"}</p></div>
            <MarcadorTipo tipo={instituicao.tipoDado as TipoDado} />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Unidades</dt><dd className="mt-2 text-2xl font-bold">{instituicao.unidades.length}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Operação 24h</dt><dd className="mt-2 text-lg font-bold">{instituicao.operacao24h ? "Sim" : "Não"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Porte</dt><dd className="mt-2 text-lg font-bold capitalize">{instituicao.porte.toLowerCase().replace("_", " ")}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Perfil corporativo</dt><dd className="mt-2 text-lg font-bold">{instituicao.perfilCorporativo ? "Sim" : "Não identificado"}</dd></div>
          </dl>
          <div className="mt-6"><h3 className="text-sm font-bold">Serviços demonstrativos</h3><div className="mt-3 flex flex-wrap gap-2">{instituicao.servicos.map((servico) => <span className="rounded-lg bg-[var(--ciano-claro)] px-3 py-1.5 text-sm font-medium text-[var(--azul)]" key={servico.id}>{servico.nome}</span>)}</div></div>
        </article>

        <article className="painel flex flex-col justify-between bg-[var(--azul-profundo)] p-6 text-white">
          <div><p className="text-sm font-semibold text-slate-300">Índice de Prioridade Hospitalar</p><div className="mt-5 flex items-end gap-3"><span className="text-6xl font-bold tracking-[-0.06em]">{indice?.total ?? 0}</span><span className="pb-2 text-sm text-slate-400">de 100</span></div><div className="mt-4"><ClasseFaixa faixa={(indice?.faixa ?? "BAIXA") as FaixaPrioridade} /></div></div>
          <div className="mt-8 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">Motor determinístico · versão {indice?.versao ?? "não calculada"}<br />Calculado em {indice?.calculadoEm.toLocaleDateString("pt-BR") ?? "—"}</div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="painel p-6"><div className="flex items-center gap-3"><MapPin className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Unidades e localização</h2></div><ul className="mt-4 space-y-3">{instituicao.unidades.map((unidade) => <li className="rounded-xl border border-[var(--borda)] p-4" key={unidade.id}><div className="flex items-center justify-between gap-4"><strong>{unidade.nome}</strong>{unidade.operacao24h && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Clock3 size={14} aria-hidden="true" />24 horas</span>}</div>{unidade.endereco && <p className="mt-2 text-sm leading-6 text-[var(--texto-suave)]">{unidade.endereco.logradouro}, {unidade.endereco.numero} · {unidade.endereco.bairro}<br />{unidade.endereco.municipio}/{unidade.endereco.uf} · <strong>DEMONSTRAÇÃO</strong></p>}</li>)}</ul></article>
        <div className="space-y-6"><article className="painel p-6"><div className="flex items-center gap-3"><Building2 className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Possíveis necessidades de mobilidade</h2></div><ul className="mt-4 space-y-3">{instituicao.necessidades.map((item) => <li className="rounded-xl bg-slate-50 p-4" key={item.id}><div className="flex items-center justify-between gap-3"><strong className="text-sm">{item.titulo}</strong><MarcadorTipo tipo={item.tipoDado as TipoDado} /></div><p className="mt-2 text-sm leading-6 text-[var(--texto-suave)]">{item.descricao}</p></li>)}</ul></article><article className="painel p-6"><div className="flex items-center gap-3"><UsersRound className="text-[var(--azul)]" size={21} aria-hidden="true" /><h2 className="text-lg font-bold">Áreas que podem participar</h2></div><ul className="mt-4 space-y-3">{instituicao.areasDecisoras.map((item) => <li className="border-l-2 border-[var(--ciano)] pl-4" key={item.id}><strong className="text-sm">{item.nome}</strong><p className="mt-1 text-sm leading-6 text-[var(--texto-suave)]">{item.justificativa}</p></li>)}</ul></article></div>
      </section>

      <section className="painel mt-6 overflow-hidden">
        <div className="border-b border-[var(--borda)] px-6 py-5"><h2 className="text-lg font-bold">Decomposição do índice</h2><p className="mt-1 text-sm text-[var(--texto-suave)]">Cada componente mostra peso máximo, valor obtido, justificativa e vínculo com evidências.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-[var(--texto-suave)]"><tr><th className="px-6 py-3">Critério</th><th className="px-4 py-3">Peso</th><th className="px-4 py-3">Obtido</th><th className="px-4 py-3">Proporção</th><th className="px-4 py-3">Justificativa</th><th className="px-4 py-3">Evidências</th></tr></thead><tbody>{indice?.componentes.map((item) => <tr className="border-t border-[var(--borda)] align-top" key={item.id}><td className="px-6 py-4 font-bold">{item.rotulo}</td><td className="px-4 py-4">{item.peso}</td><td className="px-4 py-4 font-bold text-[var(--azul)]">{item.valorObtido}</td><td className="px-4 py-4"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[var(--ciano)]" style={{ width: `${item.peso ? (item.valorObtido / item.peso) * 100 : 0}%` }} /></div></td><td className="max-w-md px-4 py-4 leading-6 text-[var(--texto-suave)]">{item.justificativa}</td><td className="px-4 py-4">{item.evidencias.length}</td></tr>)}</tbody></table></div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <article className="painel p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Evidências e fontes</h2><span className="text-sm font-bold text-[var(--azul)]">{evidencias.length} registro(s)</span></div>{possuiAlerta && <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={19} aria-hidden="true" /><p><strong>Alerta de qualidade:</strong> há evidência de baixa confiança ou pendente de revisão. Não a trate como fato.</p></div>}<div className="mt-5 space-y-4">{evidencias.map((item) => <article className="rounded-xl border border-[var(--borda)] p-5" key={item.id}><div className="flex flex-wrap items-center gap-2"><MarcadorTipo tipo={item.tipo} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">Confiança {rotuloConfianca[item.confianca]}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{rotuloRevisao[item.statusRevisao]}</span></div><h3 className="mt-3 font-bold">{item.titulo}</h3><p className="mt-2 text-sm leading-6 text-[var(--texto-suave)]">{item.descricao}</p><dl className="mt-4 grid gap-3 text-xs text-[var(--texto-suave)] sm:grid-cols-3"><div><dt className="font-bold">Coleta</dt><dd>{new Date(item.dataColeta).toLocaleDateString("pt-BR")}</dd></div><div><dt className="font-bold">Referência</dt><dd>{item.dataReferencia ? new Date(item.dataReferencia).toLocaleDateString("pt-BR") : "Não informada"}</dd></div><div><dt className="font-bold">Fonte</dt><dd>{item.fonte.nome}</dd></div></dl>{item.observacao && <p className="mt-3 text-xs italic leading-5 text-[var(--texto-suave)]">{item.observacao}</p>}</article>)}</div></article>
        <div className="space-y-6"><article className="painel p-6"><h2 className="text-lg font-bold">Fontes rastreáveis</h2><ul className="mt-4 space-y-3">{fontes.map((fonte) => <li className="rounded-xl bg-slate-50 p-4" key={fonte.id}><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{fonte.nome}</strong><p className="mt-1 break-all text-xs text-[var(--texto-suave)]">{fonte.identificador ?? fonte.url}</p></div>{fonte.url && <a href={fonte.url} rel="noreferrer" target="_blank" aria-label={`Abrir fonte ${fonte.nome}`}><ExternalLink size={17} /></a>}</div></li>)}</ul></article>{instituicao.sinaisExpansao.length > 0 && <article className="painel p-6"><h2 className="text-lg font-bold">Sinais de expansão</h2><ul className="mt-4 space-y-3">{instituicao.sinaisExpansao.map((sinal) => <li className="rounded-xl border border-[var(--borda)] p-4" key={sinal.id}><div className="flex items-center gap-2"><CheckCircle2 className="text-[var(--sucesso)]" size={18} aria-hidden="true" /><strong className="text-sm">{sinal.titulo}</strong></div><p className="mt-2 text-sm leading-6 text-[var(--texto-suave)]">{sinal.descricao}</p><p className="mt-2 text-xs font-bold text-amber-700">DEMONSTRAÇÃO</p></li>)}</ul></article>}</div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2"><article className="painel border-l-4 border-l-[var(--ciano)] p-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--azul)]">Ação comercial recomendada</p><h2 className="mt-2 text-xl font-bold">{instituicao.acoesComerciais[0]?.titulo ?? "Revisar evidências"}</h2><p className="mt-3 text-sm leading-6 text-[var(--texto-suave)]">{instituicao.acoesComerciais[0]?.descricao ?? "Não há ação registrada."}</p></article><article className="painel p-6"><h2 className="text-lg font-bold">Próximos passos</h2><ol className="mt-4 space-y-3 text-sm"><li className="flex gap-3"><span className="font-bold text-[var(--azul)]">01</span>Revisar evidências pendentes e confirmar fontes.</li><li className="flex gap-3"><span className="font-bold text-[var(--azul)]">02</span>Validar hipóteses com o time comercial.</li><li className="flex gap-3"><span className="font-bold text-[var(--azul)]">03</span>Registrar o resultado antes de avançar a abordagem.</li></ol></article></section>
    </div>
  );
}
