import type { FaixaPrioridade, Porte } from "../tipos";
import {
  PESOS_INDICE,
  ROTULOS_CRITERIOS,
  VERSAO_INDICE,
  type CriterioIndice,
} from "./pesos";

export interface EntradaIndice {
  operacao24h: boolean;
  quantidadeUnidades: number;
  porte: Porte;
  perfilPrivadoCorporativo: boolean;
  quantidadeMunicipios: number;
  possuiExpansaoRecente: boolean;
  potencialDeslocamento: number;
  potencialVisitantes: number;
  facilidadeAcessoDecisor: number;
  qualidadeEvidencias: number;
  evidenciasPorCriterio?: Partial<Record<CriterioIndice, string[]>>;
}

export interface ComponenteCalculado {
  criterio: CriterioIndice;
  rotulo: string;
  peso: number;
  valorObtido: number;
  justificativa: string;
  evidenciaIds: string[];
}

export interface ResultadoIndice {
  total: number;
  faixa: FaixaPrioridade;
  versao: string;
  componentes: ComponenteCalculado[];
}

const fatoresPorte: Record<Porte, number> = {
  PEQUENO: 0.2,
  MEDIO: 0.5,
  GRANDE: 0.8,
  MUITO_GRANDE: 1,
};

function limitar(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

function fatorUnidades(quantidade: number): number {
  if (quantidade >= 4) return 1;
  if (quantidade === 3) return 0.8;
  if (quantidade === 2) return 0.55;
  return quantidade === 1 ? 0.2 : 0;
}

function fatorMunicipios(quantidade: number): number {
  if (quantidade >= 4) return 1;
  if (quantidade === 3) return 0.8;
  if (quantidade === 2) return 0.55;
  return quantidade === 1 ? 0.1 : 0;
}

export function classificarFaixa(total: number): FaixaPrioridade {
  if (total >= 80) return "MUITO_ALTA";
  if (total >= 60) return "ALTA";
  if (total >= 40) return "MODERADA";
  return "BAIXA";
}

export function calcularIndice(entrada: EntradaIndice): ResultadoIndice {
  const fatores: Record<CriterioIndice, number> = {
    operacao24h: entrada.operacao24h ? 1 : 0,
    quantidadeUnidades: fatorUnidades(entrada.quantidadeUnidades),
    porteCapacidade: fatoresPorte[entrada.porte],
    perfilPrivadoCorporativo: entrada.perfilPrivadoCorporativo ? 1 : 0,
    dispersaoGeografica: fatorMunicipios(entrada.quantidadeMunicipios),
    expansao: entrada.possuiExpansaoRecente ? 1 : 0,
    deslocamentoEntreUnidades: limitar(entrada.potencialDeslocamento),
    visitantesExternos: limitar(entrada.potencialVisitantes),
    acessoDecisor: limitar(entrada.facilidadeAcessoDecisor),
    qualidadeEvidencias: limitar(entrada.qualidadeEvidencias),
  };

  const justificativas: Record<CriterioIndice, string> = {
    operacao24h: entrada.operacao24h ? "Opera continuamente, ampliando janelas potenciais de deslocamento." : "Não há indicação de operação contínua.",
    quantidadeUnidades: `${entrada.quantidadeUnidades} unidade(s) considerada(s) no cálculo.`,
    porteCapacidade: `Porte classificado como ${entrada.porte.toLowerCase().replace("_", " ")}.`,
    perfilPrivadoCorporativo: entrada.perfilPrivadoCorporativo ? "Perfil privado ou corporativo identificado na demonstração." : "Perfil privado ou corporativo não identificado.",
    dispersaoGeografica: `Presença em ${entrada.quantidadeMunicipios} município(s).`,
    expansao: entrada.possuiExpansaoRecente ? "Há sinal de expansão registrado e rastreável." : "Nenhum sinal recente de expansão registrado.",
    deslocamentoEntreUnidades: "Potencial relativo de circulação entre unidades, conforme características registradas.",
    visitantesExternos: "Potencial relativo de visitas de executivos, fornecedores e público externo.",
    acessoDecisor: "Facilidade provável de acesso à área decisora; requer validação comercial.",
    qualidadeEvidencias: "Resultado derivado da confiança e do status de revisão das evidências.",
  };

  const componentes = (Object.keys(PESOS_INDICE) as CriterioIndice[]).map((criterio) => ({
    criterio,
    rotulo: ROTULOS_CRITERIOS[criterio],
    peso: PESOS_INDICE[criterio],
    valorObtido: Math.round(PESOS_INDICE[criterio] * fatores[criterio]),
    justificativa: justificativas[criterio],
    evidenciaIds: entrada.evidenciasPorCriterio?.[criterio] ?? [],
  }));

  const total = componentes.reduce((soma, componente) => soma + componente.valorObtido, 0);
  return { total, faixa: classificarFaixa(total), versao: VERSAO_INDICE, componentes };
}
