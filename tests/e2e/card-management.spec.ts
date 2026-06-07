/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Card Management @J-ORG-EXPERT-01", () => {
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

  test("should allow managing tags in CardDetailView", async ({ page }) => {
    console.log("Navigating to sandbox page for CardDetailView test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. スキップ
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Libraryタブに切り替え
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // 3. カードの編集ボタンをクリックして詳細ビューを開く
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // 4. Card Detail Viewの表示確認
    const detailTitle = spFrame.locator("h2:has-text('Card Details')")
    await expect(detailTitle).toBeVisible()

    // 5. タグの追加
    const tagInput = spFrame.locator("input[placeholder='Add new tag...']")
    await expect(tagInput).toBeVisible()
    await tagInput.fill("e2e-tag")
    const addTagBtn = spFrame.locator("button:has-text('Add')")
    await addTagBtn.click()

    // 6. タグが表示されたことを確認
    const newTagChip = spFrame.locator("text=e2e-tag")
    await expect(newTagChip).toBeVisible()

    // 7. 保存して閉じる
    const saveBtn = spFrame.locator("button:has-text('Save')")
    await saveBtn.click()

    // 8. 詳細ビューが閉じたことを確認
    await expect(detailTitle).not.toBeVisible({ timeout: 5000 })
  })

  test("should allow minting a new card from History (Scenario 2)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Minting E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear and seed history items to guarantee the item is available
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-to-mint",
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
    await nameInput.fill("Warrior Note")

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
    const cardTitle = spFrame.locator("text=Warrior Note").first()
    await expect(cardTitle).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "mint-success.png")
    })
  })

  test("should filter card list by tag search in Library (Scenario 4)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for tag search E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed two cards with different tags
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-vintage",
          name: "Vintage Card",
          promptSegments: [{ type: "text", value: "vintage prompt" }],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: ["vintage", "retro"],
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-futuristic",
          name: "Futuristic Card",
          promptSegments: [{ type: "text", value: "futuristic prompt" }],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: ["cyberpunk", "neon"],
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Fill search field with "cyberpunk"
    const searchInput = spFrame.locator("input[placeholder*='Search']").first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill("cyberpunk")
    await page.waitForTimeout(500) // wait for search filtering

    // 5. Verify "Futuristic Card" is visible, "Vintage Card" is NOT visible
    await expect(spFrame.locator("text=Futuristic Card")).toBeVisible()
    await expect(spFrame.locator("text=Vintage Card")).not.toBeVisible()

    // 6. Clear search, type "vintage"
    await searchInput.fill("vintage")
    await page.waitForTimeout(500) // wait for search filtering

    // 7. Verify "Vintage Card" is visible, "Futuristic Card" is NOT visible
    await expect(spFrame.locator("text=Vintage Card")).toBeVisible()
    await expect(spFrame.locator("text=Futuristic Card")).not.toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "search-success.png")
    })
  })
})
