export const TIPOS_DADO = [
  "FATO_OFICIAL",
  "FATO_PUBLICO",
  "INFERENCIA",
  "HIPOTESE",
  "DEMONSTRACAO",
] as const;

export type TipoDado = (typeof TIPOS_DADO)[number];
export type NivelConfianca = "ALTA" | "MEDIA" | "BAIXA";
export type StatusRevisao = "APROVADA" | "PENDENTE" | "REJEITADA";
export type FaixaPrioridade = "MUITO_ALTA" | "ALTA" | "MODERADA" | "BAIXA";
export type Porte = "PEQUENO" | "MEDIO" | "GRANDE" | "MUITO_GRANDE";

export interface EvidenciaDominio {
  id: string;
  titulo: string;
  descricao: string;
  observacao?: string;
  dataColeta: string;
  dataReferencia?: string;
  tipo: TipoDado;
  confianca: NivelConfianca;
  statusRevisao: StatusRevisao;
  fonte: {
    id: string;
    nome: string;
    url?: string;
    identificador?: string;
    tipoDado: TipoDado;
  };
}

export interface InstituicaoRadar {
  id: string;
  slug: string;
  nome: string;
  grupo: string | null;
  municipio: string;
  municipios: string[];
  tipo: string;
  quantidadeUnidades: number;
  operacao24h: boolean;
  possuiExpansao: boolean;
  indice: number;
  faixa: FaixaPrioridade;
  principalMotivo: string;
  qualidadeEvidencias: NivelConfianca;
  acaoRecomendada: string;
  tipoDado: TipoDado;
  cnes?: string | null;
  coberturaDados?: number;
}

export interface InstituicaoAssistente extends InstituicaoRadar {
  descricao: string;
  evidencias: EvidenciaDominio[];
}
