import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Web Landing Page and Privacy Policy E2E Test", () => {
  // Use Desktop viewport
  test.use({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  })

  test("should render Landing Page, navigate to PWA Viewer and Privacy Policy @J-WEB-LP-02", async ({
    page
  }) => {
    // 1. Navigate to the web app index page (Desktop view, no PWA parameters)
    await page.goto("/src/web-app/index.html")
    await page.evaluate(() => localStorage.setItem("pref-lang", "ja"))

    // Ensure LP components are loaded
    await page.waitForSelector(".lp-body")

    // Check Header and Hero Title
    const lpLogoText = page.locator(".lp-logo-text")
    await expect(lpLogoText).toHaveText("Style Atelier")
    const lpTitle = page.locator(".lp-title-h1")
    await expect(lpTitle).toHaveText("Style Atelier")

    // Take screenshot of the Landing Page
    const lpScreenshotPath = path.join(
      "tests",
      "screenshots",
      "web-landing-page.png"
    )
    await page.screenshot({ path: lpScreenshotPath })
    console.log(`Saved screenshot to ${lpScreenshotPath}`)

    // 2. Click "モバイルPWAを試す" button and check PWA View
    const tryPwaBtn = page.locator("#btn-try-pwa")
    await tryPwaBtn.click()

    // Wait for Hash change and PWA element to load
    await page.waitForTimeout(500)
    expect(page.url()).toContain("#pwa")
    await page.waitForSelector(".phone-frame")

    // Take screenshot of PWA Viewer on desktop with simulator frame
    const pwaScreenshotPath = path.join(
      "tests",
      "screenshots",
      "web-pwa-viewer.png"
    )
    await page.screenshot({ path: pwaScreenshotPath })
    console.log(`Saved screenshot to ${pwaScreenshotPath}`)

    // 3. Navigate back to LP using the footer link
    const backToLpCta = page.locator("#installCta")
    await backToLpCta.click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain("#lp")
    await page.waitForSelector(".lp-body")

    // 4. Click "プライバシーポリシー" link to check Privacy Policy view
    const privacyLink = page.locator("#link-privacy")
    await privacyLink.click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain("#privacy")
    await page.waitForSelector(".pp-body")

    // Check Japanese title is displayed by default
    const privacyTitle = page.locator(".pp-title-h1")
    await expect(privacyTitle).toHaveText("プライバシーポリシー")

    // Take screenshot of Privacy Policy (Japanese)
    const privacyJaScreenshotPath = path.join(
      "tests",
      "screenshots",
      "web-privacy-policy-ja.png"
    )
    await page.screenshot({ path: privacyJaScreenshotPath })
    console.log(`Saved screenshot to ${privacyJaScreenshotPath}`)

    // 5. Switch to English
    const enBtn = page.locator("#btn-en")
    await enBtn.click()
    await expect(privacyTitle).toHaveText("Privacy Policy")

    // Take screenshot of Privacy Policy (English)
    const privacyEnScreenshotPath = path.join(
      "tests",
      "screenshots",
      "web-privacy-policy-en.png"
    )
    await page.screenshot({ path: privacyEnScreenshotPath })
    console.log(`Saved screenshot to ${privacyEnScreenshotPath}`)

    // 6. Click logo to go back to LP
    const backLogo = page.locator("#btn-back-to-lp")
    await backLogo.click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain("#lp")
    await page.waitForSelector(".lp-body")
  })
})
