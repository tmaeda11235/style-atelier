import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E Tests - Interactive Elements Overlap Detection @J-UX-OVERLAP-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should check that interactive elements are not obscured or overlapped by other elements", async ({
    page
  }) => {
    // Set longer timeout for setup and execution
    test.setTimeout(60 * 1000)

    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Welcome dialog skip
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Helper function to check if the element's center point is visible (not obscured)
    const checkOverlap = async (locator: any, name: string) => {
      await expect(locator).toBeVisible({ timeout: 10000 })
      await locator.scrollIntoViewIfNeeded()
      // Wait a tiny bit for scrolling to complete
      await page.waitForTimeout(100)

      const result = await locator.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ block: "center", inline: "center" })
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          return { success: false, reason: "Element has zero width or height" }
        }
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const doc = el.ownerDocument
        const elementAtPoint = doc.elementFromPoint(centerX, centerY)

        if (!elementAtPoint) {
          return {
            success: false,
            reason: `No element found at point (${centerX}, ${centerY})`
          }
        }

        // The element or its descendant or parent is at point
        const isAtPoint =
          el.contains(elementAtPoint) ||
          elementAtPoint === el ||
          elementAtPoint.contains(el)
        return {
          success: isAtPoint,
          tagName: elementAtPoint.tagName,
          id: elementAtPoint.id,
          className: elementAtPoint.className,
          reason: isAtPoint
            ? null
            : `Obscured by <${elementAtPoint.tagName.toLowerCase()}> with id="${elementAtPoint.id}" class="${elementAtPoint.className}"`
        }
      })

      console.log(`Checking overlap for ${name}:`, result)
      expect(
        result.success,
        `Element "${name}" is obscured: ${result.reason}`
      ).toBe(true)
    }

    // --- Scenario 1: Library Tab and Card Actions ---
    console.log("Testing Scenario 1: Library Tab & Card Actions")
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await checkOverlap(libraryTabButton, "Library Tab Button")
    await libraryTabButton.click()

    // Search bar
    const searchInput = spFrame.locator("input[placeholder*='Search']").first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await checkOverlap(searchInput, "Library Search Input")

    // Filter toggle button
    const toggleFiltersBtn = spFrame.locator(
      "[data-testid='toggle-filters-btn']"
    )
    await checkOverlap(toggleFiltersBtn, "Toggle Filters Button")

    // Hover card to show action buttons
    const firstCard = spFrame.locator(".card-thumbnail-container").first()
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Hovering card container to reveal actions...")
      await firstCard.hover()
      // Wait a bit for CSS transitions if any
      await page.waitForTimeout(500)

      // Check edit, share, and pin buttons
      const editBtn = spFrame
        .locator("[data-testid='edit-card-button']")
        .first()
      await checkOverlap(editBtn, "Edit Card Button")

      const pinBtn = spFrame.locator("[data-testid='pin-card-button']").first()
      await checkOverlap(pinBtn, "Pin Card Button")

      const shareBtn = spFrame
        .locator("[data-testid='share-card-button']")
        .first()
      await checkOverlap(shareBtn, "Share Card Button")

      const injectBtn = spFrame
        .locator("[data-testid='inject-card-button']")
        .first()
      await checkOverlap(injectBtn, "Inject Card Button")
    }

    // --- Scenario 2: Filters Accordion ---
    console.log("Testing Scenario 2: Filters Accordion")
    await toggleFiltersBtn.click()
    const filtersAccordion = spFrame.locator(
      "[data-testid='filters-accordion']"
    )
    await expect(filtersAccordion).toBeVisible({ timeout: 5000 })
    await checkOverlap(filtersAccordion, "Filters Accordion")

    const closeFiltersBtn = spFrame.locator("[data-testid='close-filters-btn']")
    await checkOverlap(closeFiltersBtn, "Close Filters Button")

    // Capture screenshot of the opened filters accordion
    await page.screenshot({
      path: path.join(screenshotsDir, "filters-accordion-open.png")
    })

    await closeFiltersBtn.click()
    await expect(filtersAccordion).not.toBeVisible({ timeout: 5000 })

    // --- Scenario 3: Workbench Tab ---
    console.log("Testing Scenario 3: Workbench Tab")
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await checkOverlap(workbenchTabButton, "Workbench Tab Button")
    await workbenchTabButton.click()

    // Cauldron zone
    const cauldronZone = spFrame.locator("[data-testid='cauldron-dropzone']")
    const clearAllBtn = spFrame.locator("button:has-text('Clear All')")
    if (await clearAllBtn.isVisible().catch(() => false)) {
      console.log("Clearing workbench cards to reveal Cauldron Dropzone...")
      await clearAllBtn.click()
      await page.waitForTimeout(500)
    }
    await expect(cauldronZone).toBeVisible({ timeout: 10000 })
    await checkOverlap(cauldronZone, "Cauldron Dropzone")

    // Slot zones
    const styleSlot = spFrame.locator("[data-testid='slot-zone-Style']")
    if (await styleSlot.isVisible().catch(() => false)) {
      await checkOverlap(styleSlot, "Style Slot Zone")
    }

    const subjectSlot = spFrame.locator("[data-testid='slot-zone-Subject']")
    if (await subjectSlot.isVisible().catch(() => false)) {
      await checkOverlap(subjectSlot, "Subject Slot Zone")
    }

    // Capture screenshot of the workbench tab
    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-tab-overlap-check.png")
    })
  })
})
