import { describe, expect, it } from "vitest";
import { normalizarRazaoSocial, VERSAO_NORMALIZADOR_RAZAO } from "./normalizacao";
import {
  agruparInstituicoes,
  classificarNatureza,
  REGRA_RAZAO_SOCIAL_NORMALIZADA,
  REGRA_SEM_VINCULO_DETECTADO,
  VERSAO_REGRA_AGRUPAMENTO,
  type UnidadeAgrupamento,
} from "./regra-agrupamento";

function unidade(parcial: Partial<UnidadeAgrupamento> & { instituicaoId: string }): UnidadeAgrupamento {
  return {
    razaoSocial: "HOSPITAL TESTE",
    cnpj: null,
    cnpjMantenedora: null,
    naturezaJuridicaCode: null,
    ...parcial,
  };
}

describe("Normalização de razão social (Gate 3)", () => {
  it("é determinística e versionada", () => {
    const razao = " Hospital  do  Teste & Cia Ltda.   ";
    expect(normalizarRazaoSocial(razao)).toBe(normalizarRazaoSocial(razao));
    expect(VERSAO_NORMALIZADOR_RAZAO).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("remove acentos, caixa, pontuação e espaços múltiplos", () => {
    expect(normalizarRazaoSocial("Laboratório Áudio-Auricular S.A.")).toBe("LABORATORIO AUDIO AURICULAR SA");
    expect(normalizarRazaoSocial("Rede Sáude & Bem Estar LTDA ME")).toBe("REDE SAUDE E BEM ESTAR LTDA");
  });

  it("padroniza sufixos LTDA/S.A./LIMITADA/EIRELI sem colapsar nomes distintos", () => {
    expect(normalizarRazaoSocial("FRISIA LIMITADA")).toBe("FRISIA LTDA");
    expect(normalizarRazaoSocial("FRISIA LTDA")).toBe("FRISIA LTDA");
    expect(normalizarRazaoSocial("FRISIA SA")).toBe("FRISIA SA");
    expect(normalizarRazaoSocial("FRISIA S/A")).toBe("FRISIA SA");
    expect(normalizarRazaoSocial("FRISIA SOCIEDADE ANONIMA")).toBe("FRISIA SA");
    expect(normalizarRazaoSocial("FRISIA EIRELI")).toBe("FRISIA");
  });

  it("colapsa S.A./S/A/S A e S.S./S S escritos com espaços ou sinais", () => {
    expect(normalizarRazaoSocial("FLEURY S.A.")).toBe("FLEURY SA");
    expect(normalizarRazaoSocial("FLEURY S/A")).toBe("FLEURY SA");
    expect(normalizarRazaoSocial("FLEURY S A")).toBe("FLEURY SA");
    expect(normalizarRazaoSocial("CLINICA SAO JOAO S S")).toBe("CLINICA SAO JOAO SS");
    expect(normalizarRazaoSocial("CLINICA SAO JOAO SS")).toBe("CLINICA SAO JOAO SS");
    expect(normalizarRazaoSocial("FLEURY S A")).toBe(normalizarRazaoSocial("FLEURY S.A."));
  });

  it("não colapsa razões sociais distintas que coincidem em palavra", () => {
    expect(normalizarRazaoSocial("CLINICA SANTA ANA LTDA")).not.toBe(normalizarRazaoSocial("CLINICA SANTA ANA E FILHOS LTDA"));
    expect(normalizarRazaoSocial("HOSPITAL DOR")).not.toBe(normalizarRazaoSocial("HOSPITAL DOR E CUIDADO"));
    expect(normalizarRazaoSocial("LAB A")).not.toBe(normalizarRazaoSocial("LAB AB"));
  });
});

describe("Agrupamento por razão social normalizada (Gate 3)", () => {
  it("cria grupo PROVAVEL (HIPOTESE) para razão normalizada idêntica com múltiplas unidades", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "FLEURY S/A", cnpj: "11111111111111", naturezaJuridicaCode: "2062" }),
      unidade({ instituicaoId: "b", razaoSocial: "FLEURY S.A.", cnpj: "22222222222222", naturezaJuridicaCode: "2062" }),
    ]);
    const multiplo = resultado.grupos.find((g) => g.instituicaoIds.length === 2);
    expect(multiplo).toBeDefined();
    expect(multiplo?.tipoVinculo).toBe("PROVAVEL");
    expect(multiplo?.tipoDado).toBe("HIPOTESE");
    expect(multiplo?.nivelConfianca).toBe("MEDIA");
    expect(multiplo?.regraAgrupamento).toBe(REGRA_RAZAO_SOCIAL_NORMALIZADA);
    expect(multiplo?.versaoRegra).toBe(VERSAO_REGRA_AGRUPAMENTO);
  });

  it("preserva instituição isolada com razão social única", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "HOSPITAL UNICO LTDA" }),
    ]);
    expect(resultado.grupos).toHaveLength(1);
    const g = resultado.grupos[0];
    expect(g.instituicaoIds).toEqual(["a"]);
    expect(g.tipoVinculo).toBe("ISOLADO");
    expect(g.regraAgrupamento).toBe(REGRA_SEM_VINCULO_DETECTADO);
    expect(g.tipoDado).toBe("FATO_OFICIAL");
  });

  it("não é idempotente (executado 2x produz o mesmo agrupamento)", () => {
    const unidades = [
      unidade({ instituicaoId: "a", razaoSocial: "REDE A LTDA", cnpj: "11111111111111" }),
      unidade({ instituicaoId: "b", razaoSocial: "REDE A S/A", cnpj: "22222222222222" }),
    ];
    const r1 = agruparInstituicoes(unidades);
    const r2 = agruparInstituicoes(unidades);
    expect(r1.grupos).toEqual(r2.grupos);
  });

  it("marca agrupamento INCERTO e pede revisão quando há mistura pública/privada", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "PREFEITURA SAUDE LTDA", naturezaJuridicaCode: "1015" }),
      unidade({ instituicaoId: "b", razaoSocial: "PREFEITURA SAUDE LTDA", naturezaJuridicaCode: "2062" }),
    ]);
    const g = resultado.grupos.find((x) => x.natureza === "INDETERMINADO" || x.natureza === "PUBLICO");
    expect(g?.tipoVinculo).toBe("INCERTO");
    expect(g?.nivelConfianca).toBe("BAIXA");
    expect(g?.precisaRevisao).toBe(true);
    expect(g?.statusRevisao).toBe("AJUSTE_NECESSARIO");
  });

  it("distingue público por CO_NATUREZA_JUR 10xx/11xx sem inferir pelo nome", () => {
    expect(classificarNatureza("1015")).toBe("PUBLICO");
    expect(classificarNatureza("1140")).toBe("PUBLICO");
    expect(classificarNatureza("2062")).toBe("PRIVADO");
    expect(classificarNatureza("")).toBe("INDETERMINADO");
    expect(classificarNatureza(null)).toBe("INDETERMINADO");
  });

  it("usa vínculo OFICIAL (ALTA) quando há CNPJ idêntico no mesmo grupo", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "REDE X LTDA", cnpj: "12345678000190" }),
      unidade({ instituicaoId: "b", razaoSocial: "REDE X LTDA", cnpj: "12345678000190" }),
    ]);
    const g = resultado.grupos.find((x) => x.instituicaoIds.length === 2);
    expect(g?.tipoVinculo).toBe("OFICIAL");
    expect(g?.nivelConfianca).toBe("ALTA");
    expect(g?.tipoDado).toBe("FATO_OFICIAL");
  });

  it("não usa razão genérica como evidência de agrupamento", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "HOSPITAL LTDA" }),
      unidade({ instituicaoId: "b", razaoSocial: "HOSPITAL LTDA" }),
    ]);
    const multiplo = resultado.grupos.find((g) => g.instituicaoIds.length === 2);
    expect(multiplo).toBeUndefined();
    expect(resultado.grupos.every((g) => g.instituicaoIds.length === 1)).toBe(true);
  });

  it("nenhuma instituição é apagada (total de vínculos preservado)", () => {
    const unidades = [
      unidade({ instituicaoId: "a", razaoSocial: "A LTDA" }),
      unidade({ instituicaoId: "b", razaoSocial: "B LTDA" }),
      unidade({ instituicaoId: "c", razaoSocial: "A S/A" }),
    ];
    const resultado = agruparInstituicoes(unidades);
    const ids = resultado.grupos.flatMap((g) => g.instituicaoIds);
    expect(ids).toHaveLength(3);
    expect(new Set(ids)).toEqual(new Set(["a", "b", "c"]));
  });

  it("não mistura grupos distintos com razão normalizada idêntica em natureza única", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "CEMA LTDA", naturezaJuridicaCode: "2062" }),
      unidade({ instituicaoId: "b", razaoSocial: "CEMA LTDA", naturezaJuridicaCode: "2062" }),
      unidade({ instituicaoId: "c", razaoSocial: "CEMA LTDA", naturezaJuridicaCode: "2062" }),
    ]);
    const multiplo = resultado.grupos.find((g) => g.instituicaoIds.length === 3);
    expect(multiplo).toBeDefined();
    expect(multiplo?.natureza).toBe("PRIVADO");
  });

  it("razoa social nunca é nível de confiança ALTA sem vínculo oficial", () => {
    const resultado = agruparInstituicoes([
      unidade({ instituicaoId: "a", razaoSocial: "SOMAQUE LTDA", cnpj: "11111111111111" }),
      unidade({ instituicaoId: "b", razaoSocial: "SOMAQUE LTDA", cnpj: "99999999999999" }),
    ]);
    const grupo = resultado.grupos.find((g) => g.instituicaoIds.length === 2);
    expect(grupo?.tipoVinculo).toBe("PROVAVEL");
    expect(grupo?.nivelConfianca).not.toBe("ALTA");
    expect(grupo?.tipoDado).toBe("HIPOTESE");
  });
});