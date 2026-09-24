import { describe, expect, it } from "vitest";
import { listarInstituicoesParaAssistente } from "./dados";

describe("projeção do assistente local", () => {
  it("preserva os campos usados pelas regras sem carregar contatos profissionais", async () => {
    const assistente = await listarInstituicoesParaAssistente("MODO_REAL");

    expect(assistente.length).toBeGreaterThan(0);
    const primeira = assistente[0];
    expect(primeira).toMatchObject({ id: expect.any(String), slug: expect.any(String), indice: expect.any(Number) });
    expect(primeira).not.toHaveProperty("contatosProfissionais");
    expect(primeira.evidencias.every((evidencia) => !("emailCorporativo" in evidencia))).toBe(true);
  }, 15_000);
});
