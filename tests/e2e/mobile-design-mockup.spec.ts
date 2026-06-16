import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Mobile Design Mockup E2E Test", () => {
  // Use iPhone 12 emulation values
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    permissions: ["clipboard-write"]
  })

  test("should render the mobile mockup, flip card and copy prompt with visual feedbacks @J-MOBILE-PREVIEW-01", async ({
    page
  }) => {
    // 1. Navigate to the mobile mockup page
    // Note: The dev server started by Playwright config serves the workspace root,
    // so we can access files under src/ directly.
    await page.goto("/src/mobile-app/mockup.html")

    // Ensure fonts and main components are loaded
    await page.waitForSelector(".phone-frame")
    await page.waitForSelector(".card-perspective")

    // Check header
    const title = page.locator(".app-title")
    await expect(title).toHaveText("STYLE ATELIER")

    // Take screenshot of the initial state (Front of the Card)
    const frontScreenshotPath = path.join(
      "tests",
      "screenshots",
      "01-mobile-design-front.png"
    )
    await page.screenshot({ path: frontScreenshotPath })
    console.log(`Saved screenshot to ${frontScreenshotPath}`)

    // 2. Click the card to flip it to the back
    const cardContainer = page.locator("#cardContainer")
    await cardContainer.click()

    // Wait for the flip animation (css transition is 0.8s, wait 1.2s to be safe)
    await page.waitForTimeout(1200)

    // Take screenshot of the back of the Card
    const backScreenshotPath = path.join(
      "tests",
      "screenshots",
      "02-mobile-design-back.png"
    )
    await page.screenshot({ path: backScreenshotPath })
    console.log(`Saved screenshot to ${backScreenshotPath}`)

    // 3. Click the copy button and verify toast message appears
    const copyBtn = page.locator("#copyBtn")
    await copyBtn.click()

    // Wait for the toast toast element to become visible (class 'show' added)
    const toast = page.locator("#toast")
    await expect(toast).toHaveClass(/show/, { timeout: 15000 })
    await expect(toast.locator("span")).toHaveText("コピーしました！")

    // Take screenshot of the copied state with toast notification
    const copiedScreenshotPath = path.join(
      "tests",
      "screenshots",
      "03-mobile-design-copied.png"
    )
    await page.screenshot({ path: copiedScreenshotPath })
    console.log(`Saved screenshot to ${copiedScreenshotPath}`)

    // Wait for toast to disappear
    await page.waitForTimeout(6200)
    await expect(toast).not.toHaveClass(/show/)

    // 4. Click the cloud save button and verify toast message appears
    const saveCloudBtn = page.locator("#saveCloudBtn")
    await saveCloudBtn.click()
    await expect(toast).toHaveClass(/show/, { timeout: 15000 })
    await expect(toast.locator("span")).toHaveText("クラウドに一時保存しました")

    // Take screenshot of the cloud-saved state with toast notification
    const cloudSavedScreenshotPath = path.join(
      "tests",
      "screenshots",
      "04-mobile-design-cloud-saved.png"
    )
    await page.screenshot({ path: cloudSavedScreenshotPath })
    console.log(`Saved screenshot to ${cloudSavedScreenshotPath}`)
  })
})
