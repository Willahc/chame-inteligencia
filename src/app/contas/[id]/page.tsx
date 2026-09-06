import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Building2,
  Calendar,
  Car,
  Clock3,
  ExternalLink,
  FileSearch,
  History,
  Info,
  Landmark,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import {
  ClasseAcaoComercial,
  ClasseFaixa,
  ClasseNatureza,
  ClasseResultadoAbordagem,
  ClasseVinculo,
  MarcadorTipo,
  rotuloConfianca,
  rotuloStatusRevisao,
} from "@/components/rotulos";
import { FormularioRegistroAbordagem } from "@/components/formulario-registro-abordagem";
import { ContatosProfissionais } from "@/components/contatos-profissionais";
import { SecaoDadosCadastraisTerceiros } from "@/components/secao-dados-cadastrais-terceiros";
import { SecaoDadosCadastraisANS } from "@/components/secao-dados-cadastrais-ans";
import { SecaoContextoIBGE } from "@/components/secao-contexto-ibge";
import { SecaoIndicadoresMTE } from "@/components/secao-indicadores-mte";
import type { TipoDado } from "@/domain/tipos";
import type { ResultadoAbordagem } from "@/domain/contas";
import { obterContaComercial } from "@/lib/dados";
import { prisma } from "@/lib/prisma";
import { obterModoDados } from "@/domain/modo-dados";
import { obterEnriquecimentoTerceiroPorCnes } from "@/lib/terceiros";
import { obterOperadoraANSPorCnpj, obterOperadoraANSPorCnes } from "@/lib/ans";
import { obterContextoGeograficoIBGE } from "@/lib/ibge";
import { obterIndicadoresMTEMunicipio } from "@/lib/mte";
import type { DetalheIndiceComercial } from "@/domain/contas";

export const dynamic = "force-dynamic";

export default async function DetalheContaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const modo = obterModoDados();
  const conta = await obterContaComercial(id, modo);

  if (!conta) {
    notFound();
  }

  // Parse de cidades e componentes do índice
  let cidadesArray: string[] = [];
  try {
    cidadesArray = JSON.parse(conta.cidades);
  } catch {
    cidadesArray = conta.cidades ? [conta.cidades] : [];
  }

  let detalheIndice: DetalheIndiceComercial | null = null;
  if (conta.componentesIndiceJson) {
    try {
      detalheIndice = JSON.parse(conta.componentesIndiceJson);
    } catch {
      detalheIndice = null;
    }
  }

  // Para demonstração sem grupo econômico, buscar instituição correspondente
  let instituicoes = conta.grupoEconomico?.instituicoes ?? [];
  let contatos = conta.grupoEconomico?.contatos ?? [];

  if (conta.tipoDado === "DEMONSTRACAO" && instituicoes.length === 0) {
    const instDemoId = conta.id.replace("conta-", "");
    const instDemo = await prisma.instituicao.findFirst({
      where: { id: instDemoId },
      include: {
        tipoEstabelecimento: true,
        unidades: { include: { endereco: true } },
        segmentacao: true,
        indice: { include: { componentes: true } },
        evidencias: { include: { fonte: true }, orderBy: { dataColeta: "desc" } },
        contatosProfissionais: { include: { fonte: true }, where: { ativo: true } },
        sinaisContratacaoPublica: { include: { fonte: true }, orderBy: { dataPublicacao: "desc" } },
      },
    });
    if (instDemo) {
      instituicoes = [instDemo];
      contatos = instDemo.contatosProfissionais;
    }
  }

  const todasEvidencias = instituicoes.flatMap((inst) => inst.evidencias);
  const munConta = cidadesArray[0] || "São Paulo";

  const [
    dadosCadastraisTerceiros,
    operadoraANS,
    contextoIBGE,
    indicadoresMTE,
  ] = await Promise.all([
    obterEnriquecimentoTerceiroPorCnes(instituicoes[0]?.cnes),
    conta.cnpjPrincipal
      ? obterOperadoraANSPorCnpj(conta.cnpjPrincipal)
      : obterOperadoraANSPorCnes(instituicoes[0]?.cnes ?? ""),
    obterContextoGeograficoIBGE(munConta),
    obterIndicadoresMTEMunicipio(munConta, "SP"),
  ]);

  // Sinais de contratação pública PNCP vinculados estritamente por CNPJ exato
  const sinaisPNCP = [
    ...new Map(
      instituicoes
        .flatMap((inst) => inst.sinaisContratacaoPublica ?? [])
        .filter(
          (sinal) =>
            sinal.metodoVinculo === "CNPJ_ESTABELECIMENTO" ||
            sinal.metodoVinculo === "CNPJ_MANTENEDORA"
        )
        .map((sinal) => [sinal.identificadorPNCP, sinal])
    ).values(),
  ].sort(
    (a, b) =>
      new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime()
  );

  const totalSinaisPNCP = sinaisPNCP.length;
  const totalMobilidadePNCP = sinaisPNCP.filter((s) => s.sinalMobilidade).length;
  const dataSinalMaisRecente = sinaisPNCP[0]?.dataPublicacao
    ? new Date(sinaisPNCP[0].dataPublicacao)
    : null;
  const sinaisRecentesResumo = sinaisPNCP.slice(0, 3);

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[var(--texto-suave)]">
        <Link href="/contas" className="flex items-center gap-1 hover:text-[var(--azul)]">
          <ArrowLeft size={14} /> Contas Comerciais
        </Link>
        <span>/</span>
        <span className="text-[var(--texto)] truncate max-w-xs">{conta.nome}</span>
      </div>

      <CabecalhoPagina
        titulo={conta.nome}
        descricao="Dossiê operacional de inteligência comercial com consolidação de estabelecimentos, score de prioridade, contatos auditados e histórico de abordagem."
        acao={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
            <ClasseFaixa faixa={conta.faixaPrioridadeComercial} />
            <ClasseResultadoAbordagem resultado={conta.resultadoAbordagem} />
          </div>
        }
      />

      {conta.tipoDado === "DEMONSTRACAO" && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <Info size={18} className="shrink-0 text-amber-700" />
          <p>
            <strong>MODO DEMONSTRAÇÃO ATIVO:</strong> Esta é uma conta fictícia criada exclusivamente
            para simulação operacional. Nenhum contato ou unidade representa dados reais.
          </p>
        </div>
      )}

      {/* Grid Superior: Resumo e Score */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Painel de Resumo */}
        <section aria-label="Resumo da conta" className="painel p-6 lg:col-span-1">
          <h2 className="text-base font-bold text-[var(--azul-profundo)]">Resumo Executivo</h2>
          <dl className="mt-4 divide-y divide-[var(--borda)] text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Vínculo Organizacional</dt>
              <dd className="font-semibold text-right">
                <ClasseVinculo vinculo={conta.tipoVinculo} />
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Confiança do Vínculo</dt>
              <dd className="font-semibold text-right">{rotuloConfianca[conta.confiancaOrganizacional]}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Natureza Jurídica</dt>
              <dd className="font-semibold text-right">
                <ClasseNatureza natureza={conta.natureza} />
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Total de Unidades</dt>
              <dd className="font-bold text-[var(--azul-profundo)]">{conta.quantidadeUnidades}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Unidades Hospitalares</dt>
              <dd className="font-bold text-[var(--azul-profundo)]">{conta.quantidadeHospitais}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Municípios Atendidos</dt>
              <dd className="font-semibold text-right max-w-44 truncate">
                {cidadesArray.length > 0 ? cidadesArray.join(", ") : "Não informado"}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">CNPJ Principal</dt>
              <dd className="font-semibold text-right text-xs">
                {conta.cnpjPrincipal ?? "Pendente de fonte oficial (Gate 4)"}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Situação Cadastral</dt>
              <dd className="font-semibold text-right text-xs">
                {conta.situacaoCadastral ?? "Oficial Ativa"}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Cobertura Cadastral</dt>
              <dd className="font-bold text-emerald-700">{conta.coberturaDados}%</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--texto-suave)]">Status de Revisão</dt>
              <dd className="font-semibold text-right text-xs">
                {rotuloStatusRevisao[conta.statusRevisao] ?? conta.statusRevisao}
              </dd>
            </div>
          </dl>
        </section>

        {/* Painel de Prioridade e Ação Comercial */}
        <section
          aria-label="Índice de prioridade comercial"
          className="painel p-6 lg:col-span-2 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borda)] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                  Índice de Prioridade Comercial v1.0.0
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold tracking-tight text-[var(--azul-profundo)]">
                    {conta.indicePrioridadeComercial}
                  </span>
                  <span className="text-sm font-semibold text-[var(--texto-suave)]">/ 100 pontos</span>
                  <ClasseFaixa faixa={conta.faixaPrioridadeComercial} />
                </div>
              </div>

              <div className="text-right">
                <span className="block text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                  Ação Comercial Recomendada
                </span>
                <div className="mt-1">
                  <ClasseAcaoComercial acao={conta.acaoRecomendada} />
                </div>
              </div>
            </div>

            {/* Justificativa da ação recomendada */}
            <div className="mt-4 rounded-xl border border-[var(--borda)] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                Justificativa Operacional da Recomendação
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--texto)]">
                {conta.justificativaAcao ?? "Revisar sinais cadastrais e contatos antes de agir."}
              </p>
              <div className="mt-2 flex items-start gap-2 text-xs text-[var(--texto-suave)]">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Recomendação algorítmica de apoio operacional; não substitui o discernimento
                  comercial nem assegura contratação.
                </span>
              </div>
            </div>
          </div>

          {/* Explicabilidade dos 11 Componentes */}
          {detalheIndice && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)] mb-2">
                Explicabilidade dos Componentes do Score (v{detalheIndice.versao})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {detalheIndice.componentes.map((comp) => (
                  <div
                    key={comp.criterio}
                    className="flex flex-col justify-between rounded-lg border border-[var(--borda)] bg-white p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{comp.rotulo}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-[var(--azul-profundo)]">
                        {comp.pontos} / {comp.peso} pts
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--texto-suave)] line-clamp-2">
                      {comp.justificativa}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Seção de Sinais de Contratação Pública (PNCP) */}
      <section aria-label="Sinais de contratação pública PNCP" className="painel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--borda)] pb-3">
          <div className="flex items-center gap-2.5">
            <Landmark size={20} className="text-[var(--azul)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--azul-profundo)]">
                Sinais de Contratação Pública — PNCP ({totalSinaisPNCP})
              </h2>
              <p className="text-xs text-[var(--texto-suave)]">
                Editais e dispensas coletados via Portal Nacional de Contratações Públicas por CNPJ exato
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {totalSinaisPNCP} processo(s) por CNPJ oficial
            </span>
            {totalMobilidadePNCP > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Car size={13} aria-hidden="true" />
                {totalMobilidadePNCP} de mobilidade
              </span>
            )}
            {dataSinalMaisRecente && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Mais recente: {formatarData(dataSinalMaisRecente)}
              </span>
            )}
            <Link
              href="/contratacoes-publicas"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--borda)] bg-white px-3 py-1 text-xs font-bold text-[var(--azul)] hover:bg-slate-50"
            >
              Abrir Painel PNCP →
            </Link>
          </div>
        </div>

        {/* Aviso Obrigatório de Governança */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />
          <p>
            <strong>Evidência de Contexto:</strong> Sinal público observado via PNCP; <strong>não representa contrato confirmado</strong>,
            oportunidade ganha, cliente ativo da Chame Táxi nem altera o Índice de Prioridade Comercial v1.0.0,
            a faixa de prioridade ou a ação comercial recomendada. O vínculo decorre estritamente da correspondência exata de CNPJ oficial.
          </p>
        </div>

        {totalSinaisPNCP === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--borda)] p-6 text-center">
            <FileSearch className="mx-auto size-7 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-[var(--texto)]">
              Nenhum sinal de contratação pública do PNCP vinculado por CNPJ exato a esta conta.
            </p>
            <p className="mt-1 text-xs text-[var(--texto-suave)]">
              Apenas processos com CNPJ de mantenedora ou estabelecimento exatamente coincidente são vinculados.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
              Processos Mais Recentes (exibindo {sinaisRecentesResumo.length} de {totalSinaisPNCP})
            </h3>
            {sinaisRecentesResumo.map((sinal) => (
              <div
                key={sinal.id}
                className={`rounded-xl border p-4 text-xs transition ${
                  sinal.sinalMobilidade
                    ? "border-[var(--ciano)]/40 bg-[var(--ciano)]/[0.03]"
                    : "border-[var(--borda)] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                      {sinal.modalidade}
                    </span>
                    <span className="text-[var(--texto-suave)]">
                      Publicado em {formatarData(sinal.dataPublicacao)}
                    </span>
                    {sinal.sinalMobilidade && (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                        <Car size={12} aria-hidden="true" />
                        Mobilidade / Transporte
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                      {sinal.tipoDado}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Confiança: {sinal.confianca}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {sinal.metodoVinculo}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-sm font-semibold text-[var(--texto)] leading-snug">
                  {sinal.objeto}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[var(--texto-suave)]">
                  <div>
                    <span className="font-semibold text-slate-700">Órgão: </span>
                    {sinal.razaoSocialOrgao || "Não nomeado"} · CNPJ {formatarCNPJ(sinal.cnpjOrgao)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Valor Estimado: </span>
                    <strong className="text-[var(--azul)]">{formatarMoeda(sinal.valorEstimado)}</strong>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    ID: {sinal.identificadorPNCP}
                  </span>
                  {sinal.urlPublica && (
                    <a
                      href={sinal.urlPublica}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[var(--azul)] hover:underline"
                    >
                      Ver no portal PNCP <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2 text-center">
              <Link
                href="/contratacoes-publicas"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--borda)] bg-slate-50 px-4 py-2 text-xs font-bold text-[var(--azul)] hover:bg-slate-100"
              >
                Ver todos os {totalSinaisPNCP} sinais vinculados no Painel de Contratações →
              </Link>
            </div>
          </div>
        )}
      </section>

      <SecaoDadosCadastraisTerceiros dados={dadosCadastraisTerceiros} />

      <SecaoDadosCadastraisANS operadora={operadoraANS} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SecaoContextoIBGE ibge={contextoIBGE} />
        <SecaoIndicadoresMTE indicadores={indicadoresMTE} />
      </div>

      {/* Seção de Estabelecimentos e Unidades */}
      <section aria-label="Unidades pertencentes à conta" className="painel mt-6 p-6">
        <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-[var(--azul)]" />
            <h2 className="text-base font-bold text-[var(--azul-profundo)]">
              Estabelecimentos e Unidades Pertencentes à Conta ({instituicoes.length})
            </h2>
          </div>
          <span className="text-xs text-[var(--texto-suave)]">
            Total de {conta.quantidadeUnidades} unidades operacionais cadastradas
          </span>
        </div>

        <div className="mt-4 divide-y divide-[var(--borda)]">
          {instituicoes.map((inst) => (
            <div key={inst.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/instituicoes/${inst.slug}`}
                    className="font-bold text-[var(--azul)] hover:underline flex items-center gap-1.5"
                  >
                    {inst.nome}
                    <ExternalLink size={13} />
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
                    {inst.tipoEstabelecimento?.nome} · CNES: {inst.cnes ?? "Não informado"} ·{" "}
                    {inst.operacao24h ? "Operação 24 Horas" : "Horário comercial"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MarcadorTipo tipo={inst.tipoDado as TipoDado} />
                  {inst.operacao24h && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">
                      <Clock3 size={12} /> 24h
                    </span>
                  )}
                </div>
              </div>

              {inst.unidades && inst.unidades.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {inst.unidades.map((unidade) => (
                    <div
                      key={unidade.id}
                      className="rounded-lg border border-[var(--borda)] bg-slate-50 p-2.5 text-xs"
                    >
                      <p className="font-semibold text-[var(--texto)]">{unidade.nome}</p>
                      {unidade.endereco && (
                        <p className="mt-1 text-[var(--texto-suave)] flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          <span>
                            {unidade.endereco.logradouro}, {unidade.endereco.numero} -{" "}
                            {unidade.endereco.bairro}, {unidade.endereco.municipio}/
                            {unidade.endereco.uf}
                          </span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Seção de Contatos Profissionais */}
      <section aria-label="Contatos profissionais auditados" className="painel mt-6 p-6">
        <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--azul)]" />
            <h2 className="text-base font-bold text-[var(--azul-profundo)]">
              Contatos Profissionais Públicos Auditados ({contatos.length})
            </h2>
          </div>
          <span className="text-xs text-[var(--texto-suave)]">
            Apenas dados corporativos públicos com proveniência e revisão
          </span>
        </div>

        <div className="mt-4">
          <ContatosProfissionais contatos={contatos} />
        </div>
      </section>

      {/* Seção de Registro e Histórico da Abordagem (Etapa 7) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-label="Registrar resultado da abordagem" className="painel p-6">
          <div className="flex items-center gap-2 border-b border-[var(--borda)] pb-3">
            <UserCheck size={20} className="text-[var(--azul)]" />
            <h2 className="text-base font-bold text-[var(--azul-profundo)]">
              Registrar Resultado da Abordagem
            </h2>
          </div>
          <p className="mt-2 text-xs text-[var(--texto-suave)]">
            Registre os desdobramentos comerciais deste contato diretamente no radar, sem
            necessidade de ferramentas externas.
          </p>
          <FormularioRegistroAbordagem
            contaId={conta.id}
            resultadoAtual={conta.resultadoAbordagem as ResultadoAbordagem}
          />
        </section>

        {/* Histórico Comercial */}
        <section aria-label="Histórico de abordagens" className="painel p-6">
          <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
            <div className="flex items-center gap-2">
              <History size={20} className="text-[var(--azul)]" />
              <h2 className="text-base font-bold text-[var(--azul-profundo)]">
                Histórico Comercial ({conta.historicoAbordagem.length})
              </h2>
            </div>
            <ClasseResultadoAbordagem resultado={conta.resultadoAbordagem} />
          </div>

          {conta.historicoAbordagem.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--texto-suave)]">
              <History size={32} className="mx-auto mb-2 text-slate-300" />
              <p>Nenhuma abordagem comercial registrada ainda para esta conta.</p>
              <p className="mt-1">
                Utilize o formulário ao lado para registrar o primeiro contato ou reunião.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {conta.historicoAbordagem.map((hist) => (
                <div
                  key={hist.id}
                  className="rounded-xl border border-[var(--borda)] bg-slate-50 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <ClasseResultadoAbordagem resultado={hist.resultado} />
                    <span className="text-[var(--texto-suave)] flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(hist.data).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {hist.usuarioResponsavel && (
                    <p className="mt-1 font-semibold text-[var(--azul-profundo)]">
                      Responsável: {hist.usuarioResponsavel}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm text-[var(--texto)]">{hist.observacao}</p>
                  {hist.proximaAcao && (
                    <p className="mt-2 rounded-lg bg-white border border-[var(--borda)] p-2 text-xs text-[var(--azul-profundo)] font-medium">
                      <strong>Próxima ação:</strong> {hist.proximaAcao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Seção de Preparação Futura - Gate "Buscar Responsáveis" (Etapa 8) */}
      <section aria-label="Preparação futura" className="painel mt-6 p-6 border-dashed border-2">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--borda)] pb-3">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-violet-600" />
            <div>
              <h2 className="text-base font-bold text-[var(--azul-profundo)]">
                Prospecção Ativa de Decisores (Planejado — Gate Futuro)
              </h2>
              <p className="text-xs text-[var(--texto-suave)]">
                Fluxo de enriquecimento humano supervisionado para identificação de lideranças em
                compras e facilities.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500 shadow-none"
          >
            <Sparkles size={15} />
            <span>Buscar responsáveis (Desativado)</span>
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2">
            <p className="font-bold text-[var(--azul-profundo)]">
              Fluxo Arquitetural Planejado:
            </p>
            <p className="font-mono text-[11px] text-violet-800 bg-white p-2 rounded border border-[var(--borda)]">
              SOLICITADO → PESQUISANDO → CANDIDATOS_ENCONTRADOS → REVISAO_HUMANA → PERSISTIDO
            </p>
            <p className="text-[var(--texto-suave)]">
              O futuro assistente só apresentará candidatos para validação humana prévia. Nenhuma
              informação será gravada sem verificação e aprovação de um analista.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50/70 p-4 text-xs space-y-1.5 border border-amber-200/60 text-amber-950">
            <p className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldCheck size={16} /> Salvaguardas Éticas Obrigatórias:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[var(--texto-suave)]">
              <li>Proibição estrita de automação de WhatsApp, discadores ou disparos de campanhas.</li>
              <li>Não coleta e não trata dados pessoais (telefones móveis pessoais ou e-mails privados).</li>
              <li>Apenas dados corporativos públicos com URL de evidência auditável.</li>
              <li>Necessária revisão humana antes de qualquer abordagem.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Evidências Rastreáveis */}
      {todasEvidencias.length > 0 && (
        <section aria-label="Evidências rastreáveis" className="painel mt-6 p-6">
          <div className="flex items-center justify-between border-b border-[var(--borda)] pb-3">
            <h2 className="text-base font-bold text-[var(--azul-profundo)]">
              Evidências Rastreáveis ({todasEvidencias.length})
            </h2>
            <span className="text-xs text-[var(--texto-suave)]">
              Fontes primárias e registros com datas de coleta
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todasEvidencias.slice(0, 6).map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-[var(--borda)] bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-[var(--azul-profundo)]">
                  <span className="truncate">{ev.titulo}</span>
                  <MarcadorTipo tipo={ev.tipo as TipoDado} />
                </div>
                <p className="mt-1 text-[var(--texto-suave)] line-clamp-2">{ev.descricao}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Fonte: {ev.fonte?.nome} · Coletado em:{" "}
                  {new Date(ev.dataColeta).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatarMoeda(valor: number | null): string {
  if (valor === null || valor === undefined || valor <= 0) {
    return "Valor não informado no edital";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(data: Date | string | null): string {
  if (!data) return "—";
  try {
    const d = typeof data === "string" ? new Date(data) : data;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return String(data);
  }
}

function formatarCNPJ(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? "Não informado";
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

