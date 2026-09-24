import "server-only";
import {
  perfilOperadorValido,
  temPermissao,
  type PerfilOperador,
  type PermissaoOperador,
} from "@/domain/permissoes-operador";

/**
 * Identidade da instância local, definida somente no ambiente do servidor.
 *
 * Enquanto não houver um provedor de autenticação aprovado, não se aceita
 * identidade enviada pelo navegador como evidência de auditoria.
 */
export function obterOperadorLocal(): string {
  return process.env.CHAME_USUARIO_OPERADOR?.trim() || "operador-local-nao-autenticado";
}

export function obterPerfilOperadorLocal(): PerfilOperador {
  const perfil = process.env.CHAME_PERFIL_OPERADOR?.trim();
  return perfilOperadorValido(perfil) && Boolean(process.env.CHAME_USUARIO_OPERADOR?.trim())
    ? perfil
    : "CONSULTA";
}

export function exigirPermissaoOperador(permissao: PermissaoOperador): string {
  const operador = obterOperadorLocal();
  const perfil = obterPerfilOperadorLocal();
  if (!temPermissao(perfil, permissao)) {
    throw new Error(`Operador '${operador}' não possui permissão para '${permissao}'.`);
  }
  return operador;
}
