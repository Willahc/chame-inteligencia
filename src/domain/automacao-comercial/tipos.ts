import type {
  StatusAcaoComercial,
  CanalAcaoComercial,
  TipoDado,
  NivelConfianca,
  FaixaPrioridade,
} from "@prisma/client";

export type { StatusAcaoComercial, CanalAcaoComercial };

export const AVISO_CANAL_PLANEJADO =
  "Canal apenas planejado. Nenhuma comunicação será enviada neste Gate.";

export const AVISO_SIMULACAO_CONTROLADA =
  "Simulação executada em ambiente estritamente controlado. Nenhuma mensagem, chamada ou requisição externa foi emitida.";

export const ROTULOS_STATUS_ACAO: Record<StatusAcaoComercial, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_REVISAO: "Aguardando Revisão",
  APROVADA_PARA_SIMULACAO: "Aprovada para Simulação",
  SIMULADA: "Simulada",
  CANCELADA: "Cancelada",
  BLOQUEADA: "Bloqueada",
};

export const ROTULOS_CANAIS_ACAO: Record<CanalAcaoComercial, string> = {
  EMAIL: "E-mail Corporativo",
  TELEFONE: "Telefone Corporativo",
  WHATSAPP: "WhatsApp Comercial",
  LINKEDIN: "LinkedIn Profissional",
  OUTRO: "Outro Canal",
};

export const TIPOS_ACOES_PREDEFINIDAS = [
  { id: "APRESENTACAO_INSTITUCIONAL", nome: "Apresentação Institucional Corporativa" },
  { id: "SONDAGEM_DEMANDA_MOBILIDADE", nome: "Sondagem de Demanda de Mobilidade Corporativa" },
  { id: "REUNIAO_ALINHAMENTO_GESTAO", nome: "Reunião de Alinhamento de Gestão e Custos" },
  { id: "PROPOSTA_CONVENIO_TRANSPORTE", nome: "Apresentação de Proposta de Convênio B2B" },
] as const;

export interface ValidacaoElegibilidadeResultado {
  elegivel: boolean;
  erros: string[];
  avisos: string[];
}

export interface CriarRascunhoAcaoInput {
  contaComercialId: string;
  contatoProfissionalId?: string;
  tipoAcao: string;
  canal: CanalAcaoComercial;
  objetivo: string;
  mensagemRascunho: string;
  criadoPor: string;
  justificativaInicial?: string;
}

export interface EditarRascunhoAcaoInput {
  tipoAcao?: string;
  canal?: CanalAcaoComercial;
  objetivo?: string;
  mensagemRascunho?: string;
  contatoProfissionalId?: string | null;
  usuario: string;
  justificativa: string;
}

export interface SubmeterRevisaoInput {
  usuario: string;
  justificativa: string;
}

export interface AprovarSimulacaoInput {
  usuarioAprovador: string;
  justificativa: string;
  observacao?: string;
}

export interface ExecutarSimulacaoInput {
  usuario: string;
  justificativa: string;
  observacao?: string;
}

export interface CancelarAcaoInput {
  usuario: string;
  justificativa: string;
  observacao?: string;
}

export interface BloquearAcaoInput {
  usuario: string;
  justificativa: string;
  observacao?: string;
}

export interface FiltrosAcoesPlanejadas {
  modo?: "MODO_REAL" | "MODO_DEMONSTRACAO";
  status?: StatusAcaoComercial;
  canal?: CanalAcaoComercial;
  faixaPrioridade?: FaixaPrioridade;
  busca?: string;
}

export interface ResumoContadoresAutomacao {
  total: number;
  rascunhos: number;
  aguardandoRevisao: number;
  aprovadasParaSimulacao: number;
  simuladas: number;
  canceladas: number;
  bloqueadas: number;
}

export interface PreviaAcaoComercial {
  id: string;
  conta: {
    id: string;
    nome: string;
    cidades: string;
    natureza: string;
    faixaPrioridade: string;
    indicePrioridade: number;
    tipoDado: TipoDado;
  };
  contato: {
    id: string;
    nome: string;
    cargo: string | null;
    area: string | null;
    empresa: string;
    canalAlvo: string | null;
    fonte: {
      nome: string;
      url: string | null;
    } | null;
    confianca: NivelConfianca;
    papelComercial: string | null;
    tipoPapelComercial: TipoDado;
    statusDecisao: string;
    dataEvidencia: string;
  } | null;
  acao: {
    tipoAcao: string;
    canal: CanalAcaoComercial;
    rotuloCanal: string;
    objetivo: string;
    mensagemRascunho: string;
    status: StatusAcaoComercial;
    rotuloStatus: string;
    criadoPor: string;
    criadoEm: string;
    aprovadoPor: string | null;
    aprovadoEm: string | null;
    justificativa: string | null;
    avisoCanalPlanejado: string;
    avisoSimulacao: string;
  };
}
