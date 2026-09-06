import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import { calcularIndice } from "@/domain/indice/calcular-indice";
import { obterMetricasCoberturaFontes } from "@/lib/cobertura";
import { listarInstituicoes, mapearParaRadar } from "@/lib/dados";

describe("Conclusao do MVP Comercial - Validacoes de Integridade, Governanca e Indices", { timeout: 30000 }, () => {
  describe("1. Indices de Prioridade das Instituicoes Reais", () => {
    it("garante que todas as 8.212 instituicoes reais possuem IndicePrioridade no intervalo [0, 100]", async () => {
      const indices = await prisma.indicePrioridade.findMany({
        where: {
          instituicao: {
            tipoDado: "FATO_OFICIAL",
          },
        },
        select: {
          total: true,
          faixa: true,
          versao: true,
        },
      });

      expect(indices.length).toBe(8212);

      for (const idx of indices) {
        expect(idx.total).toBeGreaterThanOrEqual(0);
        expect(idx.total).toBeLessThanOrEqual(100);
        expect(["MUITO_ALTA", "ALTA", "MODERADA", "BAIXA"]).toContain(idx.faixa);
        expect(idx.versao).toBe("1.0.0");
      }
    });

    it("garante que cada instituicao possui exatamente 11 componentes de indice cadastrados", async () => {
      const amostra = await prisma.instituicao.findMany({
        where: { tipoDado: "FATO_OFICIAL" },
        take: 10,
        include: {
          indice: {
            include: { componentes: true },
          },
        },
      });

      for (const inst of amostra) {
        expect(inst.indice).not.toBeNull();
        expect(inst.indice?.componentes.length).toBe(11);
        const somaPesos = inst.indice?.componentes.reduce((acc, c) => acc + c.peso, 0);
        expect(somaPesos).toBe(100);
      }
    });

    it("garante distribuicao nao nula e diferenciacao de faixas no universo real", async () => {
      const contagemPorFaixa = await prisma.indicePrioridade.groupBy({
        by: ["faixa"],
        where: {
          instituicao: { tipoDado: "FATO_OFICIAL" },
        },
        _count: { id: true },
      });

      const mapaFaixas = Object.fromEntries(contagemPorFaixa.map((c) => [c.faixa, c._count.id]));

      expect(mapaFaixas.MUITO_ALTA ?? 0).toBeGreaterThan(0);
      expect(mapaFaixas.ALTA ?? 0).toBeGreaterThan(0);
      expect(mapaFaixas.MODERADA ?? 0).toBeGreaterThan(0);
      expect(mapaFaixas.BAIXA ?? 0).toBeGreaterThan(0);

      const prioritarias = (mapaFaixas.MUITO_ALTA ?? 0) + (mapaFaixas.ALTA ?? 0);
      expect(prioritarias).toBeGreaterThan(300);
    });

    it("verifica que instituicoes de grande relevancia como Sancta Maggiore atingem faixa ALTA ou MUITO_ALTA", async () => {
      const sancta = await prisma.instituicao.findFirst({
        where: {
          nome: { contains: "SANCTA MAGGIORE" },
          tipoDado: "FATO_OFICIAL",
        },
        include: {
          indice: true,
        },
      });

      expect(sancta).not.toBeNull();
      expect(sancta?.indice).not.toBeNull();
      expect(sancta?.indice?.total).toBeGreaterThanOrEqual(60);
      expect(["ALTA", "MUITO_ALTA"]).toContain(sancta?.indice?.faixa);
    });

    it("garante calculo estritamente deterministico do motor de indice", () => {
      const entradaTeste = {
        operacao24h: true,
        quantidadeUnidades: 2,
        porte: "GRANDE" as const,
        perfilPrivadoCorporativo: true,
        quantidadeMunicipios: 1,
        possuiExpansaoRecente: false,
        potencialDeslocamento: 0.8,
        potencialVisitantes: 0.7,
        facilidadeAcessoDecisor: 0.6,
        qualidadeEvidencias: 1,
      };

      const resultado1 = calcularIndice(entradaTeste);
      const resultado2 = calcularIndice(entradaTeste);

      expect(resultado1.total).toBe(resultado2.total);
      expect(resultado1.faixa).toBe(resultado2.faixa);
      expect(resultado1.componentes).toEqual(resultado2.componentes);
    });
  });

  describe("2. Isolamento Canonico e Integridade dos Modos", () => {
    it("preserva exatamente 8.212 instituicoes FATO_OFICIAL e 5 DEMONSTRACAO", async () => {
      const reais = await prisma.instituicao.count({ where: { tipoDado: "FATO_OFICIAL" } });
      const demos = await prisma.instituicao.count({ where: { tipoDado: "DEMONSTRACAO" } });

      expect(reais).toBe(8212);
      expect(demos).toBe(5);
    });

    it("assegura que listarInstituicoes no modo real nao inclui dados de demonstracao", async () => {
      const instituicoesReais = await listarInstituicoes("MODO_REAL");
      expect(instituicoesReais.length).toBe(8212);

      const contemDemo = instituicoesReais.some((item) => item.tipoDado === "DEMONSTRACAO");
      expect(contemDemo).toBe(false);
    });

    it("assegura que listarInstituicoes no modo demonstracao inclui apenas dados de demonstracao", async () => {
      const instituicoesDemo = await listarInstituicoes("MODO_DEMONSTRACAO");
      expect(instituicoesDemo.length).toBe(5);

      for (const item of instituicoesDemo) {
        expect(item.tipoDado).toBe("DEMONSTRACAO");
      }
    });

    it("preserva 7.550 grupos economicos (7.308 FATO_OFICIAL e 242 HIPOTESE)", async () => {
      const oficiais = await prisma.grupoEconomico.count({ where: { tipoDado: "FATO_OFICIAL" } });
      const hipoteses = await prisma.grupoEconomico.count({ where: { tipoDado: "HIPOTESE" } });

      expect(oficiais).toBe(7308);
      expect(hipoteses).toBe(242);
      expect(oficiais + hipoteses).toBe(7550);
    });

    it("preserva 7.555 contas comerciais com segmentacao 2.1.0", async () => {
      const totalContas = await prisma.contaComercial.count();
      expect(totalContas).toBe(7555);

      const contasDemo = await prisma.contaComercial.count({ where: { tipoDado: "DEMONSTRACAO" } });
      expect(contasDemo).toBe(5);

      const contasReais = await prisma.contaComercial.count({
        where: { tipoDado: { in: ["FATO_OFICIAL", "HIPOTESE"] } },
      });
      expect(contasReais).toBe(7550);
    });
  });

  describe("3. Governanca e Rastreabilidade de Fontes", () => {
    it("confirma que a base oficial da Receita Federal permanece estritamente com 0 registros e status pendente", async () => {
      const totalEmpresasRFB = await prisma.empresaReceita.count();
      expect(totalEmpresasRFB).toBe(0);

      const metricas = await obterMetricasCoberturaFontes();
      const fonteRFB = metricas.fontes.find((f) => f.nome.includes("Receita Federal"));

      expect(fonteRFB).toBeDefined();
      expect(fonteRFB?.statusDisponibilidade).toBe("PENDENTE");
      expect(fonteRFB?.totalRegistros).toBe(0);
    });

    it("confirma que a camada auxiliar BrasilAPI possui 2.996 registros classificados como DADO_TERCEIRO_NAO_CANONICO", async () => {
      const metricas = await obterMetricasCoberturaFontes();
      const fonteBrasilAPI = metricas.fontes.find((f) => f.nome.includes("BrasilAPI"));

      expect(fonteBrasilAPI).toBeDefined();
      expect(fonteBrasilAPI?.tipoDado).toBe("DADO_TERCEIRO_NAO_CANONICO");
      expect(fonteBrasilAPI?.statusDisponibilidade).toBe("AUXILIAR_TERCEIRO");
      expect(fonteBrasilAPI?.totalRegistros).toBe(2996);
    });

    it("garante que os sinais PNCP sem correspondencia de CNPJ exato permanecem strictly SEM_VINCULO", async () => {
      const semVinculo = await prisma.sinalContratacaoPublica.count({
        where: { metodoVinculo: "SEM_VINCULO" },
      });

      expect(semVinculo).toBeGreaterThan(0);

      const invalidos = await prisma.sinalContratacaoPublica.count({
        where: {
          metodoVinculo: "SEM_VINCULO",
          instituicaoId: { not: null },
        },
      });

      expect(invalidos).toBe(0);
    });

    it("assegura que os 123 contatos profissionais publicos possuem rastreabilidade e nao violam privacidade", async () => {
      const contatos = await prisma.contatoProfissional.findMany({
        include: { fonte: true },
      });

      expect(contatos.length).toBe(123);

      for (const c of contatos) {
        expect(c.nome).toBeTruthy();
        expect(c.cargo).toBeTruthy();
        expect(c.fonteId).toBeTruthy();
        expect(c.fonte).not.toBeNull();
        expect((c as Record<string, unknown>).cpf).toBeUndefined();
      }
    });
  });

  describe("4. Mapeamento e Exibicao para o Radar Comercial", () => {
    it("mapeia instituicoes com indices reais, faixas coerentes, motivos e acoes recomendadas", async () => {
      const completas = await listarInstituicoes("MODO_REAL");
      const radarItens = completas.map(mapearParaRadar);

      expect(radarItens.length).toBe(8212);

      const comIndicePositivo = radarItens.filter((item) => item.indice > 0);
      expect(comIndicePositivo.length).toBe(8212);

      const prioritarias = radarItens.filter((item) => item.indice >= 60);
      expect(prioritarias.length).toBeGreaterThan(300);

      for (const item of prioritarias) {
        expect(item.principalMotivo).toBeTruthy();
        expect(item.acaoRecomendada).toBeTruthy();
        expect(item.coberturaDados ?? 100).toBeGreaterThan(0);
      }
    });
  });
});
