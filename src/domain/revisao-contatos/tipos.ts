import type { EscopoContato } from "@prisma/client";
import type {
  NivelConfianca,
  StatusRevisao,
  TipoDado,
} from "../tipos";

export const STATUS_DECISAO_CONTATO = [
  "PENDENTE",
  "APROVADO",
  "REJEITADO",
  "DESATIVADO",
  "REVISAR_NOVAMENTE",
] as const;

export type StatusDecisaoContato = (typeof STATUS_DECISAO_CONTATO)[number];

export const ACOES_REVISAO_CONTATO = [
  "APROVAR",
  "REJEITAR",
  "DESATIVAR",
  "REVISAR_NOVAMENTE",
  "CORRIGIR_CLASSIFICACAO",
] as const;

export type AcaoRevisaoContato = (typeof ACOES_REVISAO_CONTATO)[number];

export interface RegistroHistoricoDecisao {
  id: string;
  contatoId: string;
  usuario: string;
  dataHora: string;
  acao: string;
  statusAnterior: StatusDecisaoContato | null;
  statusNovo: StatusDecisaoContato;
  motivo: string | null;
  valorAnterior: string | null;
  valorNovo: string | null;
  observacao: string | null;
  evidenciaUtilizada: string | null;
}

export interface ContatoParaRevisao {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  empresa: string;
  escopoContato: EscopoContato;
  organizacaoOuInstituicaoNome: string;
  papelComercial: string | null;
  tipoPapelComercial: TipoDado;
  confianca: NivelConfianca;
  fonteNome: string;
  fonteUrl: string | null;
  dataEvidencia: string;
  justificativa: string | null;
  limitacoes: string | null;
  classificacaoCanonica: TipoDado;
  statusDecisao: StatusDecisaoContato;
  statusRevisao: StatusRevisao;
  ativo: boolean;
  emailCorporativo?: string | null;
  telefoneProfissional?: string | null;
  telefoneDepartamental?: string | null;
  ramal?: string | null;
  linkedinUrl?: string | null;
  paginaProfissionalUrl?: string | null;
  observacao?: string | null;
  grupoEconomicoId?: string | null;
  instituicaoId?: string | null;
  historicoDecisoes: RegistroHistoricoDecisao[];
}

export interface FiltrosRevisaoContatos {
  status?: StatusDecisaoContato | "TODOS";
  confianca?: NivelConfianca | "TODAS";
  escopo?: EscopoContato | "TODOS";
  organizacaoId?: string;
  instituicaoId?: string;
  fonteId?: string;
  apenasPendentes?: boolean;
  busca?: string;
  modo?: "MODO_REAL" | "MODO_DEMONSTRACAO";
}

export interface ResumoContadoresRevisao {
  total: number;
  pendentes: number;
  aprovados: number;
  rejeitados: number;
  desativados: number;
  revisarNovamente: number;
}

export interface ParametrosDecisaoContato {
  contatoId: string;
  usuario: string;
  acao: AcaoRevisaoContato;
  motivo?: string;
  observacao?: string;
  evidenciaUtilizada?: string;
  novosDados?: {
    papelComercial?: string;
    area?: string;
    senioridade?: string;
    justificativa?: string;
  };
}
