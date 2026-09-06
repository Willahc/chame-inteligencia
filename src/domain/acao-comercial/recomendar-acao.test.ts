import { describe, expect, it } from "vitest";
import { recomendarAcaoComercial } from "./recomendar-acao";

describe("Recomendação Determinística de Ação Comercial", () => {
  it("recomenda REVISAR_VINCULO quando o vínculo for INCERTO", () => {
    const resultado = recomendarAcaoComercial({
      faixaPrioridadeComercial: "MUITO_ALTA",
      totalPontos: 85,
      natureza: "PRIVADO",
      tipoVinculo: "INCERTO",
      confiancaOrganizacional: "BAIXA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 2,
      quantidadeUnidades: 4,
    });

    expect(resultado.acao).toBe("REVISAR_VINCULO");
    expect(resultado.titulo).toBe("Revisar vínculo");
  });

  it("recomenda AGUARDAR_ENRIQUECIMENTO se cobertura de dados for inferior a 60%", () => {
    const resultado = recomendarAcaoComercial({
      faixaPrioridadeComercial: "ALTA",
      totalPontos: 70,
      natureza: "PRIVADO",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 50,
      quantidadeContatosAtivos: 1,
      quantidadeUnidades: 2,
    });

    expect(resultado.acao).toBe("AGUARDAR_ENRIQUECIMENTO");
  });

  it("recomenda BAIXA_PRIORIDADE para instituições de natureza pública", () => {
    const resultado = recomendarAcaoComercial({
      faixaPrioridadeComercial: "ALTA",
      totalPontos: 75,
      natureza: "PUBLICO",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 2,
      quantidadeUnidades: 5,
    });

    expect(resultado.acao).toBe("BAIXA_PRIORIDADE");
  });

  it("recomenda ABORDAR_IMEDIATAMENTE para conta privada de faixa ALTA com contatos", () => {
    const resultado = recomendarAcaoComercial({
      faixaPrioridadeComercial: "ALTA",
      totalPontos: 68,
      natureza: "PRIVADO",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 3,
      quantidadeUnidades: 3,
    });

    expect(resultado.acao).toBe("ABORDAR_IMEDIATAMENTE");
  });

  it("recomenda PESQUISAR_MELHOR para conta privada de faixa ALTA sem contatos mapeados", () => {
    const resultado = recomendarAcaoComercial({
      faixaPrioridadeComercial: "ALTA",
      totalPontos: 68,
      natureza: "PRIVADO",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 0,
      quantidadeUnidades: 3,
    });

    expect(resultado.acao).toBe("PESQUISAR_MELHOR");
  });
});
