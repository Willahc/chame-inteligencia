import type { FaixaPrioridade } from "../tipos";

export const VERSAO_INDICE_COMERCIAL = "1.0.0";

export type CriterioIndiceComercial =
  | "estruturaMultiunidade"
  | "numeroDeHospitais"
  | "segmentoComercial"
  | "naturezaPrivada"
  | "operacao24h"
  | "urgenciaEmergencia"
  | "dispersaoGeografica"
  | "numeroDeUnidades"
  | "existenciaContatos"
  | "confiancaVinculo"
  | "coberturaDados";

export const PESOS_INDICE_COMERCIAL: Record<CriterioIndiceComercial, number> = {
  estruturaMultiunidade: 15,
  numeroDeHospitais: 15,
  segmentoComercial: 15,
  naturezaPrivada: 10,
  operacao24h: 10,
  urgenciaEmergencia: 10,
  dispersaoGeografica: 5,
  numeroDeUnidades: 5,
  existenciaContatos: 5,
  confiancaVinculo: 5,
  coberturaDados: 5,
};

export const ROTULOS_CRITERIOS_COMERCIAIS: Record<CriterioIndiceComercial, string> = {
  estruturaMultiunidade: "Estrutura multiunidade",
  numeroDeHospitais: "Presença hospitalar",
  segmentoComercial: "Segmento comercial",
  naturezaPrivada: "Natureza privada",
  operacao24h: "Operação 24 horas",
  urgenciaEmergencia: "Urgência e emergência",
  dispersaoGeografica: "Dispersão geográfica",
  numeroDeUnidades: "Total de unidades",
  existenciaContatos: "Contatos verificados",
  confiancaVinculo: "Confiança do vínculo",
  coberturaDados: "Cobertura cadastral",
};

export const FAIXAS_PRIORIDADE_COMERCIAL: Record<
  FaixaPrioridade,
  { minimo: number; rotulo: string; descricao: string }
> = {
  MUITO_ALTA: {
    minimo: 80,
    rotulo: "Muito Alta",
    descricao: "Prioridade máxima de abordagem imediata e acompanhamento direto.",
  },
  ALTA: {
    minimo: 60,
    rotulo: "Alta",
    descricao: "Forte potencial de contratação corporativa; prioritária no pipeline.",
  },
  MODERADA: {
    minimo: 40,
    rotulo: "Moderada",
    descricao: "Demanda potencial identificada; requer pesquisa de decisores.",
  },
  BAIXA: {
    minimo: 0,
    rotulo: "Baixa",
    descricao: "Baixo alinhamento imediato ou natureza pública restritiva.",
  },
};
