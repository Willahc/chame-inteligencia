import { PrismaClient } from "@prisma/client";
import { CONTATOS_DEMONSTRACAO } from "../src/domain/contatos-demo";

const prisma = new PrismaClient();
const FONTE_ID = "fonte-contatos-demonstracao";
const ACOES: Record<string, { titulo: string; descricao: string }> = {
  "rede-saude-exemplo": { titulo: "Abordar Facilities e Compras", descricao: "Apresentar gestão centralizada de mobilidade entre unidades." },
  "hospital-modelo-sul": { titulo: "Validar transporte 24 horas", descricao: "Validar necessidade de transporte 24h e deslocamentos administrativos." },
  "hospital-demonstracao-alfa": { titulo: "Mapear Compras e Serviços Corporativos", descricao: "Mapear Compras e Serviços Corporativos antes de recomendar uma abordagem." },
  "centro-diagnostico-modelo": { titulo: "Investigar mobilidade entre unidades", descricao: "Investigar mobilidade entre unidades e transporte de colaboradores." },
  "instituto-clinico-demonstracao": { titulo: "Aprofundar estrutura antes da abordagem", descricao: "Baixa prioridade; aprofundar estrutura antes de qualquer abordagem." },
};

async function main() {
  await prisma.fonte.upsert({
    where: { id: FONTE_ID },
    update: { nome: "Catálogo de contatos fictícios — demonstração", tipoDado: "DEMONSTRACAO", url: null },
    create: { id: FONTE_ID, nome: "Catálogo de contatos fictícios — demonstração", tipoDado: "DEMONSTRACAO" },
  });
  const instituicoes = await prisma.instituicao.findMany({ where: { tipoDado: "DEMONSTRACAO" }, select: { id: true, slug: true, nome: true, grupoEconomicoId: true } });
  const porSlug = new Map(instituicoes.map((item) => [item.slug, item]));
  if (instituicoes.length !== 5) throw new Error(`Esperadas 5 instituições demonstração; encontradas ${instituicoes.length}.`);

  for (const contato of CONTATOS_DEMONSTRACAO) {
    const instituicao = porSlug.get(contato.instituicaoSlug);
    if (!instituicao) throw new Error(`Instituição demonstração não encontrada: ${contato.instituicaoSlug}`);
    await prisma.contatoProfissional.upsert({
      where: { id: contato.id },
      update: { nome: contato.nome, cargo: contato.cargo, area: contato.area, empresa: instituicao.nome, senioridade: contato.senioridade, emailCorporativo: contato.emailCorporativo, telefoneProfissional: contato.telefoneProfissional, indiceQualidade: contato.indiceQualidade, justificativaQualidade: contato.justificativaQualidade, papelComercial: contato.papelComercial, tipoPapelComercial: "INFERENCIA", tipoDado: "DEMONSTRACAO", confianca: "ALTA", statusRevisao: "APROVADA", ativo: true, linkedinUrl: null, paginaProfissionalUrl: null, linkedinSimulado: true, fonteId: FONTE_ID, dataEvidencia: new Date("2026-09-04T12:00:00.000Z"), observacao: "Contato, perfil, e-mail e telefone são inteiramente fictícios e só existem para demonstração.", grupoEconomicoId: contato.grupoDemoId ?? instituicao.grupoEconomicoId, instituicaoId: instituicao.id },
      create: { id: contato.id, nome: contato.nome, cargo: contato.cargo, area: contato.area, empresa: instituicao.nome, senioridade: contato.senioridade, emailCorporativo: contato.emailCorporativo, telefoneProfissional: contato.telefoneProfissional, indiceQualidade: contato.indiceQualidade, justificativaQualidade: contato.justificativaQualidade, papelComercial: contato.papelComercial, tipoPapelComercial: "INFERENCIA", tipoDado: "DEMONSTRACAO", confianca: "ALTA", statusRevisao: "APROVADA", ativo: true, linkedinUrl: null, paginaProfissionalUrl: null, linkedinSimulado: true, fonteId: FONTE_ID, dataEvidencia: new Date("2026-09-04T12:00:00.000Z"), observacao: "Contato, perfil, e-mail e telefone são inteiramente fictícios e só existem para demonstração.", grupoEconomicoId: contato.grupoDemoId ?? instituicao.grupoEconomicoId, instituicaoId: instituicao.id },
    });
  }
  for (const [slug, acao] of Object.entries(ACOES)) {
    const instituicao = porSlug.get(slug);
    if (!instituicao) continue;
    await prisma.acaoComercial.updateMany({ where: { instituicaoId: instituicao.id, tipoDado: "DEMONSTRACAO" }, data: acao });
  }
  console.log(`Contatos de demonstração persistidos: ${CONTATOS_DEMONSTRACAO.length}.`);
}

main().catch((erro) => { console.error(erro); process.exitCode = 1; }).finally(() => prisma.$disconnect());
