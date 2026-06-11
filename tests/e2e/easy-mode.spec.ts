/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Easy Mode Workbench Modal @J-WB-EASY-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should open Simple Workbench modal on card click in Easy Mode, adjust prompt, and inject successfully", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Easy Mode Workbench E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Verify Guide button is visible in default Expert Mode
    const guideBtn = spFrame.locator("button[title='Show Guide']")
    await expect(guideBtn).toBeVisible({ timeout: 10000 })

    // 2. Toggle Easy Mode ON
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 })
    await easyModeToggle.click()
    await page.waitForTimeout(500)

    // Verify Guide button is hidden in Easy Mode
    await expect(guideBtn).not.toBeVisible({ timeout: 10000 })

    // Save screenshot of Easy Mode layout showing the guide button is hidden
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-guide-hidden.png")
    })

    // 3. Inject a mock card in Easy Mode
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "easy-mode-card-1",
        name: "Easy Mode test card",
        promptSegments: [
          { type: "text", value: "cute cat illustration" },
          { type: "slot", label: "Color", default: "blue" }
        ],
        parameters: { ar: "16:9" },
        masking: {},
        tier: "Rare",
        isPinned: false,
        dominantColor: "#3b82f6",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
      })
    })

    // Wait for the view to update and card to render
    await page.waitForTimeout(1000)

    // 4. Locate and click on the newly seeded card in LibraryTab
    const cardElement = spFrame.locator("text=Easy Mode test card").first()
    await expect(cardElement).toBeVisible({ timeout: 10000 })

    // Ensure the pin/select button is NOT visible for this card
    const pinBtn = spFrame.locator("button[title='Workbenchに送る']")
    await expect(pinBtn).not.toBeVisible()

    await cardElement.click()

    // 5. Verify the Simple Workbench Modal has opened
    const modalTitle = spFrame.locator(
      "h3:has-text('Simple Workbench'), h3:has-text('簡易 Workbench')"
    )
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    // Verify slot variable input field is visible
    const slotInput = spFrame.locator("[data-testid='simple-slot-input-Color']")
    await expect(slotInput).toBeVisible({ timeout: 10000 })
    await expect(slotInput).toHaveValue("blue")

    // Edit the slot variable value
    await slotInput.fill("red")

    // Capture screenshot of the opened Simple Workbench modal with slot input
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-workbench-modal.png")
    })
    console.log("Simple Workbench modal screenshot saved.")

    // 6. Click 'Try on Midjourney' within the modal
    const injectBtn = spFrame.locator("button:has-text('Try on Midjourney')")
    await expect(injectBtn).toBeVisible()
    await injectBtn.click()

    // 7. Verify prompt is injected into Midjourney text area (resolving the slot to the edited value 'red')
    const mjTextarea = mjFrame
      .locator('textarea, [role="textbox"], [data-testid="prompt-input"]')
      .first()
    await expect(mjTextarea).toHaveValue(
      "cute cat illustration, red --ar 16:9",
      { timeout: 10000 }
    )

    // 8. Close the modal by clicking 'Cancel'
    const cancelBtn = spFrame.locator(
      "button:has-text('Cancel'), button:has-text('キャンセル')"
    )
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 })
  })

  test("should display library and open simple workbench correctly in Easy Mode (@J-ORG-EASY-01)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Easy Mode Library test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Toggle Easy Mode ON
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 })
    await easyModeToggle.click()
    await page.waitForTimeout(500)

    // 3. Clear database and seed custom test cards
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "easy-card-a",
          name: "Easy Card A",
          promptSegments: [{ type: "text", value: "cyberpunk skyline" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: false,
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "easy-card-b",
          name: "Easy Card B",
          promptSegments: [{ type: "text", value: "fantasy forest" }],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: false,
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })
    await page.waitForTimeout(1000)

    // 4. Verify both cards are rendered (toggling Easy Mode automatically redirected to Library Tab)
    const cardA = spFrame.locator("text=Easy Card A").first()
    const cardB = spFrame.locator("text=Easy Card B").first()
    await expect(cardA).toBeVisible({ timeout: 10000 })
    await expect(cardB).toBeVisible({ timeout: 10000 })

    // 5. Verify that pinning button is NOT visible/available on the card thumbnail in Easy Mode
    const pinBtn = spFrame.locator(
      "button[title='Workbenchに送る'], button[title='Workbenchから外す']"
    )
    await expect(pinBtn).not.toBeVisible()

    // 6. Click Easy Card A to open Simple Workbench modal
    await cardA.click()

    // 7. Verify the Simple Workbench Modal has opened
    const modalTitle = spFrame.locator(
      "h3:has-text('Simple Workbench'), h3:has-text('簡易 Workbench')"
    )
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-library-simple-workbench.png")
    })

    // 8. Close modal
    const cancelBtn = spFrame.locator(
      "button:has-text('Cancel'), button:has-text('キャンセル')"
    )
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()
  })

  test("should allow minting a new card in Easy Mode (@J-MINT-EASY-01)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Easy Mode Minting test...")
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Toggle Easy Mode ON
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 })
    await easyModeToggle.click()
    await page.waitForTimeout(500)

    // 3. Clear database and seed mock category
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.styleCards.clear()
      await database.categories.clear()
      await database.categories.add({
        id: "category-easy-1",
        name: "Anime/Manga",
        iconEmoji: "🍥"
      })
    })
    await page.waitForTimeout(1000)

    // 4. Perform Drag & Drop from Midjourney Mock to Sidepanel
    const dragSource = mjFrame.locator("img[src*='0_0_640_N.webp']").first()
    await expect(dragSource).toBeVisible({ timeout: 10000 })

    const dropTarget = spFrame.locator("body")
    console.log("Performing drag and drop simulation...")
    await dragSource.dragTo(dropTarget)
    await page.waitForTimeout(1000)

    // 5. Verify Simple Minting View is now visible
    const simpleMintingView = spFrame.locator(
      "[data-testid='simple-minting-view-container']"
    )
    await expect(simpleMintingView).toBeVisible({ timeout: 15000 })

    // 6. Enter Custom Card Name
    const nameInput = spFrame.locator("input").first()
    await expect(nameInput).toBeVisible()
    await nameInput.fill("Easy Anime Card")

    // 7. Select category
    const categorySelect = spFrame.locator("select").first()
    await expect(categorySelect).toBeVisible()
    await categorySelect.selectOption({ value: "category-easy-1" })

    // Capture screenshot of Simple Minting View
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-minting-view.png")
    })

    // 8. Click Save to Library
    const saveBtn = spFrame.locator(
      "button:has-text('Save to Library'), button:has-text('ライブラリに保存')"
    )
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // 9. Verify Simple Minting View is closed
    await expect(simpleMintingView).not.toBeVisible({ timeout: 10000 })

    // 10. Verify the card is saved in Library (we are already redirected to Library in Easy Mode)
    const savedCard = spFrame.locator("text=Easy Anime Card").first()
    await expect(savedCard).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-minting-success.png")
    })
  })
})
