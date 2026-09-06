import type { FaixaPrioridade, NaturezaClasse, NivelConfianca, StatusRevisao, TipoDado, TipoVinculo } from "@/domain/tipos";

export const rotuloFaixa: Record<FaixaPrioridade, string> = {
  MUITO_ALTA: "Prioridade Muito Alta",
  ALTA: "Prioridade Alta",
  MODERADA: "Prioridade Moderada",
  BAIXA: "Prioridade Baixa",
};

export const rotuloConfianca: Record<NivelConfianca, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const rotuloRevisao: Record<StatusRevisao, string> = {
  APROVADA: "Revisada",
  PENDENTE: "Revisão pendente",
  REJEITADA: "Rejeitada",
};

export const rotuloTipo: Record<TipoDado, string> = {
  FATO_OFICIAL: "Fato oficial",
  FATO_PUBLICO: "Fato público",
  INFERENCIA: "Inferência",
  HIPOTESE: "Hipótese",
  DEMONSTRACAO: "Demonstração",
  DADO_TERCEIRO_NAO_CANONICO: "Dado de terceiro não canônico",
};

export const rotuloSegmento: Record<string, string> = {
  NUCLEO_HOSPITALAR: "Núcleo Hospitalar",
  SAUDE_CORPORATIVA_EXPANDIDA: "Saúde Corporativa",
  BAIXA_PRIORIDADE_INICIAL: "Baixa Prioridade",
  FORA_DO_FOCO_ATUAL: "Fora do Foco",
};

export const rotuloFaixaAderencia: Record<string, string> = {
  ALTA: "Alta aderência",
  MEDIA: "Média aderência",
  BAIXA: "Baixa aderência",
  FORA_DO_FOCO: "Fora do foco",
};

export const rotuloStatusRevisao: Record<string, string> = {
  NAO_REVISADO: "Não revisado",
  APROVADO: "Aprovado",
  AJUSTE_NECESSARIO: "Ajuste necessário",
};

export function ClasseSegmento({ segmento }: { segmento: string }) {
  const classe = {
    NUCLEO_HOSPITALAR: "border-emerald-200 bg-emerald-50 text-emerald-800",
    SAUDE_CORPORATIVA_EXPANDIDA: "border-cyan-200 bg-cyan-50 text-cyan-800",
    BAIXA_PRIORIDADE_INICIAL: "border-amber-200 bg-amber-50 text-amber-800",
    FORA_DO_FOCO_ATUAL: "border-slate-200 bg-slate-100 text-slate-700",
  }[segmento] ?? "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloSegmento[segmento] ?? segmento}</span>;
}
export function ClasseFaixa({ faixa }: { faixa: FaixaPrioridade }) {
  const classe = {
    MUITO_ALTA: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ALTA: "bg-cyan-50 text-cyan-800 border-cyan-200",
    MODERADA: "bg-amber-50 text-amber-800 border-amber-200",
    BAIXA: "bg-slate-100 text-slate-700 border-slate-200",
  }[faixa];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloFaixa[faixa]}</span>;
}

export function MarcadorTipo({ tipo }: { tipo: TipoDado }) {
  const classe = {
    FATO_OFICIAL: "border-blue-200 bg-blue-50 text-blue-800",
    FATO_PUBLICO: "border-teal-200 bg-teal-50 text-teal-800",
    INFERENCIA: "border-violet-200 bg-violet-50 text-violet-800",
    HIPOTESE: "border-orange-200 bg-orange-50 text-orange-800",
    DEMONSTRACAO: "border-amber-200 bg-amber-50 text-amber-800",
    DADO_TERCEIRO_NAO_CANONICO: "border-amber-300 bg-amber-50 text-amber-900",
  }[tipo] ?? "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloTipo[tipo] ?? tipo}</span>;
}

export const rotuloVinculo: Record<TipoVinculo, string> = {
  OFICIAL: "Vínculo oficial",
  PROVAVEL: "Agrupamento provável",
  ISOLADO: "Instituição isolada",
  INCERTO: "Relação incerta",
};

export const rotuloNatureza: Record<NaturezaClasse, string> = {
  PUBLICO: "Pública",
  PRIVADO: "Privada",
  INDETERMINADO: "Indeterminada",
};

export function ClasseVinculo({ vinculo }: { vinculo: TipoVinculo }) {
  const classe = {
    OFICIAL: "border-blue-200 bg-blue-50 text-blue-800",
    PROVAVEL: "border-orange-200 bg-orange-50 text-orange-800",
    ISOLADO: "border-slate-200 bg-slate-100 text-slate-700",
    INCERTO: "border-red-200 bg-red-50 text-red-800",
  }[vinculo];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloVinculo[vinculo]}</span>;
}

export function ClasseNatureza({ natureza }: { natureza: NaturezaClasse }) {
  const classe = {
    PUBLICO: "border-emerald-200 bg-emerald-50 text-emerald-800",
    PRIVADO: "border-violet-200 bg-violet-50 text-violet-800",
    INDETERMINADO: "border-slate-200 bg-slate-100 text-slate-700",
  }[natureza];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloNatureza[natureza]}</span>;
}

export const rotuloResultadoAbordagem: Record<string, string> = {
  NAO_ABORDADA: "Não abordada",
  ABORDADA: "Abordada",
  EM_ANALISE: "Em análise",
  REUNIAO: "Reunião agendada",
  PROPOSTA: "Proposta enviada",
  CONTRATO: "Contrato assinado",
  DESCARTADA: "Descartada",
  AGUARDANDO_DADOS: "Aguardando dados",
};

export function ClasseResultadoAbordagem({ resultado }: { resultado: string }) {
  const classe = {
    NAO_ABORDADA: "border-slate-200 bg-slate-100 text-slate-700",
    ABORDADA: "border-blue-200 bg-blue-50 text-blue-800",
    EM_ANALISE: "border-amber-200 bg-amber-50 text-amber-800",
    REUNIAO: "border-purple-200 bg-purple-50 text-purple-800",
    PROPOSTA: "border-indigo-200 bg-indigo-50 text-indigo-800",
    CONTRATO: "border-emerald-200 bg-emerald-50 text-emerald-800",
    DESCARTADA: "border-rose-200 bg-rose-50 text-rose-800",
    AGUARDANDO_DADOS: "border-amber-200 bg-amber-50 text-amber-800",
  }[resultado] ?? "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloResultadoAbordagem[resultado] ?? resultado}</span>;
}

export const rotuloAcaoComercial: Record<string, string> = {
  ABORDAR_IMEDIATAMENTE: "Abordar imediatamente",
  PESQUISAR_MELHOR: "Pesquisar melhor",
  REVISAR_VINCULO: "Revisar vínculo",
  BAIXA_PRIORIDADE: "Baixa prioridade",
  AGUARDAR_ENRIQUECIMENTO: "Aguardar enriquecimento",
};

export function ClasseAcaoComercial({ acao }: { acao: string }) {
  const classe = {
    ABORDAR_IMEDIATAMENTE: "border-emerald-200 bg-emerald-50 text-emerald-800",
    PESQUISAR_MELHOR: "border-cyan-200 bg-cyan-50 text-cyan-800",
    REVISAR_VINCULO: "border-amber-200 bg-amber-50 text-amber-800",
    BAIXA_PRIORIDADE: "border-slate-200 bg-slate-100 text-slate-700",
    AGUARDAR_ENRIQUECIMENTO: "border-orange-200 bg-orange-50 text-orange-800",
  }[acao] ?? "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classe}`}>{rotuloAcaoComercial[acao] ?? acao}</span>;
}
