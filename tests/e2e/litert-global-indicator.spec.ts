import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - LiteRT-LM Global Indicator & Quota Warning @J-MB-E2E-GLOBAL-INDICATOR", () => {
  test.slow()

  test.beforeEach(async ({ page }) => {
    // Ensure mock-webllm-downloaded is cleared BEFORE React mounts on sandbox load
    await page.addInitScript(() => {
      window.localStorage.removeItem("mock-webllm-downloaded")
    })
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display global progress indicator during download, redirect on click, show quota warning, and redirect to storage manager", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for LiteRT-LM Global Indicator test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }

    // 1. Setup mock config for slow download and trigger download from Settings
    const settingsTabBtn = spFrame
      .locator("button:has-text('Settings'), button:has-text('設定')")
      .first()
    await settingsTabBtn.click({ force: true })
    await page.waitForTimeout(500)

    // Open WebLLM accordion
    const webllmHeader = spFrame.locator("#settings-accordion-webllm")
    await webllmHeader.click({ force: true })
    await page.waitForTimeout(500)

    // Inject mock config setting
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.quotaSufficient = true
        config.failDownload = false
        config.downloadSpeed = 800 // Slow speed to capture downloading state
      }
    })

    // Click Download button inside WebLLM settings
    const downloadBtn = spFrame
      .locator(
        "#webllm-settings-section-wrapper button:has-text('Download Model'), #webllm-settings-section-wrapper button:has-text('モデルをダウンロード')"
      )
      .first()
    await downloadBtn.click({ force: true })

    // Click confirm download
    const confirmDownloadBtn = spFrame
      .locator(
        "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
      )
      .first()
    await confirmDownloadBtn.click({ force: true })
    await page.waitForTimeout(500)

    // 2. Navigate away to History tab and check global progress bar
    const historyTabBtn = spFrame
      .locator("button:has-text('History'), button:has-text('履歴')")
      .first()
    await historyTabBtn.click({ force: true })
    await page.waitForTimeout(800)

    // Verify global progress indicator is visible
    const globalIndicator = spFrame.locator("#global-download-indicator")
    await expect(globalIndicator).toBeVisible()

    // Verify progress text presence
    await expect(globalIndicator).toContainText(/📥/)

    // Capture screenshot of global progress bar at the bottom
    await page.screenshot({
      path: path.join(screenshotsDir, "litert-global-progress-indicator.png")
    })
    console.log("Global progress indicator screenshot saved.")

    // 3. Click global progress bar and assert redirection back to WebLLM accordion
    await globalIndicator.click({ force: true })
    await page.waitForTimeout(500)

    // Verify webllm accordion section wrapper is visible
    const webllmWrapper = spFrame.locator("#webllm-settings-section-wrapper")
    await expect(webllmWrapper).toBeVisible()
    console.log(
      "Redirected to LiteRT-LM settings successfully on progress indicator click."
    )

    // 4. Test Quota limit warning behavior
    // Reload page to start with clean state
    await page.reload()
    const spFrame2 = page.frameLocator("#sidepanel-frame")

    const skipButton2 = spFrame2.locator("#welcome-skip-btn")
    if (await skipButton2.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton2.click({ force: true })
    }

    // Switch to Settings tab
    const settingsTabBtn2 = spFrame2
      .locator("button:has-text('Settings'), button:has-text('設定')")
      .first()
    await settingsTabBtn2.click({ force: true })
    await page.waitForTimeout(500)

    // Open WebLLM accordion
    const webllmHeader2 = spFrame2.locator("#settings-accordion-webllm")
    await webllmHeader2.click({ force: true })
    await page.waitForTimeout(500)

    // Set mock config to trigger insufficient storage error
    await spFrame2.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.quotaSufficient = false
      }
    })

    // Click Download button
    const downloadBtn2 = spFrame2
      .locator(
        "#webllm-settings-section-wrapper button:has-text('Download Model'), #webllm-settings-section-wrapper button:has-text('モデルをダウンロード')"
      )
      .first()
    await downloadBtn2.click({ force: true })

    // Click confirm download
    const confirmDownloadBtn2 = spFrame2
      .locator(
        "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
      )
      .first()
    await confirmDownloadBtn2.click({ force: true })
    await page.waitForTimeout(500)

    // Switch away to History tab
    const historyTabBtn2 = spFrame2
      .locator("button:has-text('History'), button:has-text('履歴')")
      .first()
    await historyTabBtn2.click({ force: true })
    await page.waitForTimeout(500)

    // Verify global warning indicator is visible and displays insufficient space warning
    const globalIndicator2 = spFrame2.locator("#global-download-indicator")
    await expect(globalIndicator2).toBeVisible()
    await expect(globalIndicator2).toContainText(
      /Insufficient space|空き容量が不足しています/
    )

    // Take screenshot of global quota warning state
    await page.screenshot({
      path: path.join(screenshotsDir, "litert-global-quota-warning.png")
    })
    console.log("Global quota warning screenshot saved.")

    // Click "Clean up storage" button
    const cleanupBtn = globalIndicator2.locator(
      "button:has-text('Clean up storage'), button:has-text('ストレージを整理する')"
    )
    await expect(cleanupBtn).toBeVisible()
    await cleanupBtn.click({ force: true })
    await page.waitForTimeout(800)

    // Verify redirect to Storage Manager accordion section
    const storageWrapper = spFrame2.locator("#storage-manager-section-wrapper")
    await expect(storageWrapper).toBeVisible()
    console.log("Redirected to Storage Manager successfully on Clean Up click.")
  })
})
