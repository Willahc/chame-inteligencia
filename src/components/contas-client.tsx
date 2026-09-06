"use client";

import Link from "next/link";
import {
  Building2,
  Filter,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ClasseAcaoComercial,
  ClasseFaixa,
  ClasseNatureza,
  ClasseResultadoAbordagem,
  ClasseVinculo,
  rotuloConfianca,
  rotuloStatusRevisao,
} from "./rotulos";
import type { ContaComercialCompleta } from "@/lib/dados";

export function ContasClient({ contas }: { contas: ContaComercialCompleta[] }) {
  const [texto, setTexto] = useState("");
  const [faixa, setFaixa] = useState("");
  const [natureza, setNatureza] = useState("");
  const [vinculo, setVinculo] = useState("");
  const [confianca, setConfianca] = useState("");
  const [statusRevisao, setStatusRevisao] = useState("");
  const [resultadoComercial, setResultadoComercial] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [somenteMultiUnidade, setSomenteMultiUnidade] = useState(false);
  const [somenteComContatos, setSomenteComContatos] = useState(false);
  const [ordenacao, setOrdenacao] = useState<"prioridade" | "unidades" | "nome">("prioridade");
  const [pagina, setPagina] = useState(1);
  const porPagina = 40;

  const resumos = useMemo(() => {
    return contas.map((conta) => {
      let cidadesArray: string[] = [];
      try {
        cidadesArray = JSON.parse(conta.cidades);
      } catch {
        cidadesArray = conta.cidades ? [conta.cidades] : [];
      }

      const totalContatos = conta.quantidadeContatos;
      const possuiHospital = conta.quantidadeHospitais > 0;
      const segmento =
        conta.grupoEconomico?.instituicoes?.find(
          (i) => i.segmentacao?.segmento === "NUCLEO_HOSPITALAR",
        )?.segmentacao?.segmento ??
        conta.grupoEconomico?.instituicoes?.find((i) => i.segmentacao?.segmento)
          ?.segmentacao?.segmento ??
        "BAIXA_PRIORIDADE_INICIAL";

      return {
        id: conta.id,
        nome: conta.nome,
        tipoDado: conta.tipoDado,
        tipoVinculo: conta.tipoVinculo,
        confiancaOrganizacional: conta.confiancaOrganizacional,
        natureza: conta.natureza,
        quantidadeUnidades: conta.quantidadeUnidades,
        quantidadeHospitais: conta.quantidadeHospitais,
        cidades: cidadesArray,
        coberturaDados: conta.coberturaDados,
        statusRevisao: conta.statusRevisao,
        indicePrioridadeComercial: conta.indicePrioridadeComercial,
        faixaPrioridadeComercial: conta.faixaPrioridadeComercial,
        acaoRecomendada: conta.acaoRecomendada,
        justificativaAcao: conta.justificativaAcao,
        resultadoAbordagem: conta.resultadoAbordagem,
        totalContatos,
        possuiHospital,
        segmento,
      };
    });
  }, [contas]);

  const textoNorm = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const cidadeNorm = cidadeFiltro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const filtradas = useMemo(() => {
    return resumos
      .filter((c) => {
        if (!textoNorm) return true;
        const alvo = `${c.nome} ${c.cidades.join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return alvo.includes(textoNorm);
      })
      .filter((c) => !faixa || c.faixaPrioridadeComercial === faixa)
      .filter((c) => !natureza || c.natureza === natureza)
      .filter((c) => !vinculo || c.tipoVinculo === vinculo)
      .filter((c) => !confianca || c.confiancaOrganizacional === confianca)
      .filter((c) => !statusRevisao || c.statusRevisao === statusRevisao)
      .filter((c) => !resultadoComercial || c.resultadoAbordagem === resultadoComercial)
      .filter((c) => {
        if (!cidadeNorm) return true;
        return c.cidades.some((cid) =>
          cid
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(cidadeNorm),
        );
      })
      .filter((c) => !somenteMultiUnidade || c.quantidadeUnidades > 1)
      .filter((c) => !somenteComContatos || c.totalContatos > 0)
      .sort((a, b) => {
        if (ordenacao === "prioridade") {
          return (
            b.indicePrioridadeComercial - a.indicePrioridadeComercial ||
            b.quantidadeUnidades - a.quantidadeUnidades ||
            a.nome.localeCompare(b.nome, "pt-BR")
          );
        }
        if (ordenacao === "unidades") {
          return (
            b.quantidadeUnidades - a.quantidadeUnidades ||
            b.indicePrioridadeComercial - a.indicePrioridadeComercial ||
            a.nome.localeCompare(b.nome, "pt-BR")
          );
        }
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [
    resumos,
    textoNorm,
    cidadeNorm,
    faixa,
    natureza,
    vinculo,
    confianca,
    statusRevisao,
    resultadoComercial,
    somenteMultiUnidade,
    somenteComContatos,
    ordenacao,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  function limparFiltros() {
    setTexto("");
    setFaixa("");
    setNatureza("");
    setVinculo("");
    setConfianca("");
    setStatusRevisao("");
    setResultadoComercial("");
    setCidadeFiltro("");
    setSomenteMultiUnidade(false);
    setSomenteComContatos(false);
    setOrdenacao("prioridade");
    setPagina(1);
  }

  return (
    <div className="mt-7">
      <section aria-label="Filtros de contas comerciais" className="painel p-5">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--borda)] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--azul-profundo)]">
            <Filter size={18} className="text-[var(--azul)]" />
            <span>Filtros do Radar Comercial</span>
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--azul)] hover:bg-slate-100"
            onClick={limparFiltros}
            type="button"
          >
            <RotateCcw size={14} />
            Limpar filtros
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Buscar Conta
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white pl-9 pr-3 text-sm"
                placeholder="Nome da organização, rede ou mantenedora"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Faixa de Prioridade
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              value={faixa}
              onChange={(e) => {
                setFaixa(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas as faixas</option>
              <option value="MUITO_ALTA">Muito Alta (≥ 80)</option>
              <option value="ALTA">Alta (60–79)</option>
              <option value="MODERADA">Moderada (40–59)</option>
              <option value="BAIXA">Baixa (&lt; 40)</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Natureza
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              value={natureza}
              onChange={(e) => {
                setNatureza(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas</option>
              <option value="PRIVADO">Privada</option>
              <option value="PUBLICO">Pública</option>
              <option value="INDETERMINADO">Indeterminada</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Resultado Comercial
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              value={resultadoComercial}
              onChange={(e) => {
                setResultadoComercial(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos os status</option>
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
              Cidade / Município
            </span>
            <input
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              placeholder="Filtrar por cidade"
              value={cidadeFiltro}
              onChange={(e) => {
                setCidadeFiltro(e.target.value);
                setPagina(1);
              }}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Tipo de Vínculo
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              value={vinculo}
              onChange={(e) => {
                setVinculo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos os vínculos</option>
              <option value="OFICIAL">Oficial</option>
              <option value="PROVAVEL">Provável (hipótese)</option>
              <option value="ISOLADO">Isolado</option>
              <option value="INCERTO">Incerto (revisão)</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Confiança
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              value={confianca}
              onChange={(e) => {
                setConfianca(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Status de Revisão
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm"
              value={statusRevisao}
              onChange={(e) => {
                setStatusRevisao(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              <option value="APROVADO">Aprovado</option>
              <option value="NAO_REVISADO">Não revisado</option>
              <option value="AJUSTE_NECESSARIO">Ajuste necessário</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
              Ordenar Por
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-white px-3 text-sm font-medium"
              value={ordenacao}
              onChange={(e) => {
                setOrdenacao(e.target.value as "prioridade" | "unidades" | "nome");
                setPagina(1);
              }}
            >
              <option value="prioridade">Prioridade Comercial (Decrescente)</option>
              <option value="unidades">Mais Unidades</option>
              <option value="nome">Nome Alfabético</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-[var(--borda)] pt-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <input
              type="checkbox"
              className="size-4 rounded accent-[var(--azul)]"
              checked={somenteMultiUnidade}
              onChange={(e) => {
                setSomenteMultiUnidade(e.target.checked);
                setPagina(1);
              }}
            />
            Somente contas multiunidade
          </label>
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <input
              type="checkbox"
              className="size-4 rounded accent-[var(--azul)]"
              checked={somenteComContatos}
              onChange={(e) => {
                setSomenteComContatos(e.target.checked);
                setPagina(1);
              }}
            />
            Somente com contatos públicos verificados
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--borda)] pt-3 text-xs text-[var(--texto-suave)]">
          <p>
            Exibindo <strong className="text-[var(--texto)]">{filtradas.length}</strong> de{" "}
            {resumos.length} contas · Página {paginaAtual} de {totalPaginas}
          </p>
        </div>
      </section>

      <section
        aria-label="Tabela de contas comerciais"
        className="painel mt-5 overflow-hidden"
      >
        {filtradas.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Building2 className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-3 text-lg font-bold text-[var(--azul-profundo)]">
              Nenhuma conta encontrada
            </h2>
            <p className="mt-1 text-sm text-[var(--texto-suave)]">
              Ajuste ou limpe os filtros para visualizar outras contas do radar.
            </p>
            <button
              onClick={limparFiltros}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--azul-profundo)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--azul)]"
              type="button"
            >
              <RotateCcw size={16} /> Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[var(--texto-suave)]">
                  <tr>
                    <th className="px-4 py-3.5 pl-6 font-semibold">Conta Comercial</th>
                    <th className="px-3 py-3.5 text-center font-semibold">Unid.</th>
                    <th className="px-3 py-3.5 text-center font-semibold">Hosp.</th>
                    <th className="px-4 py-3.5 font-semibold">Cidades</th>
                    <th className="px-3 py-3.5 font-semibold">Natureza</th>
                    <th className="px-3 py-3.5 text-center font-semibold">Índice</th>
                    <th className="px-3 py-3.5 font-semibold">Faixa</th>
                    <th className="px-3 py-3.5 text-center font-semibold">Contatos</th>
                    <th className="px-4 py-3.5 font-semibold">Ação Recomendada</th>
                    <th className="px-3 py-3.5 font-semibold">Status Abordagem</th>
                    <th className="px-3 py-3.5 pr-6 font-semibold">Revisão</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((conta) => (
                    <tr
                      key={conta.id}
                      className="border-t border-[var(--borda)] align-top transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4 pl-6">
                        <Link
                          href={`/contas/${conta.id}`}
                          className="font-bold text-[var(--azul)] hover:underline"
                        >
                          {conta.nome}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--texto-suave)]">
                          <ClasseVinculo vinculo={conta.tipoVinculo} />
                          <span>Confiança {rotuloConfianca[conta.confiancaOrganizacional]}</span>
                          {conta.tipoDado === "DEMONSTRACAO" && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">
                              DEMONSTRAÇÃO
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center font-bold">
                        {conta.quantidadeUnidades}
                      </td>

                      <td className="px-3 py-4 text-center font-bold">
                        {conta.quantidadeHospitais}
                      </td>

                      <td className="max-w-44 px-4 py-4 text-xs text-[var(--texto-suave)]">
                        {conta.cidades.length > 0
                          ? conta.cidades.slice(0, 2).join(", ") +
                            (conta.cidades.length > 2 ? ` (+${conta.cidades.length - 2})` : "")
                          : "Não informada"}
                      </td>

                      <td className="px-3 py-4">
                        <ClasseNatureza natureza={conta.natureza} />
                      </td>

                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--azul-profundo)] text-sm font-bold text-white shadow-xs">
                          {conta.indicePrioridadeComercial}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <ClasseFaixa faixa={conta.faixaPrioridadeComercial} />
                      </td>

                      <td className="px-3 py-4 text-center">
                        {conta.totalContatos > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                            <Users size={13} />
                            {conta.totalContatos}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </td>

                      <td className="max-w-60 px-4 py-4">
                        <ClasseAcaoComercial acao={conta.acaoRecomendada} />
                        {conta.justificativaAcao && (
                          <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--texto-suave)]">
                            {conta.justificativaAcao}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <ClasseResultadoAbordagem resultado={conta.resultadoAbordagem} />
                      </td>

                      <td className="px-3 py-4 pr-6">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            conta.statusRevisao === "APROVADO"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                        >
                          {rotuloStatusRevisao[conta.statusRevisao] ?? conta.statusRevisao}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--borda)] p-4">
              <p className="text-xs text-[var(--texto-suave)]">
                Mostrando {(paginaAtual - 1) * porPagina + 1}–
                {Math.min(paginaAtual * porPagina, filtradas.length)} de {filtradas.length} contas
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-sm font-bold disabled:opacity-40"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <span className="px-2 text-sm text-[var(--texto-suave)]">
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <button
                  className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-sm font-bold disabled:opacity-40"
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  type="button"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
