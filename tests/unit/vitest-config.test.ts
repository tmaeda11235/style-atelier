import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("Vitest Configuration & Coverage Exception Check Script", () => {
  it("should have correct reportsDirectory resolving dynamically based on CI env", async () => {
    const configModule = await import("../../vitest.config")
    const config = configModule.default

    expect(config.test).toBeDefined()
    expect(config.test.coverage).toBeDefined()

    const originalCI = process.env.CI
    try {
      if (originalCI) {
        expect(config.test.coverage.reportsDirectory).toBe("./coverage")
      } else {
        expect(config.test.coverage.reportsDirectory).toBe("./coverage-qa")
      }
    } finally {
      process.env.CI = originalCI
    }
  })

  it("should validate check-vitest-coverage-exceptions.js behavior", () => {
    const scriptPath = path.resolve(
      __dirname,
      "../../scripts/check-vitest-coverage-exceptions.js"
    )

    // Create temporary directory for test fixtures
    const tempDir = path.resolve(__dirname, "temp-fixtures")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }

    try {
      // Scenario A: Valid configuration with process.env.CI dynamic expression
      const validConfigContent = `
        import { defineConfig } from "vitest/config"
        export default defineConfig({
          test: {
            coverage: {
              reportsDirectory: process.env.CI ? "./coverage" : "./coverage-qa",
              exclude: ["node_modules/**"],
              thresholds: { statements: 80 }
            }
          }
        })
      `

      // Scenario B: Invalid configuration (lowered threshold and extra exclude)
      const invalidConfigContent = `
        import { defineConfig } from "vitest/config"
        export default defineConfig({
          test: {
            coverage: {
              reportsDirectory: process.env.CI ? "./coverage" : "./coverage-qa",
              exclude: ["node_modules/**", "src/new-exception.ts"],
              thresholds: { statements: 70 }
            }
          }
        })
      `

      // Scenario C: Valid static configuration (direct "./coverage")
      const validStaticConfigContent = `
        import { defineConfig } from "vitest/config"
        export default defineConfig({
          test: {
            coverage: {
              reportsDirectory: "./coverage",
              exclude: ["node_modules/**"],
              thresholds: { statements: 80 }
            }
          }
        })
      `

      const validFile = path.join(tempDir, "vitest.valid.config.ts")
      const invalidFile = path.join(tempDir, "vitest.invalid.config.ts")
      const validStaticFile = path.join(tempDir, "vitest.validstatic.config.ts")

      fs.writeFileSync(validFile, validConfigContent, "utf8")
      fs.writeFileSync(invalidFile, invalidConfigContent, "utf8")
      fs.writeFileSync(validStaticFile, validStaticConfigContent, "utf8")

      // Run the script with valid config. Comparing against valid config (itself) to skip threshold check errors.
      let errOccurred = false
      try {
        execSync(`node "${scriptPath}" "${validFile}" "${validFile}"`, {
          stdio: "pipe"
        })
      } catch (e: any) {
        errOccurred = true
        console.error(
          "Scenario A failed:",
          e.stdout?.toString(),
          e.stderr?.toString()
        )
      }
      expect(errOccurred).toBe(false)

      // Run with static valid config.
      errOccurred = false
      try {
        execSync(
          `node "${scriptPath}" "${validStaticFile}" "${validStaticFile}"`,
          { stdio: "pipe" }
        )
      } catch (e: any) {
        errOccurred = true
        console.error(
          "Scenario B failed:",
          e.stdout?.toString(),
          e.stderr?.toString()
        )
      }
      expect(errOccurred).toBe(false)

      // Run with invalid config. Comparing against valid config to trigger errors.
      errOccurred = false
      try {
        execSync(`node "${scriptPath}" "${invalidFile}" "${validFile}"`, {
          stdio: "pipe"
        })
      } catch (e: any) {
        errOccurred = true
      }
      expect(errOccurred).toBe(true)
    } finally {
      // Cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })
})
