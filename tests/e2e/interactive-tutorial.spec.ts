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
    await page.waitForTimeout(500)

    // 3. Verify step 1 and take screenshot
    const tutorialContainer = spFrame.locator(
      "[data-testid='interactive-tutorial']"
    )
    await expect(tutorialContainer).toBeVisible()
    await expect(spFrame.locator("text=Step 1 / 8")).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-step-1.png")
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
    await page.waitForTimeout(500)

    // Step 2
    await expect(spFrame.locator("text=Step 2 / 8")).toBeVisible()
    const nextBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('次へ'), [data-testid='interactive-tutorial'] button:has-text('Next')"
    )
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Step 3
    await expect(spFrame.locator("text=Step 3 / 8")).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Step 4
    await expect(spFrame.locator("text=Step 4 / 8")).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Step 5
    await expect(spFrame.locator("text=Step 5 / 8")).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Step 6
    await expect(spFrame.locator("text=Step 6 / 8")).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Step 7
    await expect(spFrame.locator("text=Step 7 / 8")).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Step 8
    await expect(spFrame.locator("text=Step 8 / 8")).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-step-8.png")
    })

    // Click "Done" (or "完了" or "終了")
    const doneBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('完了'), [data-testid='interactive-tutorial'] button:has-text('Done')"
    )
    await doneBtn.click()
    await page.waitForTimeout(500)

    // 4. Verify InteractiveTutorial is closed
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
    await page.waitForTimeout(500)

    // Step 1: Add sample and proceed
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
    await page.waitForTimeout(500)

    // Step 3: Title input (We are on MintingView or SimpleMintingView)
    await expect(spFrame.locator("text=Step 3 / 8")).toBeVisible()

    // Focus input and type a custom card name
    const nameInput = spFrame.locator("[data-tutorial='title-input'] input")
    await nameInput.fill("E2E Auto Advance Test Card")
    await page.waitForTimeout(500)

    // Check if tutorial automatically advanced to Step 4
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
    await page.waitForTimeout(500)

    const rarityToggle = spFrame.locator("#expert-feature-rarity-btn")
    await rarityToggle.click()
    await page.waitForTimeout(300)

    // 3. Click Guide button to start tutorial
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await guideBtn.click()
    await page.waitForTimeout(500)

    // Step 1: Proceed
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
    await page.waitForTimeout(500)

    // Step 3: Title Input
    const nameInput = spFrame.locator("[data-tutorial='title-input'] input")
    await nameInput.fill("Skip Test Card")
    await page.waitForTimeout(500)

    // Now we are at Step 4: Slot Variables
    await expect(spFrame.locator("text=Step 4 / 8")).toBeVisible()

    // Click next to advance from Step 4
    const nextBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('次へ'), [data-testid='interactive-tutorial'] button:has-text('Next')"
    )
    await nextBtn.click()
    await page.waitForTimeout(500)

    // Since Rarity is disabled, Step 5 (Rarity choice) should be automatically skipped!
    // So it should advance directly to Step 6 / 8 (Save card to library).
    await expect(spFrame.locator("text=Step 6 / 8")).toBeVisible()
    console.log(
      "Tutorial successfully skipped Step 5 due to disabled Rarity feature!"
    )
  })
})
