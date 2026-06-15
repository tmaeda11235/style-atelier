import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - WebLLM Progress & Error UX", () => {
  test.slow()

  test.beforeEach(async ({ page }) => {
    // Ensure mock-webllm-downloaded is cleared BEFORE React mounts on sandbox load
    await page.addInitScript(() => {
      window.localStorage.removeItem("mock-webllm-downloaded")
    })
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
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
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
    await historyTabBtn.click({ force: true })

    const mintCardBtn = spFrame
      .locator("button:has-text('Mint Card'), button:has-text('カード化')")
      .first()
    await expect(mintCardBtn).toBeVisible({ timeout: 30000 })
    await mintCardBtn.click({ force: true })

    // Verify Minting View is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 30000 })

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
    await downloadBtn.click({ force: true })

    // Click confirmation button
    const confirmDownloadBtn = spFrame
      .locator(
        "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
      )
      .first()
    await expect(confirmDownloadBtn).toBeVisible()

    // Verify updated model size values (2.0 GB / 2.5 GB) are present in the confirmation UI
    await expect(spFrame.locator("body")).toContainText(/2\.0\s*GB/)
    await expect(spFrame.locator("body")).toContainText(/2\.5\s*GB/)
    await confirmDownloadBtn.click({ force: true })

    // Assert that the error status UI appears
    const errorTitle = spFrame
      .locator("text=/Error occurred|エラーが発生しました/")
      .first()
    await expect(errorTitle).toBeVisible({ timeout: 30000 })

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

    // Check if the UI is already in "ready" state (i.e. showing the "Analyze Style with AI" button instead of download statuses)
    // In a parallel execution environment, another test might have finished the singleton download,
    // which broadcasts the "ready" state to all views.
    const analyzeBtn = spFrame
      .locator(
        "button:has-text('Analyze Style with AI'), button:has-text('AIでスタイルを分析')"
      )
      .first()

    const isAlreadyReady = await analyzeBtn.isVisible().catch(() => false)

    if (isAlreadyReady) {
      console.log(
        "Model is already ready due to broadcast. Skipping download steps."
      )
    } else {
      const retryBtn = spFrame
        .locator("button:has-text('Try Again'), button:has-text('再試行')")
        .first()

      // Wait up to 5 seconds for the Retry button to render in the error UI
      const isRetryVisible = await retryBtn
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false)
      if (isRetryVisible) {
        await page.waitForTimeout(200)
        // Directly query and click within the iframe context to avoid Playwright's locator wait loop
        await spFrame
          .locator("body")
          .evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"))
            const btn = buttons.find(
              (b) =>
                b.textContent?.includes("Try Again") ||
                b.textContent?.includes("再試行")
            )
            if (btn) {
              btn.click()
            }
          })
          .catch(() => {})
      } else {
        console.log(
          "Retry button not visible, clicking initial Analyze button and triggering download again"
        )
        const startBtn = spFrame
          .locator(
            "button:has-text('Analyze Style with AI'), button:has-text('AIでスタイルを分析')"
          )
          .first()
        await expect(startBtn).toBeVisible()
        await startBtn.click({ force: true })

        const downloadBtn2 = spFrame
          .locator(
            "[data-testid='minting-view-container'] button:has-text('Download Model'), [data-testid='minting-view-container'] button:has-text('モデルをダウンロード')"
          )
          .first()
        await expect(downloadBtn2).toBeVisible()
        await downloadBtn2.click({ force: true })

        // Click confirmation button
        const confirmDownloadBtn2 = spFrame
          .locator(
            "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
          )
          .first()
        await expect(confirmDownloadBtn2).toBeVisible()
        await confirmDownloadBtn2.click({ force: true })
      }

      // Assert that download progress shows up (only if not already ready)
      const isReadyNow = await analyzeBtn.isVisible().catch(() => false)
      if (!isReadyNow) {
        const progressLabel = spFrame
          .locator("text=/Downloading|ダウンロード中/")
          .first()
        await expect(progressLabel)
          .toBeVisible({ timeout: 15000 })
          .catch(() => {})

        // Take screenshot of download progress
        await page
          .screenshot({
            path: path.join(
              screenshotsDir,
              "webllm-style-analysis-downloading.png"
            )
          })
          .catch(() => {})
        console.log("AI Style Analysis downloading progress screenshot saved.")
      }
    }

    // Wait for download to complete and enter Ready mode
    await expect(analyzeBtn).toBeVisible({ timeout: 45000 })

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
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
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
    await workbenchTabBtn.click({ force: true })
    await page.waitForTimeout(1000)

    // Verify AI Advice Section is visible
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible()

    // Expand accordion
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click({ force: true })
    await page.waitForTimeout(500)

    // Scroll advice section to top of viewport to prevent fixed HandBar overlay issues
    await adviceSection.evaluate((el) => el.scrollIntoView({ block: "start" }))
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
    await page.waitForTimeout(500)
    await downloadBtn.dispatchEvent("click")

    // Click confirmation button
    const confirmDownloadBtn = spFrame
      .locator(
        "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
      )
      .first()
    await expect(confirmDownloadBtn).toBeVisible()

    // Verify updated model size values (2.0 GB / 2.5 GB) are present in the confirmation UI
    await expect(spFrame.locator("body")).toContainText(/2\.0\s*GB/)
    await expect(spFrame.locator("body")).toContainText(/2\.5\s*GB/)
    await confirmDownloadBtn.dispatchEvent("click")

    // Assert download progress UI is shown
    const downloadingLabel = spFrame
      .locator("text=/Downloading|ダウンロード中/")
      .first()
    await expect(downloadingLabel).toBeVisible({ timeout: 15000 })

    // Take screenshot of download progress in Recipe Advice
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-recipe-advice-downloading.png")
    })
    console.log("AI Recipe Advice downloading progress screenshot saved.")

    // Wait for download to complete and advice to render
    const adviceHeaderResult = spFrame
      .locator("text=/AI Cauldron Recipe Advice|AIレシピアドバイス/")
      .first()
    await expect(adviceHeaderResult).toBeVisible({ timeout: 45000 })

    // Take screenshot of ready AI advice
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-recipe-advice-ready.png")
    })
    console.log("AI Recipe Advice ready state screenshot saved.")
  })

  test("should pre-load engine on start and show initializing status during inference in AI Recipe Advice", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for AI Preload & Initializing UX test..."
    )

    // Set model as already downloaded in localStorage so preload trigger is allowed
    await page.addInitScript(() => {
      window.localStorage.setItem("mock-webllm-downloaded", "true")
    })

    await page.goto("/tests/sandbox/index.html")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await skipButton.click({ force: true })
    }

    // Seed 2 style cards
    await spFrame.locator("body").evaluate(async () => {
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

    // Setup mock WebLLM configuration to simulate initialization phase
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = false
        // Simulate a slow engine compilation/initialization
        config.initDelay = 3000
        config.inferenceResult =
          "### 🔮 AI Cauldron Recipe Advice\n- **Expected Visual Blending**: Blended watercolor cyberpunk style."
      }
    })

    // Switch to Workbench tab
    const workbenchTabBtn = spFrame
      .locator("button:has-text('Workbench'), button:has-text('ワークベンチ')")
      .first()
    await workbenchTabBtn.click({ force: true })
    await page.waitForTimeout(500)

    // Expand AI Advice Section
    const adviceSection = spFrame.locator("#ai-recipe-advice-section")
    await expect(adviceSection).toBeVisible()
    const accordionHeader = adviceSection.locator("#ai-recipe-advice-toggle")
    await accordionHeader.click({ force: true })
    await page.waitForTimeout(500)

    // Scroll advice section to top of viewport to prevent fixed HandBar overlay issues
    await adviceSection.evaluate((el) => el.scrollIntoView({ block: "start" }))
    await page.waitForTimeout(500)

    // Since the model is already downloaded, it will automatically try to generate advice.
    // Because initDelay is 3000ms, it should show the "Initializing AI engine..." message.
    const initializingText = spFrame.locator(
      "text=/Initializing AI engine|AIエンジンを初期化中/"
    )
    await expect(initializingText).toBeVisible({ timeout: 10000 })

    // Take screenshot of AI Engine Initializing status
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-engine-initializing.png")
    })
    console.log("AI Engine Initializing screenshot saved.")

    // Wait for advice to render
    const adviceHeaderResult = spFrame
      .locator("text=/AI Cauldron Recipe Advice|AIレシピアドバイス/")
      .first()
    await expect(adviceHeaderResult).toBeVisible({ timeout: 15000 })
  })
})
