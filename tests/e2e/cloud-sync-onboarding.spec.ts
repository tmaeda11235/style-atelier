import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Mobile Temp Data Sync @J-MOB-01", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Google APIs globally for settings tests to prevent 401 retries
    await page.route("https://www.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({})
      })
    })

    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
    page.on("requestfailed", (request) => {
      console.error(
        `[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`
      )
    })
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`)
      }
    })

    // Mock WebGPU support by default to prevent Download Model button from being disabled in Settings tests
    await page.addInitScript(() => {
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    })
  })

  test("should automatically check, merge mobile temp data from GDrive and show notification", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Mock Google Drive API response to detect 'temp_shared_cards.json'
    await page.route(
      "https://www.googleapis.com/drive/v3/files?q=name%20%3D%20%27temp_shared_cards.json%27%20and%20trashed%20%3D%20false&fields=files(id,name)&spaces=appDataFolder",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "mock-temp-file-id-abc",
                name: "temp_shared_cards.json"
              }
            ]
          })
        })
      }
    )

    // Mock downloading the temp file
    const mockDbDump = {
      version: 1,
      exportedAt: Date.now(),
      data: {
        styleCards: [
          {
            id: "card-mobile-sync-test",
            name: "Mobile Sync Test Card",
            promptSegments: [
              {
                id: "seg-1",
                value: "neon cyberpunk samurai",
                isSlot: false,
                slotName: "",
                type: "text"
              }
            ],
            parameters: {},
            masking: {
              isSrefHidden: false,
              isPHidden: false
            },
            tier: "Epic",
            isFavorite: false,
            usageCount: 0,
            tags: ["mobile-sync"],
            dominantColor: "#ff00ff",
            thumbnailData:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            frameId: "frame-default",
            genealogy: {
              generation: 0,
              parentIds: []
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ],
        categories: [],
        userSettings: [],
        historyItems: [],
        slotHistory: []
      }
    }

    await page.route(
      "https://www.googleapis.com/drive/v3/files/mock-temp-file-id-abc?alt=media",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDbDump)
        })
      }
    )

    // Mock deleting the temp file after merge
    await page.route(
      "https://www.googleapis.com/drive/v3/files/mock-temp-file-id-abc",
      async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({})
          })
        } else {
          await route.continue()
        }
      }
    )

    // Initialize local state: enable sync, but do not enable auto-sync so we can test init logic
    await page.addInitScript(() => {
      window.localStorage.setItem("style-atelier-sync-enabled", "true")
      window.localStorage.setItem("style-atelier-auto-sync-enabled", "false")
    })

    console.log(
      "Navigating to sandbox page for Mobile Temp Data Sync E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Wait for the notification banner to appear
    console.log("Waiting for restore success notification banner...")
    const bannerCloseBtn = spFrame.locator("#dismiss-import-notification-btn")
    await expect(bannerCloseBtn).toBeVisible({ timeout: 15000 })

    // Verify the text content of the notification
    const bannerText = spFrame.locator(".ring-2.ring-blue-500\\/80")
    await expect(bannerText).toBeVisible()
    const content = await bannerText.textContent()
    console.log("Banner notification text:", content)
    expect(content).toMatch(
      /モバイルのお試し保存カードを復元しました|Successfully restored mobile shared cards/
    )

    // 3. Take a screenshot showing the notification banner
    console.log(
      "Taking screenshot of the restore success notification banner..."
    )
    await page.screenshot({
      path: path.join(screenshotsDir, "mobile-restore-success.png")
    })

    // 4. Verify that the card has been successfully merged into the IndexedDB
    const cardExists = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (!database) return false
      const card = await database.styleCards.get("card-mobile-sync-test")
      return card && card.name === "Mobile Sync Test Card"
    })
    expect(cardExists).toBe(true)
    console.log(
      "E2E verification of mobile temp data merge passed successfully!"
    )
  })
})
