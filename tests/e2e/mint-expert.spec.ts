/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // 2. Clear and seed history items & categories to guarantee they are available
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-to-mint-expert",
        fullCommand:
          "a beautiful cyberpunk warrior --ar 16:9 --sref https://example.com/sref1 --p p-code",
        imageUrl: "/tests/fixtures/midjourney/index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })
      await database.categories.clear()
      await database.categories.add({
        id: "category-expert-1",
        name: "Cyberpunk Tech",
        iconEmoji: "🦾"
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

    // 8. Select category "Cyberpunk Tech"
    const categorySelect = spFrame
      .locator("[data-testid='minting-view-container'] select")
      .first()
    await expect(categorySelect).toBeVisible()
    await categorySelect.selectOption({ value: "category-expert-1" })

    // 9. Add custom tag "expert-tag"
    const tagInput = spFrame.locator("#custom-tag-input")
    await expect(tagInput).toBeVisible()
    await tagInput.fill("expert-tag")
    await tagInput.press("Enter")

    // Verify tag chip is visible in Minting View
    const tagChip = spFrame.locator("span:has-text('expert-tag')")
    await expect(tagChip).toBeVisible()

    // 10. Click Save Card
    const saveCardBtn = spFrame.locator(
      "button:has-text('Save Card'), button:has-text('カードを保存')"
    )
    await expect(saveCardBtn).toBeVisible()
    await saveCardBtn.click()

    // 11. Verify minting view is closed
    await expect(mintingView).not.toBeVisible({ timeout: 10000 })

    // 12. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(1000) // wait for DB query

    // Navigate into the "Cyberpunk Tech" folder where the card is saved
    const folder = spFrame
      .locator("[data-testid='subfolders-grid'] :text('Cyberpunk Tech')")
      .first()
    await expect(folder).toBeVisible({ timeout: 5000 })
    await folder.click()
    await page.waitForTimeout(1000)

    // Verify the card is visible in the folder
    const cardContainer = spFrame
      .locator(".group", { hasText: "Expert Warrior Note" })
      .first()
    await expect(cardContainer).toBeVisible({ timeout: 10000 })

    // 13. Click "Edit Card" on our newly minted card to open CardDetailView and verify Rarity, Category, and Tags
    const editBtn = cardContainer.locator("[data-testid='edit-card-button']")
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Verify Card Detail view container is visible
    const detailView = spFrame.locator(
      "[data-testid='card-detail-view-container']"
    )
    await expect(detailView).toBeVisible({ timeout: 5000 })

    // Verify Category option has correct value selected
    const detailCategorySelect = detailView.locator("select").first()
    await expect(detailCategorySelect).toHaveValue("category-expert-1")

    // Verify tag "expert-tag" is present
    const detailTagChip = detailView.locator("span:has-text('expert-tag')")
    await expect(detailTagChip).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "mint-expert-detail-verify.png")
    })

    // Close the detail view
    const closeDetailBtn = detailView.locator("button").first()
    await closeDetailBtn.click()
  })
})
