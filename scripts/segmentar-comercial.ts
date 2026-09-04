import { PrismaClient } from "@prisma/client";
import { calcularAderencia } from "../src/domain/segmentacao/calcular-aderencia";
import { VERSAO_REGRA_ADERENCIA } from "../src/domain/segmentacao/pesos";
import { extrairAderenciaDoPayload } from "../src/ingestao/segmentacao/extrair-payload";

const prisma = new PrismaClient();

interface PayloadRow { cnes: string; payload: string; }

async function main() {
  const instituicoes = await prisma.$queryRawUnsafe<Array<{ id: string; cnes: string; tipo: string; cobertura: number }>>(`
    SELECT i.id, i.cnes, te.nome as tipo, i."coberturaDados" as cobertura
    FROM "Instituicao" i
    JOIN "TipoEstabelecimento" te ON te.id = i."tipoEstabelecimentoId"
    WHERE i.tipoDado = 'FATO_OFICIAL' AND i.cnes IS NOT NULL
  `);

  const linhas = await prisma.$queryRawUnsafe<PayloadRow[]>(`
    SELECT rb.cnes, rb."payloadJson" as payload
    FROM "RegistroBrutoCNES" rb
    WHERE rb.status = 'ACEITO' AND rb.cnes IS NOT NULL
  `);

  const payloadPorCnes = new Map<string, Record<string, unknown>>();
  for (const linha of linhas) {
    if (!linha.cnes || payloadPorCnes.has(linha.cnes)) continue;
    try { payloadPorCnes.set(linha.cnes, JSON.parse(linha.payload)); } catch { /* ignora payload inválido */ }
  }

  const statusesAtuais = await prisma.segmentacaoComercial.findMany({ select: { instituicaoId: true, statusRevisao: true } });
  const statusPorInstituicao = new Map(statusesAtuais.map((s) => [s.instituicaoId, s.statusRevisao]));
  const proximoStatus = (confianca: string, instituicaoId: string) =>
    statusPorInstituicao.get(instituicaoId) === "APROVADO" ? undefined : confianca === "BAIXA" ? "AJUSTE_NECESSARIO" : "NAO_REVISADO";

  let criadas = 0;
  let atualizadas = 0;
  let semPayload = 0;

  for (const inst of instituicoes) {
    const payload = payloadPorCnes.get(inst.cnes);
    if (!payload) {
      semPayload += 1;
      const resultado = calcularAderencia(
        { tipoHospitalar: false, atendimentoHospitalar: false, complexidadeEstrutural: false, atendimentoAmbulatorial: false, turnoAderencia: 0, coberturaDados: inst.cobertura },
        inst.tipo,
      );
      const justificativa = `${resultado.justificativa} Sem registro bruto oficial local para extração estruturada; classificação derivada apenas do tipo oficial e da cobertura de dados.`;
      const upserted = await prisma.segmentacaoComercial.upsert({
        where: { instituicaoId: inst.id },
        update: {
          segmento: resultado.segmento,
          indiceAderencia: resultado.total,
          faixaAderencia: resultado.faixa,
          regraAplicada: `ADERENCIA_COMERCIAL_${resultado.versaoRegra}`,
          versaoRegra: resultado.versaoRegra,
          dataCalculo: new Date(),
          nivelConfianca: resultado.confianca,
          justificativa,
          componentesJson: JSON.stringify(resultado.componentes),
          statusRevisao: proximoStatus(resultado.confianca, inst.id),
          atualizadoEm: new Date(),
        },
        create: {
          id: `seg-${inst.id}`,
          instituicaoId: inst.id,
          segmento: resultado.segmento,
          indiceAderencia: resultado.total,
          faixaAderencia: resultado.faixa,
          regraAplicada: `ADERENCIA_COMERCIAL_${resultado.versaoRegra}`,
          versaoRegra: resultado.versaoRegra,
          dataCalculo: new Date(),
          nivelConfianca: resultado.confianca,
          justificativa,
          componentesJson: JSON.stringify(resultado.componentes),
          statusRevisao: resultado.confianca === "BAIXA" ? "AJUSTE_NECESSARIO" : "NAO_REVISADO",
        },
      });
      const criada = upserted.criadoEm.getTime() === upserted.atualizadoEm.getTime();
      if (criada) criadas += 1; else atualizadas += 1;
      continue;
    }

    const extraido = extrairAderenciaDoPayload(payload);
    const resultado = calcularAderencia({ ...extraido, coberturaDados: inst.cobertura }, inst.tipo);

    const upserted = await prisma.segmentacaoComercial.upsert({
      where: { instituicaoId: inst.id },
      update: {
        segmento: resultado.segmento,
        indiceAderencia: resultado.total,
        faixaAderencia: resultado.faixa,
        regraAplicada: `ADERENCIA_COMERCIAL_${resultado.versaoRegra}`,
        versaoRegra: resultado.versaoRegra,
        dataCalculo: new Date(),
        nivelConfianca: resultado.confianca,
        justificativa: resultado.justificativa,
        componentesJson: JSON.stringify(resultado.componentes),
        statusRevisao: proximoStatus(resultado.confianca, inst.id),
        atualizadoEm: new Date(),
      },
      create: {
        id: `seg-${inst.id}`,
        instituicaoId: inst.id,
        segmento: resultado.segmento,
        indiceAderencia: resultado.total,
        faixaAderencia: resultado.faixa,
        regraAplicada: `ADERENCIA_COMERCIAL_${resultado.versaoRegra}`,
        versaoRegra: resultado.versaoRegra,
        dataCalculo: new Date(),
        nivelConfianca: resultado.confianca,
        justificativa: resultado.justificativa,
        componentesJson: JSON.stringify(resultado.componentes),
        statusRevisao: resultado.confianca === "BAIXA" ? "AJUSTE_NECESSARIO" : "NAO_REVISADO",
      },
    });

    const criada = upserted.criadoEm.getTime() === upserted.atualizadoEm.getTime();
    if (criada) criadas += 1; else atualizadas += 1;
  }

  console.log(JSON.stringify({ versaoRegra: VERSAO_REGRA_ADERENCIA, totalProcessadas: instituicoes.length, criadas, atualizadas, semPayload }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (erro) => { console.error(erro); await prisma.$disconnect(); process.exit(1); });
