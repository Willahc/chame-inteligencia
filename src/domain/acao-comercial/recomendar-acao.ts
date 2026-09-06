import type {
  FaixaPrioridade,
  NaturezaJuridicaClasse,
  NivelConfianca,
  TipoVinculo,
} from "../tipos";
import type { AcaoComercialRecomendada } from "../contas";

export interface EntradaRecomendacaoAcao {
  faixaPrioridadeComercial: FaixaPrioridade;
  totalPontos: number;
  natureza: NaturezaJuridicaClasse;
  tipoVinculo: TipoVinculo;
  confiancaOrganizacional: NivelConfianca;
  coberturaDados: number;
  quantidadeContatosAtivos: number;
  quantidadeUnidades: number;
}

export interface ResultadoRecomendacaoAcao {
  acao: AcaoComercialRecomendada;
  titulo: string;
  descricao: string;
  justificativa: string;
  limitacao: string;
}

export const ROTULOS_ACOES_COMERCIAIS: Record<AcaoComercialRecomendada, string> = {
  ABORDAR_IMEDIATAMENTE: "Abordar imediatamente",
  PESQUISAR_MELHOR: "Pesquisar melhor",
  REVISAR_VINCULO: "Revisar vínculo",
  BAIXA_PRIORIDADE: "Baixa prioridade",
  AGUARDAR_ENRIQUECIMENTO: "Aguardar enriquecimento",
};

export function recomendarAcaoComercial(
  entrada: EntradaRecomendacaoAcao,
): ResultadoRecomendacaoAcao {
  const limitacaoPadrao =
    "Recomendação algorítmica de apoio operacional; não substitui o discernimento comercial nem assegura contratação.";

  // 1. Risco de hipótese de vínculo incorreto
  if (
    entrada.tipoVinculo === "INCERTO" ||
    (entrada.tipoVinculo === "PROVAVEL" && entrada.confiancaOrganizacional === "BAIXA")
  ) {
    return {
      acao: "REVISAR_VINCULO",
      titulo: ROTULOS_ACOES_COMERCIAIS.REVISAR_VINCULO,
      descricao:
        "Validar o agrupamento corporativo antes de iniciar contato, evitando abordar a matriz ou mantenedora incorreta.",
      justificativa: `O vínculo da conta está classificado como ${entrada.tipoVinculo} com confiança ${entrada.confiancaOrganizacional}.`,
      limitacao: limitacaoPadrao,
    };
  }

  // 2. Cobertura de dados deficiente
  if (entrada.coberturaDados < 60) {
    return {
      acao: "AGUARDAR_ENRIQUECIMENTO",
      titulo: ROTULOS_ACOES_COMERCIAIS.AGUARDAR_ENRIQUECIMENTO,
      descricao:
        "Completar o cadastro institucional com novas rodadas de ingestão oficial antes de abrir prospecção ativa.",
      justificativa: `A cobertura cadastral da conta é de ${entrada.coberturaDados}%, abaixo do limiar de segurança de 60%.`,
      limitacao: limitacaoPadrao,
    };
  }

  // 3. Natureza pública ou prioridade baixa
  if (entrada.natureza === "PUBLICO") {
    return {
      acao: "BAIXA_PRIORIDADE",
      titulo: ROTULOS_ACOES_COMERCIAIS.BAIXA_PRIORIDADE,
      descricao:
        "Entidade pública com processo licitatório obrigatório; manter em lista passiva e priorizar contratações corporativas privadas.",
      justificativa: "A natureza jurídica é pública (requer licitação formal).",
      limitacao: limitacaoPadrao,
    };
  }

  if (entrada.faixaPrioridadeComercial === "BAIXA") {
    return {
      acao: "BAIXA_PRIORIDADE",
      titulo: ROTULOS_ACOES_COMERCIAIS.BAIXA_PRIORIDADE,
      descricao:
        "Pontuação comercial abaixo do limiar prioritário; acionar somente após cobertura das contas de faixas superiores.",
      justificativa: `Pontuação no índice comercial de ${entrada.totalPontos} pontos (faixa Baixa).`,
      limitacao: limitacaoPadrao,
    };
  }

  // 4. Abordagem imediata
  if (
    entrada.faixaPrioridadeComercial === "MUITO_ALTA" ||
    (entrada.faixaPrioridadeComercial === "ALTA" &&
      entrada.quantidadeContatosAtivos > 0 &&
      entrada.natureza === "PRIVADO")
  ) {
    return {
      acao: "ABORDAR_IMEDIATAMENTE",
      titulo: ROTULOS_ACOES_COMERCIAIS.ABORDAR_IMEDIATAMENTE,
      descricao:
        "Conta com alta prioridade comercial, estrutura operacional expressiva e contatos profissionais públicos verificados disponíveis.",
      justificativa: `${entrada.totalPontos} pontos na prioridade comercial, natureza privada e ${entrada.quantidadeContatosAtivos} contato(s) ativo(s).`,
      limitacao: limitacaoPadrao,
    };
  }

  // 5. Pesquisar melhor (alta/moderada sem contatos corporativos verificados)
  return {
    acao: "PESQUISAR_MELHOR",
    titulo: ROTULOS_ACOES_COMERCIAIS.PESQUISAR_MELHOR,
    descricao:
      "Conta com aderência comercial relevante, mas sem contatos profissionais públicos mapeados; priorizar pesquisa de lideranças em suprimentos e facilities.",
    justificativa: `Faixa ${entrada.faixaPrioridadeComercial} (${entrada.totalPontos} pontos) sem contatos verificados cadastrados.`,
    limitacao: limitacaoPadrao,
  };
}
