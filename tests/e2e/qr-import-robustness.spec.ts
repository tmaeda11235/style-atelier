import fs from "fs"
import path from "path"
import { expect, test } from "@playwright/test"
import QRCode from "qrcode"

import { compressCardData } from "../../src/shared/lib/qr-utils"

test.describe("Style Atelier Sandbox E2E Tests - QR Import Robustness @J-IO-QR-IN-ROBUST", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should handle huge images (>4096px) without crashing and import successfully", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    console.log("Navigating to sandbox page for Huge QR Image Import...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    const newCardData = {
      id: "huge-image-card-999",
      name: "Huge QR Imported Style",
      promptSegments: [
        { type: "text", value: "masterpiece, anime girl in forest" }
      ],
      parameters: { ar: "1:1", stylize: 100 },
      tier: "Legendary",
      isFavorite: true,
      usageCount: 0,
      dominantColor: "#059669",
      accentColor: "#10b981",
      thumbnailData:
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'></svg>",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] }
    }

    const compressed = compressCardData(newCardData as any)
    const qrPayload = `web+styleatelier://import?data=${compressed}`
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 200 })
    const base64Data = qrDataUrl.split(",")[1]

    const dropZone = spFrame.locator(".h-full.relative.overflow-hidden")

    console.log("Simulating huge image QR code drag-and-drop in browser...")
    await dropZone.evaluate(
      async (element, { base64Data }) => {
        const img = new Image()
        const p = new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
        })
        img.src = "data:image/png;base64," + base64Data
        await p

        const canvas = document.createElement("canvas")
        canvas.width = 4096
        canvas.height = 4096
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, 4096, 4096)
          ctx.drawImage(img, 4096 - 1500, 4096 - 1500, 1200, 1200)
        }

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        )
        if (!blob) throw new Error("Failed to create blob from huge canvas")

        const file = new File([blob], "huge-qr-card.png", {
          type: "image/png"
        })

        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        const dragOverEvent = new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer
        })
        element.dispatchEvent(dragOverEvent)

        const dropEvent = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer
        })
        element.dispatchEvent(dropEvent)
      },
      { base64Data }
    )

    const toastMessage = spFrame.locator("text=Huge QR Imported Style").first()
    await expect(toastMessage).toBeVisible({ timeout: 20000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "qr-import-huge-image.png")
    })

    const cardInDb = await spFrame
      .locator("body")
      .evaluate(async (el, cardId) => {
        const database = (window as any).db
        return await database.getCard(cardId)
      }, newCardData.id)

    expect(cardInDb).toBeDefined()
    expect(cardInDb.name).toBe("Huge QR Imported Style")
  })

  test("should handle corrupted images gracefully without crashing and display error toast", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    console.log("Navigating to sandbox page for Corrupted QR Image Import...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    const dropZone = spFrame.locator(".h-full.relative.overflow-hidden")

    console.log("Simulating corrupted image drop...")
    await dropZone.evaluate(async (element) => {
      const corruptedBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xff, 0xff, 0xff,
        0x74, 0x45, 0x58, 0x74, 0x00, 0x00, 0x00, 0x00
      ])
      const blob = new Blob([corruptedBytes], { type: "image/png" })
      const file = new File([blob], "corrupted-card.png", {
        type: "image/png"
      })

      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)

      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      element.dispatchEvent(dragOverEvent)

      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      element.dispatchEvent(dropEvent)
    })

    const errorToast = spFrame
      .locator("text=/Could not detect|QRコードが検出/")
      .first()
    await expect(errorToast).toBeVisible({ timeout: 15000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "qr-import-corrupted-error.png")
    })
  })
})
