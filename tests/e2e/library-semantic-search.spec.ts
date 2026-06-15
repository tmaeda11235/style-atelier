import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - AI Semantic Search @J-ORG-SEMANTIC-SEARCH-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should show warning modal when AI model is not downloaded", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.addInitScript(() => {
      localStorage.removeItem("mock-webllm-downloaded")
    })
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip onboarding
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()
    await page.waitForTimeout(1000)

    // Ensure model is not downloaded in mock
    await page.evaluate(() => {
      localStorage.removeItem("mock-webllm-downloaded")
    })

    // Click AI Semantic Search Toggle
    const aiToggleBtn = spFrame.locator("#ai-search-toggle-btn")
    await expect(aiToggleBtn).toBeVisible()
    await aiToggleBtn.click()
    await page.waitForTimeout(500)

    // Check if Model Not Loaded warning modal is visible
    const warningModal = spFrame.locator(
      "text=/Local AI Model not loaded|ローカルAIモデルがロードされていません/"
    )
    await expect(warningModal).toBeVisible()

    // Take screenshot of warning modal
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "library-semantic-search-model-warning.png"
      )
    })

    // Close modal
    const cancelBtn = spFrame.locator(
      "button:has-text('Cancel'), button:has-text('キャンセル')"
    )
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()
    await page.waitForTimeout(300)
    await expect(warningModal).not.toBeVisible()
  })

  test("should parse query and apply filters dynamically", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.addInitScript(() => {
      localStorage.setItem("mock-webllm-downloaded", "true")
    })
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip onboarding
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()
    await page.waitForTimeout(1000)

    // Seed mock cards into IndexedDB styleCards table after initial sandbox seeding is completed
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) {
        throw new Error("Database instance not found on window")
      }
      await database.styleCards.clear()

      const mockCards = [
        {
          id: "card-style-1",
          name: "Style Card 1",
          tags: ["anime"],
          tier: "Legendary",
          category: "style", // "Style"
          dominantColor: "#3b82f6", // Blue
          parameters: { sref: [] },
          promptSegments: [{ type: "text", value: "anime" }],
          createdAt: Date.now(),
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        },
        {
          id: "card-effect-1",
          name: "Effect Card 1",
          tags: ["anime"],
          tier: "Common",
          category: "other", // "Other"
          dominantColor: "#ef4444", // Red
          parameters: { sref: [] },
          promptSegments: [{ type: "text", value: "anime" }],
          createdAt: Date.now() - 1000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        }
      ]
      await database.styleCards.bulkAdd(mockCards)
    })

    // Click AI Semantic Search Toggle
    const aiToggleBtn = spFrame.locator("#ai-search-toggle-btn")
    await expect(aiToggleBtn).toBeVisible()
    await aiToggleBtn.click()
    await page.waitForTimeout(1000) // wait for webllm hooks to update state to ready

    // Verify AI placeholder is active
    const searchField = spFrame.locator("#library-search-input")
    const placeholder = await searchField.getAttribute("placeholder")
    expect(placeholder).toMatch(/Ask AI:|AIに尋ねる:/)

    // Fill query
    await searchField.fill("Legendary blue anime style")

    // Wait for debounce and processing
    await page.waitForTimeout(1500)

    // Extracted filter badge should be displayed
    const extractedFiltersBadge = spFrame.locator(
      "text=/Extracted Filters|抽出されたフィルター/"
    )
    await expect(extractedFiltersBadge).toBeVisible()

    // Check specific filter items
    await expect(spFrame.locator("text=Rarity: Legendary")).toBeVisible()
    await expect(spFrame.locator("text=Color: Blue")).toBeVisible()
    await expect(spFrame.locator("text=Category: Style")).toBeVisible()
    await expect(spFrame.locator('text=Keyword: "anime"')).toBeVisible()

    // Verify that only the card matching Style category, Legendary rarity, Blue color is shown
    await expect(spFrame.locator("text=Style Card 1")).toBeVisible()
    await expect(spFrame.locator("text=Effect Card 1")).not.toBeVisible()

    // Take screenshot of successful parsing UI
    await page.screenshot({
      path: path.join(screenshotsDir, "library-semantic-search-success.png")
    })

    // Untoggle AI search and verify states are reset
    await aiToggleBtn.click()
    await page.waitForTimeout(500)
    await expect(extractedFiltersBadge).not.toBeVisible()
    const normalPlaceholder = await searchField.getAttribute("placeholder")
    expect(normalPlaceholder).toMatch(/Search by tag|タグ、名前/)
  })

  test("should parse Japanese query and apply filters dynamically in Japanese mode", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.addInitScript(() => {
      localStorage.setItem("style-atelier-language", "ja")
      localStorage.setItem("mock-webllm-downloaded", "true")
    })
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip onboarding
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()
    await page.waitForTimeout(1000)

    // Seed mock cards into IndexedDB styleCards table after initial sandbox seeding is completed
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) {
        throw new Error("Database instance not found on window")
      }
      await database.styleCards.clear()

      const mockCards = [
        {
          id: "card-style-1",
          name: "Style Card 1",
          tags: ["anime", "アニメ"],
          tier: "Legendary",
          category: "style", // "Style"
          dominantColor: "#3b82f6", // Blue
          parameters: { sref: [] },
          promptSegments: [{ type: "text", value: "anime" }],
          createdAt: Date.now(),
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        },
        {
          id: "card-effect-1",
          name: "Effect Card 1",
          tags: ["anime"],
          tier: "Common",
          category: "other", // "Other"
          dominantColor: "#ef4444", // Red
          parameters: { sref: [] },
          promptSegments: [{ type: "text", value: "anime" }],
          createdAt: Date.now() - 1000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        }
      ]
      await database.styleCards.bulkAdd(mockCards)
    })

    // Click AI Semantic Search Toggle
    const aiToggleBtn = spFrame.locator("#ai-search-toggle-btn")
    await expect(aiToggleBtn).toBeVisible()
    await aiToggleBtn.click()
    await page.waitForTimeout(1000) // wait for webllm hooks to update state to ready

    // Verify AI placeholder is active
    const searchField = spFrame.locator("#library-search-input")
    const placeholder = await searchField.getAttribute("placeholder")
    expect(placeholder).toMatch(/AIに尋ねる:/)

    // Fill Japanese query
    await searchField.fill("伝説の青のアニメスタイル")

    // Wait for debounce and processing
    await page.waitForTimeout(1500)

    // Extracted filter badge should be displayed in Japanese
    const extractedFiltersBadge = spFrame.locator("text=抽出されたフィルター:")
    await expect(extractedFiltersBadge).toBeVisible()

    // Check specific filter items
    await expect(spFrame.locator("text=Rarity: Legendary")).toBeVisible()
    await expect(spFrame.locator("text=Color: Blue")).toBeVisible()
    await expect(spFrame.locator("text=Category: Style")).toBeVisible()
    await expect(spFrame.locator('text=Keyword: "アニメ"')).toBeVisible()

    // Verify that only the card matching Style category, Legendary rarity, Blue color is shown
    await expect(spFrame.locator("text=Style Card 1")).toBeVisible()
    await expect(spFrame.locator("text=Effect Card 1")).not.toBeVisible()

    // Take screenshot of successful parsing UI in Japanese
    await page.screenshot({
      path: path.join(screenshotsDir, "library-semantic-search-success-ja.png")
    })

    // Untoggle AI search and verify states are reset
    await aiToggleBtn.click()
    await page.waitForTimeout(500)
    await expect(extractedFiltersBadge).not.toBeVisible()
    const normalPlaceholder = await searchField.getAttribute("placeholder")
    expect(normalPlaceholder).toMatch(/タグ、名前/)
  })
})
