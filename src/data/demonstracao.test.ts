import { describe, expect, it } from "vitest";
import { INSTITUICOES_DEMONSTRACAO } from "./demonstracao";

describe("Dados de demonstração", () => {
  it("marca instituições, evidências e fontes como DEMONSTRAÇÃO", () => {
    for (const instituicao of INSTITUICOES_DEMONSTRACAO) {
      expect(instituicao.tipoDado).toBe("DEMONSTRACAO");
      for (const evidencia of instituicao.evidencias) {
        expect(evidencia.tipo).toBe("DEMONSTRACAO");
        expect(evidencia.fonte.tipoDado).toBe("DEMONSTRACAO");
      }
    }
  });

  it("usa somente nomes fictícios autorizados", () => {
    expect(INSTITUICOES_DEMONSTRACAO.map((item) => item.nome)).toEqual(["Rede Saúde Exemplo", "Hospital Demonstração Alfa", "Hospital Modelo Sul", "Centro Diagnóstico Modelo", "Instituto Clínico Demonstração"]);
  });
});
