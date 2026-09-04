import { describe, expect, it } from "vitest";
import { responderAssistente } from "./assistente";
import type { InstituicaoAssistente } from "./tipos";
import { INSTITUICOES_DEMONSTRACAO } from "@/data/demonstracao";

const fraca = INSTITUICOES_DEMONSTRACAO.find((item) => item.slug === "instituto-clinico-demonstracao")!;
const instituicoes: InstituicaoAssistente[] = [{ id: fraca.id, slug: fraca.slug, nome: fraca.nome, grupo: null, municipio: "Recife", municipios: ["Recife"], tipo: fraca.tipo.nome, quantidadeUnidades: 1, operacao24h: false, possuiExpansao: false, indice: 20, faixa: "BAIXA", principalMotivo: "Porte", qualidadeEvidencias: "BAIXA", acaoRecomendada: fraca.acao.titulo, tipoDado: "DEMONSTRACAO", descricao: fraca.descricao, evidencias: fraca.evidencias }];

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
});
