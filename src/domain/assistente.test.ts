import { describe, expect, it } from "vitest";
import { responderAssistente } from "./assistente";
import type { InstituicaoAssistente } from "./tipos";
import { INSTITUICOES_DEMONSTRACAO } from "@/data/demonstracao";

const fraca = INSTITUICOES_DEMONSTRACAO.find((item) => item.slug === "instituto-clinico-demonstracao")!;
const base: InstituicaoAssistente = { id: fraca.id, slug: fraca.slug, nome: fraca.nome, grupo: null, municipio: "Recife", municipios: ["Recife"], tipo: fraca.tipo.nome, quantidadeUnidades: 1, operacao24h: false, possuiExpansao: false, indice: 20, faixa: "BAIXA", principalMotivo: "Porte", qualidadeEvidencias: "BAIXA", acaoRecomendada: fraca.acao.titulo, tipoDado: "DEMONSTRACAO", descricao: fraca.descricao, evidencias: fraca.evidencias };
const instituicoes: InstituicaoAssistente[] = [
  base,
  { ...base, id: "hosp", slug: "hospital-demo", nome: "Hospital Demo", indice: 90, faixa: "MUITO_ALTA", segmentacao: { segmento: "NUCLEO_HOSPITALAR", faixaAderencia: "ALTA", confianca: "ALTA", indiceAderencia: 98, versaoRegra: "2.1.0", justificativa: "", regraAplicada: "", statusRevisao: "NAO_REVISADO", precisaRevisao: true } },
];

describe("Assistente comercial local", () => {
  it("não inventa resumo quando as evidências são insuficientes", () => {
    const resultado = responderAssistente("Prepare um resumo comercial desta instituição.", instituicoes, fraca.slug);
    expect(resultado.resposta).toBe("Não há evidências suficientes para responder com segurança.");
    expect(resultado.instituicoes).toEqual([]);
  });

  it("não inventa resposta para pergunta desconhecida", () => {
    const resultado = responderAssistente("Quem é o diretor desta instituição?", instituicoes);
    expect(resultado.resposta).toBe("Não há evidências suficientes para responder com segurança.");
    expect(resultado.intencaoReconhecida).toBe(false);
  });

  it("filtra por segmento Núcleo Hospitalar", () => {
    const resultado = responderAssistente("Quais instituições pertencem ao Núcleo Hospitalar?", instituicoes);
    expect(resultado.intencaoReconhecida).toBe(true);
    expect(resultado.instituicoes.map((item) => item.slug)).toEqual(["hospital-demo"]);
  });

  it("prioriza oportunidades comerciais (exclui baixa prioridade)", () => {
    const resultado = responderAssistente("Quais oportunidades comerciais devo priorizar?", instituicoes);
    expect(resultado.intencaoReconhecida).toBe(true);
    expect(resultado.instituicoes.map((item) => item.slug)).toEqual(["hospital-demo"]);
  });
});
