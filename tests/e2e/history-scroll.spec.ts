/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - History Scroll @J-SYS-01", () => {
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

  test("should load history items reactively and load more items via infinite scroll", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page for infinite scroll test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // スキップ
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // E2Eテスト用のダミー履歴データを大量に挿入する (70件)
    console.log("Seeding 70 mock history items into IndexedDB...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) {
        throw new Error("Database instance not found on window")
      }
      await database.historyItems.clear()

      const mockItems = Array.from({ length: 70 }, (_, i) => ({
        id: `mock-history-${i}`,
        fullCommand: `Cyberpunk prompt number ${i} --ar 16:9`,
        imageUrl: `/tests/fixtures/midjourney/index_files/0_0_640_N.webp`,
        timestamp: Date.now() - i * 1000
      }))
      await database.historyItems.bulkAdd(mockItems)
    })

    // Historyタブへ切り替え
    console.log("Switching to History tab...")
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    // 初期状態で50件のみ表示されていることを確認
    console.log("Verifying initial 50 items are displayed...")
    const mintButtons = spFrame.locator("button:has-text('Mint Card')")
    await expect(mintButtons).toHaveCount(50, { timeout: 10000 })

    // 50番目のカードまでスクロールする
    console.log("Scrolling to the bottom...")
    const lastCard = mintButtons.nth(49)
    await lastCard.scrollIntoViewIfNeeded()

    // センチネルが作動して追加の20件がロードされ、合計70件になることを確認
    console.log("Verifying additional items loaded...")
    await expect(mintButtons).toHaveCount(70, { timeout: 10000 })

    // スクリーンショット保存
    await page.screenshot({
      path: path.join(screenshotsDir, "infinite-scroll-success.png")
    })
    console.log("Infinite scroll E2E test passed successfully!")
  })
})
