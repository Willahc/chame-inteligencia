export const PESOS_INDICE = {
  operacao24h: 15,
  quantidadeUnidades: 15,
  porteCapacidade: 15,
  perfilPrivadoCorporativo: 10,
  dispersaoGeografica: 10,
  expansao: 10,
  deslocamentoEntreUnidades: 10,
  visitantesExternos: 5,
  acessoDecisor: 5,
  qualidadeEvidencias: 5,
} as const;

export const VERSAO_INDICE = "1.0.0";

export type CriterioIndice = keyof typeof PESOS_INDICE;

export const ROTULOS_CRITERIOS: Record<CriterioIndice, string> = {
  operacao24h: "Operação contínua / 24 horas",
  quantidadeUnidades: "Quantidade de unidades",
  porteCapacidade: "Porte / capacidade",
  perfilPrivadoCorporativo: "Perfil privado / corporativo",
  dispersaoGeografica: "Dispersão geográfica",
  expansao: "Sinal recente de expansão",
  deslocamentoEntreUnidades: "Deslocamento entre unidades",
  visitantesExternos: "Visitantes externos / fornecedores",
  acessoDecisor: "Acesso provável ao decisor",
  qualidadeEvidencias: "Qualidade das evidências",
};
