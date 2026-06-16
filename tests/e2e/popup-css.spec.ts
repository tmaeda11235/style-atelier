import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - Swatch Detail Popup CSS Modernization @J-ORG-POPUP-CSS", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should open modernized swatch detail popup (SimpleWorkbenchModal) in Easy Mode and close it", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings
    const settingsBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsBtn).toBeVisible()
    await settingsBtn.click()

    // 3. Ensure UI Preferences accordion is open
    const uiAccordionHeader = spFrame.locator("#settings-accordion-ui")
    await expect(uiAccordionHeader).toBeVisible()

    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    if (
      !(await easyModeToggle.isVisible({ timeout: 2000 }).catch(() => false))
    ) {
      await uiAccordionHeader.click()
    }
    await expect(easyModeToggle).toBeVisible()

    // Check if easy mode is already active (has class bg-blue-600)
    const isEasyActive = await easyModeToggle.evaluate((el) =>
      el.classList.contains("bg-blue-600")
    )
    if (!isEasyActive) {
      await easyModeToggle.click()
      // Switching to Easy Mode automatically redirects to the Library tab.
    } else {
      // If already in Easy Mode, navigate back to the Library tab manually.
      const backToLibBtn = spFrame.locator("#back-to-library-btn")
      await expect(backToLibBtn).toBeVisible()
      await backToLibBtn.click()
    }

    // 6. Click on a library card to trigger the SimpleWorkbenchModal (Swatch detail popup)
    const libraryCard = spFrame
      .locator("[data-tutorial='library-card']")
      .first()
    await expect(libraryCard).toBeVisible({ timeout: 10000 })
    await libraryCard.click()

    // 7. Verify the modal container and .modal-content is visible
    const modalContainer = spFrame.locator(
      "[data-testid='simple-workbench-modal']"
    )
    await expect(modalContainer).toBeVisible()

    // Take screenshot of the modernized swatch details popup modal
    await page.screenshot({
      path: path.join(screenshotsDir, "swatch-detail-popup-modal.png")
    })

    // 8. Find and click the close button
    const closeBtn = spFrame.locator(
      "[data-testid='simple-workbench-close-button']"
    )
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // 9. Verify the modal has closed
    await expect(modalContainer).not.toBeVisible()

    console.log("E2E Test for modernized popup CSS completed successfully.")
  })
})
