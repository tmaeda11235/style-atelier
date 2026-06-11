import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - i18n Minting and Card Detail", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should translate Minting, SimpleMinting, and CardDetail components under Japanese locale", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings and Switch to Japanese (ja)
    console.log("Switching language to Japanese...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("ja")
    await spFrame.locator("body").evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const database = (window as any).db

      // Clear data
      await database.historyItems.clear()
      await database.styleCards.clear()
      await database.categories.clear()

      // Seed categories
      await database.categories.bulkAdd([
        { id: "cat-1", name: "イラスト", iconEmoji: "🎨" }
      ])

      // Seed history items for minting
      await database.historyItems.add({
        id: "hist-1",
        imageUrl:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='purple'/></svg>",
        fullCommand:
          "mystic neon forest cybernetic --sref 1234567 --p style-abc",
        promptSegments: [
          { type: "text", value: "mystic neon forest cybernetic" },
          { type: "sref", value: "1234567" },
          { type: "p", value: "style-abc" }
        ],
        parameters: {
          sref: ["1234567"],
          p: ["style-abc"]
        },
        timestamp: Date.now()
      })

      // Seed style cards for detail view
      await database.styleCards.add({
        id: "card-1",
        name: "ネオンフォレスト",
        promptSegments: [{ type: "text", value: "mystic neon forest" }],
        parameters: {
          ar: "16:9",
          p: ["style-abc"],
          sref: ["1234567"]
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

    // --- A. MintingView Test ---
    console.log("Testing MintingView localization...")
    const historyTabBtn = spFrame.locator(
      "button[title='History'], button[title='履歴']"
    )
    await expect(historyTabBtn).toBeVisible()
    await historyTabBtn.click()
    const mintBtn = spFrame
      .locator("button:has-text('Mint'), button:has-text('ミント')")
      .first()
    await expect(mintBtn).toBeVisible()
    await mintBtn.click()
    const mintTitle = spFrame.locator("h2:has-text('新規カード作成')")
    await expect(mintTitle).toBeVisible()
    await expect(spFrame.locator("h3:has-text('カード情報')")).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('プレビュー名')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('キーワード選択')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('カスタム名 / メモ')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('カテゴリー')").first()
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('カスタムタグ')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('検出されたパレット')")
    ).toBeVisible()
    await expect(spFrame.locator("span:has-text('メインカラー')")).toBeVisible()
    await expect(
      spFrame.locator("span:has-text('アクセントカラー')")
    ).toBeVisible()
    await expect(spFrame.locator("h3:has-text('プロンプト要素')")).toBeVisible()
    await expect(
      spFrame.locator("h3:has-text('レアリティ & フレーム')")
    ).toBeVisible()
    await expect(spFrame.locator("h3:has-text('公開制限設定')")).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('共有時に --sref を非表示にする')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('共有時に --p を非表示にする')")
    ).toBeVisible()

    // Take screenshot of MintingView in Japanese
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-minting-view-ja.png")
    })
    console.log("MintingView screenshot saved.")

    // Cancel and go back
    const cancelMintBtn = spFrame.locator("button:has-text('キャンセル')")
    await cancelMintBtn.click()
    console.log("Switching to Easy Mode...")
    await settingsNavBtn.click()

    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible()
    await easyModeToggle.click()

    // Wait until Easy Mode Library is loaded
    console.log("Waiting for Easy Mode Library to load...")
    await expect(spFrame.locator("text=ネオンフォレスト").first()).toBeVisible({
      timeout: 5000
    })

    // Trigger SimpleMintingView via Drag & Drop simulation
    console.log("Simulating history item drop in Easy Mode...")
    await spFrame
      .locator("text=ネオンフォレスト")
      .first()
      .evaluate(async (cardEl) => {
        const mockHistoryItem = {
          id: "hist-2",
          imageUrl:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='blue'/></svg>",
          fullCommand: "cyberpunk cat illustration --sref 112233 --p style-xyz",
          promptSegments: [
            { type: "text", value: "cyberpunk cat illustration" },
            { type: "sref", value: "112233" },
            { type: "p", value: "style-xyz" }
          ],
          parameters: {
            sref: ["112233"],
            p: ["style-xyz"]
          },
          timestamp: Date.now()
        }

        const dataStore: Record<string, string> = {
          "application/json": JSON.stringify(mockHistoryItem)
        }

        // Dispatch dragover event first
        const dragOverEvent = new Event("dragover", {
          bubbles: true,
          cancelable: true
        })

        Object.defineProperty(dragOverEvent, "dataTransfer", {
          value: {
            types: ["application/json"],
            getData: (type: string) => dataStore[type],
            setData: (type: string, val: string) => {
              dataStore[type] = val
            },
            files: []
          },
          writable: false,
          configurable: true
        })

        cardEl.dispatchEvent(dragOverEvent)

        // Dispatch drop event
        const dropEvent = new Event("drop", {
          bubbles: true,
          cancelable: true
        })

        Object.defineProperty(dropEvent, "dataTransfer", {
          value: {
            types: ["application/json"],
            getData: (type: string) => dataStore[type],
            setData: (type: string, val: string) => {
              dataStore[type] = val
            },
            files: []
          },
          writable: false,
          configurable: true
        })

        cardEl.dispatchEvent(dropEvent)
      })
    await expect(
      spFrame.locator("h2:has-text('クイックカード作成')")
    ).toBeVisible()
    await expect(
      spFrame.locator("p:has-text('スタイルをすぐにカード化')")
    ).toBeVisible()
    await expect(
      spFrame.locator("span:has-text('かんたんモード')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('クイックキーワード')")
    ).toBeVisible()
    await expect(spFrame.locator("label:has-text('カード名')")).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('カテゴリー (必須)')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('プロンプト要素')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('キャンセル')")).toBeVisible()
    await expect(
      spFrame.locator("button:has-text('ライブラリに保存')")
    ).toBeVisible()

    // Take screenshot of SimpleMintingView
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-simple-minting-view-ja.png")
    })
    console.log("SimpleMintingView screenshot saved.")

    // Cancel Simple Minting
    const cancelSimpleMintBtn = spFrame.locator("button:has-text('キャンセル')")
    await cancelSimpleMintBtn.click()
    console.log("Testing CardDetailView localization...")
    // Click on the seeded card "ネオンフォレスト" in Library (since we canceled minting, we should be in LibraryTab)
    const cardEl = spFrame.locator("text=ネオンフォレスト").first()
    await expect(cardEl).toBeVisible()

    // In Easy Mode, clicking the card directly opens SimpleWorkbench.
    // To open details, we must hover and click the Edit button.
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await cardEl.hover()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await expect(spFrame.locator("h2:has-text('カード詳細')")).toBeVisible()
    await expect(
      spFrame.locator("h3:has-text('アイデンティティ')").first()
    ).toBeVisible()
    await expect(spFrame.locator("label:has-text('カード名')")).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('カテゴリー')").first()
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('検出されたパレット')")
    ).toBeVisible()
    await expect(spFrame.locator("span:has-text('メインカラー')")).toBeVisible()
    await expect(
      spFrame.locator("span:has-text('アクセントカラー')")
    ).toBeVisible()
    await expect(spFrame.locator("label:has-text('タグ')")).toBeVisible()
    await expect(
      spFrame.locator("h3:has-text('プロンプトレシピ')").first()
    ).toBeVisible()
    await expect(
      spFrame.locator("h3:has-text('パラメータ')").first()
    ).toBeVisible()
    await expect(
      spFrame.locator("h3:has-text('公開制限設定')").first()
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('共有時に --sref を非表示にする')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('共有時に --p を非表示にする')")
    ).toBeVisible()
    await expect(
      spFrame.locator("h3:has-text('レアリティ & フレーム')").first()
    ).toBeVisible()

    // Button assertions
    await expect(spFrame.locator("button:has-text('削除')")).toBeVisible()
    await expect(spFrame.locator("button:has-text('キャンセル')")).toBeVisible()
    await expect(
      spFrame.locator("button:has-text('エクスポート')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('適用')")).toBeVisible()
    await expect(spFrame.locator("button:has-text('保存')")).toBeVisible()

    // Take screenshot of CardDetailView
    await page.screenshot({
      path: path.join(screenshotsDir, "i18n-card-detail-view-ja.png")
    })
    console.log("CardDetailView screenshot saved.")

    // Close detail view
    await spFrame.locator("button:has-text('キャンセル')").click()
  })
})
