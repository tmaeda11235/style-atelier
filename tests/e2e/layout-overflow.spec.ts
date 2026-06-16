import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Layout Overflow Validation @J-LAYOUT-OVERFLOW", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  // Validate layout at minimum expected viewport widths
  const testWidths = [320, 400]

  for (const width of testWidths) {
    test(`should not have horizontal overflow or layout break at ${width}px width`, async ({
      page
    }) => {
      const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
      console.log(
        `Navigating to sandbox page for layout overflow validation at ${width}px...`
      )
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // 1. Skip welcome dialog
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click()
      }

      // 2. Set sidepanel width to target width
      console.log(`Setting sidepanel-frame width to ${width}px...`)
      await page.evaluate((w) => {
        const iframe = document.getElementById("sidepanel-frame")
        if (iframe) {
          iframe.style.width = `${w}px`
        }
      }, width)

      // Helper function to verify no horizontal scrollbar
      const verifyNoHorizontalScrollbar = async (viewName: string) => {
        const isHorizontalScrollbarPresent = await spFrame
          .locator("body")
          .evaluate(() => {
            // Check scroll width vs client width of typical root layout containers
            const selectors = ["#root", "body", "html", ".h-screen"]
            for (const sel of selectors) {
              const el = document.querySelector(sel)
              if (el && el.scrollWidth > el.clientWidth) {
                console.warn(
                  `[Overflow Found] ${sel} has scrollWidth: ${el.scrollWidth}, clientWidth: ${el.clientWidth}`
                )
                return true
              }
            }
            return false
          })
        expect(isHorizontalScrollbarPresent).toBe(false)
        console.log(
          `Verified: No horizontal scrollbar in ${viewName} at ${width}px`
        )

        // Capture screenshot of the view state
        const sanitizedName = viewName.toLowerCase().replace(/\s+/g, "-")
        await page.screenshot({
          path: path.join(
            screenshotsDir,
            `layout-${sanitizedName}-${width}px.png`
          ),
          fullPage: false
        })
        console.log(`Screenshot for ${viewName} at ${width}px saved.`)
      }

      // --- 1. Library Tab (Default or click tab) ---
      console.log("Validating Library Tab...")
      const libraryTabButton = spFrame
        .locator(
          "button:has-text('Library'), nav button:has-text('ライブラリ')"
        )
        .first()
      await expect(libraryTabButton).toBeVisible({ timeout: 10000 })
      await libraryTabButton.click()
      await page.waitForTimeout(500)
      await verifyNoHorizontalScrollbar("Library Tab")

      // --- 2. Workbench Tab (Empty State & Active State) ---
      console.log("Validating Workbench Tab (Empty State)...")
      const workbenchTabButton = spFrame
        .locator(
          "button:has-text('Workbench'), nav button:has-text('ワークベンチ')"
        )
        .first()
      await expect(workbenchTabButton).toBeVisible({ timeout: 10000 })
      await workbenchTabButton.click()
      await page.waitForTimeout(500)
      await verifyNoHorizontalScrollbar("Workbench Empty State")

      // Add a card to Workbench from HandBar to activate parameter editors
      console.log(
        "Adding mock card from HandBar to Workbench to test Active Workbench state..."
      )
      const mockCardInHand = spFrame
        .locator("#handbar-root .cursor-pointer")
        .nth(1)
      await expect(mockCardInHand).toBeVisible({ timeout: 10000 })
      await mockCardInHand.click({ force: true })
      await page.waitForTimeout(500)
      await verifyNoHorizontalScrollbar("Workbench Active State")

      // --- 3. Settings Tab ---
      console.log("Validating Settings Tab...")
      const settingsNavBtn = spFrame
        .locator(
          "#settings-nav-btn, button[title='Settings'], button[title='設定']"
        )
        .first()
      await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
      await settingsNavBtn.click()
      await page.waitForTimeout(500)
      await verifyNoHorizontalScrollbar("Settings Tab")

      // --- 4. Minting View ---
      console.log("Validating Minting View...")
      // Go to History tab first
      const historyNavBtn = spFrame
        .locator(
          "button[title='History'], nav button:has-text('History'), nav button:has-text('履歴')"
        )
        .first()
      await expect(historyNavBtn).toBeVisible({ timeout: 10000 })
      await historyNavBtn.click()

      // Add mock history item
      await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        await database.historyItems.clear()
        await database.historyItems.add({
          id: "layout-test-history-item",
          fullCommand: "a beautiful fantasy landscape --ar 16:9",
          imageUrl:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'><rect width='100' height='100' fill='green'/></svg>",
          timestamp: Date.now()
        })
      })

      // Click Mint Card button
      const mintCardBtn = spFrame
        .locator(
          "button:has-text('Mint Card'), button:has-text('カードをミント')"
        )
        .first()
      await expect(mintCardBtn).toBeVisible({ timeout: 10000 })
      await mintCardBtn.click()

      // Wait for MintingView to open
      const mintingView = spFrame.locator(
        "[data-testid='minting-view-container']"
      )
      await expect(mintingView).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(500)
      await verifyNoHorizontalScrollbar("Minting View")
    })
  }
})
