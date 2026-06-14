import {
  compressCategoryCoverImage,
  createThumbnailDataUrl
} from "@/lib/image-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let shouldCompressionFail = false

vi.mock("browser-image-compression", () => ({
  default: vi.fn().mockImplementation(async (blob: Blob) => {
    if (shouldCompressionFail) {
      throw new Error("Mock compression failure")
    }
    return new Blob(["compressed-data"], { type: "image/webp" })
  })
}))

describe("Image Utilities", () => {
  describe("createThumbnailDataUrl", () => {
    beforeEach(() => {
      shouldCompressionFail = false
    })

    it("returns dummy base64 in test environment for remote URL", async () => {
      const dataUrl = await createThumbnailDataUrl(
        "https://example.com/image.png"
      )
      expect(dataUrl).toContain("data:image/png;base64,")
    })

    it("returns dummy base64 in test environment for empty string", async () => {
      const dataUrl = await createThumbnailDataUrl("")
      expect(dataUrl).toContain("data:image/png;base64,")
    })

    it("returns original placeholder asset path when assets/icon.png is passed", async () => {
      const dataUrl = await createThumbnailDataUrl("assets/icon.png")
      expect(dataUrl).toBe("assets/icon.png")
    })

    it("returns original placeholder asset path when url: prefix is passed", async () => {
      const dataUrl = await createThumbnailDataUrl("url:../../assets/icon.png")
      expect(dataUrl).toBe("url:../../assets/icon.png")
    })

    describe("Actual compression flow (bypassing VITEST env check)", () => {
      let originalImage: any
      let originalCreateElement: any
      let mockContext: any
      let mockCanvas: any

      beforeEach(() => {
        vi.stubEnv("BYPASS_VITEST", "true")
        originalImage = global.Image

        class MockImage {
          width = 100
          height = 100
          naturalWidth = 100
          naturalHeight = 100
          onload?: () => void
          onerror?: () => void
          _src = ""
          crossOrigin = ""
          set src(val: string) {
            this._src = val
            if (
              val.includes("error") ||
              val.includes("fail") ||
              val === "invalid-image-url"
            ) {
              setTimeout(() => this.onerror?.(), 0)
            } else {
              setTimeout(() => this.onload?.(), 0)
            }
          }
          get src() {
            return this._src
          }
        }
        vi.stubGlobal("Image", MockImage)

        // Mock canvas
        mockContext = {
          drawImage: vi.fn()
        }
        mockCanvas = {
          getContext: vi.fn().mockReturnValue(mockContext),
          toDataURL: vi
            .fn()
            .mockReturnValue("data:image/jpeg;base64,mocked-thumbnail"),
          width: 0,
          height: 0
        }
        originalCreateElement = document.createElement
        document.createElement = vi.fn().mockImplementation((tagName) => {
          if (tagName === "canvas") {
            return mockCanvas
          }
          return originalCreateElement.call(document, tagName)
        })
      })

      afterEach(() => {
        vi.unstubAllEnvs()
        document.createElement = originalCreateElement
        if (originalImage) {
          vi.stubGlobal("Image", originalImage)
        }
      })

      it("succeeds using browser-image-compression with data URL", async () => {
        const dataUrl = await createThumbnailDataUrl(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        expect(dataUrl).toBeDefined()
        expect(dataUrl.startsWith("data:")).toBe(true)
      })

      it("falls back to canvas/fallback flow when browser-image-compression fails", async () => {
        shouldCompressionFail = true
        // Pass a simple data URL to run the canvas fallback loader
        const mockDataUrl =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        const dataUrl = await createThumbnailDataUrl(mockDataUrl)
        expect(dataUrl).toBe("data:image/jpeg;base64,mocked-thumbnail")
      })

      it("handles Blob input correctly in fallback flow", async () => {
        shouldCompressionFail = true
        const blob = new Blob(["mock-image-data"], { type: "image/png" })
        const dataUrl = await createThumbnailDataUrl(blob)
        expect(dataUrl).toBe("data:image/jpeg;base64,mocked-thumbnail")
      })

      it("handles load error on canvas fallback gracefully", async () => {
        shouldCompressionFail = true
        // Pass an invalid URL to trigger onerror
        const dataUrl = await createThumbnailDataUrl("invalid-image-url")
        expect(dataUrl).toBe("invalid-image-url")
      })

      it("handles remote http/https URLs in fallback flow with successful fetch", async () => {
        shouldCompressionFail = true
        const originalFetch = global.fetch
        global.fetch = vi.fn().mockImplementation(() =>
          Promise.resolve({
            ok: true,
            blob: () =>
              Promise.resolve(new Blob(["mock"], { type: "image/png" }))
          })
        )

        try {
          const dataUrl = await createThumbnailDataUrl(
            "https://example.com/test.png"
          )
          expect(dataUrl).toBe("data:image/jpeg;base64,mocked-thumbnail")
        } finally {
          global.fetch = originalFetch
        }
      })

      it("handles remote http/https URL fetch failure in fallback flow", async () => {
        shouldCompressionFail = true
        const originalFetch = global.fetch
        global.fetch = vi
          .fn()
          .mockImplementation(() => Promise.reject(new Error("Network error")))

        try {
          const dataUrl = await createThumbnailDataUrl(
            "https://example.com/test-fail.png"
          )
          expect(dataUrl).toBe("https://example.com/test-fail.png")
        } finally {
          global.fetch = originalFetch
        }
      })

      it("handles canvas fallback sizing: width > height and width > maxWidth", async () => {
        shouldCompressionFail = true
        // Mock Image with width > height
        class WideMockImage {
          width = 300
          height = 100
          naturalWidth = 300
          naturalHeight = 100
          onload?: () => void
          set src(val: string) {
            setTimeout(() => this.onload?.(), 0)
          }
        }
        vi.stubGlobal("Image", WideMockImage)

        const dataUrl = await createThumbnailDataUrl(
          "data:image/png;base64,mock",
          200,
          200
        )
        expect(dataUrl).toBe("data:image/jpeg;base64,mocked-thumbnail")
      })

      it("handles canvas fallback sizing: height > width and height > maxHeight", async () => {
        shouldCompressionFail = true
        // Mock Image with height > width
        class TallMockImage {
          width = 100
          height = 300
          naturalWidth = 100
          naturalHeight = 300
          onload?: () => void
          set src(val: string) {
            setTimeout(() => this.onload?.(), 0)
          }
        }
        vi.stubGlobal("Image", TallMockImage)

        const dataUrl = await createThumbnailDataUrl(
          "data:image/png;base64,mock",
          200,
          200
        )
        expect(dataUrl).toBe("data:image/jpeg;base64,mocked-thumbnail")
      })
    })
  })

  describe("compressCategoryCoverImage", () => {
    beforeEach(() => {
      shouldCompressionFail = false
    })

    it("returns dummy base64 in test environment for remote URL", async () => {
      const dataUrl = await compressCategoryCoverImage(
        "https://example.com/image.png"
      )
      expect(dataUrl).toContain("data:image/png;base64,")
    })

    it("returns dummy base64 in test environment for empty string", async () => {
      const dataUrl = await compressCategoryCoverImage("")
      expect(dataUrl).toContain("data:image/png;base64,")
    })

    describe("Actual compression flow (bypassing VITEST env check)", () => {
      let originalImage: any
      let originalCreateElement: any
      let mockContext: any
      let mockCanvas: any

      beforeEach(() => {
        vi.stubEnv("BYPASS_VITEST", "true")
        originalImage = global.Image

        class MockImage {
          width = 100
          height = 100
          naturalWidth = 100
          naturalHeight = 100
          onload?: () => void
          onerror?: () => void
          _src = ""
          crossOrigin = ""
          set src(val: string) {
            this._src = val
            if (
              val.includes("error") ||
              val.includes("fail") ||
              val === "invalid-image-url"
            ) {
              setTimeout(() => this.onerror?.(), 0)
            } else {
              setTimeout(() => this.onload?.(), 0)
            }
          }
          get src() {
            return this._src
          }
        }
        vi.stubGlobal("Image", MockImage)

        // Mock canvas
        mockContext = {
          drawImage: vi.fn()
        }
        mockCanvas = {
          getContext: vi.fn().mockReturnValue(mockContext),
          toDataURL: vi
            .fn()
            .mockReturnValue("data:image/jpeg;base64,mocked-cover"),
          width: 0,
          height: 0
        }
        originalCreateElement = document.createElement
        document.createElement = vi.fn().mockImplementation((tagName) => {
          if (tagName === "canvas") {
            return mockCanvas
          }
          return originalCreateElement.call(document, tagName)
        })
      })

      afterEach(() => {
        vi.unstubAllEnvs()
        document.createElement = originalCreateElement
        if (originalImage) {
          vi.stubGlobal("Image", originalImage)
        }
      })

      it("succeeds using browser-image-compression with data URL", async () => {
        const dataUrl = await compressCategoryCoverImage(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        expect(dataUrl).toBeDefined()
        expect(dataUrl.startsWith("data:")).toBe(true)
      })

      it("falls back to canvas/fallback flow when browser-image-compression fails", async () => {
        shouldCompressionFail = true
        const mockDataUrl =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        const dataUrl = await compressCategoryCoverImage(mockDataUrl)
        expect(dataUrl).toBe("data:image/jpeg;base64,mocked-cover")
      })
    })
  })
})
