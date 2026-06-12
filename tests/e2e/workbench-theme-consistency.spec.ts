/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Workbench Theme Consistency @J-WB-THEME-01", () => {
  test("should render workbench components consistently in light and dark modes", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Workbench Theme Consistency test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed a card with parameters and slots, and ensure it is pinned (so it goes to the Hand)
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.styleCards.bulkAdd([
        {
          id: "theme-test-card",
          name: "Theme Test Card",
          promptSegments: [
            { type: "text", value: "mythical dragon flying" },
            { type: "slot", label: "Color", default: "emerald green" }
          ],
          parameters: {
            sref: ["https://example.com/sref-theme-test"],
            p: ["yes"],
            imagePrompts: ["https://example.com/img-prompt-test"]
          },
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Rare",
          isPinned: true,
          dominantColor: "#10b981",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%2310b981'/></svg>",
          usageCount: 2
        }
      ])
    })

    // 3. Switch to Workbench tab
    const workbenchTabButton = spFrame.locator("button:has-text('Workbench')")
    await workbenchTabButton.click()

    // 4. Verify card container and editor components are visible
    const slotSectionHeader = spFrame.locator("text=Slot Variables")
    await expect(slotSectionHeader).toBeVisible({ timeout: 10000 })

    // Open Parameters Accordion
    const paramToggle = spFrame.locator(
      "[data-testid='parameter-editor-toggle']"
    )
    await expect(paramToggle).toBeVisible()
    // Check if it is closed or open, click if we want to toggle or if we want to ensure it is open
    // It defaults to open based on defaultOpen prop, let's verify if parameters content is visible
    const paramLabel = spFrame.locator("text=Personalization (--p)")
    await expect(paramLabel).toBeVisible()

    // 5. Take Light Mode Screenshot
    console.log("Saving light mode workbench screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-theme-light.png")
    })

    // 6. Switch to Dark Mode via document element class list evaluation
    console.log("Switching to Dark Mode...")
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.add("dark")
    })

    // Wait for styling transition to settle
    await page.waitForTimeout(500)

    // 7. Verify components still have the expected texts and values in Dark Mode
    await expect(slotSectionHeader).toBeVisible()
    await expect(paramLabel).toBeVisible()

    // 8. Take Dark Mode Screenshot
    console.log("Saving dark mode workbench screenshot...")
    await page.screenshot({
      path: path.join(screenshotsDir, "workbench-theme-dark.png")
    })

    // Clean up theme state (switch back to default light mode by removing dark class)
    await spFrame.locator("body").evaluate(() => {
      document.documentElement.classList.remove("dark")
    })
  })
})
