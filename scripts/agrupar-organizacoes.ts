import { PrismaClient } from "@prisma/client";
import {
  agruparInstituicoes,
  classificarNatureza,
  VERSAO_REGRA_AGRUPAMENTO,
} from "../src/domain/agrupamento/regra-agrupamento";
import { extrairAgrupamentoDoPayload } from "../src/ingestao/agrupamento/extrair-payload";

const prisma = new PrismaClient();

interface PayloadRow { cnes: string; payload: string; }

async function main() {
  const instituicoes = await prisma.$queryRawUnsafe<Array<{ id: string; cnes: string | null; tipo: string; nome: string }>>(`
    SELECT i.id, i.cnes, te.nome as tipo, i.nome
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

  const segmentacoes = await prisma.$queryRawUnsafe<Array<{ instituicaoId: string; segmento: string }>>(`
    SELECT s."instituicaoId", s.segmento
    FROM "SegmentacaoComercial" s
  `);
  const segmentoPorId = new Map(segmentacoes.map((s) => [s.instituicaoId, s.segmento]));

  const unidades: Array<{ instituicaoId: string; razaoSocial: string; cnpj: string | null; cnpjMantenedora: string | null; naturezaJuridicaCode: string | null }> = [];
  let comCnpj = 0;
  const razoesDistintas = new Set<string>();

  for (const inst of instituicoes) {
    const payload = inst.cnes ? payloadPorCnes.get(inst.cnes) : undefined;
    const extraido = payload ? extrairAgrupamentoDoPayload(payload) : { razaoSocial: null, cnpj: null, cnpjMantenedora: null, naturezaJuridicaCode: null };
    const razaoSocial = extraido.razaoSocial ?? inst.nome ?? "Sem razão social";
    if (extraido.cnpj) comCnpj += 1;
    razoesDistintas.add(razaoSocial);
    unidades.push({ instituicaoId: inst.id, razaoSocial, cnpj: extraido.cnpj, cnpjMantenedora: extraido.cnpjMantenedora, naturezaJuridicaCode: extraido.naturezaJuridicaCode });
  }

  const resultado = agruparInstituicoes(unidades);

  const naturaPorId = new Map(unidades.map((u) => [u.instituicaoId, classificarNatureza(u.naturezaJuridicaCode)]));

  const statusesExistentes = await prisma.grupoEconomico.findMany({
    where: { tipoDado: { in: ["FATO_OFICIAL", "HIPOTESE"] } },
    select: { id: true, statusRevisao: true },
  });
  const statusPorId = new Map(statusesExistentes.map((g) => [g.id, g.statusRevisao]));

  const criados: string[] = [];
  const atualizados: string[] = [];
  const vinculosAtuais = await prisma.instituicao.findMany({
    where: { cnes: { not: null } },
    select: { id: true, grupoEconomicoId: true },
  });
  const vinculoAtualPorId = new Map(vinculosAtuais.map((v) => [v.id, v.grupoEconomicoId]));
  const gruposExistentes = new Set(statusesExistentes.map((g) => g.id));

  const dadosDe = (grupo: (typeof resultado.grupos)[number]) => ({
    nome: grupo.nome,
    nomeNormalizado: grupo.nomeNormalizado,
    tipoDado: grupo.tipoDado,
    tipoVinculo: grupo.tipoVinculo,
    nivelConfianca: grupo.nivelConfianca,
    tipoEvidencia: grupo.tipoEvidencia,
    regraAgrupamento: grupo.regraAgrupamento,
    versaoRegra: grupo.versaoRegra,
    dataCalculo: new Date(grupo.dataCalculo),
    natureza: grupo.natureza,
    observacao: grupo.observacao,
  });

  await prisma.$transaction(
    async (tx) => {
      const novos = resultado.grupos.filter((g) => !gruposExistentes.has(g.id));
      const existentes = resultado.grupos.filter((g) => gruposExistentes.has(g.id));
      if (novos.length > 0) {
        await tx.grupoEconomico.createMany({
          data: novos.map((g) => ({ id: g.id, statusRevisao: g.statusRevisao, ...dadosDe(g) })),
        });
      }
      for (const grupo of existentes) {
        const statusRevisao = statusPorId.get(grupo.id) === "APROVADO" ? "APROVADO" : grupo.statusRevisao;
        await tx.grupoEconomico.update({
          where: { id: grupo.id },
          data: { ...dadosDe(grupo), statusRevisao },
        });
      }
      for (const grupo of resultado.grupos) {
        const idsParaAtualizar = grupo.instituicaoIds.filter((id) => vinculoAtualPorId.get(id) !== grupo.id);
        if (idsParaAtualizar.length === 0) continue;
        await tx.instituicao.updateMany({
          where: { id: { in: idsParaAtualizar } },
          data: { grupoEconomicoId: grupo.id },
        });
      }
      const removidosOrfaos = await tx.grupoEconomico.deleteMany({
        where: { id: { startsWith: "org-" }, instituicoes: { none: {} } },
      });
      console.log(`Grupos órfãos removidos: ${removidosOrfaos.count}`);
    },
    { maxWait: 120000, timeout: 300000 },
  );
  criados.push(...resultado.grupos.filter((g) => !gruposExistentes.has(g.id)).map((g) => g.id));
  atualizados.push(...resultado.grupos.filter((g) => gruposExistentes.has(g.id)).map((g) => g.id));

  const multi = resultado.grupos.filter((g) => g.instituicaoIds.length > 1);
  const unidadesEmMulti = multi.reduce((soma, g) => soma + g.instituicaoIds.length, 0);
  const isolados = resultado.grupos.filter((g) => g.instituicaoIds.length === 1);
  const porVinculo = (v: string) => multi.filter((g) => g.tipoVinculo === v).length;
  const naturezaContagem = (n: string) => instituicoes.filter((i) => naturaPorId.get(i.id) === n).length;
  const nucleoTotal = instituicoes.filter((i) => segmentoPorId.get(i.id) === "NUCLEO_HOSPITALAR").length;
  const nucleoPrivado = instituicoes.filter((i) => segmentoPorId.get(i.id) === "NUCLEO_HOSPITALAR" && naturaPorId.get(i.id) === "PRIVADO").length;
  const nucleoPublico = instituicoes.filter((i) => segmentoPorId.get(i.id) === "NUCLEO_HOSPITALAR" && naturaPorId.get(i.id) === "PUBLICO").length;
  const nucleoIsoladoPrivado = instituicoes.filter((i) => segmentoPorId.get(i.id) === "NUCLEO_HOSPITALAR" && naturaPorId.get(i.id) === "PRIVADO").filter((i) => {
    const grupo = resultado.grupos.find((g) => g.instituicaoIds.length === 1 && g.instituicaoIds[0] === i.id);
    return Boolean(grupo);
  }).length;
  const nucleoPrivadoEmMulti = nucleoPrivado - nucleoIsoladoPrivado;
  const idsPrivadosNucleo = new Set(
    instituicoes.filter((i) => segmentoPorId.get(i.id) === "NUCLEO_HOSPITALAR" && naturaPorId.get(i.id) === "PRIVADO").map((i) => i.id),
  );
  const redesPrivadasNucleo = multi.filter((g) => g.natureza === "PRIVADO" && g.instituicaoIds.some((id) => idsPrivadosNucleo.has(id))).length;

  const resumo = {
    versaoRegra: VERSAO_REGRA_AGRUPAMENTO,
    criados: criados.length,
    atualizados: atualizados.length,
    itens: {
      "1_total_instituicoes": instituicoes.length,
      "2_com_cnpj_valido": comCnpj,
      "3_sem_cnpj_valido": instituicoes.length - comCnpj,
      "4_razoes_sociais_distintas": razoesDistintas.size,
      "5_total_agrupamentos": resultado.grupos.length,
      "6_agrupamentos_multiplas_unidades": multi.length,
      "7_unidades_em_multiplas_unidades": unidadesEmMulti,
      "8_unidades_isoladas": isolados.length,
      "9_vinculo_oficial": porVinculo("OFICIAL"),
      "10_vinculo_provavel": porVinculo("PROVAVEL"),
      "11_vinculo_incerto": porVinculo("INCERTO"),
      "12_natureza_publica": naturezaContagem("PUBLICO"),
      "13_natureza_privada": naturezaContagem("PRIVADO"),
      "14_natureza_indeterminada": naturezaContagem("INDETERMINADO"),
      "15_nucleo_total": nucleoTotal,
      "16_nucleo_privado": nucleoPrivado,
      "17_nucleo_publico": nucleoPublico,
      "18_nucleo_isolado_privado": nucleoIsoladoPrivado,
      "19_nucleo_privado_em_redes": nucleoPrivadoEmMulti,
      "20_redes_privadas_nucleo": redesPrivadasNucleo,
    },
  };

  const amostras = multi
    .slice()
    .sort((a, b) => b.instituicaoIds.length - a.instituicaoIds.length)
    .slice(0, 20)
    .map((g) => ({
      id: g.id,
      nome: g.nome,
      nomeNormalizado: g.nomeNormalizado,
      tipoVinculo: g.tipoVinculo,
      nivelConfianca: g.nivelConfianca,
      natureza: g.natureza,
      unidades: g.instituicaoIds.length,
      razoesOriginais: g.instituicaoIds.length <= 10 ? g.instituicaoIds.map((id) => unidades.find((u) => u.instituicaoId === id)?.razaoSocial).filter(Boolean) : undefined,
      justificativa: g.tipoEvidencia,
    }));

  const suspeitos = resultado.grupos
    .filter((g) => g.instituicaoIds.length > 1)
    .filter((g) => g.precisaRevisao)
    .map((g) => ({ id: g.id, nome: g.nome, tipoVinculo: g.tipoVinculo, natureza: g.natureza, unidades: g.instituicaoIds.length, justificativa: g.observacao }));

  console.log(JSON.stringify(resumo, null, 2));
  console.log(JSON.stringify({ amostras }, null, 2));
  console.log(JSON.stringify({ gruposParaRevisao: suspeitos }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (erro) => { console.error(erro); await prisma.$disconnect(); process.exit(1); });