/* eslint-disable @typescript-eslint/no-explicit-any */
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

  test("should display quota warning UI if storage is insufficient", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for WebLLM Quota Warning E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    // Expand Local AI Model (WebLLM) accordion
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    // 3. Configure mock to return insufficient quota
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.quotaSufficient = false
      }
    })

    // 4. Click Download Model button
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()
    await page.waitForTimeout(500)

    // 5. Verify Insufficient Space / UI warning is displayed
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

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-quota-warning.png")
    })
    console.log("WebLLM Quota Warning screenshot saved.")
  })

  test("should detect corrupt/incorrect cache size and perform auto-recovery (purge)", async ({
    page
  }) => {
    console.log(
      "Navigating to sandbox page for WebLLM Cache Integrity E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Verify cache integrity check handles size mismatch and purges corrupted files
    const integrityResults = await spFrame
      .locator("body")
      .evaluate(async () => {
        const verifyCache = (window as any).verifyCacheIntegrity
        const verifyOpfs = (window as any).verifyOpfsIntegrity

        if (
          !verifyCache ||
          typeof window === "undefined" ||
          !("caches" in window)
        ) {
          return { cacheValid: true, opfsValid: true, supported: false }
        }

        // Test Cache Storage integrity
        const cacheName = "webllm/model_cache_test"
        const fileUrl = "https://webllm/model/gemma-4-e2b-q4f16_1.bin"

        const cache = await window.caches.open(cacheName)
        // Put a corrupted small file instead of 1GB
        await cache.put(
          fileUrl,
          new Response(
            new Blob(["corrupted binary data"], {
              type: "application/octet-stream"
            })
          )
        )

        // Expected size is 1GB (1024 * 1024 * 1024)
        const expectedFilesCache = [{ url: fileUrl, size: 1024 * 1024 * 1024 }]
        const cacheResultBefore = await verifyCache(
          cacheName,
          expectedFilesCache
        )

        // Verify that verifyCacheIntegrity deleted the mismatched entry
        const updatedCache = await window.caches.open(cacheName)
        const matchedResponse = await updatedCache.match(fileUrl)
        const entryDeleted = !matchedResponse

        // Clean up test cache
        await window.caches.delete(cacheName)

        // Test OPFS integrity if supported
        let opfsDeleted = false
        let opfsSupported = false
        if (navigator.storage && navigator.storage.getDirectory) {
          opfsSupported = true
          const root = await navigator.storage.getDirectory()
          const dirName = "webllm_models_test"
          const fileName = "gemma-4-e2b-q4f16_1.bin"

          const dirHandle = await root.getDirectoryHandle(dirName, {
            create: true
          })
          const fileHandle = await dirHandle.getFileHandle(fileName, {
            create: true
          })
          const writable = await fileHandle.createWritable()
          await writable.write(new Blob(["corrupted opfs data"]))
          await writable.close()

          const expectedFilesOpfs = [
            { name: fileName, size: 1024 * 1024 * 1024 }
          ]
          const opfsResultBefore = await verifyOpfs(dirName, expectedFilesOpfs)

          // Verify that entry is deleted
          try {
            await dirHandle.getFileHandle(fileName, { create: false })
          } catch {
            opfsDeleted = true
          }

          // Clean up test OPFS directory
          await root.removeEntry(dirName, { recursive: true }).catch(() => {})

          return {
            cacheResultBefore,
            opfsResultBefore,
            entryDeleted,
            opfsDeleted,
            opfsSupported,
            supported: true
          }
        } else {
          opfsDeleted = true // Mock as deleted since unsupported
        }

        return {
          cacheResultBefore,
          opfsResultBefore: true, // Mocked as valid since unsupported
          entryDeleted,
          opfsDeleted,
          opfsSupported,
          supported: true
        }
      })

    console.log("Integrity verification results:", integrityResults)

    if (integrityResults.supported) {
      expect(integrityResults.cacheResultBefore).toBe(false)
      expect(integrityResults.entryDeleted).toBe(true)
      if (integrityResults.opfsSupported) {
        expect(integrityResults.opfsResultBefore).toBe(false)
        expect(integrityResults.opfsDeleted).toBe(true)
      }
    } else {
      console.log("Browser environment does not support Cache Storage or OPFS.")
    }
  })

  test("should display download speed and remaining time during download", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for WebLLM Download Progress/ETA E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    // Expand Local AI Model (WebLLM) accordion
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    // 3. Configure slow download to capture speed/ETA
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = false
        config.downloadSpeed = 800
      }
    })

    // 4. Click Download Model button
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // 5. Verify download progress with speed and remaining time
    const speedText = spFrame.locator("text=12.5 MB/s")
    await expect(speedText).toBeVisible({ timeout: 5000 })

    const remainingText = spFrame.locator("text=/Remaining|残り時間/")
    await expect(remainingText).toBeVisible({ timeout: 5000 })

    // Capture screenshot during active progress
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-download-progress.png")
    })
    console.log("WebLLM Download Progress screenshot saved.")
  })

  test("should display download error message on network connection failure", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for WebLLM Download Error E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    // Expand Local AI Model (WebLLM) accordion
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    await page.waitForTimeout(300)

    // 3. Configure mock to trigger download failure (which does retries first)
    await spFrame.locator("body").evaluate(() => {
      const config = (window as any).mockWebLlmConfig
      if (config) {
        config.failDownload = true
        config.downloadErrorMsg =
          "Failed to fetch model weights: Connection lost"
      }
    })

    // 4. Click Download Model button
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // 5. Verify retry UI displays (e.g. Reconnecting... (1/3))
    const retryText = spFrame
      .locator("text=/Reconnecting|接続を再試行中|接続再試行中/")
      .first()
    await expect(retryText).toBeVisible({ timeout: 5000 })

    // Capture screenshot of the retrying state
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-download-retry.png")
    })
    console.log("WebLLM Download Retry screenshot saved.")

    // 6. Verify error notification is displayed after retries exhaust
    const errorText = spFrame.locator(
      "text=Failed to fetch model weights: Connection lost"
    )
    await expect(errorText).toBeVisible({ timeout: 10000 })

    // Capture screenshot of final failure state
    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-download-error.png")
    })
    console.log("WebLLM Download Error screenshot saved.")
  })
})
