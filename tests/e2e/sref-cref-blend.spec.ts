/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Midjourney Sref/Cref Intelligent Blend", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should blend multiple cards sref and cref with weights on Workbench", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for sref/cref blend E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 2 cards with different sref weights and custom weights
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "blend-card-1",
          name: "Card 1 (srefA)",
          promptSegments: [{ type: "text", value: "neon cyber" }],
          parameters: {
            sref: [
              "https://example.com/srefA::2",
              "https://example.com/shared"
            ],
            cref: ["https://example.com/crefA"]
          },
          masking: {},
          tier: "Common",
          isPinned: true,
          weight: 1.5,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "blend-card-2",
          name: "Card 2 (srefB)",
          promptSegments: [{ type: "text", value: "golden light" }],
          parameters: {
            sref: [
              "https://example.com/srefB",
              "https://example.com/shared::0.5"
            ],
            cref: ["https://example.com/crefB"]
          },
          masking: {},
          tier: "Common",
          isPinned: true,
          weight: 0.5,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()

    // 4. Try on Midjourney (Inject)
    const injectBtn = spFrame.locator("button:has-text('Try on Midjourney')")
    await expect(injectBtn).toBeVisible()
    await injectBtn.click()

    // 5. Verify prompt in Midjourney mock textarea has correct weighted blending
    // srefA: 2 * 1.5 = 3
    // shared: 1 * 1.5 + 0.5 * 0.5 = 1.5 + 0.25 = 1.75
    // srefB: 1 * 0.5 = 0.5
    // crefA: 1 * 1.5 = 1.5
    // crefB: 1 * 0.5 = 0.5
    const mjTextarea = mjFrame
      .locator('textarea, [role="textbox"], [data-testid="prompt-input"]')
      .first()
    await expect(mjTextarea).toHaveValue(
      "neon cyber::1.5, golden light::0.5 --sref https://example.com/srefA::3 https://example.com/shared::1.75 https://example.com/srefB::0.5 --cref https://example.com/crefA::1.5 https://example.com/crefB::0.5",
      { timeout: 10000 }
    )

    await page.screenshot({
      path: path.join(screenshotsDir, "sref-cref-intelligent-blend-success.png")
    })
  })
})
