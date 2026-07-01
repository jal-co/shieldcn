/**
 * shieldcn web
 * vitest.config
 */

import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
})
