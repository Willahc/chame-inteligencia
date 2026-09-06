import { NivelConfianca, StatusRevisao, TipoDado } from "../tipos";

export const TIPOS_RESOLUCAO_CNPJ = [
  "EXATO_CNPJ",
  "MESMO_CNPJ_BASICO",
  "MATRIZ_FILIAL",
  "NAO_RESOLVIDO",
  "CONFLITO",
] as const;

export type TipoResolucaoCNPJ = (typeof TIPOS_RESOLUCAO_CNPJ)[number];

export interface RegistroEmpresaRFB {
  cnpjBasico: string;
  razaoSocial: string;
  naturezaJuridica: string;
  qualificacaoResponsavel: string;
  capitalSocial: number;
  porteEmpresa: string;
  enteFederativoResponsavel?: string;
}

export interface RegistroEstabelecimentoRFB {
  cnpjBasico: string;
  cnpjOrdem: string;
  cnpjDv: string;
  cnpjCompleto: string;
  identificadorMatrizFilial: number; // 1 = MATRIZ, 2 = FILIAL
  nomeFantasia?: string;
  situacaoCadastral: string; // 01=NULA, 02=ATIVA, 03=SUSPENSA, 04=INAPTA, 08=BAIXADA
  dataSituacaoCadastral?: Date;
  motivoSituacaoCadastral?: string;
  dataInicioAtividade?: Date;
  cnaeFiscalPrincipal?: string;
  cnaeFiscalSecundaria?: string;
  tipoLogradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
}

export interface CandidatoCnesCNPJ {
  instituicaoId: string;
  instituicaoNome: string;
  cnes: string | null;
  cnpjCnes: string | null;
  cnpjBasicoCnes: string | null;
  possuiCnpjValido: boolean;
}

export interface DivergenciaCadastro {
  campo: string;
  valorCnes: unknown;
  valorReceita: unknown;
  descricao: string;
}

export interface ContratoResolucaoCNPJ {
  instituicaoId: string;
  cnes: string | null;
  cnpjCnes: string | null;
  cnpjBasicoCnes: string | null;
  empresaReceitaId?: string | null;
  tipoResolucao: TipoResolucaoCNPJ;
  tipoDado: TipoDado;
  confianca: NivelConfianca;
  statusRevisao: StatusRevisao;
  metodo: string;
  justificativa?: string;
  divergencias?: DivergenciaCadastro[];
  empresaReceita?: {
    cnpj: string;
    cnpjBasico: string;
    identificadorMatrizFilial: number | null;
    razaoSocial: string;
    nomeFantasia: string | null;
    situacaoCadastral: string | null;
    uf: string | null;
    municipio: string | null;
  } | null;
}

export interface ResumoCandidatosCNPJ {
  totalUnidadesAnalisadas: number;
  unidadesComCnpjValido: number;
  unidadesSemCnpjOuInvalido: number;
  cnpjsUnicosValidos: string[];
  cnpjsBasicosValidos: string[];
  candidatos: CandidatoCnesCNPJ[];
}
