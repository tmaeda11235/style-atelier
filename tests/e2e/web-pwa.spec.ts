import { expect, test } from "@playwright/test"

test.describe("Web PWA Support @J-WEB-PWA-A2HS-01", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name === "extension") {
      test.skip()
    }
  })

  test("should load manifest and icons correctly", async ({
    page,
    request
  }) => {
    // 1. Visit the web viewer page
    await page.goto("/?pwa=true")

    // Check if the manifest link is present in head
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json")

    // Check if apple-touch-icon link is present in head
    const appleIconLink = page.locator('link[rel="apple-touch-icon"]')
    await expect(appleIconLink).toHaveAttribute("href", "/icon-192.png")

    // Check if theme-color meta tag is present in head
    const themeColorMeta = page.locator('meta[name="theme-color"]')
    await expect(themeColorMeta).toHaveAttribute("content", "#8b5cf6")

    // 2. Directly fetch manifest.json using APIRequestContext
    const manifestResponse = await request.get("/manifest.json")
    expect(manifestResponse.ok()).toBe(true)
    const manifestJson = await manifestResponse.json()

    // Assert manifest details
    expect(manifestJson.name).toBe("Style Atelier")
    expect(manifestJson.short_name).toBe("Atelier")
    expect(manifestJson.description).toBe("Midjourney Style Card Manager")
    expect(manifestJson.start_url).toBe("/?pwa=true")
    expect(manifestJson.display).toBe("standalone")
    expect(manifestJson.background_color).toBe("#0a0a0c")
    expect(manifestJson.theme_color).toBe("#8b5cf6")
    expect(manifestJson.orientation).toBe("portrait")

    // Verify icons array
    expect(manifestJson.icons).toHaveLength(2)
    expect(manifestJson.icons[0].src).toBe("/icon-192.png")
    expect(manifestJson.icons[0].sizes).toBe("192x192")
    expect(manifestJson.icons[1].src).toBe("/icon-512.png")
    expect(manifestJson.icons[1].sizes).toBe("512x512")

    // 3. Directly fetch icons to ensure they are available
    const icon192Response = await request.get("/icon-192.png")
    expect(icon192Response.ok()).toBe(true)
    expect(icon192Response.headers()["content-type"]).toBe("image/png")

    const icon512Response = await request.get("/icon-512.png")
    expect(icon512Response.ok()).toBe(true)
    expect(icon512Response.headers()["content-type"]).toBe("image/png")
  })

  test("should register service worker and work offline", async ({
    page,
    context
  }) => {
    // Start waiting for the service worker registration
    const swPromise = context.waitForEvent("serviceworker")

    // Visit PWA with pwa=true
    await page.goto("/?pwa=true")
    await page.waitForFunction(
      () => typeof (window as any).__renderCardForTest === "function"
    )

    // Wait for registration
    const sw = await swPromise
    expect(sw).toBeTruthy()

    // Wait for the Service Worker to be activated
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (reg.active && reg.active.state !== "activated") {
        await new Promise<void>((resolve) => {
          reg.active!.addEventListener("statechange", (e: any) => {
            if (e.target.state === "activated") {
              resolve()
            }
          })
        })
      }
    })

    // Wait for the Service Worker to control the page
    await page.evaluate(async () => {
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => {
              resolve()
            },
            { once: true }
          )
        })
      }
    })

    // Simulate going offline
    await context.setOffline(true)

    // Reload the page while offline
    await page.reload()

    // Assert that the page is still loaded and interactive
    const title = page.locator(".app-title")
    await expect(title).toHaveText("STYLE ATELIER")

    const cardTitle = page.locator("#cardTitleFront")
    await expect(cardTitle).toBeVisible()

    // Clean up: return online
    await context.setOffline(false)
  })

  test.describe("A2HS Installation Prompts", () => {
    test.beforeEach(async ({ page }) => {
      // Clear localStorage before each test
      await page.goto("/?pwa=true")
      await page.waitForFunction(
        () => typeof (window as any).__renderCardForTest === "function"
      )
      await page.evaluate(() => localStorage.clear())
    })

    test("should display Android install dialog when beforeinstallprompt fires and hide on dismiss", async ({
      page
    }) => {
      await page.goto("/?pwa=true")

      // Dispatch beforeinstallprompt
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt")
        ;(event as any).userChoice = Promise.resolve({ outcome: "accepted" })
        ;(event as any).prompt = function () {
          ;(window as any).mockPromptCalled = true
          return Promise.resolve()
        }
        window.dispatchEvent(event)
      })

      // Trigger card flip (Wow moment) to trigger prompt immediately
      await page.click("#cardContainer")

      // Wait for the show transition
      const dialog = page.locator("#androidInstallDialog")
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveClass(/show/)

      // Click install button
      const installBtn = page.locator("#androidInstallBtn")
      await installBtn.click()

      // The dialog should close
      await expect(dialog).not.toBeVisible()

      // Verify prompt was called
      const mockPromptCalled = await page.evaluate(
        () => (window as any).mockPromptCalled
      )
      expect(mockPromptCalled).toBe(true)
    })

    test("should save dismissal and not show dialog on reload", async ({
      page
    }) => {
      await page.goto("/?pwa=true")

      // Trigger beforeinstallprompt
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt")
        ;(event as any).userChoice = Promise.resolve({ outcome: "dismissed" })
        ;(event as any).prompt = () => Promise.resolve()
        window.dispatchEvent(event)
      })

      // Trigger flip to show dialog
      await page.click("#cardContainer")
      const dialog = page.locator("#androidInstallDialog")
      await expect(dialog).toBeVisible()

      // Click dismiss button
      const dismissBtn = page.locator("#androidDismissBtn")
      await dismissBtn.click()

      // Dialog should close
      await expect(dialog).not.toBeVisible()

      // Check localStorage has dismissal timestamp
      const dismissedUntil = await page.evaluate(() =>
        localStorage.getItem("a2hs-dismissed-until")
      )
      expect(dismissedUntil).toBeTruthy()
      expect(Number(dismissedUntil)).toBeGreaterThan(Date.now())

      // Reload page
      await page.reload()

      // Dispatch event again
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt")
        ;(event as any).userChoice = Promise.resolve({ outcome: "dismissed" })
        ;(event as any).prompt = () => Promise.resolve()
        window.dispatchEvent(event)
      })

      // Trigger flip
      await page.click("#cardContainer")

      // The dialog should NOT show because of dismissal
      await expect(dialog).not.toBeVisible()
    })

    test("should display iOS install tooltip when on iOS Safari and hide on close", async ({
      page
    }) => {
      // Mock iOS UserAgent and standalone = false
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", {
          value:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
          configurable: true
        })
        Object.defineProperty(navigator, "standalone", {
          value: false,
          configurable: true
        })
      })

      await page.goto("/?pwa=true")

      // Trigger flip to show iOS tooltip
      await page.click("#cardContainer")

      const tooltip = page.locator("#iosInstallTooltip")
      await expect(tooltip).toBeVisible()
      await expect(tooltip).toHaveClass(/show/)

      // Close iOS tooltip
      const closeBtn = page.locator("#iosCloseBtn")
      await closeBtn.click()

      // Tooltip should close
      await expect(tooltip).not.toBeVisible()

      // Check localStorage
      const dismissedUntil = await page.evaluate(() =>
        localStorage.getItem("a2hs-dismissed-until")
      )
      expect(dismissedUntil).toBeTruthy()
    })
  })

  test.describe("OPFS Image Integration & Fallback", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/src/web-app/index.html?pwa=true")
      await page.waitForFunction(
        () => typeof (window as any).__renderCardForTest === "function"
      )
    })

    test("should save thumbnailData to OPFS and render it from OPFS when supported", async ({
      page
    }) => {
      const mockCardId = "e2e-card-pwa-opfs"
      const mockBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

      await page.evaluate(
        ({ cardId, base64 }) => {
          const mockCard = {
            id: cardId,
            name: "OPFS E2E PWA Card",
            tier: "Epic" as const,
            thumbnailData: base64,
            promptSegments: [],
            dominantColor: "#1e293b",
            frameId: "default"
          }
          ;(window as any).__renderCardForTest(mockCard)
        },
        { cardId: mockCardId, base64: mockBase64 }
      )

      const img = page.locator("#cardImageContainer img")
      await expect(img).not.toHaveClass(/loading/)

      const src = await img.getAttribute("src")
      expect(src).toMatch(/^blob:/)

      const isFileInOpfs = await page.evaluate(async (cardId) => {
        try {
          const root = await navigator.storage.getDirectory()
          const dirImages = await root.getDirectoryHandle("images", {
            create: false
          })
          const dirCards = await dirImages.getDirectoryHandle("cards", {
            create: false
          })
          const fileHandle = await dirCards.getFileHandle(`${cardId}.png`, {
            create: false
          })
          const file = await fileHandle.getFile()
          return file.size > 0
        } catch {
          return false
        }
      }, mockCardId)

      expect(isFileInOpfs).toBe(true)

      await page.evaluate((cardId) => {
        const mockCardPathOnly = {
          id: cardId,
          name: "OPFS E2E PWA Card Path Only",
          tier: "Epic" as const,
          thumbnailPath: `images/cards/${cardId}.png`,
          promptSegments: [],
          dominantColor: "#1e293b",
          frameId: "default"
        }
        ;(window as any).__renderCardForTest(mockCardPathOnly)
      }, mockCardId)

      await expect(img).not.toHaveClass(/loading/)
      const newSrc = await img.getAttribute("src")
      expect(newSrc).toMatch(/^blob:/)
    })

    test("should fallback to base64 thumbnailData when OPFS is not supported", async ({
      page
    }) => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, "storage", {
          value: undefined,
          configurable: true,
          writable: true
        })
      })

      const mockCardId = "e2e-card-fallback"
      const mockBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

      await page.evaluate(
        ({ cardId, base64 }) => {
          const mockCard = {
            id: cardId,
            name: "Fallback E2E PWA Card",
            tier: "Common" as const,
            thumbnailData: base64,
            promptSegments: [],
            dominantColor: "#1e293b",
            frameId: "default"
          }
          ;(window as any).__renderCardForTest(mockCard)
        },
        { cardId: mockCardId, base64: mockBase64 }
      )

      const img = page.locator("#cardImageContainer img")
      await expect(img).not.toHaveClass(/loading/)

      const src = await img.getAttribute("src")
      expect(src).toBe(mockBase64)
    })
  })

  test.describe("AI Style Analysis Integration @J-PWA-AI-STYLE-ANALYSIS-01", () => {
    test.slow()

    test.beforeEach(async ({ page }) => {
      // Clear model downloaded state to force download UI
      await page.goto("/?mock=true")
      await page.evaluate(async () => {
        localStorage.clear()
        localStorage.setItem("mock-webllm", "true")
        try {
          const root = await navigator.storage.getDirectory()
          await (root as any)
            .deleteEntry("litert_models", { recursive: true })
            .catch(() => {})
        } catch {
          // Ignored: directory might not exist
        }
      })
    })

    test("should download model weights and run style analysis successfully", async ({
      page
    }) => {
      const mockCardId = "e2e-ai-card"
      const mockBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

      await page.goto("/?mock=true")
      await page.waitForFunction(
        () => typeof (window as any).__renderCardForTest === "function"
      )

      // 1. Render style card with a mock prompt
      await page.evaluate(
        ({ cardId, base64 }) => {
          const mockCard = {
            id: cardId,
            name: "Cyberpunk Alchemist",
            tier: "Legendary" as const,
            thumbnailData: base64,
            promptSegments: [
              {
                type: "text",
                value:
                  "a stunning cyberpunk alchemist holding a glowing vial, neon lights, highly detailed, artstation"
              }
            ],
            dominantColor: "#8b5cf6",
            frameId: "default"
          }
          ;(window as any).__renderCardForTest(mockCard)
        },
        { cardId: mockCardId, base64: mockBase64 }
      )

      // 2. Flip the card to show back side
      await page.click("#cardContainer")

      // 3. Verify download button is visible
      const downloadBtn = page.locator("#aiDownloadBtn")
      await expect(downloadBtn).toBeVisible({ timeout: 15000 })

      // 4. Click download button
      await downloadBtn.click()

      // 5. Verify progress container is displayed
      const progressContainer = page.locator("#aiProgressContainer")
      await expect(progressContainer).toBeVisible()

      // 6. Wait for download to complete and analysis button to become ready
      const analyzeBtn = page.locator("#aiAnalyzeBtn")
      await expect(analyzeBtn).toBeVisible({ timeout: 90000 })

      // Take a screenshot of the ready state (UX visual check)
      await page.screenshot({
        path: "tests/screenshots/mobile-pwa-ai-ready.png"
      })

      // 7. Click analyze button
      await analyzeBtn.click()

      // 8. Verify results container is displayed with genre, tags, and summary
      const resultsContainer = page.locator("#aiResultsContainer")
      await expect(resultsContainer).toBeVisible({ timeout: 30000 })

      const resultGenre = page.locator("#aiResultGenre")
      const resultTags = page.locator("#aiResultTags")
      const resultSummary = page.locator("#aiResultSummary")

      await expect(resultGenre).not.toHaveText("--")
      await expect(resultSummary).not.toHaveText("--")

      const tagBadges = resultTags.locator(".ai-result-tag-badge")
      await expect(tagBadges.first()).toBeVisible()

      // Take a screenshot of the final analysis result state
      await page.screenshot({
        path: "tests/screenshots/mobile-pwa-ai-analyzed.png"
      })
    })
  })
})
