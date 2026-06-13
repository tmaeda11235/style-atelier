import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - WebLLM Resilience @J-SET-01", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
  })

  test("should display quota warning UI if storage is insufficient (mocked via navigator.storage.estimate)", async ({
    context,
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Mock low storage estimate using initScript
    await context.addInitScript(() => {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate = async () => ({
          quota: 2.0 * 1024 * 1024 * 1024, // 2.0 GB
          usage: 1.8 * 1024 * 1024 * 1024 // 1.8 GB (available: 0.2 GB < 1.5 GB required)
        })
      }
    })

    console.log(
      "Navigating to sandbox page with low storage estimate mocked..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Go to Settings tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    // Click Download Model button
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Confirm download in dialog
    const downloadConfirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(downloadConfirmBtn).toBeVisible()
    await downloadConfirmBtn.click()

    // Assert that the quota warning dialog is displayed to the user
    const warningText = spFrame
      .locator("text=/Insufficient Space Warning|容量不足警告/")
      .first()
    await expect(warningText).toBeVisible({ timeout: 5000 })

    const warningDesc = spFrame
      .locator(
        "text=/WebLLM requires at least 1.5 GB|WebLLMを動作させるには1.5GB/"
      )
      .first()
    await expect(warningDesc).toBeVisible({ timeout: 5000 })

    // Capture screenshot of quota warning
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-quota-warning-actual.png")
    })
    console.log("WebLLM low quota warning screenshot saved.")
  })

  test("should detect corrupted cache file on startup, purge it, and trigger a clean download recovery", async ({
    page
  }) => {
    console.log("Pre-injecting corrupted dummy cache / OPFS files...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Injected corrupted file (size 100 bytes instead of 1GB) into Cache Storage
    await spFrame.locator("body").evaluate(async () => {
      if (typeof window !== "undefined" && "caches" in window) {
        const cache = await window.caches.open("webllm/model_cache")
        await cache.put(
          "https://webllm/model/gemma-4-e2b-q4f16_1.bin",
          new Response(
            new Blob([new Uint8Array(100)], {
              type: "application/octet-stream"
            })
          )
        )
      }
    })

    // Also inject corrupted file in OPFS if supported
    await spFrame.locator("body").evaluate(async () => {
      if (navigator.storage && navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory()
        const dirHandle = await root.getDirectoryHandle("webllm_models", {
          create: true
        })
        const fileHandle = await dirHandle.getFileHandle(
          "gemma-4-e2b-q4f16_1.bin",
          { create: true }
        )
        const writable = await fileHandle.createWritable()
        await writable.write(new Uint8Array(100)) // Corrupted file
        await writable.close()
      }
    })

    // Enable real integrity check mock via localStorage so it persists across reload
    await spFrame.locator("body").evaluate(() => {
      localStorage.setItem("mock-webllm-use-real-integrity", "true")
    })

    // Now reload the page to trigger integrity check
    await page.reload()

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Go to Settings tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    // The system should detect corruption and purge it, meaning the state is "Not Downloaded" (idle)
    const notDownloadedStatus = spFrame.locator(
      "text=/Not Downloaded|未ダウンロード/"
    )
    await expect(notDownloadedStatus).toBeVisible({ timeout: 10000 })

    // Let's assert that the cache has actually been purged (no longer exists)
    await expect
      .poll(
        async () => {
          return await spFrame.locator("body").evaluate(async () => {
            if (typeof window !== "undefined" && "caches" in window) {
              const cache = await window.caches.open("webllm/model_cache")
              const res = await cache.match(
                "https://webllm/model/gemma-4-e2b-q4f16_1.bin"
              )
              return !res // Should be deleted!
            }
            return true
          })
        },
        {
          message: "Cache storage was not purged after integrity failure",
          timeout: 10000
        }
      )
      .toBe(true)

    // Verify OPFS is also purged if supported
    await expect
      .poll(
        async () => {
          return await spFrame.locator("body").evaluate(async () => {
            if (navigator.storage && navigator.storage.getDirectory) {
              try {
                const root = await navigator.storage.getDirectory()
                const dirHandle = await root.getDirectoryHandle(
                  "webllm_models",
                  {
                    create: false
                  }
                )
                await dirHandle.getFileHandle("gemma-4-e2b-q4f16_1.bin", {
                  create: false
                })
                return false // Still exists
              } catch {
                return true // Purged successfully!
              }
            }
            return true
          })
        },
        {
          message: "OPFS model file was not purged after integrity failure",
          timeout: 10000
        }
      )
      .toBe(true)

    // Trigger clean download
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Confirm download in dialog
    const downloadConfirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(downloadConfirmBtn).toBeVisible()
    await downloadConfirmBtn.click()

    // Download completes successfully (status ready)
    const readyStatus = spFrame.locator("text=/Loaded|利用可能|Ready/")
    await expect(readyStatus).toBeVisible({ timeout: 10000 })

    // Clean up real integrity check mock from localStorage
    await spFrame.locator("body").evaluate(() => {
      localStorage.removeItem("mock-webllm-use-real-integrity")
    })
  })

  test("should handle network interruption and automatically retry then recover", async ({
    context,
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Welcome dialog skip
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Open Settings and expand WebLLM
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    // Set slow download to give us time to toggle offline
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.downloadSpeed = 800 // slow down
      }
    })

    // Click Download Model
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Confirm download in dialog
    const downloadConfirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(downloadConfirmBtn).toBeVisible()
    await downloadConfirmBtn.click()

    // Wait until download starts (we see downloading progress or speed)
    await expect(spFrame.locator("text=12.5 MB/s")).toBeVisible({
      timeout: 5000
    })

    // Simulate network interruption
    await context.setOffline(true)
    console.log("Simulating network offline...")

    // Verify retry UI shows up
    const retryText = spFrame
      .locator("text=/Reconnecting|接続を再試行中|接続再試行中/")
      .first()
    await expect(retryText).toBeVisible({ timeout: 5000 })

    // Take screenshot of the retry state (UX change)
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-download-interruption-retry.png")
    })

    // Restore network connection
    await context.setOffline(false)
    console.log("Simulating network online...")

    // Verify that the download recovers and completes (ready)
    const readyStatus = spFrame.locator("text=/Loaded|利用可能|Ready/")
    await expect(readyStatus).toBeVisible({ timeout: 10000 })

    // Verify it saved downloaded flag
    const isDownloaded = await spFrame.locator("body").evaluate(() => {
      return localStorage.getItem("mock-webllm-downloaded") === "true"
    })
    expect(isDownloaded).toBe(true)
  })

  test("should display download speed and remaining time during download", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = false
        config.downloadSpeed = 800
      }
    })

    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Confirm download in dialog
    const downloadConfirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(downloadConfirmBtn).toBeVisible()
    await downloadConfirmBtn.click()

    const speedText = spFrame.locator("text=12.5 MB/s")
    await expect(speedText).toBeVisible({ timeout: 5000 })

    const remainingText = spFrame.locator("text=/Remaining|残り時間/")
    await expect(remainingText).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-download-progress.png")
    })
  })
})
