import { NivelConfianca, StatusRevisao, TipoDado } from "@prisma/client";

export interface DadosSanitizadosTerceiro {
  cnpj: string;
  provedor: "BRASIL_API";
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  dataSituacao: Date | null;
  dataInicioAtividade: Date | null;
  cnaePrincipal: string | null;
  naturezaJuridica: string | null;
  porte: string | null;
  capitalSocial: number | null;
  municipio: string | null;
  uf: string | null;
  matrizFilial: "MATRIZ" | "FILIAL" | null;
  fonteUrl: string;
  dataConsulta: Date;
  dataReferencia: Date | null;
  hashResposta: string;
  tipoDado: TipoDado;
  confianca: NivelConfianca;
  statusRevisao: StatusRevisao;
}

export interface ResumoProcessamentoTerceiro {
  totalSolicitados: number;
  processados: number;
  sucessos: number;
  naoEncontrados: number;
  erros: number;
  tempoTotalMs: number;
  taxaSucessoPercentual: number;
}
