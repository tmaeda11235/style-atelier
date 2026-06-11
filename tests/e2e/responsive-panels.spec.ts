import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Responsive Panels & Accordion @J-WB-EXPERT-06", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should support collapse/expand of ParameterEditor and responsive buttons at narrow widths", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Responsive Panels E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Click a card in HandBar to add to Workbench so mixing mode is active
    console.log("Adding mock card from HandBar to Workbench...")
    const mockCardInHand = spFrame
      .locator("#handbar-root .cursor-pointer")
      .nth(1)
    await expect(mockCardInHand).toBeVisible({ timeout: 10000 })
    await mockCardInHand.click({ force: true })
    console.log("Switching to Workbench tab...")
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
    await workbenchTabButton.click()
    const toggleBtn = spFrame.locator("[data-testid='parameter-editor-toggle']")
    await expect(toggleBtn).toBeVisible({ timeout: 10000 })

    // Verify parameter inner fields are VISIBLE initially (accordion expanded by default)
    const customArInput = spFrame.locator("input[placeholder='Custom']")
    await expect(customArInput).toBeVisible()

    // 5. Click to collapse ParameterEditor accordion
    console.log("Collapsing ParameterEditor accordion...")
    await toggleBtn.click()
    await expect(customArInput).not.toBeVisible()

    // Capture screenshot of collapsed state
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-editor-collapsed.png")
    })
    console.log("ParameterEditor collapsed screenshot saved.")

    // 6. Click to expand ParameterEditor accordion again
    console.log("Expanding ParameterEditor accordion again...")
    await toggleBtn.click()
    await expect(customArInput).toBeVisible()

    // Capture screenshot of expanded state
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-editor-expanded.png")
    })
    console.log("ParameterEditor expanded screenshot saved.")

    // 7. Locate responsive buttons
    // The main Try on Midjourney button should be visible with text initially (width 380px)
    const tryOnMidjourneyBtn = spFrame.locator(
      "button:has-text('Try on Midjourney')"
    )
    const btnText = spFrame.locator(".responsive-btn-text").first()
    await expect(tryOnMidjourneyBtn).toBeVisible()
    await expect(btnText).toBeVisible()

    // 8. Shrink side panel frame width to 250px to trigger container query
    console.log("Shrinking sidepanel-frame to 250px...")
    await page.evaluate(() => {
      const iframe = document.getElementById("sidepanel-frame")
      if (iframe) {
        iframe.style.width = "250px"
      }
    })

    // Verify text is now hidden (display: none via container query)
    await expect(btnText).not.toBeVisible()

    // Capture narrow state screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-editor-narrow.png")
    })
    console.log("Narrow UI layout screenshot saved.")

    // 9. Hover over the button wrapper to trigger tooltip
    console.log("Hovering over button to test CSS tooltip...")
    const btnWrapper = spFrame.locator(".responsive-btn-wrapper").last()
    await btnWrapper.hover()
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-editor-narrow-tooltip.png")
    })
    console.log("Tooltip hover screenshot saved.")
  })
})
