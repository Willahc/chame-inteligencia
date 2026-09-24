import { afterAll, beforeAll } from "vitest";
import { validarDatabaseUrlSeguraParaTestes } from "./validacao-banco-teste";
import { prisma } from "@/lib/prisma";

beforeAll(() => {
  const dbUrl = process.env.DATABASE_URL ?? "";
  validarDatabaseUrlSeguraParaTestes(dbUrl);
});

afterAll(async () => {
  await prisma.$disconnect().catch(() => {});
});
