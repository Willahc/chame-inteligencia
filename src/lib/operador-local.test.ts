import { afterEach, describe, expect, it } from "vitest";
import { obterOperadorLocal } from "./operador-local";

const valorOriginal = process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;

afterEach(() => {
  if (valorOriginal === undefined) delete process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;
  else process.env.WINS_HUB_TAXI_USUARIO_OPERADOR = valorOriginal;
});

describe("operador local", () => {
  it("não aceita identidade fornecida pelo cliente e usa somente a configuração do servidor", () => {
    process.env.WINS_HUB_TAXI_USUARIO_OPERADOR = "revisor-local";
    expect(obterOperadorLocal()).toBe("revisor-local");
  });

  it("identifica explicitamente a ausência de autenticação configurada", () => {
    delete process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;
    expect(obterOperadorLocal()).toBe("operador-local-nao-autenticado");
  });
});
