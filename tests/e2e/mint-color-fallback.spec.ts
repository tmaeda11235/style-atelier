/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Minting Color Fallback", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should apply rarity-specific color fallbacks when color extraction fails and update them dynamically on rarity change (@J-MINT-COLOR-FALLBACK)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Minting Color Fallback E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if present
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Add a mock history item with an invalid image URL to force color extraction failure
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-invalid-color",
        fullCommand: "a mysterious item that fails color extraction --ar 16:9",
        imageUrl: "https://example.com/invalid-image-for-cors-failure.png",
        timestamp: Date.now()
      })
    })

    // 3. Switch to History tab
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    // 4. Click "Mint Card" button
    const mintCardBtn = spFrame.locator("button:has-text('Mint Card')").first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // 5. Verify minting view container is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // 6. Verify default rarity "Common" fallback colors are applied
    // Common: dominant '#64748b' (rgb(100, 116, 139)), accent '#94a3b8' (rgb(148, 163, 184))
    const dominantColorCircle = spFrame.locator("[title='Dominant Color']")
    const accentColorCircle = spFrame.locator("[title='Accent Color']")
    await expect(dominantColorCircle).toBeVisible()
    await expect(accentColorCircle).toBeVisible()

    // Since color extraction fails on the invalid URL, it should use the Common fallback colors
    await expect(dominantColorCircle).toHaveCSS(
      "background-color",
      "rgb(100, 116, 139)"
    )
    await expect(accentColorCircle).toHaveCSS(
      "background-color",
      "rgb(148, 163, 184)"
    )

    // 7. Select rarity "Epic"
    // Epic: dominant '#7c3aed' (rgb(124, 58, 237)), accent '#c084fc' (rgb(192, 132, 252))
    const epicRarityBtn = spFrame.locator("button:has-text('Epic')")
    await expect(epicRarityBtn).toBeVisible()
    await epicRarityBtn.click()

    // Colors should dynamically update to Epic fallback colors
    await expect(dominantColorCircle).toHaveCSS(
      "background-color",
      "rgb(124, 58, 237)"
    )
    await expect(accentColorCircle).toHaveCSS(
      "background-color",
      "rgb(192, 132, 252)"
    )

    // 8. Select rarity "Legendary"
    // Legendary: dominant '#d97706' (rgb(217, 119, 6)), accent '#fbbf24' (rgb(251, 191, 36))
    const legendaryRarityBtn = spFrame.locator("button:has-text('Legendary')")
    await expect(legendaryRarityBtn).toBeVisible()
    await legendaryRarityBtn.click()

    // Colors should dynamically update to Legendary fallback colors
    await expect(dominantColorCircle).toHaveCSS(
      "background-color",
      "rgb(217, 119, 6)"
    )
    await expect(accentColorCircle).toHaveCSS(
      "background-color",
      "rgb(251, 191, 36)"
    )

    // 9. Take a screenshot to document the verified state
    await page.screenshot({
      path: path.join(screenshotsDir, "mint-color-fallback-legendary.png")
    })

    // 10. Click Save Card
    const saveCardBtn = spFrame.locator("button:has-text('Save Card')")
    await expect(saveCardBtn).toBeVisible()
    await saveCardBtn.click()

    // 11. Verify minting view is closed
    await expect(mintingView).not.toBeVisible({ timeout: 10000 })
  })
})
