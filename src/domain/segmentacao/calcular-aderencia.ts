import {
  FAIXAS_ADERENCIA,
  PESOS_ADERENCIA,
  ROTULOS_CRITERIOS_ADERENCIA,
  VERSAO_REGRA_ADERENCIA,
  type CriterioAderencia,
} from "./pesos";

export type SegmentoComercial =
  | "NUCLEO_HOSPITALAR"
  | "SAUDE_CORPORATIVA_EXPANDIDA"
  | "BAIXA_PRIORIDADE_INICIAL"
  | "FORA_DO_FOCO_ATUAL";

export type FaixaAderencia = "ALTA" | "MEDIA" | "BAIXA" | "FORA_DO_FOCO";

export type ConfiancaSegmentacao = "ALTA" | "MEDIA" | "BAIXA";

export interface EntradaAderencia {
  tipoHospitalar: boolean;
  atendimentoHospitalar: boolean;
  complexidadeEstrutural: boolean;
  atendimentoAmbulatorial: boolean;
  turnoAderencia: number;
  coberturaDados: number;
}

export interface ComponenteAderencia {
  criterio: CriterioAderencia;
  rotulo: string;
  peso: number;
  valorObtido: number;
}

export interface ResultadoAderencia {
  total: number;
  faixa: FaixaAderencia;
  segmento: SegmentoComercial;
  confianca: ConfiancaSegmentacao;
  versaoRegra: string;
  componentes: ComponenteAderencia[];
  justificativa: string;
}

const TIPOS_HOSPITALARES: ReadonlyArray<string> = [
  "Hospital geral",
  "Hospital especializado",
  "Hospital-Dia",
];
const TIPO_PRONTO_ATENDIMENTO = "Pronto Atendimento";
const TIPO_CENTRO_DIAGNOSTICO = "Centro de Diagnóstico";
const TIPO_CLINICA_ESPECIALIDADE = "Clínica / Centro de Especialidade";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function ehTipoHospitalar(tipoEstabelecimento: string): boolean {
  const t = normalizar(tipoEstabelecimento);
  return TIPOS_HOSPITALARES.some((tipo) => t.includes(normalizar(tipo)));
}

function fatorTipoAssistencial(tipoEstabelecimento: string): number {
  const t = normalizar(tipoEstabelecimento);
  if (TIPOS_HOSPITALARES.some((tipo) => t.includes(normalizar(tipo)))) return 1;
  if (t.includes(normalizar(TIPO_PRONTO_ATENDIMENTO))) return 0.6;
  if (t.includes(normalizar(TIPO_CENTRO_DIAGNOSTICO))) return 0.6;
  if (t.includes(normalizar(TIPO_CLINICA_ESPECIALIDADE))) return 0.4;
  return 0.3;
}

function limitar(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

export function classificarFaixaAderencia(total: number): FaixaAderencia {
  if (total >= FAIXAS_ADERENCIA.altaEm) return "ALTA";
  if (total >= FAIXAS_ADERENCIA.mediaEm) return "MEDIA";
  if (total >= FAIXAS_ADERENCIA.baixaEm) return "BAIXA";
  return "FORA_DO_FOCO";
}

export function determinarSegmento(
  tipoEstabelecimento: string,
  entrada: EntradaAderencia,
  total: number,
): SegmentoComercial {
  const t = normalizar(tipoEstabelecimento);
  const hospitalar = TIPOS_HOSPITALARES.some((tipo) => t.includes(normalizar(tipo))) || entrada.atendimentoHospitalar;
  if (hospitalar) return "NUCLEO_HOSPITALAR";
  if (t.includes(normalizar(TIPO_PRONTO_ATENDIMENTO))) return "SAUDE_CORPORATIVA_EXPANDIDA";
  if (t.includes(normalizar(TIPO_CENTRO_DIAGNOSTICO))) return "SAUDE_CORPORATIVA_EXPANDIDA";
  if (t.includes(normalizar(TIPO_CLINICA_ESPECIALIDADE))) {
    const estruturaRelevante =
      entrada.atendimentoAmbulatorial || entrada.complexidadeEstrutural || entrada.atendimentoHospitalar || entrada.turnoAderencia >= 0.6;
    if (estruturaRelevante) return "SAUDE_CORPORATIVA_EXPANDIDA";
    return "BAIXA_PRIORIDADE_INICIAL";
  }
  if (total >= FAIXAS_ADERENCIA.baixaEm) return "BAIXA_PRIORIDADE_INICIAL";
  return "FORA_DO_FOCO_ATUAL";
}

export function determinarConfianca(
  tipoEstabelecimento: string,
  entrada: EntradaAderencia,
): ConfiancaSegmentacao {
  const t = normalizar(tipoEstabelecimento);
  const hospitalar = TIPOS_HOSPITALARES.some((tipo) => t.includes(normalizar(tipo))) || entrada.atendimentoHospitalar;
  const temFlagEstruturada = entrada.atendimentoHospitalar || entrada.complexidadeEstrutural || entrada.atendimentoAmbulatorial;
  if (hospitalar && temFlagEstruturada) return "ALTA";
  if (hospitalar || temFlagEstruturada || entrada.turnoAderencia >= 0.6) return "MEDIA";
  return "BAIXA";
}

export function turnoParaDescricao(fator: number): string {
  if (fator >= 1) return "com atendimento contínuo de 24 horas (turno 06)";
  if (fator >= 0.8) return "estendida com turno da noite (turno 04)";
  if (fator >= 0.6) return "estendida (turno 05)";
  if (fator >= 0.4) return "diurna apenas (turnos de manhã e tarde)";
  if (fator >= 0.2) return "reduzida (turno único)";
  return "não informada";
}

function montarJustificativa(
  tipoEstabelecimento: string,
  entrada: EntradaAderencia,
  total: number,
  segmento: SegmentoComercial,
): string {
  const partes: string[] = [];
  partes.push(`Classificação baseada no tipo oficial "${tipoEstabelecimento}" e em indicadores estruturados do CNES.`);
  if (entrada.atendimentoHospitalar) partes.push("Indicador oficial de atendimento hospitalar (ST_ATEND_HOSPITALAR) presente.");
  if (entrada.complexidadeEstrutural) partes.push("Indicador oficial de estrutura de internação/cirurgia (centro cirúrgico, obstétrico ou neonatal) presente.");
  if (entrada.atendimentoAmbulatorial) partes.push("Indicador oficial de atendimento ambulatorial (ST_ATEND_AMBULATORIAL) presente.");
  if (entrada.turnoAderencia > 0) partes.push(`Cobertura operacional ${turnoParaDescricao(entrada.turnoAderencia)}.`);
  if (entrada.coberturaDados > 0) partes.push(`Cobertura de dados de ${entrada.coberturaDados}%.`);
  partes.push(`Resultado: aderência ${total} (${classificarFaixaAderencia(total) === "ALTA" ? "ALTA" : classificarFaixaAderencia(total) === "MEDIA" ? "MÉDIA" : classificarFaixaAderencia(total) === "BAIXA" ? "BAIXA" : "FORA DO FOCO"}), segmento ${segmento.replaceAll("_", " ")}.`);
  return partes.join(" ");
}

export function calcularAderencia(entrada: EntradaAderencia, tipoEstabelecimento = ""): ResultadoAderencia {
  const hospitalarPorTipo = tipoEstabelecimento ? ehTipoHospitalar(tipoEstabelecimento) : false;

  const fatores: Record<CriterioAderencia, number> = {
    tipoHospitalar: (hospitalarPorTipo || entrada.atendimentoHospitalar) ? 1 : fatorTipoAssistencial(tipoEstabelecimento),
    atendimentoHospitalar: entrada.atendimentoHospitalar ? 1 : 0,
    complexidadeEstrutural: entrada.complexidadeEstrutural ? 1 : 0,
    atendimentoAmbulatorial: entrada.atendimentoAmbulatorial ? 1 : 0,
    coberturaOperacional: limitar(entrada.turnoAderencia),
    coberturaDados: limitar(entrada.coberturaDados / 100),
  };

  const componentes: ComponenteAderencia[] = (Object.keys(PESOS_ADERENCIA) as CriterioAderencia[]).map((criterio) => ({
    criterio,
    rotulo: ROTULOS_CRITERIOS_ADERENCIA[criterio],
    peso: PESOS_ADERENCIA[criterio],
    valorObtido: Math.round(PESOS_ADERENCIA[criterio] * fatores[criterio]),
  }));

  const total = componentes.reduce((soma, c) => soma + c.valorObtido, 0);
  const faixa = classificarFaixaAderencia(total);
  const segmento = determinarSegmento(tipoEstabelecimento, entrada, total);
  const confianca = determinarConfianca(tipoEstabelecimento, entrada);
  const justificativa = montarJustificativa(tipoEstabelecimento, entrada, total, segmento);

  return { total, faixa, segmento, confianca, versaoRegra: VERSAO_REGRA_ADERENCIA, componentes, justificativa };
}
