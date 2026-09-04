import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RegistroBruto { cnes: string; payload: string; }
interface InstituicaoRow { id: string; cnes: string; segmento: string | null; }

function digito(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function ehPublico(naturezaJur: string): string {
  if (/^10|^11/.test(naturezaJur)) return "PUBLICO";
  if (naturezaJur) return "PRIVADO";
  return "SEM_NATUREZA";
}

function normalizarRazao(razao: string): string {
  let s = razao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  s = s.replace(/\bS\.?\s*A\.?\b/gi, "SA").replace(/\bLTDA\b/gi, "LTDA").replace(/\bLIMITADA\b/gi, "LTDA");
  s = s.replace(/\bME\b/gi, "").replace(/\bEPP\b/gi, "").replace(/\bEIRELI\b/gi, "");
  s = s.replace(/[.\-]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

async function main() {
  const linhas = await prisma.$queryRawUnsafe<RegistroBruto[]>(`
    SELECT rb.cnes, rb."payloadJson" as payload
    FROM "RegistroBrutoCNES" rb
    WHERE rb.status = 'ACEITO' AND rb.cnes IS NOT NULL
  `);
  const payloadPorCnes = new Map<string, Record<string, unknown>>();
  for (const linha of linhas) {
    if (!linha.cnes || payloadPorCnes.has(linha.cnes)) continue;
    try { payloadPorCnes.set(linha.cnes, JSON.parse(linha.payload)); } catch { /* ignora */ }
  }

  const inst = await prisma.$queryRawUnsafe<InstituicaoRow[]>(`
    SELECT i.id, i.cnes, s.segmento AS segmento
    FROM "Instituicao" i
    LEFT JOIN "SegmentacaoComercial" s ON s."instituicaoId" = i.id
    WHERE i.tipoDado = 'FATO_OFICIAL' AND i.cnes IS NOT NULL
  `);

  const detalhe = inst.map((i) => {
    const p = payloadPorCnes.get(i.cnes!) ?? {};
    const cnpj = digito(p.NU_CNPJ);
    const cnpjMant = digito(p.NU_CNPJ_MANTENEDORA);
    const naturezaJur = digito(p.CO_NATUREZA_JUR);
    const razao = String(p.NO_RAZAO_SOCIAL ?? "").trim();
    return {
      cnes: i.cnes!, segmento: i.segmento ?? "SEM_SEGMENTO",
      cnpj: cnpj.length === 14 ? cnpj : null,
      cnpjMant: cnpjMant.length === 14 ? cnpjMant : null,
      classeJuridica: ehPublico(naturezaJur),
      naturezaJur: naturezaJur || null,
      razao,
    };
  });

  const semPayload = detalhe.length - detalhe.filter((d) => payloadPorCnes.has(d.cnes)).length;

  const classePorSegmento: Record<string, Record<string, number>> = {};
  const naturePorSegmento: Record<string, Record<string, number>> = {};
  const naturezaJurDist: Record<string, number> = {};
  for (const d of detalhe) {
    classePorSegmento[d.segmento] ??= {};
    classePorSegmento[d.segmento][d.classeJuridica] = (classePorSegmento[d.segmento][d.classeJuridica] ?? 0) + 1;
    if (d.naturezaJur) {
      naturezaJurDist[d.naturezaJur] = (naturezaJurDist[d.naturezaJur] ?? 0) + 1;
      naturePorSegmento[d.segmento] ??= {};
      naturePorSegmento[d.segmento][d.naturezaJur] = (naturePorSegmento[d.segmento][d.naturezaJur] ?? 0) + 1;
    }
  }

  const byRazao = new Map<string, typeof detalhe>();
  const byRazaoNorm = new Map<string, typeof detalhe>();
  for (const d of detalhe) {
    if (!d.razao) continue;
    if (!byRazao.has(d.razao)) byRazao.set(d.razao, []);
    byRazao.get(d.razao)!.push(d);
    const norm = normalizarRazao(d.razao);
    if (norm) {
      if (!byRazaoNorm.has(norm)) byRazaoNorm.set(norm, []);
      byRazaoNorm.get(norm)!.push(d);
    }
  }
  const razaoMulti = [...byRazao.values()].filter((l) => l.length >= 2).sort((a, b) => b.length - a.length);
  const razoesMultiUnidade = razaoMulti.length;
  const unidadesEmRazaoMulti = razaoMulti.reduce((acc, l) => acc + l.length, 0);
  const maiorRazao = razaoMulti.slice(0, 25).map((l) => ({
    razao: l[0].razao,
    unidades: l.length,
    classes: [...new Set(l.map((d) => d.classeJuridica))],
    segmentos: [...new Set(l.map((d) => d.segmento))],
    possuiNucleo: l.some((d) => d.segmento === "NUCLEO_HOSPITALAR"),
    possuiCnpjDistinto: new Set(l.map((d) => d.cnpj)).size > 1 || l.some((d) => d.cnpj && d.cnpjMant && d.cnpj !== d.cnpjMant),
  }));

  const byCnpj = new Map<string, typeof detalhe>();
  for (const d of detalhe) {
    if (!d.cnpj) continue;
    if (!byCnpj.has(d.cnpj)) byCnpj.set(d.cnpj, []);
    byCnpj.get(d.cnpj)!.push(d);
  }
  const multCnpj = [...byCnpj.values()].filter((l) => l.length >= 2);
  const comMantGrupo = byCnpj.size;

  const gruposComMantenedora = detalhe.filter((d) => d.cnpjMant).map((d) => d.cnpjMant!).length;

  const resumoPublicoNucleo = {
    nucleoTotal: detalhe.filter((d) => d.segmento === "NUCLEO_HOSPITALAR").length,
    nucleoPublico: detalhe.filter((d) => d.segmento === "NUCLEO_HOSPITALAR" && d.classeJuridica === "PUBLICO").length,
    nucleoPrivado: detalhe.filter((d) => d.segmento === "NUCLEO_HOSPITALAR" && d.classeJuridica === "PRIVADO").length,
  };

  const razoesPublicasNucleo = razaoMulti.filter((l) => l.some((d) => d.segmento === "NUCLEO_HOSPITALAR") && l.every((d) => d.classeJuridica === "PUBLICO")).map((l) => ({ razao: l[0].razao, unidades: l.length }));

  const razoesPrivadas = [...byRazao.values()].filter((l) => l.every((d) => d.classeJuridica === "PRIVADO"));
  const razoesPrivadasMulti = razoesPrivadas.filter((l) => l.length >= 2);
  const razoesPrivadasComNucleo = razoesPrivadasMulti.filter((l) => l.some((d) => d.segmento === "NUCLEO_HOSPITALAR"));
  const razoesPrivadasComSaudeOuNucleo = razoesPrivadasMulti.filter((l) => l.some((d) => d.segmento === "NUCLEO_HOSPITALAR" || d.segmento === "SAUDE_CORPORATIVA_EXPANDIDA"));
  const totaisPublico = detalhe.filter((d) => d.classeJuridica === "PUBLICO").length;
  const totaisPrivado = detalhe.filter((d) => d.classeJuridica === "PRIVADO").length;
  const nucleoPrivadoComRazaoMulti = razoesPrivadasComNucleo.reduce((a, l) => a + l.length, 0);
  const nucleoIsolado = detalhe.filter((d) => d.segmento === "NUCLEO_HOSPITALAR" && d.classeJuridica === "PRIVADO" && byRazao.get(d.razao)?.length === 1).length;

  const razoesPrivadasNorm = [...byRazaoNorm.values()].filter((l) => l.every((d) => d.classeJuridica === "PRIVADO"));
  const razoesPrivadasMultiNorm = razoesPrivadasNorm.filter((l) => l.length >= 2);
  const razoesPrivadasComNucleoNorm = razoesPrivadasMultiNorm.filter((l) => l.some((d) => d.segmento === "NUCLEO_HOSPITALAR"));
  const nucleoPrivadoIsoladoNorm = detalhe.filter((d) => d.segmento === "NUCLEO_HOSPITALAR" && d.classeJuridica === "PRIVADO" && byRazaoNorm.get(normalizarRazao(d.razao))?.length === 1).length;

  console.log(JSON.stringify({
    universo: detalhe.length,
    semPayload,
    coberturaCnpjEstabelecimento: detalhe.filter((d) => d.cnpj).length,
    coberturaCnpjMantenedora: comMantGrupo,
    instanciasComCnpjMantenedora: gruposComMantenedora,
    classesJuridicas: classePorSegmento,
    resumoPublicoNucleo,
    naturezaJurDist,
    naturezaPorSegmento: { NUCLEO_HOSPITALAR: naturePorSegmento.NUCLEO_HOSPITALAR },
    multiplicidadeCnpj: { gruposCnpj: byCnpj.size, gruposCom2OuMais: multCnpj.length, unidadesEmGruposMulti: multCnpj.reduce((a, l) => a + l.length, 0) },
    multiplicidadeRazao: { razoesDistintas: byRazao.size, razoesCom2OuMais: razoesMultiUnidade, unidadesEmRazoesMulti: unidadesEmRazaoMulti },
    maioresGruposPorRazao: maiorRazao,
    razoesPublicasComMultiUnidades: razoesPublicasNucleo,
    sinteseComercial: {
      totaisPublico,
      totaisPrivado,
      gruposPrivadosMultiUnidade: razoesPrivadasMulti.length,
      unidadesEmGruposPrivadosMulti: razoesPrivadasMulti.reduce((a, l) => a + l.length, 0),
      gruposPrivadosComNucleo: razoesPrivadasComNucleo.length,
      unidadesEmGruposPrivadosComNucleo: nucleoPrivadoComRazaoMulti,
      gruposPrivadosComNucleoOuSaude: razoesPrivadasComSaudeOuNucleo.length,
      nucleoPrivadoIsolado: nucleoIsolado,
    },
    sinteseNormalizada: {
      gruposPrivadosMultiUnidade: razoesPrivadasMultiNorm.length,
      unidadesEmGruposPrivadosMulti: razoesPrivadasMultiNorm.reduce((a, l) => a + l.length, 0),
      gruposPrivadosComNucleo: razoesPrivadasComNucleoNorm.length,
      unidadesEmGruposPrivadosComNucleo: razoesPrivadasComNucleoNorm.reduce((a, l) => a + l.length, 0),
      nucleoPrivadoIsolado: nucleoPrivadoIsoladoNorm,
    },
  }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (erro) => { console.error(erro); await prisma.$disconnect(); process.exit(1); });