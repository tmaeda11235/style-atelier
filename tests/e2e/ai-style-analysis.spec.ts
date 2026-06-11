/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - AI Style Analysis @J-MINT-AI-ANALYSIS", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should download model, run inference, populate description and tags, and save mutation note", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for AI Style Analysis E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a history item
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-ai-analysis",
        fullCommand:
          "a beautiful cyberpunk warrior --ar 16:9 --sref https://example.com/sref1 --p p-code",
        imageUrl: "/tests/fixtures/midjourney/index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })
    })

    // 3. Switch to History tab and start minting
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

    // 5. Verify model-not-loaded state
    const notLoadedMsg = spFrame.locator(
      "text=/Download AI Model to Enable Recommendations/i"
    )
    await expect(notLoadedMsg).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "ai-style-analysis-download.png")
    })
    console.log("AI Style Analysis download state screenshot saved.")

    // 6. Mock WebLLM downloaded/integrityPassed to true to make model "ready" and set inference result JSON
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

    // 7. Click "Download Model" to trigger transition to ready state
    const downloadBtn = spFrame.locator("button:has-text('Download Model')")
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // 8. Click "Analyze Style with AI"
    const analyzeBtn = spFrame.locator(
      "button:has-text('Analyze Style with AI')"
    )
    await expect(analyzeBtn).toBeVisible({ timeout: 5000 })
    await analyzeBtn.click()

    // 9. Verify results
    const genreText = spFrame.locator("text=/Cyberpunk Portrait/i")
    await expect(genreText).toBeVisible({ timeout: 10000 })

    const tagNeon = spFrame.locator("button:has-text('neon')")
    await expect(tagNeon).toBeVisible()

    const summaryText = spFrame.locator(
      "text=/A neon-lit futuristic cyber warrior with retro aesthetics./i"
    )
    await expect(summaryText).toBeVisible()

    // 10. Click "Use as Card Note/Description"
    const useSummaryBtn = spFrame.locator(
      "button:has-text('Use as Card Note/Description')"
    )
    await expect(useSummaryBtn).toBeVisible()
    await useSummaryBtn.click()

    // Verify Custom Name input contains summary text
    const customNameInput = spFrame.locator(
      "input[placeholder='Add details...']"
    )
    await expect(customNameInput).toHaveValue(
      "A neon-lit futuristic cyber warrior with retro aesthetics."
    )

    // Toggle "neon" tag to select it
    await tagNeon.click()

    // Take screenshot of ready state with recommendations applied
    await page.screenshot({
      path: path.join(screenshotsDir, "ai-style-analysis-ready.png")
    })
    console.log("AI Style Analysis ready state screenshot saved.")

    // 11. Save the Card
    const saveCardBtn = spFrame.locator("button:has-text('Save Card')")
    await expect(saveCardBtn).toBeVisible()
    await saveCardBtn.click()

    // Verify Minting View closes
    await expect(mintingView).not.toBeVisible({ timeout: 10000 })

    // 12. Go to Library tab, verify the saved card's mutation note in Detail view
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()
    await page.waitForTimeout(1000)

    // Verify card is visible at the root level of Library tab
    const cardTitleLocator = spFrame
      .locator(
        "text=/A neon-lit futuristic cyber warrior with retro aesthetics./"
      )
      .first()
    await expect(cardTitleLocator).toBeVisible()

    // Click "Edit Card"
    const cardContainer = spFrame
      .locator(".group", {
        hasText: "A neon-lit futuristic cyber warrior with retro aesthetics."
      })
      .first()
    const editBtn = cardContainer.locator("[data-testid='edit-card-button']")
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Verify detail view is open
    const detailView = spFrame.locator(
      "[data-testid='card-detail-view-container']"
    )
    await expect(detailView).toBeVisible({ timeout: 5000 })

    // Verify mutation note text (the summary description) is displayed in genealogy/history
    const genealogyNote = detailView
      .locator(
        "text=/A neon-lit futuristic cyber warrior with retro aesthetics./i"
      )
      .first()
    await expect(genealogyNote).toBeVisible()

    // Close detail view
    const closeDetailBtn = detailView.locator("button").first()
    await closeDetailBtn.click()
  })
})
