import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Notion Integration E2E Tests @J-NOTION-INTEGRATION-01", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Google APIs globally for settings tests to prevent 401 retries
    await page.route("https://www.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({})
      })
    })

    // Mock Notion API verification call with CORS support
    await page.route("https://api.notion.com/**", async (route) => {
      const method = route.request().method()
      if (method === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers":
              "Authorization, Notion-Version, Content-Type"
          }
        })
        return
      }

      const headers = route.request().headers()
      const auth = headers["authorization"] || headers["Authorization"]
      if (auth === "Bearer secret_valid_token") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({ id: "database_id", object: "database" })
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            code: "unauthorized",
            message: "Invalid API key"
          })
        })
      }
    })

    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should enforce license restriction and allow setup when premium is active", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 1. Navigate to Settings
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    // 2. Expand Notion Accordion (when Unlicensed)
    const notionAccordionHeader = spFrame.locator("#settings-accordion-notion")
    await expect(notionAccordionHeader).toBeVisible()
    await notionAccordionHeader.click()

    // 3. Verify unlicensed restriction UI
    const premiumAlert = spFrame.locator("#notion-premium-alert")
    await expect(premiumAlert).toBeVisible()
    await expect(premiumAlert).toHaveText(/Premium Pro/)

    const apiKeyInput = spFrame.locator("#notion-api-key-input")
    const dbIdInput = spFrame.locator("#notion-database-id-input")
    const testBtn = spFrame.locator("#notion-test-connection-btn")
    const saveBtn = spFrame.locator("#notion-save-settings-btn")

    await expect(apiKeyInput).toBeDisabled()
    await expect(dbIdInput).toBeDisabled()
    await expect(testBtn).toBeDisabled()
    await expect(saveBtn).toBeDisabled()

    // Take screenshot of unlicensed state
    await page.screenshot({
      path: path.join(screenshotsDir, "notion-settings-unlicensed.png")
    })

    // 4. Activate Premium License
    const licenseAccordionHeader = spFrame.locator(
      "#settings-accordion-license"
    )
    await licenseAccordionHeader.click()

    const keyInput = spFrame.locator("#license-key-input")
    const activateBtn = spFrame.locator("#license-activate-btn")
    await keyInput.fill("PRO-MEMBER-TEST-KEY")
    await activateBtn.click()

    const statusBadge = spFrame.locator("#license-status-badge")
    await expect(statusBadge).toHaveText(/Active|有効/)

    // 5. Verify fields are enabled (Notion accordion should still be open)

    // Verify fields are enabled
    await expect(premiumAlert).not.toBeVisible()
    await expect(apiKeyInput).toBeEnabled()
    await expect(dbIdInput).toBeEnabled()
    await expect(testBtn).toBeDisabled() // should be disabled initially until fields are filled
    await expect(saveBtn).toBeDisabled()

    // Fill credentials
    await apiKeyInput.fill("secret_valid_token")
    await dbIdInput.fill("valid_db_id")

    await expect(testBtn).toBeEnabled()
    await expect(saveBtn).toBeEnabled()

    // Take screenshot of licensed, ready state
    await page.screenshot({
      path: path.join(screenshotsDir, "notion-settings-licensed.png")
    })

    // 6. Test connection (Mock is configured to succeed with 'secret_valid_token')
    await testBtn.click()

    const feedbackText = spFrame.locator("#notion-feedback-alert")
    await expect(feedbackText).toBeVisible()
    await expect(feedbackText).toHaveText(/接続確認に成功しました|success/i)

    // Take screenshot of connection success
    await page.screenshot({
      path: path.join(screenshotsDir, "notion-settings-connection-success.png")
    })

    // 7. Save settings
    await saveBtn.click()
    await expect(feedbackText).toHaveText(/保存しました|saved/i)
  })
})
