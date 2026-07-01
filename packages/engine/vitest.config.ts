/**
 * @shieldcn/engine
 * vitest.config
 */

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    environment: "node",
  },
})
