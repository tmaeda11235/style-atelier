/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier E2E - Parameter Alias and Gacha Pick Feature @J-ORGAN-UX-PARAM-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should seed cards, test Gacha Pick, and parameter alias modal workflows", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Parameter Alias and Gacha Pick E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed database
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      // Wait for default sandbox seeding to complete
      for (let i = 0; i < 50; i++) {
        const count = await database.categories.count()
        if (count > 0) break
        await new Promise((r) => setTimeout(r, 100))
      }

      await database.styleCards.clear()
      await database.parameterAliases.clear()
      await database.parameterFolders.clear()

      await database.styleCards.bulkAdd([
        {
          id: "style-gacha-1",
          name: "Nebula Synth",
          promptSegments: [
            { type: "text", value: "synthwave celestial nebula" }
          ],
          parameters: {
            sref: ["https://example.com/nebula.png"],
            p: ["nebula-codes"]
          },
          masking: {},
          tier: "Epic",
          isPinned: false,
          dominantColor: "#8b5cf6",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='purple'/></svg>"
        },
        {
          id: "style-gacha-2",
          name: "Cyber Neon",
          promptSegments: [{ type: "text", value: "cyberpunk skyline rain" }],
          parameters: {
            sref: ["https://example.com/cyber.png"],
            p: ["cyber-p-code"]
          },
          masking: {},
          tier: "Rare",
          isPinned: false,
          dominantColor: "#06b6d4",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='cyan'/></svg>"
        }
      ])
    })

    const workbenchTab = spFrame
      .locator("[data-tutorial='workbench-tab']")
      .first()
    await expect(workbenchTab).toBeVisible({ timeout: 5000 })
    await workbenchTab.click()

    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-gacha-empty-workbench.png")
    })

    // 4. Test Gacha Pick button
    const gachaBtn = spFrame.locator("#workbench-gacha-btn").first()
    await expect(gachaBtn).toBeVisible({ timeout: 5000 })
    await gachaBtn.click()

    // Assert shuffling overlay appears
    const shuffleOverlay = spFrame.locator("text=SHUFFLING RECIPE...").first()
    await expect(shuffleOverlay).toBeVisible({ timeout: 2000 })

    // Take screenshot during Shuffle animation
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-gacha-during-shuffle.png")
    })

    const cauldronCards = spFrame.locator(".animate-float-gentle")
    await expect(cauldronCards.first()).toBeVisible({ timeout: 5000 })

    // Take screenshot after Gacha Pick has seeded cards in Cauldron
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-gacha-after-pick.png")
    })

    // 4. Test Parameter Editor - open alias editing modal
    const srefEditBtn = spFrame.locator("button[title='Edit alias']").first()
    await expect(srefEditBtn).toBeVisible({ timeout: 5000 })
    await srefEditBtn.click()

    // Enter alias details
    const aliasInput = spFrame
      .locator("input[placeholder='My Custom Style']")
      .first()
    await expect(aliasInput).toBeVisible({ timeout: 5000 })
    await aliasInput.fill("Mega Cyber Style")

    // Create new folder
    const folderSelect = spFrame.locator("select").first()
    await folderSelect.selectOption("__new__")

    const folderInput = spFrame
      .locator("input[placeholder='Enter new folder name']")
      .first()
    await expect(folderInput).toBeVisible()
    await folderInput.fill("Cyberpunk Styles")

    // Save alias
    const saveBtn = spFrame.locator("button:has-text('Save')").first()
    await saveBtn.click()
    const updatedBadge = spFrame.locator("text=Mega Cyber Style").first()
    await expect(updatedBadge).toBeVisible({ timeout: 5000 })

    // Hover tooltip (Used in Styles) preview validation
    const badgeContainer = spFrame.locator("div.group\\/badge").first()
    await badgeContainer.hover()

    const tooltipHeader = spFrame.locator("text=Used in Styles:").first()
    await expect(tooltipHeader).toBeVisible()

    // Take screenshot of alias updated & tooltip hover
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "parameter-alias-badge-and-hover-tooltip.png"
      )
    })
  })
})
