import path from "path"
import { expect, test } from "@playwright/test"

test.describe
  .skip("Premium License and UpgradeModal E2E Tests @J-PREMIUM-LICENSE-01", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Google APIs globally for settings tests to prevent 401 retries
    await page.route("https://www.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({})
      })
    })

    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should handle license activation, deactivation and verify status states", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 1. Navigate to Settings
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    // 2. Expand License Accordion
    const licenseAccordionHeader = spFrame.locator(
      "#settings-accordion-license"
    )
    await expect(licenseAccordionHeader).toBeVisible()
    await licenseAccordionHeader.click()

    // 3. Verify initial Unlicensed status
    const statusBadge = spFrame.locator("#license-status-badge")
    await expect(statusBadge).toBeVisible()
    await expect(statusBadge).toHaveText(/Unlicensed|未アクティベート/)

    // 4. Test Invalid Key Activation
    const keyInput = spFrame.locator("#license-key-input")
    const activateBtn = spFrame.locator("#license-activate-btn")

    await keyInput.fill("INVALID-MEMBER-TEST-KEY")
    await activateBtn.click()

    // Verify error feedback
    const feedbackAlert = spFrame.locator("#license-feedback-alert")
    await expect(feedbackAlert).toBeVisible()
    await expect(feedbackAlert).toHaveText(/Failed|失敗/)
    await expect(statusBadge).toHaveText(/Invalid Key|無効なキー/)

    // 5. Test Expired Key Activation
    await keyInput.fill("EXPIRED-MEMBER-TEST-KEY")
    await activateBtn.click()
    await expect(statusBadge).toHaveText(/Expired|期限切れ/)

    // 6. Test Valid Key Activation (Pro)
    await keyInput.fill("PRO-MEMBER-TEST-KEY")
    await activateBtn.click()
    await expect(statusBadge).toHaveText(/Active|有効/)

    // Save screenshot of successful activation
    await page.screenshot({
      path: path.join(screenshotsDir, "license-activated-pro.png")
    })

    // 6b. Reload page to verify license persistence & unobscure load
    await page.reload()
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }
    await settingsNavBtn.click()
    await licenseAccordionHeader.click()
    await expect(statusBadge).toHaveText(/Active|有効/)

    // Verify deactivate button is visible
    const deactivateBtn = spFrame.locator("#license-deactivate-btn")
    await expect(deactivateBtn).toBeVisible()

    // 7. Test Deactivation
    await deactivateBtn.click()
    await expect(statusBadge).toHaveText(/Unlicensed|未アクティベート/)
  })

  test("should show UpgradeModal and navigate to settings license section on button click", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 1. Trigger UpgradeModal via our test helper exposed on window inside the iframe
    await spFrame.locator("body").evaluate(() => {
      if ((window as any).openUpgradeModalForTest) {
        ;(window as any).openUpgradeModalForTest("gdriveSync")
      }
    })

    // 2. Verify modal is visible
    const upgradeModal = spFrame.locator("#upgrade-modal")
    await expect(upgradeModal).toBeVisible()

    // Save screenshot of UpgradeModal
    await page.screenshot({
      path: path.join(screenshotsDir, "upgrade-modal-visible.png")
    })

    // 3. Click "Already have key? Go to settings"
    const goToSettingsBtn = spFrame.locator("#upgrade-goto-settings-btn")
    await expect(goToSettingsBtn).toBeVisible()
    await goToSettingsBtn.click()

    // 4. Verify modal is closed
    await expect(upgradeModal).not.toBeVisible()

    // 5. Verify we are now on Settings tab and License section is open
    const licenseAccordionHeader = spFrame.locator(
      "#settings-accordion-license"
    )
    await expect(licenseAccordionHeader).toBeVisible()

    // Check if the accordion content is expanded (height should be visible or input visible)
    const keyInput = spFrame.locator("#license-key-input")
    await expect(keyInput).toBeVisible()
    await expect(keyInput).toBeFocused()

    // Save screenshot of auto-redirect and focus
    await page.screenshot({
      path: path.join(screenshotsDir, "license-auto-focus.png")
    })
  })

  test("should handle custom branding settings in settings page for premium and non-premium users", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 1. Navigate to Settings
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    // 2. Expand UI accordion item to view Brand Logo Settings
    const uiAccordionHeader = spFrame.locator("#settings-accordion-ui")
    await expect(uiAccordionHeader).toBeVisible()

    // 3. Verify that non-premium users have disabled toggles
    const logoToggleBtn = spFrame.locator("#brand-logo-toggle-btn")
    const englishLogoToggleBtn = spFrame.locator(
      "#always-english-logo-toggle-btn"
    )
    await expect(logoToggleBtn).toBeDisabled()
    await expect(englishLogoToggleBtn).toBeDisabled()

    // 4. Verify Upgrade Banner is visible for non-premium user
    const upgradeBanner = spFrame.locator(
      "[data-testid='premium-branding-upgrade-banner']"
    )
    await expect(upgradeBanner).toBeVisible()

    // Save screenshot of non-premium settings UI
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "premium-branding-settings-non-premium.png"
      )
    })

    // 5. Expand License Accordion and activate Pro license
    const licenseAccordionHeader = spFrame.locator(
      "#settings-accordion-license"
    )
    await expect(licenseAccordionHeader).toBeVisible()
    await licenseAccordionHeader.click()

    const keyInput = spFrame.locator("#license-key-input")
    const activateBtn = spFrame.locator("#license-activate-btn")
    await keyInput.fill("PRO-MEMBER-TEST-KEY")
    await activateBtn.click()

    const statusBadge = spFrame.locator("#license-status-badge")
    await expect(statusBadge).toHaveText(/Active|有効/)

    // 6. Go back to UI accordion (expand it again or just verify)
    // No need to click since it remains open, but make sure it is in view

    // 7. Verify toggles are now enabled for premium user
    await expect(logoToggleBtn).toBeEnabled()
    await expect(englishLogoToggleBtn).toBeEnabled()

    // 8. Verify premium branding panel is visible instead of upgrade banner
    const premiumPanel = spFrame.locator(
      "[data-testid='premium-branding-panel']"
    )
    await expect(premiumPanel).toBeVisible()
    await expect(upgradeBanner).not.toBeVisible()

    // 9. Input social links and select display type
    const twitterInput = spFrame.locator("[data-testid='twitter-input']")
    const etsyInput = spFrame.locator("[data-testid='etsy-input']")
    const displaySelect = spFrame.locator(
      "[data-testid='social-display-select']"
    )

    await twitterInput.fill("style_atelier_pro")
    await etsyInput.fill("style_atelier_shop")
    await displaySelect.selectOption("qr")

    // Save screenshot of premium settings UI with inputs filled
    await page.screenshot({
      path: path.join(screenshotsDir, "premium-branding-settings-filled.png")
    })

    // 10. Reload page and verify settings persistence
    await page.reload()
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    await settingsNavBtn.click()

    // Verify values persist in DB and are loaded correctly
    await expect(twitterInput).toHaveValue("style_atelier_pro")
    await expect(etsyInput).toHaveValue("style_atelier_shop")
    await expect(displaySelect).toHaveValue("qr")
  })
})
