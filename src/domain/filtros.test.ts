import { describe, expect, it } from "vitest";
import { filtrarInstituicoes } from "./filtros";
import type { InstituicaoRadar } from "./tipos";

const base: InstituicaoRadar[] = [
  { id: "1", slug: "rede", nome: "Rede Modelo", grupo: "Grupo Demo", municipio: "São Paulo", municipios: ["São Paulo", "Campinas"], tipo: "Hospital", quantidadeUnidades: 2, operacao24h: true, possuiExpansao: true, indice: 82, faixa: "MUITO_ALTA", principalMotivo: "Unidades", qualidadeEvidencias: "ALTA", acaoRecomendada: "Abordar", tipoDado: "DEMONSTRACAO" },
  { id: "2", slug: "clinica", nome: "Clínica Exemplo", grupo: null, municipio: "Recife", municipios: ["Recife"], tipo: "Clínica", quantidadeUnidades: 1, operacao24h: false, possuiExpansao: false, indice: 25, faixa: "BAIXA", principalMotivo: "Porte", qualidadeEvidencias: "BAIXA", acaoRecomendada: "Validar", tipoDado: "DEMONSTRACAO" },
];

describe("Filtros do radar", () => {
  it("combina filtros principais e preserva ordenação por índice", () => {
    expect(filtrarInstituicoes(base, { texto: "sao paulo", indiceMinimo: 60, variasUnidades: true, expansao: true, operacao24h: true, qualidadeEvidencia: "ALTA", faixa: "MUITO_ALTA" }).map((item) => item.id)).toEqual(["1"]);
  });

  it("filtra por município e tipo", () => {
    expect(filtrarInstituicoes(base, { municipio: "Recife", tipo: "Clínica" }).map((item) => item.id)).toEqual(["2"]);
  });
});
