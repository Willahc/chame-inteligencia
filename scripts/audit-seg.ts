import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  console.log("=== 1. TIPOS CNES EXISTENTES ===");
  const tipos = await p.tipoEstabelecimento.findMany({
    include: { _count: { select: { instituicoes: true } } },
    orderBy: { instituicoes: { _count: "desc" } },
  });
  for (const t of tipos) {
    console.log(`  "${t.nome}" => ${t._count.instituicoes}`);
  }

  console.log("\n=== 2. DECOMPOSIÇÃO SAUDE_CORPORATIVA_EXPANDIDA ===");
  const saude = await p.segmentacaoComercial.findMany({
    where: { segmento: "SAUDE_CORPORATIVA_EXPANDIDA" },
    include: { instituicao: { select: { nome: true, cnes: true, tipoEstabelecimento: { select: { nome: true } } } } },
  });
  const saudePorTipo: Record<string, number> = {};
  for (const s of saude) {
    const tipo = s.instituicao.tipoEstabelecimento.nome;
    saudePorTipo[tipo] = (saudePorTipo[tipo] || 0) + 1;
  }
  for (const [tipo, cnt] of Object.entries(saudePorTipo).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${tipo}" => ${cnt} (${(cnt / saude.length * 100).toFixed(1)}%)`);
  }

  console.log("\n=== 3. DECOMPOSIÇÃO NUCLEO_HOSPITALAR ===");
  const nucleo = await p.segmentacaoComercial.findMany({
    where: { segmento: "NUCLEO_HOSPITALAR" },
    include: { instituicao: { select: { nome: true, cnes: true, tipoEstabelecimento: { select: { nome: true } } } } },
  });
  const nucleoPorTipo: Record<string, number> = {};
  for (const s of nucleo) {
    const tipo = s.instituicao.tipoEstabelecimento.nome;
    nucleoPorTipo[tipo] = (nucleoPorTipo[tipo] || 0) + 1;
  }
  for (const [tipo, cnt] of Object.entries(nucleoPorTipo).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${tipo}" => ${cnt}`);
  }

  console.log("\n=== 4. AMOSTRAGEM POR SEGMENTO ===");
  const segs = ["NUCLEO_HOSPITALAR", "SAUDE_CORPORATIVA_EXPANDIDA", "BAIXA_PRIORIDADE_INICIAL", "FORA_DO_FOCO_ATUAL"] as const;
  for (const seg of segs) {
    const items = await p.segmentacaoComercial.findMany({
      where: { segmento: seg },
      include: { instituicao: { select: { nome: true, cnes: true, tipoEstabelecimento: { select: { nome: true } } } } },
      orderBy: { indiceAderencia: "desc" },
      take: 20,
    });
    console.log(`\n--- ${seg} (${items.length} amostras) ---`);
    for (const s of items) {
      console.log(`  ${s.instituicao.nome}|CNES:${s.instituicao.cnes}|tipo:${s.instituicao.tipoEstabelecimento.nome}|idx:${s.indiceAderencia}|conf:${s.nivelConfianca}|faixa:${s.faixaAderencia}`);
      console.log(`    justificativa: ${s.justificativa.substring(0, 200)}`);
    }
  }

  console.log("\n=== 5. DISTRIBUIÇÃO DO ÍNDICE ===");
  const todos = await p.segmentacaoComercial.findMany({
    select: { indiceAderencia: true, segmento: true, faixaAderencia: true },
    orderBy: { indiceAderencia: "asc" },
  });
  const indices = todos.map((t) => t.indiceAderencia).sort((a, b) => a - b);
  console.log(`  Total: ${indices.length}`);
  console.log(`  Mínimo: ${indices[0]}`);
  console.log(`  Máximo: ${indices[indices.length - 1]}`);
  const media = indices.reduce((s, v) => s + v, 0) / indices.length;
  console.log(`  Média: ${media.toFixed(1)}`);
  console.log(`  Mediana (P50): ${indices[Math.floor(indices.length * 0.5)]}`);
  console.log(`  P25: ${indices[Math.floor(indices.length * 0.25)]}`);
  console.log(`  P75: ${indices[Math.floor(indices.length * 0.75)]}`);
  console.log(`  P90: ${indices[Math.floor(indices.length * 0.90)]}`);
  console.log(`  P95: ${indices[Math.floor(indices.length * 0.95)]}`);

  console.log("\n  Faixas:");
  const faixasCount = { "0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0 };
  for (const idx of indices) {
    if (idx < 40) faixasCount["0-39"]++;
    else if (idx < 60) faixasCount["40-59"]++;
    else if (idx < 80) faixasCount["60-79"]++;
    else faixasCount["80-100"]++;
  }
  for (const [faixa, cnt] of Object.entries(faixasCount)) {
    console.log(`  ${faixa}: ${cnt}`);
  }

  console.log("\n  SEGMENTO x FAIXA:");
  const crossMap: Record<string, Record<string, number>> = {};
  for (const t of todos) {
    if (!crossMap[t.segmento]) crossMap[t.segmento] = {};
    crossMap[t.segmento][t.faixaAderencia] = (crossMap[t.segmento][t.faixaAderencia] || 0) + 1;
  }
  for (const [seg, faixas] of Object.entries(crossMap)) {
    const parts = Object.entries(faixas).map(([f, c]) => `${f}:${c}`).join(", ");
    console.log(`  ${seg}: ${parts}`);
  }

  console.log("\n=== 6. CONFIANÇA POR SEGMENTO ===");
  const confMap: Record<string, Record<string, number>> = {};
  for (const t of todos) {
    if (!confMap[t.segmento]) confMap[t.segmento] = {};
  }
  const todosFull = await p.segmentacaoComercial.findMany({
    select: { segmento: true, nivelConfianca: true },
  });
  for (const t of todosFull) {
    if (!confMap[t.segmento]) confMap[t.segmento] = {};
    confMap[t.segmento][t.nivelConfianca] = (confMap[t.segmento][t.nivelConfianca] || 0) + 1;
  }
  for (const [seg, confs] of Object.entries(confMap)) {
    const parts = Object.entries(confs).map(([c, cnt]) => `${c}:${cnt}`).join(", ");
    console.log(`  ${seg}: ${parts}`);
  }

  console.log("\n=== 7. REVISÃO HUMANA ===");
  const revs = await p.segmentacaoComercial.groupBy({
    by: ["statusRevisao"],
    _count: true,
  });
  for (const r of revs) {
    console.log(`  ${r.statusRevisao}: ${r._count}`);
  }

  console.log("\n=== 9. IDEMPOTÊNCIA (primeira contagem) ===");
  const count1 = await p.segmentacaoComercial.count();
  const uniqueInstituicoes1 = await p.segmentacaoComercial.groupBy({ by: ["instituicaoId"] });
  console.log(`  Total registros: ${count1}`);
  console.log(`  Instituições únicas: ${uniqueInstituicoes1.length}`);
  const sampleIdx1 = await p.segmentacaoComercial.findMany({
    orderBy: { instituicaoId: "asc" },
    take: 5,
    select: { instituicaoId: true, indiceAderencia: true, segmento: true },
  });
  console.log(`  Amostra índices: ${sampleIdx1.map((s) => `${s.instituicaoId}=${s.indiceAderencia}(${s.segmento})`).join(", ")}`);
}

main().then(() => p["$disconnect"]());
