import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - WebLLM Progress & Error UX", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should handle download error and successful recovery via Try Again in AI Style Analysis", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for AI Style Analysis UX test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 1. Seed history item
    await spFrame.locator("body").evaluate(async () => {
      localStorage.removeItem("mock-webllm-downloaded")
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-progress-test",
        fullCommand:
          "a beautiful cyberpunk warrior --ar 16:9 --sref https://example.com/sref1 --p p-code",
        imageUrl: "/tests/fixtures/midjourney/index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })
    })

    // Navigate to History tab and click Mint Card
    const historyTabBtn = spFrame
      .locator("button:has-text('History'), button:has-text('履歴')")
      .first()
    await expect(historyTabBtn).toBeVisible()
    await historyTabBtn.click()

    const mintCardBtn = spFrame
      .locator("button:has-text('Mint Card'), button:has-text('カード化')")
      .first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // Verify Minting View is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // Force download failure mock on current window instance
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = true
        config.downloadSpeed = 800
      }
    })

    // Click Download Model button to trigger download
    const downloadBtn = spFrame
      .locator(
        "[data-testid='minting-view-container'] button:has-text('Download Model'), [data-testid='minting-view-container'] button:has-text('モデルをダウンロード')"
      )
      .first()
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Assert that the error status UI appears
    const errorTitle = spFrame
      .locator("text=/Error occurred|エラーが発生しました/")
      .first()
    await expect(errorTitle).toBeVisible({ timeout: 10000 })

    // Take screenshot of download error state
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-style-analysis-error.png")
    })
    console.log("AI Style Analysis error state screenshot saved.")

    // 2. Fix the config to succeed and click Try Again
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = false
      }
    })

    const retryBtn = spFrame
      .locator("button:has-text('Try Again'), button:has-text('再試行')")
      .first()
    await expect(retryBtn).toBeVisible()
    await retryBtn.click()

    // Assert that download progress shows up
    const progressLabel = spFrame
      .locator("text=/Downloading|ダウンロード中/")
      .first()
    await expect(progressLabel).toBeVisible({ timeout: 5000 })

    // Take screenshot of download progress
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-style-analysis-downloading.png")
    })
    console.log("AI Style Analysis downloading progress screenshot saved.")

    // Wait for download to complete and enter Ready mode
    const analyzeBtn = spFrame
      .locator(
        "button:has-text('Analyze Style with AI'), button:has-text('AIでスタイルを分析')"
      )
      .first()
    await expect(analyzeBtn).toBeVisible({ timeout: 15000 })

    // Take screenshot of ready / generated state
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-style-analysis-ready.png")
    })
    console.log("AI Style Analysis ready state screenshot saved.")
  })

  test("should display download progress and complete successfully in AI Recipe Advice", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for AI Recipe Advice UX test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Clear db and seed 2 cards
    await spFrame.locator("body").evaluate(async () => {
      localStorage.removeItem("mock-webllm-downloaded")
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-p1",
          name: "Cyberpunk Glow",
          promptSegments: [{ type: "text", value: "neon cyberpunk city" }],
          parameters: {},
          masking: {},
          tier: "Common",
          isPinned: true,
          dominantColor: "#3b82f6",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        },
        {
          id: "card-p2",
          name: "Watercolor Rain",
          promptSegments: [
            { type: "text", value: "rainy street, watercolor style" }
          ],
          parameters: {},
          masking: {},
          tier: "Rare",
          isPinned: true,
          dominantColor: "#ec4899",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>"
        }
      ])
    })

    // Switch to Workbench tab
    const workbenchTabBtn = spFrame
      .locator("button:has-text('Workbench'), button:has-text('ワークベンチ')")
      .first()
    await workbenchTabBtn.click()
    await page.waitForTimeout(1000)

    // Verify AI Advice Section is visible
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible()

    // Expand accordion
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click()
    await page.waitForTimeout(500)

    // Verify not loaded status
    const notReadyText = spFrame.locator(
      "text=/Local AI model is not loaded|ローカルAIモデルがロードされていません/"
    )
    await expect(notReadyText).toBeVisible()

    // Setup slow download mock
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = false
        config.downloadSpeed = 800
        config.inferenceResult =
          "### 🔮 AI Cauldron Recipe Advice\n- **Expected Visual Blending**: Neon cyberpunk watercolor style."
      }
    })

    // Click Download Model button inside Recipe Advice
    const downloadBtn = adviceSection.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Assert download progress UI is shown
    const downloadingLabel = spFrame
      .locator("text=/Downloading|ダウンロード中/")
      .first()
    await expect(downloadingLabel).toBeVisible({ timeout: 5000 })

    // Take screenshot of download progress in Recipe Advice
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-recipe-advice-downloading.png")
    })
    console.log("AI Recipe Advice downloading progress screenshot saved.")

    // Wait for download to complete and advice to render
    const adviceHeaderResult = spFrame
      .locator("text=/AI Cauldron Recipe Advice|AIレシピアドバイス/")
      .first()
    await expect(adviceHeaderResult).toBeVisible({ timeout: 15000 })

    // Take screenshot of ready AI advice
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-recipe-advice-ready.png")
    })
    console.log("AI Recipe Advice ready state screenshot saved.")
  })
})
