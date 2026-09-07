import type {
  AdaptadorIntegracao,
  OpcoesExecucaoSimulada,
  PayloadEmail,
  RespostaSimuladaIntegracao,
} from "../tipos";

export const AVISO_HOMOLOGACAO_SANDBOX =
  "Homologação restrita a ambiente sandbox. Nenhum destinatário real será contatado.";

export const TIMEOUT_HOMOLOGACAO_MS = 3000;
export const LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO = 5;
export const LIMIAR_FALHAS_CIRCUIT_BREAKER = 3;
export const LIMITE_MAXIMO_MENSAGENS_GATE_11 = 3;
export const ENDPOINT_SANDBOX_MAILTRAP_BASE = "https://sandbox.api.mailtrap.io/api/send";

let contadorMensagensGate11 = 0;
let limiteMensagensGate11 = LIMITE_MAXIMO_MENSAGENS_GATE_11;

export function getContadorMensagensGate11(): number {
  return contadorMensagensGate11;
}

export function getLimiteMensagensGate11(): number {
  return limiteMensagensGate11;
}

export function setLimiteMensagensGate11(limite: number): void {
  limiteMensagensGate11 = limite;
}

export function incrementarContadorMensagensGate11(): void {
  contadorMensagensGate11++;
}

export function resetarContadorMensagensGate11(): void {
  contadorMensagensGate11 = 0;
  limiteMensagensGate11 = LIMITE_MAXIMO_MENSAGENS_GATE_11;
}

/**
 * Disjuntor (Circuit Breaker) para proteção contra falhas em cascata em homologação.
 */
export class CircuitBreakerHomologacao {
  private falhasConsecutivas = 0;
  private readonly limiarFalhas: number;
  private abertoAte: number | null = null;
  private readonly tempoEsfriamentoPadraoMs: number;

  constructor(
    limiarFalhas = LIMIAR_FALHAS_CIRCUIT_BREAKER,
    tempoEsfriamentoMs = 300_000 // 5 minutos
  ) {
    this.limiarFalhas = limiarFalhas;
    this.tempoEsfriamentoPadraoMs = tempoEsfriamentoMs;
  }

  registrarSucesso(): void {
    this.falhasConsecutivas = 0;
    this.abertoAte = null;
  }

  registrarFalha(tempoOverrideMs?: number): void {
    this.falhasConsecutivas++;
    if (this.falhasConsecutivas >= this.limiarFalhas) {
      const esfriamento = tempoOverrideMs ?? this.tempoEsfriamentoPadraoMs;
      this.abertoAte = Date.now() + esfriamento;
    }
  }

  isAberto(): boolean {
    if (this.abertoAte === null) return false;
    if (Date.now() >= this.abertoAte) {
      // Meio-aberto: permite nova tentativa
      this.abertoAte = null;
      this.falhasConsecutivas = 0;
      return false;
    }
    return true;
  }

  getFalhasConsecutivas(): number {
    return this.falhasConsecutivas;
  }

  getTempoRestanteAbertoMs(): number {
    if (!this.abertoAte) return 0;
    return Math.max(0, this.abertoAte - Date.now());
  }

  resetar(): void {
    this.falhasConsecutivas = 0;
    this.abertoAte = null;
  }
}

/**
 * Limitador de taxa (Rate Limiter) em janela deslizante de 60 segundos.
 */
export class RateLimiterHomologacao {
  private requisicoes: number[] = [];
  private readonly limitePorMinuto: number;
  private readonly janelaMs = 60_000;

  constructor(limite = LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO) {
    this.limitePorMinuto = limite;
  }

  podeExecutar(): boolean {
    const agora = Date.now();
    this.requisicoes = this.requisicoes.filter((t) => agora - t < this.janelaMs);
    return this.requisicoes.length < this.limitePorMinuto;
  }

  registrarRequisicao(): void {
    this.requisicoes.push(Date.now());
  }

  getRequisicoesAtuais(): number {
    const agora = Date.now();
    this.requisicoes = this.requisicoes.filter((t) => agora - t < this.janelaMs);
    return this.requisicoes.length;
  }

  resetar(): void {
    this.requisicoes = [];
  }
}

let killSwitchManual = false;

export function ativarKillSwitch(): void {
  killSwitchManual = true;
}

export function desativarKillSwitch(): void {
  killSwitchManual = false;
}

export function isKillSwitchAtivo(): boolean {
  return killSwitchManual || process.env.INTEGRACOES_KILL_SWITCH === "true";
}

// Instâncias globais de controle para o conector homologado
export const circuitBreakerHomologacao = new CircuitBreakerHomologacao();
export const rateLimiterHomologacao = new RateLimiterHomologacao();

export function resetarEstadoHomologacao(): void {
  circuitBreakerHomologacao.resetar();
  rateLimiterHomologacao.resetar();
  desativarKillSwitch();
  resetarContadorMensagensGate11();
}

export interface DiagnosticoMailtrapSandbox {
  provedor: string;
  ambiente: string;
  sandboxObrigatorio: boolean;
  endpointFixo: string;
  tokenConfigurado: boolean;
  inboxIdConfigurado: boolean;
  inboxIdMascarado: string | null;
  conectividade: "CONECTADO_SANDBOX" | "MOCK_LOCAL_HOMOLOGACAO";
  mensagensEnviadasGate11: number;
  limiteMaximoGate11: number;
  mensagensRestantesGate11: number;
  circuitBreaker: {
    aberto: boolean;
    falhasConsecutivas: number;
    tempoRestanteMs: number;
  };
  rateLimiter: {
    requisicoesUltimoMinuto: number;
    limitePorMinuto: number;
  };
  killSwitchAtivo: boolean;
  aviso: string;
}

export function carregarCredenciaisSandbox(): { token: string | null; inboxId: string | null } {
  let token = process.env.MAILTRAP_SANDBOX_API_TOKEN?.trim() || null;
  let inboxId = process.env.MAILTRAP_SANDBOX_INBOX_ID?.trim() || null;

  if ((!token || !inboxId) && typeof process !== "undefined" && typeof process.cwd === "function") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const conteudo: string = fs.readFileSync(envPath, "utf-8");
        for (const linha of conteudo.split("\n")) {
          const matchToken = linha.match(/^MAILTRAP_SANDBOX_API_TOKEN=["']?([^"'\r\n]+)["']?/);
          if (matchToken && !token) token = matchToken[1].trim();
          const matchInbox = linha.match(/^MAILTRAP_SANDBOX_INBOX_ID=["']?([^"'\r\n]+)["']?/);
          if (matchInbox && !inboxId) inboxId = matchInbox[1].trim();
        }
      }
    } catch {
      // Ignora erro se fs não estiver acessível
    }
  }

  return {
    token: token && token !== "" ? token : null,
    inboxId: inboxId && inboxId !== "" ? inboxId : null,
  };
}

export function obterDiagnosticoMailtrapSandbox(): DiagnosticoMailtrapSandbox {
  const { token, inboxId } = carregarCredenciaisSandbox();
  const tokenConfigurado = Boolean(token);
  const inboxIdConfigurado = Boolean(inboxId);
  const inboxIdMascarado = inboxIdConfigurado
    ? `${inboxId!.slice(0, 2)}***${inboxId!.slice(-2)}`
    : null;

  return {
    provedor: "Mailtrap Email Sandbox API",
    ambiente: "HOMOLOGACAO",
    sandboxObrigatorio: true,
    endpointFixo: ENDPOINT_SANDBOX_MAILTRAP_BASE,
    tokenConfigurado,
    inboxIdConfigurado,
    inboxIdMascarado,
    conectividade:
      tokenConfigurado && inboxIdConfigurado
        ? "CONECTADO_SANDBOX"
        : "MOCK_LOCAL_HOMOLOGACAO",
    mensagensEnviadasGate11: contadorMensagensGate11,
    limiteMaximoGate11: limiteMensagensGate11,
    mensagensRestantesGate11: Math.max(0, limiteMensagensGate11 - contadorMensagensGate11),
    circuitBreaker: {
      aberto: circuitBreakerHomologacao.isAberto(),
      falhasConsecutivas: circuitBreakerHomologacao.getFalhasConsecutivas(),
      tempoRestanteMs: circuitBreakerHomologacao.getTempoRestanteAbertoMs(),
    },
    rateLimiter: {
      requisicoesUltimoMinuto: rateLimiterHomologacao.getRequisicoesAtuais(),
      limitePorMinuto: LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO,
    },
    killSwitchAtivo: isKillSwitchAtivo(),
    aviso: AVISO_HOMOLOGACAO_SANDBOX,
  };
}

export const DOMINIOS_PESSOAIS_PROIBIDOS = [
  "@gmail.com",
  "@hotmail.com",
  "@yahoo.com",
  "@yahoo.com.br",
  "@outlook.com",
  "@live.com",
  "@icloud.com",
  "@bol.com.br",
  "@uol.com.br",
  "@ig.com.br",
  "@terra.com.br",
];

/**
 * Adaptador de Homologação Controlada para o provedor Mailtrap Email Sandbox API (Gate 10 e 11).
 * Opera exclusivamente no ambiente HOMOLOGACAO com contas e contatos DEMONSTRACAO e domínios .example.
 */
export class AdaptadorEmailHomologacao implements AdaptadorIntegracao<PayloadEmail> {
  readonly tipo = "EMAIL" as const;
  readonly nomeProvedor = "Mailtrap Email Sandbox API";

  validarPayload(payload: PayloadEmail): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    // 1. Isolamento estrito: Somente DEMONSTRACAO é autorizado em Homologação
    if (payload.tipoDado !== "DEMONSTRACAO") {
      erros.push(
        "O ambiente de homologação autoriza estritamente dados de DEMONSTRACAO. Registros reais são proibidos."
      );
    }

    if (!payload.contaId || payload.contaId.trim() === "") {
      erros.push("ID da conta comercial de demonstração é obrigatório.");
    }
    if (!payload.contaNome || payload.contaNome.trim() === "") {
      erros.push("Nome da conta comercial é obrigatório.");
    }
    if (!payload.finalidadeComercial || payload.finalidadeComercial.trim() === "") {
      erros.push("Finalidade comercial de homologação é obrigatória.");
    }
    if (!payload.justificativa || payload.justificativa.trim() === "") {
      erros.push("Justificativa formal do operador é obrigatória.");
    }
    if (!payload.usuarioSolicitante || payload.usuarioSolicitante.trim() === "") {
      erros.push("Usuário solicitante é obrigatório.");
    }

    // Validação estrita de e-mail e domínios autorizados para sandbox
    if (!payload.destinatarioEmail || !payload.destinatarioEmail.includes("@")) {
      erros.push("Endereço de e-mail corporativo do destinatário é obrigatório e deve ser válido.");
    } else {
      const emailLower = payload.destinatarioEmail.toLowerCase().trim();

      if (DOMINIOS_PESSOAIS_PROIBIDOS.some((dom) => emailLower.endsWith(dom))) {
        erros.push(
          "E-mails de domínios pessoais são expressamente proibidos em homologação comercial B2B."
        );
      }

      // Regra Gate 11: Destinatário deve pertencer estritamente ao domínio reservado .example (RFC 2606)
      if (!emailLower.endsWith(".example")) {
        erros.push(
          "O destinatário em ambiente de homologação deve pertencer estritamente ao domínio reservado '.example' (RFC 2606). Destinatários de domínio externo ou corporativo real são terminantemente proibidos."
        );
      }
    }

    if (!payload.assunto || payload.assunto.trim() === "") {
      erros.push("Assunto do e-mail é obrigatório.");
    }
    if (!payload.corpoMensagem || payload.corpoMensagem.trim() === "") {
      erros.push("Corpo da mensagem de e-mail é obrigatório.");
    }

    return { valido: erros.length === 0, erros };
  }

  sanitizarPayload(payload: PayloadEmail): Record<string, unknown> {
    const { inboxId } = carregarCredenciaisSandbox();
    const inboxIdMascarado = inboxId
      ? `${inboxId.slice(0, 2)}***${inboxId.slice(-2)}`
      : null;

    return {
      provedor: this.nomeProvedor,
      ambiente: "HOMOLOGACAO",
      sandbox: true,
      modoSimulacao: true,
      endpointFixo: ENDPOINT_SANDBOX_MAILTRAP_BASE,
      inboxIdMascarado,
      tipoIntegracao: this.tipo,
      conta: {
        id: payload.contaId,
        nome: payload.contaNome,
        tipoDado: payload.tipoDado,
      },
      contato: payload.contatoId
        ? {
            id: payload.contatoId,
            nome: payload.contatoNome ?? "Não informado",
            cargo: payload.cargo ?? null,
            email: payload.destinatarioEmail,
          }
        : null,
      destinatarioEmail: payload.destinatarioEmail,
      assunto: payload.assunto,
      tamanhoCorpoCaracteres: payload.corpoMensagem.length,
      previaMensagem:
        payload.corpoMensagem.slice(0, 150) +
        (payload.corpoMensagem.length > 150 ? "..." : ""),
      finalidadeComercial: payload.finalidadeComercial,
      justificativa: payload.justificativa,
      usuarioSolicitante: payload.usuarioSolicitante,
      avisoSandbox: AVISO_HOMOLOGACAO_SANDBOX,
      acaoId: payload.acaoId ?? null,
    };
  }

  async executarSimulacao(
    payload: PayloadEmail,
    opcoes?: OpcoesExecucaoSimulada
  ): Promise<RespostaSimuladaIntegracao> {
    const inicio = Date.now();

    // 1. Verificação de Kill-Switch de Segurança
    if (isKillSwitchAtivo()) {
      return {
        sucesso: false,
        transacaoId: `HOM-KILL-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem:
          "Execução bloqueada pelo Kill-Switch de segurança de integrações (INTEGRACOES_KILL_SWITCH ativo).",
        detalhesSimulacao: {
          bloqueioSeguranca: true,
          killSwitchAtivo: true,
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: Date.now() - inicio,
      };
    }

    // 2. Verificação do Circuit Breaker
    if (circuitBreakerHomologacao.isAberto()) {
      return {
        sucesso: false,
        transacaoId: `HOM-CB-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Conexão bloqueada pelo Circuit Breaker após ${circuitBreakerHomologacao.getFalhasConsecutivas()} falhas consecutivas. Circuito aberto para proteção.`,
        detalhesSimulacao: {
          circuitBreakerAberto: true,
          tempoRestanteMs: circuitBreakerHomologacao.getTempoRestanteAbertoMs(),
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: Date.now() - inicio,
      };
    }

    // 3. Verificação de Limite de Mensagens do Gate 11 (Máximo 3 disparos)
    if (contadorMensagensGate11 >= limiteMensagensGate11) {
      return {
        sucesso: false,
        transacaoId: `HOM-LIMITE-MSG-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Limite máximo de ${limiteMensagensGate11} mensagens para homologação do Gate 11 atingido. Novos disparos bloqueados por segurança.`,
        detalhesSimulacao: {
          limiteMensagensExcedido: true,
          totalEnviadas: contadorMensagensGate11,
          limite: limiteMensagensGate11,
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: Date.now() - inicio,
      };
    }

    // 4. Verificação do Rate Limiting (Máximo 5 requisições por minuto)
    if (!rateLimiterHomologacao.podeExecutar()) {
      return {
        sucesso: false,
        transacaoId: `HOM-RATELIMIT-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Limite de taxa de homologação excedido. O limite permitido é de ${LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO} requisições por minuto.`,
        detalhesSimulacao: {
          rateLimitExcedido: true,
          requisicoesNoMinuto: rateLimiterHomologacao.getRequisicoesAtuais(),
          limite: LIMITE_TAXA_HOMOLOGACAO_POR_MINUTO,
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: Date.now() - inicio,
      };
    }

    // Registrar requisição no Rate Limiter
    rateLimiterHomologacao.registrarRequisicao();

    // 5. Validação de Payload
    const validacao = this.validarPayload(payload);
    if (!validacao.valido) {
      circuitBreakerHomologacao.registrarFalha();
      return {
        sucesso: false,
        transacaoId: `HOM-VAL-ERR-${Date.now()}`,
        statusEvento: "BLOQUEADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Homologação bloqueada por payload inválido: ${validacao.erros.join("; ")}`,
        detalhesSimulacao: { erros: validacao.erros, aviso: AVISO_HOMOLOGACAO_SANDBOX },
        chamadaExternaRealizada: false,
        tempoRespostaMs: Date.now() - inicio,
      };
    }

    const transacaoId = `HOM-MLT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // 6. Cancelamento Solicitado pelo Operador
    if (opcoes?.cancelarAntesExecutar) {
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "CANCELADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem:
          "Envio de e-mail em homologação cancelado pelo operador antes do disparo ao sandbox.",
        detalhesSimulacao: {
          canceladoPor: payload.usuarioSolicitante,
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: Date.now() - inicio,
      };
    }

    // 7. Simulação de Timeout de Rede (3 segundos)
    if (opcoes?.simularTimeout) {
      circuitBreakerHomologacao.registrarFalha();
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "TIMEOUT_SIMULADO",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem: `Timeout de homologação atingido (${TIMEOUT_HOMOLOGACAO_MS}ms). O sandbox não respondeu dentro da janela limite.`,
        detalhesSimulacao: {
          timeoutMs: TIMEOUT_HOMOLOGACAO_MS,
          falhasConsecutivas: circuitBreakerHomologacao.getFalhasConsecutivas(),
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: TIMEOUT_HOMOLOGACAO_MS,
      };
    }

    // 8. Simulação de Falha de Provedor
    if (opcoes?.simularFalha) {
      circuitBreakerHomologacao.registrarFalha();
      return {
        sucesso: false,
        transacaoId,
        statusEvento: "FALHA_SIMULADA",
        tipoIntegracao: this.tipo,
        ambiente: "HOMOLOGACAO",
        timestamp: new Date().toISOString(),
        mensagem:
          "Falha controlada no endpoint de sandbox do Mailtrap (código HTTP 500 simulado).",
        detalhesSimulacao: {
          codigoHttpSimulado: 500,
          falhasConsecutivas: circuitBreakerHomologacao.getFalhasConsecutivas(),
          aviso: AVISO_HOMOLOGACAO_SANDBOX,
        },
        chamadaExternaRealizada: false,
        tempoRespostaMs: 40,
      };
    }

    // 9. Execução: Verificação de Credencial Real vs Mock Local de Homologação
    const { token: apiKeyReal, inboxId: inboxIdReal } = carregarCredenciaisSandbox();
    const autorizacaoAtiva = opcoes?.autorizacaoSandboxReal === true;
    const ambienteTeste =
      process.env.VITEST !== undefined || process.env.NODE_ENV === "test";

    if (apiKeyReal && inboxIdReal && autorizacaoAtiva && !ambienteTeste) {
      // Se houver chave e inbox configurados, com autorização explícita e fora de ambiente de teste
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_HOMOLOGACAO_MS);

        const response = await fetch(
          `${ENDPOINT_SANDBOX_MAILTRAP_BASE}/${encodeURIComponent(inboxIdReal)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKeyReal}`,
              "Api-Token": apiKeyReal,
            },
            body: JSON.stringify({
              to: [{ email: payload.destinatarioEmail, name: payload.contatoNome ?? undefined }],
              from: { email: "homologacao@sandbox.chame.com.br", name: "Chame Inteligência (Sandbox)" },
              subject: `[HOMOLOGAÇÃO GATE 11] ${payload.assunto}`,
              text: payload.corpoMensagem,
              category: "Homologação Gate 11",
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          circuitBreakerHomologacao.registrarFalha();
          const corpoErro = await response.text().catch(() => "");
          return {
            sucesso: false,
            transacaoId,
            statusEvento: "FALHA_SIMULADA",
            tipoIntegracao: this.tipo,
            ambiente: "HOMOLOGACAO",
            timestamp: new Date().toISOString(),
            mensagem: `Falha na resposta do sandbox do Mailtrap (HTTP ${response.status})${corpoErro ? `: ${corpoErro}` : ""}.`,
            detalhesSimulacao: {
              statusHttp: response.status,
              falhasConsecutivas: circuitBreakerHomologacao.getFalhasConsecutivas(),
              aviso: AVISO_HOMOLOGACAO_SANDBOX,
            },
            chamadaExternaRealizada: false,
            tempoRespostaMs: Date.now() - inicio,
          };
        }

        const data = (await response.json()) as { message_ids?: string[] };
        circuitBreakerHomologacao.registrarSucesso();
        incrementarContadorMensagensGate11();

        return {
          sucesso: true,
          transacaoId,
          statusEvento: "SUCESSO_SIMULADO",
          tipoIntegracao: this.tipo,
          ambiente: "HOMOLOGACAO",
          timestamp: new Date().toISOString(),
          mensagem: `E-mail de homologação recebido com sucesso pelo sandbox do Mailtrap. ${AVISO_HOMOLOGACAO_SANDBOX}`,
          detalhesSimulacao: {
            provedor: this.nomeProvedor,
            ambiente: "HOMOLOGACAO",
            sandbox: true,
            messageIds: data.message_ids ?? [],
            inboxIdMascarado: `${inboxIdReal.slice(0, 2)}***${inboxIdReal.slice(-2)}`,
            endpointFixo: ENDPOINT_SANDBOX_MAILTRAP_BASE,
            totalEnviadasGate11: contadorMensagensGate11,
            limiteGate11: limiteMensagensGate11,
            modoExecucao: "SANDBOX_CONECTADO",
            aviso: AVISO_HOMOLOGACAO_SANDBOX,
          },
          chamadaExternaRealizada: false,
          tempoRespostaMs: Date.now() - inicio,
        };
      } catch (err: unknown) {
        circuitBreakerHomologacao.registrarFalha();
        const isTimeout = err instanceof Error && err.name === "AbortError";
        return {
          sucesso: false,
          transacaoId,
          statusEvento: isTimeout ? "TIMEOUT_SIMULADO" : "FALHA_SIMULADA",
          tipoIntegracao: this.tipo,
          ambiente: "HOMOLOGACAO",
          timestamp: new Date().toISOString(),
          mensagem: isTimeout
            ? `Timeout na conexão com o sandbox (${TIMEOUT_HOMOLOGACAO_MS}ms).`
            : "Erro de rede ao conectar com o endpoint de sandbox.",
          detalhesSimulacao: {
            erro: isTimeout ? "TIMEOUT" : "ERRO_CONEXAO",
            falhasConsecutivas: circuitBreakerHomologacao.getFalhasConsecutivas(),
            aviso: AVISO_HOMOLOGACAO_SANDBOX,
          },
          chamadaExternaRealizada: false,
          tempoRespostaMs: Date.now() - inicio,
        };
      }
    }

    // Padrão sem credencial: Mock Local de Homologação em Sandbox
    circuitBreakerHomologacao.registrarSucesso();
    incrementarContadorMensagensGate11();
    const tempoRespostaMs = opcoes?.tempoEsperaMs ?? 25;

    return {
      sucesso: true,
      transacaoId,
      statusEvento: "SUCESSO_SIMULADO",
      tipoIntegracao: this.tipo,
      ambiente: "HOMOLOGACAO",
      timestamp: new Date().toISOString(),
      mensagem: `E-mail de homologação processado com sucesso no simulador sandbox do Mailtrap. ${AVISO_HOMOLOGACAO_SANDBOX}`,
      detalhesSimulacao: {
        provedor: this.nomeProvedor,
        ambiente: "HOMOLOGACAO",
        sandbox: true,
        destinatario: payload.destinatarioEmail,
        assunto: payload.assunto,
        inboxVirtual: "Inbox de Homologação B2B (Mock)",
        messageId: `<sandbox-msg-${transacaoId}@mailtrap.io>`,
        modoExecucao: "MOCK_LOCAL_HOMOLOGACAO",
        totalEnviadasGate11: contadorMensagensGate11,
        limiteGate11: limiteMensagensGate11,
        aviso: AVISO_HOMOLOGACAO_SANDBOX,
      },
      chamadaExternaRealizada: false,
      tempoRespostaMs,
    };
  }
}
