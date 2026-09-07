import type { CanalAcaoComercial, ValidacaoElegibilidadeResultado } from "./tipos";

const REGEX_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const PROVEDORES_EMAIL_PESSOAL = [
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

export interface ParametrosValidacaoElegibilidade {
  conta: {
    id: string;
    nome: string;
    tipoDado: string;
    situacaoCadastral?: string | null;
    grupoEconomicoId?: string | null;
    instituicoes?: Array<{ id: string }>;
  };
  contato?: {
    id: string;
    nome: string;
    tipoDado: string;
    ativo: boolean;
    statusDecisao: string;
    fonteId: string;
    fonte?: { nome: string; url?: string | null } | null;
    dataEvidencia?: Date | string | null;
    grupoEconomicoId?: string | null;
    instituicaoId?: string | null;
    tipoPapelComercial: string;
    papelComercial?: string | null;
    emailCorporativo?: string | null;
    telefoneProfissional?: string | null;
    telefoneDepartamental?: string | null;
    ramal?: string | null;
    linkedinUrl?: string | null;
    paginaProfissionalUrl?: string | null;
  } | null;
  canal: CanalAcaoComercial;
  mensagemRascunho?: string;
}

export function validarElegibilidadeAcao(
  params: ParametrosValidacaoElegibilidade
): ValidacaoElegibilidadeResultado {
  const erros: string[] = [];
  const avisos: string[] = [];
  const { conta, contato, canal, mensagemRascunho } = params;

  // 1. Validação da Conta Comercial
  if (!conta || !conta.id) {
    erros.push("Conta comercial obrigatória não identificada.");
  } else {
    if (conta.situacaoCadastral === "08" || conta.situacaoCadastral === "01") {
      erros.push("A conta comercial possui situação cadastral baixada ou nula e está inativa.");
    }
  }

  // 2. Validação do Contato Profissional (se vinculado)
  if (contato) {
    // Ativação e status de decisão
    if (!contato.ativo) {
      erros.push("O contato selecionado está desativado.");
    }

    if (contato.statusDecisao !== "APROVADO") {
      erros.push(
        `O contato está no status '${contato.statusDecisao}' e não pode ser utilizado. Exige aprovação prévia da revisão humana.`
      );
    }

    // Fonte pública verificável
    if (!contato.fonteId || contato.fonteId.trim() === "") {
      erros.push("O contato não possui fonte pública verificável vinculada.");
    }

    // Evidência temporal
    if (!contato.dataEvidencia) {
      erros.push("O contato não possui data de evidência documental.");
    }

    // Vínculo à organização / conta
    const pertenceGrupo =
      conta.grupoEconomicoId && contato.grupoEconomicoId === conta.grupoEconomicoId;
    const pertenceInstituicao =
      conta.instituicoes &&
      contato.instituicaoId &&
      conta.instituicoes.some((inst) => inst.id === contato.instituicaoId);

    if (!pertenceGrupo && !pertenceInstituicao) {
      erros.push(
        "O contato selecionado não pertence à conta comercial ou agrupamento econômico correto."
      );
    }

    // Isolamento Real vs Demonstração
    const contaDemo = conta.tipoDado === "DEMONSTRACAO";
    const contatoDemo = contato.tipoDado === "DEMONSTRACAO";
    if (contaDemo && !contatoDemo) {
      erros.push("Contatos reais não podem ser vinculados a contas de demonstração.");
    }
    if (!contaDemo && contatoDemo) {
      erros.push("Contatos de demonstração não podem ser vinculados a contas reais.");
    }

    // Papel comercial canônico como INFERÊNCIA
    if (contato.tipoPapelComercial !== "INFERENCIA") {
      erros.push("O papel comercial do contato deve estar classificado canonicamente como INFERENCIA.");
    }

    // Proibição de dados pessoais e verificação de canal
    if (contato.nome && REGEX_CPF.test(contato.nome)) {
      erros.push("Violação de privacidade: detectado CPF ou dado pessoal proibido no nome do contato.");
    }

    if (canal === "EMAIL") {
      if (!contato.emailCorporativo || contato.emailCorporativo.trim() === "") {
        erros.push("O contato não possui e-mail corporativo publicado para o canal planejado E-mail.");
      } else {
        const emailLower = contato.emailCorporativo.toLowerCase();
        if (PROVEDORES_EMAIL_PESSOAL.some((prov) => emailLower.endsWith(prov))) {
          erros.push(
            "Violação de privacidade: o e-mail cadastrado pertence a provedor pessoal. Apenas e-mails corporativos publicados são permitidos."
          );
        }
      }
    }

    if (canal === "TELEFONE" || canal === "WHATSAPP") {
      const temTelefone =
        Boolean(contato.telefoneProfissional?.trim()) ||
        Boolean(contato.telefoneDepartamental?.trim()) ||
        Boolean(contato.ramal?.trim());
      if (!temTelefone) {
        erros.push(
          `O contato não possui telefone corporativo publicado para o canal planejado ${canal}. Proibido uso de telefones pessoais ou não confirmados.`
        );
      }
    }

    if (canal === "LINKEDIN") {
      const temLinkedin =
        Boolean(contato.linkedinUrl?.trim()) || Boolean(contato.paginaProfissionalUrl?.trim());
      if (!temLinkedin) {
        erros.push(
          "O contato não possui perfil público de LinkedIn ou página profissional institucional vinculada."
        );
      }
    }
  }

  // 3. Validação do Rascunho da Mensagem
  if (mensagemRascunho) {
    if (REGEX_CPF.test(mensagemRascunho)) {
      erros.push("Violação de privacidade: detectado padrão de CPF no texto do rascunho.");
    }
  }

  avisos.push("Canal apenas planejado. Nenhuma comunicação será enviada neste Gate.");

  return {
    elegivel: erros.length === 0,
    erros,
    avisos,
  };
}
