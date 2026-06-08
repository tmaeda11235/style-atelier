/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs"
import path from "path"
import { expect, test } from "@playwright/test"
import QRCode from "qrcode"

import { compressCardData } from "../../src/lib/qr-utils"

test.describe("Style Atelier Sandbox E2E Tests - Data I/O @J-IO-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should allow exporting style card as image (QR output) @J-IO-QR-OUT", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    console.log("Navigating to sandbox page for QR Export E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Switch to Library tab
    const libraryTabBtn = spFrame.locator("button:has-text('Library')")
    await expect(libraryTabBtn).toBeVisible({ timeout: 10000 })
    await libraryTabBtn.click()

    // 3. Open Detail View of cyberpunk style card (mock-card-1)
    const cardEl = spFrame.locator("text=cyberpunk style").first()
    await expect(cardEl).toBeVisible({ timeout: 10000 })

    // Click edit/detail button specifically for the cyberpunk style card
    const targetCard = spFrame
      .locator("div.group")
      .filter({ hasText: "cyberpunk style" })
      .first()
    const editBtn = targetCard.locator("[data-testid='edit-card-button']")
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // 4. Test QR Export (Download card image)
    const exportBtn = spFrame.locator("[data-testid='export-card-button']")
    await expect(exportBtn).toBeVisible()

    console.log("Triggering QR Image Export...")
    const downloadPromise = page.waitForEvent("download")
    await exportBtn.click()
    const download = await downloadPromise

    // Verify file name has exported card name
    expect(download.suggestedFilename()).toContain("cyberpunk_style")
    console.log(
      `QR Export successful. File downloaded: ${download.suggestedFilename()}`
    )

    // Capture screenshot of Detail View before closing
    await page.screenshot({
      path: path.join(screenshotsDir, "qr-export-detail.png")
    })
  })

  test("should allow importing from QR code image (QR input) @J-IO-QR-IN", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    console.log("Navigating to sandbox page for QR Import E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Prepare a temporary QR image containing custom card data in Node.js
    const newCardData = {
      id: "qr-imported-card-111",
      name: "QR Imported Style",
      promptSegments: [
        { type: "text", value: "masterpiece, ultra detailed illustration" }
      ],
      parameters: { ar: "16:9", stylize: 250 },
      tier: "Epic",
      isFavorite: false,
      usageCount: 0,
      dominantColor: "#a855f7",
      accentColor: "#3b82f6",
      thumbnailData:
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'></svg>",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] }
    }

    const compressed = compressCardData(newCardData as any)
    const qrPayload = `web+styleatelier://import?data=${compressed}`
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 200 })

    // Extract the raw Base64 data
    const base64Data = qrDataUrl.split(",")[1]

    console.log("Simulating drag-and-drop of the generated QR Image...")
    const dropZone = spFrame.locator(".h-full.relative.overflow-hidden")

    // Evaluate in browser to decode base64 into a Blob and dispatch drop event
    await dropZone.evaluate(
      async (element, { base64Data }) => {
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: "image/png" })
        const file = new File([blob], "imported-qr-card.png", {
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

    // Verify toast notification for import success
    const toastMessage = spFrame.locator("text=QR Imported Style").first()
    await expect(toastMessage).toBeVisible({ timeout: 10000 })

    // Take screenshot showing the success toast
    await page.screenshot({
      path: path.join(screenshotsDir, "qr-import-success.png")
    })

    // Verify card is added to the database
    const cardInDb = await spFrame
      .locator("body")
      .evaluate(async (el, cardId) => {
        const database = (window as any).db
        return await database.getCard(cardId)
      }, newCardData.id)

    expect(cardInDb).toBeDefined()
    expect(cardInDb.name).toBe("QR Imported Style")
    expect(cardInDb.tier).toBe("Epic")
  })

  test("should allow exporting local database backup @J-IO-BACKUP", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    console.log("Navigating to sandbox page for Local Backup E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // 3. Test Local Export (Download JSON Backup)
    const exportBackupBtn = spFrame.locator("button:has-text('Export')")
    await expect(exportBackupBtn).toBeVisible()

    console.log("Triggering Local Database Export...")
    const downloadPromise = page.waitForEvent("download")
    await exportBackupBtn.click()
    const download = await downloadPromise

    // Verify JSON filename
    expect(download.suggestedFilename()).toContain("style-atelier-backup-")

    // Save to temp path to read its content
    const backupPath = path.join(
      __dirname,
      "../../tests/fixtures/temp-backup-1.json"
    )
    const fixturesDir = path.dirname(backupPath)
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true })
    }

    await download.saveAs(backupPath)

    // Read and verify backup content
    const backupContent = JSON.parse(fs.readFileSync(backupPath, "utf-8"))
    expect(backupContent.version).toBe(1)
    expect(backupContent.exportedAt).toBeDefined()
    expect(backupContent.data).toBeDefined()
    expect(backupContent.data.styleCards).toBeDefined()

    // Ensure Cyberpunk style is in backup
    const backupCards = backupContent.data.styleCards
    const cyberpunkCard = backupCards.find(
      (c: any) => c.name === "cyberpunk style"
    )
    expect(cyberpunkCard).toBeDefined()

    // Take screenshot of settings screen
    await page.screenshot({
      path: path.join(screenshotsDir, "local-backup-settings.png")
    })

    // Cleanup temp backup file
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  })

  test("should allow importing from local database backup @J-IO-RESTORE", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    console.log("Navigating to sandbox page for Local Restore E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // Prepare a mock database state to import
    const mockBackupPayload = {
      version: 1,
      exportedAt: Date.now(),
      data: {
        styleCards: [
          {
            id: "local-backup-card-777",
            name: "Backup Restored Card",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            promptSegments: [{ type: "text", value: "backup restored prompt" }],
            parameters: {},
            masking: { isSrefHidden: false, isPHidden: false },
            tier: "Legendary",
            isFavorite: false,
            usageCount: 0,
            tags: ["backup"],
            dominantColor: "#eab308",
            thumbnailData:
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'></svg>",
            frameId: "default",
            genealogy: { generation: 1, parentIds: [] }
          }
        ],
        categories: [],
        userSettings: [],
        historyItems: []
      }
    }

    const importFilePath = path.join(
      __dirname,
      "../../tests/fixtures/restore-test-1.json"
    )
    fs.writeFileSync(importFilePath, JSON.stringify(mockBackupPayload))

    // Set file input files to trigger import
    const fileInput = spFrame.locator("input[type='file']")

    // Handle the confirmation dialog that will appear
    const dialogConfirmBtn = spFrame.locator("#confirm-dialog-ok-btn")

    // Trigger the file selection on hidden file input
    const importBtn = spFrame.locator("button:has-text('Import')")
    await expect(importBtn).toBeVisible()

    await fileInput.setInputFiles(importFilePath)

    // Confirm dialog should appear
    await expect(dialogConfirmBtn).toBeVisible({ timeout: 10000 })

    // Take screenshot of the confirm dialog
    await page.screenshot({
      path: path.join(screenshotsDir, "local-restore-confirm.png")
    })

    await dialogConfirmBtn.click()

    // Verify Success notification
    const successToast = spFrame
      .locator("text=/restored|completed|インポート/i")
      .first()
    await expect(successToast).toBeVisible({ timeout: 10000 })

    await page.waitForTimeout(1000)

    const restoredCard = await spFrame
      .locator("body")
      .evaluate(async (el, cardId) => {
        const database = (window as any).db
        return await database.getCard(cardId)
      }, "local-backup-card-777")

    expect(restoredCard).toBeDefined()
    expect(restoredCard.name).toBe("Backup Restored Card")
    expect(restoredCard.tier).toBe("Legendary")

    // Cleanup restore-test-1.json
    if (fs.existsSync(importFilePath)) {
      fs.unlinkSync(importFilePath)
    }
  })
})
