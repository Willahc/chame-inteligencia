export const PESOS_ADERENCIA = {
  tipoHospitalar: 30,
  atendimentoHospitalar: 15,
  complexidadeEstrutural: 15,
  atendimentoAmbulatorial: 10,
  coberturaOperacional: 15,
  coberturaDados: 15,
} as const;

export const VERSAO_REGRA_ADERENCIA = "2.1.0";

export type CriterioAderencia = keyof typeof PESOS_ADERENCIA;

export const ROTULOS_CRITERIOS_ADERENCIA: Record<CriterioAderencia, string> = {
  tipoHospitalar: "Tipo assistencial / hospitalar (estrutura oficial)",
  atendimentoHospitalar: "Atendimento hospitalar / internação (ST_ATEND_HOSPITALAR)",
  complexidadeEstrutural: "Complexidade estrutural (centro cirúrgico/obstétrico/neonatal)",
  atendimentoAmbulatorial: "Atendimento ambulatorial (ST_ATEND_AMBULATORIAL)",
  coberturaOperacional: "Cobertura operacional (turnos de atendimento)",
  coberturaDados: "Cobertura / qualidade dos dados",
};

export const FAIXAS_ADERENCIA = {
  altaEm: 80,
  mediaEm: 60,
  baixaEm: 40,
} as const;
