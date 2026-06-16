import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - LiteRT-LM Local Cache via MSW", () => {
  test("should successfully initialize MSW and enable cache redirect in offline harness", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to offline debug harness page...")
    await page.goto("/src/test/harness/index.html")

    // Wait for the status badge to indicate active status
    const mswStatus = page.locator("#msw-status")
    await expect(mswStatus).toHaveClass(/success/, { timeout: 15000 })
    await expect(mswStatus).toHaveText("Active (Local Cache Redirect Enabled)")

    // Capture screenshot of active MSW status
    await page.screenshot({
      path: path.join(screenshotsDir, "litert-local-cache-harness.png")
    })
    console.log("LiteRT local cache harness active screenshot saved.")
  })
})
