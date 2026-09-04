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
});
