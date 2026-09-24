import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const sharedDir = fileURLToPath(new URL("../shared/", import.meta.url))

// Realtime server tests. PORT=0 is injected before the module evaluates so the
// integration suite boots the real Socket.IO server on a random free port per
// worker instead of colliding with the dev instance on 3001.
export default defineConfig({
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
  test: {
    environment: "node",
    include: ["*.test.ts"],
    env: {
      PORT: "0",
    },
  },
})