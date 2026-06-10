/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Workbench @J-WB-EXPERT-01", () => {
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

  test("should render slot variables and handle pin to hand in Workbench", async ({
    page
  }) => {
    console.log(
      "Navigating to sandbox page for Workbench slot variable test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. ウェルカムダイアログの「スキップ」ボタンがあればクリック
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. HandBarからanime slot templateをクリックしてWorkbenchに追加
    const mockCardInHand = spFrame
      .locator("#handbar-root .cursor-pointer")
      .nth(1) // anime slot template
    await expect(mockCardInHand).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)
    await mockCardInHand.click({ force: true })

    // 3. Workbenchタブへ切り替え
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
    await workbenchTabButton.click()

    // 4. Slot Variablesセクションが表示されるのを確認
    const slotSectionHeader = spFrame.locator("text=Slot Variables")
    await expect(slotSectionHeader).toBeVisible({ timeout: 10000 })

    // 5. Inputに値を入力して、Pin to Handボタンをクリック
    const slotInput = spFrame.locator("input[placeholder='girl']")
    await expect(slotInput).toBeVisible()
    await slotInput.fill("samurai cat")

    // Send to Workbench
    const sendBtn = spFrame.locator("button[title='Send to Workbench']").first()
    await expect(sendBtn).toBeVisible()
    await sendBtn.click()

    // 6. 新しいカードがHandBarにピン留めされたかを確認
    const newCardImage = spFrame.locator("#handbar-root img[alt='samurai cat']")
    await expect(newCardImage).toBeVisible({ timeout: 10000 })
  })

  test("should open Merge Card Stack modal and execute merge in Workbench", async ({
    page
  }) => {
    console.log("Navigating to sandbox page for Workbench merge test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. スキップ
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. 初期状態で両方のカードがすでにWorkbench（手札）に入っていることを確認
    const cardCount = spFrame.locator("#handbar-root .cursor-pointer")
    await expect(cardCount).toHaveCount(2)

    // 3. Workbenchタブへ切り替え
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()

    // 4. Merge Stackボタンをクリックしてモーダルを開く
    const mergeStackBtn = spFrame.locator("[data-testid='handbar-merge-btn']")
    await expect(mergeStackBtn).toBeVisible()
    await mergeStackBtn.click()

    // 5. モーダルの表示を確認
    const modalTitle = spFrame.locator("h3:has-text('Merge Card Stack')")
    await expect(modalTitle).toBeVisible()

    // 6. モーダル内のMerge Stackを実行
    const executeMergeBtn = spFrame.locator(
      "[data-testid='handbar-execute-merge-btn']"
    )
    await expect(executeMergeBtn).toBeVisible()
    await executeMergeBtn.click()

    // 7. モーダルが閉じたことを確認
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 })

    // 材料カードが消費され、ベースカード1枚だけが残っていることを確認
    const remainingCards = spFrame.locator("#handbar-root .cursor-pointer")
    await expect(remainingCards).toHaveCount(1)
  })

  test("should support Workbench-Single flow (Scenario 5)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Workbench-Single E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 3 cards, all pinned (so they are in the Hand)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-w1",
          name: "Card W1",
          promptSegments: [
            { type: "text", value: "cyberpunk cat" },
            { type: "slot", label: "Color", default: "blue" }
          ],
          parameters: { sref: ["https://example.com/sref1"] },
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-w2",
          name: "Card W2",
          promptSegments: [{ type: "text", value: "neon glow" }],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-w3",
          name: "Card W3",
          promptSegments: [{ type: "text", value: "synthwave sun" }],
          parameters: {},
          masking: {},
          tier: "Epic",
          isPinned: true,
          dominantColor: "#8b5cf6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // Unpin Card W2 and Card W3 using the X button on their thumbnails in the HandBar
    console.log("Unpinning Card W2 and Card W3...")
    const cardW2 = spFrame.locator("#handbar-root .cursor-pointer").nth(1)
    await cardW2.hover()
    await cardW2.locator("button").last().click()

    const cardW3 = spFrame.locator("#handbar-root .cursor-pointer").nth(1)
    await cardW3.hover()
    await cardW3.locator("button").last().click()

    // Now only 1 card (Card W1) is in the Hand/Workbench
    const activeWorkbenchCards = spFrame.locator(
      "#handbar-root .cursor-pointer"
    )
    await expect(activeWorkbenchCards).toHaveCount(1)

    // 4. Fill in slot value for "Color"
    const slotInput = spFrame.locator("input[placeholder='blue']")
    await expect(slotInput).toBeVisible({ timeout: 10000 })
    await slotInput.fill("purple")

    // 5. Try on Midjourney (Inject)
    const injectBtn = spFrame.locator("button:has-text('Try on Midjourney')")
    await expect(injectBtn).toBeVisible()
    await injectBtn.click()

    // 6. Verify prompt in Midjourney mock textarea
    const mjTextarea = mjFrame
      .locator('textarea, [role="textbox"], [data-testid="prompt-input"]')
      .first()
    await expect(mjTextarea).toHaveValue(
      "cyberpunk cat, purple --sref https://example.com/sref1",
      { timeout: 10000 }
    )

    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-single-success.png")
    })
  })

  test("should support Workbench-Double flow (Scenario 6)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Workbench-Double E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const mjFrame = page.frameLocator("#midjourney-frame")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 3 cards, all pinned (so they are in the Hand)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-w1",
          name: "Card W1",
          promptSegments: [
            { type: "text", value: "cyberpunk cat" },
            { type: "slot", label: "Color", default: "blue" }
          ],
          parameters: { sref: ["https://example.com/sref1"] },
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-w2",
          name: "Card W2",
          promptSegments: [{ type: "text", value: "neon glow" }],
          parameters: { p: ["p-code-w2"] },
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Rare",
          isPinned: true,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-w3",
          name: "Card W3",
          promptSegments: [{ type: "text", value: "synthwave sun" }],
          parameters: {},
          masking: {},
          tier: "Epic",
          isPinned: true,
          dominantColor: "#8b5cf6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // Workbench-Double: select two cards (W1 and W2). So unpin Card W3 (index 2).
    console.log("Unpinning Card W3...")
    const cardW3 = spFrame.locator("#handbar-root .cursor-pointer").nth(2)
    await cardW3.hover()
    await cardW3.locator("button").last().click()

    // Now 2 cards are in the Hand/Workbench.
    const activeWorkbenchCards = spFrame.locator(
      "#handbar-root .cursor-pointer"
    )
    await expect(activeWorkbenchCards).toHaveCount(2)

    // 4. Fill in slot value for "Color"
    const slotInput = spFrame.locator("input[placeholder='blue']")
    await expect(slotInput).toBeVisible({ timeout: 10000 })
    await slotInput.fill("yellow")

    // 5. Try on Midjourney (Inject)
    const injectBtn = spFrame.locator("button:has-text('Try on Midjourney')")
    await expect(injectBtn).toBeVisible()
    await injectBtn.click()

    // 6. Verify prompt in Midjourney mock textarea
    const mjTextarea = mjFrame
      .locator('textarea, [role="textbox"], [data-testid="prompt-input"]')
      .first()
    await expect(mjTextarea).toHaveValue(
      "cyberpunk cat, yellow, neon glow --sref https://example.com/sref1 --p p-code-w2",
      { timeout: 10000 }
    )

    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-double-success.png")
    })
  })

  test("should support Workbench-Triple flow (Scenario 7)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Workbench-Triple E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 3 cards, all pinned (so they are in the Hand)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-w1",
          name: "Card W1",
          promptSegments: [{ type: "text", value: "cyberpunk cat" }],
          parameters: { sref: ["https://example.com/sref1"] },
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
          usageCount: 5
        },
        {
          id: "card-w2",
          name: "Card W2",
          promptSegments: [{ type: "text", value: "neon glow" }],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
          usageCount: 3
        },
        {
          id: "card-w3",
          name: "Card W3",
          promptSegments: [{ type: "text", value: "synthwave sun" }],
          parameters: {},
          masking: {},
          tier: "Epic",
          isPinned: true,
          dominantColor: "#8b5cf6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
          usageCount: 2
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Click "Merge Stack" button in the HandBar
    const mergeStackBtn = spFrame.locator("[data-testid='handbar-merge-btn']")
    await expect(mergeStackBtn).toBeVisible({ timeout: 10000 })
    await mergeStackBtn.click()

    // 5. Verify Merge Modal is open
    const modalTitle = spFrame.locator("h3:has-text('Merge Card Stack')")
    await expect(modalTitle).toBeVisible()

    // 6. Base Card W1 is selected by default (index 0).
    // Let's verify that Card W2 is in the Material list and is set to "Consume" by default.
    // And Card W3 is also in the Material list and is set to "Consume". We click on Card W3's "Consume" button to change it to "Keep".
    console.log("Setting Card W3 integration to Keep...")
    const cardW3Row = spFrame
      .locator(".space-y-2")
      .last()
      .locator("div", { has: spFrame.locator("p", { hasText: "Card W3" }) })
      .first()
    const consumeBtn = cardW3Row.locator("button:has-text('Consume')")
    await expect(consumeBtn).toBeVisible()
    await consumeBtn.click()

    // Verify it is now "Keep"
    await expect(cardW3Row.locator("button:has-text('Keep')")).toBeVisible()

    // 7. Click "Merge Stack" button inside the modal to execute merge
    const modalExecuteBtn = spFrame.locator(
      "[data-testid='handbar-execute-merge-btn']"
    )
    await modalExecuteBtn.click()

    // 8. Verify modal is closed
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000) // wait for DB transaction

    // 9. Verify in DB that W1 usage count is combined (5 + 3 = 8), W2 is soft-deleted, and W3 remains.
    const results = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      const w1 = await database.getCard("card-w1")
      const w2 = await database.getCard("card-w2")
      const w3 = await database.getCard("card-w3")
      return {
        w1Exists: !!w1,
        w1Usage: w1?.usageCount,
        w2Exists: !!w2,
        w3Exists: !!w3
      }
    })

    console.log("Merge verification results:", results)
    expect(results.w1Exists).toBe(true)
    expect(results.w1Usage).toBe(8)
    expect(results.w2Exists).toBe(false)
    expect(results.w3Exists).toBe(true)

    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-triple-success.png")
    })
  })

  test("should show evolution success modal when evolving a card", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for evolution E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a Common card that is ready to evolve (usageCount = 5)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-evolve-test",
          name: "Evolve Test Card",
          promptSegments: [{ type: "text", value: "futuristic landscape" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#94a3b8",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%2394a3b8'/></svg>",
          usageCount: 5
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Verify the Evolve button is visible and click it
    const evolveBtn = spFrame.locator(
      "button:has-text('Evolve to Next Tier'), button:has-text('次のランクへ進化')"
    )
    await expect(evolveBtn).toBeVisible({ timeout: 10000 })
    await evolveBtn.click()

    // 5. Verify the Evolution Success Modal is visible
    const modalTitle = spFrame.locator(
      "h2:has-text('EVOLUTION COMPLETE!'), h2:has-text('進化完了！')"
    )
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    // Verify card name is in the modal
    const modalCardName = spFrame.locator("h3:has-text('Evolve Test Card')")
    await expect(modalCardName).toBeVisible()

    // 6. Capture screenshot of the modal
    await page.screenshot({
      path: path.join(screenshotsDir, "evolution-success-modal.png")
    })

    // 7. Click Close button in the modal and verify it closes
    const closeBtn = spFrame.locator(
      "button:has-text('Close'), button:has-text('閉じる')"
    )
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 })
  })

  test("should limit pinned cards to 7 and show warning alert", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Pinning Limit E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 7 pinned cards and 1 unpinned card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()

      const cards = []
      // 7 pinned cards
      for (let i = 1; i <= 7; i++) {
        cards.push({
          id: `card-pinned-${i}`,
          name: `Pinned Card ${i}`,
          promptSegments: [{ type: "text", value: `style ${i}` }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        })
      }
      // 1 unpinned card
      cards.push({
        id: "card-unpinned",
        name: "Unpinned Card",
        promptSegments: [{ type: "text", value: "style unpinned" }],
        parameters: {},
        masking: {},
        tier: "Common",
        isPinned: false,
        dominantColor: "#ef4444",
        thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
      })

      await database.styleCards.bulkAdd(cards)
    })

    // 3. Navigate to Library tab to see the unpinned card
    const libraryTabButton = spFrame
      .locator("button:has-text('Library')")
      .first()
    await libraryTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Click the unpinned card to pin it (it should trigger the 7-card limit warning)
    const unpinnedCard = spFrame.locator("div:has-text('Unpinned Card')").last()
    await expect(unpinnedCard).toBeVisible({ timeout: 10000 })
    await unpinnedCard.click()

    // 5. Verify the Alert is visible (the text is depending on language, but the id is alert-hand-full)
    const alertBox = spFrame.locator("#alert-hand-full")
    await expect(alertBox).toBeVisible({ timeout: 10000 })

    // 6. Capture screenshot of the warning alert
    await page.screenshot({
      path: path.join(screenshotsDir, "hand-limit-warning.png")
    })
  })

  test("should validate atelier effects, card blending, parameter adjustments, and evolution success modal @J-WB-ATELIER-EFFECTS-01", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Atelier Effects E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a Common card that is ready to evolve (usageCount = 5) and a Rare card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-atelier-1",
          name: "Alchemist Card A",
          promptSegments: [{ type: "text", value: "mystical potion" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#4f46e5",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%234f46e5'/></svg>",
          usageCount: 5
        },
        {
          id: "card-atelier-2",
          name: "Alchemist Card B",
          promptSegments: [{ type: "text", value: "golden vapor" }],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#fbbf24",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23fbbd24'/></svg>",
          usageCount: 2
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Verify both cards are in the Workbench (blending state visual feedback)
    const activeWorkbenchCards = spFrame.locator(
      "#handbar-root .cursor-pointer"
    )
    await expect(activeWorkbenchCards).toHaveCount(2)

    // 5. Expand Parameters Accordion and adjust parameter sliders
    const advancedAccordionBtn = spFrame.locator(
      "button:has-text('Advanced Parameters'), button:has-text('詳細パラメータ')"
    )
    await expect(advancedAccordionBtn).toBeVisible({ timeout: 10000 })
    await advancedAccordionBtn.click()

    // Enable Stylize parameter checkbox
    const stylizeCheckbox = spFrame.locator("input[type='checkbox']").first()
    await expect(stylizeCheckbox).toBeVisible()
    await stylizeCheckbox.check()

    // Locate the number input for Stylize and change its value
    const stylizeInput = spFrame.locator("input[type='number']").first()
    await expect(stylizeInput).toBeVisible()
    await stylizeInput.fill("450") // Set to 450

    // Capture screenshot showing blending state & advanced parameters adjusted
    await page.screenshot({
      path: path.join(screenshotsDir, "atelier-blending-parameters.png")
    })

    // 6. Unpin Card B to leave only Card A in the Workbench (triggering single card evolution mode)
    console.log("Unpinning Alchemist Card B...")
    const cardB = spFrame.locator("#handbar-root .cursor-pointer").nth(1)
    await cardB.hover()
    await cardB.locator("button").last().click()

    await page.waitForTimeout(500)
    await expect(activeWorkbenchCards).toHaveCount(1)

    // 7. Click Evolve button and verify the Evolution Success Modal (alchemy effects validation)
    const evolveBtn = spFrame.locator(
      "button:has-text('Evolve to Next Tier'), button:has-text('次のランクへ進化')"
    )
    await expect(evolveBtn).toBeVisible({ timeout: 10000 })
    await evolveBtn.click()

    const modalTitle = spFrame.locator(
      "h2:has-text('EVOLUTION COMPLETE!'), h2:has-text('進化完了！')"
    )
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    // Capture screenshot of evolution success modal (with sparkles and visual highlights)
    await page.screenshot({
      path: path.join(screenshotsDir, "atelier-evolution-success.png")
    })

    // Close modal
    const closeBtn = spFrame.locator(
      "button:has-text('Close'), button:has-text('閉じる')"
    )
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 })
  })

  test("should render empty state when no cards are pinned in Workbench", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Workbench empty state E2E test..."
    )

    // Set theme to dark in localStorage before loading the page
    await page.addInitScript(() => {
      window.localStorage.setItem("style-atelier-theme", "dark")
    })

    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear database to ensure no cards are pinned
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()
    await page.waitForTimeout(1000) // wait for DB queries

    // 4. Verify the Empty State container is visible (check either English or Japanese using regex)
    const emptyTitle = spFrame.locator(
      "text=/Workbench is empty|Workbench は空です/"
    )
    await expect(emptyTitle).toBeVisible({ timeout: 10000 })

    // 5. Capture screenshot of the empty state (UX verification)
    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-empty-state-success.png")
    })
  })

  test("should render empty state when no history items are present", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for History empty state E2E test..."
    )

    // Set theme to dark in localStorage before loading the page
    await page.addInitScript(() => {
      window.localStorage.setItem("style-atelier-theme", "dark")
    })

    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear database to ensure no history items
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
    })

    // 3. Switch to History tab (index 0)
    const historyTabButton = spFrame.locator("nav button").nth(0)
    await historyTabButton.click()
    await page.waitForTimeout(1000)

    // 4. Verify the Empty State container is visible
    const emptyTitle = spFrame.locator("text=/No History|履歴がありません/")
    await expect(emptyTitle).toBeVisible({ timeout: 10000 })

    // 5. Capture screenshot of the empty state (UX verification)
    await page.screenshot({
      path: path.join(screenshotsDir, "history-empty-state-success.png")
    })
  })

  test("should render empty state when no cards are in Library", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Library empty state E2E test..."
    )

    // Set theme to dark in localStorage before loading the page
    await page.addInitScript(() => {
      window.localStorage.setItem("style-atelier-theme", "dark")
    })

    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Clear database to ensure no cards and no categories in library
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()
    })

    // 3. Switch to Library tab (index 1)
    const libraryTabButton = spFrame.locator("nav button").nth(1)
    await libraryTabButton.click()
    await page.waitForTimeout(1000)

    // 4. Verify the Empty State container is visible
    const emptyTitle = spFrame.locator(
      "text=/No Style Cards|スタイルカードがありません/"
    )
    await expect(emptyTitle).toBeVisible({ timeout: 10000 })

    // 5. Capture screenshot of the empty state (UX verification)
    await page.screenshot({
      path: path.join(screenshotsDir, "library-empty-state-success.png")
    })
  })
})
