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

    // 6. When model is not loaded, it should show LocalAiSetupPlaceholder
    const placeholder = spFrame.locator("#local-ai-setup-placeholder")
    await expect(placeholder).toBeVisible({ timeout: 5000 })

    // Capture screenshot of placeholder state in Cauldron
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-recipe-advice-placeholder.png")
    })
    console.log("AI Recipe Advice placeholder state screenshot saved.")

    // Click Setup button inside placeholder to transition to settings
    const setupBtn = spFrame.locator("#local-ai-setup-start-btn")
    await expect(setupBtn).toBeVisible()
    await setupBtn.click()
    await page.waitForTimeout(500)

    // Now Settings tab should be active, and WebLLM download button should be focused
    const downloadBtn = spFrame.locator("#webllm-download-btn")
    await expect(downloadBtn).toBeVisible()

    // 7. Mock WebLLM downloaded/integrityPassed to true to make model "ready"
    // Also mock custom inferenceResult
    await spFrame.locator("body").evaluate(async () => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.integrityPassed = true
        config.inferenceResult = `### 🔮 AI Cauldron Recipe Advice
- **Expected Visual Blending Effect**: A rainy cyberpunk city rendered with beautiful watercolor paint drips and glowing neon reflections on wet asphalt.
- **Recommended Weights**: Cyberpunk Glow: **1.2** vs Watercolor Rain: **0.8** (preserves the neon highlights while overlaying watercolor texture).
- **Suggested Keywords**: *reflection on wet asphalt, soft color bleeding, ink washes*`
      }
      localStorage.setItem("mock-webllm-downloaded", "true")
    })

    // Switch back to Workbench tab to trigger loading
    await workbenchTabButton.click()
    await page.waitForTimeout(1000)

    // Expand accordion if not open (it should be open or we toggle it)
    const newAdviceSection = spFrame.locator("#ai-recipe-advice-section")
    const newAccordionHeader = newAdviceSection.locator(
      "#ai-recipe-advice-toggle"
    )
    const isExpanded = await newAccordionHeader.getAttribute("aria-expanded")
    if (isExpanded !== "true") {
      await newAccordionHeader.click()
      await page.waitForTimeout(500)
    }

    await page.waitForTimeout(3000) // Wait for mock inference resolution

    // 8. Verify advice is generated and rendered
    const adviceText = spFrame.locator("text=/Expected Visual Blending Effect/")
    await expect(adviceText).toBeVisible({ timeout: 10000 })

    // Capture screenshot of the final AI recipe advice in action
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-recipe-advice-ready.png")
    })
    console.log("AI Recipe Advice ready state screenshot saved.")
  })
})
