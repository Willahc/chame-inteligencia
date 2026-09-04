import { PrismaClient } from "@prisma/client";
import { INSTITUICOES_DEMONSTRACAO } from "../src/data/demonstracao";
import { calcularIndice } from "../src/domain/indice/calcular-indice";

const prisma = new PrismaClient();

async function limpar() {
  await prisma.componenteIndice.deleteMany();
  await prisma.indicePrioridade.deleteMany();
  await prisma.acaoComercial.deleteMany();
  await prisma.sinalExpansao.deleteMany();
  await prisma.evidencia.deleteMany();
  await prisma.fonte.deleteMany();
  await prisma.areaDecisora.deleteMany();
  await prisma.necessidadeMobilidade.deleteMany();
  await prisma.servicoSaude.deleteMany();
  await prisma.endereco.deleteMany();
  await prisma.unidade.deleteMany();
  await prisma.instituicao.deleteMany();
  await prisma.tipoEstabelecimento.deleteMany();
  await prisma.grupoEconomico.deleteMany();
}

async function carregar() {
  await limpar();

  for (const item of INSTITUICOES_DEMONSTRACAO) {
    if (item.grupo) {
      await prisma.grupoEconomico.upsert({
        where: { id: item.grupo.id },
        update: {},
        create: { ...item.grupo, tipoDado: "DEMONSTRACAO" },
      });
    }
    await prisma.tipoEstabelecimento.upsert({
      where: { id: item.tipo.id },
      update: {},
      create: item.tipo,
    });

    await prisma.instituicao.create({
      data: {
        id: item.id,
        slug: item.slug,
        nome: item.nome,
        descricao: item.descricao,
        operacao24h: item.operacao24h,
        porte: item.porte,
        perfilCorporativo: item.perfilCorporativo,
        tipoDado: "DEMONSTRACAO",
        grupoEconomicoId: item.grupo?.id,
        tipoEstabelecimentoId: item.tipo.id,
        unidades: {
          create: item.unidades.map((unidade) => ({
            id: unidade.id,
            nome: unidade.nome,
            operacao24h: unidade.operacao24h,
            tipoDado: "DEMONSTRACAO",
            endereco: { create: { id: `end-${unidade.id}`, ...unidade.endereco, tipoDado: "DEMONSTRACAO" } },
          })),
        },
        servicos: { create: item.servicos.map((nome, indice) => ({ id: `serv-${item.id}-${indice}`, nome, tipoDado: "DEMONSTRACAO" })) },
        necessidades: { create: item.necessidades.map((necessidade, indice) => ({ id: `nec-${item.id}-${indice}`, ...necessidade, tipoDado: "DEMONSTRACAO" })) },
        areasDecisoras: { create: item.areasDecisoras.map((area, indice) => ({ id: `area-${item.id}-${indice}`, ...area, tipoDado: "DEMONSTRACAO" })) },
        acoesComerciais: { create: { id: `acao-${item.id}`, ...item.acao, prioridade: 1, tipoDado: "DEMONSTRACAO" } },
      },
    });

    for (const registro of item.evidencias) {
      await prisma.fonte.upsert({
        where: { id: registro.fonte.id },
        update: {},
        create: {
          id: registro.fonte.id,
          nome: registro.fonte.nome,
          url: registro.fonte.url,
          identificador: registro.fonte.identificador,
          tipoDado: "DEMONSTRACAO",
        },
      });
      await prisma.evidencia.create({
        data: {
          id: registro.id,
          titulo: registro.titulo,
          descricao: registro.descricao,
          observacao: registro.observacao,
          dataColeta: new Date(registro.dataColeta),
          dataReferencia: registro.dataReferencia ? new Date(registro.dataReferencia) : null,
          tipo: "DEMONSTRACAO",
          confianca: registro.confianca,
          statusRevisao: registro.statusRevisao,
          instituicaoId: item.id,
          fonteId: registro.fonte.id,
        },
      });
    }

    for (const sinal of item.sinaisExpansao) {
      await prisma.sinalExpansao.create({
        data: {
          id: sinal.id,
          titulo: sinal.titulo,
          descricao: sinal.descricao,
          dataReferencia: new Date(sinal.dataReferencia),
          tipoDado: "DEMONSTRACAO",
          instituicaoId: item.id,
          evidencias: { connect: sinal.evidenciaIds.map((id) => ({ id })) },
        },
      });
    }

    const municipios = new Set(item.unidades.map((unidade) => unidade.endereco.municipio));
    const evidenciaIds = item.evidencias.map(({ id }) => id);
    const resultado = calcularIndice({
      operacao24h: item.operacao24h,
      quantidadeUnidades: item.unidades.length,
      porte: item.porte,
      perfilPrivadoCorporativo: item.perfilCorporativo,
      quantidadeMunicipios: municipios.size,
      possuiExpansaoRecente: item.sinaisExpansao.length > 0,
      ...item.fatoresIndice,
      evidenciasPorCriterio: Object.fromEntries(
        ["operacao24h", "quantidadeUnidades", "porteCapacidade", "perfilPrivadoCorporativo", "dispersaoGeografica", "expansao", "deslocamentoEntreUnidades", "visitantesExternos", "acessoDecisor", "qualidadeEvidencias"].map((criterio) => [criterio, evidenciaIds]),
      ),
    });

    await prisma.indicePrioridade.create({
      data: {
        id: `indice-${item.id}`,
        total: resultado.total,
        faixa: resultado.faixa,
        versao: resultado.versao,
        calculadoEm: new Date("2026-09-04T12:00:00.000Z"),
        instituicaoId: item.id,
        componentes: {
          create: resultado.componentes.map((componente) => ({
            id: `comp-${item.id}-${componente.criterio}`,
            criterio: componente.criterio,
            rotulo: componente.rotulo,
            peso: componente.peso,
            valorObtido: componente.valorObtido,
            justificativa: componente.justificativa,
            evidencias: { connect: componente.evidenciaIds.map((id) => ({ id })) },
          })),
        },
      },
    });
  }
}

carregar()
  .then(async () => {
    await prisma.$executeRawUnsafe("PRAGMA optimize");
    console.log(`Base demonstrativa carregada: ${INSTITUICOES_DEMONSTRACAO.length} instituições.`);
  })
  .finally(async () => prisma.$disconnect());
