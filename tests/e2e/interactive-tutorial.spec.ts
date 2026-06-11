import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Interactive Tutorial @J-TUTORIAL-01", () => {
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

  test("should complete the entire onboarding tutorial flow step-by-step", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log(
      "Navigating to sandbox page for Interactive Tutorial E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if it appears
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Click Guide button in header to trigger tutorial
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await expect(guideBtn).toBeVisible()
    await guideBtn.click()
    const tutorialContainer = spFrame.locator(
      "[data-testid='interactive-tutorial']"
    )
    await expect(tutorialContainer).toBeVisible()
    await expect(spFrame.locator("text=Step 1 / 8")).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-lang-en.png")
    })

    // Click "Add Sample and Proceed" or "Next"
    const sampleBtn = spFrame.locator(
      "button:has-text('サンプルを追加して進む'), button:has-text('Add Sample and Proceed')"
    )
    if (await sampleBtn.isVisible()) {
      await sampleBtn.click()
    } else {
      const nextBtn = spFrame.locator(
        "[data-testid='interactive-tutorial'] button:has-text('次へ'), [data-testid='interactive-tutorial'] button:has-text('Next')"
      )
      await nextBtn.click()
    }
    await expect(spFrame.locator("text=Step 2 / 8")).toBeVisible()
    const nextBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('次へ'), [data-testid='interactive-tutorial'] button:has-text('Next')"
    )
    await nextBtn.click()
    await expect(spFrame.locator("text=Step 3 / 8")).toBeVisible()
    await nextBtn.click()
    await expect(spFrame.locator("text=Step 4 / 8")).toBeVisible()
    await nextBtn.click()
    await expect(spFrame.locator("text=Step 5 / 8")).toBeVisible()
    await nextBtn.click()
    await expect(spFrame.locator("text=Step 6 / 8")).toBeVisible()
    await nextBtn.click()
    await expect(spFrame.locator("text=Step 7 / 8")).toBeVisible()
    await nextBtn.click()
    await expect(spFrame.locator("text=Step 8 / 8")).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-step-8.png")
    })

    // Click "Done" (or "完了" or "終了")
    const doneBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('完了'), [data-testid='interactive-tutorial'] button:has-text('Done')"
    )
    await doneBtn.click()
    await expect(tutorialContainer).not.toBeVisible()
    console.log(
      "Interactive Onboarding Tutorial E2E test completed successfully!"
    )
  })

  test("should auto-advance step 3 when user edits custom name or selects keyword", async ({
    page
  }) => {
    console.log(
      "Navigating to sandbox page for Tutorial Auto-Advance E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Click Guide button in header to trigger tutorial
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await expect(guideBtn).toBeVisible()
    await guideBtn.click()
    const sampleBtn = spFrame.locator(
      "button:has-text('サンプルを追加して進む'), button:has-text('Add Sample and Proceed')"
    )
    await sampleBtn.click()

    // Wait for tutorial to advance to Step 2
    await expect(spFrame.locator("text=Step 2 / 8")).toBeVisible({
      timeout: 5000
    })

    // Wait for the first history item to appear
    const mintCardBlock = spFrame.locator("[data-tutorial='mint-button']")
    await expect(mintCardBlock).toBeVisible({ timeout: 10000 })

    // Step 2: Mint card (Clicking Mint button inside the first history card)
    const mintBtn = mintCardBlock.locator("button")
    await expect(mintBtn).toBeVisible()
    await mintBtn.click()
    await expect(spFrame.locator("text=Step 3 / 8")).toBeVisible()

    // Focus input and type a custom card name
    const nameInput = spFrame.locator("[data-tutorial='title-input'] input")
    await nameInput.fill("E2E Auto Advance Test Card")
    await expect(spFrame.locator("text=Step 4 / 8")).toBeVisible()
    console.log("Tutorial auto-advanced to Step 4 after typing custom name!")
  })

  test("should auto-skip step 5 when rarity feature is disabled in expert settings", async ({
    page
  }) => {
    console.log("Navigating to sandbox page for Tutorial Skip E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings and disable Rarity feature
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await settingsNavBtn.click()

    const rarityToggle = spFrame.locator("#expert-feature-rarity-btn")
    await rarityToggle.click()
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await guideBtn.click()
    const sampleBtn = spFrame.locator(
      "button:has-text('サンプルを追加して進む'), button:has-text('Add Sample and Proceed')"
    )
    await sampleBtn.click()

    // Wait for tutorial to advance to Step 2
    await expect(spFrame.locator("text=Step 2 / 8")).toBeVisible({
      timeout: 5000
    })

    // Wait for the first history item to appear
    const mintCardBlock = spFrame.locator("[data-tutorial='mint-button']")
    await expect(mintCardBlock).toBeVisible({ timeout: 10000 })

    // Step 2: Mint
    const mintBtn = mintCardBlock.locator("button")
    await expect(mintBtn).toBeVisible()
    await mintBtn.click()
    const nameInput = spFrame.locator("[data-tutorial='title-input'] input")
    await nameInput.fill("Skip Test Card")
    await expect(spFrame.locator("text=Step 4 / 8")).toBeVisible()

    // Click next to advance from Step 4
    const nextBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('次へ'), [data-testid='interactive-tutorial'] button:has-text('Next')"
    )
    await nextBtn.click()
    // So it should advance directly to Step 6 / 8 (Save card to library).
    await expect(spFrame.locator("text=Step 6 / 8")).toBeVisible()
    console.log(
      "Tutorial successfully skipped Step 5 due to disabled Rarity feature!"
    )
  })

  test("should display localized step count in Japanese when language is switched", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log(
      "Navigating to sandbox page for Japanese Interactive Tutorial E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if it appears
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings and Switch to Japanese (ja)
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("ja")
    const guideBtn = spFrame.locator("button[title='ガイドを表示']")
    await expect(guideBtn).toBeVisible()
    await guideBtn.click()
    const tutorialContainer = spFrame.locator(
      "[data-testid='interactive-tutorial']"
    )
    await expect(tutorialContainer).toBeVisible()
    await expect(spFrame.locator("text=ステップ 1 / 8")).toBeVisible()

    // Take screenshot of Japanese tutorial step 1
    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-lang-ja.png")
    })
    console.log("Japanese tutorial step 1 screenshot saved.")

    // 5. Close the tutorial
    const closeBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button[aria-label='Close tutorial']"
    )
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await expect(tutorialContainer).not.toBeVisible()
  })
})
