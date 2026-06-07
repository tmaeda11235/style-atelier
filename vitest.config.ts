/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
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
        "playwright.config.ts",
        "src/components/**",
        "src/contexts/**",
        "src/hooks/**",
        "src/lib/db.ts",
        "src/lib/image-utils.ts",
        "src/lib/google-drive.ts",
        "src/lib/qr-utils.ts",
        "src/contents/**"
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
})
