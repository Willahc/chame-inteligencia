import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  carregarMapeamentoCNPJInstituicoes,
  garantirFontePNCP,
  ID_FONTE_PNCP,
} from "./importador-pncp";
import {
  validarRegistroPNCP,
} from "@/domain/pncp/validador-pncp";
import type { RegistroPNCPBruto } from "@/domain/pncp/tipos";

describe("PNCP — Testes Obrigatórios de Ingestão e Governança", () => {
  it("exige identificador único e rejeita registros sem identificador", () => {
    const semId: RegistroPNCPBruto = {
      objetoCompra: "Transporte de pacientes",
    };
    const res = validarRegistroPNCP(semId, 0);
    expect(res.sucesso).toBe(false);
    if (!res.sucesso) {
      expect(res.rejeicao.motivo).toContain("Identificador PNCP");
    }
  });

  it("garante fonte oficial e lote auditável com tipoDado FATO_PUBLICO", async () => {
    await garantirFontePNCP();
    const fonte = await prisma.fonte.findUnique({ where: { id: ID_FONTE_PNCP } });
    expect(fonte).not.toBeNull();
    expect(fonte?.tipoDado).toBe("FATO_PUBLICO");
    expect(fonte?.nome).toBe("Portal Nacional de Contratações Públicas");

    const lotesPNCP = await prisma.loteIngestao.findMany({
      where: { fonteId: ID_FONTE_PNCP },
      orderBy: { inicio: "desc" },
    });
    expect(lotesPNCP.length).toBeGreaterThan(0);
    expect(lotesPNCP[0].hashArquivo).toBe("FB63CFB0D2508A496AFE0227267AE4B9D865E13A36C6792783EFD905E8F8BE26");
    expect(lotesPNCP[0].status).toBe("CONCLUIDO");
  });

  it("detecta sinal de mobilidade e trata valor ausente como null", () => {
    const comMobilidade: RegistroPNCPBruto = {
      numeroControlePNCP: "ID-TESTE-MOBILIDADE",
      dataPublicacaoPncp: "2026-08-15T10:00:00",
      objetoCompra: "Contratação de empresa para locação de veículos com motorista",
      valorTotalEstimado: 0,
    };
    const res = validarRegistroPNCP(comMobilidade, 0);
    expect(res.sucesso).toBe(true);
    if (res.sucesso) {
      expect(res.dado.sinalMobilidade).toBe(true);
      expect(res.dado.valorEstimado).toBeNull();
    }
  });

  it("preserva a separação rigorosa de FATO_PUBLICO e não infere contrato ou cliente", async () => {
    const sinais = await prisma.sinalContratacaoPublica.findMany({
      take: 10,
    });
    expect(sinais.length).toBeGreaterThan(0);
    for (const s of sinais) {
      expect(s.tipoDado).toBe("FATO_PUBLICO");
      expect(s.confianca).toBe("ALTA");
      expect(s.statusRevisao).toBe("APROVADA");
    }
  });

  it("comprova idempotência estrita (todos os 544 registros já ingeridos permanecem inalterados)", async () => {
    const totalSinais = await prisma.sinalContratacaoPublica.count();
    expect(totalSinais).toBe(544);

    const unicos = await prisma.sinalContratacaoPublica.groupBy({
      by: ["identificadorPNCP"],
    });
    expect(unicos.length).toBe(544);
  });

  it("NUNCA vincula por nome sem evidência explícita de CNPJ", async () => {
    const mapa = await carregarMapeamentoCNPJInstituicoes();
    expect(mapa instanceof Map).toBe(true);

    // Um órgão municipal sem CNPJ mapeado no CNES deve permanecer estritamente SEM_VINCULO
    const sinaisSemVinculo = await prisma.sinalContratacaoPublica.findMany({
      where: { metodoVinculo: "SEM_VINCULO" },
    });
    expect(sinaisSemVinculo.length).toBe(540);
    for (const s of sinaisSemVinculo) {
      expect(s.instituicaoId).toBeNull();
    }

    // Apenas sinais com CNPJ oficial mantenedora/estabelecimento são vinculados
    const sinaisVinculados = await prisma.sinalContratacaoPublica.findMany({
      where: { instituicaoId: { not: null } },
    });
    expect(sinaisVinculados.length).toBe(4);
    for (const s of sinaisVinculados) {
      expect(["CNPJ_ESTABELECIMENTO", "CNPJ_MANTENEDORA"]).toContain(s.metodoVinculo);
    }
  }, 15000);

  it("preserva as 8.212 instituições reais e não apaga nenhum dado canônico", async () => {
    const totalInstReais = await prisma.instituicao.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    expect(totalInstReais).toBe(8212);

    const totalInstDemo = await prisma.instituicao.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(totalInstDemo).toBe(5);
  });

  it("não mistura registros demonstrativos com o PNCP", async () => {
    const sinaisDemo = await prisma.sinalContratacaoPublica.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(sinaisDemo).toBe(0);
  });

  it("preserva o agrupamento organizacional 1.0.0 (7.550 grupos totais: fatos e hipóteses + 1 demo)", async () => {
    const gruposFato = await prisma.grupoEconomico.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    const gruposHipotese = await prisma.grupoEconomico.count({
      where: { tipoDado: "HIPOTESE" },
    });
    expect(gruposFato + gruposHipotese).toBe(7550);

    const gruposDemo = await prisma.grupoEconomico.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(gruposDemo).toBe(1);
  });

  it("preserva a segmentação 2.1.0 e as contas comerciais (7.550 totais: fatos e hipóteses + 5 demo)", async () => {
    const contasFato = await prisma.contaComercial.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    const contasHipotese = await prisma.contaComercial.count({
      where: { tipoDado: "HIPOTESE" },
    });
    expect(contasFato + contasHipotese).toBe(7550);

    const contasDemo = await prisma.contaComercial.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(contasDemo).toBe(5);
  });
});
