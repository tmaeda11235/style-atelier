import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Expert Minting", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
    page.on("requestfailed", (request) => {
      console.error(
        `[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`
      )
    })
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`)
      }
    })
  })

  test("should allow minting a new card from History in Expert Mode (@J-MINT-EXPERT-01)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Expert Minting E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear and seed history items to guarantee the item is available
    await spFrame.locator("body").evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-to-mint-expert",
        fullCommand:
          "a beautiful cyberpunk warrior --ar 16:9 --sref https://example.com/sref1 --p p-code",
        imageUrl: "./index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })
    })

    // 3. Switch to History tab
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    // 4. Click "Mint Card" button
    const mintCardBtn = spFrame.locator("button:has-text('Mint Card')").first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // 5. Verify minting view container is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // 6. Enter Custom Name
    const nameInput = spFrame.locator("input[placeholder='Add details...']")
    await nameInput.fill("Expert Warrior Note")

    // 7. Select rarity "Epic"
    const rarityBtn = spFrame.locator("button:has-text('Epic')")
    await expect(rarityBtn).toBeVisible()
    await rarityBtn.click()

    // 8. Click Save Card
    const saveCardBtn = spFrame.locator("button:has-text('Save Card')")
    await expect(saveCardBtn).toBeVisible()
    await saveCardBtn.click()

    // 9. Verify minting view is closed
    await expect(mintingView).not.toBeVisible({ timeout: 10000 })

    // 10. Switch to Library tab and verify the card is there
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(1000) // wait for DB query
    const cardTitle = spFrame.locator("text=Expert Warrior Note").first()
    await expect(cardTitle).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "mint-expert-success.png")
    })
  })
})
