import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Non-Target Site Accessibility @J-UX-NON-TARGET-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })

    // Simulate a non-target site by setting __mockUrl on window/parent
    await page.addInitScript(() => {
      ;(window as any).__mockUrl = "https://example.com"
    })
  })

  test("should allow accessing Settings while showing warning in other tabs", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html?variant=non-target")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    try {
      await expect(skipButton).toBeVisible({ timeout: 5000 })
      await skipButton.click()
    } catch (e) {
      // Skip if welcome dialog is not shown or already skipped
    }

    // 2. We should be on history tab by default, showing NonTargetSiteView warning
    const warningText = spFrame.getByText(
      /本拡張機能は Midjourney または Discord のページでのみご利用いただけます。|This extension is only available on Midjourney or Discord pages/i
    )
    await expect(warningText).toBeVisible({ timeout: 10000 })

    // Save screenshot of history tab warning
    await page.screenshot({
      path: path.join(screenshotsDir, "non-target-history-warning.png")
    })

    // 3. Switch to Settings tab and verify it's working
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // Settings title should be visible
    const settingsTitle = spFrame.locator(
      "h2:has-text('設定'), h2:has-text('Settings')"
    )
    await expect(settingsTitle).toBeVisible({ timeout: 10000 })

    // Save screenshot of settings tab being accessible on non-target site
    await page.screenshot({
      path: path.join(screenshotsDir, "non-target-settings-accessible.png")
    })

    // 4. Switch to Library tab and verify warning is shown
    const libraryTabBtn = spFrame.locator(
      "button[title='Library'], button[title='カード一覧']"
    )
    await expect(libraryTabBtn).toBeVisible({ timeout: 10000 })
    await libraryTabBtn.click()
    await expect(warningText).toBeVisible({ timeout: 10000 })

    // 5. Switch to Workbench tab and verify warning is shown
    const workbenchTabBtn = spFrame.locator("[data-tutorial='workbench-tab']")
    await expect(workbenchTabBtn).toBeVisible({ timeout: 10000 })
    await workbenchTabBtn.click()
    await expect(warningText).toBeVisible({ timeout: 10000 })

    // 6. Go back to Settings and turn on Easy Mode
    await settingsNavBtn.click()
    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 })
    await easyModeToggle.click()

    // Under Easy Mode, only settings and library exist.
    // Verify library tab (active by default in Easy Mode) shows warning
    await expect(warningText).toBeVisible({ timeout: 10000 })

    // Save screenshot of Easy Mode showing warning in library
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "non-target-easy-mode-library-warning.png"
      )
    })

    console.log("Non-target site E2E test finished and screenshots saved.")
  })
})
// CI Trigger HistoryTab
