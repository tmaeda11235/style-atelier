import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Workbench Empty Cauldron Affordance E2E Tests @J-WB-EMPTY-CAULDRON-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display visual indicators and update styles in Workbench Empty State during drag operations", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear IndexedDB styleCards to ensure Cauldron is empty and WorkbenchEmptyState is shown
    console.log("Clearing DB styleCards...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
    })

    console.log("Switching to Workbench tab...")
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
    await workbenchTabButton.click()

    // 3. Ensure Workbench Empty State is visible
    console.log("Waiting for Workbench Empty State...")
    const emptyState = spFrame.locator("[data-testid='workbench-empty-state']")
    await expect(emptyState).toBeVisible({ timeout: 10000 })

    // Check that it contains the Cauldron Graphic
    const cauldronGraphic = emptyState.locator(
      "[data-testid='workbench-cauldron-graphic']"
    )
    await expect(cauldronGraphic).toBeVisible()

    // Capture normal empty state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-empty-cauldron-normal.png")
    })
    console.log("Captured normal empty state screenshot.")

    // 4. Simulate global dragstart event to test global dragging appearance
    console.log("Simulating global dragstart...")
    const body = spFrame.locator("body")
    await body.evaluate((el) => {
      const event = new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
    })

    // 5. Simulate dragover on the empty state area to trigger isDragOver
    console.log("Simulating dragover on Workbench Empty State...")
    await emptyState.evaluate((el) => {
      const event = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
    })

    // Check if the empty state transitions to blue border/shadow (active dragover)
    await expect(emptyState).toHaveClass(/border-blue-400/)

    // Capture dragover empty state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-empty-cauldron-dragover.png")
    })
    console.log("Captured dragover empty state screenshot.")

    // 6. Simulate dragend to reset
    console.log("Simulating dragend...")
    await body.evaluate((el) => {
      const event = new DragEvent("dragend", {
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
    })

    // Verify it returned to the normal border (slate-200 / border-slate-200)
    await expect(emptyState).toHaveClass(/border-slate-200/)

    console.log(
      "Workbench Empty Cauldron Affordance E2E test passed successfully!"
    )
  })
})
