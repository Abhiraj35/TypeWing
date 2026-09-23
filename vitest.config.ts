import { defineConfig } from "vitest/config"

// Client package tests: pure logic modules only (no components, no E2E).
// The server package keeps its own vitest config and runs from server/.
export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["lib/**/*.test.ts", "shared/**/*.test.ts"],
  },
})