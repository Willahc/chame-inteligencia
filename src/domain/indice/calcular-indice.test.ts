import { describe, expect, it } from "vitest";
import { calcularIndice, classificarFaixa } from "./calcular-indice";
import { PESOS_INDICE } from "./pesos";

describe("Índice de Prioridade Hospitalar", () => {
  it("calcula de forma determinística", () => {
    const entrada = { operacao24h: true, quantidadeUnidades: 2, porte: "GRANDE" as const, perfilPrivadoCorporativo: true, quantidadeMunicipios: 2, possuiExpansaoRecente: true, potencialDeslocamento: 0.8, potencialVisitantes: 0.6, facilidadeAcessoDecisor: 0.4, qualidadeEvidencias: 0.8 };
    expect(calcularIndice(entrada)).toEqual(calcularIndice(entrada));
  });

  it("possui soma máxima de pesos e resultado máximo iguais a 100", () => {
    expect(Object.values(PESOS_INDICE).reduce((soma, peso) => soma + peso, 0)).toBe(100);
    const resultado = calcularIndice({ operacao24h: true, quantidadeUnidades: 4, porte: "MUITO_GRANDE", perfilPrivadoCorporativo: true, quantidadeMunicipios: 4, possuiExpansaoRecente: true, potencialDeslocamento: 1, potencialVisitantes: 1, facilidadeAcessoDecisor: 1, qualidadeEvidencias: 1 });
    expect(resultado.total).toBe(100);
  });

  it.each([[100, "MUITO_ALTA"], [80, "MUITO_ALTA"], [79, "ALTA"], [60, "ALTA"], [59, "MODERADA"], [40, "MODERADA"], [39, "BAIXA"], [0, "BAIXA"]] as const)("classifica %i na faixa %s", (total, faixa) => expect(classificarFaixa(total)).toBe(faixa));
});
