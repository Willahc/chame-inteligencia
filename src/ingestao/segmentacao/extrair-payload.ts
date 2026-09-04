export interface DadosPayloadCNES {
  tipoHospitalar: boolean;
  atendimentoHospitalar: boolean;
  complexidadeEstrutural: boolean;
  atendimentoAmbulatorial: boolean;
  turnoAderencia: number;
}

function flag1(valor: unknown): boolean {
  return valor === "1.0" || valor === "1" || String(valor).trim() === "1.0";
}

export function extrairAderenciaDoPayload(payload: Record<string, unknown>): DadosPayloadCNES {
  const coTurno = String(payload.CO_TURNO_ATENDIMENTO ?? "").trim();
  let turnoAderencia = 0;
  if (coTurno === "06") turnoAderencia = 1;
  else if (coTurno === "04") turnoAderencia = 0.8;
  else if (coTurno === "05") turnoAderencia = 0.6;
  else if (coTurno === "03") turnoAderencia = 0.4;
  else if (coTurno === "01" || coTurno === "02") turnoAderencia = 0.2;

  return {
    tipoHospitalar: false,
    atendimentoHospitalar: flag1(payload.ST_ATEND_HOSPITALAR),
    complexidadeEstrutural:
      flag1(payload.ST_CENTRO_CIRURGICO) || flag1(payload.ST_CENTRO_OBSTETRICO) || flag1(payload.ST_CENTRO_NEONATAL),
    atendimentoAmbulatorial: flag1(payload.ST_ATEND_AMBULATORIAL),
    turnoAderencia,
  };
}
