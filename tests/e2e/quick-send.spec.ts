import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - Quick Send to Workbench @J-ORG-QUICK-SEND-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should send card to workbench via thumbnail quick action and switch tab", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Quick Send via Thumbnail test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 1 unpinned style card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "card-quick-thumbnail",
        name: "Quick Card A",
        promptSegments: [{ type: "text", value: "vintage portrait" }],
        parameters: { sref: ["https://example.com/sref-quick"] },
        masking: {},
        tier: "Common",
        isPinned: false,
        dominantColor: "#10b981",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%2310b981'/></svg>"
      })
    })

    // 3. Switch to Library tab if not already there
    const libraryTabButton = spFrame
      .locator("button:has-text('Library')")
      .first()
    await libraryTabButton.click()
    const cardItem = spFrame.locator("div:has-text('Quick Card A')").last()
    await expect(cardItem).toBeVisible({ timeout: 10000 })
    await cardItem.hover()

    // 5. Click the Quick Send (Beaker) button on the thumbnail
    const quickSendBtn = spFrame
      .locator("[data-testid='quick-send-button']")
      .first()
    await expect(quickSendBtn).toBeVisible()
    await quickSendBtn.click()

    // 6. Verify automatic transition to Workbench tab (check active state border color)
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toHaveClass(/border-blue-500/, {
      timeout: 5000
    })

    // 7. Verify the card is visible in the HandBar
    const handbarCard = spFrame.locator("#handbar-root img[alt='Quick Card A']")
    await expect(handbarCard).toBeVisible({ timeout: 5000 })

    // Take screenshot for UX verification
    await page.screenshot({
      path: path.join(screenshotsDir, "quick-send-thumbnail-success.png")
    })
  })

  test("should send card to workbench via detail view and switch tab", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Quick Send via Detail View test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 1 unpinned style card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "card-quick-detail",
        name: "Quick Card B",
        promptSegments: [{ type: "text", value: "futuristic city" }],
        parameters: {},
        masking: {},
        tier: "Rare",
        isPinned: false,
        dominantColor: "#f59e0b",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23f59e0b'/></svg>"
      })
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame
      .locator("button:has-text('Library')")
      .first()
    await libraryTabButton.click()
    const cardItem = spFrame.locator("div:has-text('Quick Card B')").last()
    await expect(cardItem).toBeVisible({ timeout: 10000 })
    await cardItem.hover()

    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // 5. Verify Detail view is open
    const detailContainer = spFrame.locator(
      "[data-testid='card-detail-view-container']"
    )
    await expect(detailContainer).toBeVisible({ timeout: 5000 })

    // 6. Click the Send to Workbench (Beaker) button in the detail view
    const detailQuickSendBtn = spFrame.locator(
      "[data-testid='detail-quick-send-button']"
    )
    await expect(detailQuickSendBtn).toBeVisible()
    await detailQuickSendBtn.click()

    // 7. Verify automatic transition to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await expect(workbenchTabButton).toHaveClass(/border-blue-500/, {
      timeout: 5000
    })

    // 8. Verify the card is visible in the HandBar
    const handbarCard = spFrame.locator("#handbar-root img[alt='Quick Card B']")
    await expect(handbarCard).toBeVisible({ timeout: 5000 })

    // Take screenshot for UX verification
    await page.screenshot({
      path: path.join(screenshotsDir, "quick-send-detail-success.png")
    })
  })

  test("should send card to workbench via narrow viewport more menu and switch tab", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Quick Send via narrow viewport test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed 1 unpinned style card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.add({
        id: "card-quick-narrow",
        name: "Quick Card C",
        promptSegments: [{ type: "text", value: "cyberpunk landscape" }],
        parameters: {},
        masking: {},
        tier: "Epic",
        isPinned: false,
        dominantColor: "#8b5cf6",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%238b5cf6'/></svg>"
      })
    })

    // 3. Switch to Library tab
    const libraryTabButton = spFrame
      .locator("button:has-text('Library')")
      .first()
    await libraryTabButton.click()

    // 4. Change viewport width to narrow (320px) and hide midjourney-frame/sandbox-controls to prevent squishing and overlap
    await page.evaluate(() => {
      const mjFrame = document.getElementById("midjourney-frame")
      if (mjFrame) mjFrame.style.display = "none"
      const controls = document.querySelector(".sandbox-controls")
      if (controls) (controls as HTMLElement).style.display = "none"
      const spFrame = document.getElementById("sidepanel-frame")
      if (spFrame) spFrame.style.width = "100%"
    })
    await page.setViewportSize({ width: 320, height: 600 })
    await page.waitForTimeout(500)

    const cardItem = spFrame.locator("div:has-text('Quick Card C')").last()
    await expect(cardItem).toBeVisible({ timeout: 10000 })
    await cardItem.hover({ force: true })

    // 5. Verify direct quick-send button is hidden
    const quickSendBtn = spFrame.locator("[data-testid='quick-send-button']")
    await expect(quickSendBtn).not.toBeVisible()

    // 6. Click the More (ellipsis) button
    const moreBtn = spFrame
      .locator("[data-testid='more-actions-button']")
      .first()
    await expect(moreBtn).toBeVisible()
    await moreBtn.click({ force: true })
    await page.waitForTimeout(250)

    // 7. Click the Quick Send button in the More menu
    const moreQuickSendBtn = spFrame.locator(
      "[data-testid='more-quick-send-button']"
    )
    await expect(moreQuickSendBtn).toBeVisible()
    await moreQuickSendBtn.click({ force: true })

    // 8. Verify automatic transition to Workbench tab
    const workbenchTabButton = spFrame.locator(
      "[data-tutorial='workbench-tab']"
    )
    await expect(workbenchTabButton).toHaveClass(/border-blue-500/, {
      timeout: 5000
    })

    // 9. Verify the card is visible in the HandBar
    const handbarCard = spFrame.locator("#handbar-root img[alt='Quick Card C']")
    await expect(handbarCard).toBeVisible({ timeout: 5000 })

    // Take screenshot for UX verification
    await page.screenshot({
      path: path.join(screenshotsDir, "quick-send-narrow-success.png")
    })

    // Reset viewport size and frame styles
    await page.evaluate(() => {
      const mjFrame = document.getElementById("midjourney-frame")
      if (mjFrame) mjFrame.style.display = ""
      const spFrame = document.getElementById("sidepanel-frame")
      if (spFrame) spFrame.style.width = ""
    })
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})
