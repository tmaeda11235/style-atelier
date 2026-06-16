import path from "path"
import { expect, test } from "@playwright/test"

test.describe("InteractiveTutorial Accessibility & Keyboard Navigation E2E Tests @J-WB-TUTORIAL-ACC-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should trap focus, support Tab loop, and return focus to trigger button", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for InteractiveTutorial accessibility test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. スキップボタンがあればクリック
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. 設定タブボタンをクリックして設定画面へ
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // 3. 「ガイドを表示」ボタンにフォーカスを当ててからクリック
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await expect(guideBtn).toBeVisible()
    await guideBtn.focus()
    await expect(guideBtn).toBeFocused()
    await guideBtn.click()

    // 4. チュートリアルが表示されるのを確認
    const tutorialContainer = spFrame.locator(
      "[data-testid='interactive-tutorial']"
    )
    await expect(tutorialContainer).toBeVisible({ timeout: 5000 })

    // 5. 初期フォーカスがタイトル（h3）に当たっていることを確認
    const tutorialTitle = spFrame.locator(
      "[data-testid='interactive-tutorial'] h3"
    )
    await expect(tutorialTitle).toBeFocused({ timeout: 5000 })

    // スクリーンショット：初期フォーカス（タイトル）
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "accessibility-tutorial-initial-focus.png"
      )
    })

    const closeBtn = spFrame.locator("button[aria-label='Close tutorial']")
    const sampleBtn = spFrame.locator(
      "button:has-text('Add Sample and Proceed'), button:has-text('サンプルを追加して進む')"
    )
    const nextBtn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('Next'), [data-testid='interactive-tutorial'] button:has-text('次へ')"
    )

    // DOMの順序： Closeボタン(1) -> タイトルh3(2) -> サンプル追加ボタン(3) -> 次へボタン(4)
    // 初期フォーカスは タイトルh3(2) にある

    // 6. Tabを1回押す -> サンプル追加ボタン(3) へフォーカスが移るはず
    await tutorialTitle.press("Tab")
    await expect(sampleBtn).toBeFocused()

    // 7. Tabをもう1回押す -> 次へボタン(4) へフォーカスが移るはず
    await sampleBtn.press("Tab")
    await expect(nextBtn).toBeFocused()

    // スクリーンショット：最後のボタンにフォーカス
    await page.screenshot({
      path: path.join(screenshotsDir, "accessibility-tutorial-last-element.png")
    })

    // 8. Tabをもう1回押す -> (ループして最初の要素) Closeボタン(1) へフォーカスが移るはず
    await nextBtn.press("Tab")
    await expect(closeBtn).toBeFocused()

    // スクリーンショット：フォーカストラップでループして最初の要素に戻った状態
    await page.screenshot({
      path: path.join(screenshotsDir, "accessibility-tutorial-trapped-loop.png")
    })

    // 9. Closeボタン(1) で Shift+Tab を押す -> (ループして最後の要素) 次へボタン(4) へフォーカスが移るはず
    await closeBtn.press("Shift+Tab")
    await expect(nextBtn).toBeFocused()

    // 10. Close ボタンをクリックしてチュートリアルを終了する
    await closeBtn.click()

    // チュートリアルが閉じたことを確認
    await expect(tutorialContainer).not.toBeVisible()

    // 11. フォーカスがトリガー元の「ガイドを表示」ボタンに戻ることを確認
    await expect(guideBtn).toBeFocused({ timeout: 5000 })

    // スクリーンショット：終了後にフォーカスが戻った状態
    await page.screenshot({
      path: path.join(screenshotsDir, "accessibility-tutorial-return-focus.png")
    })
  })
})
