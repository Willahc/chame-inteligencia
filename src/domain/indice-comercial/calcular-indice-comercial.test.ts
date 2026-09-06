import { describe, expect, it } from "vitest";
import {
  calcularIndiceComercial,
  classificarFaixaComercial,
} from "./calcular-indice-comercial";
import { PESOS_INDICE_COMERCIAL, VERSAO_INDICE_COMERCIAL } from "./pesos";

describe("Índice de Prioridade Comercial - Versão 1.0.0", () => {
  it("a soma de todos os pesos do índice deve ser exatamente 100", () => {
    const soma = Object.values(PESOS_INDICE_COMERCIAL).reduce((a, b) => a + b, 0);
    expect(soma).toBe(100);
  });

  it("classifica faixas corretamente pelos limites configurados", () => {
    expect(classificarFaixaComercial(85)).toBe("MUITO_ALTA");
    expect(classificarFaixaComercial(80)).toBe("MUITO_ALTA");
    expect(classificarFaixaComercial(79)).toBe("ALTA");
    expect(classificarFaixaComercial(60)).toBe("ALTA");
    expect(classificarFaixaComercial(59)).toBe("MODERADA");
    expect(classificarFaixaComercial(40)).toBe("MODERADA");
    expect(classificarFaixaComercial(39)).toBe("BAIXA");
    expect(classificarFaixaComercial(0)).toBe("BAIXA");
  });

  it("calcula pontuação máxima para rede hospitalar privada multiunidade com contatos", () => {
    const resultado = calcularIndiceComercial({
      quantidadeUnidades: 12,
      quantidadeHospitais: 4,
      segmentoPredominante: "NUCLEO_HOSPITALAR",
      natureza: "PRIVADO",
      operacao24h: true,
      urgenciaEmergencia: true,
      quantidadeCidades: 3,
      quantidadeContatosAtivos: 3,
      tipoVinculo: "OFICIAL",
      confiancaVinculo: "ALTA",
      coberturaDados: 100,
    });

    expect(resultado.versao).toBe(VERSAO_INDICE_COMERCIAL);
    expect(resultado.total).toBe(100);
    expect(resultado.faixa).toBe("MUITO_ALTA");
    expect(resultado.componentes).toHaveLength(11);
  });

  it("penaliza entidade pública sem hospitais e de baixa cobertura", () => {
    const resultado = calcularIndiceComercial({
      quantidadeUnidades: 1,
      quantidadeHospitais: 0,
      segmentoPredominante: "BAIXA_PRIORIDADE_INICIAL",
      natureza: "PUBLICO",
      operacao24h: false,
      urgenciaEmergencia: false,
      quantidadeCidades: 1,
      quantidadeContatosAtivos: 0,
      tipoVinculo: "ISOLADO",
      confiancaVinculo: "BAIXA",
      coberturaDados: 40,
    });

    expect(resultado.total).toBeLessThan(40);
    expect(resultado.faixa).toBe("BAIXA");
    const componenteNatureza = resultado.componentes.find((c) => c.criterio === "naturezaPrivada");
    expect(componenteNatureza?.pontos).toBe(0);
  });

  it("é estritamente determinístico e idempotente para a mesma entrada", () => {
    const entrada = {
      quantidadeUnidades: 3,
      quantidadeHospitais: 1,
      segmentoPredominante: "SAUDE_CORPORATIVA_EXPANDIDA",
      natureza: "PRIVADO" as const,
      operacao24h: true,
      urgenciaEmergencia: false,
      quantidadeCidades: 2,
      quantidadeContatosAtivos: 1,
      tipoVinculo: "PROVAVEL" as const,
      confiancaVinculo: "MEDIA" as const,
      coberturaDados: 90,
    };

    const res1 = calcularIndiceComercial(entrada);
    const res2 = calcularIndiceComercial(entrada);

    expect(res1.total).toBe(res2.total);
    expect(res1.faixa).toBe(res2.faixa);
    expect(res1.componentes).toEqual(res2.componentes);
  });
});
