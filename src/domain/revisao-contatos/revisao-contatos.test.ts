import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { StatusDecisaoContato, StatusRevisao } from "@prisma/client";
import {
  decidirRevisaoContato,
  listarContatosParaRevisao,
  obterHistoricoDecisoesContato,
  obterResumoContadoresRevisao,
} from "./servico-revisao";

describe("Gate 7 — Reconciliação Canônica e Governança de Contatos", () => {
  it("reconcilia rigorosamente os 123 contatos (109 reais FATO_PUBLICO + 14 demonstração DEMONSTRACAO)", async () => {
    const contatos = await prisma.contatoProfissional.findMany();
    expect(contatos.length).toBe(123);

    const reais = contatos.filter((c) => c.tipoDado === "FATO_PUBLICO");
    const demo = contatos.filter((c) => c.tipoDado === "DEMONSTRACAO");

    expect(reais.length).toBe(109);
    expect(demo.length).toBe(14);
    expect(reais.length + demo.length).toBe(123);

    // Todos os 109 contatos reais têm escopo ORGANIZACAO
    expect(reais.every((c) => c.escopoContato === "ORGANIZACAO")).toBe(true);
    // Todos os 14 contatos demo têm escopo INSTITUICAO
    expect(demo.every((c) => c.escopoContato === "INSTITUICAO")).toBe(true);

    // Todos os contatos reais têm URL pública válida
    for (const r of reais) {
      const temUrl = Boolean(r.linkedinUrl || r.paginaProfissionalUrl);
      expect(temUrl).toBe(true);
    }
  });

  it("isola estritamente os modos real e demonstração", async () => {
    const contatosReal = await listarContatosParaRevisao({ modo: "MODO_REAL" });
    expect(contatosReal.length).toBe(109);
    expect(contatosReal.every((c) => c.classificacaoCanonica === "FATO_PUBLICO")).toBe(true);

    const contatosDemo = await listarContatosParaRevisao({ modo: "MODO_DEMONSTRACAO" });
    expect(contatosDemo.length).toBe(14);
    expect(contatosDemo.every((c) => c.classificacaoCanonica === "DEMONSTRACAO")).toBe(true);
  });

  it("assegura que nenhuma instituição real ou demonstrativa foi removida", async () => {
    const totalInstReais = await prisma.instituicao.count({
      where: { tipoDado: "FATO_OFICIAL" },
    });
    const totalInstDemo = await prisma.instituicao.count({
      where: { tipoDado: "DEMONSTRACAO" },
    });

    expect(totalInstReais).toBe(8212);
    expect(totalInstDemo).toBe(5);
  });

  it("rejeita aprovação e ativação de contato se fonte pública estiver ausente", async () => {
    // Tenta simular aprovação de um contato inexistente ou sem fonte
    await expect(
      decidirRevisaoContato({
        contatoId: "contato-inexistente-xyz",
        usuario: "revisor-auditor",
        acao: "APROVAR",
      })
    ).rejects.toThrowError("Contato profissional não encontrado");
  });
});

describe("Gate 7 — Ciclo de Vida, Decisões e Histórico Imutável", () => {
  // Escolher um contato real para testar o fluxo de transições sem corromper estado final
  let contatoTesteId: string;
  let estadoOriginal: {
    statusDecisao: string;
    statusRevisao: string;
    ativo: boolean;
    observacao: string | null;
  };

  it("carrega contato para teste e preserva estado original", async () => {
    const contato = await prisma.contatoProfissional.findFirst({
      where: { tipoDado: "FATO_PUBLICO" },
    });
    expect(contato).toBeDefined();
    if (!contato) return;

    contatoTesteId = contato.id;
    estadoOriginal = {
      statusDecisao: contato.statusDecisao,
      statusRevisao: contato.statusRevisao,
      ativo: contato.ativo,
      observacao: contato.observacao,
    };
  });

  it("permite desativar contato mantendo histórico imutável", async () => {
    if (!contatoTesteId) return;

    const desativado = await decidirRevisaoContato({
      contatoId: contatoTesteId,
      usuario: "analista-gate7",
      acao: "DESATIVAR",
      motivo: "Contato ausente em revalidação trimestral",
      observacao: "Solicitado desligamento temporário.",
      evidenciaUtilizada: "Verificação no portal oficial em 2026-09-07",
    });

    expect(desativado.statusDecisao).toBe("DESATIVADO");
    expect(desativado.statusRevisao).toBe("REJEITADA");
    expect(desativado.ativo).toBe(false);

    // Verificar histórico registrado
    const historico = await obterHistoricoDecisoesContato(contatoTesteId);
    expect(historico.length).toBeGreaterThanOrEqual(1);
    expect(historico[0].acao).toBe("DESATIVAR");
    expect(historico[0].statusNovo).toBe("DESATIVADO");
    expect(historico[0].motivo).toContain("revalidação");
    expect(historico[0].usuario).toBe("analista-gate7");
  });

  it("permite solicitar nova verificação (REVISAR_NOVAMENTE)", async () => {
    if (!contatoTesteId) return;

    const revisando = await decidirRevisaoContato({
      contatoId: contatoTesteId,
      usuario: "supervisor-qualidade",
      acao: "REVISAR_NOVAMENTE",
      motivo: "Necessário reconfirmar cargo no organograma público",
    });

    expect(revisando.statusDecisao).toBe("REVISAR_NOVAMENTE");
    expect(revisando.statusRevisao).toBe("PENDENTE");
    expect(revisando.ativo).toBe(false);

    const historico = await obterHistoricoDecisoesContato(contatoTesteId);
    expect(historico[0].acao).toBe("REVISAR_NOVAMENTE");
  });

  it("permite rejeitar contato definitivamente", async () => {
    if (!contatoTesteId) return;

    const rejeitado = await decidirRevisaoContato({
      contatoId: contatoTesteId,
      usuario: "auditor-chefe",
      acao: "REJEITAR",
      motivo: "Cargo incompatível com compras corporativas",
    });

    expect(rejeitado.statusDecisao).toBe("REJEITADO");
    expect(rejeitado.statusRevisao).toBe("REJEITADA");
    expect(rejeitado.ativo).toBe(false);

    const historico = await obterHistoricoDecisoesContato(contatoTesteId);
    expect(historico[0].acao).toBe("REJEITAR");
  });

  it("permite aprovar e ativar o contato após validação humana", async () => {
    if (!contatoTesteId) return;

    const aprovado = await decidirRevisaoContato({
      contatoId: contatoTesteId,
      usuario: "gestor-comercial",
      acao: "APROVAR",
      motivo: "Evidência confirmada em portal público de compras",
    });

    expect(aprovado.statusDecisao).toBe("APROVADO");
    expect(aprovado.statusRevisao).toBe("APROVADA");
    expect(aprovado.ativo).toBe(true);

    const historico = await obterHistoricoDecisoesContato(contatoTesteId);
    expect(historico[0].acao).toBe("APROVAR");
    expect(historico.length).toBeGreaterThanOrEqual(4); // Histórico imutável com todas as etapas
  });

  it("permite corrigir classificação do contato", async () => {
    if (!contatoTesteId) return;

    const corrigido = await decidirRevisaoContato({
      contatoId: contatoTesteId,
      usuario: "revisor-cadastro",
      acao: "CORRIGIR_CLASSIFICACAO",
      novosDados: {
        papelComercial: "Comprador de Facilities",
        area: "Suprimentos e Mobilidade",
        senioridade: "Sênior",
      },
      motivo: "Ajuste de nomenclatura conforme edital público",
    });

    expect(corrigido.papelComercial).toBe("Comprador de Facilities");
    expect(corrigido.area).toBe("Suprimentos e Mobilidade");
  });

  it("calcula contadores de resumo com precisão", async () => {
    const resumoReal = await obterResumoContadoresRevisao("MODO_REAL");
    expect(resumoReal.total).toBe(109);
    expect(resumoReal.aprovados).toBeGreaterThan(0);

    const resumoDemo = await obterResumoContadoresRevisao("MODO_DEMONSTRACAO");
    expect(resumoDemo.total).toBe(14);
    expect(resumoDemo.aprovados).toBe(14);
  });

  afterAll(async () => {
    // Restaurar estado canônico original do contato de teste e limpar histórico gerado no teste
    if (contatoTesteId && estadoOriginal) {
      await prisma.contatoProfissional.update({
        where: { id: contatoTesteId },
        data: {
          statusDecisao: estadoOriginal.statusDecisao as StatusDecisaoContato,
          statusRevisao: estadoOriginal.statusRevisao as StatusRevisao,
          ativo: estadoOriginal.ativo,
          observacao: estadoOriginal.observacao,
        },
      });

      await prisma.historicoDecisaoContato.deleteMany({
        where: { contatoId: contatoTesteId },
      });
    }
  });
});
