import Link from "next/link";
import { ArrowRight, Building2, Clock3, FileWarning, FlaskConical, Landmark, Layers, MapPinned, TrendingUp } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ClasseSegmento, rotuloFaixa, rotuloSegmento } from "@/components/rotulos";
import { TabelaOportunidadesVisaoGeral } from "@/components/tabela-oportunidades-visao-geral";
import type { FaixaPrioridade } from "@/domain/tipos";
import { obterModoDados } from "@/domain/modo-dados";
import { listarInstituicoes, mapearParaRadar } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function Home() {
  const completas = await listarInstituicoes();
  const modo = obterModoDados();
  const instituicoes = completas.map(mapearParaRadar);
  const pendentes = completas.reduce((total, item) => total + item.evidencias.filter((evidencia) => evidencia.statusRevisao === "PENDENTE").length, 0);
  const indicadores = [
    { rotulo: "Instituições reais", valor: instituicoes.filter((item) => item.tipoDado === "FATO_OFICIAL").length, detalhe: "CNES / DATASUS", icone: Building2 },
    { rotulo: "Demonstrações", valor: instituicoes.filter((item) => item.tipoDado === "DEMONSTRACAO").length, detalhe: "dados fictícios", icone: FlaskConical },
    { rotulo: "Instituições mapeadas", valor: instituicoes.length, detalhe: modo === "MODO_REAL" ? "registros oficiais captados" : "dados de demonstração", icone: Building2 },
    { rotulo: "Prioridade alta ou superior", valor: instituicoes.filter((item) => item.indice >= 60).length, detalhe: "60 pontos ou mais", icone: TrendingUp },
    { rotulo: "Com várias unidades", valor: instituicoes.filter((item) => item.quantidadeUnidades > 1).length, detalhe: "potencial entre unidades", icone: MapPinned },
    { rotulo: "Operação 24 horas", valor: instituicoes.filter((item) => item.operacao24h).length, detalhe: "demanda contínua provável", icone: Clock3 },
    { rotulo: "Com sinal de expansão", valor: instituicoes.filter((item) => item.possuiExpansao).length, detalhe: "requer validação humana", icone: TrendingUp },
    { rotulo: "Evidências pendentes", valor: pendentes, detalhe: "aguardando revisão", icone: FileWarning },
    { rotulo: "Segmentadas", valor: instituicoes.filter((item) => item.segmentacao).length, detalhe: "segmentação comercial", icone: Layers },
    { rotulo: "Sinais PNCP vinculados", valor: instituicoes.filter((item) => item.possuiSinalPNCP).length, detalhe: "vínculo oficial por CNPJ", icone: Landmark },
  ];
  const faixas = (["MUITO_ALTA", "ALTA", "MODERADA", "BAIXA"] as FaixaPrioridade[]).map((faixa) => ({
    faixa,
    quantidade: instituicoes.filter((item) => item.faixa === faixa).length,
  }));
  const segmentos = Object.entries(Object.groupBy(instituicoes.filter((item) => item.segmentacao), (item) => item.segmentacao?.segmento ?? "Sem segmento"))
    .map(([segmento, itens]) => ({ segmento, quantidade: itens?.length ?? 0 }))
    .sort((a, b) => b.quantidade - a.quantidade);
  const tipos = Object.entries(Object.groupBy(instituicoes, (item) => item.tipo)).map(([tipo, itens]) => ({ tipo, quantidade: itens?.length ?? 0 }));
  const motivos = Object.entries(Object.groupBy(instituicoes, (item) => item.principalMotivo))
    .map(([motivo, itens]) => ({ motivo, quantidade: itens?.length ?? 0 }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <CabecalhoPagina
        titulo="Visão Geral"
        descricao="Prioridades comerciais explicadas por sinais, evidências e critérios auditáveis."
        acao={<Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--azul-profundo)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--azul)]" href="/radar">Abrir radar completo <ArrowRight size={17} aria-hidden="true" /></Link>}
      />

      <section aria-labelledby="indicadores" className="mt-7">
        <h2 className="sr-only" id="indicadores">Indicadores principais</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {indicadores.map(({ rotulo, valor, detalhe, icone: Icone }) => (
            <article className="painel p-5" key={rotulo}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium leading-5 text-[var(--texto-suave)]">{rotulo}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--azul-profundo)]">{valor}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--texto-suave)]">{detalhe}</p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ciano-claro)] text-[var(--azul)]"><Icone size={20} aria-hidden="true" /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <TabelaOportunidadesVisaoGeral instituicoes={instituicoes} modo={modo} />

        <div className="space-y-6">
          <article className="painel p-6">
            <h2 className="text-lg font-bold text-[var(--azul-profundo)]">Distribuição por prioridade</h2>
            <div className="mt-5 space-y-4">
              {faixas.map(({ faixa, quantidade }) => (
                <div key={faixa}>
                  <div className="mb-1.5 flex justify-between gap-3 text-sm"><span>{rotuloFaixa[faixa]}</span><strong>{quantidade}</strong></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--ciano)]" style={{ width: `${instituicoes.length ? (quantidade / instituicoes.length) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
          <article className="painel p-6">
            <h2 className="text-lg font-bold text-[var(--azul-profundo)]">Por tipo de instituição</h2>
            <ul className="mt-4 divide-y divide-[var(--borda)]">{tipos.map(({ tipo, quantidade }) => <li className="flex justify-between gap-4 py-3 text-sm" key={tipo}><span>{tipo}</span><strong>{quantidade}</strong></li>)}</ul>
          </article>
          <article className="painel p-6">
            <h2 className="text-lg font-bold text-[var(--azul-profundo)]">Segmentação comercial</h2>
            <p className="mt-1 text-sm text-[var(--texto-suave)]">Segmento derivado por tipo e estrutura, como inferência sobre o CNES.</p>
            <ul className="mt-4 divide-y divide-[var(--borda)]">{segmentos.map(({ segmento, quantidade }) => <li className="flex items-center justify-between gap-4 py-3 text-sm" key={segmento}><span className="font-medium">{rotuloSegmento[segmento] ?? segmento}</span><span className="flex items-center gap-3"><strong>{quantidade}</strong><ClasseSegmento segmento={segmento} /></span></li>)}</ul>
          </article>
        </div>
      </section>

      <section className="painel mt-6 p-6">
        <h2 className="text-lg font-bold text-[var(--azul-profundo)]">Principais motivos de prioridade</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{motivos.map(({ motivo, quantidade }, indice) => <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4" key={motivo}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[var(--azul)]">{indice + 1}</span><span className="flex-1 text-sm font-medium">{motivo}</span><strong>{quantidade}</strong></div>)}</div>
      </section>
    </div>
  );
}
