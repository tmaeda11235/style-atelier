import { expect, test } from "@playwright/test"

test.describe("Mobile Pages & Google Drive Integration", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Viteのローカルサーバー（モバイル用は dev:mobile）またはルートでホストされている想定
    // e2eテスト時は設定された baseURL を使用
    await page.goto(`${baseURL}/src/mobile-app/`)
  })

  test("should render the mobile app correctly", async ({ page }) => {
    // アプリのヘッダタイトルが表示されているか確認
    await expect(page.locator(".app-title")).toHaveText("STYLE ATELIER")

    // Fallbackカードがロードされているか確認
    await expect(page.locator("#cardTitleFront")).toHaveText("Cyber Samurai")

    // 裏面へフリップするボタン等はないが、コンテナをクリックするとフリップする
    await page.locator("#cardContainer").click()
    await expect(page.locator("#cardContainer")).toHaveClass(/is-flipped/)
  })

  test("should trigger google identity services on cloud save click", async ({
    page
  }) => {
    // 裏面に切り替え
    await page.locator("#cardContainer").click()

    // クラウド保存ボタンをクリック
    const saveBtn = page.locator("#saveCloudBtn")
    await expect(saveBtn).toBeVisible()

    // GIS スクリプトが読み込まれる前にクリックした場合のエラー（または設定不足のトースト）を確認
    // VITE_GOOGLE_CLIENT_ID が設定されていない環境だとトーストが出るはず
    await saveBtn.click()

    // トーストが表示されるか（エラー時は設定不足、または保存中のいずれか）
    const toast = page.locator("#toast")
    await expect(toast).toHaveClass(/show/)

    // テキストに「保存」が含まれているか
    const toastText = await toast.textContent()
    expect(toastText).toMatch(/保存/)
  })
})
