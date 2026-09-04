import type { ModoDados } from "./tipos";

export const MODO_DEMONSTRACAO: ModoDados = "MODO_DEMONSTRACAO";
export const MODO_REAL: ModoDados = "MODO_REAL";

/** O modo de demonstração é o padrão seguro para a apresentação local. */
export function obterModoDados(valor = process.env.CHAME_MODO_DADOS): ModoDados {
  return valor === MODO_REAL ? MODO_REAL : MODO_DEMONSTRACAO;
}

export function tipoDadoDoModo(modo: ModoDados): "DEMONSTRACAO" | "FATO_OFICIAL" {
  return modo === MODO_REAL ? "FATO_OFICIAL" : "DEMONSTRACAO";
}
