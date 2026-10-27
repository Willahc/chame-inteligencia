import { PrismaClient, type Prisma } from "@prisma/client";
import {
  calcularIndiceComercial,
} from "../src/domain/indice-comercial/calcular-indice-comercial";
import {
  recomendarAcaoComercial,
} from "../src/domain/acao-comercial/recomendar-acao";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando consolidação de contas comerciais...");

  // 0. Carregar sinais multi-fonte para coberturaDados e operacao24h
  const norm = (s?: string | null) =>
    (s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
  const nomesEnriquecidos = new Set<string>();
  const cnpjsTerceiros = await prisma.enriquecimentoCNPJTerceiro.findMany({
    select: { razaoSocial: true, nomeFantasia: true },
  });
  for (const e of cnpjsTerceiros) {
    if (e.razaoSocial) nomesEnriquecidos.add(norm(e.razaoSocial));
    if (e.nomeFantasia) nomesEnriquecidos.add(norm(e.nomeFantasia));
  }

  // 1. Grupos reais
  const grupos = await prisma.grupoEconomico.findMany({
    where: { NOT: { tipoDado: "DEMONSTRACAO" } },
    include: {
      instituicoes: {
        include: {
          tipoEstabelecimento: true,
          unidades: { include: { endereco: true } },
          segmentacao: true,
          sinaisContratacaoPublica: { select: { id: true } },
          contatosProfissionais: { where: { ativo: true }, select: { id: true } },
        },
      },
      contatos: {
        where: { ativo: true },
      },
    },
  });

  console.log(`Carregados ${grupos.length} grupos econômicos reais.`);

  // Carregar status e histórico existentes para preservar idempotência
  const contasExistentes = await prisma.contaComercial.findMany({
    select: { id: true, resultadoAbordagem: true },
  });
  const resultadoExistenteMap = new Map(
    contasExistentes.map((c) => [c.id, c.resultadoAbordagem]),
  );

  let criadas = 0;
  let atualizadas = 0;

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const grupo of grupos) {
    const contaId = `conta-${grupo.id}`;
    const todasUnidades = grupo.instituicoes.flatMap((inst) => inst.unidades);
    const quantidadeUnidades = todasUnidades.length || grupo.instituicoes.length;

    const hospitais = grupo.instituicoes.filter((inst) => {
      const nome = inst.nome.toLowerCase();
      const tipo = inst.tipoEstabelecimento.nome.toLowerCase();
      const segmento = inst.segmentacao?.segmento;
      return (
        segmento === "NUCLEO_HOSPITALAR" ||
        tipo.includes("hospital") ||
        nome.includes("hospital") ||
        nome.includes("pronto atendimento") ||
        nome.includes("pronto socorro")
      );
    });

    const cidadesUnicas = [
      ...new Set(
        todasUnidades
          .map((u) => u.endereco?.municipio)
          .filter((m): m is string => Boolean(m)),
      ),
    ];

    const bairrosUnicos = [
      ...new Set(
        todasUnidades
          .map((u) => u.endereco?.bairro?.trim().toUpperCase())
          .filter((b): b is string => Boolean(b) && b !== "NÃO INFORMADO"),
      ),
    ];

    const dispersaoPolos = Math.max(
      cidadesUnicas.length,
      todasUnidades.length > 1 ? bairrosUnicos.length : 1,
    );

    let segmentoPredominante: string | null = null;
    if (grupo.instituicoes.some((i) => i.segmentacao?.segmento === "NUCLEO_HOSPITALAR")) {
      segmentoPredominante = "NUCLEO_HOSPITALAR";
    } else if (
      grupo.instituicoes.some((i) => i.segmentacao?.segmento === "SAUDE_CORPORATIVA_EXPANDIDA")
    ) {
      segmentoPredominante = "SAUDE_CORPORATIVA_EXPANDIDA";
    } else if (
      grupo.instituicoes.some((i) => i.segmentacao?.segmento === "BAIXA_PRIORIDADE_INICIAL")
    ) {
      segmentoPredominante = "BAIXA_PRIORIDADE_INICIAL";
    }

    const coberturas = grupo.instituicoes.map((inst) => {
      let cob = 70; // Base CNES (identificação, endereço e classificação)
      if (nomesEnriquecidos.has(norm(inst.nome)) || nomesEnriquecidos.has(norm(inst.nomeOriginal))) cob += 15;
      if (inst.sinaisContratacaoPublica.length > 0) cob += 10;
      if (inst.contatosProfissionais.length > 0 || grupo.contatos.length > 0) cob += 10;
      if (inst.naturezaGestao && inst.naturezaGestao !== "Não informado") cob += 5;
      return Math.min(100, cob);
    });
    const coberturaDados = coberturas.length
      ? Math.round(coberturas.reduce((a, b) => a + b, 0) / coberturas.length)
      : 100;

    for (let idx = 0; idx < grupo.instituicoes.length; idx++) {
      const inst = grupo.instituicoes[idx];
      const nome = inst.nome.toLowerCase();
      const tipo = inst.tipoEstabelecimento.nome.toLowerCase();
      const instOp24h =
        inst.operacao24h ||
        tipo === "hospital geral" ||
        tipo === "pronto atendimento" ||
        nome.includes("hospital") ||
        nome.includes("pronto socorro") ||
        nome.includes("pronto atendimento") ||
        nome.includes("24h") ||
        nome.includes("emergencia") ||
        nome.includes("urgencia");
      const instCob = coberturas[idx] ?? coberturaDados;
      if (inst.operacao24h !== instOp24h || inst.coberturaDados !== instCob) {
        ops.push(
          prisma.instituicao.update({
            where: { id: inst.id },
            data: { operacao24h: instOp24h, coberturaDados: instCob },
          }),
        );
      }
      inst.operacao24h = instOp24h;
      inst.coberturaDados = instCob;
    }

    const operacao24h = grupo.instituicoes.some(
      (inst) => inst.operacao24h || inst.unidades.some((u) => u.operacao24h),
    );

    const urgenciaEmergencia = grupo.instituicoes.some((inst) => {
      const nome = inst.nome.toLowerCase();
      return (
        inst.operacao24h ||
        nome.includes("urgencia") ||
        nome.includes("emergencia") ||
        nome.includes("pronto socorro") ||
        nome.includes("pronto atendimento")
      );
    });

    const situacaoCadastral =
      grupo.instituicoes.find((i) => i.situacaoCadastral)?.situacaoCadastral ?? null;

    const quantidadeContatosAtivos = grupo.contatos.length;

    const detalheIndice = calcularIndiceComercial({
      quantidadeUnidades,
      quantidadeHospitais: hospitais.length,
      segmentoPredominante,
      natureza: grupo.natureza,
      operacao24h,
      urgenciaEmergencia,
      quantidadeCidades: dispersaoPolos,
      quantidadeContatosAtivos,
      tipoVinculo: grupo.tipoVinculo,
      confiancaVinculo: grupo.nivelConfianca,
      coberturaDados,
    });

    const recomendacao = recomendarAcaoComercial({
      faixaPrioridadeComercial: detalheIndice.faixa,
      totalPontos: detalheIndice.total,
      natureza: grupo.natureza,
      tipoVinculo: grupo.tipoVinculo,
      confiancaOrganizacional: grupo.nivelConfianca,
      coberturaDados,
      quantidadeContatosAtivos,
      quantidadeUnidades,
    });

    const naturezaPublicaOuPrivada =
      grupo.natureza === "PRIVADO"
        ? "PRIVADA"
        : grupo.natureza === "PUBLICO"
          ? "PUBLICA"
          : "INDETERMINADA";

    const resultadoAbordagemExistente = resultadoExistenteMap.get(contaId);

    const dataPayload = {
      nome: grupo.nome,
      tipoDado: grupo.tipoDado,
      grupoEconomicoId: grupo.id,
      natureza: grupo.natureza,
      naturezaPublicaOuPrivada,
      quantidadeUnidades,
      quantidadeHospitais: hospitais.length,
      quantidadeContatos: quantidadeContatosAtivos,
      cidades: JSON.stringify(cidadesUnicas),
      cnpjPrincipal: null, // Preserva regra: apenas CNPJ oficial auditado
      situacaoCadastral,
      tipoVinculo: grupo.tipoVinculo,
      confiancaOrganizacional: grupo.nivelConfianca,
      coberturaDados,
      statusRevisao: grupo.statusRevisao,
      indicePrioridadeComercial: detalheIndice.total,
      faixaPrioridadeComercial: detalheIndice.faixa,
      acaoRecomendada: recomendacao.acao,
      justificativaAcao: recomendacao.justificativa,
      componentesIndiceJson: JSON.stringify(detalheIndice),
      resultadoAbordagem: resultadoAbordagemExistente ?? "NAO_ABORDADA",
    };

    if (resultadoExistenteMap.has(contaId)) {
      ops.push(
        prisma.contaComercial.update({
          where: { id: contaId },
          data: dataPayload,
        }),
      );
      atualizadas++;
    } else {
      ops.push(
        prisma.contaComercial.create({
          data: {
            id: contaId,
            ...dataPayload,
          },
        }),
      );
      criadas++;
    }
  }

  // 2. Contas de demonstração (5 contas canônicas do piloto)
  const instsDemo = await prisma.instituicao.findMany({
    where: { tipoDado: "DEMONSTRACAO" },
    include: {
      tipoEstabelecimento: true,
      unidades: { include: { endereco: true } },
      contatosProfissionais: { where: { ativo: true } },
    },
  });

  console.log(`Carregadas ${instsDemo.length} instituições de demonstração.`);

  for (const inst of instsDemo) {
    const contaId = `conta-${inst.id}`;
    const quantidadeUnidades = inst.unidades.length || 1;
    const cidadesUnicas = [
      ...new Set(
        inst.unidades.map((u) => u.endereco?.municipio).filter((m): m is string => Boolean(m)),
      ),
    ];
    const ehHospital =
      inst.tipoEstabelecimento.nome.toLowerCase().includes("hospital") ||
      inst.nome.toLowerCase().includes("hospital");

    const detalheIndice = calcularIndiceComercial({
      quantidadeUnidades,
      quantidadeHospitais: ehHospital ? 1 : 0,
      segmentoPredominante: ehHospital ? "NUCLEO_HOSPITALAR" : "SAUDE_CORPORATIVA_EXPANDIDA",
      natureza: "PRIVADO",
      operacao24h: inst.operacao24h,
      urgenciaEmergencia: inst.operacao24h,
      quantidadeCidades: cidadesUnicas.length,
      quantidadeContatosAtivos: inst.contatosProfissionais.length,
      tipoVinculo: inst.grupoEconomicoId ? "OFICIAL" : "ISOLADO",
      confiancaVinculo: "ALTA",
      coberturaDados: 100,
    });

    const recomendacao = recomendarAcaoComercial({
      faixaPrioridadeComercial: detalheIndice.faixa,
      totalPontos: detalheIndice.total,
      natureza: "PRIVADO",
      tipoVinculo: inst.grupoEconomicoId ? "OFICIAL" : "ISOLADO",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      quantidadeContatosAtivos: inst.contatosProfissionais.length,
      quantidadeUnidades,
    });

    const resultadoAbordagemExistente = resultadoExistenteMap.get(contaId);

    const dataPayload = {
      nome: inst.nome,
      tipoDado: "DEMONSTRACAO" as const,
      grupoEconomicoId: null, // Desacoplado para manter as 5 contas distintas
      natureza: "PRIVADO" as const,
      naturezaPublicaOuPrivada: "PRIVADA",
      quantidadeUnidades,
      quantidadeHospitais: ehHospital ? 1 : 0,
      quantidadeContatos: inst.contatosProfissionais.length,
      cidades: JSON.stringify(cidadesUnicas),
      cnpjPrincipal: null,
      situacaoCadastral: "ATIVA",
      tipoVinculo: inst.grupoEconomicoId ? ("OFICIAL" as const) : ("ISOLADO" as const),
      confiancaOrganizacional: "ALTA" as const,
      coberturaDados: 100,
      statusRevisao: "APROVADO" as const,
      indicePrioridadeComercial: detalheIndice.total,
      faixaPrioridadeComercial: detalheIndice.faixa,
      acaoRecomendada: recomendacao.acao,
      justificativaAcao: recomendacao.justificativa,
      componentesIndiceJson: JSON.stringify(detalheIndice),
      resultadoAbordagem: resultadoAbordagemExistente ?? "NAO_ABORDADA",
    };

    if (resultadoExistenteMap.has(contaId)) {
      ops.push(
        prisma.contaComercial.update({
          where: { id: contaId },
          data: dataPayload,
        }),
      );
      atualizadas++;
    } else {
      ops.push(
        prisma.contaComercial.create({
          data: {
            id: contaId,
            ...dataPayload,
          },
        }),
      );
      criadas++;
    }
  }

  console.log(`Persistindo ${ops.length} operações em lotes transacionais...`);
  const BATCH_SIZE = 500;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    await prisma.$transaction(ops.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Consolidação concluída com sucesso! Criadas: ${criadas}, Atualizadas: ${atualizadas}.`,
  );
  const total = await prisma.contaComercial.count();
  const totalReais = await prisma.contaComercial.count({
    where: { NOT: { tipoDado: "DEMONSTRACAO" } },
  });
  const totalDemo = await prisma.contaComercial.count({
    where: { tipoDado: "DEMONSTRACAO" },
  });
  console.log(
    `Total de contas no banco: ${total} (${totalReais} reais, ${totalDemo} demonstração).`,
  );
}

main()
  .catch((e) => {
    console.error("Erro na consolidação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
