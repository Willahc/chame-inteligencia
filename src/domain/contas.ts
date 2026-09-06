import type {
  FaixaPrioridade,
  NaturezaJuridicaClasse,
  NivelConfianca,
  StatusRevisaoSegmentacao,
  TipoDado,
  TipoVinculo,
} from "./tipos";

export type ResultadoAbordagem =
  | "NAO_ABORDADA"
  | "ABORDADA"
  | "EM_ANALISE"
  | "REUNIAO"
  | "PROPOSTA"
  | "CONTRATO"
  | "DESCARTADA"
  | "AGUARDANDO_DADOS";

export type AcaoComercialRecomendada =
  | "ABORDAR_IMEDIATAMENTE"
  | "PESQUISAR_MELHOR"
  | "REVISAR_VINCULO"
  | "BAIXA_PRIORIDADE"
  | "AGUARDAR_ENRIQUECIMENTO";

export interface ComponenteIndiceComercial {
  criterio: string;
  rotulo: string;
  peso: number;
  valorObtido: number;
  pontos: number;
  justificativa: string;
}

export interface DetalheIndiceComercial {
  total: number;
  faixa: FaixaPrioridade;
  versao: string;
  cobertura: number;
  componentes: ComponenteIndiceComercial[];
  limitacoes: string[];
}

export interface RegistroAbordagemDominio {
  id: string;
  contaComercialId: string;
  data: string;
  resultado: ResultadoAbordagem;
  usuarioResponsavel?: string;
  observacao: string;
  proximaAcao?: string;
  fonteOuEvidencia?: string;
  tipoDado: TipoDado;
  criadoEm: string;
}

export interface ContaComercialDominio {
  id: string;
  nome: string;
  tipoDado: TipoDado;
  grupoEconomicoId?: string | null;
  natureza: NaturezaJuridicaClasse;
  naturezaPublicaOuPrivada: "PRIVADA" | "PUBLICA" | "INDETERMINADA";
  quantidadeUnidades: number;
  quantidadeHospitais: number;
  cidades: string[];
  cnpjPrincipal?: string | null;
  situacaoCadastral?: string | null;
  tipoVinculo: TipoVinculo;
  confiancaOrganizacional: NivelConfianca;
  coberturaDados: number;
  statusRevisao: StatusRevisaoSegmentacao;
  indicePrioridadeComercial: number;
  faixaPrioridadeComercial: FaixaPrioridade;
  acaoRecomendada: AcaoComercialRecomendada;
  justificativaAcao?: string | null;
  componentesIndice?: DetalheIndiceComercial | null;
  resultadoAbordagem: ResultadoAbordagem;
  quantidadeContatos: number;
  criadoEm: string;
  atualizadoEm: string;
}
