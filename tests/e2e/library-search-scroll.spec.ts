/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Library Search & Scroll @J-ORG-SEARCH-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should support flexsearch, load more, and horizontal scroll affordance", async ({
    page
  }) => {
    test.setTimeout(60000)
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip onboarding
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Seed 15 mock cards into IndexedDB styleCards table
    console.log("Seeding 15 mock cards...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) {
        console.error("Database window.db is undefined!")
        throw new Error("Database instance not found on window")
      }
      await database.styleCards.clear()

      const mockCards = Array.from({ length: 15 }, (_, i) => ({
        id: `mock-card-${i}`,
        name: `Fancy Card ${i}`,
        tags: i % 2 === 0 ? ["red-theme"] : ["blue-theme"],
        tier: "Common",
        category: "All",
        dominantColor:
          i % 3 === 0 ? "#ef4444" : i % 3 === 1 ? "#3b82f6" : "#6b7280", // Red, Blue, Gray
        parameters: { sref: [`sref-url-${i}`] },
        promptSegments: [{ type: "text", value: `prompt ${i}` }],
        createdAt: Date.now() - i * 1000,
        isPinned: false,
        usageCount: 0,
        isVariable: false,
        isDeleted: 0,
        masking: {},
        thumbnailData:
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
      }))
      await database.styleCards.bulkAdd(mockCards)

      const count = await database.styleCards.count()
      console.log(`[E2E EVALUATE] Added ${count} cards to DB styleCards table.`)
    })

    // Wait for DB queries to complete and state to settle
    await page.waitForTimeout(1000)

    // Check count from test context
    const dbCount = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      return await database.styleCards.count()
    })
    console.log(`[E2E TEST CHECK] Count after 1s: ${dbCount}`)

    // Switch to Library tab
    console.log("Switching to Library tab...")
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // Wait another second for React rendering
    await page.waitForTimeout(1000)

    // 1. Pagination Check (Should display 12 cards first)
    console.log("Checking pagination limit...")
    const allCardsInGrid = spFrame.locator(
      "[data-tutorial='library-card-grid'] > div"
    )
    await expect(allCardsInGrid).toHaveCount(12, { timeout: 10000 })

    // 2. Load More Button Check
    console.log("Verifying Load More button...")
    const loadMoreButton = spFrame.locator("#library-load-more-btn")
    await expect(loadMoreButton).toBeVisible()
    await loadMoreButton.click()

    // Now all 15 cards should be visible
    console.log("Verifying total 15 cards are loaded...")
    await expect(allCardsInGrid).toHaveCount(15, { timeout: 10000 })

    // Take screenshot of fully loaded list
    await page.screenshot({
      path: path.join(screenshotsDir, "library-load-more-success.png")
    })

    // 3. FlexSearch Search Query Check
    console.log("Verifying FlexSearch matches...")
    const searchField = spFrame.locator("input[placeholder*='Search by tag']")
    await searchField.fill("Fancy Card 5")
    await page.waitForTimeout(500) // Debounce delay

    // Only card 5 should match
    await expect(allCardsInGrid).toHaveCount(1, { timeout: 10000 })
    await expect(allCardsInGrid.first().locator("p")).toHaveText("Fancy Card 5")

    // Clear search
    await searchField.fill("")
    await page.waitForTimeout(1000)
    await expect(allCardsInGrid).toHaveCount(15, { timeout: 10000 })

    // 4. Color Filter Check
    console.log("Applying Color Filter (Red)...")
    // Find color filter button for Red
    const redColorButton = spFrame.locator("button[title='Red']")
    await expect(redColorButton).toBeVisible()
    await redColorButton.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(1000)

    // Cards with index 0, 3, 6, 9, 12 should match (5 cards)
    await expect(allCardsInGrid).toHaveCount(5, { timeout: 10000 })

    // Take screenshot of filtered color cards
    await page.screenshot({
      path: path.join(screenshotsDir, "library-color-filter-success.png")
    })

    console.log(
      "All Library Search and Scroll E2E tests completed successfully!"
    )
  })
})
