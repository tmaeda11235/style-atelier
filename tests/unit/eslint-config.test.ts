import { describe, expect, it } from "vitest"

// @ts-ignore - Importing config JS directly
import eslintConfig from "../../eslint.config.mjs"

describe("ESLint Configuration", () => {
  it("should have strict rules by default in main app files", () => {
    const mainConfig = eslintConfig.find(
      (cfg: any) => cfg.files && cfg.files.includes("src/**/*.{ts,tsx,js,jsx}")
    )
    expect(mainConfig).toBeDefined()

    // Check default rules are set to error
    expect(mainConfig.rules["max-lines"]).toEqual([
      "error",
      { max: 300, skipBlankLines: true, skipComments: true }
    ])
    expect(mainConfig.rules["max-lines-per-function"]).toEqual([
      "error",
      { max: 50, skipBlankLines: true, skipComments: true }
    ])
    expect(mainConfig.rules["sonarjs/cognitive-complexity"]).toEqual([
      "error",
      15
    ])

    // Check boundaries rules
    expect(mainConfig.rules["boundaries/dependencies"][0]).toBe("error")
  })

  it("should override rules to warn only for explicitly allowed pre-existing files", () => {
    // Find overrides
    const maxLinesOverride = eslintConfig.find(
      (cfg: any) => cfg.rules && cfg.rules["max-lines"] === "warn"
    )
    expect(maxLinesOverride).toBeDefined()
    // It should not be a general wildcard
    expect(maxLinesOverride.files).not.toContain("src/components/**/*.{ts,tsx}")
    expect(maxLinesOverride.files).not.toContain("src/hooks/**/*.{ts,tsx}")
    // It should be a specific list of pre-existing files
    expect(maxLinesOverride.files.length).toBeGreaterThan(0)

    const complexityOverride = eslintConfig.find(
      (cfg: any) =>
        cfg.rules && cfg.rules["sonarjs/cognitive-complexity"] === "warn"
    )
    expect(complexityOverride).toBeDefined()
    expect(complexityOverride.files).not.toContain(
      "src/components/**/*.{ts,tsx}"
    )
    expect(complexityOverride.files).not.toContain("src/hooks/**/*.{ts,tsx}")

    const funcLinesOverride = eslintConfig.find(
      (cfg: any) => cfg.rules && cfg.rules["max-lines-per-function"] === "warn"
    )
    expect(funcLinesOverride).toBeDefined()
    expect(funcLinesOverride.files).not.toContain(
      "src/components/**/*.{ts,tsx}"
    )
    expect(funcLinesOverride.files).not.toContain("src/hooks/**/*.{ts,tsx}")
  })

  it("should disable complexity and architecture rules for test files", () => {
    // Find test override
    const testConfig = eslintConfig.find(
      (cfg: any) => cfg.files && cfg.files.includes("**/*.test.{ts,tsx,js,jsx}")
    )
    expect(testConfig).toBeDefined()
    expect(testConfig.rules["max-lines"]).toBe("off")
    expect(testConfig.rules["max-lines-per-function"]).toBe("off")
    expect(testConfig.rules["sonarjs/cognitive-complexity"]).toBe("off")
    expect(testConfig.rules["boundaries/dependencies"]).toBe("off")
  })

  it("should enforce i18n literal checks for fully-translated files", () => {
    const i18nConfig = eslintConfig.find(
      (cfg: any) =>
        cfg.files &&
        cfg.files.includes("src/components/molecules/DeleteConfirmModal.tsx")
    )
    expect(i18nConfig).toBeDefined()
    expect(i18nConfig.rules["i18next/no-literal-string"]).toBeDefined()

    const [severity, options] = i18nConfig.rules["i18next/no-literal-string"]
    expect(severity).toBe("error")
    expect(options.mode).toBe("jsx-only")
    expect(options["jsx-attributes"].exclude).toContain("className")
    expect(options["jsx-attributes"].exclude).toContain("variant")
    expect(options.words.exclude).toContain("[0-9!-/:-@[-`{-~]+")

    // Verify newly added components in this task are covered
    const newComponents = [
      "src/components/organisms/SettingsTab.tsx",
      "src/features/minting/components/MintingView.tsx",
      "src/features/card-detail/components/CardDetailView.tsx",
      "src/components/organisms/Workbench.tsx",
      "src/features/tutorial/components/InteractiveTutorial.tsx"
    ]
    for (const comp of newComponents) {
      const compConfig = eslintConfig.find(
        (cfg: any) =>
          cfg.files &&
          cfg.files.includes(comp) &&
          cfg.rules &&
          cfg.rules["i18next/no-literal-string"]
      )
      expect(compConfig).toBeDefined()
    }
  })
})
