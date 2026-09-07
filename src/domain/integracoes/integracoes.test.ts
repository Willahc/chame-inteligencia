import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obterOuInicializarIntegracoes,
  gerarPreviaSimulacao,
  executarSimulacaoControlada,
  executarLoteSimulacao,
} from "./servico-integracoes";
import {
  AVISO_BLOQUEIO_PRODUCAO,
  LIMITE_MAXIMO_LOTE_SIMULACAO,
} from "./tipos";

describe("Gate 9 — Arquitetura de Integrações Externas", () => {
  const eventosCriadosIds: string[] = [];
  const integracoesTesteIds: string[] = [];
  const acoesCriadasIds: string[] = [];

  let integracaoCRMId: string;
  let integracaoEmailId: string;
  let integracaoWhatsAppId: string;
  let integracaoDiscadorId: string;

  beforeAll(async () => {
    const integracoes = await obterOuInicializarIntegracoes();
    expect(integracoes.length).toBeGreaterThanOrEqual(4);

    const crm = integracoes.find((i) => i.tipo === "CRM")!;
    const email = integracoes.find((i) => i.tipo === "EMAIL")!;
    const wpp = integracoes.find((i) => i.tipo === "WHATSAPP")!;
    const vox = integracoes.find((i) => i.tipo === "DISCADOR")!;

    expect(crm).toBeDefined();
    expect(email).toBeDefined();
    expect(wpp).toBeDefined();
    expect(vox).toBeDefined();

    integracaoCRMId = crm.id;
    integracaoEmailId = email.id;
    integracaoWhatsAppId = wpp.id;
    integracaoDiscadorId = vox.id;
  });

  afterAll(async () => {
    if (eventosCriadosIds.length > 0) {
      await prisma.eventoIntegracao.deleteMany({
        where: { id: { in: eventosCriadosIds } },
      });
    }
    if (acoesCriadasIds.length > 0) {
      await prisma.historicoAcaoComercial.deleteMany({
        where: { acaoComercialId: { in: acoesCriadasIds } },
      });
      await prisma.acaoComercialPlanejada.deleteMany({
        where: { id: { in: acoesCriadasIds } },
      });
    }
    if (integracoesTesteIds.length > 0) {
      await prisma.integracaoExterna.deleteMany({
        where: { id: { in: integracoesTesteIds } },
      });
    }
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

  async function obterContaEContatoReal() {
    const contaReal = await prisma.contaComercial.findFirst({
      where: {
        tipoDado: "FATO_OFICIAL",
        grupoEconomicoId: { not: null },
      },
    });
    const contatoReal = await prisma.contatoProfissional.findFirst({
      where: {
        tipoDado: "FATO_PUBLICO",
        statusDecisao: "APROVADO",
        ativo: true,
      },
    });
    return { contaReal: contaReal!, contatoReal: contatoReal! };
  }

  // 1. Bloqueio absoluto quando integração estiver desabilitada ou inativa
  it("1. bloqueia absolutamente quando integração estiver desabilitada ou inativa", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const integracaoInativa = await prisma.integracaoExterna.create({
      data: {
        nome: "Conector Teste Inativo",
        tipo: "CRM",
        ambiente: "SIMULACAO",
        status: "INATIVA",
      },
    });
    integracoesTesteIds.push(integracaoInativa.id);

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoInativa.id,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Tentativa em integração inativa",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain("não está ativa");
  });

  // 2. Comportamento no ambiente SIMULACAO por padrão e bloqueio de produção
  it("2. opera no ambiente SIMULACAO por padrão e bloqueia qualquer tentativa de produção", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const integracoes = await prisma.integracaoExterna.findMany();
    for (const i of integracoes) {
      expect(i.ambiente).toBe("SIMULACAO");
    }

    // Criar tentativa fictícia de integração em ambiente PRODUCAO
    const integracaoProducao = await prisma.integracaoExterna.create({
      data: {
        nome: "Conector Fake Producao",
        tipo: "CRM",
        ambiente: "PRODUCAO",
        status: "ATIVA",
      },
    });
    integracoesTesteIds.push(integracaoProducao.id);

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoProducao.id,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.seguranca",
      justificativa: "Tentativa de acionar modo produção",
      finalidadeComercial: "Compliance",
      confirmacaoHumana: true,
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain(AVISO_BLOQUEIO_PRODUCAO);
  });

  // 3. Ausência de chamadas de rede ou dependências externas
  it("3. garante ausência total de chamadas de rede ou dependências externas", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Validação de sandbox local",
      finalidadeComercial: "Demonstração técnica B2B",
      confirmacaoHumana: true,
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.resposta.chamadaExternaRealizada).toBe(false);
    const resultado = JSON.parse(res.evento.resultadoResumo);
    expect(resultado.chamadaExternaRealizada).toBe(false);
  });

  // 4. Bloqueio de contatos não aprovados, inativos ou rejeitados (Gate 7)
  it("4. bloqueia contatos não aprovados, inativos ou rejeitados", async () => {
    const { contaDemo } = await obterContaEContatoDemo();

    // Contato rejeitado
    const contatoRejeitado = await prisma.contatoProfissional.findFirst({
      where: {
        OR: [
          { statusDecisao: "REJEITADO" },
          { statusDecisao: "PENDENTE" },
          { ativo: false },
        ],
      },
    });

    if (contatoRejeitado) {
      const res = await executarSimulacaoControlada({
        integracaoId: integracaoEmailId,
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoRejeitado.id,
        usuarioSolicitante: "analista.compliance",
        justificativa: "Teste de bloqueio de contato inadequado",
        finalidadeComercial: "Prospecção",
        confirmacaoHumana: true,
      });

      eventosCriadosIds.push(res.evento.id);
      expect(res.evento.status).toBe("BLOQUEADO");
      expect(res.resposta.sucesso).toBe(false);
    }
  });

  // 5. Bloqueio de ações não aprovadas (Gate 8)
  it("5. bloqueia ações não aprovadas para simulação", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // Criar uma ação em RASCUNHO (não aprovada para simulação)
    const acaoRascunho = await prisma.acaoComercialPlanejada.create({
      data: {
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        tipoAcao: "APRESENTACAO_INSTITUCIONAL",
        canal: "EMAIL",
        objetivo: "Apresentar Chame Táxi",
        mensagemRascunho: "Rascunho ainda em formulação.",
        status: "RASCUNHO",
        criadoPor: "analista.teste",
        tipoDado: "INFERENCIA",
      },
    });

    try {
      const res = await executarSimulacaoControlada({
        integracaoId: integracaoEmailId,
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        acaoComercialId: acaoRascunho.id,
        usuarioSolicitante: "analista.teste",
        justificativa: "Tentativa de integrar ação não aprovada",
        finalidadeComercial: "Comercial",
        confirmacaoHumana: true,
      });

      eventosCriadosIds.push(res.evento.id);
      expect(res.evento.status).toBe("BLOQUEADO");
      expect(res.resposta.mensagem).toContain("Apenas ações aprovadas para simulação");
    } finally {
      await prisma.eventoIntegracao.deleteMany({ where: { acaoComercialId: acaoRascunho.id } });
      await prisma.acaoComercialPlanejada.delete({ where: { id: acaoRascunho.id } });
    }
  });

  // 6. Bloqueio quando ausente confirmação humana ou justificativa
  it("6. bloqueia quando ausente confirmação humana ou justificativa", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // Sem confirmação humana -> lança erro diretamente
    await expect(
      executarSimulacaoControlada({
        integracaoId: integracaoCRMId,
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        usuarioSolicitante: "operador.teste",
        justificativa: "Simulação sem confirmação",
        finalidadeComercial: "Comercial",
        confirmacaoHumana: false,
      })
    ).rejects.toThrow("confirmação humana explícita");

    // Sem justificativa -> bloqueia e registra evento
    const resSemJustificativa = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "",
      finalidadeComercial: "Comercial",
      confirmacaoHumana: true,
    });

    eventosCriadosIds.push(resSemJustificativa.evento.id);
    expect(resSemJustificativa.evento.status).toBe("BLOQUEADO");
  });

  // 7. Validação e sanitização de payload (sem senhas, tokens ou dados sensíveis)
  it("7. valida e sanitiza payload sem persistir senhas, tokens ou dados pessoais excessivos", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const previa = await gerarPreviaSimulacao({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Análise prévia de payload",
      finalidadeComercial: "Apresentação corporativa de mobilidade",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Apresentação Chame Táxi B2B",
        corpoMensagem: "Texto de apresentação corporativa.",
        senhaInsegura: "123456",
        bearerToken: "xyz-token-secreto",
      },
    });

    expect(previa.payloadSanitizado).toBeDefined();
    // Garante que senhas ou tokens informados inadvertidamente são eliminados
    expect(previa.payloadSanitizado.senhaInsegura).toBeUndefined();
    expect(previa.payloadSanitizado.bearerToken).toBeUndefined();
    expect(previa.payloadSanitizado.modoSimulacao).toBe(true);
    expect(previa.payloadSanitizado.ambiente).toBe("SIMULACAO");
  });

  // 8. Resposta simulada para CRM, E-mail, WhatsApp e Discador
  it("8. retorna resposta simulada padronizada para os 4 adaptadores", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // 8.1 CRM
    const crmRes = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.crm",
      justificativa: "Teste de adaptador CRM",
      finalidadeComercial: "Sincronização de oportunidade B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        estagioOportunidade: "PROSPECCAO",
        valorEstimado: 25000,
      },
    });
    eventosCriadosIds.push(crmRes.evento.id);
    expect(crmRes.resposta.sucesso).toBe(true);
    expect(crmRes.resposta.statusEvento).toBe("SUCESSO_SIMULADO");
    expect(crmRes.resposta.tipoIntegracao).toBe("CRM");
    expect(crmRes.resposta.transacaoId).toMatch(/^SIM-CRM-/);

    // 8.2 Email
    const emailRes = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.email",
      justificativa: "Teste de adaptador Email",
      finalidadeComercial: "Comunicação corporativa",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Apresentação Institucional",
        corpoMensagem: "Prezados, segue apresentação institucional dos serviços corporativos Chame Táxi.",
      },
    });
    eventosCriadosIds.push(emailRes.evento.id);
    expect(emailRes.resposta.sucesso).toBe(true);
    expect(emailRes.resposta.statusEvento).toBe("SUCESSO_SIMULADO");
    expect(emailRes.resposta.tipoIntegracao).toBe("EMAIL");
    expect(emailRes.resposta.transacaoId).toMatch(/^SIM-EML-/);

    // 8.3 WhatsApp
    const wppRes = await executarSimulacaoControlada({
      integracaoId: integracaoWhatsAppId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.wpp",
      justificativa: "Teste de adaptador WhatsApp",
      finalidadeComercial: "Comunicação operacional B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        mensagem: "Olá, informamos a disponibilidade do nosso portal de mobilidade corporativa.",
      },
    });
    eventosCriadosIds.push(wppRes.evento.id);
    expect(wppRes.resposta.sucesso).toBe(true);
    expect(wppRes.resposta.statusEvento).toBe("SUCESSO_SIMULADO");
    expect(wppRes.resposta.tipoIntegracao).toBe("WHATSAPP");
    expect(wppRes.resposta.transacaoId).toMatch(/^SIM-WPP-/);

    // 8.4 Discador
    const voxRes = await executarSimulacaoControlada({
      integracaoId: integracaoDiscadorId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.discador",
      justificativa: "Teste de adaptador Discador",
      finalidadeComercial: "Sondagem corporativa",
      confirmacaoHumana: true,
      dadosEspecificos: {
        tipoCampanha: "SDR_HUMANO",
        roteiroSugestao: "Alinhamento com gerência administrativa hospitalar",
      },
    });
    eventosCriadosIds.push(voxRes.evento.id);
    expect(voxRes.resposta.sucesso).toBe(true);
    expect(voxRes.resposta.statusEvento).toBe("SUCESSO_SIMULADO");
    expect(voxRes.resposta.tipoIntegracao).toBe("DISCADOR");
    expect(voxRes.resposta.transacaoId).toMatch(/^SIM-VOX-/);
  });

  // 9. Registro imutável de EventoIntegracao
  it("9. registra evento imutável EventoIntegracao em todas as operações", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "auditor.sistema",
      justificativa: "Auditoria de rastreabilidade de evento",
      finalidadeComercial: "Verificação de conformidade",
      confirmacaoHumana: true,
    });
    eventosCriadosIds.push(res.evento.id);

    const eventoSalvo = await prisma.eventoIntegracao.findUnique({
      where: { id: res.evento.id },
      include: { integracao: true },
    });

    expect(eventoSalvo).not.toBeNull();
    expect(eventoSalvo?.usuarioSolicitante).toBe("auditor.sistema");
    expect(eventoSalvo?.justificativa).toBe("Auditoria de rastreabilidade de evento");
    expect(eventoSalvo?.integracao.tipo).toBe("CRM");
  });

  // 10. Tratamento simulado de falha, timeout e cancelamento
  it("10. trata cenários de falha simulada, timeout simulado e cancelamento", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // 10.1 Cancelamento
    const resCancelado = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.cancelamento",
      justificativa: "Operador optou por abortar a simulação",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
      cancelarAntesExecutar: true,
    });
    eventosCriadosIds.push(resCancelado.evento.id);
    expect(resCancelado.evento.status).toBe("CANCELADO");
    expect(resCancelado.resposta.statusEvento).toBe("CANCELADO");

    // 10.2 Timeout simulado
    const resTimeout = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.resiliencia",
      justificativa: "Teste de tolerância a timeout",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
      simularTimeout: true,
    });
    eventosCriadosIds.push(resTimeout.evento.id);
    expect(resTimeout.evento.status).toBe("TIMEOUT_SIMULADO");
    expect(resTimeout.resposta.statusEvento).toBe("TIMEOUT_SIMULADO");

    // 10.3 Falha simulada
    const resFalha = await executarSimulacaoControlada({
      integracaoId: integracaoWhatsAppId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.falhas",
      justificativa: "Teste de tratamento de erro no conector",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
      simularFalha: true,
    });
    eventosCriadosIds.push(resFalha.evento.id);
    expect(resFalha.evento.status).toBe("FALHA_SIMULADA");
    expect(resFalha.resposta.statusEvento).toBe("FALHA_SIMULADA");
  });

  // 11. Garantia de que nenhum evento ou ação recebe status ENVIADA ou REALIZADA
  it("11. garante que nenhum evento ou ação recebe status ENVIADA ou REALIZADA", async () => {
    const eventos = await prisma.eventoIntegracao.findMany({
      select: { status: true },
    });

    for (const ev of eventos) {
      expect((ev.status as string) !== "ENVIADA").toBe(true);
      expect((ev.status as string) !== "REALIZADA").toBe(true);
    }
  });

  // 12. Isolamento estrito entre dados DEMONSTRACAO e FATO_OFICIAL/FATO_PUBLICO
  it("12. garante isolamento estrito entre dados DEMONSTRACAO e FATO_OFICIAL/FATO_PUBLICO", async () => {
    const { contaDemo } = await obterContaEContatoDemo();
    const { contaReal, contatoReal } = await obterContaEContatoReal();

    expect(contaDemo).toBeDefined();
    expect(contaReal).toBeDefined();
    expect(contatoReal).toBeDefined();

    // Tentativa: Conta DEMONSTRACAO com Contato REAL -> Deve bloquear!
    const resMisto1 = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoReal.id,
      usuarioSolicitante: "auditor.isolamento",
      justificativa: "Teste de isolamento canônico",
      finalidadeComercial: "Auditoria",
      confirmacaoHumana: true,
    });
    eventosCriadosIds.push(resMisto1.evento.id);
    expect(resMisto1.evento.status).toBe("BLOQUEADO");
    expect(resMisto1.resposta.mensagem).toContain("Violação de isolamento canônico");

    // Tentativa: Conta REAL com Contato DEMONSTRACAO -> Deve bloquear!
    const { contatoDemo } = await obterContaEContatoDemo();
    const resMisto2 = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaReal.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "auditor.isolamento",
      justificativa: "Teste de isolamento canônico",
      finalidadeComercial: "Auditoria",
      confirmacaoHumana: true,
    });
    eventosCriadosIds.push(resMisto2.evento.id);
    expect(resMisto2.evento.status).toBe("BLOQUEADO");
    expect(resMisto2.resposta.mensagem).toContain("Violação de isolamento canônico");
  });

  // 13. Limite de lote máximo de simulações (10 itens)
  it("13. bloqueia execuções em lote que excedam o limite máximo permitido de 10 itens", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const loteExcedente = Array.from({ length: 11 }).map((_, i) => ({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: `operador.${i}`,
      justificativa: `Simulação em lote ${i}`,
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
    }));

    await expect(executarLoteSimulacao(loteExcedente)).rejects.toThrow(
      `Limite máximo de simulação em lote excedido. O limite permitido é de ${LIMITE_MAXIMO_LOTE_SIMULACAO}`
    );
  });

  // 14. Bloqueio de credenciais, senhas, tokens ou api keys no payload
  it("14. bloqueia payload contendo credenciais, senhas, tokens ou api keys", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Tentativa com chave de autenticação indevida",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
      dadosEspecificos: {
        apiKeySegredo: "token-secreto-123456",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain("credencial, senha ou token");
  });

  // 15. Bloqueio de dados pessoais sensíveis (CPF) em payload ou justificativa
  it("15. bloqueia payload ou justificativa contendo CPF (regras de privacidade)", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    // 15.1 CPF na justificativa
    const resCpfJustificativa = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Simulação para responsável CPF 123.456.789-00",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
    });
    eventosCriadosIds.push(resCpfJustificativa.evento.id);
    expect(resCpfJustificativa.evento.status).toBe("BLOQUEADO");
    expect(resCpfJustificativa.resposta.mensagem).toContain("CPF");

    // 15.2 CPF nos dados específicos (sem pontuação)
    const resCpfPayload = await executarSimulacaoControlada({
      integracaoId: integracaoCRMId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Simulação de teste",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
      dadosEspecificos: {
        documentoResponsavel: "12345678901",
      },
    });
    eventosCriadosIds.push(resCpfPayload.evento.id);
    expect(resCpfPayload.evento.status).toBe("BLOQUEADO");
    expect(resCpfPayload.resposta.mensagem).toContain("CPF");
  });

  // 16. Bloqueio de domínio de e-mail pessoal não corporativo
  it("16. bloqueia destinatário com domínio de e-mail pessoal não corporativo", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "operador.teste",
      justificativa: "Tentativa de envio para provedor pessoal",
      finalidadeComercial: "Prospecção",
      confirmacaoHumana: true,
      dadosEspecificos: {
        destinatarioEmail: "gestor.saude@gmail.com",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain("e-mail pessoal");
  });
});
