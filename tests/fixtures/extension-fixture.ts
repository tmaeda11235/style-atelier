import fs from "fs"
import os from "os"
import path from "path"
import { test as base, chromium, type BrowserContext } from "@playwright/test"

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use, testInfo) => {
    // Plasmoがビルドした拡張機能（prod版）のパスを指定します
    const pathToExtension = path.join(__dirname, "../../build/chrome-mv3-prod")

    // 各テストおよびワーカーに独立した一時的なブラウザコンテキスト（ユーザーデータディレクトリ）を作成
    const tempDir = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        `playwright-chrome-profile-${testInfo.workerIndex}-${Date.now()}-`
      )
    )

    const context = await chromium.launchPersistentContext(tempDir, {
      headless: false, // 拡張機能を読み込むためにヘッドフルモードで起動します
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`
      ]
    })

    await use(context)
    await context.close()

    // 一時ディレクトリのクリーンアップ
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch (error) {
      console.error(`Failed to clean up temporary directory ${tempDir}:`, error)
    }
  },
  extensionId: async ({ context }, use) => {
    // バックグラウンド・サービスワーカーがロードされるのを待機し、拡張機能IDを取得します
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent("serviceworker")
    }

    const extensionId = background.url().split("/")[2]
    await use(extensionId)
  }
})

export { expect } from "@playwright/test"
