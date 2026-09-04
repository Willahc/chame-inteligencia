import { describe, expect, it } from "vitest";
import { MODO_DEMONSTRACAO, MODO_REAL, obterModoDados, tipoDadoDoModo } from "./modo-dados";

describe("modo de dados", () => {
  it("usa demonstração como padrão seguro", () => {
    expect(obterModoDados(undefined)).toBe(MODO_DEMONSTRACAO);
    expect(tipoDadoDoModo(MODO_DEMONSTRACAO)).toBe("DEMONSTRACAO");
  });

  it("separa explicitamente o modo real", () => {
    expect(obterModoDados("MODO_REAL")).toBe(MODO_REAL);
    expect(tipoDadoDoModo(MODO_REAL)).toBe("FATO_OFICIAL");
    expect(obterModoDados("qualquer-outro-valor")).toBe(MODO_DEMONSTRACAO);
  });
});
