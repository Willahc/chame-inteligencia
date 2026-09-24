import fs from "node:fs";
import path from "node:path";

const PRISMA_DIR = path.resolve(process.cwd(), "prisma");
const TEST_DIR = path.resolve(PRISMA_DIR, ".test");
const DEV_DB = path.resolve(PRISMA_DIR, "dev.db");
const TEST_DB = path.resolve(TEST_DIR, "test.db");

export function setup() {
  if (!fs.existsSync(DEV_DB)) {
    throw new Error(`[ERRO CRÍTICO] Banco dev.db não encontrado em: ${DEV_DB}`);
  }

  // Cria o diretório .test isolado
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Limpa artefatos temporários residuais
  for (const file of fs.readdirSync(TEST_DIR)) {
    try {
      fs.unlinkSync(path.join(TEST_DIR, file));
    } catch {
      // Ignora se travado temporariamente
    }
  }

  // Cria réplica descartável exata do banco canônico para execução da suíte
  fs.copyFileSync(DEV_DB, TEST_DB);

  // Configura a variável no processo principal
  process.env.DATABASE_URL = "file:./.test/test.db";
}

export function teardown() {
  // Descarte do banco e diretório temporário após a suíte
  if (fs.existsSync(TEST_DIR)) {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // No Windows, arquivos com handles recentes podem demorar alguns milissegundos para serem liberados.
      // O próximo setup garante a limpeza completa.
    }
  }
}
