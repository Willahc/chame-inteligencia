import { describe, expect, it } from "vitest";
import {
  calcularAderencia,
  classificarFaixaAderencia,
  determinarSegmento,
  ehTipoHospitalar,
  type EntradaAderencia,
} from "./calcular-aderencia";
import { PESOS_ADERENCIA, VERSAO_REGRA_ADERENCIA } from "./pesos";

function entrada(parcial: Partial<EntradaAderencia> = {}): EntradaAderencia {
  return {
    tipoHospitalar: false,
    atendimentoHospitalar: false,
    complexidadeEstrutural: false,
    atendimentoAmbulatorial: false,
    turnoAderencia: 0,
    coberturaDados: 0,
    ...parcial,
  };
}

describe("Segmentação Comercial", () => {
  it("soma dos pesos é 100 e resultado máximo é 100", () => {
    expect(Object.values(PESOS_ADERENCIA).reduce((soma, p) => soma + p, 0)).toBe(100);
    const resultado = calcularAderencia(
      entrada({ atendimentoHospitalar: true, complexidadeEstrutural: true, atendimentoAmbulatorial: true, turnoAderencia: 1, coberturaDados: 100 }),
      "Hospital geral",
    );
    expect(resultado.total).toBe(100);
  });

  it("usa a versão corrente da regra", () => {
    const resultado = calcularAderencia(entrada(), "Clínica / Centro de Especialidade");
    expect(resultado.versaoRegra).toBe(VERSAO_REGRA_ADERENCIA);
  });

  it("reconhece tipos hospitalares", () => {
    expect(ehTipoHospitalar("Hospital geral")).toBe(true);
    expect(ehTipoHospitalar("Hospital especializado")).toBe(true);
    expect(ehTipoHospitalar("Hospital-Dia")).toBe(true);
    expect(ehTipoHospitalar("Pronto Atendimento")).toBe(false);
    expect(ehTipoHospitalar("Centro de Diagnóstico")).toBe(false);
    expect(ehTipoHospitalar("Clínica / Centro de Especialidade")).toBe(false);
  });

  it.each([[100, "ALTA"], [80, "ALTA"], [79, "MEDIA"], [60, "MEDIA"], [59, "BAIXA"], [40, "BAIXA"], [39, "FORA_DO_FOCO"], [0, "FORA_DO_FOCO"]] as const)(
    "classifica aderência %i na faixa %s",
    (total, faixa) => expect(classificarFaixaAderencia(total)).toBe(faixa),
  );

  it("classifica hospital como NUCLEO_HOSPITALAR", () => {
    expect(determinarSegmento("Hospital geral", entrada({ atendimentoHospitalar: true }), 100)).toBe("NUCLEO_HOSPITALAR");
  });

  it("classifica pronto atendimento como SAUDE_CORPORATIVA_EXPANDIDA", () => {
    expect(determinarSegmento("Pronto Atendimento", entrada(), 60)).toBe("SAUDE_CORPORATIVA_EXPANDIDA");
  });

  it("classifica centro de diagnóstico como SAUDE_CORPORATIVA_EXPANDIDA", () => {
    expect(determinarSegmento("Centro de Diagnóstico", entrada(), 60)).toBe("SAUDE_CORPORATIVA_EXPANDIDA");
  });

  it("classifica clínica com estrutura como SAUDE_CORPORATIVA_EXPANDIDA", () => {
    expect(determinarSegmento("Clínica / Centro de Especialidade", entrada({ atendimentoAmbulatorial: true }), 60)).toBe("SAUDE_CORPORATIVA_EXPANDIDA");
  });

  it("classifica clínica isolada pequena como BAIXA_PRIORIDADE_INICIAL", () => {
    expect(determinarSegmento("Clínica / Centro de Especialidade", entrada(), 31)).toBe("BAIXA_PRIORIDADE_INICIAL");
  });

  it("classifica tipo desconhecido sem aderência como FORA_DO_FOCO_ATUAL", () => {
    expect(determinarSegmento("Unidade sem classificação", entrada(), 10)).toBe("FORA_DO_FOCO_ATUAL");
  });
});
