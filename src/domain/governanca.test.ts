import { describe, expect, it } from "vitest";
import { evidenciaSchema, possuiEvidenciaSuficiente } from "./governanca";
import { INSTITUICOES_DEMONSTRACAO } from "@/data/demonstracao";

describe("Governança de evidências", () => {
  it("rejeita tipo de evidência fora da enumeração canônica", () => {
    const base = INSTITUICOES_DEMONSTRACAO[0].evidencias[0];
    expect(evidenciaSchema.safeParse({ ...base, tipo: "OPINIAO" }).success).toBe(false);
  });

  it("considera insuficiente uma instituição somente com evidência fraca e pendente", () => {
    const instituicao = INSTITUICOES_DEMONSTRACAO.find((item) => item.slug === "instituto-clinico-demonstracao")!;
    expect(possuiEvidenciaSuficiente(instituicao.evidencias)).toBe(false);
  });

  it("exige URL ou identificador rastreável na fonte", () => {
    const base = INSTITUICOES_DEMONSTRACAO[0].evidencias[0];
    expect(evidenciaSchema.safeParse({ ...base, fonte: { ...base.fonte, identificador: undefined, url: undefined } }).success).toBe(false);
  });
});
