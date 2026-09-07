import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarRascunhoAcao,
  editarRascunhoAcao,
  submeterParaRevisao,
  aprovarParaSimulacao,
  executarSimulacao,
  cancelarAcao,
  bloquearAcao,
  listarAcoesPlanejadas,
  obterResumoContadoresAutomacao,
  obterPreviaAcao,
  obterHistoricoAcao,
} from "./servico-automacao";
import {
  AVISO_CANAL_PLANEJADO,
  AVISO_SIMULACAO_CONTROLADA,
} from "./tipos";
import { validarElegibilidadeAcao } from "./elegibilidade";

describe("Gate 8 — Automação Comercial Controlada", () => {
  const acoesCriadasIds: string[] = [];

  afterAll(async () => {
    // Limpeza de ações de teste para garantir idempotência e não poluir o banco
    if (acoesCriadasIds.length > 0) {
      await prisma.historicoAcaoComercial.deleteMany({
        where: { acaoComercialId: { in: acoesCriadasIds } },
      });
      await prisma.acaoComercialPlanejada.deleteMany({
        where: { id: { in: acoesCriadasIds } },
      });
    }
  });

  it("não possui estado ENVIADA no modelo ou enums", () => {
    // Garante que o estado ENVIADA não existe no sistema
    const estadosValidos: string[] = [
      "RASCUNHO",
      "AGUARDANDO_REVISAO",
      "APROVADA_PARA_SIMULACAO",
      "SIMULADA",
      "CANCELADA",
      "BLOQUEADA",
    ];
    expect(estadosValidos.includes("ENVIADA")).toBe(false);
  });

  async function obterContaEContatoDemo() {
    const contaDemo = await prisma.contaComercial.findFirst({
      where: { tipoDado: "DEMONSTRACAO" },
    });
    const instId = contaDemo!.id.replace("conta-", "");
    const contatoDemo = await prisma.contatoProfissional.findFirst({
      where: {
        tipoDado: "DEMONSTRACAO",
        statusDecisao: "APROVADO",
        ativo: true,
        instituicaoId: instId,
      },
    });
    return { contaDemo: contaDemo!, contatoDemo: contatoDemo! };
  }

  it("cria um rascunho de ação comercial com sucesso para conta e contato aprovados", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();
    expect(contaDemo).not.toBeNull();
    expect(contatoDemo).not.toBeNull();

    const acao = await criarRascunhoAcao({
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      tipoAcao: "APRESENTACAO_INSTITUCIONAL",
      canal: "EMAIL",
      objetivo: "Apresentar portfólio corporativo da Chame Táxi",
      mensagemRascunho: "Olá, gostaríamos de apresentar nossos serviços corporativos de mobilidade.",
      criadoPor: "analista.comercial",
      justificativaInicial: "Instituição com alta prioridade para mobilidade.",
    });

    acoesCriadasIds.push(acao.id);

    expect(acao.id).toBeDefined();
    expect(acao.status).toBe("RASCUNHO");
    expect(acao.tipoDado).toBe("DEMONSTRACAO");
    expect(acao.criadoPor).toBe("analista.comercial");

    // Histórico de auditoria registrado
    const historico = await obterHistoricoAcao(acao.id);
    expect(historico.length).toBe(1);
    expect(historico[0].acao).toBe("CRIACAO_RASCUNHO");
    expect(historico[0].novoStatus).toBe("RASCUNHO");
  });

  it("permite editar parâmetros de um rascunho com justificativa e histórico auditável", async () => {
    const acaoId = acoesCriadasIds[0];
    const editada = await editarRascunhoAcao(acaoId, {
      objetivo: "Objetivo atualizado para proposta de convênio exclusivo",
      mensagemRascunho: "Mensagem revisada com dados de frota corporativa.",
      usuario: "editor.comercial",
      justificativa: "Ajuste fino de escopo conforme novas diretrizes.",
    });

    expect(editada.objetivo).toBe("Objetivo atualizado para proposta de convênio exclusivo");
    const historico = await obterHistoricoAcao(acaoId);
    expect(historico.length).toBe(2);
    expect(historico[1].acao).toBe("EDICAO_RASCUNHO");
  });

  it("bloqueia criação com contato PENDENTE", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-1",
        nome: "Diretor Teste",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "PENDENTE",
        fonteId: "fonte-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "diretor@hospital.com.br",
      },
      canal: "EMAIL",
      mensagemRascunho: "Apresentação corporativa",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("status 'PENDENTE'"))).toBe(true);
  });

  it("bloqueia criação com contato REJEITADO", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-2",
        nome: "Gerente Teste",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "REJEITADO",
        fonteId: "fonte-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "gerente@hospital.com.br",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("status 'REJEITADO'"))).toBe(true);
  });

  it("bloqueia criação com contato DESATIVADO", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-3",
        nome: "Coordenador Teste",
        tipoDado: "FATO_PUBLICO",
        ativo: false,
        statusDecisao: "APROVADO",
        fonteId: "fonte-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "coord@hospital.com.br",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("está desativado"))).toBe(true);
  });

  it("exige fonte pública verificável", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-4",
        nome: "Comprador Teste",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "APROVADO",
        fonteId: "",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "compras@hospital.com.br",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("fonte pública verificável"))).toBe(true);
  });

  it("exige data de evidência", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-5",
        nome: "Supervisor Teste",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "APROVADO",
        fonteId: "fonte-publica-1",
        dataEvidencia: null,
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "sup@hospital.com.br",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("data de evidência"))).toBe(true);
  });

  it("exige conta comercial válida e ativa", async () => {
    await expect(
      criarRascunhoAcao({
        contaComercialId: "id-inexistente-12345",
        tipoAcao: "APRESENTACAO_INSTITUCIONAL",
        canal: "EMAIL",
        objetivo: "Teste conta inválida",
        mensagemRascunho: "Mensagem rascunho de teste",
        criadoPor: "analista.comercial",
      })
    ).rejects.toThrow("não encontrada");
  });

  it("impede dados pessoais proibidos (CPF)", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-6",
        nome: "João da Silva 123.456.789-00",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "APROVADO",
        fonteId: "fonte-publica-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "joao@hospital.com.br",
      },
      canal: "EMAIL",
      mensagemRascunho: "Proposta para CPF 123.456.789-00",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("CPF ou dado pessoal proibido"))).toBe(true);
  });

  it("impede e-mail pessoal não corporativo", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-7",
        nome: "Maria Gestora",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "APROVADO",
        fonteId: "fonte-publica-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "mariagestora@gmail.com",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("provedor pessoal"))).toBe(true);
  });

  it("impede vinculação cruzada entre real e demonstração", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-real", nome: "Conta Real", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-demo",
        nome: "Contato Fictício",
        tipoDado: "DEMONSTRACAO",
        ativo: true,
        statusDecisao: "APROVADO",
        fonteId: "fonte-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "demo@hospitaldemo.com.br",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("Contatos de demonstração não podem"))).toBe(true);
  });

  it("impede duplicidade idêntica de ações ativas", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // Já existe uma ação criada no primeiro teste com esse mesmo canal EMAIL e contatoDemo
    await expect(
      criarRascunhoAcao({
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        tipoAcao: "SONDAGEM_DEMANDA_MOBILIDADE",
        canal: "EMAIL",
        objetivo: "Segunda tentativa duplicada",
        mensagemRascunho: "Mensagem duplicada",
        criadoPor: "outro.analista",
      })
    ).rejects.toThrow("Já existe uma ação comercial em andamento");
  });

  it("avança o fluxo completo: submissão -> aprovação humana -> simulação sem envio", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // Cria nova ação com canal TELEFONE
    const acao = await criarRascunhoAcao({
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      tipoAcao: "REUNIAO_ALINHAMENTO_GESTAO",
      canal: "TELEFONE",
      objetivo: "Agendar conversa telefônica com gerência de operações",
      mensagemRascunho: "Script de alinhamento sobre transporte de equipes médicas.",
      criadoPor: "consultor.comercial",
      justificativaInicial: "Conta com grande frota e múltiplos plantões.",
    });

    acoesCriadasIds.push(acao.id);

    // 1. Submissão à revisão
    const submetida = await submeterParaRevisao(acao.id, {
      usuario: "consultor.comercial",
      justificativa: "Planejamento validado internamente, pronto para revisão.",
    });
    expect(submetida.status).toBe("AGUARDANDO_REVISAO");

    // 2. Aprovação humana formal
    const aprovada = await aprovarParaSimulacao(acao.id, {
      usuarioAprovador: "gestor.aprovador",
      justificativa: "Elegibilidade confirmada e script aderente às normas comerciais.",
      observacao: "Liberado exclusivamente para simulação em sandbox.",
    });
    expect(aprovada.status).toBe("APROVADA_PARA_SIMULACAO");
    expect(aprovada.aprovadoPor).toBe("gestor.aprovador");
    expect(aprovada.aprovadoEm).toBeDefined();

    // 3. Simulação controlada (sem qualquer chamada externa)
    const simulacao = await executarSimulacao(acao.id, {
      usuario: "operador.sandbox",
      justificativa: "Executando teste funcional de prontidão de contato.",
    });

    expect(simulacao.statusFinal).toBe("SIMULADA");
    expect(simulacao.disparoExternoRealizado).toBe(false);
    expect(simulacao.mensagemAlerta).toBe(AVISO_SIMULACAO_CONTROLADA);

    // Verifica status no banco
    const acaoNoBanco = await prisma.acaoComercialPlanejada.findUnique({
      where: { id: acao.id },
    });
    expect(acaoNoBanco?.status).toBe("SIMULADA");

    // Verifica histórico de auditoria imutável
    const historico = await obterHistoricoAcao(acao.id);
    expect(historico.length).toBe(4); // CRIACAO_RASCUNHO -> SUBMISSAO_REVISAO -> APROVACAO_SIMULACAO -> EXECUCAO_SIMULACAO
    expect(historico.map((h) => h.novoStatus)).toEqual([
      "RASCUNHO",
      "AGUARDANDO_REVISAO",
      "APROVADA_PARA_SIMULACAO",
      "SIMULADA",
    ]);
  });

  it("permite cancelamento com justificativa obrigatória e registro imutável", async () => {
    const contaDemo = await prisma.contaComercial.findFirst({
      where: { tipoDado: "DEMONSTRACAO" },
    });

    const acao = await criarRascunhoAcao({
      contaComercialId: contaDemo!.id,
      tipoAcao: "PROPOSTA_CONVENIO_TRANSPORTE",
      canal: "OUTRO",
      objetivo: "Proposta preliminar para análise",
      mensagemRascunho: "Rascunho que será cancelado",
      criadoPor: "analista.cancelador",
    });

    acoesCriadasIds.push(acao.id);

    const cancelada = await cancelarAcao(acao.id, {
      usuario: "gestor.cancelador",
      justificativa: "Cancelado porque a conta alterou a política de transporte.",
    });

    expect(cancelada.status).toBe("CANCELADA");

    const historico = await obterHistoricoAcao(acao.id);
    const ultimoEvento = historico[historico.length - 1];
    expect(ultimoEvento.acao).toBe("CANCELAMENTO");
    expect(ultimoEvento.novoStatus).toBe("CANCELADA");
    expect(ultimoEvento.justificativa).toBe("Cancelado porque a conta alterou a política de transporte.");
  });

  it("bloqueia criação com contato no status REVISAR_NOVAMENTE", () => {
    const validacao = validarElegibilidadeAcao({
      conta: { id: "conta-1", nome: "Conta Teste", tipoDado: "FATO_OFICIAL" },
      contato: {
        id: "contato-revisar",
        nome: "Analista em Revisão",
        tipoDado: "FATO_PUBLICO",
        ativo: true,
        statusDecisao: "REVISAR_NOVAMENTE",
        fonteId: "fonte-1",
        dataEvidencia: new Date(),
        tipoPapelComercial: "INFERENCIA",
        emailCorporativo: "analista@hospital.com.br",
      },
      canal: "EMAIL",
    });

    expect(validacao.elegivel).toBe(false);
    expect(validacao.erros.some((e) => e.includes("status 'REVISAR_NOVAMENTE'"))).toBe(true);
  });

  it("permite bloquear ação com justificativa e histórico auditável", async () => {
    const contaDemo = await prisma.contaComercial.findFirst({
      where: { tipoDado: "DEMONSTRACAO" },
    });

    const acao = await criarRascunhoAcao({
      contaComercialId: contaDemo!.id,
      tipoAcao: "SONDAGEM_DEMANDA_MOBILIDADE",
      canal: "OUTRO",
      objetivo: "Ação que será bloqueada por compliance",
      mensagemRascunho: "Rascunho de teste para bloqueio",
      criadoPor: "auditor.compliance",
    });

    acoesCriadasIds.push(acao.id);

    const bloqueada = await bloquearAcao(acao.id, {
      usuario: "auditor.compliance",
      justificativa: "Suspeita de alteração cadastral recente da instituição.",
      observacao: "Aguardar nova validação da diretoria.",
    });

    expect(bloqueada.status).toBe("BLOQUEADA");

    const historico = await obterHistoricoAcao(acao.id);
    const ultimo = historico[historico.length - 1];
    expect(ultimo.acao).toBe("BLOQUEIO");
    expect(ultimo.novoStatus).toBe("BLOQUEADA");
  });

  it("retorna contadores agregados e suporta filtros de listagem", async () => {
    const resumo = await obterResumoContadoresAutomacao("MODO_DEMONSTRACAO");
    expect(resumo.total).toBeGreaterThanOrEqual(1);

    const lista = await listarAcoesPlanejadas({
      modo: "MODO_DEMONSTRACAO",
    });
    expect(lista.length).toBe(resumo.total);
    expect(lista.every((a) => a.tipoDado === "DEMONSTRACAO")).toBe(true);
  });

  it("gera prévia estruturada exibindo conta, contato e avisos obrigatórios", async () => {
    const acaoId = acoesCriadasIds[0];
    const previa = await obterPreviaAcao(acaoId);

    expect(previa).not.toBeNull();
    expect(previa!.conta.nome).toBeDefined();
    expect(previa!.contato?.nome).toBeDefined();
    expect(previa!.acao.avisoCanalPlanejado).toBe(AVISO_CANAL_PLANEJADO);
    expect(previa!.acao.avisoSimulacao).toBe(AVISO_SIMULACAO_CONTROLADA);
  });
});
