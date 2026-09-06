import { describe, expect, it } from "vitest";
import {
  desformatarCNPJ,
  extrairCnpjBasico,
  formatarCNPJ,
  validarCNPJ,
  validarCnpjBasico,
} from "./validacao-cnpj";

describe("Validação e formatação de CNPJ", () => {
  it("deve desformatar corretamente pontuações e traços", () => {
    expect(desformatarCNPJ("60.970.371/0001-28")).toBe("60970371000128");
    expect(desformatarCNPJ("")).toBe("");
  });

  it("deve formatar corretamente CNPJ de 14 dígitos", () => {
    expect(formatarCNPJ("60970371000128")).toBe("60.970.371/0001-28");
    expect(formatarCNPJ("123")).toBe("123");
  });

  it("deve extrair e validar o CNPJ básico (8 dígitos)", () => {
    expect(extrairCnpjBasico("60.970.371/0001-28")).toBe("60970371");
    expect(validarCnpjBasico("60970371")).toBe(true);
    expect(validarCnpjBasico("60970")).toBe(false);
  });

  it("deve validar CNPJs autênticos conhecidos", () => {
    expect(validarCNPJ("60970371000128")).toBe(true);
    expect(validarCNPJ("60.970.371/0001-28")).toBe(true);
    expect(validarCNPJ("60.747.318/0001-62")).toBe(true);
    expect(validarCNPJ("43.202.472/0001-30")).toBe(true);
    expect(validarCNPJ("60.840.055/0422-17")).toBe(true);
  });

  it("deve rejeitar CNPJs com dígitos verificadores incorretos", () => {
    expect(validarCNPJ("60970371000129")).toBe(false);
    expect(validarCNPJ("60747318000199")).toBe(false);
  });

  it("deve rejeitar sequências inválidas ou tamanhos incorretos", () => {
    expect(validarCNPJ("00000000000000")).toBe(false);
    expect(validarCNPJ("11111111111111")).toBe(false);
    expect(validarCNPJ("123456789")).toBe(false);
    expect(validarCNPJ("")).toBe(false);
  });
});
