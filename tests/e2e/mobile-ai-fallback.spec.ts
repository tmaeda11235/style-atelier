import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Mobile PWA - AI Memory Limit & Fallback Support @J-MOBILE-AI-FALLBACK-01", () => {
  const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

  test.beforeEach(async ({ page }) => {
    // Clear localStorage
    await page.goto("/src/mobile-app/index.html")
    await page.evaluate(() => localStorage.clear())
  })

  test("should detect memory constraint (deviceMemory < 4) and switch to Lightweight mode", async ({
    page
  }) => {
    // Mock deviceMemory = 2
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "deviceMemory", {
        value: 2,
        configurable: true
      })
    })

    await page.goto("/src/mobile-app/index.html?mock=true")
    await page.evaluate(() => {
      localStorage.setItem("mock-webllm", "true")
    })

    // Flip the card
    await page.click("#cardContainer")

    // Expect download button to be visible
    const downloadBtn = page.locator("#aiDownloadBtn")
    await expect(downloadBtn).toBeVisible({ timeout: 15000 })

    // Verify AI mode badge shows "軽量モード" (Lightweight mode)
    const modeBadge = page.locator("#aiModeBadge")
    await expect(modeBadge).toBeVisible()
    await expect(modeBadge).toHaveText("軽量モード")

    // Take screenshot of the lightweight mode ready to download
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "mobile-pwa-lightweight-download-ready.png"
      )
    })

    // Download model
    await downloadBtn.click()

    // Wait for analyze button
    const analyzeBtn = page.locator("#aiAnalyzeBtn")
    await expect(analyzeBtn).toBeVisible({ timeout: 90000 })

    // Click analyze
    await analyzeBtn.click()

    // Results container should be visible
    const resultsContainer = page.locator("#aiResultsContainer")
    await expect(resultsContainer).toBeVisible({ timeout: 30000 })

    // Verify genre and summary are displayed
    const resultGenre = page.locator("#aiResultGenre")
    const resultSummary = page.locator("#aiResultSummary")
    await expect(resultGenre).not.toHaveText("--")
    await expect(resultSummary).not.toHaveText("--")

    // Take screenshot of analyzed result in lightweight mode
    await page.screenshot({
      path: path.join(screenshotsDir, "mobile-pwa-lightweight-analyzed.png")
    })
  })

  test("should fallback to static rule-based parsing on engine initialization failure", async ({
    page
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("mock-webllm", "true")
      localStorage.setItem("mock-webllm-downloaded", "true")
    })
    await page.goto("/src/mobile-app/index.html?mock=true")

    // Flip the card
    await page.click("#cardContainer")

    // Analyze button should be visible (as it's mocked downloaded)
    const analyzeBtn = page.locator("#aiAnalyzeBtn")
    await expect(analyzeBtn).toBeVisible()

    // Simulate worker error event to trigger fallback mode
    await page.evaluate(() => {
      const client = (window as any).localAiClient
      if (client) {
        client.init() // Ensure worker is initialized
        if (client.worker) {
          // Send a mock error message from worker
          client.worker.onmessage({
            data: {
              status: "error",
              error: "WebGL context lost (out-of-memory simulation)"
            }
          })
        }
      }
    })

    // Mode badge should show "非AIフォールバック" (Non-AI fallback)
    const modeBadge = page.locator("#aiModeBadge")
    await expect(modeBadge).toBeVisible()
    await expect(modeBadge).toHaveText("非AIフォールバック")

    // Error alert is also visible due to the error status
    const errorAlert = page.locator("#aiErrorAlert")
    await expect(errorAlert).toBeVisible()

    // Take screenshot of the fallback mode before analysis
    await page.screenshot({
      path: path.join(screenshotsDir, "mobile-pwa-static-fallback-ready.png")
    })

    // Now click analyze, it should bypass standard inference and use fallback static parser
    await analyzeBtn.click()

    // Results container should be visible, displaying parsed contents
    const resultsContainer = page.locator("#aiResultsContainer")
    await expect(resultsContainer).toBeVisible({ timeout: 10000 })

    const resultGenre = page.locator("#aiResultGenre")
    const resultSummary = page.locator("#aiResultSummary")
    await expect(resultGenre).not.toHaveText("--")
    await expect(resultSummary).not.toHaveText("--")

    // Take screenshot of fallback result
    await page.screenshot({
      path: path.join(screenshotsDir, "mobile-pwa-static-fallback-analyzed.png")
    })
  })
})
