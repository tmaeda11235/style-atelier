import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - AI Recipe Advice @J-WB-AI-ADVICE-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display AI recipe advice when model is loaded and multiple cards are in workbench", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for AI Recipe Advice E2E test...")
    await page.addInitScript(() => {
      ;(window as any).mockWebLlmConfig = {
        supportWebGpu: true
      }
    })
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear db and seed 2 pinned cards
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-ai-1",
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
          id: "card-ai-2",
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

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000)

    // 4. Verify AI Advice Section is visible (since there are 2 pinned cards)
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible({ timeout: 5000 })

    // 5. Expand the advice section accordion (by clicking the header)
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click()
    await page.waitForTimeout(500)

    // Scroll advice section to top of viewport to prevent fixed HandBar overlay issues
    await adviceSection.evaluate((el) => el.scrollIntoView({ block: "start" }))
    await page.waitForTimeout(500)

    // 6. When model is not loaded, it should show static fallback advice and the fallback disclaimer
    const fallbackText = spFrame.locator(
      "text=/Operating in lightweight fallback mode|軽量フォールバックモード/"
    )
    await expect(fallbackText).toBeVisible({ timeout: 5000 })

    const adviceHeader = spFrame.locator(
      "text=/Recipe Advice|レシピアドバイス/"
    )
    await expect(adviceHeader).toBeVisible()

    // Capture screenshot of fallback recipe advice state in Cauldron
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-recipe-advice-fallback.png")
    })
    console.log("AI Recipe Advice fallback state screenshot saved.")

    // 7. Mock WebLLM custom inferenceResult
    await spFrame.locator("body").evaluate(async () => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.inferenceResult = `### 🔮 AI Cauldron Recipe Advice
- **Expected Visual Blending Effect**: A rainy cyberpunk city rendered with beautiful watercolor paint drips and glowing neon reflections on wet asphalt.
- **Recommended Weights**: Cyberpunk Glow: **1.2** vs Watercolor Rain: **0.8** (preserves the neon highlights while overlaying watercolor texture).
- **Suggested Keywords**: *reflection on wet asphalt, soft color bleeding, ink washes*`
      }
    })

    // Click "Download Model" button to trigger transition to ready state
    const downloadBtn = adviceSection.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.dispatchEvent("click")
    await page.waitForTimeout(500)

    // Click inline "Start Download" button in the confirm view
    const startDownloadBtn = spFrame.locator(
      "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
    )
    await expect(startDownloadBtn).toBeVisible()
    await startDownloadBtn.dispatchEvent("click")

    await page.waitForTimeout(3000) // Wait for downloading animation, debounce, and mock inference resolution

    // 8. Verify advice is generated and rendered
    const adviceText = spFrame.locator("text=/Expected Visual Blending Effect/")
    await expect(adviceText).toBeVisible({ timeout: 10000 })

    // Capture screenshot of the final AI recipe advice in action
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-recipe-advice-ready.png")
    })
    console.log("AI Recipe Advice ready state screenshot saved.")
  })

  test("should show static fallback advice and NO download option when WebGPU is unsupported", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for AI WebGPU Unsupported Fallback test..."
    )
    await page.addInitScript(() => {
      ;(window as any).mockWebLlmConfig = {
        supportWebGpu: false
      }
    })
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Seed 2 pinned cards
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-ai-1",
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
          id: "card-ai-2",
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
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000)

    // Expand AI Advice Section
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible()
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click()
    await page.waitForTimeout(500)

    // Verify static fallback advice text is visible
    const fallbackText = spFrame.locator(
      "text=/Operating in lightweight fallback mode|軽量フォールバックモード/"
    )
    await expect(fallbackText).toBeVisible({ timeout: 5000 })

    // Verify download button is NOT visible/present
    const downloadBtn = adviceSection.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).not.toBeVisible()

    // Capture screenshot of unsupported WebGPU fallback state
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-recipe-advice-webgpu-unsupported.png")
    })
    console.log(
      "AI Recipe Advice unsupported WebGPU fallback state screenshot saved."
    )
  })
})
