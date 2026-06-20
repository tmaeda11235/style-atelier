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

  test("should trigger Notion sync on card update and store state", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // We will capture requests sent to Notion
    let notionPostPayload: any = null
    let notionPatchPayload: any = null

    await page.route("https://api.notion.com/v1/pages", async (route) => {
      if (route.request().method() === "POST") {
        notionPostPayload = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            id: "notion_new_page_uuid_999",
            object: "page"
          })
        })
      } else {
        await route.fallback()
      }
    })

    await page.route(
      "https://api.notion.com/v1/pages/notion_new_page_uuid_999",
      async (route) => {
        if (route.request().method() === "PATCH") {
          notionPatchPayload = route.request().postDataJSON()
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
              id: "notion_new_page_uuid_999",
              object: "page"
            })
          })
        } else {
          await route.fallback()
        }
      }
    )

    await page.goto("/tests/sandbox/index.html")
    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 1. Activate Pro License
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

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

    // 2. Setup Notion credentials
    const notionAccordionHeader = spFrame.locator("#settings-accordion-notion")
    await notionAccordionHeader.click()

    const apiKeyInput = spFrame.locator("#notion-api-key-input")
    const dbIdInput = spFrame.locator("#notion-database-id-input")
    const saveBtn = spFrame.locator("#notion-save-settings-btn")

    await apiKeyInput.fill("secret_valid_token")
    await dbIdInput.fill("valid_db_id")
    await saveBtn.click()

    // Verify it is saved
    const feedbackText = spFrame.locator("#notion-feedback-alert")
    await expect(feedbackText).toHaveText(/保存しました|saved/i)

    // Take screenshot of settings configured
    await page.screenshot({
      path: path.join(screenshotsDir, "notion-sync-settings-saved.png")
    })

    // 3. Go to Library and open a card detail view
    const libraryTabBtn = spFrame.locator(
      "button:has-text('Library'), button:has-text('ライブラリ')"
    )
    await libraryTabBtn.click()

    const targetCard = spFrame
      .locator("div.group")
      .filter({ hasText: "cyberpunk style" })
      .first()
    const editBtn = targetCard.locator("[data-testid='edit-card-button']")
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // 4. Modify some state to trigger auto sync on save
    // Click 'detail-hide-sref' checkbox to update card
    const hideSrefCheckbox = spFrame.locator("#detail-hide-sref")
    await expect(hideSrefCheckbox).toBeVisible()
    await hideSrefCheckbox.click()

    // Click Save Button
    const saveCardBtn = spFrame.locator(
      "button:has-text('Save'), button:has-text('保存')"
    )
    await expect(saveCardBtn).toBeVisible()
    await saveCardBtn.click()

    // 5. Verify Notion API was triggered via POST
    await expect
      .poll(() => notionPostPayload, { timeout: 10000 })
      .not.toBeNull()
    expect(notionPostPayload.properties.Name.title[0].text.content).toContain(
      "cyberpunk style"
    )

    // Take screenshot of library after save
    await page.screenshot({
      path: path.join(screenshotsDir, "notion-sync-after-save.png")
    })

    // 6. Open edit again and toggle it back to trigger PATCH
    await editBtn.click()
    await expect(hideSrefCheckbox).toBeVisible()
    await hideSrefCheckbox.click()
    await saveCardBtn.click()

    // Verify Notion API was triggered via PATCH
    await expect
      .poll(() => notionPatchPayload, { timeout: 10000 })
      .not.toBeNull()
    expect(notionPatchPayload.properties.Name.title[0].text.content).toContain(
      "cyberpunk style"
    )

    // Clear payload to intercept next PATCH
    notionPatchPayload = null

    // 7. Delete card and verify archive patch is sent
    await editBtn.click()
    const deleteBtn = spFrame.locator("[data-testid='delete-card-button']")
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    const deleteModal = spFrame.locator("[data-testid='delete-confirm-modal']")
    await expect(deleteModal).toBeVisible()

    const okBtn = spFrame.locator("[data-testid='delete-confirm-ok-button']")
    await expect(okBtn).toBeVisible()
    await okBtn.click()

    // Verify Notion API was triggered via PATCH with archived: true
    await expect
      .poll(() => notionPatchPayload, { timeout: 10000 })
      .not.toBeNull()
    expect(notionPatchPayload.archived).toBe(true)

    // Take screenshot of library after delete sync
    await page.screenshot({
      path: path.join(screenshotsDir, "notion-sync-after-delete.png")
    })
  })
})
