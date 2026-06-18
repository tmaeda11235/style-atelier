import { expect, test } from "@playwright/test"

test.describe("Web Pages & Google Drive Integration @J-WEB-LP-01", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Google Identity Services script loading to prevent it from overwriting our window.google mock
    await page.route(
      "https://accounts.google.com/gsi/client",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "console.log('Mocked GSI Client loaded successfully');"
        })
      }
    )

    // Mock Google Identity Services (GIS)
    await page.addInitScript(() => {
      ;(window as any).google = {
        accounts: {
          oauth2: {
            initTokenClient: (config: any) => {
              return {
                requestAccessToken: () => {
                  if (config.callback) {
                    config.callback({
                      access_token: "mock-web-access-token"
                    })
                  }
                }
              }
            }
          }
        }
      }
    })

    // Mock Google Drive API
    await page.route("https://www.googleapis.com/**", async (route) => {
      const url = route.request().url()
      if (url.includes("files?q=")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ files: [] })
        })
      } else if (url.includes("uploadType=multipart")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "mock-temp-file-id-abc" })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({})
        })
      }
    })

    // Use relative path to support dynamic port allocation
    await page.goto("/src/web-app/index.html")
    await page.evaluate(() => {
      ;(window as any).__E2E_TEST__ = true
    })
  })

  test("should render the web app correctly", async ({ page }) => {
    // アプリのヘッダタイトルが表示されているか確認
    await expect(page.locator(".app-title")).toHaveText("STYLE ATELIER")

    // Fallbackカードがロードされているか確認
    await expect(page.locator("#cardTitleFront")).toHaveText("Cyber Samurai")

    // 裏面へフリップするコンテナをクリックするとフリップする
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

    await saveBtn.click()

    // トーストが表示されるか
    const toast = page.locator("#toast")
    await expect(toast).toHaveClass(/show/, { timeout: 15000 })

    // テキストに「保存」または「認証」が含まれているか
    const toastText = await toast.textContent()
    expect(toastText).toMatch(/保存|認証/)
  })
})
