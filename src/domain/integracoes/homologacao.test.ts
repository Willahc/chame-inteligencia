import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obterOuInicializarIntegracoes,
  gerarPreviaSimulacao,
  executarSimulacaoControlada,
  atualizarAmbienteIntegracao,
  obterStatusHomologacao,
  circuitBreakerHomologacao,
  rateLimiterHomologacao,
  ativarKillSwitch,
  desativarKillSwitch,
  resetarEstadoHomologacao,
  AVISO_HOMOLOGACAO_SANDBOX,
  TIMEOUT_HOMOLOGACAO_MS,
  LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO,
} from "./servico-integracoes";
import { AVISO_BLOQUEIO_PRODUCAO } from "./tipos";

describe("Gate 10 — Homologação Controlada de Provedor (Mailtrap Email Sandbox)", () => {
  const eventosCriadosIds: string[] = [];
  const integracoesTesteIds: string[] = [];

  let integracaoEmailHomologadaId: string;
  let integracaoCRMId: string;

  beforeAll(async () => {
    const integracoes = await obterOuInicializarIntegracoes();
    const email = integracoes.find((i) => i.tipo === "EMAIL")!;
    const crm = integracoes.find((i) => i.tipo === "CRM")!;

    expect(email).toBeDefined();
    expect(crm).toBeDefined();

    integracaoEmailHomologadaId = email.id;
    integracaoCRMId = crm.id;
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

  // 1. Exclusividade do conector de E-mail (Mailtrap Sandbox) para Homologação
  it("1. autoriza exclusivamente o conector de E-mail no ambiente de HOMOLOGACAO", async () => {
    const email = await prisma.integracaoExterna.findUnique({
      where: { id: integracaoEmailHomologadaId },
    });
    expect(email).toBeDefined();
    expect(email!.ambiente).toBe("HOMOLOGACAO");
    expect(email!.tipo).toBe("EMAIL");

    const status = obterStatusHomologacao();
    expect(status.provedorHomologado).toBe("Mailtrap Email Sandbox API");
    expect(status.canal).toBe("EMAIL");
    expect(status.ambienteAutorizado).toBe("HOMOLOGACAO");
  });

  // 2. Rejeição de homologação para CRM, WhatsApp ou Discador
  it("2. bloqueia rigorosamente a tentativa de configurar CRM, WhatsApp ou Discador em HOMOLOGACAO", async () => {
    await expect(
      atualizarAmbienteIntegracao(integracaoCRMId, "HOMOLOGACAO")
    ).rejects.toThrow(/Apenas o conector de E-mail Corporativo/);
  });

  // 3. Bloqueio absoluto do ambiente PRODUCAO
  it("3. rejeita de forma categórica qualquer tentativa de ativar PRODUCAO", async () => {
    await expect(
      atualizarAmbienteIntegracao(integracaoEmailHomologadaId, "PRODUCAO")
    ).rejects.toThrow(AVISO_BLOQUEIO_PRODUCAO);
  });

  // 4. Bloqueio estrito de contas reais (FATO_OFICIAL) em homologação
  it("4. bloqueia estritamente contas reais (FATO_OFICIAL) no ambiente de homologação", async () => {
    const { contaReal } = await obterContaEContatoReal();
    const { contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaReal.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Tentativa indevida com conta real",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Homologação",
        corpoMensagem: "Corpo do e-mail de teste.",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain("autoriza exclusivamente contas de demonstração");
  });

  // 5. Bloqueio estrito de contatos reais (FATO_PUBLICO) em homologação
  it("5. bloqueia estritamente contatos reais (FATO_PUBLICO) no ambiente de homologação", async () => {
    const { contaDemo } = await obterContaEContatoDemo();
    const { contatoReal } = await obterContaEContatoReal();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoReal.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Tentativa indevida com contato real",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Homologação",
        corpoMensagem: "Corpo do e-mail de teste.",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain("Violação de isolamento canônico");
  });

  // 6. Bloqueio de contatos inativos ou não aprovados
  it("6. bloqueia contatos inativos ou não aprovados mesmo sendo de demonstração", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const contatoInativo = await prisma.contatoProfissional.create({
      data: {
        id: `contato-demo-inativo-${Date.now()}`,
        nome: "Contato Demo Inativo",
        cargo: "Gerente",
        empresa: "Hospital Alfa Demo",
        tipoDado: "DEMONSTRACAO",
        confianca: "ALTA",
        papelComercial: "Decisor",
        tipoPapelComercial: "INFERENCIA",
        statusDecisao: "PENDENTE",
        statusRevisao: "PENDENTE",
        ativo: false,
        fonteId: contatoDemo.fonteId,
        dataEvidencia: new Date(),
        instituicaoId: contatoDemo.instituicaoId,
      },
    });

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoInativo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste contato inativo",
      finalidadeComercial: "Homologação",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste",
        corpoMensagem: "Corpo teste",
      },
    });

    eventosCriadosIds.push(res.evento.id);
    await prisma.contatoProfissional.delete({ where: { id: contatoInativo.id } });

    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
  });

  // 7. Bloqueio de e-mails pessoais e CPFs
  it("7. bloqueia e-mails com domínios pessoais e detecta CPFs proibidos", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const resEmailPessoal = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste domínio pessoal",
      finalidadeComercial: "Homologação",
      confirmacaoHumana: true,
      dadosEspecificos: {
        destinatarioEmail: "gestor.hospital@gmail.com",
        assunto: "Apresentação",
        corpoMensagem: "Texto corporativo",
      },
    });

    eventosCriadosIds.push(resEmailPessoal.evento.id);
    expect(resEmailPessoal.evento.status).toBe("BLOQUEADO");
    expect(resEmailPessoal.resposta.mensagem).toContain("Uso proibido de endereço de e-mail pessoal");

    const resCPF = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "CPF no texto 123.456.789-00",
      finalidadeComercial: "Homologação",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Apresentação",
        corpoMensagem: "Texto corporativo",
      },
    });

    eventosCriadosIds.push(resCPF.evento.id);
    expect(resCPF.evento.status).toBe("BLOQUEADO");
    expect(resCPF.resposta.mensagem).toContain("CPF proibido");
  });

  // 8. Sanitização de payload sem persistir credenciais
  it("8. sanitiza payload eliminando credenciais e senhas", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const previa = await gerarPreviaSimulacao({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Validação prévia de payload",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Apresentação de Homologação",
        corpoMensagem: "Mensagem B2B de teste.",
        tokenAcesso: "bearer-123456",
        senha: "admin",
      },
    });

    expect(previa.payloadSanitizado).toBeDefined();
    expect(previa.payloadSanitizado.tokenAcesso).toBeUndefined();
    expect(previa.payloadSanitizado.senha).toBeUndefined();
    expect(previa.payloadSanitizado.provedor).toBe("Mailtrap Email Sandbox API");
    expect(previa.payloadSanitizado.ambiente).toBe("HOMOLOGACAO");
    expect(previa.payloadSanitizado.sandbox).toBe(true);
    expect(previa.payloadSanitizado.avisoSandbox).toBe(AVISO_HOMOLOGACAO_SANDBOX);
  });

  // 9. Execução com sucesso em Mock Local de Sandbox
  it("9. executa simulação no simulador sandbox do Mailtrap com aviso explícito", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste homologação sucesso local",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Apresentação de Mobilidade Corporativa",
        corpoMensagem: "Proposta B2B para faturamento centralizado de táxi hospitalar.",
      },
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.resposta.sucesso).toBe(true);
    expect(res.resposta.statusEvento).toBe("SUCESSO_SIMULADO");
    expect(res.resposta.ambiente).toBe("HOMOLOGACAO");
    expect(res.resposta.tipoIntegracao).toBe("EMAIL");
    expect(res.resposta.transacaoId).toMatch(/^HOM-MLT-/);
    expect(res.resposta.chamadaExternaRealizada).toBe(false);
    expect(res.resposta.mensagem).toContain(AVISO_HOMOLOGACAO_SANDBOX);

    const detalhes = res.resposta.detalhesSimulacao as Record<string, unknown>;
    expect(detalhes.sandbox).toBe(true);
    expect(detalhes.modoExecucao).toBe("MOCK_LOCAL_HOMOLOGACAO");
  });

  // 10. Timeout controlado (3.000 ms)
  it("10. trata timeout simulado dentro do limite operacional de 3.000 ms", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de resiliência a timeout",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      simularTimeout: true,
      dadosEspecificos: {
        assunto: "Teste Timeout",
        corpoMensagem: "Corpo teste timeout.",
      },
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("TIMEOUT_SIMULADO");
    expect(res.resposta.tempoRespostaMs).toBe(TIMEOUT_HOMOLOGACAO_MS);
    expect(res.resposta.mensagem).toContain("Timeout de homologação atingido");
  });

  // 11. Falha de provedor simulada
  it("11. trata falha simulada de resposta do provedor de sandbox", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste de resiliência a falha de provedor",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      simularFalha: true,
      dadosEspecificos: {
        assunto: "Teste Falha",
        corpoMensagem: "Corpo teste falha.",
      },
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("FALHA_SIMULADA");
    expect(res.resposta.mensagem).toContain("Falha controlada no endpoint de sandbox");
  });

  // 12. Cancelamento pelo operador antes do envio
  it("12. registra cancelamento manual solicitado pelo operador antes do disparo", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Cancelamento voluntário pelo operador",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      cancelarAntesExecutar: true,
      dadosEspecificos: {
        assunto: "Teste Cancelamento",
        corpoMensagem: "Corpo teste cancelamento.",
      },
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.statusEvento).toBe("CANCELADO");
    expect(res.resposta.mensagem).toContain("cancelado pelo operador");
  });

  // 13. Disjuntor (Circuit Breaker): abre após 3 falhas consecutivas
  it("13. ativa o Circuit Breaker após 3 falhas consecutivas e bloqueia chamadas subsequentes", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    expect(circuitBreakerHomologacao.isAberto()).toBe(false);

    // Executa 3 falhas consecutivas
    for (let i = 0; i < 3; i++) {
      const falha = await executarSimulacaoControlada({
        integracaoId: integracaoEmailHomologadaId,
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        usuarioSolicitante: "analista.qa",
        justificativa: `Falha induzida ${i + 1}`,
        finalidadeComercial: "Homologação B2B",
        confirmacaoHumana: true,
        simularFalha: true,
        dadosEspecificos: {
          assunto: "Teste Circuit Breaker",
          corpoMensagem: "Teste falha",
        },
      });
      eventosCriadosIds.push(falha.evento.id);
    }

    expect(circuitBreakerHomologacao.isAberto()).toBe(true);
    expect(circuitBreakerHomologacao.getFalhasConsecutivas()).toBe(3);

    // 4ª chamada deve ser BLOQUEADA pelo Circuit Breaker imediatamente
    const resBloqueada = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Chamada durante circuito aberto",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Chamada Bloqueada",
        corpoMensagem: "Não deve passar.",
      },
    });

    eventosCriadosIds.push(resBloqueada.evento.id);
    expect(resBloqueada.evento.status).toBe("BLOQUEADO");
    expect(resBloqueada.resposta.mensagem).toContain("Circuit Breaker");

    // Reset do disjuntor reestabelece a operação
    circuitBreakerHomologacao.resetar();
    expect(circuitBreakerHomologacao.isAberto()).toBe(false);
  });

  // 14. Rate Limiting: bloqueia requisições acima de 5 por minuto
  it("14. bloqueia execuções que excedam o limite de 5 requisições por minuto", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    rateLimiterHomologacao.resetar();

    // Executa 5 requisições permitidas
    for (let i = 0; i < LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO; i++) {
      const res = await executarSimulacaoControlada({
        integracaoId: integracaoEmailHomologadaId,
        contaComercialId: contaDemo.id,
        contatoProfissionalId: contatoDemo.id,
        usuarioSolicitante: "analista.qa",
        justificativa: `Chamada de taxa ${i + 1}`,
        finalidadeComercial: "Homologação B2B",
        confirmacaoHumana: true,
        dadosEspecificos: {
          assunto: `Teste Taxa ${i + 1}`,
          corpoMensagem: "Corpo teste taxa",
        },
      });
      eventosCriadosIds.push(res.evento.id);
      expect(res.resposta.sucesso).toBe(true);
    }

    // A 6ª requisição no mesmo minuto deve ser bloqueada
    const resExcedida = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Tentativa acima do rate limit",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Taxa Excedida",
        corpoMensagem: "Corpo teste",
      },
    });

    eventosCriadosIds.push(resExcedida.evento.id);
    expect(resExcedida.evento.status).toBe("BLOQUEADO");
    expect(resExcedida.resposta.mensagem).toContain("Limite de taxa de homologação excedido");
  });

  // 15. Kill-Switch de Emergência
  it("15. aciona imediatamente o Kill-Switch de emergência impedindo qualquer execução", async () => {
    const { contaDemo, contatoDemo } = await obterContaEContatoDemo();

    ativarKillSwitch();

    const res = await executarSimulacaoControlada({
      integracaoId: integracaoEmailHomologadaId,
      contaComercialId: contaDemo.id,
      contatoProfissionalId: contatoDemo.id,
      usuarioSolicitante: "analista.qa",
      justificativa: "Teste com kill switch ativado",
      finalidadeComercial: "Homologação B2B",
      confirmacaoHumana: true,
      dadosEspecificos: {
        assunto: "Teste Kill Switch",
        corpoMensagem: "Não deve passar.",
      },
    });

    eventosCriadosIds.push(res.evento.id);

    expect(res.evento.status).toBe("BLOQUEADO");
    expect(res.resposta.sucesso).toBe(false);
    expect(res.resposta.mensagem).toContain("Kill-Switch");

    desativarKillSwitch();
  });

  // 16. Imutabilidade e integridade: nenhum status ENVIADA ou REALIZADA
  it("16. garante que nenhum registro recebe status ENVIADA ou REALIZADA", async () => {
    // Todos os eventos gravados possuem status restrito a simulacao/bloqueio/cancelamento
    const eventos = await prisma.eventoIntegracao.findMany({
      select: { status: true },
    });
    for (const ev of eventos) {
      expect([
        "SIMULADO",
        "SUCESSO_SIMULADO",
        "FALHA_SIMULADA",
        "TIMEOUT_SIMULADO",
        "BLOQUEADO",
        "CANCELADO",
      ]).toContain(ev.status);
    }

    // Ações comerciais planejadas nunca podem ter status de envio ou realização
    const acoes = await prisma.acaoComercialPlanejada.findMany({
      select: { status: true },
    });
    for (const a of acoes) {
      expect(a.status).not.toBe("ENVIADA");
      expect(a.status).not.toBe("REALIZADA");
    }
  });
});
