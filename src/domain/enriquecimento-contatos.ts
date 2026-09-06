import { z } from "zod";
import type { NivelConfianca } from "./tipos";

export const STATUS_ENRIQUECIMENTO = [
  "SOLICITADO",
  "PESQUISANDO",
  "CANDIDATOS_ENCONTRADOS",
  "REVISAO_HUMANA",
  "PERSISTIDO",
  "SEM_CANDIDATO_VERIFICAVEL",
  "CANCELADO",
] as const;

export type StatusEnriquecimento = (typeof STATUS_ENRIQUECIMENTO)[number];
export type EscopoEnriquecimento = "ORGANIZACAO" | "INSTITUICAO";

export interface CandidatoContatoProfissional {
  nome: string;
  cargo?: string;
  area?: string;
  empresa: string;
  escopo: EscopoEnriquecimento;
  linkedinUrl?: string;
  paginaProfissionalUrl?: string;
  emailCorporativo?: string;
  telefoneProfissional?: string;
  telefoneDepartamental?: string;
  ramal?: string;
  fonteUrl: string;
  dataEvidencia: string;
  confianca: NivelConfianca;
  papelComercial?: string;
}

export const candidatoContatoSchema = z.object({
  nome: z.string().trim().min(2),
  cargo: z.string().trim().min(2).optional(),
  area: z.string().trim().min(2).optional(),
  empresa: z.string().trim().min(2),
  escopo: z.enum(["ORGANIZACAO", "INSTITUICAO"]),
  linkedinUrl: z.url().optional(),
  paginaProfissionalUrl: z.url().optional(),
  emailCorporativo: z.email().optional(),
  telefoneProfissional: z.string().trim().min(3).optional(),
  telefoneDepartamental: z.string().trim().min(3).optional(),
  ramal: z.string().trim().min(1).optional(),
  fonteUrl: z.url(),
  dataEvidencia: z.iso.datetime(),
  confianca: z.enum(["ALTA", "MEDIA", "BAIXA"]),
  papelComercial: z.string().trim().min(2).optional(),
}).superRefine((candidato, contexto) => {
  const url = candidato.linkedinUrl ?? candidato.paginaProfissionalUrl;
  if (!url) {
    contexto.addIssue({
      code: "custom",
      path: ["linkedinUrl"],
      message: "O candidato precisa de perfil ou página profissional pública.",
    });
  }
  if (candidato.emailCorporativo && /@(gmail|hotmail|outlook|yahoo)\./i.test(candidato.emailCorporativo)) {
    contexto.addIssue({
      code: "custom",
      path: ["emailCorporativo"],
      message: "E-mail pessoal ou de provedor genérico não é permitido.",
    });
  }
});

const TRANSICOES: Record<StatusEnriquecimento, readonly StatusEnriquecimento[]> = {
  SOLICITADO: ["PESQUISANDO", "CANCELADO"],
  PESQUISANDO: ["CANDIDATOS_ENCONTRADOS", "SEM_CANDIDATO_VERIFICAVEL", "CANCELADO"],
  CANDIDATOS_ENCONTRADOS: ["REVISAO_HUMANA", "PESQUISANDO", "CANCELADO"],
  REVISAO_HUMANA: ["PERSISTIDO", "PESQUISANDO", "CANCELADO"],
  PERSISTIDO: ["PESQUISANDO"],
  SEM_CANDIDATO_VERIFICAVEL: ["SOLICITADO", "PESQUISANDO"],
  CANCELADO: ["SOLICITADO"],
};

export function podeTransicionarEnriquecimento(
  atual: StatusEnriquecimento,
  proximo: StatusEnriquecimento,
): boolean {
  return TRANSICOES[atual].includes(proximo);
}

export function validarCandidatoContato(input: unknown) {
  return candidatoContatoSchema.safeParse(input);
}

export function chaveDeduplicacaoContato(candidato: Pick<CandidatoContatoProfissional, "nome" | "empresa" | "linkedinUrl">): string {
  const nome = candidato.nome.trim().toLocaleLowerCase("pt-BR");
  const empresa = candidato.empresa.trim().toLocaleLowerCase("pt-BR");
  return `${nome}|${empresa}|${candidato.linkedinUrl?.trim().toLocaleLowerCase() ?? "sem-perfil"}`;
}
