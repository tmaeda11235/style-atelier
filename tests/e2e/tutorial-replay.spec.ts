import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Tutorial Replay @J-TUTORIAL-02", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
    page.on("requestfailed", (request) => {
      console.error(
        `[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`
      )
    })
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`)
      }
    })
  })

  test("should replay tutorial from settings in expert mode", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page for Tutorial Replay E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Set onboarding seen to true in localStorage and reload to skip welcome dialog
    await spFrame.locator("body").evaluate(() => {
      localStorage.setItem("style-atelier-onboarding-seen", "true")
    })
    await page.reload()

    // 1. Go to Settings tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 15000 })
    await settingsNavBtn.click()

    // 2. Locate Replay Tutorial section and button
    const replaySection = spFrame.locator("#settings-replay-tutorial-section")
    await expect(replaySection).toBeVisible()

    const replayBtn = spFrame.locator("#settings-replay-tutorial-btn")
    await expect(replayBtn).toBeVisible()

    // Take a screenshot of the settings section before clicking
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-replay-btn-visible.png")
    })

    // 3. Click the Replay Tutorial button
    await replayBtn.click()

    // 4. Verify that tutorial starts and we are navigated to "history" tab
    const tutorialContainer = spFrame.locator(
      "[data-testid='interactive-tutorial']"
    )
    await expect(tutorialContainer).toBeVisible({ timeout: 10000 })
    await expect(spFrame.locator("text=Step 1 / 8")).toBeVisible()

    // Take a screenshot showing the tutorial replay has started
    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-replayed-step-1.png")
    })
  })

  test("should replay tutorial from settings in easy mode (toggles off easy mode)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log(
      "Navigating to sandbox page for Tutorial Replay in Easy Mode E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Set onboarding seen to true and easy mode to true in localStorage and reload
    await spFrame.locator("body").evaluate(() => {
      localStorage.setItem("style-atelier-onboarding-seen", "true")
      localStorage.setItem("style-atelier-easy-mode", "true")
    })
    await page.reload()

    // Verify Guide button is hidden (which confirms we are in Easy Mode)
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await expect(guideBtn).not.toBeVisible({ timeout: 15000 })

    // 1. Go to Settings tab in Easy Mode
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    // 2. Click Replay Tutorial button
    const replayBtn = spFrame.locator("#settings-replay-tutorial-btn")
    await expect(replayBtn).toBeVisible()
    await replayBtn.click()

    // 3. Verify that Easy Mode is disabled (Guide button should become visible or accessible once in Expert mode)
    // and Interactive Tutorial overlay should start from Step 1.
    const tutorialContainer = spFrame.locator(
      "[data-testid='interactive-tutorial']"
    )
    await expect(tutorialContainer).toBeVisible({ timeout: 10000 })
    await expect(spFrame.locator("text=Step 1 / 8")).toBeVisible()

    // Take a screenshot showing Easy Mode is disabled and tutorial is running
    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-replayed-from-easy-mode.png")
    })
  })
})
