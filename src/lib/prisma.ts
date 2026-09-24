import { PrismaClient } from "@prisma/client";

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarPrismaClient(): PrismaClient {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    const dbUrl = process.env.DATABASE_URL ?? "";
    const normalizada = dbUrl.replace(/\\/g, "/").toLowerCase();
    if (
      !dbUrl ||
      normalizada === "file:./dev.db" ||
      normalizada === "file:dev.db" ||
      normalizada.endsWith("/dev.db") ||
      normalizada.includes("/dev.db?") ||
      normalizada.includes("prisma/dev.db")
    ) {
      throw new Error(
        `[SEGURANÇA BLOQUEADA] Tentativa de inicializar PrismaClient apontando para o banco de desenvolvimento (${dbUrl}) durante a execução de testes. O teste deve rodar exclusivamente sobre o banco descartável.`
      );
    }
  }
  return new PrismaClient();
}

export const prisma = globalPrisma.prisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") globalPrisma.prisma = prisma;

