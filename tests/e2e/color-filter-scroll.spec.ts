/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Color Filter Scroll Affordance @J-ORG-COLOR-FILTER-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display scroll arrows for color filter, scroll on click, and filter cards correctly", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Color Filter E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch tab to Library
    const libraryTabBtn = spFrame
      .locator("button[title='Library'], button[title='ライブラリ']")
      .first()
    await expect(libraryTabBtn).toBeVisible({ timeout: 10000 })
    await libraryTabBtn.click()
    await page.waitForTimeout(500)

    // Expand filters accordion
    const filterToggleBtn = spFrame
      .locator("[data-testid='toggle-filters-btn']")
      .first()
    await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
    await filterToggleBtn.click()
    await page.waitForTimeout(500)

    // 2. Clear database and seed custom test cards with different dominant colors
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-red",
          name: "Red Card",
          promptSegments: [{ type: "text", value: "ruby red sunset" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: false,
          dominantColor: "#ef4444",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='red'/></svg>"
        },
        {
          id: "card-blue",
          name: "Blue Card",
          promptSegments: [{ type: "text", value: "deep blue ocean" }],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: false,
          dominantColor: "#3b82f6",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='blue'/></svg>"
        },
        {
          id: "card-green",
          name: "Green Card",
          promptSegments: [{ type: "text", value: "lush green forest" }],
          parameters: {},
          masking: {},
          tier: "Epic",
          isPinned: false,
          dominantColor: "#22c55e",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='green'/></svg>"
        }
      ])
    })

    // Wait for UI to update
    await page.waitForTimeout(1000)

    // 3. Check for color filter container
    const colorLabel = spFrame.locator("text=Color:").first()
    await expect(colorLabel).toBeVisible({ timeout: 10000 })

    // Force narrow width on scroll container to test scroll affordance arrows
    const scrollContainer = spFrame.getByTestId("color-scroll-container")
    await expect(scrollContainer).toBeVisible()
    await scrollContainer.evaluate((el) => {
      el.style.width = "100px"
      el.style.flexGrow = "0"
    })
    await page.waitForTimeout(500) // wait for ResizeObserver to run checkScroll

    // Verify right scroll arrow button is visible because the container is now narrow and scrollable
    const rightArrow = spFrame
      .locator("button[aria-label='Scroll right']")
      .first()
    await expect(rightArrow).toBeVisible({ timeout: 5000 })

    // Take screenshot of default state (showing right arrow)
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "color-filter-scroll-right-arrow-visible.png"
      )
    })
    console.log("Screenshot saved: right arrow visible")

    // 4. Click right arrow to scroll right
    await rightArrow.click()
    await page.waitForTimeout(500)

    // Verify left scroll arrow button is now visible after scrolling
    const leftArrow = spFrame
      .locator("button[aria-label='Scroll left']")
      .first()
    await expect(leftArrow).toBeVisible({ timeout: 5000 })

    // Take screenshot after scrolling
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "color-filter-scroll-left-arrow-visible.png"
      )
    })
    console.log("Screenshot saved: left arrow visible")

    // 5. Scroll back left
    await leftArrow.click()
    await page.waitForTimeout(500)

    // 6. Test filtering: click the Red filter color button
    const redFilterBtn = spFrame
      .locator("button[title='レッド'], button[title='Red']")
      .first()
    await expect(redFilterBtn).toBeVisible()
    await redFilterBtn.click()
    await page.waitForTimeout(500)

    // Verify only the Red Card is visible, and Blue/Green Cards are filtered out
    const redCard = spFrame.locator("text=Red Card").first()
    const blueCard = spFrame.locator("text=Blue Card").first()
    const greenCard = spFrame.locator("text=Green Card").first()

    await expect(redCard).toBeVisible({ timeout: 5000 })
    await expect(blueCard).not.toBeVisible()
    await expect(greenCard).not.toBeVisible()

    // Take screenshot of filtered state
    await page.screenshot({
      path: path.join(screenshotsDir, "color-filter-applied-red.png")
    })
    console.log("Screenshot saved: red filter applied")

    // 7. Clear filter by selecting 'All Colors'
    const allColorsBtn = spFrame
      .locator("button[title='すべてのカラー'], button[title='All Colors']")
      .first()
    await expect(allColorsBtn).toBeVisible()
    await allColorsBtn.click()
    await page.waitForTimeout(500)

    // Verify all cards are visible again
    await expect(redCard).toBeVisible({ timeout: 5000 })
    await expect(blueCard).toBeVisible({ timeout: 5000 })
    await expect(greenCard).toBeVisible({ timeout: 5000 })
  })
})
