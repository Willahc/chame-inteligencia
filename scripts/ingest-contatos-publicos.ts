import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Piloto governado: somente contatos reproduzidos em páginas públicas.
 * Não coleta por login, não envia mensagens e não deriva e-mail/telefone.
 */
interface ContatoPiloto {
  id: string;
  nome: string;
  cargo: string;
  area: string;
  linkedinUrl?: string;
  paginaProfissionalUrl?: string;
  papelComercial: string;
  observacao: string;
  fonte: { id: string; nome: string; url: string };
}

const CONTATOS: ContatoPiloto[] = [
  {
    id: "contato-fleury-clovis-porto",
    nome: "Clóvis Porto",
    cargo: "Gerente sênior",
    area: "Facilities",
    linkedinUrl: undefined,
    paginaProfissionalUrl: "https://pt.linkedin.com/posts/grupo-fleury_fm-entrevista-fm-edmar-cioletti-e-cl%C3%B3vis-activity-6488395072973864960-X2UZ",
    papelComercial: "Influenciador estratégico",
    observacao: "A publicação pública do Grupo Fleury identifica o profissional como gerente sênior de Facilities. Diretor, expansão, e-mail e telefone não foram confirmados por fonte pública no piloto.",
    fonte: {
      id: "fonte-publica-linkedin-grupo-fleury-clovis-2026",
      nome: "Publicação pública do Grupo Fleury no LinkedIn",
      url: "https://pt.linkedin.com/posts/grupo-fleury_fm-entrevista-fm-edmar-cioletti-e-cl%C3%B3vis-activity-6488395072973864960-X2UZ",
    },
  },
  {
    id: "contato-fleury-andreia-r",
    nome: "Andréia R.",
    cargo: "Profissional de Compras",
    area: "Strategic Sourcing",
    paginaProfissionalUrl: undefined,
    linkedinUrl: "https://br.linkedin.com/in/andreiarochadasilva",
    papelComercial: "Compras",
    observacao: "O perfil público exibe o nome abreviado Andréia R. e o título Profissional de Compras | Strategic Sourcing. Nenhum nome completo, e-mail ou telefone foi inferido.",
    fonte: {
      id: "fonte-publica-linkedin-andreia-r-fleury-2026",
      nome: "Perfil público de Andréia R. no LinkedIn",
      url: "https://br.linkedin.com/in/andreiarochadasilva",
    },
  },
];

async function main() {
  const organizacao = await prisma.grupoEconomico.findFirst({
    where: { id: "org-e8caa657", tipoDado: { not: "DEMONSTRACAO" } },
    select: { id: true, nome: true },
  });
  if (!organizacao) throw new Error("Organização Fleury não encontrada no banco canônico.");

  const dataEvidencia = new Date("2026-09-04T00:00:00.000Z");
  for (const contato of CONTATOS) {
    await prisma.fonte.upsert({
      where: { id: contato.fonte.id },
      update: { nome: contato.fonte.nome, url: contato.fonte.url, tipoDado: "FATO_PUBLICO" },
      create: { ...contato.fonte, tipoDado: "FATO_PUBLICO" },
    });
    await prisma.contatoProfissional.upsert({
      where: { id: contato.id },
      update: {
        nome: contato.nome,
        cargo: contato.cargo,
        area: contato.area,
        linkedinUrl: contato.linkedinUrl,
        paginaProfissionalUrl: contato.paginaProfissionalUrl,
        papelComercial: contato.papelComercial,
        tipoPapelComercial: "INFERENCIA",
        tipoDado: "FATO_PUBLICO",
        confianca: "ALTA",
        statusRevisao: "APROVADA",
        ativo: true,
        fonteId: contato.fonte.id,
        dataEvidencia,
        observacao: contato.observacao,
        grupoEconomicoId: organizacao.id,
      },
      create: {
        id: contato.id,
        nome: contato.nome,
        cargo: contato.cargo,
        area: contato.area,
        empresa: organizacao.nome,
        linkedinUrl: contato.linkedinUrl,
        paginaProfissionalUrl: contato.paginaProfissionalUrl,
        papelComercial: contato.papelComercial,
        tipoPapelComercial: "INFERENCIA",
        tipoDado: "FATO_PUBLICO",
        confianca: "ALTA",
        statusRevisao: "APROVADA",
        ativo: true,
        fonteId: contato.fonte.id,
        dataEvidencia,
        observacao: contato.observacao,
        grupoEconomicoId: organizacao.id,
      },
    });
  }
  console.log(`Contatos públicos persistidos: ${CONTATOS.length}. Organização: ${organizacao.nome}.`);
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
