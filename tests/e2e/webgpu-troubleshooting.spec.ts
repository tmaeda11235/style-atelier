import path from "path"
import { expect, test } from "@playwright/test"

test.describe("WebGPU Troubleshooting Guide E2E Tests", () => {
  test.slow()

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display WebGPU troubleshooting warning in SettingsTab when WebGPU is disabled (@J-SET-WEBGPU-TROUBLESHOOT-01)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "gpu", {
        value: undefined,
        writable: true,
        configurable: true
      })
    })

    console.log("Navigating to sandbox page with WebGPU disabled...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }
    const settingsTabBtn = spFrame
      .locator("button:has-text('Settings'), button:has-text('設定')")
      .first()
    await expect(settingsTabBtn).toBeVisible()
    await settingsTabBtn.click({ force: true })

    // Expand Local AI Model (WebLLM) section
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    const chevronDown = webLlmAccordionHeader.locator("svg.lucide-chevron-down")
    if (await chevronDown.isVisible().catch(() => false)) {
      await webLlmAccordionHeader.click({ force: true })
    }
    const warningTitle = spFrame
      .locator("text=/WebGPU is disabled|WebGPUが無効です/")
      .first()
    await expect(warningTitle).toBeVisible({ timeout: 10000 })

    const statusText = spFrame
      .locator("text=/Not Downloaded|未ダウンロード/")
      .first()
    await expect(statusText).toBeVisible({ timeout: 10000 })

    const step1 = spFrame.locator("text=/chrome:\\/\\/settings\\/system/")
    await expect(step1).toBeVisible()

    const openBtn = spFrame
      .locator(
        "button:has-text('Open Chrome Settings'), button:has-text('Chrome設定を開く')"
      )
      .first()
    await expect(openBtn).toBeVisible()
    await openBtn.click({ force: true })

    // Verify Download button is enabled (since CPU/Wasm fallback is available)
    const downloadBtn = spFrame
      .locator(
        "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
      )
      .first()
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).not.toBeDisabled()

    // Verify CPU/Wasm fallback warning infobar is displayed
    const fallbackWarning = spFrame
      .locator(
        "text=/WebGPU not supported: Switching to CPU \\(Wasm\\) mode|WebGPU非対応：CPU\\(Wasm\\)モードに切り替えています/"
      )
      .first()
    await expect(fallbackWarning).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "webgpu-fallback-wasm-settings.png")
    })
    console.log("WebGPU CPU fallback settings warning screenshot saved.")
  })

  test("should NOT display WebGPU troubleshooting warning when WebGPU is enabled", async ({
    page
  }) => {
    await page.addInitScript(() => {
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    })

    console.log("Navigating to sandbox page with WebGPU enabled...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }

    const settingsTabBtn = spFrame
      .locator("button:has-text('Settings'), button:has-text('設定')")
      .first()
    await expect(settingsTabBtn).toBeVisible()
    await settingsTabBtn.click({ force: true })

    // Expand Local AI Model (WebLLM) section
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    const chevronDown = webLlmAccordionHeader.locator("svg.lucide-chevron-down")
    if (await chevronDown.isVisible().catch(() => false)) {
      await webLlmAccordionHeader.click({ force: true })
    }

    const warningTitle = spFrame
      .locator("text=/WebGPU is disabled|WebGPUが無効です/")
      .first()
    await expect(warningTitle).not.toBeVisible({ timeout: 5000 })

    // Verify Download button is enabled and displays default text
    const downloadBtn = spFrame
      .locator(
        "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
      )
      .first()
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).not.toBeDisabled()
  })

  test("should display QuotaExceededError UI when download fails due to insufficient storage during execution", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Mock WebGPU enabled to pass the initial support check
    await page.addInitScript(() => {
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    })

    console.log(
      "Navigating to sandbox page and preparing to simulate quota error..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }

    // Enable simulated quota error
    await spFrame.locator("body").evaluate(() => {
      localStorage.setItem("mock-webllm-simulate-quota-error", "true")
    })

    const settingsTabBtn = spFrame
      .locator("button:has-text('Settings'), button:has-text('設定')")
      .first()
    await expect(settingsTabBtn).toBeVisible()
    await settingsTabBtn.click({ force: true })

    // Expand Local AI Model (WebLLM) section
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    const chevronDown = webLlmAccordionHeader.locator("svg.lucide-chevron-down")
    if (await chevronDown.isVisible().catch(() => false)) {
      await webLlmAccordionHeader.click({ force: true })
    }

    // Trigger download
    const downloadBtn = spFrame
      .locator(
        "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
      )
      .first()
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Confirm dialog
    const okBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(okBtn).toBeVisible({ timeout: 15000 })
    await okBtn.click()

    // Verify QuotaExceededError UI is shown
    const quotaWarning = spFrame
      .locator(
        "text=/Storage space is insufficient|ストレージ空き容量が不足しています/"
      )
      .first()
    await expect(quotaWarning).toBeVisible({ timeout: 20000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "webgpu-quota-exceeded-error.png")
    })
    console.log("WebGPU QuotaExceededError screenshot saved.")
  })

  test("should display environment unsupported error UI when both WebGPU and Wasm are unavailable", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Mock WebGPU disabled and WebAssembly disabled
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "gpu", {
        value: undefined,
        writable: true,
        configurable: true
      })
      Object.defineProperty(window, "WebAssembly", {
        value: undefined,
        writable: true,
        configurable: true
      })
    })

    console.log(
      "Navigating to sandbox page and preparing to simulate both-unsupported error..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }

    const settingsTabBtn = spFrame
      .locator("button:has-text('Settings'), button:has-text('設定')")
      .first()
    await expect(settingsTabBtn).toBeVisible()
    await settingsTabBtn.click({ force: true })

    // Expand Local AI Model (WebLLM) section
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    const chevronDown = webLlmAccordionHeader.locator("svg.lucide-chevron-down")
    if (await chevronDown.isVisible().catch(() => false)) {
      await webLlmAccordionHeader.click({ force: true })
    }

    // Verify Unsupported error UI is shown immediately
    const unsupportedWarning = spFrame
      .locator("text=/AI Environment Unsupported|AI実行環境非対応/")
      .first()
    await expect(unsupportedWarning).toBeVisible({ timeout: 20000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "webgpu-both-unsupported-error.png")
    })
    console.log("WebGPU both unsupported error screenshot saved.")
  })
})
