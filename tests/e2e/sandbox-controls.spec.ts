import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Sandbox Controller E2E Tests", () => {
  test.slow()

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  // Helper function to skip welcome dialog and navigate to WebLLM Settings section
  async function setupAndGoToWebLlmSettings(
    page: any,
    spFrame: any,
    cleanStorage = false,
    shouldGoto = true
  ) {
    if (shouldGoto) {
      console.log("Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")
    }

    // Ensure the sidepanel frame is loaded
    await page.waitForSelector("#sidepanel-frame")

    if (cleanStorage) {
      console.log("Resetting WebLLM model cache via Reset button...")
      const clearBtn = page.locator("#clear-cache-btn")
      await expect(clearBtn).toBeVisible({ timeout: 10000 })
      await clearBtn.click()
      // Give it plenty of time to clear and reload the frame
      await page.waitForTimeout(2000)
    }

    // Skip welcome dialog if it appears
    const skipButton = spFrame.locator("#welcome-skip-btn")
    try {
      await skipButton.waitFor({ state: "visible", timeout: 15000 })
      await skipButton.click({ force: true })
      console.log("Skipped welcome dialog.")
    } catch (e) {
      console.log(
        "Welcome dialog skip button not visible or not found. Continuing..."
      )
    }

    // Go to Settings tab using the navigation icon button
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 15000 })
    await settingsNavBtn.click({ force: true })
    console.log("Clicked settings tab button.")

    // Expand Local AI Model (WebLLM) section
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible({ timeout: 10000 })
    await webLlmAccordionHeader.click({ force: true })
    console.log("Expanded WebLLM accordion section.")

    // Wait briefly for accordion animation
    await page.waitForTimeout(500)
  }

  test("should toggle WebGPU mock and display troubleshooting warning in Settings", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // Setup with clean storage
    await setupAndGoToWebLlmSettings(page, spFrame, true, true)

    // Verify download button is enabled initially (WebGPU enabled by default)
    const downloadBtn = spFrame
      .locator(
        "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
      )
      .first()
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).not.toBeDisabled()

    // 1. Disable WebGPU via Sandbox Controller
    console.log("Selecting Disabled (No GPU) in controller...")
    await page.selectOption("#gpu-select", "disabled")

    // Wait for the sidepanel iframe reload triggered by the controller
    console.log("Waiting for sidepanel reload...")
    await page.waitForTimeout(2000)

    // Re-navigate settings inside reloaded sidepanel without reloading main window
    await setupAndGoToWebLlmSettings(page, spFrame, false, false)

    // Verify WebGPU is disabled warning shows up
    const warningTitle = spFrame
      .locator("text=/WebGPU is disabled|WebGPUが無効です/")
      .first()
    await expect(warningTitle).toBeVisible({ timeout: 15000 })

    const statusText = spFrame
      .locator("text=/Not Downloaded|未ダウンロード/")
      .first()
    await expect(statusText).toBeVisible({ timeout: 15000 })

    // Verify download button is enabled (since CPU/Wasm fallback is available)
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).not.toBeDisabled()

    // Verify CPU/Wasm fallback warning infobar is displayed
    const fallbackWarning = spFrame
      .locator(
        "text=/WebGPU not supported: Switching to CPU \\(Wasm\\) mode|WebGPU非対応：CPU\\(Wasm\\)モードに切り替えています/"
      )
      .first()
    await expect(fallbackWarning).toBeVisible({ timeout: 15000 })

    // Save screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "sandbox-webgpu-disabled.png")
    })
    console.log("WebGPU disabled via controller screenshot saved.")

    // 2. Re-enable WebGPU via Sandbox Controller
    console.log("Re-enabling WebGPU in controller...")
    await page.selectOption("#gpu-select", "enabled")

    // Wait for the sidepanel iframe reload
    console.log("Waiting for sidepanel reload...")
    await page.waitForTimeout(2000)

    // Re-setup tab without reloading main window
    await setupAndGoToWebLlmSettings(page, spFrame, false, false)
    await expect(warningTitle).not.toBeVisible({ timeout: 10000 })
    await expect(downloadBtn).toBeVisible()
  })

  test("should toggle OPFS Storage Quota mock and trigger insufficient space warning", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // Setup with clean storage
    await setupAndGoToWebLlmSettings(page, spFrame, true, true)

    // 1. Set insufficient storage quota
    console.log("Selecting Insufficient quota in controller...")
    await page.selectOption("#quota-select", "insufficient")

    // Try downloading the model
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Confirm dialog
    const okBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(okBtn).toBeVisible({ timeout: 15000 })
    await okBtn.click()

    // Verify insufficient space warning dialog is triggered
    const warningText = spFrame
      .locator("text=/Insufficient Space Warning|容量不足警告/")
      .first()
    await expect(warningText).toBeVisible({ timeout: 15000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "sandbox-quota-insufficient.png")
    })
    console.log("OPFS insufficient space warning screenshot saved.")
  })

  test("should simulate offline download and trigger reconnection retry UI", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // Setup with clean storage
    await setupAndGoToWebLlmSettings(page, spFrame, true, true)

    // Select slow download speed to allow enough time to toggle offline
    console.log("Selecting Slow Download in controller...")
    await page.selectOption("#network-select", "slow")

    // Start download
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    const okBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(okBtn).toBeVisible({ timeout: 15000 })
    await okBtn.click()

    // Wait until download starts and shows download speed
    await expect(spFrame.locator("text=12.5 MB/s")).toBeVisible({
      timeout: 15000
    })

    // Simulate network interruption via sandbox controller
    console.log("Selecting Offline in controller...")
    await page.selectOption("#network-select", "offline")

    // Verify reconnection retry UI is shown
    const retryText = spFrame
      .locator("text=/Reconnecting|接続を再試行中|接続再試行中/")
      .first()
    await expect(retryText).toBeVisible({ timeout: 15000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "sandbox-network-offline-retry.png")
    })
    console.log("Reconnection retry UI screenshot saved.")
  })
})
