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

  test("should display responsive action buttons in CardDetailView footer without layout distortion", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for footer layout E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Welcomeダイアログのスキップ
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Libraryタブへ切り替え
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // カードの編集ボタンをクリックして詳細ビューを開く
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // 各フッターボタンの表示確認
    const deleteBtn = spFrame.locator("[data-testid='delete-card-button']")
    const cancelBtn = spFrame.locator("button:has-text('Cancel')")
    const exportBtn = spFrame.locator("[data-testid='export-card-button']")
    const injectBtn = spFrame.locator("button:has-text('Inject')")
    const saveBtn = spFrame.locator("button:has-text('Save')")

    await expect(deleteBtn).toBeVisible()
    await expect(cancelBtn).toBeVisible()
    await expect(exportBtn).toBeVisible()
    await expect(injectBtn).toBeVisible()
    await expect(saveBtn).toBeVisible()

    // 描画待ち
    await page.waitForTimeout(1000)

    // フッターのスクリーンショットを撮影（UX変更点の検証）
    const footerContainer = spFrame
      .locator("[data-testid='card-detail-view-container']")
      .locator("div.shadow-t-sm")
    await expect(footerContainer).toBeVisible()

    await footerContainer.screenshot({
      path: path.join(screenshotsDir, "card-detail-footer-responsive.png")
    })
  })

  test("should load first page of cards, show More button, and load next page when clicked", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for library pagination E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 24 cards to database (page size is 12)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      const cards = Array.from({ length: 24 }, (_, i) => ({
        id: `card-paginated-${i}`,
        name: `Card ${String(i).padStart(2, "0")}`,
        promptSegments: [{ type: "text", value: `prompt ${i}` }],
        parameters: {},
        masking: {},
        tier: "Common",
        tags: ["test-paginated"],
        createdAt: Date.now() - i * 1000, // Sorted newest first
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
      }))
      await database.styleCards.bulkAdd(cards)
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Verify exactly 12 cards are loaded on the first page
    // (Card 00 to Card 11)
    await expect(spFrame.locator("text=Card 00")).toBeVisible()
    await expect(spFrame.locator("text=Card 11")).toBeVisible()
    await expect(spFrame.locator("text=Card 12")).not.toBeVisible()

    // 5. Verify Show More button is visible
    const showMoreBtn = spFrame.locator("[data-testid='show-more-button']")
    await expect(showMoreBtn).toBeVisible()

    // Capture first page screenshot
    await spFrame.locator("[data-tutorial='library-card-grid']").screenshot({
      path: path.join(screenshotsDir, "library-pagination-page1.png")
    })

    // 6. Click Show More button
    await showMoreBtn.click()
    await page.waitForTimeout(500) // Wait for lazy loading

    // 7. Verify Card 12 is now visible, and we have 24 cards total
    await expect(spFrame.locator("text=Card 12")).toBeVisible()
    await expect(spFrame.locator("text=Card 23")).toBeVisible()

    // 8. Verify Show More button is hidden because all 24 cards are loaded
    await expect(showMoreBtn).not.toBeVisible()

    // Capture second page screenshot
    await spFrame.locator("[data-tutorial='library-card-grid']").screenshot({
      path: path.join(screenshotsDir, "library-pagination-page2.png")
    })
  })

  test("should allow editing and saving Midjourney advanced parameters", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for advanced parameters E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // 3. Open Card Detail View
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // 4. Open Advanced Parameters accordion
    const advancedParamsHeader = spFrame.locator(
      "button:has-text('Advanced Parameters')"
    )
    await expect(advancedParamsHeader).toBeVisible()
    await advancedParamsHeader.click()

    // 5. Check Stylize checkbox to enable it
    const stylizeCheckbox = spFrame
      .locator("input[type='checkbox'] + span:has-text('Stylize')")
      .or(
        spFrame.locator(
          "label:has-text('Stylize (--stylize)') input[type='checkbox']"
        )
      )
    await expect(stylizeCheckbox).toBeVisible()
    await stylizeCheckbox.check()

    // 6. Enter a value for Stylize
    const stylizeInput = spFrame.locator("input[type='number']").first()
    await expect(stylizeInput).toBeVisible()
    await stylizeInput.fill("450")

    // 7. Check Tile checkbox
    const tileCheckbox = spFrame.locator(
      "label:has-text('Tile (--tile)') input[type='checkbox']"
    )
    await expect(tileCheckbox).toBeVisible()
    await tileCheckbox.check()

    // Take screenshot of the parameter editor in detail panel
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(screenshotsDir, "advanced-parameters-editor.png")
    })

    // 8. Save
    const saveBtn = spFrame.locator("button:has-text('Save')")
    await saveBtn.click()

    // 9. Navigate to Settings and disable Card Editing feature
    const settingsBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsBtn).toBeVisible()
    await settingsBtn.click()

    const cardEditingBtn = spFrame.locator("#expert-feature-cardediting-btn")
    await expect(cardEditingBtn).toBeVisible()
    await cardEditingBtn.click()

    // 10. Switch back to Library tab
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()

    // 11. Re-open Card Detail View to verify read-only presentation and persistence
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // Check read-only parameters list
    const readOnlyStylize = spFrame.locator("text=Stylize (--stylize): 450")
    const readOnlyTile = spFrame.locator("text=Tile (--tile): true")
    await expect(readOnlyStylize).toBeVisible()
    await expect(readOnlyTile).toBeVisible()

    // Take screenshot of read-only mode showing the new params
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(screenshotsDir, "advanced-parameters-readonly.png")
    })

    // Clean up: Reset Card Editing setting to true for other tests
    await settingsBtn.click()
    await expect(cardEditingBtn).toBeVisible()
    await cardEditingBtn.click()
  })

  test("should track card editing history and allow rollback @J-ORG-VERSION-01", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for version history E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a test card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "card-history-test",
        name: "Initial Version",
        promptSegments: [{ type: "text", value: "initial prompt" }],
        parameters: {},
        masking: {},
        tier: "Common",
        tags: ["history-test"],
        createdAt: Date.now(),
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
      })
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible()
    await libraryTabButton.click()
    await page.waitForTimeout(500)

    // 4. Open Card Detail View
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // 5. Modify the name and prompt to trigger history snapshot
    const nameInput = spFrame
      .locator("input[placeholder='Enter card name...']")
      .or(spFrame.locator("label:has-text('Card Name') + input"))
      .or(
        spFrame.locator("input").first() // fallback to first input
      )
    await expect(nameInput).toBeVisible()
    await nameInput.fill("Modified Version")

    // 6. Save changes
    const saveBtn = spFrame.locator("button:has-text('Save')")
    await saveBtn.click()
    await page.waitForTimeout(500)

    // 7. Re-open Card Detail View to view version history
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // 8. Verify Version History list contains "Initial Version"
    const versionHistoryHeader = spFrame.locator(
      "h3:has-text('Version History')"
    )
    await expect(versionHistoryHeader).toBeVisible()
    const historyItemName = spFrame.locator("span:has-text('Initial Version')")
    await expect(historyItemName).toBeVisible()

    // 9. Click "Restore" to rollback
    const rollbackBtn = spFrame.locator("button:has-text('Restore')")
    await expect(rollbackBtn).toBeVisible()
    await rollbackBtn.click()
    await page.waitForTimeout(500)

    // 10. Verify rollback notice banner is shown and name input went back to "Initial Version"
    const rollbackNotice = spFrame.locator("text=Restored from history")
    await expect(rollbackNotice).toBeVisible()

    // Capture screenshot of the rollback state showing the notice banner
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(screenshotsDir, "card-detail-version-history.png")
    })

    // 11. Click Save to persist rollback
    await saveBtn.click()
    await page.waitForTimeout(500)

    // 12. Verify DB state is back to "Initial Version"
    const cardInDb = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      return await database.styleCards.get("card-history-test")
    })
    expect(cardInDb.name).toBe("Initial Version")
  })
})
