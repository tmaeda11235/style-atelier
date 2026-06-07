/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: /^url:(.*)$/,
        replacement: "$1"
      }
    ]
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "tests/e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "src/style.css",
        "assets/**",
        "tests/mocks/**",
        "vitest.config.ts",
        "vitest.setup.ts",
        "playwright.config.ts"
      ],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 60,
        lines: 65
      }
    }
  }
})
