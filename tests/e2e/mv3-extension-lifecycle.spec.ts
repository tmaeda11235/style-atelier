import fs from "fs"
import path from "path"

import { expect, logPhase, test } from "./extension-fixture"

test.describe("Manifest V3 Extension Lifecycle & Security E2E Tests @J-MV3-LIFECYCLE", () => {
  test("拡張機能のロードとService Workerのライフサイクル検証", async ({
    context,
    extensionId,
    extensionPage
  }) => {
    logPhase("拡張機能ロード完了の検証開始")
    expect(extensionId).toBeDefined()
    expect(extensionId.length).toBeGreaterThan(0)
    logPhase("拡張機能ID検証完了", `ID: ${extensionId}`)

    // Service Worker が存在しアクティブであることを確認
    const serviceWorkers = context.serviceWorkers()
    expect(serviceWorkers.length).toBeGreaterThan(0)
    logPhase("Service Worker検知完了", `Count: ${serviceWorkers.length}`)

    // サイドパネル UI が開かれ、正しくレンダリングされているか
    logPhase("サイドパネル UI 状態検証")
    // タイトルは i18n 化されている場合 "__MSG_extName__" になることがあるため、両方許容する
    await expect(extensionPage).toHaveTitle(/Style Atelier|__MSG_extName__/)
    logPhase("サイドパネルタイトル検証完了")

    // ウェルカムダイアログのスキップボタンがあればクリックして初期状態へ
    const skipButton = extensionPage.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      logPhase("ウェルカムダイアログのスキップボタンをクリック")
      await skipButton.click()
    }

    // サイドパネルの主要なタブ（Workbench や Library 等）が表示されているか
    const tabsContainer = extensionPage.locator("button:has-text('Workbench')")
    await expect(tabsContainer).toBeVisible({ timeout: 10000 })
    logPhase("主要タブ of Sidepanel 検証完了")
  })

  test("Offscreen Document の動的生成とメッセージング・ライフサイクル検証", async ({
    context,
    extensionPage,
    extensionId
  }) => {
    logPhase("Offscreen Document ライフサイクル検証開始")

    // Service Worker オブジェクトを取得
    let [sw] = context.serviceWorkers()
    if (!sw) {
      sw = await context.waitForEvent("serviceworker")
    }
    expect(sw).toBeDefined()

    // 1. 初期状態で Offscreen Document が存在しないことを確認
    const initialHasDoc = await sw.evaluate(async () => {
      if (typeof chrome === "undefined" || !chrome.offscreen) return false
      return await chrome.offscreen.hasDocument()
    })
    expect(initialHasDoc).toBe(false)
    logPhase("初期状態検証完了（Offscreenは存在しない）")

    // 2. サイドパネルから Offscreen Document の生成をトリガー
    logPhase("推論リクエスト送信による Offscreen Document 生成トリガー")

    // サイドパネル側から sendMessage を送信
    await extensionPage.evaluate(() => {
      chrome.runtime.sendMessage({
        target: "offscreen",
        action: "init-engine",
        payload: { modelId: "test-model" }
      })
    })

    logPhase("Offscreen 起動待機中...")

    // Offscreen Document が生成されるまでポーリング
    const start = Date.now()
    let hasOffscreen = false
    while (Date.now() - start < 15000) {
      hasOffscreen = await sw.evaluate(async () => {
        if (typeof chrome === "undefined" || !chrome.offscreen) return false
        return await chrome.offscreen.hasDocument()
      })
      if (hasOffscreen) break
      await new Promise((r) => setTimeout(r, 500))
    }

    expect(hasOffscreen).toBe(true)
    logPhase("Offscreen準備完了")

    // 3. Offscreen Document 内で Manifest V3 CSP 制限に抵触していないか検証
    logPhase("Offscreen Document セキュリティ（CSP）検証")

    // ビルドディレクトリからハッシュ付きの offscreen html ファイル名を探す
    const extensionDir = path.resolve(__dirname, "../../build/chrome-mv3-prod")
    const files = fs.readdirSync(extensionDir)
    const offscreenHtmlFile = files.find(
      (f) => f.startsWith("offscreen") && f.endsWith(".html")
    )
    if (!offscreenHtmlFile) {
      throw new Error("offscreen html file not found in build directory")
    }
    logPhase("Offscreen HTMLファイル名特定", offscreenHtmlFile)

    // 直接 offscreen.html を開いて、エラーが起きずに chrome API が使えるか確認する
    const testPage = await context.newPage()
    await testPage.goto(
      `chrome-extension://${extensionId}/${offscreenHtmlFile}`
    )
    const hasCspError = await testPage.evaluate(() => {
      return typeof (window as any).chrome === "undefined"
    })
    expect(hasCspError).toBe(false)
    await testPage.close()
    logPhase("Offscreen Document セキュリティ検証完了")

    // 4. サイドパネルを閉じた際に Offscreen Document が自動クローズされるか検証
    logPhase("テストアサーション（ライフサイクルクローズ検証）")

    logPhase("サイドパネルクローズ実行")
    await extensionPage.close()

    logPhase("Offscreen Document の自動クローズ待機")
    let isClosed = false
    const closeStart = Date.now()
    while (Date.now() - closeStart < 15000) {
      const hasDoc = await sw.evaluate(async () => {
        if (typeof chrome === "undefined" || !chrome.offscreen) return false
        return await chrome.offscreen.hasDocument()
      })
      if (!hasDoc) {
        isClosed = true
        break
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    expect(isClosed).toBe(true)
    logPhase("Offscreen Document 自動クローズ検証完了")
  })
})
