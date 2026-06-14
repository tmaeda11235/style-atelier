import path from "path"
import { expect, test } from "@playwright/test"

test.describe("DbErrorOverlay E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display DbErrorOverlay on database initialization failure and allow localized view", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // --- English Mode Verification ---
    console.log("Setting language to English...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("en")

    // Switch back to Library (or just close settings)
    const libraryNavBtn = spFrame.locator(
      "button[title='Library'], button[title='ライブラリ']"
    )
    await expect(libraryNavBtn).toBeVisible()
    await libraryNavBtn.click()

    console.log("Simulating Database Error in English...")
    // Trigger database error
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      if (typeof win.__triggerDbErrorForTest === "function") {
        win.__triggerDbErrorForTest(
          "IndexedDB initialization failed: VersionError"
        )
      }
    })

    // Assert English Overlay is visible
    const overlayTitleEn = spFrame.locator(
      "h2:has-text('Database Initialization Error')"
    )
    await expect(overlayTitleEn).toBeVisible()
    await expect(
      spFrame.locator(
        "p:has-text('Failed to initialize the database (IndexedDB).')"
      )
    ).toBeVisible()
    await spFrame.locator("summary:has-text('Technical Details')").click()
    await expect(
      spFrame.locator("text=IndexedDB initialization failed: VersionError")
    ).toBeVisible()

    // Take English screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "db-error-overlay-en.png")
    })
    console.log("English Database Error screenshot saved.")

    // Clear error for language change
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      if (typeof win.__clearDbErrorForTest === "function") {
        win.__clearDbErrorForTest()
      }
    })
    await expect(overlayTitleEn).not.toBeVisible()

    // --- Japanese Mode Verification ---
    console.log("Setting language to Japanese...")
    await settingsNavBtn.click()
    await langSelect.selectOption("ja")
    await libraryNavBtn.click()

    console.log("Simulating Database Error in Japanese...")
    // Trigger database error again
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      if (typeof win.__triggerDbErrorForTest === "function") {
        win.__triggerDbErrorForTest(
          "IndexedDBの初期化に失敗しました: VersionError"
        )
      }
    })

    // Assert Japanese Overlay is visible
    const overlayTitleJa = spFrame.locator(
      "h2:has-text('データベース起動エラー')"
    )
    await expect(overlayTitleJa).toBeVisible()
    await expect(
      spFrame.locator(
        "p:has-text('データベース（IndexedDB）の初期化に失敗しました。')"
      )
    ).toBeVisible()
    await spFrame.locator("summary:has-text('Technical Details')").click()
    await expect(
      spFrame.locator("text=IndexedDBの初期化に失敗しました: VersionError")
    ).toBeVisible()

    // Take Japanese screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "db-error-overlay-ja.png")
    })
    console.log("Japanese Database Error screenshot saved.")

    // Clean up
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      if (typeof win.__clearDbErrorForTest === "function") {
        win.__clearDbErrorForTest()
      }
    })
    await expect(overlayTitleJa).not.toBeVisible()
  })
})
