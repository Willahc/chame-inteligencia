import { describe, expect, it } from "vitest";
import { filtrarInstituicoes } from "./filtros";
import type { InstituicaoRadar } from "./tipos";

const base: InstituicaoRadar[] = [
  { id: "1", slug: "rede", nome: "Rede Modelo", grupo: "Grupo Demo", municipio: "São Paulo", municipios: ["São Paulo", "Campinas"], tipo: "Hospital", quantidadeUnidades: 2, operacao24h: true, possuiExpansao: true, indice: 82, faixa: "MUITO_ALTA", principalMotivo: "Unidades", qualidadeEvidencias: "ALTA", acaoRecomendada: "Abordar", tipoDado: "DEMONSTRACAO", segmentacao: { segmento: "NUCLEO_HOSPITALAR", faixaAderencia: "ALTA", confianca: "ALTA", indiceAderencia: 98, versaoRegra: "2.1.0", justificativa: "", regraAplicada: "", statusRevisao: "NAO_REVISADO", precisaRevisao: true } },
  { id: "2", slug: "clinica", nome: "Clínica Exemplo", grupo: null, municipio: "Recife", municipios: ["Recife"], tipo: "Clínica", quantidadeUnidades: 1, operacao24h: false, possuiExpansao: false, indice: 25, faixa: "BAIXA", principalMotivo: "Porte", qualidadeEvidencias: "BAIXA", acaoRecomendada: "Validar", tipoDado: "DEMONSTRACAO", segmentacao: { segmento: "BAIXA_PRIORIDADE_INICIAL", faixaAderencia: "BAIXA", confianca: "BAIXA", indiceAderencia: 31, versaoRegra: "2.1.0", justificativa: "", regraAplicada: "", statusRevisao: "NAO_REVISADO", precisaRevisao: true } },
  { id: "3", slug: "fora", nome: "Upa Exemplo", grupo: null, municipio: "Campinas", municipios: ["Campinas"], tipo: "Pronto Atendimento", quantidadeUnidades: 1, operacao24h: false, possuiExpansao: false, indice: 10, faixa: "BAIXA", principalMotivo: "Porte", qualidadeEvidencias: "BAIXA", acaoRecomendada: "Validar", tipoDado: "DEMONSTRACAO", segmentacao: { segmento: "FORA_DO_FOCO_ATUAL", faixaAderencia: "FORA_DO_FOCO", confianca: "BAIXA", indiceAderencia: 0, versaoRegra: "2.1.0", justificativa: "", regraAplicada: "", statusRevisao: "NAO_REVISADO", precisaRevisao: true } },
  { id: "4", slug: "sem-seg", nome: "Sem Segmento", grupo: null, municipio: "Osasco", municipios: ["Osasco"], tipo: "Clínica", quantidadeUnidades: 1, operacao24h: false, possuiExpansao: false, indice: 15, faixa: "BAIXA", principalMotivo: "Porte", qualidadeEvidencias: "BAIXA", acaoRecomendada: "Validar", tipoDado: "DEMONSTRACAO" },
];

describe("Filtros do radar", () => {
  it("combina filtros principais e preserva ordenação por índice", () => {
    expect(filtrarInstituicoes(base, { texto: "sao paulo", indiceMinimo: 60, variasUnidades: true, expansao: true, operacao24h: true, qualidadeEvidencia: "ALTA", faixa: "MUITO_ALTA" }).map((item) => item.id)).toEqual(["1"]);
  });

  it("filtra por município e tipo", () => {
    expect(filtrarInstituicoes(base, { municipio: "Recife", tipo: "Clínica" }).map((item) => item.id)).toEqual(["2"]);
  });

  it("filtra por segmento", () => {
    expect(filtrarInstituicoes(base, { segmento: "NUCLEO_HOSPITALAR" }).map((item) => item.id)).toEqual(["1"]);
  });

  it("filtra somente oportunidades comerciais (inclui NUCLEO/SAUDE, exclui BAIXA/FORA/sem segmento)", () => {
    expect(filtrarInstituicoes(base, { somenteOportunidadesComerciais: true }).map((item) => item.id)).toEqual(["1"]);
    const comSaude = [...base];
    comSaude[0] = { ...comSaude[0], segmentacao: { segmento: "SAUDE_CORPORATIVA_EXPANDIDA", faixaAderencia: "BAIXA", confianca: "MEDIA", indiceAderencia: 46, versaoRegra: "2.1.0", justificativa: "", regraAplicada: "", statusRevisao: "NAO_REVISADO", precisaRevisao: true } };
    expect(filtrarInstituicoes(comSaude, { somenteOportunidadesComerciais: true }).map((item) => item.id)).toEqual(["1"]);
    expect(filtrarInstituicoes(base, { somenteOportunidadesComerciais: true, segmento: "FORA_DO_FOCO_ATUAL" }).map((item) => item.id)).toEqual([]);
  });

  it("filtra por cobertura mínima", () => {
    const comCobertura: InstituicaoRadar[] = [
      { ...base[0], coberturaDados: 85 },
      { ...base[1], coberturaDados: 50 },
    ];
    expect(filtrarInstituicoes(comCobertura, { coberturaMinima: 80 }).map((item) => item.id)).toEqual(["1"]);
    expect(filtrarInstituicoes(comCobertura, { coberturaMinima: 90 })).toEqual([]);
  });

  it("filtra por estrutura organizacional (rede vs isolada)", () => {
    const comOrganizacao: InstituicaoRadar[] = [
      { ...base[0], quantidadeUnidades: 2, organizacao: { id: "org-1", nome: "Org Demo", nomeNormalizado: "org demo", tipoDado: "FATO_OFICIAL", tipoVinculo: "OFICIAL", confianca: "ALTA", natureza: "PRIVADO", quantidadeUnidades: 2, statusRevisao: "APROVADA", regraAgrupamento: "TESTE", versaoRegra: "1.0.0", tipoEvidencia: null, observacao: null, precisaRevisao: false } },
      { ...base[1], quantidadeUnidades: 1, organizacao: { id: "org-2", nome: "Org Isolada", nomeNormalizado: "org isolada", tipoDado: "FATO_OFICIAL", tipoVinculo: "ISOLADO", confianca: "ALTA", natureza: "PRIVADO", quantidadeUnidades: 1, statusRevisao: "APROVADA", regraAgrupamento: "TESTE", versaoRegra: "1.0.0", tipoEvidencia: null, observacao: null, precisaRevisao: false } },
    ];
    expect(filtrarInstituicoes(comOrganizacao, { organizacaoOuIsolado: "EM_REDE" }).map((item) => item.id)).toEqual(["1"]);
    expect(filtrarInstituicoes(comOrganizacao, { organizacaoOuIsolado: "ISOLADA" }).map((item) => item.id)).toEqual(["2"]);
  });

  it("garante neutralidade absoluta quando filtros PNCP estão inativos", () => {
    const todos = filtrarInstituicoes(base, {});
    expect(todos.length).toBe(base.length);
    expect(todos.map((i) => i.id)).toEqual(["1", "2", "4", "3"]);
  });

  it("filtra por sinais PNCP (geral, mobilidade, recente e vínculo exato)", () => {
    const comPNCP: InstituicaoRadar[] = [
      {
        ...base[0],
        possuiSinalPNCP: true,
        possuiSinalMobilidadePNCP: true,
        possuiContratacaoRecente: true,
        vinculoPNCPExato: true,
        totalSinaisPNCP: 5,
      },
      {
        ...base[1],
        possuiSinalPNCP: true,
        possuiSinalMobilidadePNCP: false,
        possuiContratacaoRecente: false,
        vinculoPNCPExato: true,
        totalSinaisPNCP: 2,
      },
      {
        ...base[2],
        possuiSinalPNCP: false,
        possuiSinalMobilidadePNCP: false,
        possuiContratacaoRecente: false,
        vinculoPNCPExato: false,
        totalSinaisPNCP: 0,
      },
    ];

    expect(filtrarInstituicoes(comPNCP, { possuiSinalPNCP: true }).map((i) => i.id)).toEqual(["1", "2"]);
    expect(filtrarInstituicoes(comPNCP, { possuiSinalMobilidadePNCP: true }).map((i) => i.id)).toEqual(["1"]);
    expect(filtrarInstituicoes(comPNCP, { contratacaoPublicaRecente: true }).map((i) => i.id)).toEqual(["1"]);
    expect(filtrarInstituicoes(comPNCP, { somenteVinculoPNCPExato: true }).map((i) => i.id)).toEqual(["1", "2"]);
    expect(filtrarInstituicoes(comPNCP, { possuiSinalMobilidadePNCP: true, contratacaoPublicaRecente: true }).map((i) => i.id)).toEqual(["1"]);
  });
});
