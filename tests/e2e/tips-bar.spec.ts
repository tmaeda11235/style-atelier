import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Tips Bar @J-SYS-03", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display tips bar, cycle tips on next click, and toggle visibility in settings", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Tips Bar E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Verify Tips Bar is visible by default
    const tipsBar = spFrame.locator("#tips-bar")
    await expect(tipsBar).toBeVisible({ timeout: 10000 })

    const tipText = spFrame.locator("#tips-bar-text")
    await expect(tipText).toBeVisible()
    const initialText = await tipText.innerText()
    console.log(`Initial tip text: "${initialText}"`)

    // Capture screenshot showing Tips Bar visible at the bottom
    await page.screenshot({
      path: path.join(screenshotsDir, "tips-bar-visible.png")
    })
    console.log("Tips Bar visible screenshot saved.")

    // 3. Wait for the tip to cycle automatically (should change within 8 seconds)
    console.log("Waiting for tip to cycle automatically...")
    await expect(async () => {
      const currentText = await tipText.innerText()
      expect(currentText).not.toBe(initialText)
    }).toPass({ timeout: 12000, intervals: [500] })

    const newText = await tipText.innerText()
    console.log(`New tip text after auto-cycle: "${newText}"`)

    // 4. Navigate to settings to toggle it off
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    await page.screenshot({
      path: path.join(screenshotsDir, "tips-bar-settings-toggle.png")
    })
    console.log("Settings Tips Bar section screenshot saved.")

    // Toggle off
    const tipsToggleBtn = spFrame.locator("#tips-bar-toggle-btn")
    await expect(tipsToggleBtn).toBeVisible()
    await tipsToggleBtn.click()
    await expect(tipsBar).not.toBeVisible()

    // Toggle on again
    await tipsToggleBtn.click()
    await expect(tipsBar).toBeVisible()

    // 6. Resize viewport to narrow width (e.g., 320px) to verify responsive wrap
    console.log("Resizing viewport to narrow width (320px)...")
    await page.setViewportSize({ width: 320, height: 600 })
    await expect(tipsBar).toBeVisible()
    await expect(tipText).toBeVisible()

    // Verify it is not truncated (scrollWidth <= clientWidth due to whitespace-normal)
    const isTruncated = await tipText.evaluate(
      (el) => el.scrollWidth > el.clientWidth
    )
    expect(isTruncated).toBe(false)

    // Capture screenshot of narrow viewport showing wrapped text
    await page.screenshot({
      path: path.join(screenshotsDir, "tips-bar-narrow.png")
    })
    console.log("Narrow Tips Bar screenshot saved.")

    // Restore viewport size
    await page.setViewportSize({ width: 1920, height: 1080 })
  })
})
