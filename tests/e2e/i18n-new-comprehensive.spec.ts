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

    // Resize sidepanel frame to show the developer dashboard
    await page.evaluate(() => {
      const iframe = document.getElementById("sidepanel-frame")
      if (iframe) {
        iframe.style.width = "1200px"
      }
    })

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
    // Wait for iframe content to render before resizing to avoid width reset by initial CSS load
    await spFrame
      .locator("#settings-nav-btn")
      .waitFor({ state: "attached", timeout: 15000 })
    await page.evaluate(() => {
      const iframe = document.getElementById("sidepanel-frame")
      if (iframe) {
        iframe.style.width = "1200px"
      }
    })
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings and Switch to English (en) initially
    console.log("Setting language to English in Settings...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("en")
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

    // Seed 1 card with slot and 1 helper hand card to view parameter labels in Workbench
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.slotHistory.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-comprehensive-i18n-1",
          name: "Test Parameter Card",
          promptSegments: [
            { type: "text", value: "a " },
            { type: "slot", label: "adjective", default: "neon" },
            { type: "text", value: " cyberpunk cat" }
          ],
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
        },
        {
          id: "card-comprehensive-i18n-2",
          name: "Quick Fill Card",
          promptSegments: [{ type: "text", value: "vibrant colors" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true, // Keep in hand to trigger "Fill from Workbench:"
          dominantColor: "#10b981",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
          usageCount: 1
        }
      ])
      await database.saveSlotHistory("adjective", ["retro", "futuristic"])
    })

    // Click library card to pin/workbench
    const cardElement = spFrame.locator("p:has-text('Test Parameter Card')")
    await expect(cardElement).toBeVisible()
    await cardElement.click()
    await workbenchTab.click()
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

    // Verify slot variable labels in English
    const slotInput = spFrame.locator("[data-testid='slot-input-adjective']")
    await slotInput.focus()

    const popover = spFrame.locator(".absolute.left-0.right-0.top-full")
    const fillFromWorkbenchLabel = popover.locator("div", {
      hasText: /^Fill from Workbench:$/
    })
    const recentLabel = popover.locator("div", { hasText: /^Recent:$/ })
    await expect(fillFromWorkbenchLabel).toBeVisible()
    await expect(recentLabel).toBeVisible()

    // Blur input
    await slotInput.blur()

    // Take screenshot of English comprehensive layout
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-comprehensive-en.png")
    })
    console.log("English comprehensive layout screenshot saved.")

    // Switch to Library tab to verify filters and onboarding (English)
    await libraryTab.click()
    const toggleFiltersBtn = spFrame.locator("#toggle-filters-btn")
    await expect(toggleFiltersBtn).toBeVisible()
    await toggleFiltersBtn.click()

    const filtersTitle = spFrame.locator("h3:has-text('Detailed Filters')")
    await expect(filtersTitle).toBeVisible()

    const rarityLabel = spFrame.locator("span:has-text('Rarity')")
    await expect(rarityLabel).toBeVisible()

    const categoryLabel = spFrame.locator("span:has-text('Category')")
    await expect(categoryLabel).toBeVisible()

    const raritySelect = spFrame.locator("span:has-text('Rarity') + select")
    const optionCommon = raritySelect.locator("option[value='Common']")
    const optionRare = raritySelect.locator("option[value='Rare']")
    const optionEpic = raritySelect.locator("option[value='Epic']")
    const optionLegendary = raritySelect.locator("option[value='Legendary']")
    await expect(optionCommon).toHaveText("Common")
    await expect(optionRare).toHaveText("Rare")
    await expect(optionEpic).toHaveText("Epic")
    await expect(optionLegendary).toHaveText("Legendary")

    // Verify Onboarding Guide (English)
    await spFrame.locator("[data-testid='close-filters-btn']").click() // Close the filters accordion using the close button
    await spFrame.locator("#test-open-onboarding-btn").scrollIntoViewIfNeeded()
    await spFrame.locator("#test-open-onboarding-btn").dispatchEvent("click") // Open the Onboarding Guide modal via sandbox test button
    const dropHereText = spFrame.locator("span:has-text('Drop Here')")
    await expect(dropHereText).toBeVisible()
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-onboarding-en.png")
    })
    console.log("English onboarding screenshot saved.")

    const closeBtnEn = spFrame.locator("button[aria-label='Close Guide']")
    await closeBtnEn.click()
    await expect(closeBtnEn).not.toBeVisible()

    // 4. Switch to Settings and change to Japanese (ja)
    await settingsNavBtn.click()
    await langSelect.selectOption("ja")
    console.log("Verifying Japanese UI texts...")
    // Tabs and buttons
    const guideBtnJa = spFrame.locator("button[title='ガイドを表示']")
    await expect(guideBtnJa).toBeVisible()

    // Move to Library Tab
    await libraryTab.click()
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
      "select >> option:has-text('ミント日が新しい順')"
    )
    await expect(rarityOptionJa).toBeAttached()
    await expect(sortByNewestJa).toBeAttached()

    // Go to Workbench Tab
    await workbenchTab.click()
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

    // Verify slot variable labels in Japanese
    const slotInputJa = spFrame.locator("[data-testid='slot-input-adjective']")
    await slotInputJa.focus()

    const popoverJa = spFrame.locator(".absolute.left-0.right-0.top-full")
    const fillFromWorkbenchLabelJa = popoverJa.locator("div", {
      hasText: /^ワークベンチから入力:$/
    })
    const recentLabelJa = popoverJa.locator("div", { hasText: /^履歴:$/ })
    await expect(fillFromWorkbenchLabelJa).toBeVisible()
    await expect(recentLabelJa).toBeVisible()

    // Blur input
    await slotInputJa.blur()

    // Take screenshot of Japanese comprehensive layout
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-comprehensive-ja.png")
    })
    console.log("Japanese comprehensive layout screenshot saved.")

    // Switch to Library tab to verify filters and onboarding (Japanese)
    await libraryTab.click()
    await toggleFiltersBtn.click() // Open filters

    const filtersTitleJa = spFrame.locator("h3:has-text('詳細フィルター')")
    await expect(filtersTitleJa).toBeVisible()

    const rarityLabelJa = spFrame.locator("span:has-text('レア度')")
    await expect(rarityLabelJa).toBeVisible()

    const categoryLabelJa = spFrame.locator("span:has-text('カテゴリー')")
    await expect(categoryLabelJa).toBeVisible()

    const raritySelectJa = spFrame.locator("span:has-text('レア度') + select")
    const optionCommonJa = raritySelectJa.locator("option[value='Common']")
    const optionRareJa = raritySelectJa.locator("option[value='Rare']")
    const optionEpicJa = raritySelectJa.locator("option[value='Epic']")
    const optionLegendaryJa = raritySelectJa.locator(
      "option[value='Legendary']"
    )
    await expect(optionCommonJa).toHaveText("コモン")
    await expect(optionRareJa).toHaveText("レア")
    await expect(optionEpicJa).toHaveText("エピック")
    await expect(optionLegendaryJa).toHaveText("レジェンダリー")

    // Verify Onboarding Guide (Japanese)
    await spFrame.locator("[data-testid='close-filters-btn']").click() // Close the filters accordion using the close button
    await spFrame.locator("#test-open-onboarding-btn").scrollIntoViewIfNeeded()
    await spFrame.locator("#test-open-onboarding-btn").dispatchEvent("click") // Open the Onboarding Guide modal via sandbox test button
    const dropHereTextJa = spFrame.locator("span:has-text('ここにドロップ')")
    await expect(dropHereTextJa).toBeVisible()
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-onboarding-ja.png")
    })
    console.log("Japanese onboarding screenshot saved.")

    const closeBtnJa = spFrame.locator("button[aria-label='Close Guide']")
    await closeBtnJa.click()
    await expect(closeBtnJa).not.toBeVisible()
  })
})
