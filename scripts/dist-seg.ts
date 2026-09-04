import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT 'segmento' as grupo, "segmento" as valor, COUNT(*) as total FROM "SegmentacaoComercial" WHERE "instituicaoId" IN (SELECT id FROM "Instituicao" WHERE "tipoDado"='FATO_OFICIAL') GROUP BY "segmento"
    UNION ALL
    SELECT 'faixa', "faixaAderencia", COUNT(*) FROM "SegmentacaoComercial" WHERE "instituicaoId" IN (SELECT id FROM "Instituicao" WHERE "tipoDado"='FATO_OFICIAL') GROUP BY "faixaAderencia"
    UNION ALL
    SELECT 'confianca', "nivelConfianca", COUNT(*) FROM "SegmentacaoComercial" WHERE "instituicaoId" IN (SELECT id FROM "Instituicao" WHERE "tipoDado"='FATO_OFICIAL') GROUP BY "nivelConfianca"
    UNION ALL
    SELECT 'revisao', "statusRevisao", COUNT(*) FROM "SegmentacaoComercial" WHERE "instituicaoId" IN (SELECT id FROM "Instituicao" WHERE "tipoDado"='FATO_OFICIAL') GROUP BY "statusRevisao"
  `);
  for (const c of counts) console.log(`${c.grupo} | ${c.valor} | ${Number(c.total)}`);
  await prisma.$disconnect();
}

main();
