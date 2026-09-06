import { describe, expect, it } from "vitest";
import {
  chaveDeduplicacaoContato,
  podeTransicionarEnriquecimento,
  validarCandidatoContato,
} from "./enriquecimento-contatos";

const candidatoValido = {
  nome: "Marina Exemplo",
  cargo: "Gerente de Compras",
  area: "Suprimentos",
  empresa: "Hospital Modelo",
  escopo: "ORGANIZACAO" as const,
  linkedinUrl: "https://www.linkedin.com/in/marina-exemplo",
  fonteUrl: "https://hospital-modelo.example/equipe",
  dataEvidencia: "2026-09-06T12:00:00.000Z",
  confianca: "ALTA" as const,
  papelComercial: "INFERENCIA",
};

describe("enriquecimento de contatos sob demanda", () => {
  it("aceita candidato com fonte e perfil profissional públicos", () => {
    expect(validarCandidatoContato(candidatoValido).success).toBe(true);
  });

  it("rejeita candidato sem perfil profissional público", () => {
    const resultado = validarCandidatoContato({
      ...candidatoValido,
      linkedinUrl: undefined,
      paginaProfissionalUrl: undefined,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita e-mail de provedor genérico", () => {
    const resultado = validarCandidatoContato({
      ...candidatoValido,
      emailCorporativo: "marina@gmail.com",
    });
    expect(resultado.success).toBe(false);
  });

  it("permite somente transições previstas", () => {
    expect(podeTransicionarEnriquecimento("SOLICITADO", "PESQUISANDO")).toBe(true);
    expect(podeTransicionarEnriquecimento("PESQUISANDO", "PERSISTIDO")).toBe(false);
    expect(podeTransicionarEnriquecimento("REVISAO_HUMANA", "PERSISTIDO")).toBe(true);
  });

  it("gera chave determinística para deduplicação", () => {
    expect(chaveDeduplicacaoContato(candidatoValido)).toBe(
      "marina exemplo|hospital modelo|https://www.linkedin.com/in/marina-exemplo",
    );
  });
});
