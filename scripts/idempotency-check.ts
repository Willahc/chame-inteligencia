import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const count = await p.segmentacaoComercial.count();
  const unique = (await p.segmentacaoComercial.groupBy({ by: ["instituicaoId"] })).length;
  const sample = await p.segmentacaoComercial.findMany({
    orderBy: { instituicaoId: "asc" },
    take: 10,
    select: { instituicaoId: true, indiceAderencia: true, segmento: true, faixaAderencia: true, versaoRegra: true },
  });
  const segCounts = await p.segmentacaoComercial.groupBy({ by: ["segmento"], _count: true });
  console.log(`count=${count} unique=${unique}`);
  console.log(`segments=${JSON.stringify(segCounts)}`);
  console.log(`sample=${JSON.stringify(sample)}`);
}

main().then(() => p["$disconnect"]());
