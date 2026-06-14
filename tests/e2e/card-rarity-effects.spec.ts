import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Card Rarity Effects E2E Tests @J-ORG-CARD-HOLO-EFFECT-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should apply 3D tilt and hologram effects on Epic and Legendary cards when hovered", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Clear database and seed Epic/Legendary cards
    console.log("Seeding styleCards...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()

      // Seed an Epic card
      await database.styleCards.put({
        id: "epic-card-1",
        name: "Epic Neon Cyberpunk",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [{ type: "text", value: "cyberpunk city neon lights" }],
        parameters: { stylize: 500, ar: "16:9" },
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Epic",
        isFavorite: false,
        usageCount: 2,
        tags: ["cyberpunk", "neon"],
        dominantColor: "#a855f7",
        accentColor: "#ec4899",
        thumbnailData:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+Z+hHgAEtQI4Sg2x5AAAAABJRU5ErkJggg==",
        frameId: "default",
        genealogy: { generation: 1, parentIds: [] }
      })

      // Seed a Legendary card
      await database.styleCards.put({
        id: "legendary-card-1",
        name: "Legendary Golden Forest",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [
          { type: "text", value: "golden forest cinematic lighting" }
        ],
        parameters: { stylize: 1000, chaos: 30 },
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Legendary",
        isFavorite: false,
        usageCount: 5,
        tags: ["golden", "forest"],
        dominantColor: "#eab308",
        accentColor: "#fbbf24",
        thumbnailData:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+Z+hHgAEtQI4Sg2x5AAAAABJRU5ErkJggg==",
        frameId: "default",
        genealogy: { generation: 2, parentIds: ["epic-card-1"] }
      })
    })

    console.log("Switching to Library tab...")
    const libraryTabButton = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabButton).toBeVisible({ timeout: 10000 })
    await libraryTabButton.click()

    // Wait for the seeded cards to appear
    console.log("Waiting for cards grid...")
    const epicCard = spFrame
      .locator(".group", { hasText: "Epic Neon Cyberpunk" })
      .first()
    await expect(epicCard).toBeVisible({ timeout: 10000 })

    // Hover Epic card and verify 3D tilt classes and CSS variables
    console.log("Hovering Epic card...")
    const epicThumbnail = epicCard.locator(".card-thumbnail-container").first()
    await expect(epicThumbnail).toBeVisible()

    // Hover card at specific coordinates to trigger tilt math
    const boundingBox = await epicThumbnail.boundingBox()
    if (boundingBox) {
      // Hover at 20% width and 30% height from top-left
      await page.mouse.move(
        boundingBox.x + boundingBox.width * 0.2,
        boundingBox.y + boundingBox.height * 0.3
      )
      await page.waitForTimeout(300) // wait for transform transition

      // Check if transform-style & inline style containing transform is applied
      const hoveredStyle = await epicThumbnail.getAttribute("style")
      expect(hoveredStyle).toContain("transform")
      expect(hoveredStyle).toContain("--mouse-x")
      expect(hoveredStyle).toContain("--mouse-y")

      // Verify the hologram overlay is present
      const holoOverlay = epicThumbnail.locator(".holo-card-overlay")
      await expect(holoOverlay).toBeVisible()
      await expect(holoOverlay).toHaveClass(/holo-epic/)

      // Capture Epic Card Hover Screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, "card-epic-holo-hover.png")
      })
      console.log("Captured Epic card hover screenshot.")
    }

    // Now test Legendary Card
    console.log("Testing Legendary card...")
    const legendaryCard = spFrame
      .locator(".group", { hasText: "Legendary Golden Forest" })
      .first()
    await expect(legendaryCard).toBeVisible({ timeout: 10000 })
    const legendaryThumbnail = legendaryCard
      .locator(".card-thumbnail-container")
      .first()

    const legendaryBoundingBox = await legendaryThumbnail.boundingBox()
    if (legendaryBoundingBox) {
      await page.mouse.move(
        legendaryBoundingBox.x + legendaryBoundingBox.width * 0.8,
        legendaryBoundingBox.y + legendaryBoundingBox.height * 0.7
      )
      await page.waitForTimeout(300)

      const hoveredStyle = await legendaryThumbnail.getAttribute("style")
      expect(hoveredStyle).toContain("transform")
      expect(hoveredStyle).toContain("--mouse-x")
      expect(hoveredStyle).toContain("--mouse-y")

      // Verify holo and glitter overlays are present
      const holoOverlay = legendaryThumbnail.locator(".holo-card-overlay")
      await expect(holoOverlay).toBeVisible()
      await expect(holoOverlay).toHaveClass(/holo-legendary/)

      const glitterOverlay = legendaryThumbnail.locator(".glitter-overlay")
      await expect(glitterOverlay).toBeVisible()

      // Capture Legendary Card Hover Screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, "card-legendary-glitter-hover.png")
      })
      console.log("Captured Legendary card hover screenshot.")
    }

    // Leave hover
    await page.mouse.move(0, 0)
    await page.waitForTimeout(500) // Wait for smooth transition reset

    const resetStyle = await epicThumbnail.getAttribute("style")
    expect(resetStyle).toContain("rotateX(0deg)")

    console.log(
      "Card rarity premium visual effects E2E test passed successfully!"
    )
  })
})
