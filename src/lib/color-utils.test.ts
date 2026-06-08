import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  analyzeImageColors,
  getColorNameFromHex,
  getQuantizedColorName,
  hexToHsl,
  hexToRgb,
  rgbToHex,
  rgbToHsl
} from "./color-utils"

describe("Color Utilities", () => {
  describe("rgbToHsl", () => {
    it("converts white correctly", () => {
      const [h, s, l] = rgbToHsl(255, 255, 255)
      expect(h).toBe(0)
      expect(s).toBe(0)
      expect(l).toBe(100)
    })

    it("converts black correctly", () => {
      const [h, s, l] = rgbToHsl(0, 0, 0)
      expect(h).toBe(0)
      expect(s).toBe(0)
      expect(l).toBe(0)
    })

    it("converts pure red correctly", () => {
      const [h, s, l] = rgbToHsl(255, 0, 0)
      expect(h).toBe(0)
      expect(s).toBe(100)
      expect(l).toBe(50)
    })

    it("converts green correctly", () => {
      const [h, s, l] = rgbToHsl(0, 255, 0)
      expect(h).toBe(120)
      expect(s).toBe(100)
      expect(l).toBe(50)
    })
  })

  describe("rgbToHex", () => {
    it("converts rgb to hex format", () => {
      expect(rgbToHex(255, 255, 255)).toBe("#ffffff")
      expect(rgbToHex(0, 0, 0)).toBe("#000000")
      expect(rgbToHex(79, 70, 229)).toBe("#4f46e5")
    })
  })

  describe("getQuantizedColorName", () => {
    it("quantizes high lightness to White", () => {
      expect(getQuantizedColorName(0, 0, 95)).toBe("White")
    })

    it("quantizes low lightness to Black", () => {
      expect(getQuantizedColorName(0, 0, 5)).toBe("Black")
    })

    it("quantizes low saturation to Gray", () => {
      expect(getQuantizedColorName(120, 5, 50)).toBe("Gray")
    })

    it("quantizes brown colors", () => {
      expect(getQuantizedColorName(30, 40, 30)).toBe("Brown")
    })

    it("quantizes standard hues correctly", () => {
      expect(getQuantizedColorName(0, 100, 50)).toBe("Red")
      expect(getQuantizedColorName(30, 80, 50)).toBe("Orange")
      expect(getQuantizedColorName(60, 100, 50)).toBe("Yellow")
      expect(getQuantizedColorName(120, 100, 50)).toBe("Green")
      expect(getQuantizedColorName(180, 100, 50)).toBe("Cyan")
      expect(getQuantizedColorName(220, 100, 50)).toBe("Blue")
      expect(getQuantizedColorName(270, 100, 50)).toBe("Purple")
      expect(getQuantizedColorName(320, 100, 50)).toBe("Pink")
    })
  })

  describe("analyzeImageColors", () => {
    it("returns default/fallback values in Node test environment", async () => {
      const colors = await analyzeImageColors("http://example.com/test.png")
      expect(colors.dominantName).toBe("Gray")
      expect(colors.accentName).toBe("Gray")
      expect(colors.dominantHex).toBe("#64748b")
      expect(colors.accentHex).toBe("#94a3b8")
      expect(colors.isFallback).toBe(true)
    })

    it("returns default/fallback values when image is placeholder asset", async () => {
      const colors1 = await analyzeImageColors("assets/icon.png")
      expect(colors1.dominantName).toBe("Gray")

      const colors2 = await analyzeImageColors("url:../../assets/icon.png")
      expect(colors2.dominantName).toBe("Gray")
    })

    it("returns rarity-specific fallback values based on the tier provided", async () => {
      const commonColors = await analyzeImageColors(
        "http://example.com/test.png",
        "Common"
      )
      expect(commonColors.dominantHex).toBe("#64748b")
      expect(commonColors.accentHex).toBe("#94a3b8")
      expect(commonColors.isFallback).toBe(true)

      const legendaryColors = await analyzeImageColors(
        "http://example.com/test.png",
        "Legendary"
      )
      expect(legendaryColors.dominantHex).toBe("#d97706")
      expect(legendaryColors.accentHex).toBe("#fbbf24")
      expect(legendaryColors.isFallback).toBe(true)
    })

    describe("with mock window APIs for memory leak and fallback validation", () => {
      let originalImage: any
      let originalCreateElement: any
      let mockContext: any
      let mockCanvas: any

      beforeEach(() => {
        vi.stubEnv("BYPASS_VITEST", "true")
        originalImage = global.Image

        // Mock canvas context
        mockContext = {
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({
            data: new Uint8ClampedArray([
              255,
              0,
              0,
              255, // Red pixel
              0,
              0,
              0,
              255, // Black pixel (Neutral dominant candidate)
              0,
              0,
              255,
              255, // Blue pixel (Chromatic accent candidate)
              255,
              255,
              255,
              0 // Transparent pixel (Should be ignored)
            ])
          })
        }

        mockCanvas = {
          getContext: vi.fn().mockReturnValue(mockContext),
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

      it("should revoke object URL on load success", async () => {
        const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url")
        const revokeObjectURLMock = vi.fn()

        const originalCreateObjectURL = global.URL.createObjectURL
        const originalRevokeObjectURL = global.URL.revokeObjectURL
        global.URL.createObjectURL = createObjectURLMock
        global.URL.revokeObjectURL = revokeObjectURLMock

        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          blob: () =>
            Promise.resolve(new Blob(["mock-image"], { type: "image/png" }))
        })
        const originalFetch = global.fetch
        global.fetch = fetchMock

        class MockImage {
          crossOrigin = ""
          _src = ""
          onload = () => {}
          onerror = () => {}

          get src() {
            return this._src
          }

          set src(val) {
            this._src = val
            setTimeout(() => {
              this.onload()
            }, 0)
          }
        }
        global.Image = MockImage as any

        try {
          const colors = await analyzeImageColors(
            "https://example.com/test-image.png"
          )
          expect(createObjectURLMock).toHaveBeenCalled()
          expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url")
          expect(colors.isFallback).toBe(false)
          expect(colors.dominantName).toBeDefined()
        } finally {
          global.URL.createObjectURL = originalCreateObjectURL
          global.URL.revokeObjectURL = originalRevokeObjectURL
          global.fetch = originalFetch
        }
      })

      it("should revoke object URL on load error", async () => {
        const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url")
        const revokeObjectURLMock = vi.fn()

        const originalCreateObjectURL = global.URL.createObjectURL
        const originalRevokeObjectURL = global.URL.revokeObjectURL
        global.URL.createObjectURL = createObjectURLMock
        global.URL.revokeObjectURL = revokeObjectURLMock

        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          blob: () =>
            Promise.resolve(new Blob(["mock-image"], { type: "image/png" }))
        })
        const originalFetch = global.fetch
        global.fetch = fetchMock

        class MockImage {
          crossOrigin = ""
          _src = ""
          onload = () => {}
          onerror = () => {}

          get src() {
            return this._src
          }

          set src(val) {
            this._src = val
            setTimeout(() => {
              this.onerror()
            }, 0)
          }
        }
        global.Image = MockImage as any

        try {
          const colors = await analyzeImageColors(
            "https://example.com/test-image.png"
          )
          expect(createObjectURLMock).toHaveBeenCalled()
          expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url")
          expect(colors.isFallback).toBe(true)
        } finally {
          global.URL.createObjectURL = originalCreateObjectURL
          global.URL.revokeObjectURL = originalRevokeObjectURL
          global.fetch = originalFetch
        }
      })

      it("should fallback to direct URL without object URL on fetch error", async () => {
        const createObjectURLMock = vi.fn()
        const revokeObjectURLMock = vi.fn()

        const originalCreateObjectURL = global.URL.createObjectURL
        const originalRevokeObjectURL = global.URL.revokeObjectURL
        global.URL.createObjectURL = createObjectURLMock
        global.URL.revokeObjectURL = revokeObjectURLMock

        const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"))
        const originalFetch = global.fetch
        global.fetch = fetchMock

        let setSrcValue = ""
        class MockImage {
          crossOrigin = ""
          onload = () => {}
          onerror = () => {}

          set src(val) {
            setSrcValue = val
            setTimeout(() => {
              this.onload()
            }, 0)
          }
        }
        global.Image = MockImage as any

        try {
          const colors = await analyzeImageColors(
            "https://example.com/fallback.png"
          )
          expect(fetchMock).toHaveBeenCalled()
          expect(createObjectURLMock).not.toHaveBeenCalled()
          expect(revokeObjectURLMock).not.toHaveBeenCalled()
          expect(setSrcValue).toBe("https://example.com/fallback.png")
          expect(colors.isFallback).toBe(false)
        } finally {
          global.URL.createObjectURL = originalCreateObjectURL
          global.URL.revokeObjectURL = originalRevokeObjectURL
          global.fetch = originalFetch
        }
      })

      it("handles canvas fallback sizing: width > height and width > maxWidth", async () => {
        // Mock image details
        class MockImage {
          width = 300
          height = 100
          naturalWidth = 300
          naturalHeight = 100
          onload = () => {}
          set src(val) {
            setTimeout(() => this.onload(), 0)
          }
        }
        global.Image = MockImage as any

        const colors = await analyzeImageColors("data:image/png;base64,mock")
        expect(colors.isFallback).toBe(false)
      })

      it("handles context not available error gracefully", async () => {
        mockCanvas.getContext = vi.fn().mockReturnValue(null)

        class MockImage {
          onload = () => {}
          set src(val) {
            setTimeout(() => this.onload(), 0)
          }
        }
        global.Image = MockImage as any

        const colors = await analyzeImageColors("data:image/png;base64,mock")
        expect(colors.isFallback).toBe(true)
      })

      it("handles empty sorted colors list by returning fallback", async () => {
        // Return empty pixel array to simulate zero valid chromatic/non-transparent pixels
        mockContext.getImageData = vi.fn().mockReturnValue({
          data: new Uint8ClampedArray([])
        })

        class MockImage {
          onload = () => {}
          set src(val) {
            setTimeout(() => this.onload(), 0)
          }
        }
        global.Image = MockImage as any

        const colors = await analyzeImageColors("data:image/png;base64,mock")
        expect(colors.isFallback).toBe(true)
      })

      it("picks a chromatic accent color when dominant color is neutral", async () => {
        // Return 95% black pixels (Neutral) and 5% red pixels (Chromatic)
        const pixels: number[] = []
        for (let i = 0; i < 95; i++) {
          pixels.push(0, 0, 0, 255) // Black
        }
        for (let i = 0; i < 5; i++) {
          pixels.push(255, 0, 0, 255) // Red
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(pixels)
        })

        class MockImage {
          onload = () => {}
          set src(val) {
            setTimeout(() => this.onload(), 0)
          }
        }
        global.Image = MockImage as any

        const colors = await analyzeImageColors("data:image/png;base64,mock")
        expect(colors.isFallback).toBe(false)
        expect(colors.dominantName).toBe("Black")
        expect(colors.accentName).toBe("Red")
      })

      it("picks another neutral color as accent when dominant is neutral and no chromatic exists", async () => {
        // Return 95% black pixels (Neutral) and 5% white pixels (Neutral)
        const pixels: number[] = []
        for (let i = 0; i < 95; i++) {
          pixels.push(0, 0, 0, 255) // Black
        }
        for (let i = 0; i < 5; i++) {
          pixels.push(255, 255, 255, 255) // White
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(pixels)
        })

        class MockImage {
          onload = () => {}
          set src(val) {
            setTimeout(() => this.onload(), 0)
          }
        }
        global.Image = MockImage as any

        const colors = await analyzeImageColors("data:image/png;base64,mock")
        expect(colors.isFallback).toBe(false)
        expect(colors.dominantName).toBe("Black")
        expect(colors.accentName).toBe("White")
      })

      it("picks dominant as accent when only one neutral color exists", async () => {
        // Return 100% black pixels
        const pixels: number[] = []
        for (let i = 0; i < 100; i++) {
          pixels.push(0, 0, 0, 255) // Black
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(pixels)
        })

        class MockImage {
          onload = () => {}
          set src(val) {
            setTimeout(() => this.onload(), 0)
          }
        }
        global.Image = MockImage as any

        const colors = await analyzeImageColors("data:image/png;base64,mock")
        expect(colors.isFallback).toBe(false)
        expect(colors.dominantName).toBe("Black")
        expect(colors.accentName).toBe("Black")
      })
    })
  })

  describe("getQuantizedColorName fallback", () => {
    it("returns Gray for invalid or NaN hue", () => {
      expect(getQuantizedColorName(NaN, 50, 50)).toBe("Gray")
    })
  })

  describe("hex helpers", () => {
    it("converts hex to rgb", () => {
      expect(hexToRgb("#ffffff")).toEqual([255, 255, 255])
      expect(hexToRgb("#000000")).toEqual([0, 0, 0])
      expect(hexToRgb("#ff0000")).toEqual([255, 0, 0])
      expect(hexToRgb("invalid")).toEqual([0, 0, 0])
      expect(hexToRgb("#f00")).toEqual([255, 0, 0])
    })

    it("converts hex to hsl", () => {
      expect(hexToHsl("#ffffff")).toEqual([0, 0, 100])
      expect(hexToHsl("#ff0000")).toEqual([0, 100, 50])
    })

    it("gets color name from hex", () => {
      expect(getColorNameFromHex("#ff0000")).toBe("Red")
      expect(getColorNameFromHex("#0000ff")).toBe("Blue")
      expect(getColorNameFromHex("#ffffff")).toBe("White")
    })
  })
})
