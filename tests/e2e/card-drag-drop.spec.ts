import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Card Drag and Drop @J-ORG-FOLDER-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  // テストケース1: カード一覧からドラッグし、サイドバーの別バインダーにドロップした際、
  // カードの所属が正しく変更され、元バインダーから消えることを検証します。
  test("should move card to another binder when dragged and dropped onto it", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for card binder-moving E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear cards and add two custom categories and one card initially in no category (Root)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()

      // Seed Folder A and Folder B
      await database.categories.add({
        id: "folder-a",
        name: "Folder A",
        createdAt: 1000
      })
      await database.categories.add({
        id: "folder-b",
        name: "Folder B",
        createdAt: 2000
      })

      // Seed Card A (no category initially)
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
        category: "", // initially uncategorized (Root)
        dominantColor: "#ef4444",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // 4. Verify Folder A and Folder B are visible, and Card A is in the grid (at Root)
    const folderA = spFrame
      .locator("[data-testid='subfolders-grid'] div", { hasText: "Folder A" })
      .last()
    const folderB = spFrame
      .locator("[data-testid='subfolders-grid'] div", { hasText: "Folder B" })
      .last()
    const cardA = spFrame.locator("text=Card A").first()

    await expect(folderA).toBeVisible({ timeout: 10000 })
    await expect(folderB).toBeVisible({ timeout: 10000 })
    await expect(cardA).toBeVisible({ timeout: 10000 })

    // 5. Drag Card A and drop it onto Folder A
    console.log("Simulating card drag-and-drop: Card A -> Folder A...")
    await folderA.evaluate((element) => {
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

    // Wait for DB transaction and UI update
    await page.waitForTimeout(1000)

    // 6. Verify Card A is gone from the Root grid
    await expect(cardA).not.toBeVisible()

    // Verify DB update
    const cardInDb = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      return await database.getCard("card-a")
    })
    expect(cardInDb?.category).toBe("folder-a")

    // 7. Drill down into Folder A and verify Card A is there
    console.log("Entering Folder A...")
    await folderA.click()
    await expect(cardA).toBeVisible({ timeout: 10000 })

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "card-drag-drop-move-success.png")
    })
  })

  // テストケース2: バインダー内でカードAをカードBの後にドラッグ＆ドロップし、順序が入れ替わることを検証します。
  test("should reorder cards inside the binder when card A is dropped on card B", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for card reordering inside binder E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed custom folder and two cards in it
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()

      await database.categories.add({
        id: "folder-a",
        name: "Folder A",
        createdAt: 1000
      })

      // Card A
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
        category: "folder-a",
        dominantColor: "#ef4444",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })

      // Card B
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
        category: "folder-a",
        dominantColor: "#3b82f6",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // 4. Drill down into Folder A
    const folderA = spFrame
      .locator("[data-testid='subfolders-grid'] div", { hasText: "Folder A" })
      .last()
    await expect(folderA).toBeVisible({ timeout: 10000 })
    await folderA.click()

    // 5. Verify both cards are visible
    const cardA = spFrame.locator("text=Card A").first()
    const cardB = spFrame.locator("text=Card B").first()
    await expect(cardA).toBeVisible({ timeout: 10000 })
    await expect(cardB).toBeVisible({ timeout: 10000 })

    // Default order (newest first): Card B (2000) then Card A (1000)
    // 6. Perform Drag and Drop: Card A -> Card B
    console.log("Simulating card drag-and-drop reorder inside folder...")
    const cardBDiv = spFrame
      .locator("div[draggable=true]")
      .filter({ hasText: "Card B" })
      .first()
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

    await page.waitForTimeout(1000)

    // 7. Verify order in DB (A before B)
    const updatedCards = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      const cards = await database.getAllCards()
      cards.sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      return cards.map((c: any) => c.id)
    })
    console.log("Updated order in DB:", updatedCards)
    expect(updatedCards[0]).toBe("card-a")
    expect(updatedCards[1]).toBe("card-b")

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "card-drag-drop-reorder-success.png")
    })
  })

  // テストケース3: ドラッグ＆ドロップ操作を行った後にブラウザをリロードし、
  // IndexedDBから正しく状態が復元され、並び順や所属バインダーが維持されていることを検証します。
  test("should persist and restore card category and order after page reload", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for reload persistence E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed custom Folder A, Card A and Card B in Folder A, Card C in Root
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()

      await database.categories.add({
        id: "folder-a",
        name: "Folder A",
        createdAt: 1000
      })

      // Card A (in Folder A)
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
        category: "folder-a",
        dominantColor: "#ef4444",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })

      // Card B (in Folder A)
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
        category: "folder-a",
        dominantColor: "#3b82f6",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })

      // Card C (in Root)
      await database.styleCards.add({
        id: "card-c",
        name: "Card C",
        createdAt: 3000,
        updatedAt: 3000,
        promptSegments: [{ type: "text", value: "prompt C" }],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common",
        isFavorite: false,
        isPinned: false,
        usageCount: 0,
        tags: [],
        category: "",
        dominantColor: "#10b981",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })
    })

    // 3. Go to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // 4. Perform move: Card C -> Folder A
    const folderA = spFrame
      .locator("[data-testid='subfolders-grid'] div", { hasText: "Folder A" })
      .last()
    const cardC = spFrame.locator("text=Card C").first()
    await expect(folderA).toBeVisible({ timeout: 10000 })
    await expect(cardC).toBeVisible({ timeout: 10000 })

    console.log("Moving Card C to Folder A...")
    await folderA.evaluate((element) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.setData("cardId", "card-c")
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

    await page.waitForTimeout(1000)

    // 5. Drill down into Folder A to see Card A and Card B
    console.log("Entering Folder A to reorder cards...")
    await folderA.click()

    const cardA = spFrame.locator("text=Card A").first()
    const cardB = spFrame.locator("text=Card B").first()
    await expect(cardA).toBeVisible({ timeout: 10000 })
    await expect(cardB).toBeVisible({ timeout: 10000 })

    // 6. Perform reorder: Card A -> Card B inside Folder A
    console.log("Reordering Card A -> Card B inside Folder A...")
    const cardBDiv = spFrame
      .locator("div[draggable=true]")
      .filter({ hasText: "Card B" })
      .first()
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

    await page.waitForTimeout(1000)

    // Verify DB before reload
    const preReloadOrder = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      const cards = await database.getAllCards()
      cards.sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      return cards.map((c: any) => ({ id: c.id, category: c.category }))
    })
    console.log("Pre-reload order in DB:", preReloadOrder)

    // 7. Reload the page with noseed query parameter to prevent database reset
    console.log("Reloading browser page with noseed=true...")
    await page.goto("/tests/sandbox/index.html?noseed=true")

    // Wait for frames to load again
    const spFrameReloaded = page.frameLocator("#sidepanel-frame")
    const skipButtonReloaded = spFrameReloaded.locator("#welcome-skip-btn")
    if (
      await skipButtonReloaded.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await skipButtonReloaded.click()
    }

    // Go to Library tab
    const libraryTabButtonReloaded = spFrameReloaded.locator(
      "button:has-text('Library')"
    )
    await libraryTabButtonReloaded.click()

    // Verify Card C is NOT at Root (should be in Folder A now)
    const cardCReloaded = spFrameReloaded.locator("text=Card C").first()
    await expect(cardCReloaded).not.toBeVisible()

    // Enter Folder A and verify all cards are inside
    const folderAReloaded = spFrameReloaded
      .locator("[data-testid='subfolders-grid'] div", { hasText: "Folder A" })
      .last()
    await expect(folderAReloaded).toBeVisible({ timeout: 10000 })
    await folderAReloaded.click()

    const cardAReloaded = spFrameReloaded.locator("text=Card A").first()
    const cardBReloaded = spFrameReloaded.locator("text=Card B").first()
    await expect(cardAReloaded).toBeVisible({ timeout: 10000 })
    await expect(cardBReloaded).toBeVisible({ timeout: 10000 })
    await expect(cardCReloaded).toBeVisible({ timeout: 10000 })

    // Verify DB after reload: category and sort index should be persistent
    const postReloadCards = await spFrameReloaded
      .locator("body")
      .evaluate(async () => {
        const database = (window as any).db
        const cards = await database.getAllCards()
        cards.sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        return cards.map((c: any) => ({
          id: c.id,
          category: c.category,
          sortIndex: c.sortIndex
        }))
      })
    console.log("Post-reload cards in DB:", postReloadCards)

    // Card C category must remain "folder-a"
    const cardCData = postReloadCards.find((c) => c.id === "card-c")
    expect(cardCData?.category).toBe("folder-a")

    // Card A index must be less than Card B index (reordering preserved)
    const cardAData = postReloadCards.find((c) => c.id === "card-a")
    const cardBData = postReloadCards.find((c) => c.id === "card-b")
    expect(cardAData?.sortIndex).toBeLessThan(cardBData?.sortIndex ?? 9999)

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "card-drag-drop-persistence-success.png")
    })
  })

  // テストケース4: カード一覧からドラッグし、フィルターアコーディオン内のカテゴリボタンにドロップした際、
  // カードの所属カテゴリが正しく変更されることを検証します。
  test("should move card to category button in filter accordion when dragged and dropped onto it @J-ORG-BINDER-DND-01", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for category button drag-and-drop E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear cards and add two custom categories and one card initially in no category (Root)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()

      // Seed Folder A and Folder B
      await database.categories.add({
        id: "folder-a",
        name: "Folder A",
        createdAt: 1000
      })
      await database.categories.add({
        id: "folder-b",
        name: "Folder B",
        createdAt: 2000
      })

      // Seed Card A (no category initially)
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
        category: "", // initially uncategorized (Root)
        dominantColor: "#ef4444",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
        frameId: "frame_holo_v1",
        genealogy: { generation: 1, parentIds: [] }
      })
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // 4. Open filter accordion
    const filterToggleBtn = spFrame
      .locator("[data-testid='toggle-filters-btn']")
      .first()
    await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
    await filterToggleBtn.click()

    // 5. Verify Folder A category button is visible in filter accordion
    const categoryBtnA = spFrame
      .locator("[data-testid='category-filter-btn-folder-a']")
      .first()
    await expect(categoryBtnA).toBeVisible({ timeout: 10000 })

    const cardA = spFrame.locator("text=Card A").first()
    await expect(cardA).toBeVisible({ timeout: 10000 })

    // 6. Drag Card A and drop it onto Folder A category button in filter accordion
    console.log(
      "Simulating card drag-and-drop: Card A -> Folder A category filter button..."
    )
    await categoryBtnA.evaluate((element) => {
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

    // Wait for DB transaction and UI update
    await page.waitForTimeout(1000)

    // Verify DB update
    const cardInDb = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      return await database.getCard("card-a")
    })
    expect(cardInDb?.category).toBe("folder-a")

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "card-drag-drop-filter-btn-success.png")
    })
  })
})
