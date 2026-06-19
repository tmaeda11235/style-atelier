import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Command Palette E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should toggle the command palette using keyboard shortcut and navigate options", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Command Palette E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if it appears
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Verify Side Panel content is loaded
    const guideBtn = spFrame.locator("button[title='Show Guide']")
    await expect(guideBtn).toBeVisible({ timeout: 10000 })

    // 2. Press Control+K / Meta+K inside the side panel frame to trigger the Command Palette
    console.log("Pressing Control+K to open Command Palette...")
    const sidepanelBody = spFrame.locator("body")
    await sidepanelBody.press("Control+k")

    // 3. Verify Command Palette input is visible
    const searchInput = spFrame.locator(
      "input[placeholder*='Type a command'], input[placeholder*='コマンドを入力']"
    )
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    console.log("Command Palette successfully opened!")

    // 4. Capture screenshot of opened Command Palette (Progressive Disclosure)
    await page.screenshot({
      path: path.join(screenshotsDir, "command-palette-open.png")
    })
    console.log("Command Palette open screenshot saved.")

    // 5. Type filter text "/settings"
    await searchInput.fill("/settings")

    // Capture screenshot of filtered state
    await page.screenshot({
      path: path.join(screenshotsDir, "command-palette-filtered.png")
    })

    // Verify option "/settings" is visible
    const settingsOption = spFrame.locator("text=/settings")
    await expect(settingsOption).toBeVisible({ timeout: 5000 })

    // 6. Press Enter to navigate to settings tab
    await searchInput.press("Enter")

    // Verify settings view/tab is now visible
    const settingsTitle = spFrame
      .locator("h2:has-text('Settings'), h2:has-text('設定')")
      .first()
    await expect(settingsTitle).toBeVisible({ timeout: 5000 })

    // Verify Command Palette is closed
    await expect(searchInput).not.toBeVisible({ timeout: 5000 })

    // 7. Capture screenshot showing navigation success
    await page.screenshot({
      path: path.join(screenshotsDir, "command-palette-navigation-success.png")
    })
  })
})
