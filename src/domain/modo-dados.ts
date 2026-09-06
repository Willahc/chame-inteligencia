import type { ModoDados } from "./tipos";

export const MODO_DEMONSTRACAO: ModoDados = "MODO_DEMONSTRACAO";
export const MODO_REAL: ModoDados = "MODO_REAL";

/** O modo real é o padrão operacional; a demonstração é opt-in explícito. */
export function obterModoDados(valor = process.env.CHAME_MODO_DADOS): ModoDados {
  return valor === MODO_DEMONSTRACAO ? MODO_DEMONSTRACAO : MODO_REAL;
}

export function tipoDadoDoModo(modo: ModoDados): "DEMONSTRACAO" | "FATO_OFICIAL" {
  return modo === MODO_REAL ? "FATO_OFICIAL" : "DEMONSTRACAO";
}
