import path from "path"
import { expect, test } from "@playwright/test"

test.describe("P2P Synchronization E2E Tests @J-PWA-P2P-SYNC-01", () => {
  test.beforeEach(async ({ page }) => {
    // Mock WebGPU support globally to avoid issues with standard device constraints
    await page.addInitScript(() => {
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    })
  })

  test("should synchronize data between host and guest via WebRTC", async ({
    browser,
    baseURL
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Create two separate browser contexts to simulate Host and Guest devices
    const contextHost = await browser.newContext({ baseURL })
    const contextGuest = await browser.newContext({ baseURL })

    const port = process.env.SIGNALING_PORT || "9000"

    // Inject signaling port and WebGPU mock to both contexts
    await contextHost.addInitScript((sigPort) => {
      ;(window as any).__SIGNALING_PORT = sigPort
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    }, port)

    await contextGuest.addInitScript((sigPort) => {
      ;(window as any).__SIGNALING_PORT = sigPort
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    }, port)

    const pageHost = await contextHost.newPage()
    const pageGuest = await contextGuest.newPage()

    // Add console and error listeners to inspect browser states
    const setupLogging = (page: any, name: string) => {
      page.on("console", (msg: any) => {
        console.log(`[${name} CONSOLE] ${msg.type()}: ${msg.text()}`)
      })
      page.on("pageerror", (err: any) => {
        console.error(`[${name} ERROR] ${err.message}\n${err.stack}`)
      })
    }
    setupLogging(pageHost, "HOST")
    setupLogging(pageGuest, "GUEST")

    // 1. Navigate to the sandbox page on both Host and Guest
    await pageHost.goto("/tests/sandbox/index.html")
    await pageGuest.goto("/tests/sandbox/index.html")

    const frameHost = pageHost.frameLocator("#sidepanel-frame")
    const frameGuest = pageGuest.frameLocator("#sidepanel-frame")

    // Welcome dialog bypass if visible
    const skipHost = frameHost.locator("#welcome-skip-btn")
    if (await skipHost.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipHost.click()
    }
    const skipGuest = frameGuest.locator("#welcome-skip-btn")
    if (await skipGuest.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipGuest.click()
    }

    // 2. Initialize database state
    // Guest starts with a custom test stylecard and OPFS image. Host starts with a clean database.
    await frameGuest.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()
      await database.styleCards.add({
        id: "p2p-test-card-1",
        name: "Synced Card via E2E P2P",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [],
        parameters: {},
        masking: {},
        tier: "Legendary",
        tags: ["p2p-test"],
        dominantColor: "#00ff00",
        imageUrl: "opfs:///images/p2p-test-image.png",
        thumbnailData: ""
      })

      // Write dummy OPFS image
      const root = await navigator.storage.getDirectory()
      const imagesDir = await root.getDirectoryHandle("images", {
        create: true
      })
      const fileHandle = await imagesDir.getFileHandle("p2p-test-image.png", {
        create: true
      })
      const writable = await fileHandle.createWritable()
      const dummyData = new Uint8Array([
        71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255,
        33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 76, 1,
        0, 59
      ])
      await writable.write(dummyData)
      await writable.close()
    })

    await frameHost.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()
    })

    // 3. Open Settings Tab on both sides
    const settingsBtnHost = frameHost.locator("#settings-nav-btn")
    await settingsBtnHost.click()
    const settingsBtnGuest = frameGuest.locator("#settings-nav-btn")
    await settingsBtnGuest.click()

    // 4. Open P2P Sync Accordion
    const p2pAccordionHost = frameHost.locator("#settings-accordion-p2p")
    await expect(p2pAccordionHost).toBeVisible()
    await p2pAccordionHost.click()

    const p2pAccordionGuest = frameGuest.locator("#settings-accordion-p2p")
    await expect(p2pAccordionGuest).toBeVisible()
    await p2pAccordionGuest.click()

    // Capture screenshot of idle state
    await pageHost.screenshot({
      path: path.join(screenshotsDir, "p2p-sync-idle.png")
    })

    // 5. Start Host Mode (Receive on PC)
    // Find the host button supporting both English and Japanese localization
    const receiveBtn = frameHost.locator(
      "button:has-text('Receive on PC'), button:has-text('PCで受信')"
    )
    await expect(receiveBtn).toBeVisible()
    await receiveBtn.click()

    // Wait until QR Code img or the window.__lastSyncUrl is populated
    await frameHost
      .locator("img[alt='Sync QR Code']")
      .waitFor({ state: "visible", timeout: 10000 })

    const syncUrl = await frameHost.locator("body").evaluate(() => {
      return (window as any).__lastSyncUrl
    })
    expect(syncUrl).toBeTruthy()

    // Capture screenshot of Host showing the QR Code
    await pageHost.screenshot({
      path: path.join(screenshotsDir, "p2p-sync-host-qr.png")
    })

    // 6. Start Guest Mode (Send from Mobile)
    const sendBtn = frameGuest.locator(
      "button:has-text('Send from Mobile'), button:has-text('モバイルから送信')"
    )
    await expect(sendBtn).toBeVisible()
    await sendBtn.click()

    // Paste sync URL manually
    const urlInput = frameGuest.locator("input[placeholder*='sync?roomId=']")
    await expect(urlInput).toBeVisible()
    await urlInput.fill(syncUrl)

    // Click Connect on Guest
    const connectBtn = frameGuest.locator(
      "button:has-text('Connect'), button:has-text('接続')"
    )
    await expect(connectBtn).toBeVisible()
    await connectBtn.click()

    // 7. Wait for synchronization connection and execution on both sides
    // Success state on Host
    const successTitleHost = frameHost.locator(
      "h4:has-text('Sync Complete!'), h4:has-text('同期完了'), h4:has-text('同期が正常に完了しました！')"
    )
    const successTextHost = frameHost.locator(
      "text='同期が正常に完了しました！', text='Sync completed successfully!'"
    )

    // Support either or both checks
    await expect(successTitleHost.or(successTextHost).first()).toBeVisible({
      timeout: 15000
    })

    // Success state on Guest
    const successTitleGuest = frameGuest.locator(
      "h4:has-text('Data Sent successfully!'), h4:has-text('データ送信完了'), h4:has-text('送信完了'), h4:has-text('同期が正常に完了しました！'), h4:has-text('Sync completed successfully!')"
    )
    await expect(successTitleGuest).toBeVisible({ timeout: 15000 })

    // Capture success screenshots
    await pageHost.screenshot({
      path: path.join(screenshotsDir, "p2p-sync-host-success.png")
    })
    await pageGuest.screenshot({
      path: path.join(screenshotsDir, "p2p-sync-guest-success.png")
    })

    // 8. Verify Host Database contains the synchronized card
    const cardExists = await frameHost.locator("body").evaluate(async () => {
      const database = (window as any).db
      const card = await database.styleCards.get("p2p-test-card-1")
      return !!card
    })
    expect(cardExists).toBe(true)

    // 9. Verify Host has received the OPFS image file with matching content
    const imageSyncSuccess = await frameHost
      .locator("body")
      .evaluate(async () => {
        try {
          const root = await navigator.storage.getDirectory()
          const imagesDir = await root.getDirectoryHandle("images")
          const fileHandle = await imagesDir.getFileHandle("p2p-test-image.png")
          const file = await fileHandle.getFile()
          const buf = await file.arrayBuffer()
          const arr = new Uint8Array(buf)
          const expected = [
            71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255,
            255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2,
            76, 1, 0, 59
          ]
          if (arr.length !== expected.length) return false
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== expected[i]) return false
          }
          return true
        } catch (e) {
          console.error("OPFS image validation error in E2E Host:", e)
          return false
        }
      })
    expect(imageSyncSuccess).toBe(true)

    // Clean up
    await contextHost.close()
    await contextGuest.close()
  })

  test("should show alert when navigating away during active sync, and block tab change if cancelled", async ({
    page,
    baseURL
  }) => {
    const frame = page.frameLocator("#sidepanel-frame")

    // 1. Navigate to the sandbox page
    await page.goto("/tests/sandbox/index.html")

    // Welcome dialog bypass if visible
    const skipBtn = frame.locator("#welcome-skip-btn")
    if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipBtn.click()
    }

    // 2. Open Settings Tab
    const settingsBtn = frame.locator("#settings-nav-btn")
    await settingsBtn.click()

    // 3. Open P2P Sync Accordion
    const p2pAccordion = frame.locator("#settings-accordion-p2p")
    await expect(p2pAccordion).toBeVisible()
    await p2pAccordion.click()

    // 4. Start Host Mode (Receive on PC)
    const receiveBtn = frame.locator(
      "button:has-text('Receive on PC'), button:has-text('PCで受信')"
    )
    await expect(receiveBtn).toBeVisible()
    await receiveBtn.click()

    // Wait until QR Code img or the window.__lastSyncUrl is populated (active status)
    await frame
      .locator("img[alt='Sync QR Code']")
      .waitFor({ state: "visible", timeout: 10000 })

    // Test beforeunload event trigger inside the iframe context
    const iframeElement = await page.$("#sidepanel-frame")
    const sidepanelFrame = await iframeElement?.contentFrame()
    if (!sidepanelFrame) throw new Error("Could not find sidepanel iframe")

    const beforeUnloadResult = await sidepanelFrame.evaluate(() => {
      const event = new Event("beforeunload", {
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(beforeUnloadResult).toBe(true) // should prevent default

    // Try to click Library nav button to trigger React ConfirmationDialog inside the iframe
    const libraryBtn = frame.locator("[data-tutorial='library-tab']")
    await libraryBtn.click()

    // Wait for the custom confirmation dialog to be visible
    const cancelBtn = frame.locator("#confirm-dialog-cancel-btn")
    await expect(cancelBtn).toBeVisible()

    // Capture confirmation dialog screenshot
    await page.screenshot({
      path: path.join(
        __dirname,
        "../../tests/screenshots/p2p-sync-navigation-confirm.png"
      )
    })

    // Click cancel button to dismiss the dialog and block tab change
    await cancelBtn.click()

    // Wait a brief moment to ensure we stayed on Settings tab
    await page.waitForTimeout(1000)

    // Check if Settings view is still visible (i.e. QR Code image is still there)
    await expect(frame.locator("img[alt='Sync QR Code']")).toBeVisible()
  })
})
