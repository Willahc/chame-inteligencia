import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import { obterMetricasCoberturaFontes } from "@/lib/cobertura";

describe("Auditoria e Resolução da Divergência PNCP", () => {
  it("confirma contagem canônica exata de sinais e contratos PNCP", async () => {
    const totalProcessos = await prisma.sinalContratacaoPublica.count();
    expect(totalProcessos).toBe(2018);

    const quantidadeSinais = await prisma.sinalContratacaoPublica.count({
      where: { categoriaPNCP: "SINAL_CONTRATACAO" },
    });
    expect(quantidadeSinais).toBe(544);

    const quantidadeContratos = await prisma.sinalContratacaoPublica.count({
      where: { categoriaPNCP: "CONTRATO_CONFIRMADO" },
    });
    expect(quantidadeContratos).toBe(1474);

    expect(quantidadeSinais + quantidadeContratos).toBe(2018);
  });

  it("garante unicidade estrita por identificadorPNCP (zero duplicatas)", async () => {
    const totalProcessos = await prisma.sinalContratacaoPublica.count();
    const gruposIdentificador = await prisma.sinalContratacaoPublica.groupBy({
      by: ["identificadorPNCP"],
      _count: true,
    });
    expect(gruposIdentificador.length).toBe(totalProcessos);
    expect(gruposIdentificador.length).toBe(2018);
  });

  it("resolve a divergência de 156 vs 4: exatamente 1 instituição vinculada por CNPJ exato com 4 processos", async () => {
    const processosVinculados = await prisma.sinalContratacaoPublica.findMany({
      where: { instituicaoId: { not: null } },
      select: {
        id: true,
        categoriaPNCP: true,
        identificadorPNCP: true,
        cnpjOrgao: true,
        metodoVinculo: true,
        confiancaVinculo: true,
        instituicaoId: true,
        instituicao: {
          select: {
            id: true,
            nome: true,
            cnes: true,
          },
        },
      },
    });

    // Exatamente 4 processos estão vinculados no banco
    expect(processosVinculados.length).toBe(4);

    // Todos os 4 processos são sinais de contratação
    for (const p of processosVinculados) {
      expect(p.categoriaPNCP).toBe("SINAL_CONTRATACAO");
      expect(p.metodoVinculo).toBe("CNPJ_MANTENEDORA");
      expect(p.cnpjOrgao?.replace(/\D/g, "")).toBe("60747318000162");
      expect(p.instituicaoId).toBe("inst-cnes-2058502");
      expect(p.instituicao?.cnes).toBe("2058502");
    }

    // Apenas 1 instituição distinta está vinculada
    const instituicoesDistintas = [
      ...new Set(processosVinculados.map((p) => p.instituicaoId)),
    ];
    expect(instituicoesDistintas.length).toBe(1);
    expect(instituicoesDistintas[0]).toBe("inst-cnes-2058502");
  });

  it("garante que os 2.014 registros restantes estão preservados como SEM_VINCULO", async () => {
    const semVinculo = await prisma.sinalContratacaoPublica.count({
      where: { instituicaoId: null },
    });
    expect(semVinculo).toBe(2014);

    const semVinculoPorMetodo = await prisma.sinalContratacaoPublica.count({
      where: { metodoVinculo: "SEM_VINCULO" },
    });
    expect(semVinculoPorMetodo).toBe(2014);

    // Zero registros sem vínculo podem possuir instituicaoId
    const contradicoes = await prisma.sinalContratacaoPublica.count({
      where: {
        metodoVinculo: "SEM_VINCULO",
        instituicaoId: { not: null },
      },
    });
    expect(contradicoes).toBe(0);
  });

  it("garante que órgãos centrais com múltiplos estabelecimentos (ambíguos) não são forçados", async () => {
    // A Secretaria de Estado da Saúde de SP (CNPJ 46.374.500/0001-94) possui 969 processos (817 contratos + 152 sinais)
    const processosSES = await prisma.sinalContratacaoPublica.findMany({
      where: { cnpjOrgao: "46374500000194" },
      select: { instituicaoId: true, metodoVinculo: true, categoriaPNCP: true },
    });
    expect(processosSES.length).toBe(969);

    const contratosSES = processosSES.filter((p) => p.categoriaPNCP === "CONTRATO_CONFIRMADO");
    const sinaisSES = processosSES.filter((p) => p.categoriaPNCP === "SINAL_CONTRATACAO");
    expect(contratosSES.length).toBe(817);
    expect(sinaisSES.length).toBe(152);

    // Nenhum processo da SES pode ser atribuído arbitrariamente a um único hospital
    for (const c of processosSES) {
      expect(c.instituicaoId).toBeNull();
      expect(c.metodoVinculo).toBe("SEM_VINCULO");
    }
  });

  it("confirma que contratos e sinais foram importados em lotes distintos e rastreáveis", async () => {
    const lotesSinais = await prisma.sinalContratacaoPublica.findMany({
      where: { categoriaPNCP: "SINAL_CONTRATACAO" },
      select: { loteId: true },
      distinct: ["loteId"],
    });
    expect(lotesSinais.length).toBe(1);
    expect(lotesSinais[0].loteId).toBe("LOTE_PNCP_20260906203034");

    const lotesContratos = await prisma.sinalContratacaoPublica.findMany({
      where: { categoriaPNCP: "CONTRATO_CONFIRMADO" },
      select: { loteId: true },
      distinct: ["loteId"],
    });
    expect(lotesContratos.length).toBe(1);
    expect(lotesContratos[0].loteId).toBe("LOTE_PNCP_CONTRATOS_2026-09-06");

    expect(lotesSinais[0].loteId).not.toBe(lotesContratos[0].loteId);
  });

  it("valida que obterMetricasCoberturaFontes reporta métricas dinâmicas e inequívocas", async () => {
    const metricas = await obterMetricasCoberturaFontes();

    expect(metricas.totalProcessosPNCP).toBe(2018);
    expect(metricas.totalSinaisPNCP).toBe(544);
    expect(metricas.totalContratosPNCP).toBe(1474);
    expect(metricas.totalPNCPRegistrosVinculados).toBe(4);
    expect(metricas.totalPNCPRegistrosSemVinculo).toBe(2014);
    expect(metricas.totalInstituicoesVinculoExatoPNCP).toBe(1);
    expect(metricas.coberturaPNCP).toBe(1);

    const fontePNCP = metricas.fontes.find((f) => f.nome.includes("PNCP"));
    expect(fontePNCP).toBeDefined();
    expect(fontePNCP?.totalRegistros).toBe(2018);
    expect(fontePNCP?.coberturaInstituicoes).toBe(1);
  });
});
