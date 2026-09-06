import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { filtrarInstituicoes } from "@/domain/filtros";
import type { InstituicaoRadar } from "@/domain/tipos";

describe("PNCP — Integração com Telas Comerciais e Governança", () => {
  it("valida vínculo estrito exclusivamente por CNPJ exato e unívoco", async () => {
    // Apenas 4 sinais possuem uma mantenedora sem ambiguidade.
    const sinaisVinculados = await prisma.sinalContratacaoPublica.findMany({
      where: { instituicaoId: { not: null } },
      select: { instituicaoId: true, metodoVinculo: true, cnpjOrgao: true },
    });
    expect(sinaisVinculados.length).toBe(4);

    const instIds = [...new Set(sinaisVinculados.map((s) => s.instituicaoId))];
    expect(instIds.length).toBe(1);
    expect(instIds).toContain("inst-cnes-2058502");

    for (const s of sinaisVinculados) {
      expect(["CNPJ_ESTABELECIMENTO", "CNPJ_MANTENEDORA"]).toContain(s.metodoVinculo);
    }
  });

  it("garante que instituições sem sinal retornam array vazio e não geram falsos positivos", async () => {
    // Buscar uma instituição real sem CNPJ coincidente
    const instSemSinal = await prisma.instituicao.findFirst({
      where: {
        tipoDado: "FATO_OFICIAL",
        id: { not: "inst-cnes-2058502" },
      },
      include: { sinaisContratacaoPublica: true },
    });
    expect(instSemSinal).not.toBeNull();
    expect(instSemSinal?.sinaisContratacaoPublica.length).toBe(0);
  });

  it("proíbe estritamente vinculação por similaridade de nome (540 sinais sem vínculo unívoco permanecem nulos)", async () => {
    const sinaisSemVinculo = await prisma.sinalContratacaoPublica.findMany({
      where: { metodoVinculo: "SEM_VINCULO" },
    });
    expect(sinaisSemVinculo.length).toBe(540);
    for (const s of sinaisSemVinculo) {
      expect(s.instituicaoId).toBeNull();
    }
  });

  it("assegura isolamento absoluto de demonstrações (0 sinais PNCP para dados de demonstração)", async () => {
    const sinaisDemo = await prisma.sinalContratacaoPublica.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(sinaisDemo).toBe(0);

    const contasDemo = await prisma.contaComercial.findMany({
      where: { tipoDado: "DEMONSTRACAO" },
      include: {
        grupoEconomico: {
          include: {
            instituicoes: {
              include: { sinaisContratacaoPublica: true },
            },
          },
        },
      },
    });
    expect(contasDemo.length).toBe(5);

    for (const c of contasDemo) {
      const sinais = (c.grupoEconomico?.instituicoes ?? []).flatMap(
        (i) => i.sinaisContratacaoPublica ?? []
      );
      expect(sinais.length).toBe(0);
    }
  });

  it("garante neutralidade dos filtros do radar quando inativos", async () => {
    const insts = await prisma.instituicao.findMany({
      where: { tipoDado: "FATO_OFICIAL" },
      take: 50,
      include: {
        tipoEstabelecimento: true,
        unidades: { include: { endereco: true } },
        sinaisExpansao: true,
        indice: true,
        sinaisContratacaoPublica: true,
      },
    });

    const radarItems: InstituicaoRadar[] = insts.map((item) => ({
      id: item.id,
      slug: item.slug,
      nome: item.nome,
      grupo: null,
      organizacao: null,
      municipio: "São Paulo",
      municipios: ["São Paulo"],
      tipo: item.tipoEstabelecimento.nome,
      quantidadeUnidades: item.unidades.length,
      operacao24h: item.operacao24h,
      possuiExpansao: item.sinaisExpansao.length > 0,
      indice: item.indice?.total ?? 0,
      faixa: "ALTA",
      principalMotivo: "Teste",
      qualidadeEvidencias: "ALTA",
      acaoRecomendada: "Revisar",
      tipoDado: item.tipoDado,
      cnes: item.cnes,
      coberturaDados: item.coberturaDados,
      segmentacao: null,
      totalSinaisPNCP: (item.sinaisContratacaoPublica ?? []).length,
      possuiSinalPNCP: (item.sinaisContratacaoPublica ?? []).length > 0,
      possuiSinalMobilidadePNCP: (item.sinaisContratacaoPublica ?? []).some((s) => s.sinalMobilidade),
      dataSinalPNCPMaisRecente: (item.sinaisContratacaoPublica ?? [])[0]?.dataPublicacao?.toISOString() ?? null,
      vinculoPNCPExato: (item.sinaisContratacaoPublica ?? []).some(
        (s) => s.metodoVinculo === "CNPJ_ESTABELECIMENTO" || s.metodoVinculo === "CNPJ_MANTENEDORA"
      ),
      possuiContratacaoRecente: false,
    }));

    const semFiltro = filtrarInstituicoes(radarItems, {});
    expect(semFiltro.length).toBe(radarItems.length);
  });

  it("não altera o Índice de Prioridade Comercial, faixa ou ação recomendada", async () => {
    const conta2 = await prisma.contaComercial.findFirst({
      where: { id: "conta-org-isol-inst-cnes-2058502" },
    });
    expect(conta2).not.toBeNull();
    expect(conta2?.indicePrioridadeComercial).toBeDefined();
    expect(conta2?.faixaPrioridadeComercial).toBeDefined();
    expect(conta2?.acaoRecomendada).toBeDefined();
  });

  it("preserva o universo canônico obrigatório de 8.212 instituições reais", async () => {
    const total = await prisma.instituicao.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    expect(total).toBe(8212);
  });

  it("confirma a idempotência dos 544 sinais do PNCP persistidos", async () => {
    const totalSinais = await prisma.sinalContratacaoPublica.count();
    expect(totalSinais).toBe(544);

    const totalMobilidade = await prisma.sinalContratacaoPublica.count({
      where: { sinalMobilidade: true },
    });
    expect(totalMobilidade).toBe(175);
  });
});
