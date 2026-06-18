import fs from "fs"
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Extension Manifest & Locale Files Metadata Verification @J-SYS-04", () => {
  const prodBuildDir = path.join(__dirname, "../../build/chrome-mv3-prod")
  const devBuildDir = path.join(__dirname, "../../build/chrome-mv3-dev")

  // Choose the build folder that exists; fallback to dev if prod is not built yet
  const buildDir = fs.existsSync(prodBuildDir) ? prodBuildDir : devBuildDir

  test("should have default_locale and correctly referenced localized metadata in manifest", async () => {
    const manifestPath = path.join(buildDir, "manifest.json")
    expect(fs.existsSync(manifestPath)).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))

    // Verify critical metadata keys are mapped to i18n variables
    expect(manifest.name).toBe("__MSG_extName__")
    expect(manifest.description).toBe("__MSG_extDescription__")
    expect(manifest.default_locale).toBe("ja")
  })

  test("should have valid ja and en locale files with extName and extDescription defined", async () => {
    const localesDir = path.join(buildDir, "_locales")
    expect(fs.existsSync(localesDir)).toBe(true)

    const jaMessagesPath = path.join(localesDir, "ja/messages.json")
    const enMessagesPath = path.join(localesDir, "en/messages.json")

    expect(fs.existsSync(jaMessagesPath)).toBe(true)
    expect(fs.existsSync(enMessagesPath)).toBe(true)

    const jaMessages = JSON.parse(fs.readFileSync(jaMessagesPath, "utf-8"))
    const enMessages = JSON.parse(fs.readFileSync(enMessagesPath, "utf-8"))

    // Check Japanese definitions
    expect(jaMessages.extName).toBeDefined()
    expect(jaMessages.extName.message).toContain("Style Atelier")
    expect(jaMessages.extDescription).toBeDefined()
    expect(jaMessages.extDescription.message).toContain("Midjourney")

    // Check English definitions
    expect(enMessages.extName).toBeDefined()
    expect(enMessages.extName.message).toContain("Style Atelier")
    expect(enMessages.extDescription).toBeDefined()
    expect(enMessages.extDescription.message).toContain("Midjourney")
  })
})
