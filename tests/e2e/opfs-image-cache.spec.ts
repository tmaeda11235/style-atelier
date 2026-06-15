import path from "path"
import { expect, test } from "@playwright/test"

test.describe("OPFS Image Cache E2E Test", () => {
  test("should display cached images and take screenshot", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for OPFS Image test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if present
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // Wait for the library cards list to be visible
    const cardList = spFrame.locator("[data-tutorial='library-card-grid']")
    await expect(cardList).toBeVisible({ timeout: 10000 })

    // Take screenshot of the library tab to confirm images load properly
    await page.waitForTimeout(2000) // Wait for lazy load/render
    await page.screenshot({
      path: path.join(screenshotsDir, "opfs-image-cache.png"),
      fullPage: true
    })
    console.log("Screenshot saved to tests/screenshots/opfs-image-cache.png")
  })
})
