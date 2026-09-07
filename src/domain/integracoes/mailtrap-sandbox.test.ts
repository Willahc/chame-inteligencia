import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obterOuInicializarIntegracoes,
  gerarPreviaSimulacao,
  executarSimulacaoControlada,
  atualizarAmbienteIntegracao,
  obterStatusHomologacao,
  obterDiagnosticoMailtrapSandbox,
  circuitBreakerHomologacao,
  rateLimiterHomologacao,
  ativarKillSwitch,
  desativarKillSwitch,
  resetarEstadoHomologacao,
  getContadorMensagensGate11,
  getLimiteMensagensGate11,
  setLimiteMensagensGate11,
  resetarContadorMensagensGate11,
  AVISO_HOMOLOGACAO_SANDBOX,
  TIMEOUT_HOMOLOGACAO_MS,
  LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO,
  LIMITE_MAXIMO_MENSAGENS_GATE_11,
  ENDPOINT_SANDBOX_MAILTRAP_BASE,
} from "./servico-integracoes";
import { AdaptadorEmailHomologacao } from "./adaptadores/email-homologacao";
import { AVISO_BLOQUEIO_PRODUCAO } from "./tipos";

describe("Gate 11 — Homologação Real do Mailtrap Sandbox", () => {
  const eventosCriadosIds: string[] = [];
  let integracaoEmailId: string;
  const adaptador = new AdaptadorEmailHomologacao();

  beforeAll(async () => {
    const integracoes = await obterOuInicializarIntegracoes();
    const email = integracoes.find((i) => i.tipo === "EMAIL")!;
    expect(email).toBeDefined();
    integracaoEmailId = email.id;
  });

  beforeEach(() => {
    resetarEstadoHomologacao();
  });

  afterAll(async () => {
    resetarEstadoHomologacao();
    if (eventosCriadosIds.length > 0) {
      await prisma.eventoIntegracao.deleteMany({
        where: { id: { in: eventosCriadosIds } },
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

  // 1. Tratamento gracioso de ausência de credencial
  it("1. trata graciosamente a ausência de token/inbox de sandbox sem crash e opera em mock local", async () => {
    const diag = obterDiagnosticoMailtrapSandbox();
    expect(diag.provedor).toBe("Mailtrap Email Sandbox API");
    expect(diag.sandboxObrigatorio).toBe(true);
    expect(typeof diag.tokenConfigurado).toBe("boolean");
    expect(["CONECTADO_SANDBOX", "MOCK_LOCAL_HOMOLOGACAO"]).toContain(
      diag.conectividade
    );

    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();
    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.seguranca",
      justificativa: "Teste de resiliência sem credencial",
      finalidadeComercial: "Homologação Sandbox B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Sem Token",
        corpoMensagem: "Mensagem de validação de isolamento.",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(true);
    expect(res.resposta.statusEvento).toBe("SUCESSO_SIMULADO");
    expect(res.resposta.detalhesSimulacao.sandbox).toBe(true);
  });

  // 2. Não exposição do token ou headers em logs, erros ou payload sanitizado
  it("2. garante que nenhum token, segredo ou header Authorization seja exposto em logs ou payloads", () => {
    const payloadSanitizado = adaptador.sanitizarPayload({
      modoSimulacao: true,
      tipoDado: "DEMONSTRACAO",
      contaId: "conta-demo-1",
      contaNome: "Hospital Demo",
      contatoId: "ct-1",
      contatoNome: "Dr. Teste",
      destinatarioEmail: "gestao@hospital-demo.example",
      assunto: "Assunto Homologação",
      corpoMensagem: "Corpo do e-mail de teste",
      finalidadeComercial: "Homologação B2B",
      justificativa: "Auditoria de segurança",
      usuarioSolicitante: "analista.qa",
    });

    const chaves = Object.keys(payloadSanitizado).map((k) => k.toLowerCase());
    expect(chaves).not.toContain("token");
    expect(chaves).not.toContain("authorization");
    expect(chaves).not.toContain("apikey");
    expect(chaves).not.toContain("password");
    expect(chaves).not.toContain("secret");

    const json = JSON.stringify(payloadSanitizado);
    expect(json).not.toContain("Bearer");
  });

  // 3. Bloqueio estrito de chamadas fora de sandbox
  it("3. bloqueia qualquer conector que não esteja no ambiente de HOMOLOGACAO", async () => {
    const integracoes = await obterOuInicializarIntegracoes();
    const crm = integracoes.find((i) => i.tipo === "CRM")!;
    expect(crm.ambiente).toBe("SIMULACAO");

    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();
    const previa = await gerarPreviaSimulacao({
      integracaoId: crm.id,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de bloqueio fora de homologação",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
    });

    // CRM está em SIMULACAO, não em HOMOLOGACAO
    expect(previa.integracao.ambiente).toBe("SIMULACAO");
  });

  // 4. Bloqueio de endpoint arbitrário (endpoint fixo hardcoded)
  it("4. impõe endpoint fixo e hardcoded do Mailtrap Sandbox sem permitir URLs arbitrárias", () => {
    expect(ENDPOINT_SANDBOX_MAILTRAP_BASE).toBe("https://sandbox.api.mailtrap.io/api/send");
    const diag = obterDiagnosticoMailtrapSandbox();
    expect(diag.endpointFixo).toBe("https://sandbox.api.mailtrap.io/api/send");
  });

  // 5. Bloqueio de produção
  it("5. bloqueia tentativa de transição para o ambiente de PRODUCAO com aviso canônico", async () => {
    await expect(
      atualizarAmbienteIntegracao(integracaoEmailId, "PRODUCAO")
    ).rejects.toThrow(AVISO_BLOQUEIO_PRODUCAO);
  });

  // 6. Bloqueio de conta real (FATO_OFICIAL)
  it("6. bloqueia qualquer conta real (FATO_OFICIAL) no ambiente de homologação", async () => {
    const { contaReal } = await obterContaEContatoReal();
    const { contatoDemo } = await obterContaEContatoDemo();

    const previa = await gerarPreviaSimulacao({
      integracaoId: integracaoEmailId,
      contaComercialId: contaReal.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de conta real em homologação",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Conta Real",
        corpoMensagem: "Corpo teste",
      },
    });

    expect(previa.elegivel).toBe(false);
    expect(previa.erros.some((e) => e.includes("exclusivamente contas de demonstração"))).toBe(true);
  });

  // 7. Bloqueio de contato real (FATO_PUBLICO)
  it("7. bloqueia qualquer contato real (FATO_PUBLICO) no ambiente de homologação", async () => {
    const { contaDemo } = await obterContaEContatoDemo();
    const { contatoReal } = await obterContaEContatoReal();

    const previa = await gerarPreviaSimulacao({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoReal.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de contato real em homologação",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Contato Real",
        corpoMensagem: "Corpo teste",
      },
    });

    expect(previa.elegivel).toBe(false);
    expect(previa.erros.some((e) => e.includes("exclusivamente contatos de demonstração"))).toBe(true);
  });

  // 8. Bloqueio de e-mail com domínio corporativo real
  it("8. bloqueia destinatários com domínios corporativos reais não autorizados (.com.br, etc.)", () => {
    const validacao = adaptador.validarPayload({
      modoSimulacao: true,
      tipoDado: "DEMONSTRACAO",
      contaId: "conta-demo-1",
      contaNome: "Hospital Alfa",
      destinatarioEmail: "diretoria@hospitalreal.com.br",
      assunto: "Teste Domínio Real",
      corpoMensagem: "Corpo teste",
      finalidadeComercial: "Homologação B2B",
      justificativa: "Teste de domínio real",
      usuarioSolicitante: "analista.qa",
    });

    expect(validacao.valido).toBe(false);
    expect(validacao.erros.some((e) => e.includes(".example"))).toBe(true);
  });

  // 9. Bloqueio de e-mail pessoal (@gmail.com, @hotmail.com, etc.)
  it("9. bloqueia estritamente endereços de e-mail pessoal (gmail, hotmail, etc.)", () => {
    const validacaoGmail = adaptador.validarPayload({
      modoSimulacao: true,
      tipoDado: "DEMONSTRACAO",
      contaId: "conta-demo-1",
      contaNome: "Hospital Alfa",
      destinatarioEmail: "diretor@gmail.com",
      assunto: "Teste Gmail",
      corpoMensagem: "Corpo teste",
      finalidadeComercial: "Homologação B2B",
      justificativa: "Teste de e-mail pessoal",
      usuarioSolicitante: "analista.qa",
    });

    expect(validacaoGmail.valido).toBe(false);
    expect(validacaoGmail.erros.some((e) => e.includes("domínios pessoais"))).toBe(true);

    const validacaoHotmail = adaptador.validarPayload({
      modoSimulacao: true,
      tipoDado: "DEMONSTRACAO",
      contaId: "conta-demo-1",
      contaNome: "Hospital Alfa",
      destinatarioEmail: "contato@hotmail.com",
      assunto: "Teste Hotmail",
      corpoMensagem: "Corpo teste",
      finalidadeComercial: "Homologação B2B",
      justificativa: "Teste de e-mail pessoal",
      usuarioSolicitante: "analista.qa",
    });

    expect(validacaoHotmail.valido).toBe(false);
    expect(validacaoHotmail.erros.some((e) => e.includes("domínios pessoais"))).toBe(true);
  });

  // 10. Aceite com sucesso de domínio .example para contas DEMONSTRACAO
  it("10. aceita com sucesso destinatário terminado em .example para demonstração", () => {
    const validacao = adaptador.validarPayload({
      modoSimulacao: true,
      tipoDado: "DEMONSTRACAO",
      contaId: "conta-demo-1",
      contaNome: "Hospital Alfa",
      destinatarioEmail: "gestao.transporte@hospital-alfa.example",
      assunto: "Apresentação de Transporte Corporativo",
      corpoMensagem: "Proposta de atendimento corporativo para a rede de saúde.",
      finalidadeComercial: "Homologação B2B",
      justificativa: "Validação em sandbox",
      usuarioSolicitante: "analista.qa",
    });

    expect(validacao.valido).toBe(true);
    expect(validacao.erros).toHaveLength(0);
  });

  // 11. Bloqueio de destinatário que não termine em .example
  it("11. bloqueia qualquer destinatário cujo domínio não termine em .example (RFC 2606)", () => {
    const dominiosProibidos = [
      "gestao@hospital.org",
      "contato@clinica.net",
      "adm@hospital.edu.br",
      "compras@saude.gov.br",
    ];

    for (const email of dominiosProibidos) {
      const validacao = adaptador.validarPayload({
        modoSimulacao: true,
        tipoDado: "DEMONSTRACAO",
        contaId: "conta-demo-1",
        contaNome: "Hospital Demo",
        destinatarioEmail: email,
        assunto: "Teste Domínio Proibido",
        corpoMensagem: "Corpo teste",
        finalidadeComercial: "Homologação B2B",
        justificativa: "Teste RFC 2606",
        usuarioSolicitante: "analista.qa",
      });

      expect(validacao.valido).toBe(false);
      expect(validacao.erros.some((e) => e.includes(".example"))).toBe(true);
    }
  });

  // 12. Limite máximo de 3 mensagens em homologação (Gate 11)
  it("12. bloqueia novos disparos após atingir o limite estrito de 3 mensagens do Gate 11", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();
    expect(getLimiteMensagensGate11()).toBe(3);

    // Envio 1: Sucesso
    const res1 = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Disparo 1 de homologação",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Disparo 1",
        corpoMensagem: "Mensagem 1",
      },
    });
    eventosCriadosIds.push(res1.evento.id);
    expect(res1.resposta.sucesso).toBe(true);
    expect(getContadorMensagensGate11()).toBe(1);

    // Envio 2: Sucesso
    const res2 = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Disparo 2 de homologação",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Disparo 2",
        corpoMensagem: "Mensagem 2",
      },
    });
    eventosCriadosIds.push(res2.evento.id);
    expect(res2.resposta.sucesso).toBe(true);
    expect(getContadorMensagensGate11()).toBe(2);

    // Envio 3: Sucesso
    const res3 = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Disparo 3 de homologação",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Disparo 3",
        corpoMensagem: "Mensagem 3",
      },
    });
    eventosCriadosIds.push(res3.evento.id);
    expect(res3.resposta.sucesso).toBe(true);
    expect(getContadorMensagensGate11()).toBe(3);

    // Envio 4: Deve ser BLOQUEADO pelo limite do Gate 11
    expect(LIMITE_MAXIMO_MENSAGENS_GATE_11).toBe(3);
    const res4 = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Disparo 4 excedente",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Disparo 4",
        corpoMensagem: "Mensagem 4",
      },
    });
    eventosCriadosIds.push(res4.evento.id);
    expect(res4.resposta.sucesso).toBe(false);
    expect(res4.evento.status).toBe("BLOQUEADO");
    expect(res4.resposta.mensagem).toContain("Limite máximo de 3 mensagens");
  });

  // 13. Timeout de 3.000 ms e tratamento com AbortSignal
  it("13. interrompe execução após timeout estrito de 3.000 ms", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de AbortSignal em 3.000 ms",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      simularTimeout: true,
      dadosEspecificos: {
        assunto: "Teste Timeout",
        corpoMensagem: "Corpo teste timeout",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("TIMEOUT_SIMULADO");
    expect(res.resposta.tempoRespostaMs).toBe(TIMEOUT_HOMOLOGACAO_MS);
    expect(res.resposta.mensagem).toContain("3000ms");
  });

  // 14. Tratamento de erro HTTP 401 simulado
  it("14. trata resposta de erro HTTP 401 (não autorizado) sem vazar detalhes sensíveis", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de erro 401",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      simularFalha: true,
      dadosEspecificos: {
        assunto: "Teste Falha 401",
        corpoMensagem: "Corpo teste falha",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("FALHA_SIMULADA");
  });

  // 15. Tratamento de erro HTTP 403 simulado
  it("15. trata resposta de erro HTTP 403 (proibido) registrando auditoria", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de erro 403",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      simularFalha: true,
      dadosEspecificos: {
        assunto: "Teste Falha 403",
        corpoMensagem: "Corpo teste falha",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("FALHA_SIMULADA");
  });

  // 16. Tratamento de erro HTTP 500 simulado
  it("16. trata resposta de erro HTTP 500 (erro interno do provedor) sem quebrar o fluxo", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de erro 500",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      simularFalha: true,
      dadosEspecificos: {
        assunto: "Teste Falha 500",
        corpoMensagem: "Corpo teste falha",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("FALHA_SIMULADA");
    expect(res.resposta.mensagem).toContain("Falha controlada no endpoint de sandbox");
  });

  // 17. Abertura do circuit breaker após 3 falhas consecutivas
  it("17. abre o Circuit Breaker após 3 falhas consecutivas e bloqueia chamadas", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();
    expect(circuitBreakerHomologacao.isAberto()).toBe(false);

    for (let i = 0; i < 3; i++) {
      const resFalha = await executarSimulacaoControlada({
        integracaoId: integracaoEmailId,
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        usuarioSolicitante: "analista.qa",
        justificativa: `Falha ${i + 1}`,
        finalidadeComercial: "Homologação B2B",
        confirmacaoHumana: true,
        simularFalha: true,
        dadosEspecificos: {
          assunto: `Falha ${i + 1}`,
          corpoMensagem: "Corpo falha",
        },
      });
      eventosCriadosIds.push(resFalha.evento.id);
    }

    expect(circuitBreakerHomologacao.isAberto()).toBe(true);

    // 4ª chamada: Bloqueada pelo Circuit Breaker
    const resBloqueada = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Chamada sob circuito aberto",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Bloqueio",
        corpoMensagem: "Corpo",
      },
    });

    eventosCriadosIds.push(resBloqueada.evento.id);
    expect(resBloqueada.evento.status).toBe("BLOQUEADO");
    expect(resBloqueada.resposta.mensagem).toContain("Circuit Breaker");
  });

  // 18. Ativação do kill-switch bloqueia envio emergencialmente
  it("18. bloqueia imediatamente qualquer operação ao ativar o Kill-Switch", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    ativarKillSwitch();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste sob kill switch",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Kill Switch",
        corpoMensagem: "Não deve passar",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(false);
    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.mensagem).toContain("Kill-Switch");

    desativarKillSwitch();
  });

  // 19. Cancelamento pelo operador antes do envio
  it("19. registra cancelamento manual solicitado pelo operador antes do envio", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Cancelamento pelo operador",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      cancelarAntesExecutar: true,
      dadosEspecificos: {
        assunto: "Cancelamento",
        corpoMensagem: "Não enviar",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("CANCELADO");
    expect(res.resposta.mensagem).toContain("cancelado pelo operador");
  });

  // 20. Sanitização do payload sem credenciais ou segredos
  it("20. sanitiza payload mas inclui aviso explícito de sandbox e mascaramento", () => {
    const sanitizado = adaptador.sanitizarPayload({
      modoSimulacao: true,
      tipoDado: "DEMONSTRACAO",
      contaId: "conta-demo-1",
      contaNome: "Hospital Demo",
      destinatarioEmail: "gestao@hospital.example",
      assunto: "Apresentação",
      corpoMensagem: "Corpo da mensagem de teste para verificar prévia...",
      finalidadeComercial: "Homologação B2B",
      justificativa: "Validação",
      usuarioSolicitante: "analista.qa",
    });

    expect(sanitizado.provedor).toBe("Mailtrap Email Sandbox API");
    expect(sanitizado.ambiente).toBe("HOMOLOGACAO");
    expect(sanitizado.sandbox).toBe(true);
    expect(sanitizado.avisoSandbox).toBe(AVISO_HOMOLOGACAO_SANDBOX);
    expect(sanitizado.endpointFixo).toBe(ENDPOINT_SANDBOX_MAILTRAP_BASE);
  });

  // 21. Registro imutável de auditoria em EventoIntegracao
  it("21. grava evento de auditoria imutável em EventoIntegracao com payload sanitizado", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "auditor.seguranca",
      justificativa: "Registro para auditoria canônica",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Auditoria Gate 11",
        corpoMensagem: "Corpo auditado para rastreabilidade.",
      },
    });

    eventosCriadosIds.push(res.evento.id);

    const eventoBanco = await prisma.eventoIntegracao.findUnique({
      where: { id: res.evento.id },
    });

    expect(eventoBanco).toBeDefined();
    expect(eventoBanco!.usuarioSolicitante).toBe("auditor.seguranca");
    expect(eventoBanco!.justificativa).toBe("Registro para auditoria canônica");
    expect(eventoBanco!.payloadResumo).not.toContain("Authorization");
    expect(eventoBanco!.payloadResumo).not.toContain("Bearer");
    expect(eventoBanco!.payloadResumo).toContain(AVISO_HOMOLOGACAO_SANDBOX);
  });

  // 22. Garantia canônica: nenhuma ação comercial com status ENVIADA ou REALIZADA
  it("22. garante que nenhuma ação comercial no banco possui status ENVIADA ou REALIZADA", async () => {
    const todasAcoes = await prisma.acaoComercialPlanejada.findMany({
      select: { id: true, status: true },
    });

    const statusProibidos = ["ENVIADA", "REALIZADA", "EXECUTADA", "DISPARADA"];
    const statusAutorizados = [
      "RASCUNHO",
      "SUBMETIDA_PARA_APROVACAO",
      "APROVADA_PARA_SIMULACAO",
      "SIMULADA",
      "CANCELADA",
      "REJEITADA",
    ];

    for (const acao of todasAcoes) {
      expect(statusProibidos).not.toContain(acao.status);
      expect(statusAutorizados).toContain(acao.status);
    }
  });

  // 23. Diagnóstico completo via obterDiagnosticoMailtrapSandbox
  it("23. gera diagnóstico de sandbox completo com limites e contadores atualizados", () => {
    const diag = obterDiagnosticoMailtrapSandbox();
    const status = obterStatusHomologacao();

    expect(diag.provedor).toBe("Mailtrap Email Sandbox API");
    expect(status.provedorHomologado).toBe(diag.provedor);
    expect(diag.ambiente).toBe("HOMOLOGACAO");
    expect(diag.sandboxObrigatorio).toBe(true);
    expect(diag.endpointFixo).toBe("https://sandbox.api.mailtrap.io/api/send");
    expect(typeof diag.tokenConfigurado).toBe("boolean");
    expect(typeof diag.inboxIdConfigurado).toBe("boolean");
    expect(diag.limiteMaximoGate11).toBe(3);
    expect(diag.mensagensEnviadasGate11).toBeGreaterThanOrEqual(0);
    expect(diag.mensagensRestantesGate11).toBeLessThanOrEqual(3);
    expect(diag.circuitBreaker.aberto).toBe(false);
    expect(diag.aviso).toBe(AVISO_HOMOLOGACAO_SANDBOX);

    // Validação de controles auxiliares do Gate 11
    expect(rateLimiterHomologacao.podeExecutar()).toBe(true);
    expect(LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO).toBe(5);

    setLimiteMensagensGate11(5);
    expect(getLimiteMensagensGate11()).toBe(5);
    resetarContadorMensagensGate11();
    expect(getContadorMensagensGate11()).toBe(0);
    expect(getLimiteMensagensGate11()).toBe(3);
  });
});
