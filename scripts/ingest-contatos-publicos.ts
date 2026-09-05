import { PrismaClient } from "@prisma/client";
import { CONTATOS_PUBLICOS_LOTE_100, DATA_COLETA_MANIFESTO, VERSAO_MANIFESTO_CONTATOS } from "../src/data/contatos-publicos-lote-100";

const prisma = new PrismaClient();

/** Ingestão governada: perfis públicos conferidos, sem login ou derivação de contatos. */
async function main() {
  const contatos = CONTATOS_PUBLICOS_LOTE_100;
  const ids = contatos.map((contato) => contato.id);
  const duplicados = ids.filter((id, indice) => ids.indexOf(id) !== indice);
  if (duplicados.length) throw new Error(`Duplicidade no manifesto: ${[...new Set(duplicados)].join(", ")}`);
  for (const contato of contatos) {
    if (![contato.nome, contato.cargo, contato.area, contato.empresa].every((campo) => campo.trim())) throw new Error(`Contato incompleto: ${contato.id}`);
    if (!/^https:\/\//.test(contato.urlPublica) || contato.urlPublica !== contato.fonte.url) throw new Error(`URL pública/fonte inválida: ${contato.id}`);
  }

  const grupoIds = [...new Set(contatos.map((contato) => contato.grupoEconomicoId))];
  const grupos = await prisma.grupoEconomico.findMany({
    where: { id: { in: grupoIds } },
    select: { id: true, nome: true, tipoDado: true, natureza: true, instituicoes: { where: { tipoDado: "FATO_OFICIAL", segmentacao: { segmento: "NUCLEO_HOSPITALAR" } }, select: { id: true } } },
  });
  const porId = new Map(grupos.map((grupo) => [grupo.id, grupo]));
  for (const contato of contatos) {
    const grupo = porId.get(contato.grupoEconomicoId);
    if (!grupo) throw new Error(`Grupo não encontrado: ${contato.grupoEconomicoId}`);
    if (grupo.tipoDado === "DEMONSTRACAO") throw new Error(`Grupo DEMONSTRACAO rejeitado: ${grupo.id}`);
    if (grupo.natureza !== "PRIVADO" || grupo.instituicoes.length === 0) throw new Error(`Grupo fora do escopo privado/Núcleo Hospitalar: ${grupo.id}`);
  }
  const existentes = await prisma.contatoProfissional.findMany({ where: { id: { in: ids } }, select: { id: true, emailCorporativo: true, telefoneProfissional: true } });
  const camposNaoComprovados = existentes.filter((contato) => contato.emailCorporativo || contato.telefoneProfissional);
  if (camposNaoComprovados.length) throw new Error(`E-mail/telefone não comprovado já presente: ${camposNaoComprovados.map((contato) => contato.id).join(", ")}`);

  const dataEvidencia = new Date(DATA_COLETA_MANIFESTO);
  for (const contato of contatos) {
    const grupo = porId.get(contato.grupoEconomicoId)!;
    const individual = contato.urlPublica.includes("linkedin.com/in/");
    await prisma.fonte.upsert({ where: { id: contato.fonte.id }, update: { nome: contato.fonte.nome, url: contato.fonte.url, tipoDado: "FATO_PUBLICO" }, create: { id: contato.fonte.id, nome: contato.fonte.nome, url: contato.fonte.url, tipoDado: "FATO_PUBLICO" } });
    await prisma.contatoProfissional.upsert({
      where: { id: contato.id },
      update: { nome: contato.nome, cargo: contato.cargo, area: contato.area, empresa: grupo.nome, linkedinUrl: individual ? contato.urlPublica : null, paginaProfissionalUrl: individual ? null : contato.urlPublica, emailCorporativo: null, telefoneProfissional: null, papelComercial: contato.papelComercial, tipoPapelComercial: "INFERENCIA", tipoDado: "FATO_PUBLICO", confianca: "ALTA", statusRevisao: "APROVADA", ativo: true, linkedinSimulado: false, fonteId: contato.fonte.id, dataEvidencia, observacao: contato.observacao, grupoEconomicoId: grupo.id, instituicaoId: null, escopoContato: "ORGANIZACAO" },
      create: { id: contato.id, nome: contato.nome, cargo: contato.cargo, area: contato.area, empresa: grupo.nome, linkedinUrl: individual ? contato.urlPublica : null, paginaProfissionalUrl: individual ? null : contato.urlPublica, emailCorporativo: null, telefoneProfissional: null, papelComercial: contato.papelComercial, tipoPapelComercial: "INFERENCIA", tipoDado: "FATO_PUBLICO", confianca: "ALTA", statusRevisao: "APROVADA", ativo: true, linkedinSimulado: false, fonteId: contato.fonte.id, dataEvidencia, observacao: contato.observacao, grupoEconomicoId: grupo.id, instituicaoId: null, escopoContato: "ORGANIZACAO" },
    });
  }
  console.log(JSON.stringify({ manifesto: VERSAO_MANIFESTO_CONTATOS, encontrados: contatos.length, persistidos: contatos.length, organizacoes: grupoIds.length, rejeitados: [] }, null, 2));
}

main().catch((erro) => { console.error(erro); process.exitCode = 1; }).finally(() => prisma.$disconnect());
