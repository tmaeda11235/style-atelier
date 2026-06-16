import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Auto-Sync Age Suspension UX E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Google Drive API calls globally to avoid errors
    await page.route("https://www.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({})
      })
    })
  })

  test("should display warning banner and trigger strategy dialog", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // 1. Initialize localStorage before navigating
    await page.addInitScript(() => {
      const sixtyOneDaysAgo = Date.now() - 61 * 24 * 60 * 60 * 1000
      window.localStorage.setItem("style-atelier-sync-enabled", "true")
      window.localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      window.localStorage.setItem(
        "style-atelier-auto-sync-suspended-by-age",
        "true"
      )
      window.localStorage.setItem(
        "style-atelier-last-backup",
        sixtyOneDaysAgo.toString()
      )
    })

    // 2. Navigate to sandbox
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if present
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Settings tab
    const settingsTabButton = spFrame.locator("#settings-nav-btn")
    await expect(settingsTabButton).toBeVisible()
    await settingsTabButton.click()

    // Expand Cloud Backup & Sync section
    const cloudAccordionHeader = spFrame.locator("#settings-accordion-cloud")
    await expect(cloudAccordionHeader).toBeVisible()
    await cloudAccordionHeader.click()

    // Verify the auto-sync warning banner is visible
    const warningBanner = spFrame.locator("#auto-sync-suspended-banner")
    await expect(warningBanner).toBeVisible()

    // Capture screenshot of the suspended warning banner
    await page.screenshot({
      path: path.join(screenshotsDir, "auto-sync-suspended-banner.png")
    })

    // Click the Manual Sync button inside the banner
    const bannerSyncBtn = spFrame.locator("#suspended-banner-sync-btn")
    await expect(bannerSyncBtn).toBeVisible()
    await bannerSyncBtn.click()

    // Verify GDriveSyncStrategyDialog opens (check it has strategy selection title)
    const strategyDialog = spFrame.locator(
      "text=/Select merge strategy:|マージ戦略を選択してください/"
    )
    await expect(strategyDialog).toBeVisible({ timeout: 5000 })

    // Capture screenshot of the merge strategy dialog opened from the banner
    await page.screenshot({
      path: path.join(screenshotsDir, "auto-sync-suspended-strategy-dialog.png")
    })
  })
})
