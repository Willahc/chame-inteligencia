import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: [fileURLToPath(new URL("./src/test/global-setup.ts", import.meta.url))],
    setupFiles: [fileURLToPath(new URL("./src/test/setup-test-db.ts", import.meta.url))],
    env: {
      DATABASE_URL: "file:./.test/test.db",
    },
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});

