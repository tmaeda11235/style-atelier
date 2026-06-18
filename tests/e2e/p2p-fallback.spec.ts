import path from "path"
import { expect, test } from "@playwright/test"

test.describe("P2P Fallback Synchronization E2E Tests @J-PWA-P2P-FALLBACK-01", () => {
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

  test("should synchronize data between host and guest via HTTP Relay Fallback when WebRTC is blocked", async ({
    browser,
    baseURL
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Create two separate browser contexts to simulate Host and Guest devices
    const contextHost = await browser.newContext({ baseURL })
    const contextGuest = await browser.newContext({ baseURL })

    const port = process.env.SIGNALING_PORT || "9000"

    // Helper to block WebRTC RTCPeerConnection API
    const blockWebRTC = (sigPort: string) => {
      ;(window as any).__SIGNALING_PORT = sigPort
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })

      // Completely block WebRTC connections to force fallback
      Object.defineProperty(window, "RTCPeerConnection", {
        value: class {
          createOffer() {
            return Promise.reject(new Error("WebRTC blocked for test fallback"))
          }
          createAnswer() {
            return Promise.reject(new Error("WebRTC blocked for test fallback"))
          }
          setLocalDescription() {
            return Promise.resolve()
          }
          setRemoteDescription() {
            return Promise.resolve()
          }
          addIceCandidate() {
            return Promise.resolve()
          }
          close() {}
          getConfiguration() {
            return {}
          }
          setConfiguration() {}
        },
        writable: true,
        configurable: true
      })
    }

    // Inject signaling port and WebRTC blocking to both contexts
    await contextHost.addInitScript(blockWebRTC, port)
    await contextGuest.addInitScript(blockWebRTC, port)

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
    // Guest starts with a custom test stylecard. Host starts with a clean database.
    await frameGuest.locator("body").evaluate(async () => {
      const database = (window as any).db
      await database.styleCards.clear()
      await database.categories.clear()
      await database.styleCards.add({
        id: "p2p-test-card-fallback",
        name: "Synced Card via HTTP Relay Fallback",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [],
        parameters: {},
        masking: {},
        tier: "Legendary",
        tags: ["p2p-fallback-test"],
        dominantColor: "#ff00ff",
        thumbnailData: ""
      })
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

    // 5. Start Host Mode (Receive on PC)
    const receiveBtn = frameHost.locator(
      "button:has-text('Receive on PC'), button:has-text('PCで受信')"
    )
    await expect(receiveBtn).toBeVisible()
    await receiveBtn.click()

    // Wait until QR Code img is visible
    await frameHost
      .locator("img[alt='Sync QR Code']")
      .waitFor({ state: "visible", timeout: 10000 })

    const syncUrl = await frameHost.locator("body").evaluate(() => {
      return (window as any).__lastSyncUrl
    })
    expect(syncUrl).toBeTruthy()

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

    // 7. Wait for relay synchronization connection and execution on both sides
    // Since WebRTC is blocked, it will fall back to HTTP relay sync after a short delay or fail callback.

    // We expect the host to show status transition and finally success.
    const successTitleHost = frameHost.locator(
      "h4:has-text('Sync Complete!'), h4:has-text('同期完了'), h4:has-text('同期が正常に完了しました！')"
    )
    const successTextHost = frameHost.locator(
      "text='同期が正常に完了しました！', text='Sync completed successfully!'"
    )

    await expect(successTitleHost.or(successTextHost).first()).toBeVisible({
      timeout: 25000
    })

    // Success state on Guest
    const successTitleGuest = frameGuest.locator(
      "h4:has-text('Data Sent successfully!'), h4:has-text('データ送信完了'), h4:has-text('送信完了'), h4:has-text('同期が正常に完了しました！'), h4:has-text('Sync completed successfully!')"
    )
    await expect(successTitleGuest).toBeVisible({ timeout: 25000 })

    // Capture fallback success screenshots
    await pageHost.screenshot({
      path: path.join(screenshotsDir, "p2p-fallback-host-success.png")
    })
    await pageGuest.screenshot({
      path: path.join(screenshotsDir, "p2p-fallback-guest-success.png")
    })

    // 8. Verify Host Database contains the synchronized card
    const cardExists = await frameHost.locator("body").evaluate(async () => {
      const database = (window as any).db
      const card = await database.styleCards.get("p2p-test-card-fallback")
      return !!card
    })
    expect(cardExists).toBe(true)

    // Clean up
    await contextHost.close()
    await contextGuest.close()
  })
})
