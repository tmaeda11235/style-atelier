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

    // Click Filters toggle button to expand the accordion and verify category is applied
    const toggleFiltersBtn = spFrame.locator("#toggle-filters-btn")
    await expect(toggleFiltersBtn).toBeVisible()
    await toggleFiltersBtn.click()
    await page.waitForTimeout(500)

    // Verify "Style" category button (matches ID "category-1") is selected (has bg-blue-600 class)
    const styleCategoryBtn = spFrame.locator("button:has-text('Style')")
    await expect(styleCategoryBtn).toBeVisible()
    await expect(styleCategoryBtn).toHaveClass(/bg-blue-600/)

    // Take screenshot of successful parsing UI with expanded filters
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
