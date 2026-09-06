import type { NivelConfianca, StatusRevisao, TipoDado } from "@/domain/tipos";

export interface RegistroPNCPBruto {
  numeroControlePNCP?: string | null;
  modalidadeId?: number | null;
  modalidadeNome?: string | null;
  dataPublicacaoPncp?: string | null;
  objetoCompra?: string | null;
  informacaoComplementar?: string | null;
  valorTotalEstimado?: number | null;
  orgao?: unknown;
  unidade?: unknown;
  linkSistemaOrigem?: string | null;
  keywordsEncontradas?: string[] | null;
  sinalMobilidade?: boolean | null;
  [key: string]: unknown;
}

export interface ArquivoPNCPBruto {
  fonte?: string;
  urlBase?: string;
  dataExtracao?: string;
  periodoConsulta?: {
    dataInicial?: string;
    dataFinal?: string;
    uf?: string;
  };
  modalidadesConsultadas?: string[];
  totalRegistrosAnalisados?: number;
  totalCorrespondencias?: number;
  totalSinaisMobilidade?: number;
  registros?: RegistroPNCPBruto[];
}

export interface SinalContratacaoValidado {
  identificadorPNCP: string;
  objeto: string;
  modalidade: string;
  dataPublicacao: Date;
  valorEstimado: number | null;
  cnpjOrgao: string | null;
  razaoSocialOrgao: string | null;
  municipio: string | null;
  uf: string | null;
  palavrasChave: string[];
  sinalMobilidade: boolean;
  urlPublica: string | null;
  hashRegistro: string;
  tipoDado: TipoDado;
  confianca: NivelConfianca;
  statusRevisao: StatusRevisao;
}

export interface RegistroRejeitadoPNCP {
  indice: number;
  identificadorPNCP?: string;
  motivo: string;
  dadosParciais?: Record<string, unknown>;
}

export interface ResultadoValidacaoPNCP {
  validos: SinalContratacaoValidado[];
  rejeitados: RegistroRejeitadoPNCP[];
  totalLidos: number;
  totalMobilidade: number;
  totalComCNPJ: number;
}

export interface ResultadoIngestaoPNCP {
  loteId: string;
  arquivoOrigem: string;
  hashArquivo: string;
  dataReferencia: Date;
  totalLidos: number;
  totalAceitos: number;
  totalRejeitados: number;
  totalInseridos: number;
  totalAtualizados: number;
  totalInalterados: number;
  totalMobilidade: number;
  totalVinculadosCNPJ: number;
  totalSemVinculo: number;
  rejeicoes: RegistroRejeitadoPNCP[];
}
