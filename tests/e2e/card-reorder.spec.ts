import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Card Reordering @J-WB-EXPERT-02", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should allow reordering cards in the binder via drag and drop", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for card reordering E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear cards and add two mock cards in the same category
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()

      // Seed Card A
      await database.styleCards.add({
        id: "card-a",
        name: "Card A",
        createdAt: 1000,
        updatedAt: 1000,
        promptSegments: [{ type: "text", value: "prompt A" }],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common",
        isFavorite: false,
        isPinned: false,
        usageCount: 0,
        tags: [],
        category: "style",
        dominantColor: "#ef4444",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })

      // Seed Card B
      await database.styleCards.add({
        id: "card-b",
        name: "Card B",
        createdAt: 2000,
        updatedAt: 2000,
        promptSegments: [{ type: "text", value: "prompt B" }],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common",
        isFavorite: false,
        isPinned: false,
        usageCount: 0,
        tags: [],
        category: "style",
        dominantColor: "#3b82f6",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })
    })

    // 3. Switch to Library tab if not already active
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // Drill down into Style folder to display the seeded cards
    console.log("Drilling down into Style folder...")
    const styleFolder = spFrame
      .locator("[data-testid='subfolders-grid'] div", {
        hasText: "Style"
      })
      .last()
    await expect(styleFolder).toBeVisible({ timeout: 10000 })
    await styleFolder.click()

    // 4. Verify both cards are visible in the grid
    const cardA = spFrame.locator("text=Card A").first()
    const cardB = spFrame.locator("text=Card B").first()
    await expect(cardA).toBeVisible({ timeout: 10000 })
    await expect(cardB).toBeVisible({ timeout: 10000 })

    // Default sort is newest first. Since Card B has createdAt: 2000 and Card A has 1000,
    // Card B should appear first, and Card A should appear second.
    // Check initial order in DB
    const initialCards = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      const cards = await database.getAllCards()
      return cards.map((c: any) => c.id)
    })
    console.log("Initial card order in DB:", initialCards)

    // 5. Perform Drag and Drop from Card A to Card B programmatically to ensure test stability
    console.log("Simulating card drag-and-drop reorder: Card A -> Card B...")
    const cardADiv = spFrame
      .locator("div[draggable=true]")
      .filter({ hasText: "Card A" })
      .first()
    const cardBDiv = spFrame
      .locator("div[draggable=true]")
      .filter({ hasText: "Card B" })
      .first()

    await expect(cardADiv).toBeVisible()
    await expect(cardBDiv).toBeVisible()

    await cardBDiv.evaluate((element) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.setData("cardId", "card-a")

      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      element.dispatchEvent(dragOverEvent)

      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      element.dispatchEvent(dropEvent)
    })

    // 6. Verify that sort indices are updated in DB and Card A comes before Card B
    // Wait for the reorder transaction to finish
    await page.waitForTimeout(1000)

    const updatedCards = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      const cards = await database.getAllCards()
      // Sort in-memory using sortIndex to see if A comes before B
      cards.sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      return cards.map((c: any) => ({ id: c.id, sortIndex: c.sortIndex }))
    })

    console.log("Updated card order in DB:", updatedCards)

    const cardAIndex = updatedCards.findIndex((c) => c.id === "card-a")
    const cardBIndex = updatedCards.findIndex((c) => c.id === "card-b")

    expect(cardAIndex).toBeLessThan(cardBIndex)
    expect(updatedCards[cardAIndex].sortIndex).toBe(0)
    expect(updatedCards[cardBIndex].sortIndex).toBe(1)

    // Verify UI updates SortSelector value to 'custom'
    const sortSelect = spFrame
      .locator("select")
      .filter({ hasText: "Custom" })
      .first()
    if (await sortSelect.isVisible()) {
      await expect(sortSelect).toHaveValue("custom")
    }

    console.log("Card reordering E2E test passed successfully!")

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "card-reorder-success.png")
    })
  })
})
