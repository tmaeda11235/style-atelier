import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Parameter Alias i18n E2E Tests @J-ORGAN-UX-PARAM-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should show localized Parameter Alias edit modal and take screenshots", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Seed database
    await spFrame.locator("body").evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const database = (window as any).db
      for (let i = 0; i < 50; i++) {
        const count = await database.categories.count()
        if (count > 0) break
        await new Promise((r) => setTimeout(r, 100))
      }

      await database.styleCards.clear()
      await database.parameterAliases.clear()
      await database.parameterFolders.clear()

      await database.styleCards.add({
        id: "style-i18n-1",
        name: "Neon Forest",
        promptSegments: [{ type: "text", value: "mystic neon forest" }],
        parameters: {
          sref: ["https://example.com/forest.png"]
        },
        masking: {},
        tier: "Rare",
        dominantColor: "#a855f7",
        accentColor: "#ec4899",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='purple'/></svg>",
        isPinned: false
      })
    })
    console.log("Setting language to English...")
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible()
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()
    await langSelect.selectOption("en")
    const workbenchTab = spFrame
      .locator("[data-tutorial='workbench-tab']")
      .first()
    await expect(workbenchTab).toBeVisible()
    await workbenchTab.click()
    const gachaBtn = spFrame.locator("#workbench-gacha-btn").first()
    await expect(gachaBtn).toBeVisible()
    await gachaBtn.click()
    const srefEditBtn = spFrame.locator("button[title='Edit alias']").first()
    await expect(srefEditBtn).toBeVisible()
    await srefEditBtn.click()
    const modalHeaderEn = spFrame.locator("h4:has-text('Edit Parameter Alias')")
    await expect(modalHeaderEn).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('Folder / Category')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('Parameter Value')")
    ).toBeVisible()
    await expect(spFrame.locator("label:has-text('Alias Name')")).toBeVisible()
    await expect(spFrame.locator("button:has-text('Delete')")).toBeVisible()
    await expect(spFrame.locator("button:has-text('Save')")).toBeVisible()

    // Take English screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-alias-modal-en.png")
    })
    console.log("English Alias Modal screenshot saved.")

    // Cancel modal via X button
    const closeBtn = spFrame.locator(".w-80.shadow-2xl button").first()
    await closeBtn.click()
    console.log("Setting language to Japanese...")
    await settingsNavBtn.click()
    await langSelect.selectOption("ja")
    await workbenchTab.click()
    await expect(srefEditBtn).toBeVisible()
    await srefEditBtn.click()
    const modalHeaderJa = spFrame.locator(
      "h4:has-text('パラメータエイリアスの編集')"
    )
    await expect(modalHeaderJa).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('フォルダ / カテゴリ')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('パラメータ値')")
    ).toBeVisible()
    await expect(
      spFrame.locator("label:has-text('エイリアス名')")
    ).toBeVisible()
    await expect(spFrame.locator("button:has-text('削除')")).toBeVisible()
    await expect(spFrame.locator("button:has-text('保存')")).toBeVisible()

    // Take Japanese screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "parameter-alias-modal-ja.png")
    })
    console.log("Japanese Alias Modal screenshot saved.")

    // Close modal via X button
    await closeBtn.click()
  })
})
