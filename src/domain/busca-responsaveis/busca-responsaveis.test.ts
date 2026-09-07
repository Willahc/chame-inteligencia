import { afterAll, describe, expect, it } from "vitest";
import {
  gerarChaveDeduplicacao,
  validarCandidatoNaoFabricado,
  validarConfirmacaoUsuario,
} from "./regras-busca";
import {
  ativarContatoSupervisionado,
  desativarContatoSupervisionado,
  obterUltimaPesquisaConta,
  solicitarBuscaResponsaveis,
} from "./servico-busca";
import { prisma } from "@/lib/prisma";
import type { CandidatoResponsavel } from "./tipos";

const candidatoBaseValido: CandidatoResponsavel = {
  nome: "Juliana Ramos",
  cargo: "Gerente de Suprimentos Corporativos",
  area: "Compras e Suprimentos",
  empresa: "Hospital Exemplo S.A.",
  urlPublica: "https://br.linkedin.com/in/juliana-ramos-suprimentos",
  emailCorporativo: "juliana.ramos@hospitalexemplo.com.br",
  telefoneDepartamental: "(11) 3333-4444",
  ramal: "501",
  fonteNome: "Perfil público no LinkedIn e Portal Institucional",
  fonteUrl: "https://br.linkedin.com/in/juliana-ramos-suprimentos",
  dataEvidencia: "2026-09-07T08:00:00.000Z",
  confianca: "ALTA",
  papelComercial: "INFERENCIA_COMERCIAL",
  tipoPapelComercial: "INFERENCIA",
  tipoDado: "FATO_PUBLICO",
  escopoContato: "ORGANIZACAO",
  statusRevisao: "PENDENTE",
  justificativa:
    "Identificada em perfil público e confirmada no quadro de suprimentos da instituição.",
  ativo: false,
  linkedinSimulado: false,
};

describe("Gate 6 — Regras de Validação e Não Fabricação de Responsáveis", () => {
  it("aceita candidato válido com cargo comprovado, fonte e URL pública", () => {
    const validacao = validarCandidatoNaoFabricado(candidatoBaseValido);
    expect(validacao.success).toBe(true);
  });

  it("rejeita busca sem confirmação explícita do usuário (nenhuma busca automática)", () => {
    expect(() => validarConfirmacaoUsuario(false)).toThrowError(
      "exige confirmação explícita"
    );
  });

  it("rejeita candidato com CPF no registro (proibição de dados pessoais protegidos)", () => {
    const comCPF: CandidatoResponsavel = {
      ...candidatoBaseValido,
      nome: "Juliana Ramos 123.456.789-00",
    };
    const validacao = validarCandidatoNaoFabricado(comCPF);
    expect(validacao.success).toBe(false);
  });

  it("rejeita e-mail de provedor genérico ou pessoal (ex.: @gmail.com)", () => {
    const comEmailPessoal: CandidatoResponsavel = {
      ...candidatoBaseValido,
      emailCorporativo: "juliana.ramos@gmail.com",
    };
    const validacao = validarCandidatoNaoFabricado(comEmailPessoal);
    expect(validacao.success).toBe(false);
  });

  it("rejeita candidato sem URL pública verificável", () => {
    const semUrl: CandidatoResponsavel = {
      ...candidatoBaseValido,
      urlPublica: "url-invalida",
    };
    const validacao = validarCandidatoNaoFabricado(semUrl);
    expect(validacao.success).toBe(false);
  });

  it("rejeita profissional clínico puro inferido como responsável por compras", () => {
    const clinicoPuro: CandidatoResponsavel = {
      ...candidatoBaseValido,
      cargo: "Médico Cirurgião Geral",
      area: "Clínica Cirúrgica",
    };
    const validacao = validarCandidatoNaoFabricado(clinicoPuro);
    expect(validacao.success).toBe(false);
  });

  it("classifica o papel comercial obrigatoriamente como INFERENCIA_COMERCIAL", () => {
    const papelFato: CandidatoResponsavel = {
      ...candidatoBaseValido,
      tipoPapelComercial: "FATO_PUBLICO",
    };
    const validacao = validarCandidatoNaoFabricado(papelFato);
    expect(validacao.success).toBe(false);
  });

  it("gera chave de deduplicação determinística", () => {
    const chave = gerarChaveDeduplicacao(candidatoBaseValido);
    expect(chave).toBe(
      "juliana ramos|hospital exemplo s.a.|https://br.linkedin.com/in/juliana-ramos-suprimentos"
    );
  });

  it("diferencia claramente escopo ORGANIZACAO vs INSTITUICAO", () => {
    const escopoInstituicao: CandidatoResponsavel = {
      ...candidatoBaseValido,
      escopoContato: "INSTITUICAO",
    };
    const validacao = validarCandidatoNaoFabricado(escopoInstituicao);
    expect(validacao.success).toBe(true);
    if (validacao.success) {
      expect(validacao.data.escopoContato).toBe("INSTITUICAO");
    }
  });
});

describe("Gate 6 — Fluxo Operacional de Busca Supervisionada no Banco", () => {
  it("executa busca sob demanda para conta demonstração com isolamento garantido", async () => {
    const contaDemo = await prisma.contaComercial.findFirst({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    expect(contaDemo).toBeDefined();
    if (!contaDemo) return;

    const resultado = await solicitarBuscaResponsaveis({
      contaComercialId: contaDemo.id,
      usuarioSolicitante: "analista-teste-demo",
      confirmacaoUsuario: true,
    });

    expect(resultado.status).toBe("AGUARDANDO_REVISAO");
    expect(resultado.contatosEncontrados.length).toBeGreaterThan(0);
    expect(resultado.contatosEncontrados[0].tipoDado).toBe("DEMONSTRACAO");
    expect(resultado.contatosEncontrados[0].linkedinSimulado).toBe(true);
    expect(resultado.contatosEncontrados[0].ativo).toBe(false); // Inativo até revisão humana
    expect(resultado.contatosEncontrados[0].statusRevisao).toBe("PENDENTE");

    // Verificar solicitação auditável persistida
    const ultima = await obterUltimaPesquisaConta(contaDemo.id);
    expect(ultima).not.toBeNull();
    expect(ultima?.id).toBe(resultado.id);
    expect(ultima?.fontesConsultadas.length).toBeGreaterThan(0);
    expect(ultima?.termosBusca.length).toBeGreaterThan(0);
    expect(ultima?.limitacoes).toBeDefined();
  });

  it("retorna SEM_CONTATO_VERIFICAVEL com auditoria completa quando não há pessoa comprovada", async () => {
    // Buscar uma conta com pesquisa prévia SEM_CONTATO_VERIFICAVEL
    const pesquisaSemContato = await prisma.pesquisaContatoOrganizacao.findFirst({
      where: { status: "SEM_CONTATO_VERIFICAVEL" },
    });
    expect(pesquisaSemContato).toBeDefined();
    if (!pesquisaSemContato) return;

    const contaAssociada = await prisma.contaComercial.findFirst({
      where: { grupoEconomicoId: pesquisaSemContato.grupoEconomicoId },
    });
    expect(contaAssociada).toBeDefined();
    if (!contaAssociada) return;

    const resultado = await solicitarBuscaResponsaveis({
      contaComercialId: contaAssociada.id,
      usuarioSolicitante: "analista-auditor",
      confirmacaoUsuario: true,
    });

    expect(resultado.status).toBe("SEM_CONTATO_VERIFICAVEL");
    expect(resultado.contatosEncontrados.length).toBe(0);
    expect(resultado.resultado).toContain("Nenhum");
    expect(resultado.fontesConsultadas.length).toBeGreaterThan(0);
    expect(resultado.termosBusca.length).toBeGreaterThan(0);
    expect(resultado.limitacoes).toBeDefined();
  });

  it("permite revisão humana com ativação e posterior desativação auditada", async () => {
    // Buscar qualquer contato para testar ciclo de vida
    const contato = await prisma.contatoProfissional.findFirst({
      where: { ativo: true },
    });
    expect(contato).toBeDefined();
    if (!contato) return;

    // Desativar contato
    const desativado = await desativarContatoSupervisionado({
      contatoId: contato.id,
      motivo: "Contato não responde mais pela área corporativa",
      usuario: "supervisor-comercial",
    });
    expect(desativado.ativo).toBe(false);
    expect(desativado.statusRevisao).toBe("REJEITADA");
    expect(desativado.observacao).toContain("supervisor-comercial");

    // Reativar contato (aprovação humana)
    const reativado = await ativarContatoSupervisionado({
      contatoId: contato.id,
      usuarioAprovador: "gestor-qualidade",
    });
    expect(reativado.ativo).toBe(true);
    expect(reativado.statusRevisao).toBe("APROVADA");
    expect(reativado.observacao).toContain("gestor-qualidade");

    // Restaurar estado canônico original do contato
    await prisma.contatoProfissional.update({
      where: { id: contato.id },
      data: {
        ativo: contato.ativo,
        statusRevisao: contato.statusRevisao,
        observacao: contato.observacao,
      },
    });
  });

  afterAll(async () => {
    await prisma.contatoProfissional.deleteMany({
      where: { observacao: { contains: "busca supervisionada" } },
    });
    await prisma.solicitacaoBuscaResponsaveis.deleteMany();
  });
});
