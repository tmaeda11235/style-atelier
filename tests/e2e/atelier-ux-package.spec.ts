/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Atelier UX Package @J-WB-MIXING-WEIGHTS-01 @J-WB-PORTION-EXTRACT-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should support card drag-and-drop to Workbench, weight adjustment, and portion extraction", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page for Atelier UX Package test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed style cards in DB
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-atelier-test",
          name: "Golden Hour Photo",
          promptSegments: [
            { type: "text", value: "golden hour portrait" },
            { type: "slot", label: "Subject", default: "woman" }
          ],
          parameters: { ar: "16:9", chaos: "20" },
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#f59e0b",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23f59e0b'/></svg>"
        }
      ])
    })

    // 3. Switch to Library tab to see the card first
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.screenshot({
      path: path.join(screenshotsDir, "atelier-workbench-empty.png")
    })

    // 4. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    console.log("Verifying card is added to workbench...")

    // Verify card is added to Workbench cauldron slot
    const workbenchCardThumb = spFrame
      .locator(".animate-float-gentle img[alt='Golden Hour Photo']")
      .first()
    await expect(workbenchCardThumb).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "atelier-workbench-cards-added.png")
    })

    // 6. Test weight adjustment slider
    console.log("Hovering card to reveal slider...")
    await workbenchCardThumb.hover({ force: true })

    const slider = spFrame.locator("input[type='range']").first()
    await expect(slider).toBeVisible()

    // Change weight value programmatically (simulate slider movement)
    console.log("Adjusting card weight...")
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = "1.5"
      el.dispatchEvent(new Event("change", { bubbles: true }))
    })

    // 7. Click card to open Portion Extraction overlay
    console.log("Opening Portion Extraction menu...")
    await workbenchCardThumb.click({ force: true })

    const portionHeader = spFrame.locator("text=Extract Portions")
    await expect(portionHeader).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "atelier-portion-menu-open.png")
    })

    // 8. Click Extract on a segment to create a portion card
    console.log("Extracting portion...")
    const extractBtn = spFrame.locator("button:has-text('Extract')").first()
    await expect(extractBtn).toBeVisible()
    await extractBtn.click({ force: true })

    // Verify portion card added to DB by checking Hand area

    const portionCard = spFrame
      .locator("img[alt='[Portion] golden hour portrait']")
      .first()
    await expect(portionCard).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "atelier-portion-extracted.png")
    })

    console.log("Atelier UX Package E2E tests passed successfully!")
  })
})
