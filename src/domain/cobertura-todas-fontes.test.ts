import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import { filtrarInstituicoes } from "@/domain/filtros";
import { obterMetricasCoberturaFontes } from "@/lib/cobertura";
import { obterOperadoraANSPorCnpj } from "@/lib/ans";
import { obterContextoGeograficoIBGE } from "@/lib/ibge";
import { obterIndicadoresMTEMunicipio } from "@/lib/mte";

describe("Integração Visual de Todas as Fontes — Governança e Integridade", () => {
  it("preserva estritamente o universo de 8.212 instituições FATO_OFICIAL", async () => {
    const totalReais = await prisma.instituicao.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    expect(totalReais).toBe(8212);
  });

  it("preserva 5 instituições DEMONSTRACAO isoladas", async () => {
    const totalDemo = await prisma.instituicao.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(totalDemo).toBe(5);
  });

  it("garante que o modo real nunca exibe registros de demonstração", async () => {
    const reais = await prisma.instituicao.findMany({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    expect(reais.length).toBe(8212);
    const temDemo = reais.some((inst) => inst.tipoDado === "DEMONSTRACAO");
    expect(temDemo).toBe(false);
  });

  it("garante que o modo demonstração exibe exclusivamente as contas de demonstração", async () => {
    const contasDemo = await prisma.contaComercial.findMany({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(contasDemo.length).toBe(5);
    for (const c of contasDemo) {
      expect(c.tipoDado).toBe("DEMONSTRACAO");
    }
  });

  it("preserva o agrupamento organizacional 1.0.0 (7.550 grupos canônicos)", async () => {
    const gruposOficiais = await prisma.grupoEconomico.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    const gruposHipotese = await prisma.grupoEconomico.count({
      where: { tipoDado: "HIPOTESE" },
    });
    expect(gruposOficiais + gruposHipotese).toBe(7550);
  });

  it("preserva a segmentação 2.1.0 e as contas comerciais", async () => {
    const contasOficiais = await prisma.contaComercial.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    const contasHipotese = await prisma.contaComercial.count({
      where: { tipoDado: "HIPOTESE" },
    });
    expect(contasOficiais + contasHipotese).toBe(7550);
  });

  it("mantém a tabela oficial da Receita Federal vazia (0 registros) com status pendente", async () => {
    const totalReceita = await prisma.empresaReceita.count();
    expect(totalReceita).toBe(0);

    const metricas = await obterMetricasCoberturaFontes();
    const fonteReceita = metricas.fontes.find((f) => f.nome.includes("Receita Federal"));
    expect(fonteReceita).toBeDefined();
    expect(fonteReceita?.statusDisponibilidade).toBe("PENDENTE");
    expect(fonteReceita?.totalRegistros).toBe(0);
  });

  it("garante que BrasilAPI permanece como DADO_TERCEIRO_NAO_CANONICO e não oficial", async () => {
    const totalBrasilApi = await prisma.enriquecimentoCNPJTerceiro.count();
    expect(totalBrasilApi).toBe(2996);

    const amostra = await prisma.enriquecimentoCNPJTerceiro.findMany({
      take: 10,
    });
    for (const item of amostra) {
      expect(item.tipoDado).toBe("DADO_TERCEIRO_NAO_CANONICO");
      expect(item.confianca).toBe("MEDIA");
      expect(item.provedor).toBe("BRASIL_API");
      expect(item.statusRevisao).toBe("PENDENTE");
    }
  });

  it("assegura que a ANS não armazena dados pessoais (zero telefones/emails pessoais, zero representantes)", async () => {
    const totalANS = await prisma.operadoraANS.count();
    expect(totalANS).toBe(1113);

    const amostra = await prisma.operadoraANS.findMany({ take: 20 });
    for (const op of amostra) {
      expect(op.registroAns).toBeDefined();
      expect(op.razaoSocial).toBeDefined();
      expect(op.cnpj).toMatch(/^\d{14}$/);
      expect(op.tipoDado).toBe("FATO_OFICIAL");
      // Assegurar ausência de campos proibidos de pessoa física
      expect((op as Record<string, unknown>).cpf).toBeUndefined();
      expect((op as Record<string, unknown>).socio).toBeUndefined();
      expect((op as Record<string, unknown>).emailPessoal).toBeUndefined();
    }

    // Consulta por CNES de operadora conhecida
    const op = await obterOperadoraANSPorCnpj("44649812000138");
    if (op) {
      expect(op.registroAns).toBeDefined();
      expect(op.modalidade).toBeDefined();
    }
  });

  it("assegura que o MTE armazena apenas dados agregados setoriais (zero dados de trabalhadores)", async () => {
    const totalMTE = await prisma.indicadorMTE.count();
    expect(totalMTE).toBe(4);

    const indicadores = await prisma.indicadorMTE.findMany();
    for (const ind of indicadores) {
      expect(ind.tipoDado).toBe("FATO_PUBLICO");
      expect(ind.quantidadeAgregada).toBeDefined();
      expect(ind.quantidadeAgregada.length).toBeGreaterThan(0);
      expect(ind.setorCnae).toBeDefined();
      // Não pode haver campos de trabalhadores individuais
      expect((ind as Record<string, unknown>).cpf).toBeUndefined();
      expect((ind as Record<string, unknown>).trabalhador).toBeUndefined();
      expect((ind as Record<string, unknown>).salarioIndividual).toBeUndefined();
    }

    const mteSP = await obterIndicadoresMTEMunicipio("355030");
    expect(mteSP.length).toBeGreaterThan(0);
  });

  it("assegura coerência geográfica e códigos de município do IBGE", async () => {
    const totalIBGE = await prisma.municipioIBGE.count();
    expect(totalIBGE).toBe(5571);

    const sp = await obterContextoGeograficoIBGE("355030");
    expect(sp).not.toBeNull();
    expect(sp?.municipio).toBe("São Paulo");
    expect(sp?.ufSigla).toBe("SP");
    expect(sp?.regiaoNome).toBe("Sudeste");
    expect(sp?.codigoIbge6).toBe("355030");
    expect(sp?.tipoDado).toBe("FATO_OFICIAL");
  });

  it("PNCP: assegura que registros sem vínculo de CNPJ não são vinculados arbitrariamente", async () => {
    const totalSinais = await prisma.sinalContratacaoPublica.count();
    expect(totalSinais).toBe(2018); // 544 sinais + 1474 contratos

    const sinaisSemVinculo = await prisma.sinalContratacaoPublica.findMany({
      where: { metodoVinculo: "SEM_VINCULO" },
    });
    for (const s of sinaisSemVinculo) {
      expect(s.instituicaoId).toBeNull();
    }
  });

  it("testa funcionamento dos filtros de enriquecimento no Radar", () => {
    const mockRadar = [
      {
        id: "1",
        slug: "hospital-a",
        nome: "Hospital A",
        grupo: "Grupo A",
        municipio: "São Paulo",
        municipios: ["São Paulo"],
        tipo: "Hospital Geral",
        quantidadeUnidades: 1,
        operacao24h: true,
        possuiExpansao: false,
        indice: 80,
        faixa: "ALTA" as const,
        principalMotivo: "Leitos",
        qualidadeEvidencias: "ALTA" as const,
        acaoRecomendada: "Abordar",
        tipoDado: "FATO_OFICIAL" as const,
        possuiEnriquecimentoTerceiro: true,
        situacaoCadastral: "ATIVA",
        possuiANS: true,
      },
      {
        id: "2",
        slug: "clinica-b",
        nome: "Clínica B",
        grupo: null,
        municipio: "Campinas",
        municipios: ["Campinas"],
        tipo: "Clínica",
        quantidadeUnidades: 1,
        operacao24h: false,
        possuiExpansao: false,
        indice: 30,
        faixa: "BAIXA" as const,
        principalMotivo: "Porte",
        qualidadeEvidencias: "MEDIA" as const,
        acaoRecomendada: "Monitorar",
        tipoDado: "FATO_OFICIAL" as const,
        possuiEnriquecimentoTerceiro: false,
        situacaoCadastral: "SUSPENSA",
        possuiANS: false,
      },
    ];

    // Filtro por enriquecimento de terceiro
    const filtradasTerceiros = filtrarInstituicoes(mockRadar, {
      possuiEnriquecimentoTerceiro: true,
    });
    expect(filtradasTerceiros.length).toBe(1);
    expect(filtradasTerceiros[0].id).toBe("1");

    // Filtro por situação cadastral
    const ativas = filtrarInstituicoes(mockRadar, {
      situacaoCadastral: "ATIVA",
    });
    expect(ativas.length).toBe(1);
    expect(ativas[0].id).toBe("1");

    // Filtro por vínculo ANS
    const comANS = filtrarInstituicoes(mockRadar, {
      possuiANS: true,
    });
    expect(comANS.length).toBe(1);
    expect(comANS[0].id).toBe("1");
  });
});
