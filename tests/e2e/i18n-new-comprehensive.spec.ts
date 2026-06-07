/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - i18n Comprehensive Localizations @J-SYS-04", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should translate tabs, search, color options, and workbench parameters between English and Japanese", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for comprehensive i18n E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Force Easy Mode to false and configure expert features via localStorage
    // Note: set cardEditing to false to render i18n parameter labels in Workbench
    console.log("Enabling expert features for testing filters...")
    await spFrame.locator("body").evaluate(() => {
      localStorage.setItem("style-atelier-easy-mode", "false")
      localStorage.setItem(
        "style-atelier-expert-features",
        JSON.stringify({
          stack: true,
          slot: true,
          rarity: true,
          tags: true,
          categories: true,
          multiCard: true,
          cardEditing: false,
          multiImage: true
        })
      )
    })
    await page.reload()
    await page.waitForTimeout(1000)

    // Skip welcome dialog again after reload
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings and Switch to English (en) initially
    console.log("Setting language to English in Settings...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("en")
    await page.waitForTimeout(500)

    // 3. Verify English UI texts
    console.log("Verifying English UI texts...")
    // Tabs
    const historyTab = spFrame.locator("button[title='History']")
    const libraryTab = spFrame.locator("button[title='Library']")
    const workbenchTab = spFrame.locator("button[title='Workbench']")
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )

    await expect(historyTab).toBeVisible()
    await expect(libraryTab).toBeVisible()
    await expect(workbenchTab).toBeVisible()
    await expect(guideBtn).toBeVisible()

    // Move to Library Tab
    await libraryTab.click()
    await page.waitForTimeout(500)

    // Search placeholder
    const searchField = spFrame.locator(
      "input[placeholder='Search by tag, name or sref...']"
    )
    await expect(searchField).toBeVisible()

    // Color label
    const colorLabel = spFrame.locator("span:has-text('Color:')")
    await expect(colorLabel).toBeVisible()

    // Rarity and Sort By dropdown options (use toBeAttached because options are hidden inside select)
    const rarityOption = spFrame.locator(
      "select >> option:has-text('All Rarities')"
    )
    const sortByNewest = spFrame.locator("select >> option:has-text('Newest')")
    await expect(rarityOption).toBeAttached()
    await expect(sortByNewest).toBeAttached()

    // Seed 1 card to view parameter labels in Workbench
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-comprehensive-i18n-1",
          name: "Test Parameter Card",
          promptSegments: [{ type: "text", value: "cyberpunk dreamscape" }],
          parameters: {
            ar: "16:9",
            p: ["v6_code"],
            sref: ["1234567"],
            cref: ["http://example.com/char.png"]
          },
          masking: {},
          tier: "Rare",
          isPinned: false, // Seed as unpinned
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
          usageCount: 5
        }
      ])
    })

    // Click library card to pin/workbench
    const cardElement = spFrame.locator("p:has-text('Test Parameter Card')")
    await expect(cardElement).toBeVisible()
    await cardElement.click()
    await page.waitForTimeout(500)

    // Go to Workbench Tab
    await workbenchTab.click()
    await page.waitForTimeout(500)

    // Verify parameter labels in English
    const promptSegmentsHeader = spFrame.locator(
      "span:has-text('Prompt Segments')"
    )
    const aspectRatioLabel = spFrame.locator("span:has-text('Aspect Ratio:')")
    const personalizationLabel = spFrame.locator(
      "span:has-text('Personalization (--p):')"
    )
    const styleRefLabel = spFrame.locator(
      "span:has-text('Style Reference (--sref):')"
    )
    const characterRefLabel = spFrame.locator(
      "span:has-text('Character Reference (--cref):')"
    )

    await expect(promptSegmentsHeader).toBeVisible()
    await expect(aspectRatioLabel).toBeVisible()
    await expect(personalizationLabel).toBeVisible()
    await expect(styleRefLabel).toBeVisible()
    await expect(characterRefLabel).toBeVisible()

    // Take screenshot of English comprehensive layout
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-comprehensive-en.png")
    })
    console.log("English comprehensive layout screenshot saved.")

    // 4. Switch to Settings and change to Japanese (ja)
    await settingsNavBtn.click()
    await page.waitForTimeout(500)
    await langSelect.selectOption("ja")
    await page.waitForTimeout(500)

    // 5. Verify Japanese UI texts
    console.log("Verifying Japanese UI texts...")
    // Tabs and buttons
    const guideBtnJa = spFrame.locator("button[title='ガイドを表示']")
    await expect(guideBtnJa).toBeVisible()

    // Move to Library Tab
    await libraryTab.click()
    await page.waitForTimeout(500)

    // Search placeholder
    const searchFieldJa = spFrame.locator(
      "input[placeholder='タグ、名前、srefで検索...']"
    )
    await expect(searchFieldJa).toBeVisible()

    // Color label
    const colorLabelJa = spFrame.locator("span:has-text('カラー:')")
    await expect(colorLabelJa).toBeVisible()

    // Rarity and Sort By dropdown options (use toBeAttached)
    const rarityOptionJa = spFrame.locator(
      "select >> option:has-text('すべてのレア度')"
    )
    const sortByNewestJa = spFrame.locator(
      "select >> option:has-text('作成日が新しい順')"
    )
    await expect(rarityOptionJa).toBeAttached()
    await expect(sortByNewestJa).toBeAttached()

    // Go to Workbench Tab
    await workbenchTab.click()
    await page.waitForTimeout(500)

    // Verify parameter labels in Japanese
    const promptSegmentsHeaderJa = spFrame.locator(
      "span:has-text('プロンプト要素')"
    )
    const aspectRatioLabelJa = spFrame.locator("span:has-text('アスペクト比:')")
    const personalizationLabelJa = spFrame.locator(
      "span:has-text('パーソナライズ (--p):')"
    )
    const styleRefLabelJa = spFrame.locator(
      "span:has-text('スタイル参照 (--sref):')"
    )
    const characterRefLabelJa = spFrame.locator(
      "span:has-text('キャラクター参照 (--cref):')"
    )

    await expect(promptSegmentsHeaderJa).toBeVisible()
    await expect(aspectRatioLabelJa).toBeVisible()
    await expect(personalizationLabelJa).toBeVisible()
    await expect(styleRefLabelJa).toBeVisible()
    await expect(characterRefLabelJa).toBeVisible()

    // Take screenshot of Japanese comprehensive layout
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-comprehensive-ja.png")
    })
    console.log("Japanese comprehensive layout screenshot saved.")
  })
})
