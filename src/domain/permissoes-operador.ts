export const PERFIS_OPERADOR = [
  "CONSULTA",
  "REVISOR",
  "APROVADOR",
  "ADMINISTRADOR",
] as const;

export type PerfilOperador = (typeof PERFIS_OPERADOR)[number];

export const PERMISSOES_OPERADOR = [
  "CONSULTAR",
  "REVISAR_CONTATOS",
  "PLANEJAR_ACOES",
  "APROVAR_ACOES",
  "SIMULAR_INTEGRACOES",
  "ADMINISTRAR_INTEGRACOES",
] as const;

export type PermissaoOperador = (typeof PERMISSOES_OPERADOR)[number];

const permissoesPorPerfil: Record<PerfilOperador, readonly PermissaoOperador[]> = {
  CONSULTA: ["CONSULTAR"],
  REVISOR: ["CONSULTAR", "REVISAR_CONTATOS", "PLANEJAR_ACOES"],
  APROVADOR: ["CONSULTAR", "REVISAR_CONTATOS", "PLANEJAR_ACOES", "APROVAR_ACOES", "SIMULAR_INTEGRACOES"],
  ADMINISTRADOR: PERMISSOES_OPERADOR,
};

export function perfilOperadorValido(valor: string | undefined): valor is PerfilOperador {
  return PERFIS_OPERADOR.some((perfil) => perfil === valor);
}

export function temPermissao(perfil: PerfilOperador, permissao: PermissaoOperador): boolean {
  return permissoesPorPerfil[perfil].includes(permissao);
}
