import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Expert Help Tooltips @J-SYS-02", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed localStorage to prevent onboarding welcome dialog overlays from interrupting tests
    await page.addInitScript(() => {
      window.localStorage.setItem("style-atelier-onboarding-seen", "true")
    })
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should toggle expert features and display help tooltips on hover", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Expert Help Tooltips E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Clear database (especially userSettings) to ensure we start in expert mode (not easy mode)
    console.log("Clearing database to reset to default settings...")
    try {
      await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        if (database) {
          await database.userSettings.clear()
          await database.styleCards.clear()
          await database.historyItems.clear()
        }
      })
      await page.reload()
    } catch (err) {
      console.log("Failed to clear DB or reload, proceeding anyway:", err)
    }

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Toggle Expert Mode and all features ON
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // Ensure UI Preferences accordion is expanded
    const uiAccordionHeader = spFrame.locator("#settings-accordion-ui")
    await expect(uiAccordionHeader).toBeVisible()
    const firstToggle = spFrame.locator("#expert-feature-stack-btn")
    if (!(await firstToggle.isVisible().catch(() => false))) {
      await uiAccordionHeader.click()
    }

    // Ensure all expert toggles are checked
    const toggles = [
      "stack",
      "slot",
      "rarity",
      "tags",
      "categories",
      "multicard",
      "cardediting",
      "multiimage"
    ]
    for (const toggleId of toggles) {
      const btn = spFrame.locator(`#expert-feature-${toggleId}-btn`)
      await expect(btn).toBeVisible({ timeout: 10000 })
      const className = (await btn.getAttribute("class")) || ""
      if (!className.includes("bg-blue-600")) {
        await btn.click()
      }
    }
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()

      // Add two cards so we can test "Merge Stack"
      await database.styleCards.add({
        id: "expert-card-1",
        name: "Expert Card A",
        promptSegments: [
          { type: "text", value: "cyberpunk skyline" },
          { type: "slot", label: "Object", default: "car" }
        ],
        parameters: { ar: "16:9" },
        masking: {},
        tier: "Rare",
        isPinned: true,
        dominantColor: "#3b82f6",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='blue'/></svg>",
        images: [
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='blue'/></svg>"
        ],
        selectedThumbnails: [
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='blue'/></svg>"
        ]
      })

      await database.styleCards.add({
        id: "expert-card-2",
        name: "Expert Card B",
        promptSegments: [{ type: "text", value: "neon glow" }],
        parameters: {},
        masking: {},
        tier: "Epic",
        isPinned: true,
        dominantColor: "#8b5cf6",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='purple'/></svg>",
        images: [
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='purple'/></svg>"
        ],
        selectedThumbnails: [
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='purple'/></svg>"
        ]
      })
    })

    // Switch back to Library tab to show HandBar before asserting HandBar tooltips
    const libraryNavBtnInitial = spFrame
      .locator(
        "button[title='Library'], nav button:has-text('Library'), nav button:has-text('ライブラリ')"
      )
      .first()
    await expect(libraryNavBtnInitial).toBeVisible()
    await libraryNavBtnInitial.click()

    // Verify HandBar Merge Stack tooltip
    const mergeBtn = spFrame.locator("[data-testid='handbar-merge-btn']")
    await expect(mergeBtn).toBeVisible()
    const mergeTooltipTrigger = spFrame
      .locator("#handbar-root")
      .locator("[data-testid='help-tooltip-trigger']")
      .first()
    await expect(mergeTooltipTrigger).toBeVisible()
    await mergeTooltipTrigger.hover()

    const workbenchNavBtn = spFrame
      .locator(
        "button[title='Workbench'], nav button:has-text('Workbench'), nav button:has-text('ワークベンチ')"
      )
      .first()
    await expect(workbenchNavBtn).toBeVisible({ timeout: 10000 })
    await workbenchNavBtn.click()

    // Verify Workbench has Mixing Mode active (since 2 cards are pinned)
    const mixingHeader = spFrame.locator(
      "h3:has-text('Variation Recipe'), h3:has-text('調合レシピ')"
    )
    await expect(mixingHeader).toBeVisible({ timeout: 10000 })

    // Find the help tooltip next to the mixing recipe header
    const recipeTooltipTrigger = spFrame
      .locator("h3:has-text('Variation Recipe'), h3:has-text('調合レシピ')")
      .locator("[data-testid='help-tooltip-trigger']")
    await expect(recipeTooltipTrigger).toBeVisible()
    await recipeTooltipTrigger.hover()
    const recipeTooltipContent = spFrame
      .locator("[data-testid='help-tooltip-content']")
      .first()
    await expect(recipeTooltipContent).toBeVisible()

    // Take screenshot of Workbench with recipe tooltip open
    await page.screenshot({
      path: path.join(screenshotsDir, "expert-help-workbench-tooltip.png")
    })
    console.log("Workbench tooltip screenshot saved.")

    // Click anywhere else to close hover state
    await spFrame.locator("body").first().click()

    // Verify slot variables section and tooltip
    const slotVariablesHeader = spFrame.locator(
      "h4:has-text('Slot Variables'), h4:has-text('変数スロット')"
    )
    await expect(slotVariablesHeader).toBeVisible()
    const slotTooltipTrigger = slotVariablesHeader.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(slotTooltipTrigger).toBeVisible()

    // HandBar Merge Stack tooltip verification moved to initial Library tab state above

    await page.screenshot({
      path: path.join(screenshotsDir, "expert-help-handbar-tooltip.png")
    })
    console.log("HandBar tooltip screenshot saved.")

    // 6. Navigate to Library Tab and open CardDetailView
    const libraryNavBtn = spFrame
      .locator(
        "button[title='Library'], nav button:has-text('Library'), nav button:has-text('ライブラリ')"
      )
      .first()
    await expect(libraryNavBtn).toBeVisible()
    await libraryNavBtn.click()

    const cardElement = spFrame.locator("text=Expert Card A").first()
    await expect(cardElement).toBeVisible()

    // Click edit button to open detail view
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // Verify Card Details has opened
    const detailTitle = spFrame.locator(
      "h2:has-text('Card Details'), h2:has-text('カード詳細')"
    )
    await expect(detailTitle).toBeVisible()

    // Verify Tooltips in CardDetails (Card Editing / Identity)
    const identityHeader = spFrame.locator(
      "h3:has-text('Identity'), h3:has-text('カード情報')"
    )
    await expect(identityHeader).toBeVisible()
    const identityTooltip = identityHeader.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(identityTooltip).toBeVisible()

    // Verify Category tooltip in CardDetails
    const categoryLabel = spFrame
      .locator("label:has-text('Category'), label:has-text('カテゴリ')")
      .first()
    await expect(categoryLabel).toBeVisible()
    const categoryTooltip = categoryLabel.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(categoryTooltip).toBeVisible()

    // Verify Tags tooltip in CardDetails
    const tagsLabel = spFrame
      .locator("label:has-text('Tags'), label:has-text('タグ')")
      .first()
    await expect(tagsLabel).toBeVisible()
    const tagsTooltip = tagsLabel.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(tagsTooltip).toBeVisible()

    // Verify Associated Images (Multi-image) tooltip in CardDetails
    const associatedImagesHeader = spFrame.locator(
      "h3:has-text('Associated Images'), h3:has-text('登録済み画像')"
    )
    await expect(associatedImagesHeader).toBeVisible()
    const associatedTooltip = associatedImagesHeader.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(associatedTooltip).toBeVisible()
    await associatedTooltip.hover()

    await page.screenshot({
      path: path.join(screenshotsDir, "expert-help-detail-tooltip.png")
    })
    console.log("Detail view tooltip screenshot saved.")

    // Close the detail view
    const closeBtn = spFrame.locator(
      "button:has-text('Save'), button:has-text('保存')"
    )
    await closeBtn.click()
    await expect(detailTitle).not.toBeVisible()

    // 7. Test MintingView tooltips by going to History and opening Mint Card
    const historyNavBtn = spFrame
      .locator(
        "button[title='History'], nav button:has-text('History'), nav button:has-text('履歴')"
      )
      .first()
    await historyNavBtn.click()

    // Add a mock history item to guarantee we can mint it
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "expert-history-item",
        fullCommand: "a beautiful fantasy landscape --ar 16:9",
        imageUrl:
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='green'/></svg>",
        timestamp: Date.now()
      })
    })

    const mintCardBtn = spFrame
      .locator(
        "button:has-text('Mint Card'), button:has-text('カードをミント')"
      )
      .first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // Verify MintingView is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // Verify MintingView tooltips
    const categoryLabelMint = spFrame
      .locator("label:has-text('Category'), label:has-text('カテゴリ')")
      .first()
    await expect(categoryLabelMint).toBeVisible()
    const categoryTooltipMint = categoryLabelMint.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(categoryTooltipMint).toBeVisible()

    const tagsLabelMint = spFrame
      .locator("label:has-text('Custom Tags'), label:has-text('カスタムタグ')")
      .first()
    await expect(tagsLabelMint).toBeVisible()
    const tagsTooltipMint = tagsLabelMint.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(tagsTooltipMint).toBeVisible()

    const segmentsHeaderMint = spFrame.locator(
      "h3:has-text('Prompt Segments'), h3:has-text('プロンプトセグメント')"
    )
    await expect(segmentsHeaderMint).toBeVisible()
    const segmentsTooltipMint = segmentsHeaderMint.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(segmentsTooltipMint).toBeVisible()

    const rarityHeaderMint = spFrame.locator(
      "h3:has-text('Rarity & Frame'), h3:has-text('レアリティ & フレーム')"
    )
    await expect(rarityHeaderMint).toBeVisible()
    const rarityTooltipMint = rarityHeaderMint.locator(
      "[data-testid='help-tooltip-trigger']"
    )
    await expect(rarityTooltipMint).toBeVisible()
    await rarityTooltipMint.hover()

    await page.screenshot({
      path: path.join(screenshotsDir, "expert-help-minting-tooltip.png")
    })
    console.log("Minting view tooltip screenshot saved.")
  })
})
