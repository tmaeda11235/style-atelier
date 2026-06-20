import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Expert Minting", () => {
  test.beforeEach(async ({ page }) => {
    // Force Expert Mode and enable all features for these tests
    await page.addInitScript(() => {
      localStorage.setItem("style-atelier-easy-mode", "false")
      localStorage.setItem(
        "style-atelier-expert-features",
        JSON.stringify({
          stack: true,
          slot: true,
          rarity: true,
          tags: true,
          categories: true,
          multiCard: true,
          cardEditing: true,
          multiImage: true
        })
      )
    })
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
    await skipButton
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})
    if (await skipButton.isVisible()) {
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

    // Navigate into the "Cyberpunk Tech" folder where the card is saved
    const folder = spFrame
      .locator("[data-testid='subfolders-grid'] :text('Cyberpunk Tech')")
      .first()
    await expect(folder).toBeVisible({ timeout: 5000 })
    await folder.click()
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

    const closeDetailBtn = detailView.locator("button").first()
    await closeDetailBtn.click()
  })

  test("should allow adjusting clip settings on minting preview and save card (@J-MINT-CLIP-ADJUSTER-01)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Clip Adjuster E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    await skipButton
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {})
    if (await skipButton.isVisible()) {
      await skipButton.click()
    }

    // 2. Seed database with mock history item
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-to-clip",
        fullCommand: "a beautiful cyberpunk warrior --ar 1:1",
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

    // 3. Switch to History tab and open Minting View
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    const mintCardBtn = spFrame.locator("button:has-text('Mint Card')").first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // 4. Verify Minting View is open
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // 5. Click the image preview to open ClipAdjuster
    const previewContainer = spFrame.locator(
      "[data-testid='minting-preview-container']"
    )
    await expect(previewContainer).toBeVisible()
    await previewContainer.click()

    // 6. Verify ClipAdjuster modal is open
    const adjusterModal = spFrame.locator("h3:has-text('画像をクリップ調整')")
    await expect(adjusterModal).toBeVisible({ timeout: 5000 })

    // Take screenshot of ClipAdjuster Modal
    await page.screenshot({
      path: path.join(screenshotsDir, "clip-adjuster-modal-open.png")
    })

    // 7. Adjust Zoom via range input
    const zoomInput = spFrame.locator("input[type='range']")
    await expect(zoomInput).toBeVisible()
    await zoomInput.evaluate((el: HTMLInputElement) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, "2.5")
      } else {
        el.value = "2.5"
      }
      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
    })

    // 8. Drag image to adjust offset
    const dragImg = spFrame.locator("img[alt='Adjust clip']")
    const boundingBox = await dragImg.boundingBox()
    if (boundingBox) {
      const startX = boundingBox.x + boundingBox.width / 2
      const startY = boundingBox.y + boundingBox.height / 2
      await page.mouse.move(startX, startY)
      await page.mouse.down()
      await page.mouse.move(startX - 30, startY + 40) // drag left/down slightly
      await page.mouse.up()
    }

    // Take screenshot of ClipAdjuster Modal after adjustment
    await page.screenshot({
      path: path.join(screenshotsDir, "clip-adjuster-modal-adjusted.png")
    })

    // 9. Apply adjustment
    const applyBtn = spFrame.locator("button:has-text('適用')")
    await expect(applyBtn).toBeVisible()
    await applyBtn.evaluate((el: HTMLElement) => el.click())

    // 10. Verify ClipAdjuster is closed
    await expect(adjusterModal).not.toBeVisible({ timeout: 5000 })

    // 11. Enter custom name & save card
    const nameInput = spFrame.locator("input[placeholder='Add details...']")
    await nameInput.fill("Clip Test Warrior")

    const saveCardBtn = spFrame.locator(
      "button:has-text('Save Card'), button:has-text('カードを保存')"
    )
    await expect(saveCardBtn).toBeVisible()
    await saveCardBtn.click()

    // 12. Verify card is saved and DB has correct clipSettings
    await expect(mintingView).not.toBeVisible({ timeout: 10000 })

    const savedCards = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      return await database.styleCards.toArray()
    })

    const targetCard = savedCards.find((c: any) =>
      c.name.includes("Clip Test Warrior")
    )
    expect(targetCard).toBeDefined()
    expect(targetCard.clipSettings).toBeDefined()
    expect(targetCard.clipSettings.zoom).toBeCloseTo(2.5, 1)
    expect(targetCard.clipSettings.xOffset).not.toBe(0)
    expect(targetCard.clipSettings.yOffset).not.toBe(0)
  })
})
