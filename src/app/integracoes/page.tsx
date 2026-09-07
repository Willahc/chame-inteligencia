import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { obterModoDados } from "@/domain/modo-dados";
import {
  obterOuInicializarIntegracoes,
  obterResumoContadoresIntegracoes,
  listarEventosIntegracao,
} from "@/domain/integracoes/servico-integracoes";
import {
  IntegracoesClient,
  type ContaDropdown,
  type ContatoDropdown,
  type AcaoDropdown,
} from "@/components/integracoes-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Integrações e Conectores Externos | Chame Inteligência",
  description:
    "Arquitetura desacoplada de integrações, simuladores locais e travas de segurança humana.",
};

export default async function IntegracoesPage() {
  const modo = obterModoDados();

  const [integracoes, resumo, eventosRaw, contasRaw, contatosRaw, acoesRaw] =
    await Promise.all([
      obterOuInicializarIntegracoes(),
      obterResumoContadoresIntegracoes(),
      listarEventosIntegracao({ limite: 100 }),
      prisma.contaComercial.findMany({
        where:
          modo === "MODO_DEMONSTRACAO"
            ? { tipoDado: "DEMONSTRACAO" }
            : { NOT: { tipoDado: "DEMONSTRACAO" } },
        orderBy: [
          { indicePrioridadeComercial: "desc" },
          { nome: "asc" },
        ],
        take: 100,
        select: {
          id: true,
          nome: true,
          tipoDado: true,
        },
      }),
      prisma.contatoProfissional.findMany({
        where: {
          statusDecisao: "APROVADO",
          ativo: true,
          ...(modo === "MODO_DEMONSTRACAO"
            ? { tipoDado: "DEMONSTRACAO" }
            : { NOT: { tipoDado: "DEMONSTRACAO" } }),
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          cargo: true,
          emailCorporativo: true,
          telefoneProfissional: true,
          telefoneDepartamental: true,
          instituicaoId: true,
          grupoEconomicoId: true,
          tipoDado: true,
        },
      }),
      prisma.acaoComercialPlanejada.findMany({
        where: {
          status: { in: ["APROVADA_PARA_SIMULACAO", "SIMULADA"] },
          ...(modo === "MODO_DEMONSTRACAO"
            ? { tipoDado: "DEMONSTRACAO" }
            : { NOT: { tipoDado: "DEMONSTRACAO" } }),
        },
        orderBy: { criadoEm: "desc" },
        take: 50,
        select: {
          id: true,
          tipoAcao: true,
          canal: true,
          status: true,
          contaComercialId: true,
          contatoProfissionalId: true,
          mensagemRascunho: true,
        },
      }),
    ]);

  // Serialização para client
  const contas: ContaDropdown[] = contasRaw.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipoDado: c.tipoDado,
  }));

  const contatos: ContatoDropdown[] = contatosRaw.map((ct) => ({
    id: ct.id,
    nome: ct.nome,
    cargo: ct.cargo,
    emailCorporativo: ct.emailCorporativo,
    telefoneProfissional: ct.telefoneProfissional,
    telefoneDepartamental: ct.telefoneDepartamental,
    instituicaoId: ct.instituicaoId,
    grupoEconomicoId: ct.grupoEconomicoId,
    tipoDado: ct.tipoDado,
  }));

  const acoes: AcaoDropdown[] = acoesRaw.map((a) => ({
    id: a.id,
    tipoAcao: a.tipoAcao,
    canal: a.canal,
    status: a.status,
    contaComercialId: a.contaComercialId,
    contatoProfissionalId: a.contatoProfissionalId,
    mensagemRascunho: a.mensagemRascunho,
  }));

  const eventos = eventosRaw.map((ev) => ({
    ...ev,
    criadoEm: ev.criadoEm.toISOString(),
  }));

  return (
    <IntegracoesClient
      integracoesIniciais={integracoes}
      resumoInicial={resumo}
      eventosIniciais={eventos}
      contas={contas}
      contatos={contatos}
      acoes={acoes}
    />
  );
}
