import path from "path"
import { expect, test } from "@playwright/test"

test.describe
  .skip("Style Atelier E2E Tests - Atom Components CVA @J-ATOM-CVA", () => {
  test("should correctly render CVA-enabled atom components", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Atom Components CVA E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Navigate to Library Tab
    const libraryTabButton = spFrame.locator("[data-tutorial='library-tab']")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // 3. Verify Input component in the Search Field (waiting for loading to complete)
    const searchInput = spFrame.locator("#library-search-input")
    await searchInput.waitFor({ state: "visible", timeout: 10000 })
    await expect(searchInput).toBeVisible()

    // 4. Verify RarityBadge component on style cards
    const cardsGrid = spFrame.locator("[data-tutorial='library-card-grid']")
    await expect(cardsGrid).toBeVisible()
    const rarityBadge = spFrame.locator("[data-testid='rarity-badge']").first()
    await rarityBadge.waitFor({ state: "visible", timeout: 10000 })
    await expect(rarityBadge).toBeVisible()

    // 5. Navigate to Settings Tab to check AiStatusBadge and Button components
    const settingsTabButton = spFrame.locator("#settings-nav-btn")
    await expect(settingsTabButton).toBeVisible()
    await settingsTabButton.click()
    await page.waitForTimeout(1000)

    // 6. Verify AiStatusBadge component
    const statusBadge = spFrame
      .locator("[data-testid='ai-status-badge-container']")
      .first()
    await expect(statusBadge).toBeVisible()

    // 7. Verify Button components (e.g., accordion headers)
    const accordionHeaders = spFrame.locator(
      "button[id^='settings-accordion-']"
    )
    await expect(accordionHeaders.first()).toBeVisible()

    // 8. Verify License input component (which uses Input CVA size="sm")
    const licenseAccordionHeader = spFrame.locator(
      "#settings-accordion-license"
    )
    await expect(licenseAccordionHeader).toBeVisible()
    await licenseAccordionHeader.click()

    const licenseInput = spFrame.locator("#license-key-input")
    await expect(licenseInput).toBeVisible()
    await licenseInput.fill("TEST-CVA-INPUT-KEY")
    await expect(licenseInput).toHaveValue("TEST-CVA-INPUT-KEY")

    // Take a screenshot of the settings tab containing CVA components including Input
    await page.screenshot({
      path: path.join(screenshotsDir, "atom-components-cva.png")
    })
    console.log("Atom Components CVA E2E screenshot saved.")
  })
})
