/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Cauldron Drag and Drop Affordance E2E Tests @J-WB-EXPERT-03", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display visual indicators and update styles during drag operations in Cauldron", async ({
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

    // 2. Clear IndexedDB styleCards to ensure CauldronDropZone is shown
    console.log("Clearing DB styleCards...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
    })
    await page.waitForTimeout(500)

    // 3. Switch to Workbench tab
    console.log("Switching to Workbench tab...")
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
    await workbenchTabButton.click()

    // 4. Ensure Cauldron DropZone is visible
    console.log("Waiting for Cauldron DropZone...")
    const dropZone = spFrame
      .locator("[data-testid='cauldron-dropzone']")
      .first()
    await expect(dropZone).toBeVisible({ timeout: 10000 })

    // Check that it contains the ArrowDown SVG
    const arrowIcon = dropZone.locator("svg")
    await expect(arrowIcon).toBeVisible()

    // Capture normal state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "cauldron-affordance-normal.png")
    })
    console.log("Captured normal state screenshot.")

    // 5. Simulate global dragstart event to test isGlobalDragging state
    console.log("Simulating global dragstart...")
    const body = spFrame.locator("body")
    await body.evaluate((el) => {
      const event = new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
    })

    // Check if the dropzone transitions to indigo border/shadow / pulse
    await expect(dropZone).toHaveClass(/border-indigo-500/)

    // Capture dragging state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "cauldron-affordance-dragging.png")
    })
    console.log("Captured dragging state screenshot.")

    // 6. Simulate dragover on the DropZone to test isDragOver state
    console.log("Simulating dragover on DropZone...")
    await dropZone.evaluate((el) => {
      const event = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
    })

    // Check if the dropzone transitions to blue border/shadow
    await expect(dropZone).toHaveClass(/border-blue-400/)

    // Capture dragover state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "cauldron-affordance-dragover.png")
    })
    console.log("Captured dragover state screenshot.")

    // 7. Simulate dragend/dragleave to reset
    console.log("Simulating dragend...")
    await body.evaluate((el) => {
      const event = new DragEvent("dragend", {
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
    })

    // Verify it returned to the normal border slate-800
    await expect(dropZone).toHaveClass(/border-slate-800/)

    console.log(
      "Cauldron Drag-and-drop Affordance E2E test passed successfully!"
    )
  })
})
