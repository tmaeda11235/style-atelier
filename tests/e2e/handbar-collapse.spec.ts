/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - HandBar Collapse @J-WB-EXPERT-05", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should support collapse and expand interactions of HandBar", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for HandBar Collapse E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 1 pinned card (to show HandBar) and 1 unpinned card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-e2e-1",
          name: "Card E2E 1",
          promptSegments: [{ type: "text", value: "cyberpunk skyline" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-e2e-2",
          name: "Card E2E 2",
          promptSegments: [{ type: "text", value: "neon lights" }],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: false,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })
    await page.waitForTimeout(1000) // wait for DB queries

    // 3. Verify HandBar is visible and expanded initially
    const handbar = spFrame.locator("#handbar-root")
    await expect(handbar).toBeVisible({ timeout: 10000 })

    const clearAllBtn = spFrame.locator("button:has-text('Clear All')")
    await expect(clearAllBtn).toBeVisible()

    // Save expanded state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "handbar-expanded.png")
    })
    console.log("HandBar expanded screenshot saved.")

    // 4. Click collapse button to minimize HandBar
    const collapseBtn = spFrame.locator(
      "[data-testid='handbar-toggle-collapse-btn']"
    )
    await expect(collapseBtn).toBeVisible()
    await collapseBtn.click()
    await page.waitForTimeout(500)

    // Clear All button should be hidden when collapsed
    await expect(clearAllBtn).not.toBeVisible()

    // Save collapsed state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "handbar-collapsed.png")
    })
    console.log("HandBar collapsed screenshot saved.")

    // 5. Click HandBar container to expand it again
    // We click near the top of the collapsed bar (which should be clickable)
    await handbar.click({ position: { x: 50, y: 15 } })
    await page.waitForTimeout(500)

    // Clear All button should be visible again
    await expect(clearAllBtn).toBeVisible()

    // 6. Click collapse button again to minimize
    await collapseBtn.click()
    await page.waitForTimeout(500)
    await expect(clearAllBtn).not.toBeVisible()

    // 7. Auto-expand when a new card is added/pinned
    console.log("Pinning Card E2E 2 to test auto-expand on new card...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      const card = await database.getCard("card-e2e-2")
      if (card) {
        card.isPinned = true
        await database.styleCards.put(card)
      }
    })
    await page.waitForTimeout(1000)

    // HandBar should auto-expand, so Clear All button is visible
    await expect(clearAllBtn).toBeVisible()
    console.log("HandBar auto-expanded on new card pin.")

    // 8. Collapse again
    await collapseBtn.click()
    await page.waitForTimeout(500)
    await expect(clearAllBtn).not.toBeVisible()

    // 9. Auto-expand on global drag start
    console.log("Simulating global dragstart to test auto-expand on drag...")
    await spFrame.locator("body").evaluate(() => {
      window.dispatchEvent(new Event("dragstart"))
    })
    await page.waitForTimeout(500)

    // HandBar should auto-expand, so Clear All button is visible
    await expect(clearAllBtn).toBeVisible()

    // Save auto-expanded on drag screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "handbar-auto-expanded-on-drag.png")
    })
    console.log("HandBar auto-expanded on drag screenshot saved.")
  })
})
