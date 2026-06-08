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

  test("should show localized ConnectionAlerts and take screenshots", async ({ page }) => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        category: "cat-1",
        tags: ["cyberpunk", "nature"]
      })
    })

    // --- English Mode Verification ---
    console.log("Verifying English Alerts...")
    
    // Switch to Library tab
    let libraryNavBtn = spFrame.locator("button[title='Library'], button[title='ライブラリ']")
    await expect(libraryNavBtn).toBeVisible()
    await libraryNavBtn.click()
    await page.waitForTimeout(500)

    // Wait for the seeded card to appear in the Library list
    const cardEl = spFrame.locator("text=Neon Forest").first()
    await expect(cardEl).toBeVisible()

    // Hover and click edit button to open details view
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await cardEl.hover()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Mock chrome.tabs.sendMessage to throw "Could not establish connection"
    await spFrame.locator("body").evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      win.chrome = win.chrome || {}
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
    await page.waitForTimeout(500)

    // Verify Disconnected Alert in English
    const disconnTitleEn = spFrame.locator("p:has-text('Connection Lost')")
    await expect(disconnTitleEn).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('The extension has lost connection to the page.')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('Reload Page')")).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-disconnected-en.png")
    })
    console.log("Disconnected English Alert screenshot saved.")

    // Dismiss Alert
    const dismissBtn = spFrame.locator("button[title='Dismiss']")
    await expect(dismissBtn).toBeVisible()
    await dismissBtn.click()
    await page.waitForTimeout(500)

    // Mock chrome.tabs.sendMessage to return a "Could not find chat input" error response
    await spFrame.locator("body").evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      win.chrome.tabs.sendMessage = async () => {
        return {
          status: "error",
          message: "Could not find chat input"
        }
      }
    })

    // Click Apply button again
    await applyBtn.click()
    await page.waitForTimeout(500)

    // Verify No Input Alert in English
    const noInputTitleEn = spFrame.locator("p:has-text('Input Not Found')")
    await expect(noInputTitleEn).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('Could not find the chat input.')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('Retry Connection')")).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-noinput-en.png")
    })
    console.log("No Input English Alert screenshot saved.")

    // Dismiss Alert and close detail view
    await dismissBtn.click()
    await page.waitForTimeout(500)
    await spFrame.locator("button:has-text('Cancel')").click()
    await page.waitForTimeout(500)

    // --- Switch to Japanese (ja) ---
    console.log("Switching language to Japanese...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("ja")
    await page.waitForTimeout(500)

    // Go back to Library
    libraryNavBtn = spFrame.locator("button[title='Library'], button[title='ライブラリ']")
    await expect(libraryNavBtn).toBeVisible()
    await libraryNavBtn.click()
    await page.waitForTimeout(500)

    // --- Japanese Mode Verification ---
    console.log("Verifying Japanese Alerts...")
    await cardEl.hover()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Mock chrome.tabs.sendMessage to throw "Could not establish connection"
    await spFrame.locator("body").evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      win.chrome.tabs.sendMessage = async () => {
        throw new Error("Could not establish connection")
      }
    })

    // Click Apply (適用) button
    const applyBtnJa = spFrame.locator("button:has-text('適用')")
    await expect(applyBtnJa).toBeVisible()
    await applyBtnJa.click()
    await page.waitForTimeout(500)

    // Verify Disconnected Alert in Japanese
    const disconnTitleJa = spFrame.locator("p:has-text('接続が切断されました')")
    await expect(disconnTitleJa).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('ページとの接続が失われました。')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('ページをリロード')")).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-disconnected-ja.png")
    })
    console.log("Disconnected Japanese Alert screenshot saved.")

    // Dismiss Alert
    await dismissBtn.click()
    await page.waitForTimeout(500)

    // Mock chrome.tabs.sendMessage to return a "Could not find chat input" error response
    await spFrame.locator("body").evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      win.chrome.tabs.sendMessage = async () => {
        return {
          status: "error",
          message: "Could not find chat input"
        }
      }
    })

    // Click Apply (適用) button again
    await applyBtnJa.click()
    await page.waitForTimeout(500)

    // Verify No Input Alert in Japanese
    const noInputTitleJa = spFrame.locator("p:has-text('入力エリアが見つかりません')").first()
    await expect(noInputTitleJa).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('チャット入力エリアが見つかりませんでした。')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('接続を再試行')")).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "connection-alert-noinput-ja.png")
    })
    console.log("No Input Japanese Alert screenshot saved.")

    // Dismiss Alert and close detail view
    await dismissBtn.click()
    await page.waitForTimeout(500)
    await spFrame.locator("button:has-text('キャンセル')").click()
    await page.waitForTimeout(500)
  })
})
