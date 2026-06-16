import path from "path"
import { expect, test } from "@playwright/test"

import type { StyleCard } from "../../src/lib/db-schema"
import { compressCardData } from "../../src/lib/qr-utils"

test.describe("Mobile Viewer E2E Test", () => {
  // Use iPhone 12 emulation values
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    permissions: ["clipboard-write"]
  })

  test("should render fallback Cyber Samurai, flip card and copy prompt with visual feedbacks @J-MOBILE-PREVIEW-01", async ({
    page
  }) => {
    // 1. Navigate to the mobile app index page (no params, should fallback, and use mock mode)
    await page.goto("/src/mobile-app/index.html?mock=true")

    // Ensure fonts and main components are loaded
    await page.waitForSelector(".phone-frame")
    await page.waitForSelector(".card-perspective")

    // Check header
    const title = page.locator(".app-title")
    await expect(title).toHaveText("STYLE ATELIER")

    // Verify default fallback card is "Cyber Samurai"
    const cardTitle = page.locator("#cardTitleFront")
    await expect(cardTitle).toHaveText("Cyber Samurai")

    // Take screenshot of the initial state (Front of the Card)
    const frontScreenshotPath = path.join(
      "tests",
      "screenshots",
      "01-mobile-viewer-fallback-front.png"
    )
    await page.screenshot({ path: frontScreenshotPath })
    console.log(`Saved screenshot to ${frontScreenshotPath}`)

    // 2. Click the card to flip it to the back
    const cardContainer = page.locator("#cardContainer")
    await cardContainer.click()

    // Wait for the flip animation (css transition is 0.8s, wait 1.2s to be safe)
    await page.waitForTimeout(1200)

    // Verify prompt text is rendered correctly (not just parameters)
    const promptText = page.locator("#promptText")
    await expect(promptText).toContainText(
      "A futuristic cyberpunk samurai standing in neon rain"
    )

    // Take screenshot of the back of the Card
    const backScreenshotPath = path.join(
      "tests",
      "screenshots",
      "02-mobile-viewer-fallback-back.png"
    )
    await page.screenshot({ path: backScreenshotPath })
    console.log(`Saved screenshot to ${backScreenshotPath}`)

    // Verify parameter badges are rendered correctly
    const parameterBadges = page.locator("#parameterBadges")
    await expect(parameterBadges).toBeVisible()
    const badges = parameterBadges.locator(".parameter-badge")
    await expect(badges).toHaveCount(2)
    await expect(badges.nth(0)).toHaveText("--ar 16:9")
    await expect(badges.nth(1)).toHaveText("--stylize 750")
    // 3. Click the copy button and verify toast message appears
    const copyBtn = page.locator("#copyBtn")
    await copyBtn.click()

    // Wait for the toast element to become visible (class 'show' added)
    const toast = page.locator("#toast")
    await expect(toast).toHaveClass(/show/)
    await expect(toast.locator("span")).toHaveText("コピーしました！")

    // Take screenshot of the copied state with toast notification
    const copiedScreenshotPath = path.join(
      "tests",
      "screenshots",
      "03-mobile-viewer-fallback-copied.png"
    )
    await page.screenshot({ path: copiedScreenshotPath })
    console.log(`Saved screenshot to ${copiedScreenshotPath}`)

    // Wait for toast to disappear
    await page.waitForTimeout(2200)
    await expect(toast).not.toHaveClass(/show/)

    // 4. Click the cloud save button and verify toast message appears
    const saveCloudBtn = page.locator("#saveCloudBtn")
    await saveCloudBtn.click()
    await expect(toast).toHaveClass(/show/)
    await expect(toast.locator("span")).toHaveText(/クラウドに一時保存しました/)

    // Take screenshot of the cloud-saved state with toast notification
    const cloudSavedScreenshotPath = path.join(
      "tests",
      "screenshots",
      "04-mobile-viewer-fallback-cloud-saved.png"
    )
    await page.screenshot({ path: cloudSavedScreenshotPath })
    console.log(`Saved screenshot to ${cloudSavedScreenshotPath}`)
  })

  test("should render custom card dynamically from URL query parameters @J-MOBILE-PREVIEW-01", async ({
    page
  }) => {
    // 1. Prepare dynamic StyleCard test data
    const testCard: Partial<StyleCard> = {
      id: "dynamic-test-id",
      name: "Cyber Ninja",
      tier: "epic",
      accentColor: "#a855f7",
      dominantColor: "#1e1b4b",
      promptSegments: [
        {
          type: "text",
          value:
            "A cyberpunk ninja leaping across rooftops in neon cyberpunk Kyoto"
        }
      ],
      parameters: {
        ar: "4:3",
        stylize: 250
      }
    }

    // 2. Compress using the production encoder helper
    const payload = compressCardData(testCard as StyleCard)

    // 3. Navigate with parameter '?p='
    await page.goto(
      `/src/mobile-app/index.html?p=${encodeURIComponent(payload)}`
    )

    // Wait for elements
    await page.waitForSelector(".phone-frame")
    await page.waitForSelector(".card-perspective")

    // Verify card titles match our custom data
    const frontTitle = page.locator("#cardTitleFront")
    await expect(frontTitle).toHaveText("Cyber Ninja")

    const frontRarity = page.locator("#cardRarityFront")
    await expect(frontRarity).toHaveText("EPIC")

    // Check front card element class has changed to rarity-epic
    const cardFrontElement = page.locator("#cardFront")
    await expect(cardFrontElement).toHaveClass(/rarity-epic/)

    // Take screenshot of dynamically loaded card front
    const dynamicFrontScreenshotPath = path.join(
      "tests",
      "screenshots",
      "05-mobile-viewer-dynamic-front.png"
    )
    await page.screenshot({ path: dynamicFrontScreenshotPath })
    console.log(`Saved screenshot to ${dynamicFrontScreenshotPath}`)

    // 4. Flip to check prompt text
    const cardContainer = page.locator("#cardContainer")
    await cardContainer.click()
    await page.waitForTimeout(1200)

    const promptPreview = page.locator("#promptText")
    await expect(promptPreview).toContainText(
      "A cyberpunk ninja leaping across rooftops in neon cyberpunk Kyoto --ar 4:3 --s 250"
    )

    // Verify parameter badges are rendered correctly
    const parameterBadges = page.locator("#parameterBadges")
    await expect(parameterBadges).toBeVisible()
    const badges = parameterBadges.locator(".parameter-badge")
    await expect(badges).toHaveCount(2)
    await expect(badges.nth(0)).toHaveText("--ar 4:3")
    await expect(badges.nth(1)).toHaveText("--stylize 250")
    // Take screenshot of dynamically loaded card back
    const dynamicBackScreenshotPath = path.join(
      "tests",
      "screenshots",
      "06-mobile-viewer-dynamic-back.png"
    )
    await page.screenshot({ path: dynamicBackScreenshotPath })
    console.log(`Saved screenshot to ${dynamicBackScreenshotPath}`)
  })
})
