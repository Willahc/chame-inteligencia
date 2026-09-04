import { possuiEvidenciaSuficiente } from "./governanca";
import type { InstituicaoAssistente } from "./tipos";

export interface RespostaAssistente {
  resposta: string;
  instituicoes: Array<{ nome: string; slug: string; indice: number }>;
  intencaoReconhecida: boolean;
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function listar(itens: InstituicaoAssistente[], introducao: string): RespostaAssistente {
  if (itens.length === 0) {
    return { resposta: "Não há evidências suficientes para responder com segurança.", instituicoes: [], intencaoReconhecida: true };
  }
  return {
    resposta: introducao,
    instituicoes: itens.map(({ nome, slug, indice }) => ({ nome, slug, indice })),
    intencaoReconhecida: true,
  };
}

export function responderAssistente(
  pergunta: string,
  instituicoes: InstituicaoAssistente[],
  slugSelecionado?: string,
): RespostaAssistente {
  const texto = normalizar(pergunta.trim());
  const ordenadas = [...instituicoes].sort((a, b) => b.indice - a.indice);
  const selecionada = slugSelecionado ? instituicoes.find((item) => item.slug === slugSelecionado) : undefined;

  if (!texto) return { resposta: "Escolha uma pergunta para consultar exclusivamente os dados locais.", instituicoes: [], intencaoReconhecida: false };
  if (texto.includes("abordar primeiro") || texto.includes("prioridade")) {
    return listar(ordenadas.filter((item) => item.indice >= 60), "Estas instituições têm prioridade alta ou muito alta pelos critérios atuais:");
  }
  if (texto.includes("varias unidades") || texto.includes("mais de uma unidade")) {
    return listar(ordenadas.filter((item) => item.quantidadeUnidades > 1), "Instituições com mais de uma unidade registrada:");
  }
  if (texto.includes("expans")) {
    return listar(ordenadas.filter((item) => item.possuiExpansao), "Instituições com sinal de expansão registrado:");
  }
  if (texto.includes("24 horas") || texto.includes("24h")) {
    return listar(ordenadas.filter((item) => item.operacao24h), "Instituições com operação contínua registrada:");
  }
  if (texto.includes("evidencias fracas") || texto.includes("evidencia fraca")) {
    return listar(ordenadas.filter((item) => item.qualidadeEvidencias === "BAIXA"), "Instituições que exigem reforço ou revisão das evidências:");
  }
  if (texto.includes("nucleo hospitalar") || texto.includes("nucleo h")) {
    return listar(ordenadas.filter((item) => item.segmentacao?.segmento === "NUCLEO_HOSPITALAR"), "Instituições do segmento Núcleo Hospitalar:");
  }
  if (texto.includes("saude corporativa") || texto.includes("hospitalar expand")) {
    return listar(ordenadas.filter((item) => item.segmentacao?.segmento === "SAUDE_CORPORATIVA_EXPANDIDA"), "Instituições do segmento Saúde Corporativa expandida:");
  }
  if (texto.includes("oportunidades comerciais") || texto.includes("segmentacao")) {
    return listar(ordenadas.filter((item) => item.segmentacao?.segmento === "NUCLEO_HOSPITALAR" || item.segmentacao?.segmento === "SAUDE_CORPORATIVA_EXPANDIDA"), "Priorize primeiro estas instituições pelos segmentos de maior aderência comercial:");
  }
  if (texto.includes("vinculo oficial")) {
    return listar(ordenadas.filter((item) => item.organizacao?.tipoVinculo === "OFICIAL"), "Instituições com vínculo oficial confirmado (CNPJ idêntico ou CNPJ mantenedora):");
  }
  if (texto.includes("agrupamento provavel") || texto.includes("provaveis")) {
    return listar(ordenadas.filter((item) => item.organizacao?.tipoVinculo === "PROVAVEL"), "Instituições em agrupamentos prováveis por razão social normalizada (hipótese a revisar):");
  }
  if (texto.includes("relacao incerta") || texto.includes("vinculo incerto")) {
    return listar(ordenadas.filter((item) => item.organizacao?.tipoVinculo === "INCERTO"), "Instituições com relação incerta e revisão de ajuste necessária:");
  }
  if (texto.includes("revisao necessaria") || texto.includes("exigem revisao")) {
    return listar(ordenadas.filter((item) => item.organizacao?.precisaRevisao === true), "Instituições cujos agrupamentos exigem revisão antes de uso comercial:");
  }
  if (texto.includes("redes privadas") || texto.includes("privadas multi-unidade") || texto.includes("multi-unidade privadas")) {
    return listar(ordenadas.filter((item) => (item.organizacao?.quantidadeUnidades ?? 0) > 1 && item.organizacao?.natureza === "PRIVADO"), "Instituições de redes privadas com múltiplas unidades (maior porte de decisão):");
  }
  if (texto.includes("por que") || texto.includes("resumo comercial") || texto.includes("resumo desta")) {
    if (!selecionada || !possuiEvidenciaSuficiente(selecionada.evidencias)) {
      return { resposta: "Não há evidências suficientes para responder com segurança.", instituicoes: [], intencaoReconhecida: true };
    }
    return {
      resposta: `${selecionada.nome} possui índice ${selecionada.indice}. Principal motivo: ${selecionada.principalMotivo}. Ação recomendada: ${selecionada.acaoRecomendada}`,
      instituicoes: [{ nome: selecionada.nome, slug: selecionada.slug, indice: selecionada.indice }],
      intencaoReconhecida: true,
    };
  }
  return { resposta: "Não há evidências suficientes para responder com segurança.", instituicoes: [], intencaoReconhecida: false };
}
