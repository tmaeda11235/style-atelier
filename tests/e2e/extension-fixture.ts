/* eslint-disable @typescript-eslint/no-explicit-any, no-empty-pattern */
import fs from "fs"
import path from "path"
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page
} from "@playwright/test"

// フェーズロギング
export function logPhase(phaseName: string, details?: string) {
  const timestamp = new Date().toISOString()
  console.log(
    `[PHASE][${timestamp}] ${phaseName}${details ? ` - ${details}` : ""}`
  )
}

// リクエスト追跡用
const activeRequests = new Map<
  string,
  {
    url: string
    method: string
    headers: Record<string, string>
    postData: string | null
  }
>()

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  extensionPage: Page
}>({
  context: async ({}, use, testInfo) => {
    logPhase("テスト開始", testInfo.title)

    const project = testInfo.project
    if (project.name !== "extension") {
      testInfo.skip(true, "Skip extension tests on non-extension browser projects")
    }
    // playwright.config.ts から args を取得。なければデフォルト
    const args = project.use?.args || []

    const pathToExtension = path.resolve(
      __dirname,
      "../../build/chrome-mv3-prod"
    )
    if (!fs.existsSync(pathToExtension)) {
      throw new Error(
        `Extension build not found at ${pathToExtension}. Please run 'npm run build' first.`
      )
    }

    const userDataDir = path.resolve(
      __dirname,
      `../../test-results/.user-data-${testInfo.testId.replace(/[^a-zA-Z0-9]/g, "-")}`
    )

    logPhase("Chromium persistent context 起動")
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless:
        project.use?.headless !== undefined ? project.use.headless : false,
      args: args
    })

    // ページの console/pageerror/request の監視
    context.on("page", (page) => {
      // ログ監視
      page.on("console", (msg) => {
        const text = msg.text()
        const type = msg.type()
        if (type === "error" || type === "warning") {
          console.error(`[Browser ${type.toUpperCase()}] ${text}`)
        } else {
          console.log(`[Browser Log] [${type}] ${text}`)
        }
      })

      page.on("pageerror", (err) => {
        console.error(
          `[Browser Error] Unhandled exception: ${err.message}\n${err.stack}`
        )
      })

      // リクエスト監視
      page.on("request", (request) => {
        activeRequests.set(request.url(), {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        })
      })

      page.on("requestfinished", (request) => {
        activeRequests.delete(request.url())
      })

      page.on("requestfailed", (request) => {
        const details = activeRequests.get(request.url())
        console.error(
          `[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText || "Unknown error"}`
        )
        if (details) {
          console.error(`Request Details:
  Method: ${details.method}
  Headers: ${JSON.stringify(details.headers, null, 2)}
  PostData: ${details.postData || "None"}`)
        }
        activeRequests.delete(request.url())
      })
    })

    logPhase("拡張機能ロード完了")

    await use(context)

    // テスト失敗時/タイムアウト時のダンプ
    if (testInfo.status === "failed" || testInfo.status === "timedOut") {
      logPhase("テスト失敗に伴うダンプ出力")
      console.error(
        `Active Requests at failure: ${JSON.stringify(Array.from(activeRequests.values()), null, 2)}`
      )

      // 各ページのアクティブなモック状態を取得してダンプ
      for (const page of context.pages()) {
        if (page.isClosed()) continue
        try {
          const mockState = await page.evaluate(() => {
            return {
              url: window.location.href,
              localStorage: { ...window.localStorage },
              mockWebLlmConfig: (window as any).mockWebLlmConfig || null
            }
          })
          console.error(
            `[MOCK STATE DUMP] Page: ${page.url()}\nState: ${JSON.stringify(mockState, null, 2)}`
          )
        } catch (err: any) {
          console.error(
            `[MOCK STATE DUMP FAILED] Page: ${page.url()} - ${err.message}`
          )
        }
      }
    }

    logPhase("Chromium context クローズ")
    await context.close()

    // userDataDir のクリーンアップ
    try {
      if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true })
      }
    } catch (err: any) {
      console.warn(`Failed to cleanup user data directory: ${err.message}`)
    }
  },

  extensionId: async ({ context }, use, testInfo) => {
    if (testInfo.project.name !== "extension") {
      testInfo.skip(
        true,
        "Skip extension lifecycle tests on non-extension browser projects"
      )
      await use("")
      return
    }
    logPhase("拡張機能IDの取得開始")
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent("serviceworker")
    }
    const extensionId = background.url().split("/")[2]
    logPhase("拡張機能IDの取得完了", `Extension ID: ${extensionId}`)
    await use(extensionId)
  },

  extensionPage: async ({ context, extensionId }, use) => {
    logPhase("拡張機能サイドパネルのロード開始")
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)
    logPhase("拡張機能サイドパネルのロード完了")
    await use(page)
  }
})

export const expect = test.expect
