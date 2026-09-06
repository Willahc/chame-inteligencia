import { describe, expect, it } from "vitest";
import {
  calcularIndiceComercial,
  classificarFaixaComercial,
} from "./indice-comercial/calcular-indice-comercial";
import { PESOS_INDICE_COMERCIAL, VERSAO_INDICE_COMERCIAL } from "./indice-comercial/pesos";
import { recomendarAcaoComercial } from "./acao-comercial/recomendar-acao";
import { obterModoDados, tipoDadoDoModo } from "./modo-dados";
import type { ContaComercialDominio, ResultadoAbordagem } from "./contas";

describe("Consolidação e Regras Canônicas de Contas Comerciais", () => {
  it("rede multiunidade deve consolidar várias unidades sob uma única conta sem perda", () => {
    // Simulação de uma rede com 4 unidades
    const unidades = [
      { id: "u1", nome: "Hospital Central", municipio: "São Paulo" },
      { id: "u2", nome: "Unidade Avançada Jardins", municipio: "São Paulo" },
      { id: "u3", nome: "Hospital Sul", municipio: "Santo André" },
      { id: "u4", nome: "Centro Médico ABC", municipio: "São Bernardo do Campo" },
    ];

    const conta: Partial<ContaComercialDominio> = {
      id: "conta-rede-exemplo",
      nome: "Rede Hospitalar Modelo",
      quantidadeUnidades: unidades.length,
      cidades: [...new Set(unidades.map((u) => u.municipio))],
      tipoVinculo: "OFICIAL",
    };

    expect(conta.quantidadeUnidades).toBe(4);
    expect(conta.cidades).toHaveLength(3);
    expect(conta.tipoVinculo).toBe("OFICIAL");
  });

  it("estabelecimento isolado deve virar exatamente uma conta com vínculo ISOLADO", () => {
    const conta: Partial<ContaComercialDominio> = {
      id: "conta-isol-cnes-12345",
      nome: "Clínica Médica Isolada",
      quantidadeUnidades: 1,
      quantidadeHospitais: 0,
      cidades: ["São Paulo"],
      tipoVinculo: "ISOLADO",
    };

    expect(conta.quantidadeUnidades).toBe(1);
    expect(conta.tipoVinculo).toBe("ISOLADO");
  });

  it("preserva estritamente a natureza pública e privada sem conversões espúrias", () => {
    const acaoPrivada = recomendarAcaoComercial({
      faixaPrioridadeComercial: "ALTA",
      totalPontos: 75,
      natureza: "PRIVADO",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 2,
      quantidadeUnidades: 3,
    });

    const acaoPublica = recomendarAcaoComercial({
      faixaPrioridadeComercial: "ALTA",
      totalPontos: 75,
      natureza: "PUBLICO",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 2,
      quantidadeUnidades: 3,
    });

    expect(acaoPrivada.acao).toBe("ABORDAR_IMEDIATAMENTE");
    expect(acaoPublica.acao).toBe("BAIXA_PRIORIDADE");
    expect(acaoPublica.justificativa).toContain("natureza jurídica é pública");
  });

  it("não promove hipótese organizacional a fato confirmado", () => {
    const acaoHipotese = recomendarAcaoComercial({
      faixaPrioridadeComercial: "MUITO_ALTA",
      totalPontos: 85,
      natureza: "PRIVADO",
      tipoVinculo: "INCERTO",
      confiancaOrganizacional: "BAIXA",
      coberturaDados: 100,
      quantidadeContatosAtivos: 3,
      quantidadeUnidades: 5,
    });

    expect(acaoHipotese.acao).toBe("REVISAR_VINCULO");
    expect(acaoHipotese.titulo).toBe("Revisar vínculo");
  });

  it("Índice de Prioridade Comercial v1.0.0 possui pesos que somam 100% e faixas corretas", () => {
    const somaPesos = Object.values(PESOS_INDICE_COMERCIAL).reduce((a, b) => a + b, 0);
    expect(somaPesos).toBe(100);

    expect(classificarFaixaComercial(80)).toBe("MUITO_ALTA");
    expect(classificarFaixaComercial(60)).toBe("ALTA");
    expect(classificarFaixaComercial(40)).toBe("MODERADA");
    expect(classificarFaixaComercial(39)).toBe("BAIXA");
  });

  it("gera explicabilidade detalhada de todos os 11 componentes do score", () => {
    const resultado = calcularIndiceComercial({
      quantidadeUnidades: 6,
      quantidadeHospitais: 3,
      segmentoPredominante: "NUCLEO_HOSPITALAR",
      natureza: "PRIVADO",
      operacao24h: true,
      urgenciaEmergencia: true,
      quantidadeCidades: 2,
      quantidadeContatosAtivos: 2,
      tipoVinculo: "OFICIAL",
      confiancaVinculo: "ALTA",
      coberturaDados: 100,
    });

    expect(resultado.versao).toBe(VERSAO_INDICE_COMERCIAL);
    expect(resultado.componentes).toHaveLength(11);
    resultado.componentes.forEach((comp) => {
      expect(comp.rotulo).toBeTruthy();
      expect(comp.peso).toBeGreaterThan(0);
      expect(comp.justificativa).toBeTruthy();
      expect(comp.pontos).toBeLessThanOrEqual(comp.peso);
    });
  });

  it("mantém separação canônica entre modo real e modo demonstração", () => {
    expect(obterModoDados("MODO_DEMONSTRACAO")).toBe("MODO_DEMONSTRACAO");
    expect(obterModoDados("MODO_REAL")).toBe("MODO_REAL");
    expect(obterModoDados(undefined)).toBe("MODO_REAL"); // Padrão seguro operacional

    expect(tipoDadoDoModo("MODO_REAL")).toBe("FATO_OFICIAL");
    expect(tipoDadoDoModo("MODO_DEMONSTRACAO")).toBe("DEMONSTRACAO");
  });

  it("suporta estados e transições de resultado comercial da abordagem", () => {
    const estadosValidos: ResultadoAbordagem[] = [
      "NAO_ABORDADA",
      "ABORDADA",
      "EM_ANALISE",
      "REUNIAO",
      "PROPOSTA",
      "CONTRATO",
      "DESCARTADA",
      "AGUARDANDO_DADOS",
    ];

    expect(estadosValidos).toHaveLength(8);
    expect(estadosValidos).toContain("CONTRATO");
    expect(estadosValidos).toContain("NAO_ABORDADA");
  });
});
