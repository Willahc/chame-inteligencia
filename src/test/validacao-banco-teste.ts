/**
 * Validação de segurança para garantir que testes automatizados
 * jamais se conectem ao banco de desenvolvimento (dev.db).
 */
export function validarDatabaseUrlSeguraParaTestes(dbUrl: string): void {
  if (!dbUrl || dbUrl.trim() === "") {
    throw new Error(
      "[SEGURANÇA BLOQUEADA] DATABASE_URL não definida durante a execução dos testes. Os testes devem usar um banco isolado (ex: prisma/.test/test.db)."
    );
  }

  const normalizada = dbUrl.replace(/\\/g, "/").toLowerCase();

  // Bloqueio explícito e ruidoso contra dev.db
  if (
    normalizada === "file:./dev.db" ||
    normalizada === "file:dev.db" ||
    normalizada.endsWith("/dev.db") ||
    normalizada.includes("/dev.db?") ||
    normalizada.includes("prisma/dev.db")
  ) {
    throw new Error(
      `[SEGURANÇA BLOQUEADA] Tentativa de executar testes apontando para o banco de desenvolvimento (${dbUrl}). O teste deve rodar exclusivamente sobre o banco descartável (prisma/.test/test.db).`
    );
  }

  // Garantir que a URL aponte para um banco de teste
  if (!normalizada.includes("test.db")) {
    throw new Error(
      `[SEGURANÇA BLOQUEADA] DATABASE_URL inválida para testes (${dbUrl}). Deve apontar para um arquivo contendo 'test.db'.`
    );
  }
}
