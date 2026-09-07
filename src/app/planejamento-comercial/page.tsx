import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { obterModoDados } from "@/domain/modo-dados";
import {
  listarAcoesPlanejadas,
  obterResumoContadoresAutomacao,
} from "@/domain/automacao-comercial/servico-automacao";
import {
  PlanejamentoComercialClient,
  type AcaoPlanejadaLinha,
  type ContaItemDropdown,
  type ContatoItemDropdown,
} from "@/components/planejamento-comercial-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planejamento Comercial | Chame Inteligência",
  description:
    "Preparação, simulação sandbox e aprovação humana de abordagens comerciais B2B.",
};

export default async function PlanejamentoComercialPage() {
  const modo = obterModoDados();

  const [resumo, acoesRaw, contasRaw, contatosRaw] = await Promise.all([
    obterResumoContadoresAutomacao(modo),
    listarAcoesPlanejadas({ modo }),
    prisma.contaComercial.findMany({
      where:
        modo === "MODO_DEMONSTRACAO"
          ? { tipoDado: "DEMONSTRACAO" }
          : { NOT: { tipoDado: "DEMONSTRACAO" } },
      include: {
        grupoEconomico: {
          include: {
            instituicoes: { select: { id: true } },
          },
        },
      },
      orderBy: [
        { indicePrioridadeComercial: "desc" },
        { nome: "asc" },
      ],
      take: 100, // Limite operacional de contas para o dropdown inicial
    }),
    prisma.contatoProfissional.findMany({
      where: {
        statusDecisao: "APROVADO",
        ativo: true,
        ...(modo === "MODO_DEMONSTRACAO"
          ? { tipoDado: "DEMONSTRACAO" }
          : { NOT: { tipoDado: "DEMONSTRACAO" } }),
      },
      include: { fonte: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  // Serialização para client
  const acoesIniciais: AcaoPlanejadaLinha[] = acoesRaw.map((a) => ({
    id: a.id,
    contaComercialId: a.contaComercialId,
    contatoProfissionalId: a.contatoProfissionalId,
    tipoAcao: a.tipoAcao,
    canal: a.canal,
    objetivo: a.objetivo,
    mensagemRascunho: a.mensagemRascunho,
    status: a.status,
    criadoPor: a.criadoPor,
    criadoEm: a.criadoEm.toISOString(),
    atualizadoEm: a.atualizadoEm.toISOString(),
    aprovadoPor: a.aprovadoPor,
    aprovadoEm: a.aprovadoEm?.toISOString() ?? null,
    justificativa: a.justificativa,
    tipoDado: a.tipoDado,
    statusRevisao: a.statusRevisao,
    contaComercial: {
      id: a.contaComercial.id,
      nome: a.contaComercial.nome,
      cidades: a.contaComercial.cidades,
      faixaPrioridadeComercial: a.contaComercial.faixaPrioridadeComercial,
      indicePrioridadeComercial: a.contaComercial.indicePrioridadeComercial,
      natureza: a.contaComercial.natureza,
    },
    contatoProfissional: a.contatoProfissional
      ? {
          id: a.contatoProfissional.id,
          nome: a.contatoProfissional.nome,
          cargo: a.contatoProfissional.cargo,
          area: a.contatoProfissional.area,
          empresa: a.contatoProfissional.empresa,
          emailCorporativo: a.contatoProfissional.emailCorporativo,
          telefoneProfissional: a.contatoProfissional.telefoneProfissional,
          telefoneDepartamental: a.contatoProfissional.telefoneDepartamental,
          linkedinUrl: a.contatoProfissional.linkedinUrl,
          paginaProfissionalUrl: a.contatoProfissional.paginaProfissionalUrl,
          confianca: a.contatoProfissional.confianca,
          papelComercial: a.contatoProfissional.papelComercial,
          tipoPapelComercial: a.contatoProfissional.tipoPapelComercial,
          statusDecisao: a.contatoProfissional.statusDecisao,
          fonte: a.contatoProfissional.fonte
            ? {
                nome: a.contatoProfissional.fonte.nome,
                url: a.contatoProfissional.fonte.url,
              }
            : null,
        }
      : null,
    ultimoHistorico:
      a.historico && a.historico.length > 0
        ? {
            acao: a.historico[0].acao,
            usuario: a.historico[0].usuario,
            dataHora: a.historico[0].dataHora.toISOString(),
            justificativa: a.historico[0].justificativa,
          }
        : null,
  }));

  const contasDropdown: ContaItemDropdown[] = contasRaw.map((c) => {
    let insts = c.grupoEconomico?.instituicoes.map((i) => i.id) ?? [];
    if (c.tipoDado === "DEMONSTRACAO" && insts.length === 0) {
      insts = [c.id.replace("conta-", "")];
    }
    return {
      id: c.id,
      nome: c.nome,
      cidades: c.cidades,
      faixaPrioridade: c.faixaPrioridadeComercial,
      indicePrioridade: c.indicePrioridadeComercial,
      grupoEconomicoId: c.grupoEconomicoId,
      instituicoesIds: insts,
    };
  });

  const contatosDropdown: ContatoItemDropdown[] = contatosRaw.map((ct) => ({
    id: ct.id,
    nome: ct.nome,
    cargo: ct.cargo,
    area: ct.area,
    empresa: ct.empresa,
    emailCorporativo: ct.emailCorporativo,
    telefoneProfissional: ct.telefoneProfissional,
    telefoneDepartamental: ct.telefoneDepartamental,
    linkedinUrl: ct.linkedinUrl,
    paginaProfissionalUrl: ct.paginaProfissionalUrl,
    confianca: ct.confianca,
    papelComercial: ct.papelComercial,
    tipoPapelComercial: ct.tipoPapelComercial,
    statusDecisao: ct.statusDecisao,
    grupoEconomicoId: ct.grupoEconomicoId,
    instituicaoId: ct.instituicaoId,
    fonteNome: ct.fonte?.nome ?? "Fonte Pública",
    fonteUrl: ct.fonte?.url ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PlanejamentoComercialClient
        acoesIniciais={acoesIniciais}
        resumo={resumo}
        contasDropdown={contasDropdown}
        contatosDropdown={contatosDropdown}
        modoDados={modo}
      />
    </div>
  );
}
