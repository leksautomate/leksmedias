import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests that touch the database use a separate database and run one file at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ?? "postgres://leks:leks_dev_password@127.0.0.1:5432/leks_test",
      APP_SECRET: "test-secret-test-secret-test-secret-123",
      MAIL_DRIVER: "console",
    },
  },
});
