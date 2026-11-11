import { defineConfig } from "vitest/config";
import "dotenv/config";
const url = new URL(process.env["DATABASE_URL"] ?? "postgresql://localhost/ambs_hub");
url.pathname = "/ambs_hub_test";
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: url.toString(),
      APP_ORIGIN: "http://localhost:3000",
      TOKEN_ENCRYPTION_KEY: "a".repeat(64),
      GOOGLE_CLIENT_ID: "test-client",
      GOOGLE_CLIENT_SECRET: "test-secret",
    },
  },
});
