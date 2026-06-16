import path from "path"
import { expect } from "@playwright/test"

import { test } from "./extension-fixture"

test.describe("Style Atelier Sandbox E2E Tests - Progress Bar Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure mock-webllm-downloaded is cleared BEFORE React mounts on sandbox load
    await page.addInitScript(() => {
      window.localStorage.removeItem("mock-webllm-downloaded")
      ;(window as any).mockWebLlmConfig = {
        supportWebGpu: true
      }
    })
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should have WAI-ARIA progressbar attributes on Storage progress bar", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Storage Progress Bar Accessibility..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Settings tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // Expand Maintenance section
    const maintenanceAccordionHeader = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeader).toBeVisible({ timeout: 10000 })
    await maintenanceAccordionHeader.click()

    // Locate the Storage progress bar
    const storageProgressBar = spFrame.locator("[role='progressbar']").first()
    await expect(storageProgressBar).toBeVisible({ timeout: 10000 })

    // Check WAI-ARIA attributes
    const role = await storageProgressBar.getAttribute("role")
    const ariaValueNow = await storageProgressBar.getAttribute("aria-valuenow")
    const ariaValueMin = await storageProgressBar.getAttribute("aria-valuemin")
    const ariaValueMax = await storageProgressBar.getAttribute("aria-valuemax")
    const ariaLabel = await storageProgressBar.getAttribute("aria-label")

    expect(role).toBe("progressbar")
    expect(Number(ariaValueNow)).toBeGreaterThanOrEqual(0)
    expect(Number(ariaValueNow)).toBeLessThanOrEqual(100)
    expect(ariaValueMin).toBe("0")
    expect(ariaValueMax).toBe("100")
    expect(ariaLabel).toContain("Usage")

    // Take a screenshot of the progress bar accessibility validation
    await page.screenshot({
      path: path.join(screenshotsDir, "accessibility-storage-progressbar.png")
    })
    console.log("Storage progress bar accessibility screenshot saved.")
  })

  test("should have WAI-ARIA progressbar attributes on WebLLM download progress bar", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for WebLLM Progress Bar Accessibility..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }

    // Clear db and seed 2 cards
    await spFrame.locator("body").evaluate(async () => {
      localStorage.removeItem("mock-webllm-downloaded")
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-p1",
          name: "Cyberpunk Glow",
          promptSegments: [{ type: "text", value: "neon cyberpunk city" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-p2",
          name: "Watercolor Rain",
          promptSegments: [
            { type: "text", value: "rainy street, watercolor style" }
          ],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // Switch to Workbench tab
    const workbenchTabBtn = spFrame
      .locator("button:has-text('Workbench'), button:has-text('ワークベンチ')")
      .first()
    await workbenchTabBtn.click({ force: true })
    await page.waitForTimeout(1000)

    // Verify AI Advice Section is visible
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible()

    // Expand accordion
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click({ force: true })
    await page.waitForTimeout(500)

    // Setup slow download mock
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = false
        config.downloadSpeed = 1500 // slower download speed to capture progressbar state
      }
    })

    // Click Download Model button inside Recipe Advice
    const downloadBtn = adviceSection.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await page.waitForTimeout(500)
    await downloadBtn.dispatchEvent("click")
    await page.waitForTimeout(500)

    // Click confirmation button
    const confirmDownloadBtn = spFrame
      .locator(
        "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
      )
      .first()

    // Debugging print
    const html = await spFrame
      .locator("#ai-recipe-advice-section")
      .innerHTML()
      .catch(() => "not found")
    console.log("DEBUG: #ai-recipe-advice-section innerHTML:", html)

    await expect(confirmDownloadBtn).toBeVisible()
    await confirmDownloadBtn.dispatchEvent("click")

    // Assert download progress UI is shown
    const downloadingLabel = spFrame
      .locator("text=/Downloading|ダウンロード中/")
      .first()
    await expect(downloadingLabel).toBeVisible({ timeout: 15000 })

    // Locate WebLLM progress bar
    const webLlmProgressBar = spFrame.locator("[role='progressbar']").first()
    await expect(webLlmProgressBar).toBeVisible({ timeout: 15000 })

    // Validate accessibility attributes
    const role = await webLlmProgressBar.getAttribute("role")
    const ariaValueNow = await webLlmProgressBar.getAttribute("aria-valuenow")
    const ariaValueMin = await webLlmProgressBar.getAttribute("aria-valuemin")
    const ariaValueMax = await webLlmProgressBar.getAttribute("aria-valuemax")
    const ariaValueText = await webLlmProgressBar.getAttribute("aria-valuetext")
    const ariaLabel = await webLlmProgressBar.getAttribute("aria-label")

    expect(role).toBe("progressbar")
    expect(Number(ariaValueNow)).toBeGreaterThanOrEqual(0)
    expect(Number(ariaValueNow)).toBeLessThanOrEqual(100)
    expect(ariaValueMin).toBe("0")
    expect(ariaValueMax).toBe("100")
    expect(ariaValueText).toContain("%")
    expect(ariaLabel).toContain("Download")

    // Take screenshot of the WebLLM download progress accessibility validation
    await page.screenshot({
      path: path.join(screenshotsDir, "accessibility-webllm-progressbar.png")
    })
    console.log("WebLLM download progress accessibility screenshot saved.")
  })
})
