import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: /^url:~src\/offscreen\.html$/,
        replacement: path.resolve(__dirname, "./tests/mocks/mockHtml.ts")
      },
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
    testTimeout: 15000,
    include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.ts"],
    exclude: [
      "node_modules",
      "dist",
      ".idea",
      ".git",
      ".cache",
      "tests/e2e",
      ".stryker-tmp/**"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
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
        statements: 80,
        branches: 65,
        functions: 75,
        lines: 80
      }
    }
  }
})
