import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    pool: "forks",
    // Vitest 4: replaces deprecated poolOptions.forks.singleFork.
    // Forces sequential test-file execution so the integration tests
    // share a single local Supabase without contention.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
