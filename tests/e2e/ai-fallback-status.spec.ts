import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - AI Fallback & Status Badges @J-AI-FALLBACK-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should support automatic fallback and show status badge in library search & blending", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for AI Fallback E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Add sample cards to DB
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-fallback-1",
          name: "Cyberpunk Glow",
          promptSegments: [{ type: "text", value: "neon cyberpunk city" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-fallback-2",
          name: "Watercolor Rain",
          promptSegments: [
            { type: "text", value: "rainy street, watercolor style" }
          ],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // 3. Test Library Search Fallback
    // Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()
    await page.waitForTimeout(1000)

    // Ensure AI model is mocked as "idle" (not downloaded)
    await spFrame.locator("body").evaluate(async () => {
      localStorage.setItem("mock-webllm-downloaded", "false")
    })

    // Toggle AI Search
    const aiSearchToggle = spFrame.locator("#ai-search-toggle-btn")
    await expect(aiSearchToggle).toBeVisible()
    await aiSearchToggle.click()

    // Status Badge should show "AI: Light Mode"
    const statusBadge = spFrame
      .locator("[data-testid='ai-status-badge-container']")
      .first()
    await expect(statusBadge).toBeVisible({ timeout: 5000 })
    await expect(statusBadge).toContainText(/AI: (Light Mode|軽量モード)/)

    // Verify hover tooltip content
    const tooltip = spFrame
      .locator("[data-testid='ai-status-badge-tooltip']")
      .first()
    await statusBadge.hover()
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText(/(FlexSearch|Light Mode|軽量モード)/)

    // Perform query which should trigger fallback keyword search
    const searchInput = spFrame.locator("#library-search-input")
    await searchInput.fill("cyberpunk")
    await page.waitForTimeout(1000)

    // Take a screenshot of the search fallback in action
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-search-fallback-active.png")
    })
    console.log("AI Search Fallback screenshot saved.")

    // 4. Test Blending Advice Fallback
    // Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000)

    // Verify AI Advice Section is visible (since there are 2 cards pinned)
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible({ timeout: 5000 })

    // Verify badge is visible on Blending section header (showing Light Mode)
    const blendStatusBadge = adviceSection
      .locator("[data-testid='ai-status-badge-container']")
      .first()
    await expect(blendStatusBadge).toBeVisible()
    await expect(blendStatusBadge).toContainText(/AI: (Light Mode|軽量モード)/)

    // Expand the advice section accordion
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click()
    await page.waitForTimeout(1000)

    // Advice content should show fallback static rules advice instead of loading error
    const adviceContent = adviceSection.locator(".prose")
    await expect(adviceContent).toBeVisible({ timeout: 5000 })
    await expect(adviceContent).toContainText(
      /(Recipe Advice|レシピ調合アドバイス)/
    )

    // Take a screenshot of the blending advice fallback in action
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-blending-fallback-active.png")
    })
    console.log("AI Blending Fallback screenshot saved.")
  })
})
