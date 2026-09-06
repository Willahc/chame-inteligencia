import { z } from "zod";
import { TIPOS_DADO, type EvidenciaDominio, type NivelConfianca } from "./tipos";

export const evidenciaSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(3),
  descricao: z.string().min(3),
  observacao: z.string().optional(),
  dataColeta: z.iso.datetime(),
  dataReferencia: z.iso.datetime().optional(),
  tipo: z.enum(TIPOS_DADO),
  confianca: z.enum(["ALTA", "MEDIA", "BAIXA"]),
  statusRevisao: z.enum(["APROVADA", "PENDENTE", "REJEITADA"]),
  fonte: z.object({
    id: z.string().min(1),
    nome: z.string().min(2),
    url: z.url().optional(),
    identificador: z.string().min(1).optional(),
    tipoDado: z.enum(TIPOS_DADO),
  }).refine((fonte) => Boolean(fonte.url || fonte.identificador), {
    message: "A fonte deve possuir URL ou identificador.",
  }),
});

const valorConfianca: Record<NivelConfianca, number> = {
  ALTA: 3,
  MEDIA: 2,
  BAIXA: 1,
};

export function qualidadeGeralEvidencias(evidencias: EvidenciaDominio[]): NivelConfianca {
  const revisadas = evidencias.filter((item) => item.statusRevisao === "APROVADA");
  if (revisadas.length === 0) return "BAIXA";
  const media = revisadas.reduce((soma, item) => soma + valorConfianca[item.confianca], 0) / revisadas.length;
  if (media >= 2.5) return "ALTA";
  if (media >= 1.5) return "MEDIA";
  return "BAIXA";
}

export function possuiEvidenciaSuficiente(evidencias: EvidenciaDominio[]): boolean {
  return evidencias.some(
    (item) => item.statusRevisao === "APROVADA" && item.confianca !== "BAIXA",
  );
}

export const rotulosTipoDado: Record<(typeof TIPOS_DADO)[number], string> = {
  FATO_OFICIAL: "Fato oficial",
  FATO_PUBLICO: "Fato público",
  INFERENCIA: "Inferência",
  HIPOTESE: "Hipótese",
  DEMONSTRACAO: "Demonstração",
  DADO_TERCEIRO_NAO_CANONICO: "Dado de terceiro não canônico",
};
