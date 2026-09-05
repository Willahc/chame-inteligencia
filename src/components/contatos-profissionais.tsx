import { rotuloConfianca } from "./rotulos";

export interface ContatoProfissionalVisual {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  empresa: string;
  linkedinUrl: string | null;
  paginaProfissionalUrl: string | null;
  emailCorporativo: string | null;
  telefoneProfissional: string | null;
  senioridade: string | null;
  papelComercial: string | null;
  indiceQualidade: number;
  justificativaQualidade: string | null;
  tipoDado: string;
  escopoContato: "ORGANIZACAO" | "INSTITUICAO";
  tipoPapelComercial: string;
  confianca: "ALTA" | "MEDIA" | "BAIXA";
  dataEvidencia: Date;
  observacao: string | null;
  linkedinSimulado: boolean;
  fonte: { nome: string; url: string | null };
}

export function ContatosProfissionais({ contatos }: { contatos: ContatoProfissionalVisual[] }) {
  if (contatos.length === 0) return <p className="mt-5 text-sm text-[var(--texto-suave)]">Nenhum contato profissional registrado.</p>;
  return <div className="mt-5 grid gap-4 lg:grid-cols-2">{contatos.map((contato) => <article className="rounded-xl border border-[var(--borda)] bg-slate-50 p-5" key={contato.id}>
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{contato.nome}</h3><p className="mt-1 text-sm text-[var(--texto-suave)]">{contato.cargo ?? "Cargo não informado"}{contato.area ? ` — ${contato.area}` : ""}</p><p className="mt-1 text-xs font-semibold text-[var(--texto-suave)]">Escopo: {contato.escopoContato === "INSTITUICAO" ? "Instituição" : "Organização / rede"}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${contato.tipoDado === "DEMONSTRACAO" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-teal-200 bg-teal-50 text-teal-800"}`}>{contato.tipoDado === "DEMONSTRACAO" ? "DEMONSTRAÇÃO" : "Fato público"}</span></div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Papel comercial</dt><dd className="mt-1">{contato.papelComercial ?? "Não definido"} <span className="text-xs text-[var(--texto-suave)]">({contato.tipoPapelComercial === "INFERENCIA" ? "inferência" : "simulado"})</span></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Qualidade do contato</dt><dd className="mt-1 font-bold">{contato.indiceQualidade}/100</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Confiança</dt><dd className="mt-1">{rotuloConfianca[contato.confianca]}</dd></div>{contato.senioridade && <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">Senioridade</dt><dd className="mt-1">{contato.senioridade}</dd></div>}</dl>
    <div className="mt-4 space-y-1 text-sm">{contato.linkedinSimulado ? <p className="font-semibold text-amber-800">LinkedIn — DEMONSTRAÇÃO (perfil simulado)</p> : contato.linkedinUrl ? <a className="font-bold text-[var(--azul)] hover:underline" href={contato.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn público</a> : contato.paginaProfissionalUrl ? <a className="font-bold text-[var(--azul)] hover:underline" href={contato.paginaProfissionalUrl} target="_blank" rel="noreferrer">Página profissional pública</a> : <p className="text-[var(--texto-suave)]">Perfil profissional não informado</p>}{contato.emailCorporativo && <p><span className="font-semibold">E-mail corporativo:</span> {contato.emailCorporativo}</p>}{contato.telefoneProfissional && <p><span className="font-semibold">Telefone profissional:</span> {contato.telefoneProfissional}</p>}</div>
    {contato.justificativaQualidade && <p className="mt-3 text-xs leading-5 text-[var(--texto-suave)]"><strong>Justificativa da qualidade:</strong> {contato.justificativaQualidade}</p>}
    <p className="mt-3 text-xs leading-5 text-[var(--texto-suave)]">Fonte: {contato.fonte.url ? <a className="underline" href={contato.fonte.url} target="_blank" rel="noreferrer">{contato.fonte.nome}</a> : contato.fonte.nome} · Evidência de {new Date(contato.dataEvidencia).toLocaleDateString("pt-BR")}</p>
    {contato.observacao && <p className="mt-2 text-xs leading-5 text-[var(--texto-suave)]">{contato.observacao}</p>}
  </article>)}</div>;
}
