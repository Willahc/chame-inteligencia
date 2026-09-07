export const STATUS_SOLICITACAO_BUSCA = [
  "PENDENTE",
  "EM_PESQUISA",
  "AGUARDANDO_REVISAO",
  "CONCLUIDA",
  "SEM_CONTATO_VERIFICAVEL",
  "ERRO",
] as const;

export type StatusSolicitacaoBusca = (typeof STATUS_SOLICITACAO_BUSCA)[number];

export type EscopoContatoBusca = "ORGANIZACAO" | "INSTITUICAO";
export type NivelConfiancaBusca = "ALTA" | "MEDIA" | "BAIXA";
export type StatusRevisaoBusca = "APROVADA" | "PENDENTE" | "REJEITADA";
export type TipoDadoBusca =
  | "FATO_OFICIAL"
  | "FATO_PUBLICO"
  | "INFERENCIA"
  | "HIPOTESE"
  | "DEMONSTRACAO"
  | "DADO_TERCEIRO_NAO_CANONICO";

export interface CandidatoResponsavel {
  id?: string;
  nome: string;
  cargo: string;
  area?: string;
  empresa: string;
  urlPublica: string;
  emailCorporativo?: string;
  telefoneProfissional?: string;
  telefoneDepartamental?: string;
  ramal?: string;
  fonteNome: string;
  fonteUrl: string;
  dataEvidencia: string;
  confianca: NivelConfiancaBusca;
  papelComercial: string;
  tipoPapelComercial: TipoDadoBusca;
  tipoDado: TipoDadoBusca;
  escopoContato: EscopoContatoBusca;
  statusRevisao: StatusRevisaoBusca;
  justificativa: string;
  ativo: boolean;
  linkedinSimulado: boolean;
}

export interface ParametrosBuscaResponsaveis {
  contaComercialId: string;
  usuarioSolicitante: string;
  confirmacaoUsuario: boolean;
  termosAdicionais?: string[];
}

export interface SolicitacaoBuscaVisual {
  id: string;
  contaComercialId: string;
  usuarioSolicitante: string;
  status: StatusSolicitacaoBusca;
  dataSolicitacao: string;
  fontesConsultadas: string[];
  termosBusca: string[];
  resultado: string | null;
  confianca: NivelConfiancaBusca;
  limitacoes: string | null;
  contatosEncontrados: CandidatoResponsavel[];
  criadoEm: string;
  atualizadoEm: string;
}
