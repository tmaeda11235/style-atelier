import fs from "fs"
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - Workbench Undo/Redo @J-WB-UNDO-REDO-01", () => {
  const screenshotsDir = "tests/screenshots"

  test.beforeAll(() => {
    // Create screenshots directory
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should handle undo/redo via buttons and keyboard shortcuts", async ({
    page
  }) => {
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if present
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
    await workbenchTabButton.click()

    // 3. Verify initial Undo/Redo button states (should be disabled)
    const undoBtn = spFrame.locator("#workbench-undo-btn")
    const redoBtn = spFrame.locator("#workbench-redo-btn")
    await expect(undoBtn).toBeVisible()
    await expect(redoBtn).toBeVisible()
    await expect(undoBtn).toBeDisabled()
    await expect(redoBtn).toBeDisabled()

    // 4. Verify initial cards on the workbench (mock cards seeded by sandbox)
    const initialCardCount = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(initialCardCount).toBe(2) // Sandbox seeds 2 mock cards by default

    // Capture screenshot: Initial state
    await page.screenshot({
      path: path.join(screenshotsDir, "01_workbench_initial.png")
    })

    // 5. Remove first card
    const firstCard = spFrame.locator(".animate-float-gentle").first()
    await firstCard.locator("button").click({ force: true })
    await page.waitForTimeout(500)

    // Verify card count decreased to 1
    const countAfterFirstRemove = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterFirstRemove).toBe(1)

    // Verify Undo is enabled, Redo is disabled
    await expect(undoBtn).toBeEnabled()
    await expect(redoBtn).toBeDisabled()

    // Capture screenshot: First card removed
    await page.screenshot({
      path: path.join(screenshotsDir, "02_workbench_first_removed.png")
    })

    // 6. Remove second card
    const remainingCard = spFrame.locator(".animate-float-gentle").first()
    await remainingCard.locator("button").click({ force: true })
    await page.waitForTimeout(500)

    // Verify card count decreased to 0
    const countAfterSecondRemove = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterSecondRemove).toBe(0)

    // Verify Undo is enabled, Redo is disabled
    await expect(undoBtn).toBeEnabled()
    await expect(redoBtn).toBeDisabled()

    // Capture screenshot: Second card removed
    await page.screenshot({
      path: path.join(screenshotsDir, "03_workbench_second_removed.png")
    })

    // 7. Click Undo once (should restore the second card)
    await undoBtn.click()
    await page.waitForTimeout(500)

    // Verify card count is 1
    const countAfterUndo1 = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterUndo1).toBe(1)

    // Verify both Undo and Redo are enabled
    await expect(undoBtn).toBeEnabled()
    await expect(redoBtn).toBeEnabled()

    // Capture screenshot: Undo 1
    await page.screenshot({
      path: path.join(screenshotsDir, "04_workbench_undo_1.png")
    })

    // 8. Click Undo again (should restore the first card, back to initial 2 cards)
    await undoBtn.click()
    await page.waitForTimeout(500)

    // Verify card count is 2 (initial state)
    const countAfterUndo2 = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterUndo2).toBe(2)

    // Verify Undo is disabled, Redo is enabled
    await expect(undoBtn).toBeDisabled()
    await expect(redoBtn).toBeEnabled()

    // Capture screenshot: Undo 2 (back to initial)
    await page.screenshot({
      path: path.join(screenshotsDir, "05_workbench_undo_2_initial.png")
    })

    // 9. Click Redo (should remove the first card again, leaving 1 card)
    await redoBtn.click()
    await page.waitForTimeout(500)

    // Verify card count is 1
    const countAfterRedo = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterRedo).toBe(1)

    // Verify both Undo and Redo are enabled
    await expect(undoBtn).toBeEnabled()
    await expect(redoBtn).toBeEnabled()

    // Capture screenshot: Redo 1
    await page.screenshot({
      path: path.join(screenshotsDir, "06_workbench_redo_1.png")
    })

    // 10. Test keyboard shortcuts
    const blurActiveElement = async () => {
      await spFrame.locator("body").evaluate(() => {
        if (
          document.activeElement &&
          typeof (document.activeElement as any).blur === "function"
        ) {
          ;(document.activeElement as any).blur()
        }
      })
    }

    // Press Ctrl+Z to Undo (should restore to 2 cards)
    await blurActiveElement()
    await spFrame.locator("body").evaluate(() => {
      const event = new KeyboardEvent("keydown", {
        key: "z",
        code: "KeyZ",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(event)
    })
    await page.waitForTimeout(500)
    const countAfterKbUndo = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterKbUndo).toBe(2)

    // Press Ctrl+Y to Redo (should remove to 1 card)
    await blurActiveElement()
    await spFrame.locator("body").evaluate(() => {
      const event = new KeyboardEvent("keydown", {
        key: "y",
        code: "KeyY",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(event)
    })
    await page.waitForTimeout(500)
    const countAfterKbRedo = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterKbRedo).toBe(1)

    // Press Ctrl+Z to Undo again (back to 2 cards)
    await blurActiveElement()
    await spFrame.locator("body").evaluate(() => {
      const event = new KeyboardEvent("keydown", {
        key: "z",
        code: "KeyZ",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(event)
    })
    await page.waitForTimeout(500)

    // Press Ctrl+Shift+Z to Redo (should remove to 1 card)
    await blurActiveElement()
    await spFrame.locator("body").evaluate(() => {
      const event = new KeyboardEvent("keydown", {
        key: "z",
        code: "KeyZ",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(event)
    })
    await page.waitForTimeout(500)
    const countAfterKbShiftZRedo = await spFrame
      .locator(".animate-float-gentle")
      .count()
    expect(countAfterKbShiftZRedo).toBe(1)

    console.log("E2E Test for Workbench Undo/Redo completed successfully!")
  })
})
