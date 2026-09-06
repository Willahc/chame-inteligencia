import Link from "next/link";
import { AlertCircle, Car, ExternalLink, FileSearch, Landmark } from "lucide-react";

export interface SinalContratacaoRelacionado {
  id: string;
  identificadorPNCP: string;
  objeto: string;
  modalidade: string;
  dataPublicacao: Date | string;
  valorEstimado: number | null;
  cnpjOrgao: string | null;
  razaoSocialOrgao: string | null;
  municipio?: string | null;
  uf?: string | null;
  sinalMobilidade: boolean;
  urlPublica: string | null;
  metodoVinculo: string | null;
  confiancaVinculo?: string | null;
  tipoDado: string;
  confianca: string;
  fonte: {
    nome: string;
    url?: string | null;
  };
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

function formatarData(data: Date | string): string {
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

export function SecaoContratacoesRelacionadas({
  sinais,
  limiteInicial = 5,
}: {
  sinais: SinalContratacaoRelacionado[];
  limiteInicial?: number;
}) {
  // Filtrar estritamente apenas vínculos por CNPJ exato
  const sinaisExatos = sinais.filter(
    (s) => s.metodoVinculo === "CNPJ_ESTABELECIMENTO" || s.metodoVinculo === "CNPJ_MANTENEDORA"
  );
  const totalMobilidade = sinaisExatos.filter((s) => s.sinalMobilidade).length;

  return (
    <section className="painel mt-6 p-6" aria-labelledby="contratacoes-publicas-titulo">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--borda)] pb-4">
        <div className="flex items-center gap-3">
          <Landmark className="text-[var(--azul)]" size={22} aria-hidden="true" />
          <div>
            <h2 id="contratacoes-publicas-titulo" className="text-lg font-bold text-[var(--azul-profundo)]">
              Contratações públicas relacionadas
            </h2>
            <p className="text-xs text-[var(--texto-suave)]">
              Editais e dispensas coletados via Portal Nacional de Contratações Públicas (PNCP)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {sinaisExatos.length} processo(s) por CNPJ oficial
          </span>
          {totalMobilidade > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Car size={13} aria-hidden="true" />
              {totalMobilidade} de mobilidade
            </span>
          )}
        </div>
      </div>

      {/* Aviso Obrigatório de Governança */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-900">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />
        <p>
          <strong>Aviso de Governança:</strong> Sinal público observado; <strong>não representa contrato confirmado</strong>,
          cliente da Chame Táxi ou oportunidade garantida. O vínculo foi estabelecido exclusivamente por igualdade exata de CNPJ oficial
          (mantenedora ou estabelecimento), sem vinculação por similaridade de nome ou inferência não verificada.
        </p>
      </div>

      {sinaisExatos.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--borda)] p-8 text-center">
          <FileSearch className="mx-auto size-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-[var(--texto)]">
            Nenhuma contratação pública do PNCP vinculada por CNPJ exato a esta entidade.
          </p>
          <p className="mt-1 text-xs text-[var(--texto-suave)]">
            Apenas processos com CNPJ de mantenedora ou estabelecimento exatamente coincidente são exibidos.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3.5">
          {sinaisExatos.slice(0, limiteInicial).map((sinal) => (
            <article
              key={sinal.id}
              className={`rounded-xl border p-4 transition ${
                sinal.sinalMobilidade
                  ? "border-[var(--ciano)]/40 bg-[var(--ciano)]/[0.03]"
                  : "border-[var(--borda)] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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

              <h3 className="mt-2.5 text-sm font-semibold leading-snug text-[var(--texto)]">
                {sinal.objeto}
              </h3>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-[var(--texto-suave)]">
                <div>
                  <span className="font-semibold text-slate-700">Órgão: </span>
                  {sinal.razaoSocialOrgao || "Não nomeado"} · CNPJ {formatarCNPJ(sinal.cnpjOrgao)}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Valor Estimado: </span>
                  <strong className="text-[var(--azul)]">{formatarMoeda(sinal.valorEstimado)}</strong>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs pt-1">
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
            </article>
          ))}

          {sinaisExatos.length > limiteInicial && (
            <div className="pt-2 text-center">
              <Link
                href="/contratacoes-publicas"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--borda)] bg-slate-50 px-4 py-2 text-xs font-bold text-[var(--azul)] hover:bg-slate-100"
              >
                Ver todos os {sinaisExatos.length} sinais vinculados no Painel de Contratações →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
