export const TIPOS_DADO = [
  "FATO_OFICIAL",
  "FATO_PUBLICO",
  "INFERENCIA",
  "HIPOTESE",
  "DEMONSTRACAO",
] as const;

export type TipoDado = (typeof TIPOS_DADO)[number];
export type NivelConfianca = "ALTA" | "MEDIA" | "BAIXA";
export type TipoVinculo = "OFICIAL" | "PROVAVEL" | "ISOLADO" | "INCERTO";
export type NaturezaClasse = "PUBLICO" | "PRIVADO" | "INDETERMINADO";
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

export interface SegmentacaoRadar {
  segmento: string;
  faixaAderencia: string;
  confianca: NivelConfianca;
  indiceAderencia: number;
  versaoRegra: string;
  justificativa: string;
  regraAplicada: string;
  statusRevisao: string;
  precisaRevisao: boolean;
}

export interface OrganizacaoRadar {
  id: string;
  nome: string;
  nomeNormalizado: string | null;
  tipoDado: TipoDado;
  tipoVinculo: TipoVinculo;
  confianca: NivelConfianca;
  natureza: NaturezaClasse;
  quantidadeUnidades: number;
  statusRevisao: string;
  regraAgrupamento: string | null;
  versaoRegra: string | null;
  tipoEvidencia: string | null;
  observacao: string | null;
  dataCalculo?: string;
  precisaRevisao: boolean;
}

export interface InstituicaoRadar {
  id: string;
  slug: string;
  nome: string;
  grupo: string | null;
  organizacao?: OrganizacaoRadar | null;
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
  segmentacao?: SegmentacaoRadar | null;
}

export interface InstituicaoAssistente extends InstituicaoRadar {
  descricao: string;
  evidencias: EvidenciaDominio[];
}
