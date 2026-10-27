import { afterEach, describe, expect, it } from "vitest";
import { temPermissao } from "./permissoes-operador";
import {
  exigirPermissaoOperador,
  obterOperadorLocal,
  obterPerfilOperadorLocal,
} from "@/lib/operador-local";

const usuarioOriginal = process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;
const perfilOriginal = process.env.WINS_HUB_TAXI_PERFIL_OPERADOR;

afterEach(() => {
  if (usuarioOriginal === undefined) delete process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;
  else process.env.WINS_HUB_TAXI_USUARIO_OPERADOR = usuarioOriginal;
  if (perfilOriginal === undefined) delete process.env.WINS_HUB_TAXI_PERFIL_OPERADOR;
  else process.env.WINS_HUB_TAXI_PERFIL_OPERADOR = perfilOriginal;
});

describe("Gate 12 — permissões do operador", () => {
  it("mantém usuário ausente e operador não autenticado em somente leitura", () => {
    delete process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;
    process.env.WINS_HUB_TAXI_PERFIL_OPERADOR = "ADMINISTRADOR";
    expect(obterOperadorLocal()).toBe("operador-local-nao-autenticado");
    expect(obterPerfilOperadorLocal()).toBe("CONSULTA");
    expect(() => exigirPermissaoOperador("REVISAR_CONTATOS")).toThrow("não possui permissão");
  });

  it("aplica matriz de consulta, revisão, aprovação e administração", () => {
    expect(temPermissao("CONSULTA", "CONSULTAR")).toBe(true);
    expect(temPermissao("CONSULTA", "PLANEJAR_ACOES")).toBe(false);
    expect(temPermissao("REVISOR", "REVISAR_CONTATOS")).toBe(true);
    expect(temPermissao("REVISOR", "APROVAR_ACOES")).toBe(false);
    expect(temPermissao("APROVADOR", "SIMULAR_INTEGRACOES")).toBe(true);
    expect(temPermissao("ADMINISTRADOR", "ADMINISTRAR_INTEGRACOES")).toBe(true);
  });

  it("não permite que perfil sem usuário seja promovido pelo navegador", () => {
    delete process.env.WINS_HUB_TAXI_USUARIO_OPERADOR;
    process.env.WINS_HUB_TAXI_PERFIL_OPERADOR = "ADMINISTRADOR";
    expect(obterPerfilOperadorLocal()).toBe("CONSULTA");
  });

  it("usa apenas identidade configurada no servidor para ações sensíveis", () => {
    process.env.WINS_HUB_TAXI_USUARIO_OPERADOR = "aprovador-local";
    process.env.WINS_HUB_TAXI_PERFIL_OPERADOR = "APROVADOR";
    expect(exigirPermissaoOperador("APROVAR_ACOES")).toBe("aprovador-local");
  });
});
