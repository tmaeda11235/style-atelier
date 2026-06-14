import path from "path"
import { expect, test } from "@playwright/test"

test.describe("WebGPU Troubleshooting Guide E2E Tests", () => {
  test.slow()

  test("should display WebGPU troubleshooting warning in SettingsTab when WebGPU is disabled", async ({
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
    await webLlmAccordionHeader.click({ force: true })

    const warningTitle = spFrame
      .locator("text=/WebGPU is disabled|WebGPUが無効です/")
      .first()
    await expect(warningTitle).toBeVisible({ timeout: 10000 })

    const statusText = spFrame
      .locator(
        "text=/Unsupported \\(Lightweight Fallback\\)|非サポート \\(軽量フォールバックモード\\)/"
      )
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

    await page.screenshot({
      path: path.join(screenshotsDir, "webgpu-troubleshooting-settings.png")
    })
    console.log("WebGPU troubleshooting settings warning screenshot saved.")
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
    await webLlmAccordionHeader.click({ force: true })

    const warningTitle = spFrame
      .locator("text=/WebGPU is disabled|WebGPUが無効です/")
      .first()
    await expect(warningTitle).not.toBeVisible({ timeout: 5000 })
  })
})
