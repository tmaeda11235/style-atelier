import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Slot Variables UX @J-WB-EXPERT-04", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed localStorage to prevent onboarding welcome dialog overlays from interrupting tests
    await page.addInitScript(() => {
      window.localStorage.setItem("style-atelier-onboarding-seen", "true")
    })
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should allow interacting with slot suggestions via keyboard and drag-and-drop", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page for Slot UX test...")
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
          id: "card-slot-test",
          name: "Slot Test Card",
          promptSegments: [
            { type: "text", value: "a photo of" },
            { type: "slot", label: "Subject", default: "dog" }
          ],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%233b82f6'/></svg>"
        },
        {
          id: "card-hand-suggest",
          name: "cyberpunk cat",
          promptSegments: [{ type: "text", value: "cyberpunk cat" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#10b981",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%2310b981'/></svg>"
        }
      ])
    })

    // Assert hand card is visible while still on the Library tab (HandBar is visible here)
    const handCardElement = spFrame
      .locator("#handbar-root [draggable=true]")
      .last()
    await expect(handCardElement).toBeVisible()

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click({ force: true })

    // 4. Verify Slot Variables section is shown
    const slotInput = spFrame.locator("[data-testid='slot-input-Subject']")
    await expect(slotInput).toBeVisible({ timeout: 10000 })

    // 5. Focus the input to trigger popover
    console.log("Focusing slot input to trigger popover...")
    await slotInput.focus()

    // 6. Verify suggestion "cyberpunk cat" is visible in popover
    const popoverSuggestion = spFrame.locator(
      "button:has-text('cyberpunk cat')"
    )
    await expect(popoverSuggestion).toBeVisible()

    // Capture screenshot of popover open
    await page.screenshot({
      path: path.join(screenshotsDir, "slot-popover-open.png")
    })

    // 7. Test Keyboard Navigation (ArrowDown -> Enter)
    console.log("Testing keyboard navigation...")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")

    // 8. Verify the input has value "cyberpunk cat"
    await expect(slotInput).toHaveValue("cyberpunk cat")

    // Clear input to test drag-and-drop next
    await slotInput.fill("")

    // 9. Drag and Drop test (simulated programmatically since HandBar is unmounted in Workbench tab)
    console.log("Testing drag and drop from HandBar to slot zone...")
    const dropZone = spFrame.locator("[data-testid='slot-zone-Subject']")

    // Check visibility of drop zone
    await expect(dropZone).toBeVisible()

    // Dispatch programmatic drop event for Drag-and-Drop
    console.log("Dispatching programmatic drop event for Drag-and-Drop...")
    await dropZone.evaluate((element) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.setData("text/plain", "cyberpunk cat")

      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      element.dispatchEvent(dragOverEvent)

      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      element.dispatchEvent(dropEvent)
    })

    // 10. Verify value is filled via Drag-and-Drop
    await expect(slotInput).toHaveValue("cyberpunk cat")

    // Capture final screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "slot-dnd-filled.png")
    })

    console.log("Slot Variables UX E2E tests passed successfully!")
  })
})
