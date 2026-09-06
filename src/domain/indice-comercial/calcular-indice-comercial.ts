import type {
  FaixaPrioridade,
  NaturezaJuridicaClasse,
  NivelConfianca,
  TipoVinculo,
} from "../tipos";
import type { ComponenteIndiceComercial, DetalheIndiceComercial } from "../contas";
import {
  FAIXAS_PRIORIDADE_COMERCIAL,
  PESOS_INDICE_COMERCIAL,
  ROTULOS_CRITERIOS_COMERCIAIS,
  VERSAO_INDICE_COMERCIAL,
  type CriterioIndiceComercial,
} from "./pesos";

export interface EntradaIndiceComercial {
  quantidadeUnidades: number;
  quantidadeHospitais: number;
  segmentoPredominante: string | null;
  natureza: NaturezaJuridicaClasse;
  operacao24h: boolean;
  urgenciaEmergencia: boolean;
  quantidadeCidades: number;
  quantidadeContatosAtivos: number;
  tipoVinculo: TipoVinculo;
  confiancaVinculo: NivelConfianca;
  coberturaDados: number;
}

export function classificarFaixaComercial(total: number): FaixaPrioridade {
  if (total >= FAIXAS_PRIORIDADE_COMERCIAL.MUITO_ALTA.minimo) return "MUITO_ALTA";
  if (total >= FAIXAS_PRIORIDADE_COMERCIAL.ALTA.minimo) return "ALTA";
  if (total >= FAIXAS_PRIORIDADE_COMERCIAL.MODERADA.minimo) return "MODERADA";
  return "BAIXA";
}

function fatorMultiunidade(quantidade: number): number {
  if (quantidade >= 5) return 1.0;
  if (quantidade >= 3) return 0.8;
  if (quantidade === 2) return 0.6;
  return 0.2;
}

function fatorHospitais(quantidade: number): number {
  if (quantidade >= 3) return 1.0;
  if (quantidade === 2) return 0.85;
  if (quantidade === 1) return 0.6;
  return 0.1;
}

function fatorSegmento(segmento: string | null): number {
  if (!segmento) return 0.1;
  if (segmento === "NUCLEO_HOSPITALAR") return 1.0;
  if (segmento === "SAUDE_CORPORATIVA_EXPANDIDA") return 0.65;
  if (segmento === "BAIXA_PRIORIDADE_INICIAL") return 0.2;
  return 0.0;
}

function fatorNatureza(natureza: NaturezaJuridicaClasse): number {
  if (natureza === "PRIVADO") return 1.0;
  if (natureza === "INDETERMINADO") return 0.3;
  return 0.0; // PUBLICO
}

function fatorCidades(quantidade: number): number {
  if (quantidade >= 3) return 1.0;
  if (quantidade === 2) return 0.7;
  if (quantidade === 1) return 0.3;
  return 0.1;
}

function fatorTotalUnidades(quantidade: number): number {
  if (quantidade >= 10) return 1.0;
  if (quantidade >= 5) return 0.8;
  if (quantidade >= 2) return 0.5;
  return 0.2;
}

function fatorVinculo(tipo: TipoVinculo): number {
  if (tipo === "OFICIAL") return 1.0;
  if (tipo === "ISOLADO") return 0.85;
  if (tipo === "PROVAVEL") return 0.6;
  return 0.2; // INCERTO
}

export function calcularIndiceComercial(
  entrada: EntradaIndiceComercial,
): DetalheIndiceComercial {
  const fatores: Record<CriterioIndiceComercial, { valor: number; justificativa: string }> = {
    estruturaMultiunidade: {
      valor: fatorMultiunidade(entrada.quantidadeUnidades),
      justificativa:
        entrada.quantidadeUnidades > 1
          ? `${entrada.quantidadeUnidades} unidades identificadas na mesma conta comercial.`
          : "Estabelecimento isolado com 1 unidade operacional.",
    },
    numeroDeHospitais: {
      valor: fatorHospitais(entrada.quantidadeHospitais),
      justificativa:
        entrada.quantidadeHospitais > 0
          ? `${entrada.quantidadeHospitais} unidade(s) com perfil hospitalar ou atendimento de urgência.`
          : "Nenhuma unidade hospitalar identificada.",
    },
    segmentoComercial: {
      valor: fatorSegmento(entrada.segmentoPredominante),
      justificativa: entrada.segmentoPredominante
        ? `Segmentação comercial predominante: ${entrada.segmentoPredominante}.`
        : "Segmentação comercial não definida.",
    },
    naturezaPrivada: {
      valor: fatorNatureza(entrada.natureza),
      justificativa:
        entrada.natureza === "PRIVADO"
          ? "Entidade de natureza jurídica privada (ciclo de compras corporativo)."
          : entrada.natureza === "PUBLICO"
            ? "Entidade de natureza pública (processo licitatório obrigatório)."
            : "Natureza jurídica indeterminada nos registros cadastrais.",
    },
    operacao24h: {
      valor: entrada.operacao24h ? 1.0 : 0.1,
      justificativa: entrada.operacao24h
        ? "Presença de operação contínua 24h em ao menos uma unidade."
        : "Sem indicação de atendimento contínuo 24 horas.",
    },
    urgenciaEmergencia: {
      valor: entrada.urgenciaEmergencia ? 1.0 : 0.1,
      justificativa: entrada.urgenciaEmergencia
        ? "Serviço de urgência, emergência ou pronto atendimento ativo."
        : "Sem registro de serviço de emergência ou pronto-socorro.",
    },
    dispersaoGeografica: {
      valor: fatorCidades(entrada.quantidadeCidades),
      justificativa:
        entrada.quantidadeCidades > 1
          ? `Presença operacional distribuída em ${entrada.quantidadeCidades} municípios.`
          : entrada.quantidadeCidades === 1
            ? "Operação concentrada em 1 município."
            : "Sem município identificado nos registros.",
    },
    numeroDeUnidades: {
      valor: fatorTotalUnidades(entrada.quantidadeUnidades),
      justificativa: `Total de ${entrada.quantidadeUnidades} unidade(s) sob a conta.`,
    },
    existenciaContatos: {
      valor: entrada.quantidadeContatosAtivos > 0 ? 1.0 : 0.0,
      justificativa:
        entrada.quantidadeContatosAtivos > 0
          ? `${entrada.quantidadeContatosAtivos} contato(s) profissional(is) público(s) mapeado(s).`
          : "Nenhum contato corporativo público verificado até o momento.",
    },
    confiancaVinculo: {
      valor: fatorVinculo(entrada.tipoVinculo),
      justificativa: `Vínculo classificado como ${entrada.tipoVinculo} com confiança ${entrada.confiancaVinculo}.`,
    },
    coberturaDados: {
      valor: Math.max(0, Math.min(100, entrada.coberturaDados)) / 100,
      justificativa: `Índice de completude cadastral em ${entrada.coberturaDados}%.`,
    },
  };

  const componentes: ComponenteIndiceComercial[] = (
    Object.keys(PESOS_INDICE_COMERCIAL) as CriterioIndiceComercial[]
  ).map((criterio) => {
    const peso = PESOS_INDICE_COMERCIAL[criterio];
    const { valor, justificativa } = fatores[criterio];
    const pontos = Math.round(peso * valor);
    return {
      criterio,
      rotulo: ROTULOS_CRITERIOS_COMERCIAIS[criterio],
      peso,
      valorObtido: Number(valor.toFixed(2)),
      pontos,
      justificativa,
    };
  });

  const total = Math.min(100, Math.max(0, componentes.reduce((acc, c) => acc + c.pontos, 0)));
  const faixa = classificarFaixaComercial(total);

  const limitacoes = [
    "Índice gerado exclusivamente por dados cadastrais abertos (CNES) e contatos públicos auditados.",
    "Não utiliza nem estima faturamento, número de funcionários ou volume operacional não verificado.",
    "A prioridade comercial é uma indicação algorítmica e não constitui garantia de contratação.",
  ];

  return {
    total,
    faixa,
    versao: VERSAO_INDICE_COMERCIAL,
    cobertura: entrada.coberturaDados,
    componentes,
    limitacoes,
  };
}
