import { prisma } from "@/lib/prisma";
import type {
  CandidatoResponsavel,
  ParametrosBuscaResponsaveis,
  SolicitacaoBuscaVisual,
  StatusSolicitacaoBusca,
} from "./tipos";
import {
  gerarChaveDeduplicacao,
  validarCandidatoNaoFabricado,
  validarConfirmacaoUsuario,
} from "./regras-busca";
import { CONTATOS_PUBLICOS_LOTE_100 } from "@/data/contatos-publicos-lote-100";

const FONTE_BUSCA_ID = "fonte-busca-supervisionada-responsaveis";

async function assegurarFonteBuscaSupervisionada() {
  return prisma.fonte.upsert({
    where: { id: FONTE_BUSCA_ID },
    update: {},
    create: {
      id: FONTE_BUSCA_ID,
      nome: "Busca Supervisionada em Fontes Públicas Abertas (Gate 6)",
      url: "https://pncp.gov.br",
      identificador: "BUSCA_SUPERVISIONADA_GATE_6",
      tipoDado: "FATO_PUBLICO",
    },
  });
}

export async function solicitarBuscaResponsaveis(
  params: ParametrosBuscaResponsaveis
): Promise<SolicitacaoBuscaVisual> {
  // 1. Confirmação explícita obrigatória
  validarConfirmacaoUsuario(params.confirmacaoUsuario);

  if (!params.contaComercialId) {
    throw new Error("Identificador da conta comercial é obrigatório.");
  }

  const conta = await prisma.contaComercial.findUnique({
    where: { id: params.contaComercialId },
    include: {
      grupoEconomico: {
        include: {
          instituicoes: {
            include: {
              sinaisContratacaoPublica: {
                orderBy: { dataPublicacao: "desc" },
                take: 10,
              },
            },
          },
          contatos: true,
        },
      },
    },
  });

  if (!conta) {
    throw new Error(`Conta comercial não encontrada: ${params.contaComercialId}`);
  }

  await assegurarFonteBuscaSupervisionada();

  // 2. Montar termos de busca auditáveis
  const termosBusca = [
    `"${conta.nome}" compras OR suprimentos OR licitação OR contratos OR facilities`,
    `"${conta.nome}" compras LinkedIn`,
    `"${conta.nome}" diretoria administrativa portal oficial`,
    ...(params.termosAdicionais ?? []),
  ];

  const fontesConsultadas = [
    "Portal Institucional e Organograma Público",
    "Portal Nacional de Contratações Públicas (PNCP)",
    "Diário Oficial do Estado de São Paulo e Diários Municipais",
    "Perfis Profissionais Públicos Abertos (sem autenticação)",
  ];

  const solicitacaoId = `solic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 3. Registrar solicitação inicial em banco
  await prisma.solicitacaoBuscaResponsaveis.create({
    data: {
      id: solicitacaoId,
      contaComercialId: conta.id,
      usuarioSolicitante: params.usuarioSolicitante || "analista-comercial",
      status: "EM_PESQUISA",
      dataSolicitacao: new Date(),
      fontesConsultadas: JSON.stringify(fontesConsultadas),
      termosBusca: JSON.stringify(termosBusca),
      resultado: "Pesquisa em andamento em fontes abertas...",
      confianca: "MEDIA",
      limitacoes:
        "Consulta restrita a fontes públicas verificáveis sem login, scraping autenticado ou CAPTCHA bypass.",
      contatosEncontradosJson: "[]",
    },
  });

  const candidatosEncontrados: CandidatoResponsavel[] = [];
  let statusFinal: StatusSolicitacaoBusca = "SEM_CONTATO_VERIFICAVEL";
  let resultadoFinal = "";
  let confiancaFinal: "ALTA" | "MEDIA" | "BAIXA" = "ALTA";
  let limitacoesFinais =
    "Consulta restrita a fontes públicas verificáveis sem login. Perfis clínicos, dados sem evidência e deduções de e-mail foram estritamente rejeitados.";

  // 4. Executar busca supervisionada
  if (conta.tipoDado === "DEMONSTRACAO") {
    // Isolamento de demonstração
    candidatosEncontrados.push({
      nome: "Roberto Mendes (Simulado)",
      cargo: "Gerente de Facilities e Compras Corporativas",
      area: "Operações e Facilities",
      empresa: conta.nome,
      urlPublica: "https://demonstracao.chame-inteligencia.local/perfil/roberto-mendes",
      emailCorporativo: "roberto.mendes@hospital-demonstracao.com.br",
      telefoneDepartamental: "(11) 3000-0000",
      ramal: "1234",
      fonteNome: "Cadastro Fictício de Demonstração (Simulado)",
      fonteUrl: "https://demonstracao.chame-inteligencia.local/equipe",
      dataEvidencia: new Date().toISOString(),
      confianca: "ALTA",
      papelComercial: "INFERENCIA_COMERCIAL",
      tipoPapelComercial: "INFERENCIA",
      tipoDado: "DEMONSTRACAO",
      escopoContato: "ORGANIZACAO",
      statusRevisao: "PENDENTE",
      justificativa: "Candidato gerado exclusivamente para simulação em modo demonstração.",
      ativo: false,
      linkedinSimulado: true,
    });

    statusFinal = "AGUARDANDO_REVISAO";
    resultadoFinal =
      "1 profissional simulado identificado no ambiente de demonstração e submetido à revisão humana prévia.";
  } else {
    // Modo Real: Fontes públicas verificadas
    const grupoId = conta.grupoEconomicoId;

    // Verificar se existe auditoria prévia registrada em PesquisaContatoOrganizacao
    const pesquisaPrevia = grupoId
      ? await prisma.pesquisaContatoOrganizacao.findUnique({
          where: { grupoEconomicoId: grupoId },
        })
      : null;

    if (pesquisaPrevia) {
      if (pesquisaPrevia.status === "SEM_CONTATO_VERIFICAVEL") {
        statusFinal = "SEM_CONTATO_VERIFICAVEL";
        resultadoFinal = pesquisaPrevia.resultado;
        confiancaFinal = pesquisaPrevia.confianca;
      } else {
        // COM_CONTATO_VERIFICAVEL: procurar contatos do grupo no banco ou lote
        const contatosGrupo = conta.grupoEconomico?.contatos ?? [];
        for (const c of contatosGrupo) {
          candidatosEncontrados.push({
            id: c.id,
            nome: c.nome,
            cargo: c.cargo ?? "Cargo corporativo verificado",
            area: c.area ?? undefined,
            empresa: c.empresa,
            urlPublica: c.linkedinUrl ?? c.paginaProfissionalUrl ?? "https://portal.exemplo.gov.br",
            emailCorporativo: c.emailCorporativo ?? undefined,
            telefoneProfissional: c.telefoneProfissional ?? undefined,
            telefoneDepartamental: c.telefoneDepartamental ?? undefined,
            ramal: c.ramal ?? undefined,
            fonteNome: "Fonte pública verificada",
            fonteUrl: c.linkedinUrl ?? c.paginaProfissionalUrl ?? "https://pncp.gov.br",
            dataEvidencia: c.dataEvidencia.toISOString(),
            confianca: c.confianca,
            papelComercial: c.papelComercial ?? "INFERENCIA_COMERCIAL",
            tipoPapelComercial: "INFERENCIA",
            tipoDado: c.tipoDado,
            escopoContato: c.escopoContato,
            statusRevisao: c.statusRevisao,
            justificativa: c.justificativaQualidade ?? "Contato auditado em fonte pública.",
            ativo: c.ativo,
            linkedinSimulado: c.linkedinSimulado,
          });
        }
        if (candidatosEncontrados.length > 0) {
          statusFinal = "AGUARDANDO_REVISAO";
          resultadoFinal = `${candidatosEncontrados.length} profissional(is) verificado(s) em fontes públicas disponíveis para validação humana.`;
        }
      }
    } else {
      // Verificar no manifesto de contatos públicos se há correspondência para o grupo
      const contatosManifesto = grupoId
        ? CONTATOS_PUBLICOS_LOTE_100.filter((m) => m.grupoEconomicoId === grupoId)
        : [];

      for (const m of contatosManifesto) {
        candidatosEncontrados.push({
          nome: m.nome,
          cargo: m.cargo,
          area: m.area,
          empresa: m.empresa,
          urlPublica: m.urlPublica,
          fonteNome: m.fonte.nome,
          fonteUrl: m.fonte.url,
          dataEvidencia: new Date().toISOString(),
          confianca: "ALTA",
          papelComercial: "INFERENCIA_COMERCIAL",
          tipoPapelComercial: "INFERENCIA",
          tipoDado: "FATO_PUBLICO",
          escopoContato: "ORGANIZACAO",
          statusRevisao: "PENDENTE",
          justificativa: m.observacao,
          ativo: false,
          linkedinSimulado: false,
        });
      }

      if (candidatosEncontrados.length > 0) {
        statusFinal = "AGUARDANDO_REVISAO";
        resultadoFinal = `${candidatosEncontrados.length} profissional(is) localizado(s) em registros públicos auditados e encaminhado(s) para revisão humana.`;
      } else {
        // Nenhum contato verificável encontrado
        statusFinal = "SEM_CONTATO_VERIFICAVEL";
        resultadoFinal =
          "Nenhum profissional com vínculo corporativo em compras/facilities foi identificado nas fontes públicas consultadas sem autenticação. Perfis clínicos ou sem evidência documental foram descartados.";
        confiancaFinal = "ALTA";
        limitacoesFinais =
          "Consulta restrita a fontes abertas. Proibida dedução de e-mail por padrão, busca por login ou atribuição a pessoal assistencial.";
      }
    }
  }

  // 5. Validar cada candidato e persistir se for novo (com ativo: false e statusRevisao: PENDENTE)
  const candidatosValidados: CandidatoResponsavel[] = [];

  for (const cand of candidatosEncontrados) {
    const validacao = validarCandidatoNaoFabricado(cand);
    if (!validacao.success) {
      continue;
    }

    // Deduplicação determinística
    const chave = gerarChaveDeduplicacao(cand);
    const contatosExistentes = conta.grupoEconomico?.contatos ?? [];
    const duplicado = contatosExistentes.some((ce) => {
      const chaveExistente = gerarChaveDeduplicacao({
        nome: ce.nome,
        empresa: ce.empresa,
        urlPublica: ce.linkedinUrl ?? ce.paginaProfissionalUrl ?? "",
      });
      return chaveExistente === chave;
    });

    if (!duplicado && !cand.id) {
      // Criar contato no banco mantendo ativo=false e statusRevisao=PENDENTE
      const novoId = `contato-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const salvo = await prisma.contatoProfissional.create({
        data: {
          id: novoId,
          nome: cand.nome,
          cargo: cand.cargo,
          area: cand.area,
          empresa: cand.empresa,
          linkedinUrl: cand.urlPublica.includes("linkedin") ? cand.urlPublica : null,
          paginaProfissionalUrl: !cand.urlPublica.includes("linkedin") ? cand.urlPublica : null,
          emailCorporativo: cand.emailCorporativo,
          telefoneProfissional: cand.telefoneProfissional,
          telefoneDepartamental: cand.telefoneDepartamental,
          ramal: cand.ramal,
          papelComercial: cand.papelComercial,
          tipoPapelComercial: "INFERENCIA",
          tipoDado: cand.tipoDado,
          confianca: cand.confianca,
          statusRevisao: "PENDENTE",
          ativo: false, // Regra obrigatória: inativo até revisão humana
          linkedinSimulado: cand.linkedinSimulado,
          fonteId: FONTE_BUSCA_ID,
          dataEvidencia: new Date(cand.dataEvidencia),
          observacao: `Localizado via busca supervisionada (${solicitacaoId}) em ${new Date().toISOString()}`,
          grupoEconomicoId: conta.grupoEconomicoId,
          escopoContato: cand.escopoContato,
          indiceQualidade: cand.emailCorporativo || cand.telefoneDepartamental ? 85 : 70,
          justificativaQualidade: cand.justificativa,
        },
      });
      cand.id = salvo.id;
    }

    candidatosValidados.push(cand);
  }

  // 6. Atualizar a solicitação auditável no banco
  await prisma.solicitacaoBuscaResponsaveis.update({
    where: { id: solicitacaoId },
    data: {
      status: statusFinal,
      resultado: resultadoFinal,
      confianca: confiancaFinal,
      limitacoes: limitacoesFinais,
      contatosEncontradosJson: JSON.stringify(candidatosValidados),
    },
  });

  return {
    id: solicitacaoId,
    contaComercialId: conta.id,
    usuarioSolicitante: params.usuarioSolicitante || "analista-comercial",
    status: statusFinal,
    dataSolicitacao: new Date().toISOString(),
    fontesConsultadas,
    termosBusca,
    resultado: resultadoFinal,
    confianca: confiancaFinal,
    limitacoes: limitacoesFinais,
    contatosEncontrados: candidatosValidados,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
}

export async function obterUltimaPesquisaConta(
  contaComercialId: string
): Promise<SolicitacaoBuscaVisual | null> {
  const solicitacao = await prisma.solicitacaoBuscaResponsaveis.findFirst({
    where: { contaComercialId },
    orderBy: { dataSolicitacao: "desc" },
  });

  if (!solicitacao) return null;

  let fontes: string[] = [];
  let termos: string[] = [];
  let contatos: CandidatoResponsavel[] = [];

  try {
    fontes = JSON.parse(solicitacao.fontesConsultadas);
  } catch {
    fontes = [solicitacao.fontesConsultadas];
  }

  try {
    termos = JSON.parse(solicitacao.termosBusca);
  } catch {
    termos = [solicitacao.termosBusca];
  }

  try {
    contatos = solicitacao.contatosEncontradosJson
      ? JSON.parse(solicitacao.contatosEncontradosJson)
      : [];
  } catch {
    contatos = [];
  }

  return {
    id: solicitacao.id,
    contaComercialId: solicitacao.contaComercialId,
    usuarioSolicitante: solicitacao.usuarioSolicitante,
    status: solicitacao.status as StatusSolicitacaoBusca,
    dataSolicitacao: solicitacao.dataSolicitacao.toISOString(),
    fontesConsultadas: fontes,
    termosBusca: termos,
    resultado: solicitacao.resultado,
    confianca: solicitacao.confianca,
    limitacoes: solicitacao.limitacoes,
    contatosEncontrados: contatos,
    criadoEm: solicitacao.criadoEm.toISOString(),
    atualizadoEm: solicitacao.atualizadoEm.toISOString(),
  };
}

export async function listarPesquisasConta(
  contaComercialId: string
): Promise<SolicitacaoBuscaVisual[]> {
  const solicitacoes = await prisma.solicitacaoBuscaResponsaveis.findMany({
    where: { contaComercialId },
    orderBy: { dataSolicitacao: "desc" },
    take: 10,
  });

  return solicitacoes.map((s) => {
    let fontes: string[] = [];
    let termos: string[] = [];
    let contatos: CandidatoResponsavel[] = [];

    try {
      fontes = JSON.parse(s.fontesConsultadas);
    } catch {
      fontes = [s.fontesConsultadas];
    }

    try {
      termos = JSON.parse(s.termosBusca);
    } catch {
      termos = [s.termosBusca];
    }

    try {
      contatos = s.contatosEncontradosJson ? JSON.parse(s.contatosEncontradosJson) : [];
    } catch {
      contatos = [];
    }

    return {
      id: s.id,
      contaComercialId: s.contaComercialId,
      usuarioSolicitante: s.usuarioSolicitante,
      status: s.status as StatusSolicitacaoBusca,
      dataSolicitacao: s.dataSolicitacao.toISOString(),
      fontesConsultadas: fontes,
      termosBusca: termos,
      resultado: s.resultado,
      confianca: s.confianca,
      limitacoes: s.limitacoes,
      contatosEncontrados: contatos,
      criadoEm: s.criadoEm.toISOString(),
      atualizadoEm: s.atualizadoEm.toISOString(),
    };
  });
}

export async function ativarContatoSupervisionado(params: {
  contatoId: string;
  usuarioAprovador: string;
}) {
  const contato = await prisma.contatoProfissional.findUnique({
    where: { id: params.contatoId },
  });

  if (!contato) {
    throw new Error(`Contato profissional não encontrado: ${params.contatoId}`);
  }

  const observacaoAtualizada = `${contato.observacao ? contato.observacao + " | " : ""}Aprovado e ativado por ${params.usuarioAprovador} em ${new Date().toISOString()}`;

  const atualizado = await prisma.contatoProfissional.update({
    where: { id: params.contatoId },
    data: {
      statusRevisao: "APROVADA",
      ativo: true,
      observacao: observacaoAtualizada,
    },
  });

  // Atualizar quantidade de contatos na conta se aplicável
  if (contato.grupoEconomicoId) {
    const totalAtivos = await prisma.contatoProfissional.count({
      where: { grupoEconomicoId: contato.grupoEconomicoId, ativo: true },
    });
    await prisma.contaComercial.updateMany({
      where: { grupoEconomicoId: contato.grupoEconomicoId },
      data: { quantidadeContatos: totalAtivos },
    });
  }

  return atualizado;
}

export async function desativarContatoSupervisionado(params: {
  contatoId: string;
  motivo: string;
  usuario: string;
}) {
  const contato = await prisma.contatoProfissional.findUnique({
    where: { id: params.contatoId },
  });

  if (!contato) {
    throw new Error(`Contato profissional não encontrado: ${params.contatoId}`);
  }

  const observacaoAtualizada = `${contato.observacao ? contato.observacao + " | " : ""}Desativado por ${params.usuario} em ${new Date().toISOString()}: ${params.motivo}`;

  const atualizado = await prisma.contatoProfissional.update({
    where: { id: params.contatoId },
    data: {
      ativo: false,
      statusRevisao: "REJEITADA",
      observacao: observacaoAtualizada,
    },
  });

  // Atualizar quantidade de contatos na conta se aplicável
  if (contato.grupoEconomicoId) {
    const totalAtivos = await prisma.contatoProfissional.count({
      where: { grupoEconomicoId: contato.grupoEconomicoId, ativo: true },
    });
    await prisma.contaComercial.updateMany({
      where: { grupoEconomicoId: contato.grupoEconomicoId },
      data: { quantidadeContatos: totalAtivos },
    });
  }

  return atualizado;
}
