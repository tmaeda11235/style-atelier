import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Brand Logo Synthesis on Export @J-BRAND-LOGO-EXPORT", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should toggle brand logo settings and display correct options in share modal", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page for Brand Logo Export test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
      await expect(skipButton).not.toBeVisible({ timeout: 5000 })
    }

    // 2. Switch to Settings tab
    const settingsTabButton = spFrame.locator("#settings-nav-btn")
    await expect(settingsTabButton).toBeVisible({ timeout: 15000 })
    await settingsTabButton.click()

    // Expand UI accordion if not expanded
    const uiAccordionHeader = spFrame.locator("#settings-accordion-ui")
    await expect(uiAccordionHeader).toBeVisible()

    const logoSection = spFrame.locator("#settings-brand-logo-section")
    if (!(await logoSection.isVisible())) {
      await uiAccordionHeader.click()
    }
    await expect(logoSection).toBeVisible()

    // 3. Verify toggles exist and toggle brand logo
    const brandLogoToggle = spFrame.locator("#brand-logo-toggle-btn")
    const englishLogoToggle = spFrame.locator("#always-english-logo-toggle-btn")
    await expect(brandLogoToggle).toBeVisible()
    await expect(englishLogoToggle).toBeVisible()

    // Capture Settings view
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-brand-logo-options.png")
    })

    // Toggle off the brand logo option
    await brandLogoToggle.click()
    // The english text option should be disabled when brand logo is off
    await expect(englishLogoToggle).toBeDisabled()

    // Toggle back on
    await brandLogoToggle.click()
    await expect(englishLogoToggle).not.toBeDisabled()

    // 4. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(500)

    // Seed style card dynamically after switching to Library
    console.log("Seeding style card dynamically...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "brand-logo-test-card",
          name: "Brand Logo Test Card",
          promptSegments: [
            { type: "text", value: "cyberpunk skyline, neon glows" }
          ],
          parameters: { ar: "16:9", stylize: 250 },
          masking: {},
          tier: "Epic",
          dominantColor: "#a855f7",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23a855f7'/></svg>"
        }
      ])
    })

    // Open Share Modal for our seeded card
    const shareBtn = spFrame
      .locator("[data-testid='share-card-button']")
      .first()
    await expect(shareBtn).toBeVisible({ timeout: 10000 })
    await shareBtn.click()

    // Verify Share Modal is open
    const shareModalOverlay = spFrame.locator(
      "[data-testid='share-card-modal-overlay']"
    )
    await expect(shareModalOverlay).toBeVisible()

    // Verify local toggle is visible in Share modal
    const localLogoToggle = spFrame.locator("#share-modal-brand-logo-toggle")
    await expect(localLogoToggle).toBeVisible()

    // Take screenshot of the Share Card Modal
    await page.screenshot({
      path: path.join(screenshotsDir, "share-modal-brand-logo-toggle.png")
    })

    // Toggle off locally in the modal
    await localLogoToggle.click()

    // Close modal
    const closeBtn = spFrame.locator("[data-testid='share-modal-close-btn']")
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    console.log("Brand Logo Export E2E test passed successfully!")
  })

  test("should handle premium custom branding for non-Pro and Pro users in share modal", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log(
      "Navigating to sandbox page for Premium Custom Branding test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
      await expect(skipButton).not.toBeVisible({ timeout: 5000 })
    }

    // Ensure we are non-Pro initially (clear settings)
    await page.evaluate(() => {
      localStorage.removeItem("style-atelier-license-status")
    })

    // Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(500)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.userSettings.clear()
    })

    // Seed style card dynamically
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "branding-premium-test-card",
          name: "Premium Branding Test Card",
          promptSegments: [{ type: "text", value: "cyberpunk skyline" }],
          parameters: { ar: "16:9" },
          masking: {},
          tier: "Epic",
          dominantColor: "#a855f7",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23a855f7'/></svg>"
        }
      ])
    })

    // Open Share Modal
    const shareBtn = spFrame
      .locator("[data-testid='share-card-button']")
      .first()
    await expect(shareBtn).toBeVisible({ timeout: 10000 })
    await shareBtn.click()

    // Verify upgrade banner is shown for non-Pro users
    const upgradeBanner = spFrame.locator(
      "[data-testid='premium-branding-upgrade-banner']"
    )
    await expect(upgradeBanner).toBeVisible()

    // Take screenshot of non-Pro branding banner
    await page.screenshot({
      path: path.join(screenshotsDir, "share-modal-non-pro-branding.png")
    })

    // Close modal
    const closeBtn = spFrame.locator("[data-testid='share-modal-close-btn']")
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // 2. Simulate Pro License
    console.log("Simulating Pro license...")
    await page.evaluate(() => {
      localStorage.setItem("style-atelier-license-status", "valid")
    })

    // Reload sidepanel frame to load new license status
    await spFrame.locator("body").evaluate(() => {
      window.location.reload()
    })

    // Wait for the sidepanel to load again and skip welcome dialog if it appears
    await page.waitForTimeout(1000)
    const skipBtn2 = spFrame.locator("#welcome-skip-btn")
    if (await skipBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn2.click()
      await expect(skipBtn2).not.toBeVisible({ timeout: 5000 })
    }

    // Switch to Library tab again
    const libraryTabButton2 = spFrame.locator("button:has-text('Library')")
    await libraryTabButton2.click()
    await page.waitForTimeout(500)

    // Re-open Share Modal
    const shareBtn2 = spFrame
      .locator("[data-testid='share-card-button']")
      .first()
    await expect(shareBtn2).toBeVisible({ timeout: 5000 })
    await shareBtn2.click()

    // Branding panel should now be visible instead of upgrade banner
    const brandingPanel = spFrame.locator(
      "[data-testid='premium-branding-panel']"
    )
    await expect(brandingPanel).toBeVisible()
    await expect(upgradeBanner).not.toBeVisible()

    // Verify input fields
    const twitterInput = spFrame.locator("[data-testid='twitter-input']")
    const etsyInput = spFrame.locator("[data-testid='etsy-input']")
    const displaySelect = spFrame.locator(
      "[data-testid='social-display-select']"
    )
    const fileInput = spFrame.locator("[data-testid='logo-file-input']")

    await expect(twitterInput).toBeVisible()
    await expect(etsyInput).toBeVisible()
    await expect(displaySelect).toBeVisible()
    await expect(fileInput).toBeAttached()

    // Enter values
    await twitterInput.fill("my_premium_brand")
    await etsyInput.fill("my_etsy_shop")
    await displaySelect.selectOption("text")

    // Take screenshot of Premium Branding Panel filled out
    await page.screenshot({
      path: path.join(screenshotsDir, "share-modal-premium-branding-filled.png")
    })

    console.log("Premium Custom Branding E2E test passed successfully!")
  })
})
