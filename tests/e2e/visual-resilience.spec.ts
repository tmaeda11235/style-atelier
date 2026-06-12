import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Visual Resilience & Obstruction Avoidance @J-UX-RESILIENCE-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  // Helper function to assert that a target element is not obstructed by any overlays or layout overlaps.
  // It checks if the center point of the target element is matching the element returned by document.elementFromPoint.
  async function expectNotObstructed(locator: any, elementName: string) {
    await expect(locator).toBeVisible({ timeout: 5000 })
    const isObstructed = await locator.evaluate((el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      // Calculate center point of the element
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2

      // Get the topmost element at that point
      const topElement = document.elementFromPoint(x, y)
      if (!topElement) return true

      // If the topmost element is the element itself or is contained inside the element, it is not obstructed
      return !el.contains(topElement) && topElement !== el
    })
    expect(
      isObstructed,
      `${elementName} should not be obstructed by other elements`
    ).toBe(false)
  }

  test("should adapt layout without scrollbars and maintain element visibility at 320px and 400px widths", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Visual Resilience E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    const viewports = [400, 320]

    for (const width of viewports) {
      console.log(`Testing visual resilience at width: ${width}px...`)

      // Resize frame width
      await page.evaluate((w) => {
        const iframe = document.getElementById("sidepanel-frame")
        if (iframe) {
          iframe.style.width = `${w}px`
        }
      }, width)

      // Wait for layout updates
      await page.waitForTimeout(500)

      // ---- Tab 1: Library ----
      console.log("Checking Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await libraryTabButton.click()

      const searchInput = spFrame
        .locator("input[placeholder*='Search']")
        .first()
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Check no horizontal scroll on Library Tab (excluding potential temporary custom scrolls)
      const hasLibraryHorizontalScroll = await spFrame
        .locator("body")
        .evaluate((body) => {
          const html = document.documentElement
          return (
            body.scrollWidth > body.clientWidth ||
            html.scrollWidth > html.clientWidth
          )
        })
      expect(
        hasLibraryHorizontalScroll,
        `Library Tab should not have horizontal scrollbar at ${width}px`
      ).toBe(false)

      // Check key elements are not obstructed
      const toggleFiltersBtn = spFrame.locator(
        "[data-testid='toggle-filters-btn']"
      )
      await expectNotObstructed(toggleFiltersBtn, "Toggle Filters Button")
      await expectNotObstructed(searchInput, "Search Input")

      await page.screenshot({
        path: path.join(screenshotsDir, `resilience-library-${width}px.png`)
      })

      // ---- Tab 2: Workbench ----
      console.log("Checking Workbench tab...")
      const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
      await workbenchTabButton.click()
      await page.waitForTimeout(200)

      // Check no horizontal scroll on Workbench Tab
      const hasWorkbenchHorizontalScroll = await spFrame
        .locator("body")
        .evaluate((body) => {
          const html = document.documentElement
          return (
            body.scrollWidth > body.clientWidth ||
            html.scrollWidth > html.clientWidth
          )
        })
      expect(
        hasWorkbenchHorizontalScroll,
        `Workbench Tab should not have horizontal scrollbar at ${width}px`
      ).toBe(false)

      // In Workbench, check cauldron dropzone or other primary controls are not obstructed
      const cauldronDropzone = spFrame.locator(
        "[data-testid='cauldron-dropzone']"
      )
      if (await cauldronDropzone.isVisible().catch(() => false)) {
        await expectNotObstructed(cauldronDropzone, "Cauldron Dropzone")
      }

      await page.screenshot({
        path: path.join(screenshotsDir, `resilience-workbench-${width}px.png`)
      })

      // ---- Tab 3: Settings ----
      console.log("Checking Settings tab...")
      const settingsTabButton = spFrame.locator("#settings-nav-btn")
      await settingsTabButton.click()
      await expect(spFrame.locator("text=Expert Features")).toBeVisible({
        timeout: 5000
      })

      // Check no horizontal scroll on Settings Tab
      const hasSettingsHorizontalScroll = await spFrame
        .locator("body")
        .evaluate((body) => {
          const html = document.documentElement
          return (
            body.scrollWidth > body.clientWidth ||
            html.scrollWidth > html.clientWidth
          )
        })
      expect(
        hasSettingsHorizontalScroll,
        `Settings Tab should not have horizontal scrollbar at ${width}px`
      ).toBe(false)

      // Check key element in Settings (e.g. Easy Mode switch label)
      const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
      if (await easyModeToggle.isVisible().catch(() => false)) {
        await expectNotObstructed(easyModeToggle, "Easy Mode Toggle Option")
      }

      await page.screenshot({
        path: path.join(screenshotsDir, `resilience-settings-${width}px.png`)
      })
    }
  })
})
