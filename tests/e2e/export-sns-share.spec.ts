import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Export SNS Share Affordance @J-EXPORT-SNS-SHARE", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should open export success modal on export, show share on X button, and close", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page for Export SNS Share test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed style cards in DB
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-export-test",
          name: "Export Test Card",
          promptSegments: [{ type: "text", value: "export test prompt" }],
          parameters: { ar: "16:9" },
          masking: {},
          tier: "Rare",
          dominantColor: "#f59e0b",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23f59e0b'/></svg>"
        }
      ])
    })

    // 3. Switch to Library tab to see the card
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // 4. Click the edit button to open CardDetailView
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click({ force: true })

    // Verify detail container is opened
    const detailContainer = spFrame.locator(
      "[data-testid='card-detail-view-container']"
    )
    await expect(detailContainer).toBeVisible()

    // 5. Click the Export button
    const exportButton = spFrame.locator("button:has-text('Export')").first()
    await expect(exportButton).toBeVisible()
    await exportButton.click({ force: true })

    // 6. Verify Export Success Modal is visible
    const successModal = spFrame.locator("#export-success-container")
    await expect(successModal).toBeVisible({ timeout: 10000 })

    // Verify metadata description text is present
    const metadataText = spFrame.locator("text=preserves prompt metadata")
    await expect(metadataText).toBeVisible()

    // Verify Share on X button is present
    const shareBtn = spFrame.locator("#export-success-share-btn")
    await expect(shareBtn).toBeVisible()

    // Capture screenshot of the modal
    await page.screenshot({
      path: path.join(screenshotsDir, "export-success-modal.png")
    })
    console.log("Screenshot taken: export-success-modal.png")

    // 7. Click Close button to close the modal
    const closeBtn = spFrame.locator("#export-success-close-btn")
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Verify modal is gone
    await expect(successModal).not.toBeVisible()

    console.log("Export SNS Share E2E test passed successfully!")
  })

  test("should trigger native navigator.share when sharing on supported platforms", async ({
    page
  }) => {
    await page.addInitScript(() => {
      const sharedDataList: any[] = []
      ;(window as any)._sharedDataList = sharedDataList
      if (window.navigator) {
        Object.defineProperty(window.navigator, "canShare", {
          writable: true,
          value: () => true
        })
        Object.defineProperty(window.navigator, "share", {
          writable: true,
          value: async (data: any) => {
            sharedDataList.push({
              title: data.title,
              text: data.text,
              url: data.url,
              hasFiles: !!(data.files && data.files.length > 0),
              fileName: data.files && data.files[0] ? data.files[0].name : null
            })
            return Promise.resolve()
          }
        })
      }
    })

    console.log("Navigating to sandbox page for Web Share API test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed style cards in DB
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "card-share-api-test",
          name: "Share API Card",
          promptSegments: [{ type: "text", value: "share api prompt" }],
          parameters: { ar: "16:9" },
          masking: {},
          tier: "Rare",
          dominantColor: "#f59e0b",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23f59e0b'/></svg>"
        }
      ])
    })

    // 3. Switch to Library tab to see the card
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await libraryTabButton.click()

    // 4. Click the edit button to open CardDetailView
    const editBtn = spFrame.locator("[data-testid='edit-card-button']").first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click({ force: true })

    // 5. Click the Export button
    const exportButton = spFrame.locator("button:has-text('Export')").first()
    await expect(exportButton).toBeVisible()
    await exportButton.click({ force: true })

    // 6. Verify Export Success Modal is visible
    const successModal = spFrame.locator("#export-success-container")
    await expect(successModal).toBeVisible({ timeout: 10000 })

    // 7. Click Share on X button (which now triggers navigator.share)
    const shareBtn = spFrame.locator("#export-success-share-btn")
    await expect(shareBtn).toBeVisible()
    await shareBtn.click()

    // 8. Verify navigator.share was called with the correct data
    const shareData: any = await spFrame.locator("body").evaluate(() => {
      return (window as any)._sharedDataList[0]
    })

    expect(shareData).toBeDefined()
    expect(shareData.title).toBe("Style Atelier Card")
    expect(shareData.hasFiles).toBe(true)
    expect(shareData.fileName).toBe("Share_API_Card.png")
  })
})
