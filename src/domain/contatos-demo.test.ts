import { describe, expect, it } from "vitest";
import { CONTATOS_DEMONSTRACAO } from "./contatos-demo";

describe("contatos do piloto demonstração", () => {
  it("distribui contatos entre exatamente cinco contas", () => {
    expect(new Set(CONTATOS_DEMONSTRACAO.map((contato) => contato.instituicaoSlug))).toEqual(new Set([
      "rede-saude-exemplo", "hospital-modelo-sul", "hospital-demonstracao-alfa", "centro-diagnostico-modelo", "instituto-clinico-demonstracao",
    ]));
    for (const slug of new Set(CONTATOS_DEMONSTRACAO.map((contato) => contato.instituicaoSlug))) {
      const quantidade = CONTATOS_DEMONSTRACAO.filter((contato) => contato.instituicaoSlug === slug).length;
      expect(quantidade).toBeGreaterThanOrEqual(2);
      expect(quantidade).toBeLessThanOrEqual(4);
    }
  });

  it("usa somente e-mails reservados e telefones fictícios", () => {
    for (const contato of CONTATOS_DEMONSTRACAO) {
      expect(contato.emailCorporativo.endsWith(".example")).toBe(true);
      expect(contato.emailCorporativo).toMatch(/^[a-z0-9.]+@[a-z0-9-]+\.example$/);
      expect(contato.telefoneProfissional).toMatch(/^\(00\) 0000-00\d{2}$/);
    }
  });

  it("mantém índices determinísticos e papéis conhecidos", () => {
    expect(CONTATOS_DEMONSTRACAO.map((contato) => contato.indiceQualidade)).toEqual([88, 92, 84, 81, 79, 86, 76, 82, 73, 68, 71, 65, 62, 58]);
    expect(CONTATOS_DEMONSTRACAO.every((contato) => contato.papelComercial.length > 0)).toBe(true);
  });
});
