import fs from "fs"
import path from "path"
import { expect, test } from "@playwright/test"

test("LiteRT Harness Profiling Dashboard End-to-End Simulation @J-PROFILER-DASHBOARD", async ({
  page
}) => {
  // 1. Inject OPFS (Origin Private File System) mocks in the browser context
  await page.addInitScript(() => {
    let hasFile = false

    const mockFile = {
      size: 2008432640,
      getFile: async () => ({ size: 2008432640 })
    }

    const mockFileHandle = {
      getFile: async () => mockFile
    }

    const mockDirHandle: any = {
      getFileHandle: async (name: string) => {
        if (name === "gemma-4-E2B-it-web.litertlm") {
          if (hasFile) return mockFileHandle
          throw new Error("File not found")
        }
        throw new Error("Unknown file")
      },
      getDirectoryHandle: async (name: string, options?: any) => {
        if (name === "litert_models") {
          return mockDirHandle
        }
        throw new Error("Unknown directory")
      }
    }

    const mockStorage = {
      getDirectory: async () => mockDirHandle
    }

    Object.defineProperty(navigator, "storage", {
      value: mockStorage,
      configurable: true,
      writable: true
    })
    ;(window as any).__setMockFile = (val: boolean) => {
      hasFile = val
    }
  })

  // 2. Route all litert.worker.ts requests to our high-fidelity Mock Worker
  await page.route("**/litert.worker.ts*", async (route) => {
    const mockWorkerCode = `
      self.onmessage = async (event) => {
        const { action, ...payload } = event.data;
        if (action === "start-download") {
          for (let progress = 0; progress <= 100; progress += 25) {
            self.postMessage({
              status: "downloading",
              progress,
              speed: 45.5,
              eta: Math.round((100 - progress) / 20),
              text: "Downloading model weights... (" + progress + "%)"
            });
            await new Promise(r => setTimeout(r, 80));
          }
          self.postMessage({ status: "ready" });
        } else if (action === "run-inference") {
          const { requestId } = payload;
          self.postMessage({
            status: "engine-initializing",
            progress: 50,
            text: "Loading WASM and WebGPU shaders..."
          });
          await new Promise(r => setTimeout(r, 80));
          self.postMessage({ status: "engine-ready" });
          await new Promise(r => setTimeout(r, 80));
          self.postMessage({
            status: "inference-result",
            requestId,
            result: '{"rarity": "legendary", "category": "outerwear", "color": "dark", "keywords": ["goth", "cyberpunk"]}',
            metrics: {
              latencyMs: 1250,
              tokensPerSec: 40.0,
              estimatedTokens: 50,
              vramBytes: 2264924160
            }
          });
        }
      };
    `
    await route.fulfill({
      contentType: "application/javascript",
      body: mockWorkerCode
    })
  })

  // 3. Navigate to the Harness page (baseURL will be automatically used from Playwright config)
  await page.goto("/src/test/harness/index.html")

  // Verify dashboard structural elements
  await expect(page.locator("h1")).toContainText("LiteRT-LM Debug Harness")
  await expect(page.locator("#worker-status-badge")).toContainText(
    "Worker: Connected"
  )
  await expect(page.locator("#opfs-status-badge")).toContainText(
    "OPFS Model: Not Found"
  )

  const downloadBtn = page.locator("#download-btn")
  const inferenceBtn = page.locator("#inference-btn")

  // Verify buttons initial state
  await expect(downloadBtn).toBeEnabled()
  await expect(inferenceBtn).toBeDisabled()

  // 4. Click download and verify progress updates
  await downloadBtn.click()
  await expect(page.locator("#download-status-txt")).toContainText(
    "Downloading model weights..."
  )

  // Wait for downloading completion states
  await page.waitForFunction(
    () => {
      const txt = document.getElementById("download-status-txt")?.innerText
      return txt && txt.includes("100%")
    },
    { timeout: 5000 }
  )

  // Simulate file existence in mocked OPFS storage before Worker sends ready
  await page.evaluate(() => {
    ;(window as any).__setMockFile(true)
  })

  // Wait for the UI state to update to Ready
  await expect(page.locator("#opfs-status-badge")).toContainText(
    "OPFS Model: Ready"
  )
  await expect(inferenceBtn).toBeEnabled()

  // 5. Execute inference and verify profiling metrics display
  await inferenceBtn.click()

  // Wait for result rendering in response output card
  const responseOutput = page.locator("#response-output")
  await expect(responseOutput).toContainText("legendary")

  // Verify Profiling Metrics cards
  await expect(page.locator("#metric-latency")).toContainText("1.25s")
  await expect(page.locator("#metric-speed")).toContainText("40 t/s")
  await expect(page.locator("#metric-vram")).toContainText("2.11 GB")
  await expect(page.locator("#metric-tokens")).toContainText("50 tokens")

  // 6. Capture E2E test execution verification screenshot in tests/screenshots/
  const screenshotsDir = path.resolve(process.cwd(), "tests", "screenshots")
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }
  const screenshotPath = path.join(
    screenshotsDir,
    "litert-harness-profiling.png"
  )
  await page.screenshot({ path: screenshotPath, fullPage: true })

  console.log(`E2E screenshot saved successfully to: ${screenshotPath}`)
})
