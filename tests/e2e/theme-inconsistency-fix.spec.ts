import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Theme Inconsistency Fix @J-THEME-FIX-01", () => {
  test("should apply correct dark mode classes and render beautifully in dark mode for AI style analysis section and share card modal", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed history item
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db

      // Seed history for Minting/AI analysis test
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-theme-test",
        fullCommand:
          "a beautiful cyberpunk warrior --ar 16:9 --sref https://example.com/sref1 --p p-code",
        imageUrl: "/tests/fixtures/midjourney/index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })
    })

    // 3. Switch to History tab and open Mint view
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    const mintCardBtn = spFrame.locator("button:has-text('Mint Card')").first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // 4. Verify Minting View and AI Section are visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    const aiSectionTitle = spFrame.locator("h3:has-text('AI Style Analysis')")
    await expect(aiSectionTitle).toBeVisible()

    // Check light mode background class for AI Section container (parent of h3 title)
    const aiSectionContainer = aiSectionTitle.locator("..")
    const aiClassName = await aiSectionContainer.getAttribute("class")
    expect(aiClassName).toContain("bg-white")
    expect(aiClassName).toContain("dark:bg-slate-900")

    // Take screenshot of AI Style Analysis (download model state) in Light Mode
    console.log("Saving light mode AI analysis section screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-style-analysis-download-light.png")
    })

    // Switch to Dark Mode
    console.log("Switching to Dark Mode...")
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.add("dark")
    })
    await page.waitForTimeout(300)

    // Take screenshot of AI Style Analysis (download model state) in Dark Mode
    console.log("Saving dark mode AI analysis section screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-style-analysis-download-dark.png")
    })

    // Mock WebLLM downloaded/integrityPassed to true to make model "ready" and set inference result JSON
    await spFrame.locator("body").evaluate(async () => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.integrityPassed = true
        config.inferenceResult = JSON.stringify({
          genre: "Cyberpunk Portrait",
          tags: ["neon", "retro", "glowing"],
          summary: "A neon-lit futuristic cyber warrior with retro aesthetics."
        })
      }
      localStorage.setItem("mock-webllm-downloaded", "true")
    })

    // Click "Download Model" to trigger transition to ready state
    const downloadBtn = spFrame.getByRole("button", {
      name: "Download Model",
      exact: true
    })
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Click inline "Start Download" button in the confirm view
    const startDownloadBtn = spFrame.locator(
      "button:has-text('Start Download'), button:has-text('ダウンロードを開始する')"
    )
    await expect(startDownloadBtn).toBeVisible()
    await startDownloadBtn.click()

    // Click "Analyze Style with AI"
    const analyzeBtn = spFrame.locator(
      "button:has-text('Analyze Style with AI'), button:has-text('AIでスタイルを分析')"
    )
    await expect(analyzeBtn).toBeVisible({ timeout: 5000 })
    await analyzeBtn.click()

    // Verify results
    const genreText = spFrame.locator("text=/Cyberpunk Portrait/i")
    await expect(genreText).toBeVisible({ timeout: 10000 })

    // Take screenshot of ready state (analysis results shown) in Dark Mode
    console.log("Saving dark mode AI analysis section ready screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-style-analysis-ready-dark.png")
    })

    // Switch back to Light Mode
    console.log("Switching back to Light Mode...")
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.remove("dark")
    })
    await page.waitForTimeout(300)

    // Take screenshot of ready state (analysis results shown) in Light Mode
    console.log("Saving light mode AI analysis section ready screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-style-analysis-ready-light.png")
    })

    // Cancel/Close Minting view using robust data-tutorial selector
    const cancelBtn = spFrame
      .locator("[data-tutorial='mint-save-footer']")
      .locator("button")
      .first()
    await cancelBtn.click()
    await expect(mintingView).not.toBeVisible()

    // 5. Navigate to Library tab to open ShareCardModal
    const libraryTabBtn = spFrame.locator("button:has-text('Library')")
    await libraryTabBtn.click()
    await page.waitForTimeout(500)

    // Seed style card dynamically after switching to Library
    console.log("Seeding style card for Share modal test...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "theme-fix-test-card",
          name: "Theme Fix Test Card",
          promptSegments: [
            { type: "text", value: "cyberpunk city neon lights" }
          ],
          parameters: {
            sref: ["123456"]
          },
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Legendary",
          isPinned: true,
          dominantColor: "#ff007f",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ff007f'/></svg>",
          usageCount: 1
        }
      ])
    })

    // Wait for the card to render and display its edit button
    const editCardBtn = spFrame
      .locator("[data-testid='edit-card-button']")
      .first()
    await expect(editCardBtn).toBeVisible({ timeout: 10000 })

    const shareBtn = spFrame
      .locator("[data-testid='share-card-button']")
      .first()
    await expect(shareBtn).toBeVisible()
    await shareBtn.click()

    // Now, ShareCardModal should be open
    const shareModalOverlay = spFrame.locator(
      "[data-testid='share-card-modal-overlay']"
    )
    await expect(shareModalOverlay).toBeVisible()

    // Verify it contains dark mode background classes
    const drawerContainer = shareModalOverlay.locator("div").first()
    const drawerClassName = await drawerContainer.getAttribute("class")
    expect(drawerClassName).toContain("bg-surface")

    // Take light mode screenshot of the ShareCardModal
    console.log("Saving light mode share card modal screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "share-card-modal-light.png")
    })

    // Switch to Dark Mode in ShareModal
    console.log("Switching to Dark Mode for Share Modal...")
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.add("dark")
    })
    await page.waitForTimeout(300)

    // Take dark mode screenshot of the ShareCardModal
    console.log("Saving dark mode share card modal screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "share-card-modal-dark.png")
    })

    // Clean up theme state
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.remove("dark")
    })
    await page.waitForTimeout(100)

    // Close modal
    const closeBtn = shareModalOverlay.locator("button").first()
    await closeBtn.click()
    await expect(shareModalOverlay).not.toBeVisible()
  })
})
