import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Recipe History @J-WB-RECIPE-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should save recipe history on injection and restore it when clicked", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // 1. Navigate to sandbox page
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 2. Wait for Midjourney mock inputs
    console.log("Waiting for Midjourney mock inputs...")
    const textarea = mjFrame
      .locator(
        'textarea, [role="textbox"], [data-testid="prompt-input"], [aria-label*="prompt"]'
      )
      .first()
    await expect(textarea).toBeVisible({ timeout: 15000 })

    // 3. Skip welcome dialog if present
    console.log("Checking for welcome dialog...")
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Welcome dialog detected, clicking skip...")
      await skipButton.click()
    }

    // 4. Switch to Workbench tab
    console.log("Switching to Workbench tab in Sidepanel...")
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
    await workbenchTabButton.click()

    // 5. Click 'Try on Midjourney' button to save a recipe
    console.log("Clicking 'Try on Midjourney' button to save recipe...")
    const injectButton = spFrame.locator("button:has-text('Try on Midjourney')")
    await expect(injectButton).toBeVisible()
    await injectButton.click()

    // Verify prompt injected successfully in MJ mock
    console.log("Verifying prompt injection...")
    await expect(textarea).toHaveValue(/.*neon-lit cyberpunk aesthetic.*/, {
      timeout: 10000
    })

    // 6. Click History button to verify saved recipe
    console.log("Opening recipe history...")
    const historyBtn = spFrame.locator("#workbench-history-btn")
    await expect(historyBtn).toBeVisible()
    await historyBtn.click()

    const dropdown = spFrame.locator(
      "[data-testid='workbench-history-dropdown']"
    )
    await expect(dropdown).toBeVisible()

    // Check if the recipe exists (it should contain card name "cyberpunk aesthetic" in the recipe title)
    const recipeItem = dropdown
      .locator("button")
      .filter({ hasText: "cyberpunk" })
      .first()
    await expect(recipeItem).toBeVisible()

    // 7. Clear the workbench and ensure it is empty
    console.log("Closing dropdown and clearing workbench...")
    await historyBtn.click() // Close dropdown
    await expect(dropdown).not.toBeVisible()

    const clearBtn = spFrame.locator("button:has-text('Clear All')")
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
    }

    const emptyState = spFrame
      .locator("div:has-text('Workbench is empty')")
      .first()
    await expect(emptyState).toBeVisible()

    // 8. Restore the recipe
    console.log("Opening history and restoring recipe...")
    await historyBtn.click()
    await expect(dropdown).toBeVisible()
    await recipeItem.click() // Restore (closes dropdown automatically)

    // Verify that workbench is no longer empty and has cards restored
    console.log("Verifying restored workbench cards...")
    await expect(emptyState).not.toBeVisible()
    const handCards = spFrame.locator("#handbar-root .cursor-pointer")
    await expect(handCards.first()).toBeVisible()

    // 9. Take a success screenshot for proof
    console.log("Taking success screenshot...")
    await historyBtn.click() // Open history dropdown again to capture it in screenshot
    await expect(dropdown).toBeVisible()
    await page.screenshot({
      path: path.join(screenshotsDir, "recipe-history-success.png")
    })
    console.log("Recipe history E2E test completed successfully!")
  })
})
