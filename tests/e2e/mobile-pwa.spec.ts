import { expect, test } from "@playwright/test"

test.describe("Mobile PWA Support @J-PWA-A2HS-OFFLINE-01", () => {
  test("should load manifest and icons correctly", async ({
    page,
    request
  }) => {
    // 1. Visit the mobile viewer page
    await page.goto("/src/mobile-app/index.html")

    // Check if the manifest link is present in head
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute("href", "/mobile/manifest.json")

    // Check if apple-touch-icon link is present in head
    const appleIconLink = page.locator('link[rel="apple-touch-icon"]')
    await expect(appleIconLink).toHaveAttribute("href", "/mobile/icon-192.png")

    // Check if theme-color meta tag is present in head
    const themeColorMeta = page.locator('meta[name="theme-color"]')
    await expect(themeColorMeta).toHaveAttribute("content", "#8b5cf6")

    // 2. Directly fetch manifest.json using APIRequestContext
    const manifestResponse = await request.get("/mobile/manifest.json")
    expect(manifestResponse.ok()).toBe(true)
    const manifestJson = await manifestResponse.json()

    // Assert manifest details
    expect(manifestJson.name).toBe("Style Atelier")
    expect(manifestJson.short_name).toBe("Atelier")
    expect(manifestJson.description).toBe("Midjourney Style Card Manager")
    expect(manifestJson.start_url).toBe("/mobile/?pwa=true")
    expect(manifestJson.display).toBe("standalone")
    expect(manifestJson.background_color).toBe("#0a0a0c")
    expect(manifestJson.theme_color).toBe("#8b5cf6")
    expect(manifestJson.orientation).toBe("portrait")

    // Verify icons array
    expect(manifestJson.icons).toHaveLength(2)
    expect(manifestJson.icons[0].src).toBe("/mobile/icon-192.png")
    expect(manifestJson.icons[0].sizes).toBe("192x192")
    expect(manifestJson.icons[1].src).toBe("/mobile/icon-512.png")
    expect(manifestJson.icons[1].sizes).toBe("512x512")

    // 3. Directly fetch icons to ensure they are available
    const icon192Response = await request.get("/mobile/icon-192.png")
    expect(icon192Response.ok()).toBe(true)
    expect(icon192Response.headers()["content-type"]).toBe("image/png")

    const icon512Response = await request.get("/mobile/icon-512.png")
    expect(icon512Response.ok()).toBe(true)
    expect(icon512Response.headers()["content-type"]).toBe("image/png")
  })
})
