import path from "path"
import { expect, test } from "@playwright/test"

test.describe("LiteRT-LM Offline Debug Dashboard E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should load the dashboard and execute mock download and inference flow @J-PROFILER-DASHBOARD", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to offline debug dashboard...")
    await page.goto("/src/test/harness/index.html")

    // 1. Initial State Assertions
    const headerTitle = page.locator("h1")
    await expect(headerTitle).toContainText("LiteRT-LM")

    const statusText = page.locator("#status-text")
    await expect(statusText).toContainText("UNLOADED")

    // Check key action buttons are visible
    const downloadBtn = page.locator("#btn-start-download")
    await expect(downloadBtn).toBeVisible()

    // 2. Simulate Downloading
    console.log("Triggering simulated download...")
    const simDownloadBtn = page.locator("#btn-mock-downloading")
    await expect(simDownloadBtn).toBeVisible()
    await simDownloadBtn.click()

    await expect(statusText).toContainText("DOWNLOADING")

    // Let it run for a bit, then click Simulate Ready
    console.log("Simulating ready state...")
    const simReadyBtn = page.locator("#btn-mock-ready")
    await expect(simReadyBtn).toBeVisible()
    await simReadyBtn.click()

    await expect(statusText).toContainText("READY")

    // 3. Inference test
    console.log("Running mock inference...")
    const runInferenceBtn = page.locator("#btn-run-inference")
    await expect(runInferenceBtn).toBeEnabled()
    await runInferenceBtn.click()

    // Output area should populate
    const outputArea = page.locator("#inference-output")
    await expect(outputArea).not.toContainText(
      "Inference output will be displayed here..."
    )

    // Wait until inference finishes and run inference button is enabled again
    await expect(runInferenceBtn).toBeEnabled({ timeout: 15000 })

    // Verify output text
    await expect(outputArea).toContainText("AI Cauldron Recipe Advice")

    // Capture screenshot of the ready dashboard with inference output
    console.log("Taking screenshot of the debugger dashboard...")
    await page.screenshot({
      path: path.join(screenshotsDir, "offline-harness-dashboard-ready.png")
    })
    console.log(
      "Screenshot saved to tests/screenshots/offline-harness-dashboard-ready.png"
    )
  })
})
