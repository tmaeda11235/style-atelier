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
        category: undefined,
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

    // Only card 5 should match
    await expect(allCardsInGrid).toHaveCount(1, { timeout: 10000 })
    await expect(allCardsInGrid.first().locator("p")).toHaveText("Fancy Card 5")

    // Clear search (should reset visibleCount back to 12)
    await searchField.fill("")
    await expect(allCardsInGrid).toHaveCount(12, { timeout: 10000 })

    // 4. Color Filter Check
    console.log("Applying Color Filter (Red)...")
    // Find color filter button for Red
    const redColorButton = spFrame.locator("button[title='Red']")
    await expect(redColorButton).toBeVisible()
    await redColorButton.evaluate((el) => (el as HTMLButtonElement).click())
    await expect(allCardsInGrid).toHaveCount(5, { timeout: 10000 })

    // Take screenshot of filtered color cards
    await page.screenshot({
      path: path.join(screenshotsDir, "library-color-filter-success.png")
    })

    console.log(
      "All Library Search and Scroll E2E tests completed successfully!"
    )
  })

  test("should support collapsible filters accordion and reset color filter", async ({
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

    // Switch to Library tab
    console.log("Switching to Library tab...")
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // Accordion should be collapsed by default
    const accordion = spFrame.locator("[data-testid='filters-accordion']")
    await expect(accordion).toBeAttached() // locator is in DOM

    // Check style of accordion (should have maxHeight 0px or opacity 0)
    const initialStyle = await accordion.getAttribute("style")
    expect(initialStyle).toContain("max-height: 0px")
    expect(initialStyle).toContain("opacity: 0")

    // Click toggle button to expand
    console.log("Expanding filters accordion...")
    const toggleButton = spFrame.locator("[data-testid='toggle-filters-btn']")
    await expect(toggleButton).toBeVisible()
    await toggleButton.click()

    // Wait for transition

    const expandedStyle = await accordion.getAttribute("style")
    expect(expandedStyle).toContain("max-height: 500px")
    expect(expandedStyle).toContain("opacity: 1")

    // Take screenshot of expanded filters
    await page.screenshot({
      path: path.join(screenshotsDir, "library-filters-expanded.png")
    })

    // Click toggle button to collapse again
    console.log("Collapsing filters accordion...")
    await toggleButton.click()

    const collapsedStyle = await accordion.getAttribute("style")
    expect(collapsedStyle).toContain("max-height: 0px")
    expect(collapsedStyle).toContain("opacity: 0")

    // Test Clear Filters with Color resetting
    // 1. Seed a mock card to search and make search result empty
    console.log("Seeding a single mock card...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) {
        throw new Error("db is undefined")
      }
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "mock-card-reset",
        name: "Reset Test Card",
        tags: ["blue-theme"],
        tier: "Common",
        category: undefined,
        dominantColor: "#3b82f6", // Blue
        parameters: { sref: ["sref-url-reset"] },
        promptSegments: [{ type: "text", value: "prompt reset" }],
        createdAt: Date.now(),
        isPinned: false,
        usageCount: 0,
        isVariable: false,
        isDeleted: 0,
        masking: {},
        thumbnailData:
          "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
      })
    })
    await toggleButton.click()
    const redColorButton = spFrame.locator("button[title='Red']")
    await expect(redColorButton).toBeVisible()
    await redColorButton.evaluate((el) => (el as HTMLButtonElement).click())
    const allCardsInGrid = spFrame.locator(
      "[data-tutorial='library-card-grid'] > div"
    )
    await expect(allCardsInGrid).toHaveCount(0)

    // "Clear Filters" button should be visible
    const clearFiltersBtn = spFrame.locator("button:has-text('Clear Filters')")
    await expect(clearFiltersBtn).toBeVisible()

    // Take screenshot before resetting
    await page.screenshot({
      path: path.join(screenshotsDir, "library-before-clear-filters.png")
    })

    // Click Clear Filters
    console.log("Clicking Clear Filters...")
    await clearFiltersBtn.click()
    await expect(allCardsInGrid).toHaveCount(1)

    // Take screenshot after resetting
    await page.screenshot({
      path: path.join(screenshotsDir, "library-after-clear-filters.png")
    })
  })

  test("should support model version filtering", async ({ page }) => {
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

    // Switch to Library tab
    console.log("Switching to Library tab...")
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // Expand accordion to access model filters
    const toggleButton = spFrame.locator("[data-testid='toggle-filters-btn']")
    await expect(toggleButton).toBeVisible()
    await toggleButton.click()
    console.log("Seeding mock cards with model versions...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) {
        throw new Error("db is undefined")
      }
      await database.styleCards.clear()

      const mockCards = [
        // 3 cards with V6
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `card-v6-${i}`,
          name: `V6 Card ${i}`,
          version: "6",
          tier: "Common",
          category: undefined,
          createdAt: Date.now() - i * 1000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        })),
        // 2 cards with V5
        ...Array.from({ length: 2 }, (_, i) => ({
          id: `card-v5-${i}`,
          name: `V5 Card ${i}`,
          version: "5.2",
          tier: "Common",
          category: undefined,
          createdAt: Date.now() - 3000 - i * 1000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        })),
        // 1 card with Niji 6
        {
          id: "card-niji6",
          name: "Niji 6 Card",
          niji: "6",
          tier: "Common",
          category: undefined,
          createdAt: Date.now() - 5000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        },
        // 1 card with Niji 5
        {
          id: "card-niji5",
          name: "Niji 5 Card",
          niji: "5",
          tier: "Common",
          category: undefined,
          createdAt: Date.now() - 6000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        },
        // 3 cards with no version
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `card-none-${i}`,
          name: `No Model Card ${i}`,
          tier: "Common",
          category: undefined,
          createdAt: Date.now() - 7000 - i * 1000,
          isPinned: false,
          usageCount: 0,
          isVariable: false,
          isDeleted: 0,
          masking: {},
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='%23ccc'/></svg>"
        }))
      ]
      await database.styleCards.bulkAdd(mockCards)
    })

    const allCardsInGrid = spFrame.locator(
      "[data-tutorial='library-card-grid'] > div"
    )

    // Total should be 10 cards
    await expect(allCardsInGrid).toHaveCount(10, { timeout: 10000 })

    // Apply V6 model filter
    console.log("Applying V6 model filter...")
    const v6FilterBtn = spFrame.locator("[data-testid='model-filter-V6']")
    await expect(v6FilterBtn).toBeVisible()
    await v6FilterBtn.click()
    await expect(allCardsInGrid).toHaveCount(3)

    // Take screenshot of V6 filter
    await page.screenshot({
      path: path.join(screenshotsDir, "library-model-filter-v6.png")
    })

    // Apply Niji 6 model filter
    console.log("Applying Niji 6 model filter...")
    const niji6FilterBtn = spFrame.locator(
      "[data-testid='model-filter-Niji-6']"
    )
    await expect(niji6FilterBtn).toBeVisible()
    await niji6FilterBtn.click()
    await expect(allCardsInGrid).toHaveCount(1)

    // Take screenshot of Niji 6 filter
    await page.screenshot({
      path: path.join(screenshotsDir, "library-model-filter-niji6.png")
    })

    // Clear filters by selecting "All" model filter
    console.log("Clearing filters...")
    const allModelFilterBtn = spFrame.locator(
      "[data-testid='model-filter-All']"
    )
    await expect(allModelFilterBtn).toBeVisible()
    await allModelFilterBtn.click()
    await expect(allCardsInGrid).toHaveCount(10)
  })
})
