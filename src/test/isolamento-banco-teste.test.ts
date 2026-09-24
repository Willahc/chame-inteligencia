import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { validarDatabaseUrlSeguraParaTestes } from "./validacao-banco-teste";
import { prisma } from "@/lib/prisma";

function calcularHashArquivo(caminho: string): string | null {
  if (!fs.existsSync(caminho)) return null;
  const buffer = fs.readFileSync(caminho);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

describe("Isolamento Obrigatório do Banco de Testes (TEST_DATABASE_ISOLATION)", () => {
  it("A. garante que o ambiente de teste jamais aponta para dev.db", () => {
    const dbUrl = process.env.DATABASE_URL ?? "";
    const normalizada = dbUrl.replace(/\\/g, "/").toLowerCase();

    expect(normalizada).not.toBe("file:./dev.db");
    expect(normalizada).not.toContain("/dev.db");
    expect(normalizada).toContain("test.db");
  });

  it("B. comprova que o banco temporário isolado está ativo e operando com os dados canônicos", async () => {
    // Confirma que o Prisma está conectado ao banco temporário e consegue realizar leituras
    const totalInst = await prisma.instituicao.count();
    expect(totalInst).toBe(8217);

    const totalContas = await prisma.contaComercial.count();
    expect(totalContas).toBe(7555);
  });

  it("C. bloqueia com erro ruidoso qualquer tentativa de executar testes apontando para dev.db", () => {
    // URLs inválidas / perigosas devem lançar erro com mensagem explícita
    expect(() => validarDatabaseUrlSeguraParaTestes("file:./dev.db")).toThrow(
      /SEGURANÇA BLOQUEADA/
    );
    expect(() => validarDatabaseUrlSeguraParaTestes("file:prisma/dev.db")).toThrow(
      /SEGURANÇA BLOQUEADA/
    );
    expect(() => validarDatabaseUrlSeguraParaTestes("file:/caminho/qualquer/dev.db")).toThrow(
      /SEGURANÇA BLOQUEADA/
    );
    expect(() => validarDatabaseUrlSeguraParaTestes("")).toThrow(
      /SEGURANÇA BLOQUEADA/
    );
    expect(() => validarDatabaseUrlSeguraParaTestes("file:./outro-banco.db")).toThrow(
      /SEGURANÇA BLOQUEADA/
    );

    // URL válida de teste não deve lançar
    expect(() => validarDatabaseUrlSeguraParaTestes("file:./.test/test.db")).not.toThrow();
  });

  it("D. comprova que mutações em tempo de teste afetam apenas o banco temporário e preservam o dev.db", async () => {
    const devDbPath = path.resolve(process.cwd(), "prisma/dev.db");
    const hashDevAntes = calcularHashArquivo(devDbPath);

    // Executa mutação controlada (update de registro existente em teste)
    const contaTeste = await prisma.contaComercial.findFirst();
    expect(contaTeste).not.toBeNull();

    if (contaTeste) {
      const dataOriginal = contaTeste.atualizadoEm;
      const dataNova = new Date("2026-09-24T20:00:00.000Z");

      await prisma.contaComercial.update({
        where: { id: contaTeste.id },
        data: { atualizadoEm: dataNova },
      });

      // Valida que o Prisma leu a mutação no banco temporário de teste
      const contaAposUpdate = await prisma.contaComercial.findUnique({
        where: { id: contaTeste.id },
      });
      expect(contaAposUpdate?.atualizadoEm.toISOString()).toBe(dataNova.toISOString());

      // Reverte a alteração no banco temporário
      await prisma.contaComercial.update({
        where: { id: contaTeste.id },
        data: { atualizadoEm: dataOriginal },
      });
    }

    // Comprova que dev.db continuou 100% inalterado byte a byte
    const hashDevDepois = calcularHashArquivo(devDbPath);
    expect(hashDevDepois).toBe(hashDevAntes);
  });
});
