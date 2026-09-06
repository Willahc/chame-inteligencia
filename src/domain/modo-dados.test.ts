import { describe, expect, it } from "vitest";
import { MODO_DEMONSTRACAO, MODO_REAL, obterModoDados, tipoDadoDoModo } from "./modo-dados";

describe("modo de dados", () => {
  it("usa dados reais como padrão operacional", () => {
    expect(obterModoDados(undefined)).toBe(MODO_REAL);
    expect(tipoDadoDoModo(MODO_REAL)).toBe("FATO_OFICIAL");
  });

  it("separa explicitamente o modo real", () => {
    expect(obterModoDados("MODO_REAL")).toBe(MODO_REAL);
    expect(tipoDadoDoModo(MODO_REAL)).toBe("FATO_OFICIAL");
    expect(obterModoDados("qualquer-outro-valor")).toBe(MODO_REAL);
  });

  it("habilita demonstração somente por configuração explícita", () => {
    expect(obterModoDados(MODO_DEMONSTRACAO)).toBe(MODO_DEMONSTRACAO);
    expect(tipoDadoDoModo(MODO_DEMONSTRACAO)).toBe("DEMONSTRACAO");
  });
});
