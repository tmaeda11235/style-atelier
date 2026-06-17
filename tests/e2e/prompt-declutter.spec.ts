import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - AI Prompt De-cluttering", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should download model and de-clutter a messy prompt using local AI (@J-AI-DECLUTTER-01)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.addInitScript(() => {
      localStorage.setItem("mock-webllm-downloaded", "true")
    })

    console.log(
      "Navigating to sandbox page for AI Prompt De-cluttering E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a history item with a messy prompt
    await spFrame.locator("body").evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        if ((window as any).sandboxSeedFinished && (window as any).db) break
        await new Promise((r) => setTimeout(r, 50))
      }
      const database = (window as any).db
      if (!database) throw new Error("Database not initialized")

      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-to-declutter",
        fullCommand: "cyberpunk warrior neon glow 35mm lens --ar 16:9",
        imageUrl: "/tests/fixtures/midjourney/index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })

      // Seed inference output
      if ((window as any).mockWebLlmConfig) {
        ;(window as any).mockWebLlmConfig.inferenceResult = JSON.stringify({
          segments: ["cyberpunk warrior", "neon glow", "35mm lens"]
        })
      }
    })

    // 3. Switch to History tab
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    // 4. Click "Mint Card" button
    const mintCardBtn = spFrame.locator("button:has-text('Mint Card')").first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // 5. Verify minting view container is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // 6. Verify "AI Prompt Organizer" heading is visible
    const organizerHeading = spFrame.locator(
      "span:has-text('AI Prompt Organizer')"
    )
    await expect(organizerHeading).toBeVisible()

    // 7. Click "De-clutter with AI" button
    const declutterBtn = spFrame.locator(
      "button:has-text('De-clutter with AI'), button:has-text('AIで整理')"
    )
    await expect(declutterBtn).toBeVisible()
    await declutterBtn.click()

    // 8. Verify the bubbles updated to the de-cluttered ones
    const bubble1 = spFrame
      .locator("span:has-text('cyberpunk warrior')")
      .first()
    const bubble2 = spFrame.locator("span:has-text('neon glow')").first()
    const bubble3 = spFrame.locator("span:has-text('35mm lens')").first()

    await expect(bubble1).toBeVisible({ timeout: 5000 })
    await expect(bubble2).toBeVisible({ timeout: 5000 })
    await expect(bubble3).toBeVisible({ timeout: 5000 })

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "prompt-declutter-success.png")
    })
    console.log("AI Prompt De-cluttering success screenshot saved.")
  })

  test("should organize messy prompt using fallback organizer when model is not ready (@J-AI-DECLUTTER-02)", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for AI Prompt Organizer Fallback E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a history item with a messy prompt
    await spFrame.locator("body").evaluate(async () => {
      // ClearDownloaded model state to force fallback
      localStorage.removeItem("mock-webllm-downloaded")

      for (let i = 0; i < 100; i++) {
        if ((window as any).sandboxSeedFinished && (window as any).db) break
        await new Promise((r) => setTimeout(r, 50))
      }
      const database = (window as any).db
      if (!database) throw new Error("Database not initialized")

      await database.historyItems.clear()
      await database.historyItems.add({
        id: "mock-history-item-to-declutter-fallback",
        fullCommand: "cyberpunk warrior, neon glow, 35mm lens --ar 16:9",
        imageUrl: "/tests/fixtures/midjourney/index_files/0_0_640_N.webp",
        timestamp: Date.now()
      })
    })

    // 3. Switch to History tab
    const historyTabButton = spFrame.locator("button:has-text('History')")
    await expect(historyTabButton).toBeVisible()
    await historyTabButton.click()

    // 4. Click "Mint Card" button
    const mintCardBtn = spFrame.locator("button:has-text('Mint Card')").first()
    await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
    await mintCardBtn.click()

    // 5. Verify minting view container is visible
    const mintingView = spFrame.locator(
      "[data-testid='minting-view-container']"
    )
    await expect(mintingView).toBeVisible({ timeout: 10000 })

    // 6. Verify "AI Prompt Organizer" heading is visible
    const organizerHeading = spFrame.locator(
      "span:has-text('AI Prompt Organizer')"
    )
    await expect(organizerHeading).toBeVisible()

    // 7. Verify status badge displays fallback mode
    const statusBadge = spFrame.locator(
      "text=/AI Fallback|AI軽量フォールバック|Light Mode|軽量モード|軽量フォールバック/"
    )
    await expect(statusBadge).toBeVisible({ timeout: 15000 })

    // 8. Click "Organize (Fallback)" button
    const declutterBtn = spFrame.locator(
      "button:has-text('Organize (Fallback)'), button:has-text('整理 (フォールバック)'), button:has-text('Organize'), button:has-text('整理')"
    )
    await expect(declutterBtn).toBeVisible()
    await declutterBtn.click()

    // 9. Verify the bubbles updated using regex splitting
    const bubble1 = spFrame
      .locator("span:has-text('cyberpunk warrior')")
      .first()
    const bubble2 = spFrame.locator("span:has-text('neon glow')").first()
    const bubble3 = spFrame.locator("span:has-text('35mm lens')").first()

    await expect(bubble1).toBeVisible({ timeout: 5000 })
    await expect(bubble2).toBeVisible({ timeout: 5000 })
    await expect(bubble3).toBeVisible({ timeout: 5000 })

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "prompt-declutter-fallback-success.png")
    })
    console.log("AI Prompt Organizer Fallback success screenshot saved.")
  })
})
