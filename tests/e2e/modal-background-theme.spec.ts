import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier - Modal Background Theme Verification @J-MODAL-01", () => {
  test("should have light/dark responsive overlay backgrounds in modals", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Go to sandbox page
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Check Welcome dialog overlay in default/light mode
    console.log("Checking welcome dialog in light mode...")
    const welcomeOverlay = spFrame.locator("div.fixed.inset-0.z-\\[110\\]")
    await expect(welcomeOverlay).toBeVisible({ timeout: 10000 })

    // Check overlay class contains bg-black/20 and dark:bg-slate-950/80
    const className = await welcomeOverlay.getAttribute("class")
    expect(className).toContain("bg-black/20")
    expect(className).toContain("dark:bg-slate-950/80")

    // Take a screenshot of the welcome modal in light mode
    await page.screenshot({
      path: path.join(screenshotsDir, "modal-light-mode.png")
    })
    console.log("Light mode modal screenshot saved.")

    // 2. Skip welcome to switch theme in Settings
    const skipButton = spFrame.locator("#welcome-skip-btn")
    await skipButton.click()

    // Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    // Expand Maintenance section
    const maintenanceAccordionHeader = spFrame.locator("#settings-accordion-maintenance")
    await expect(maintenanceAccordionHeader).toBeVisible()
    await maintenanceAccordionHeader.click()
    await page.waitForTimeout(300)

    // Click Reset Database button to trigger ConfirmationDialog
    const resetBtn = spFrame.locator("#reset-db-btn")
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()

    // Verify ConfirmationDialog overlay in Light mode
    const dialogOverlay = spFrame.locator("#confirmation-dialog-backdrop")
    await expect(dialogOverlay).toBeVisible()

    const dialogClassName = await dialogOverlay.getAttribute("class")
    expect(dialogClassName).toContain("bg-black/20")
    expect(dialogClassName).toContain("dark:bg-slate-950/80")

    // Close dialog
    const cancelBtn = spFrame.locator("#confirm-dialog-cancel-btn")
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()
    await expect(dialogOverlay).not.toBeVisible()

    // 3. Switch to Dark Mode via evaluation
    console.log("Switching to Dark Mode via evaluation...")
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.add("dark")
    })

    // Wait for the UI to apply dark theme
    await page.waitForTimeout(500)

    // Trigger the ConfirmationDialog again in Dark mode
    await resetBtn.click()
    await expect(dialogOverlay).toBeVisible()

    const darkDialogClassName = await dialogOverlay.getAttribute("class")
    expect(darkDialogClassName).toContain("bg-black/20")
    expect(darkDialogClassName).toContain("dark:bg-slate-950/80")

    // Take screenshot of dark mode modal
    await page.screenshot({
      path: path.join(screenshotsDir, "modal-dark-mode.png")
    })
    console.log("Dark mode modal screenshot saved.")

    // Clean up
    await cancelBtn.click()
    await expect(dialogOverlay).not.toBeVisible()
  })
})
