import type { NivelConfianca, TipoDado } from "@/domain/tipos";

export type OrigemPublica =
  | "CNES_DATASUS"
  | "RECEITA_CNPJ"
  | "ANS"
  | "SITE_INSTITUCIONAL"
  | "EVENTO_SAUDE"
  | "DADO_GEOGRAFICO";

export interface RegistroColetado {
  origem: OrigemPublica;
  identificadorExterno: string;
  coletadoEm: string;
  conteudoBruto: unknown;
}

export interface RegistroNormalizado {
  origem: OrigemPublica;
  identificadorExterno: string;
  nomeInstituicao: string;
  campos: Record<string, unknown>;
  tipoDado: TipoDado;
  confianca: NivelConfianca;
}

export interface CandidatoEntidade {
  registro: RegistroNormalizado;
  instituicaoId?: string;
  similaridade: number;
  requerRevisaoHumana: boolean;
}

export interface ConectorIngestao {
  readonly origem: OrigemPublica;
  coletar(referencia: string): Promise<RegistroColetado[]>;
  normalizar(registro: RegistroColetado): RegistroNormalizado;
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
  alertas: string[];
}

export interface EtapaIngestao<TEntrada, TSaida> {
  executar(entrada: TEntrada): Promise<TSaida>;
}
