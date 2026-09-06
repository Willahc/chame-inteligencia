import { PrismaClient } from "@prisma/client";
import { ROTULOS_ACOES_COMERCIAIS } from "../src/domain/acao-comercial/recomendar-acao";
import type { ComponenteIndiceComercial, DetalheIndiceComercial } from "../src/domain/contas";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Consolidação de Índices de Prioridade das Instituições ===");

  // 1. Carregar todas as contas comerciais reais com suas instituições
  const contas = await prisma.contaComercial.findMany({
    where: { NOT: { tipoDado: "DEMONSTRACAO" } },
    include: {
      grupoEconomico: {
        include: {
          instituicoes: {
            where: { tipoDado: "FATO_OFICIAL" },
            select: { id: true, nome: true, tipoDado: true },
          },
        },
      },
    },
  });

  console.log(`Carregadas ${contas.length} contas comerciais reais.`);

  const indicesParaInserir: Array<{
    id: string;
    total: number;
    faixa: "MUITO_ALTA" | "ALTA" | "MODERADA" | "BAIXA";
    versao: string;
    calculadoEm: Date;
    instituicaoId: string;
  }> = [];

  const componentesParaInserir: Array<{
    id: string;
    criterio: string;
    rotulo: string;
    peso: number;
    valorObtido: number;
    justificativa: string;
    disponivel: boolean;
    indicePrioridadeId: string;
  }> = [];

  const acoesParaInserir: Array<{
    id: string;
    titulo: string;
    descricao: string;
    prioridade: number;
    concluida: boolean;
    tipoDado: "FATO_OFICIAL";
    instituicaoId: string;
  }> = [];

  const dataReferencia = new Date("2026-09-06T00:00:00.000Z");

  for (const conta of contas) {
    const instituicoes = conta.grupoEconomico?.instituicoes ?? [];
    if (instituicoes.length === 0) continue;

    let componentes: ComponenteIndiceComercial[] = [];
    if (conta.componentesIndiceJson) {
      try {
        const parsed = JSON.parse(conta.componentesIndiceJson) as DetalheIndiceComercial;
        componentes = parsed.componentes || [];
      } catch {
        componentes = [];
      }
    }

    const tituloAcao =
      ROTULOS_ACOES_COMERCIAIS[conta.acaoRecomendada] ?? "Revisar evidências";
    const descricaoAcao =
      conta.justificativaAcao ??
      `Ação recomendada pelo algoritmo de prioridade comercial da conta ${conta.nome}.`;

    for (const inst of instituicoes) {
      const indiceId = `indice-${inst.id}`;

      indicesParaInserir.push({
        id: indiceId,
        total: conta.indicePrioridadeComercial,
        faixa: conta.faixaPrioridadeComercial,
        versao: "1.0.0",
        calculadoEm: dataReferencia,
        instituicaoId: inst.id,
      });

      for (const comp of componentes) {
        componentesParaInserir.push({
          id: `comp-${inst.id}-${comp.criterio}`,
          criterio: comp.criterio,
          rotulo: comp.rotulo,
          peso: comp.peso,
          valorObtido: comp.pontos, // Pontos obtidos de 0 até o peso do componente
          justificativa: comp.justificativa,
          disponivel: true,
          indicePrioridadeId: indiceId,
        });
      }

      acoesParaInserir.push({
        id: `acao-${inst.id}`,
        titulo: tituloAcao,
        descricao: descricaoAcao,
        prioridade: 1,
        concluida: false,
        tipoDado: "FATO_OFICIAL",
        instituicaoId: inst.id,
      });
    }
  }

  console.log(`Preparados ${indicesParaInserir.length} índices, ${componentesParaInserir.length} componentes e ${acoesParaInserir.length} ações.`);

  // Inserção em lotes atômicos com SQLite / Prisma
  // Preservar demonstrações existentes
  await prisma.componenteIndice.deleteMany({
    where: {
      indicePrioridade: {
        instituicao: { tipoDado: "FATO_OFICIAL" },
      },
    },
  });

  await prisma.indicePrioridade.deleteMany({
    where: {
      instituicao: { tipoDado: "FATO_OFICIAL" },
    },
  });

  await prisma.acaoComercial.deleteMany({
    where: {
      instituicao: { tipoDado: "FATO_OFICIAL" },
    },
  });

  // Inserir índices
  const BATCH_SIZE = 1000;
  for (let i = 0; i < indicesParaInserir.length; i += BATCH_SIZE) {
    const batch = indicesParaInserir.slice(i, i + BATCH_SIZE);
    await prisma.indicePrioridade.createMany({
      data: batch,
    });
  }
  console.log("Índices inseridos com sucesso.");

  // Inserir componentes
  for (let i = 0; i < componentesParaInserir.length; i += BATCH_SIZE) {
    const batch = componentesParaInserir.slice(i, i + BATCH_SIZE);
    await prisma.componenteIndice.createMany({
      data: batch,
    });
  }
  console.log("Componentes inseridos com sucesso.");

  // Inserir ações comerciais
  for (let i = 0; i < acoesParaInserir.length; i += BATCH_SIZE) {
    const batch = acoesParaInserir.slice(i, i + BATCH_SIZE);
    await prisma.acaoComercial.createMany({
      data: batch,
    });
  }
  console.log("Ações comerciais inseridas com sucesso.");

  const totalIndices = await prisma.indicePrioridade.count();
  const totalComponentes = await prisma.componenteIndice.count();
  const totalAcoes = await prisma.acaoComercial.count();

  console.log(`Total final no banco: ${totalIndices} índices, ${totalComponentes} componentes, ${totalAcoes} ações.`);
}

main()
  .catch((e) => {
    console.error("Erro na consolidação de índices:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
