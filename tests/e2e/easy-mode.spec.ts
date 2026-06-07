/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Easy Mode Workbench Modal @J-WB-EASY-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should open Simple Workbench modal on card click in Easy Mode, adjust prompt, and inject successfully", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Easy Mode Workbench E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Verify Guide button is visible in default Expert Mode
    const guideBtn = spFrame.locator("button[title='Show Guide']")
    await expect(guideBtn).toBeVisible({ timeout: 10000 })

    // 2. Toggle Easy Mode ON
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 })
    await easyModeToggle.click()
    await page.waitForTimeout(500)

    // Verify Guide button is hidden in Easy Mode
    await expect(guideBtn).not.toBeVisible({ timeout: 10000 })

    // Save screenshot of Easy Mode layout showing the guide button is hidden
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-guide-hidden.png")
    })

    // 3. Inject a mock card in Easy Mode
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "easy-mode-card-1",
        name: "Easy Mode test card",
        promptSegments: [
          { type: "text", value: "cute cat illustration" },
          { type: "slot", label: "Color", default: "blue" }
        ],
        parameters: { ar: "16:9" },
        masking: {},
        tier: "Rare",
        isPinned: false,
        dominantColor: "#3b82f6",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
      })
    })

    // Wait for the view to update and card to render
    await page.waitForTimeout(1000)

    // 4. Locate and click on the newly seeded card in LibraryTab
    const cardElement = spFrame.locator("text=Easy Mode test card").first()
    await expect(cardElement).toBeVisible({ timeout: 10000 })

    // Ensure the pin/select button is NOT visible for this card
    const pinBtn = spFrame.locator("button[title='Workbenchに送る']")
    await expect(pinBtn).not.toBeVisible()

    await cardElement.click()

    // 5. Verify the Simple Workbench Modal has opened
    const modalTitle = spFrame.locator(
      "h3:has-text('Simple Workbench'), h3:has-text('簡易 Workbench')"
    )
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    // Capture screenshot of the opened Simple Workbench modal
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-workbench-modal.png")
    })
    console.log("Simple Workbench modal screenshot saved.")

    // 6. Click 'Try on Midjourney' within the modal
    const injectBtn = spFrame.locator("button:has-text('Try on Midjourney')")
    await expect(injectBtn).toBeVisible()
    await injectBtn.click()

    // 7. Verify prompt is injected into Midjourney text area (resolving the slot to its default value 'blue')
    const mjTextarea = mjFrame
      .locator('textarea, [role="textbox"], [data-testid="prompt-input"]')
      .first()
    await expect(mjTextarea).toHaveValue(
      "cute cat illustration, blue --ar 16:9",
      { timeout: 10000 }
    )

    // 8. Close the modal by clicking 'Cancel'
    const cancelBtn = spFrame.locator(
      "button:has-text('Cancel'), button:has-text('キャンセル')"
    )
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 })
  })
})
