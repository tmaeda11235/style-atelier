import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - LiteRT-LM Developer Profiler Dashboard @J-PROFILER-DASHBOARD", () => {
  test.slow()

  test.beforeEach(async ({ page }) => {
    // Clear download state
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

  test("should display profiler dashboard and capture screenshot", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Developer Profiler test...")
    await page.goto("/tests/sandbox/index.html?isWide=true")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Ensure the title is visible
    const title = spFrame
      .locator("h1")
      .filter({ hasText: "LiteRT-LM Developer Profiler" })
    await expect(title).toBeVisible({ timeout: 15000 })

    // Toggle button presence
    const mockModeBtn = spFrame.locator("button:has-text('Mock Mode')")
    const realWebGpuBtn = spFrame.locator("button:has-text('Real WebGPU')")
    await expect(mockModeBtn).toBeVisible()
    await expect(realWebGpuBtn).toBeVisible()

    // Mock Mode is active by default
    await expect(mockModeBtn).toHaveClass(/bg-indigo-600/)

    // Panel presence check
    const storagePanel = spFrame
      .locator("div:has-text('OPFS Storage Usage')")
      .first()
    await expect(storagePanel).toBeVisible()

    // Capture screenshot
    const screenshotPath = path.join(
      screenshotsDir,
      "webllm-profiler-dashboard.png"
    )
    await page.screenshot({ path: screenshotPath })
    console.log(`Profiler Dashboard screenshot saved to: ${screenshotPath}`)
  })
})
