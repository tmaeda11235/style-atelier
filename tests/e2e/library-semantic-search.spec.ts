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

  test("should toggle AI search and run in fallback mode when AI model is not downloaded", async ({
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

    // Verify status badge is visible
    const statusBadge = spFrame.locator(
      "text=/AI Fallback|AI軽量フォールバック/"
    )
    await expect(statusBadge).toBeVisible()

    // Verify AI placeholder is active
    const searchField = spFrame.locator("#library-search-input")
    const placeholder = await searchField.getAttribute("placeholder")
    expect(placeholder).toMatch(/Ask AI:|AIに尋ねる:/)

    // Fill query
    await searchField.fill("Legendary blue anime style")

    // Wait for debounce and processing
    await page.waitForTimeout(1500)

    // Extracted filter badge should be displayed using fallback parser
    const extractedFiltersBadge = spFrame.locator(
      "text=/Extracted Filters|抽出されたフィルター/"
    )
    await expect(extractedFiltersBadge).toBeVisible()

    // Check specific filter items extracted by fallback
    await expect(spFrame.locator("text=Rarity: Legendary")).toBeVisible()
    await expect(spFrame.locator("text=Color: Blue")).toBeVisible()
    await expect(spFrame.locator("text=Category: Style")).toBeVisible()

    // Take screenshot of fallback search UI
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "library-semantic-search-fallback-success.png"
      )
    })
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
})
