import path from "path"
import { expect, test } from "@playwright/test"

test.describe("ConnectionAlert i18n E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should show localized ConnectionAlerts and take screenshots", async ({
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

    // 2. Seed database with a style card
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db

      await database.styleCards.clear()
      await database.categories.clear()

      await database.categories.bulkAdd([
        { id: "cat-1", name: "イラスト", iconEmoji: "🎨" }
      ])

      await database.styleCards.add({
        id: "card-1",
        name: "Neon Forest",
        promptSegments: [{ type: "text", value: "mystic neon forest" }],
        parameters: {
          ar: "16:9"
        },
        masking: {},
        tier: "Rare",
        dominantColor: "#a855f7",
        accentColor: "#ec4899",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='purple'/></svg>",
        usageCount: 5,
        category: undefined,
        tags: ["cyberpunk", "nature"]
      })
    })

    // --- English Mode Verification ---
    console.log("Verifying English Alerts...")

    // Switch to Library tab
    let libraryNavBtn = spFrame.locator(
      "button[title='Library'], button[title='ライブラリ']"
    )
    await expect(libraryNavBtn).toBeVisible()
    await libraryNavBtn.click()
    const cardEl = spFrame.locator("text=Neon Forest").first()
    await expect(cardEl).toBeVisible()

    // Hover and click edit button to open details view
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await cardEl.hover()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      win.chrome = win.chrome || {}
      win.chrome.runtime = win.chrome.runtime || {}
      win.chrome.runtime.id = "mock-extension-id"
      win.chrome.tabs = win.chrome.tabs || {}
      win.chrome.tabs.sendMessage = async () => {
        throw new Error("Could not establish connection")
      }

      // Mock chrome.tabs.query for CardDetailView tab resolution
      win.chrome.tabs.query = async () => {
        return [{ id: 1 }]
      }
    })

    // Click Apply (Inject) button
    const applyBtn = spFrame.locator("button:has-text('Inject')")
    await expect(applyBtn).toBeVisible()
    await applyBtn.click()
    const disconnTitleEn = spFrame.locator("p:has-text('Connection Lost')")
    await expect(disconnTitleEn).toBeVisible()
    await expect(
      spFrame.locator(
        "p:has-text('The extension has lost connection to the page.')"
      )
    ).toBeVisible()
    await expect(
      spFrame.locator("button:has-text('Reload Page')")
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-disconnected-en.png")
    })
    console.log("Disconnected English Alert screenshot saved.")

    // Dismiss Alert
    const dismissBtn = spFrame.locator("button[title='Dismiss']")
    await expect(dismissBtn).toBeVisible()
    await dismissBtn.click()
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      win.chrome = win.chrome || {}
      win.chrome.runtime = win.chrome.runtime || {}
      win.chrome.runtime.id = "mock-extension-id"
      win.chrome.tabs = win.chrome.tabs || {}
      win.chrome.tabs.sendMessage = async () => {
        return {
          status: "error",
          message: "Could not find chat input"
        }
      }
    })

    // Click Apply button again
    await applyBtn.click()
    const noInputTitleEn = spFrame.locator("p:has-text('Input Not Found')")
    await expect(noInputTitleEn).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('Could not find the chat input.')")
    ).toBeVisible()
    await expect(
      spFrame.locator("button:has-text('Retry Connection')")
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-noinput-en.png")
    })
    console.log("No Input English Alert screenshot saved.")

    // Dismiss Alert
    await dismissBtn.click()

    // Mock db to throw error on updateCard and styleCards.put
    await spFrame.locator("body").evaluate(() => {
      const database = (window as any).db
      database.updateCard = async () => {
        throw new Error("QuotaExceededError")
      }
      database.styleCards.put = async () => {
        throw new Error("QuotaExceededError")
      }
    })

    // Click Save button in English
    const saveBtnEn = spFrame.locator("button:has-text('Save')")
    await expect(saveBtnEn).toBeVisible()
    await saveBtnEn.click()

    // Verify DB Write Error Alert in English
    const dbErrorTitleEn = spFrame.locator("p:has-text('Database Write Error')")
    await expect(dbErrorTitleEn).toBeVisible()
    await expect(
      spFrame.locator(
        "p:has-text('Failed to write to the database. Please check your storage quota or limits.')"
      )
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-dberror-en.png")
    })
    console.log("DB Error English Alert screenshot saved.")

    // Dismiss Alert and close detail view
    await dismissBtn.click()
    await spFrame.locator("button:has-text('Cancel')").click()
    console.log("Switching language to Japanese...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("ja")
    libraryNavBtn = spFrame.locator(
      "button[title='Library'], button[title='ライブラリ']"
    )
    await expect(libraryNavBtn).toBeVisible()
    await libraryNavBtn.click()
    console.log("Verifying Japanese Alerts...")
    await cardEl.hover()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      win.chrome = win.chrome || {}
      win.chrome.runtime = win.chrome.runtime || {}
      win.chrome.runtime.id = "mock-extension-id"
      win.chrome.tabs = win.chrome.tabs || {}
      win.chrome.tabs.sendMessage = async () => {
        throw new Error("Could not establish connection")
      }
    })

    // Click Apply (適用) button
    const applyBtnJa = spFrame.locator("button:has-text('適用')")
    await expect(applyBtnJa).toBeVisible()
    await applyBtnJa.click()
    const disconnTitleJa = spFrame.locator("p:has-text('接続が切断されました')")
    await expect(disconnTitleJa).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('ページとの接続が失われました。')")
    ).toBeVisible()
    await expect(
      spFrame.locator("button:has-text('ページをリロード')")
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-disconnected-ja.png")
    })
    console.log("Disconnected Japanese Alert screenshot saved.")

    // Dismiss Alert
    await dismissBtn.click()
    await spFrame.locator("body").evaluate(() => {
      const win = window as any
      win.chrome = win.chrome || {}
      win.chrome.runtime = win.chrome.runtime || {}
      win.chrome.runtime.id = "mock-extension-id"
      win.chrome.tabs = win.chrome.tabs || {}
      win.chrome.tabs.sendMessage = async () => {
        return {
          status: "error",
          message: "Could not find chat input"
        }
      }
    })

    // Click Apply (適用) button again
    await applyBtnJa.click()
    const noInputTitleJa = spFrame
      .locator("p:has-text('入力エリアが見つかりません')")
      .first()
    await expect(noInputTitleJa).toBeVisible()
    await expect(
      spFrame.locator(
        "p:has-text('チャット入力エリアが見つかりませんでした。')"
      )
    ).toBeVisible()
    await expect(
      spFrame.locator("button:has-text('接続を再試行')")
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-noinput-ja.png")
    })
    console.log("No Input Japanese Alert screenshot saved.")

    // Dismiss Alert
    await dismissBtn.click()

    // Mock db to throw error on updateCard and styleCards.put
    await spFrame.locator("body").evaluate(() => {
      const database = (window as any).db
      database.updateCard = async () => {
        throw new Error("QuotaExceededError")
      }
      database.styleCards.put = async () => {
        throw new Error("QuotaExceededError")
      }
    })

    // Click Save (保存) button
    const saveBtnJa = spFrame.locator("button:has-text('保存')")
    await expect(saveBtnJa).toBeVisible()
    await saveBtnJa.click()

    // Verify DB Write Error Alert in Japanese
    const dbErrorTitleJa = spFrame.locator(
      "p:has-text('データベース書き込みエラー')"
    )
    await expect(dbErrorTitleJa).toBeVisible()
    await expect(
      spFrame.locator(
        "p:has-text('データベースの書き込みに失敗しました。容量制限等をご確認ください。')"
      )
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-dberror-ja.png")
    })
    console.log("DB Error Japanese Alert screenshot saved.")

    // Dismiss Alert and close detail view
    await dismissBtn.click()
    await spFrame.locator("button:has-text('キャンセル')").click()
  })
})
