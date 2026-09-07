import type {
  TipoIntegracaoExterna,
  AmbienteIntegracao,
  StatusIntegracao,
  StatusEventoIntegracao,
  TipoDado,
} from "@prisma/client";

export type {
  TipoIntegracaoExterna,
  AmbienteIntegracao,
  StatusIntegracao,
  StatusEventoIntegracao,
};

export const AVISO_INTEGRACOES_SIMULACAO =
  "Ambiente de integração operando exclusivamente em SIMULAÇÃO CONTROLADA. Nenhuma conexão externa, chamada de rede, transmissão de dados ou envio de mensagens é realizado neste Gate.";

export const AVISO_BLOQUEIO_PRODUCAO =
  "Acesso ao ambiente de produção ou homologação bloqueado. O Gate 9 autoriza estritamente o modo SIMULAÇÃO.";

export const LIMITE_MAXIMO_LOTE_SIMULACAO = 10;

export const ROTULOS_TIPO_INTEGRACAO: Record<TipoIntegracaoExterna, string> = {
  CRM: "CRM Comercial",
  EMAIL: "Servidor de E-mail Corporativo",
  WHATSAPP: "WhatsApp Corporativo (B2B)",
  DISCADOR: "Discador Telefônico Corporativo",
  OUTRO: "Outro Conector Externo",
};

export const ROTULOS_AMBIENTE_INTEGRACAO: Record<AmbienteIntegracao, string> = {
  DESABILITADA: "Desabilitada",
  SIMULACAO: "Simulação Controlada",
  HOMOLOGACAO: "Homologação (Bloqueada)",
  PRODUCAO: "Produção (Bloqueada)",
};

export const ROTULOS_STATUS_INTEGRACAO: Record<StatusIntegracao, string> = {
  ATIVA: "Ativa para Simulação",
  INATIVA: "Inativa",
  ERRO_CONFIGURACAO: "Erro de Configuração",
  PENDENTE_AUTORIZACAO: "Pendente de Autorização",
};

export const ROTULOS_STATUS_EVENTO: Record<StatusEventoIntegracao, string> = {
  SIMULADO: "Simulado",
  SUCESSO_SIMULADO: "Sucesso Simulado",
  FALHA_SIMULADA: "Falha Simulada",
  TIMEOUT_SIMULADO: "Timeout Simulado",
  BLOQUEADO: "Bloqueado por Regra",
  CANCELADO: "Cancelado pelo Operador",
};

export interface ResumoContadoresIntegracoes {
  totalIntegracoes: number;
  integracoesAtivas: number;
  totalEventos: number;
  sucessosSimulados: number;
  falhasSimuladas: number;
  bloqueados: number;
  cancelados: number;
  timeoutsSimulados: number;
}

export interface PayloadBaseIntegracao {
  contaId: string;
  contaNome: string;
  contatoId?: string;
  contatoNome?: string | null;
  cargo?: string | null;
  finalidadeComercial: string;
  justificativa: string;
  usuarioSolicitante: string;
  modoSimulacao: true;
  acaoId?: string;
  tipoDado: TipoDado;
}

export interface PayloadCRM extends PayloadBaseIntegracao {
  estagioOportunidade: "PROSPECCAO" | "QUALIFICACAO" | "CONTATO_INICIAL";
  valorEstimado?: number;
  notas?: string;
}

export interface PayloadEmail extends PayloadBaseIntegracao {
  destinatarioEmail: string;
  assunto: string;
  corpoMensagem: string;
}

export interface PayloadWhatsApp extends PayloadBaseIntegracao {
  destinatarioTelefone: string;
  mensagem: string;
}

export interface PayloadDiscador extends PayloadBaseIntegracao {
  numeroTelefone: string;
  tipoCampanha: "SDR_HUMANO" | "PESQUISA_QUALIFICACAO";
  roteiroSugestao?: string;
}

export interface RespostaSimuladaIntegracao {
  sucesso: boolean;
  transacaoId: string;
  statusEvento: StatusEventoIntegracao;
  tipoIntegracao: TipoIntegracaoExterna;
  ambiente: AmbienteIntegracao;
  timestamp: string;
  mensagem: string;
  detalhesSimulacao: Record<string, unknown>;
  chamadaExternaRealizada: false;
  tempoRespostaMs: number;
}

export interface OpcoesExecucaoSimulada {
  simularFalha?: boolean;
  simularTimeout?: boolean;
  cancelarAntesExecutar?: boolean;
  tempoEsperaMs?: number;
}

export interface AdaptadorIntegracao<TPayload extends PayloadBaseIntegracao> {
  readonly tipo: TipoIntegracaoExterna;
  validarPayload(payload: TPayload): { valido: boolean; erros: string[] };
  sanitizarPayload(payload: TPayload): Record<string, unknown>;
  executarSimulacao(
    payload: TPayload,
    opcoes?: OpcoesExecucaoSimulada
  ): Promise<RespostaSimuladaIntegracao>;
}

export interface SolicitacaoSimulacaoInput {
  integracaoId: string;
  contaComercialId: string;
  contatoProfissionalId?: string;
  acaoComercialId?: string;
  usuarioSolicitante: string;
  justificativa: string;
  finalidadeComercial: string;
  confirmacaoHumana: boolean;
  dadosEspecificos?: Record<string, unknown>;
  simularFalha?: boolean;
  simularTimeout?: boolean;
  cancelarAntesExecutar?: boolean;
}

export interface PreviaSimulacao {
  elegivel: boolean;
  erros: string[];
  avisos: string[];
  integracao: {
    id: string;
    nome: string;
    tipo: TipoIntegracaoExterna;
    ambiente: AmbienteIntegracao;
    status: StatusIntegracao;
  };
  conta: {
    id: string;
    nome: string;
    tipoDado: TipoDado;
    naturezaJuridica?: string | null;
  };
  contato: {
    id: string;
    nome: string;
    cargo: string | null;
    email?: string | null;
    telefone?: string | null;
    statusDecisao: string;
    ativo: boolean;
    tipoDado: TipoDado;
  } | null;
  acao: {
    id: string;
    tipoAcao: string;
    status: string;
    canal: string;
  } | null;
  payloadSanitizado: Record<string, unknown>;
  finalidadeComercial: string;
  usuarioSolicitante: string;
  justificativa: string;
}

export interface FiltrosEventosIntegracao {
  tipoIntegracao?: TipoIntegracaoExterna;
  status?: StatusEventoIntegracao;
  contaId?: string;
  contatoId?: string;
  busca?: string;
  limite?: number;
}
