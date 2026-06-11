import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  analyzeImageColors,
  determineDominantAndAccent,
  extractColorsFromImage,
  filterByHue,
  getColorNameFromHex,
  getFallbackColors,
  getQuantizedColorName,
  getSortedWeightedColors,
  hexToHsl,
  hexToRgb,
  loadImageAndProcess,
  rgbToHex,
  rgbToHsl,
  samplePixels,
  selectAccentColor,
  setupImageSrc,
  shouldUseFallback
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

  describe("Refactored color-utils helpers & edge cases", () => {
    describe("determineDominantAndAccent edge cases", () => {
      it("handles complete grayscale images (no chromatic colors)", () => {
        const nameCounts = {
          Gray: { count: 80, rSum: 10240, gSum: 10240, bSum: 10240 },
          Black: { count: 20, rSum: 0, gSum: 0, bSum: 0 }
        }
        const colors = determineDominantAndAccent(nameCounts, "Common")
        expect(colors.dominantName).toBe("Gray")
        expect(colors.accentName).toBe("Black")
        expect(colors.dominantHex).toBe("#808080")
        expect(colors.accentHex).toBe("#000000")
        expect(colors.isFallback).toBe(false)
      })

      it("handles complete grayscale images with single neutral color", () => {
        const nameCounts = {
          Gray: { count: 100, rSum: 12800, gSum: 12800, bSum: 12800 }
        }
        const colors = determineDominantAndAccent(nameCounts, "Common")
        expect(colors.dominantName).toBe("Gray")
        expect(colors.accentName).toBe("Gray")
        expect(colors.dominantHex).toBe("#808080")
        expect(colors.accentHex).toBe("#808080")
        expect(colors.isFallback).toBe(false)
      })

      it("handles transparent/alpha-channel images by ignoring alpha < 128 in samplePixels", () => {
        const data = new Uint8ClampedArray([
          255,
          0,
          0,
          100, // Transparent Red (should be ignored)
          0,
          255,
          0,
          0, // Fully transparent Green (should be ignored)
          0,
          0,
          255,
          128, // Semi-transparent Blue (alpha >= 128, should be counted)
          255,
          255,
          255,
          255 // Opaque White (should be counted)
        ])
        const nameCounts = samplePixels(data)
        expect(nameCounts.Red).toBeUndefined()
        expect(nameCounts.Green).toBeUndefined()
        expect(nameCounts.Blue).toBeDefined()
        expect(nameCounts.Blue.count).toBe(1)
        expect(nameCounts.White).toBeDefined()
        expect(nameCounts.White.count).toBe(1)
      })

      it("handles extreme resolution differences - 1x1 image", () => {
        const data = new Uint8ClampedArray([255, 0, 0, 255]) // 1 red pixel
        const nameCounts = samplePixels(data)
        const colors = determineDominantAndAccent(nameCounts, "Common")
        expect(colors.dominantName).toBe("Red")
        expect(colors.accentName).toBe("Red")
        expect(colors.dominantHex).toBe("#ff0000")
      })
    })

    describe("getQuantizedColorName boundary values", () => {
      it("tests lightness boundaries", () => {
        expect(getQuantizedColorName(0, 50, 86)).toBe("White") // l > 85
        expect(getQuantizedColorName(0, 50, 85)).not.toBe("White")
        expect(getQuantizedColorName(0, 50, 14)).toBe("Black") // l < 15
        expect(getQuantizedColorName(0, 50, 15)).not.toBe("Black")
      })

      it("tests saturation boundary", () => {
        expect(getQuantizedColorName(120, 14, 50)).toBe("Gray") // s < 15
        expect(getQuantizedColorName(120, 15, 50)).not.toBe("Gray")
      })

      it("tests brown boundaries", () => {
        // Brown criteria: h >= 15 && h < 45 && s < 50 && l < 50
        expect(getQuantizedColorName(15, 49, 49)).toBe("Brown")
        expect(getQuantizedColorName(44, 49, 49)).toBe("Brown")
        expect(getQuantizedColorName(14, 49, 49)).not.toBe("Brown")
        expect(getQuantizedColorName(45, 49, 49)).not.toBe("Brown")
        expect(getQuantizedColorName(30, 50, 49)).not.toBe("Brown")
        expect(getQuantizedColorName(30, 49, 50)).not.toBe("Brown")
      })

      it("tests hue boundaries for standard names", () => {
        // Red: h >= 345 || h < 15
        expect(getQuantizedColorName(345, 100, 50)).toBe("Red")
        expect(getQuantizedColorName(344, 100, 50)).toBe("Pink")
        expect(getQuantizedColorName(14, 100, 50)).toBe("Red")
        expect(getQuantizedColorName(15, 100, 50)).toBe("Orange")

        // Orange: h >= 15 && h < 45
        expect(getQuantizedColorName(44, 100, 50)).toBe("Orange")
        expect(getQuantizedColorName(45, 100, 50)).toBe("Yellow")

        // Yellow: h >= 45 && h < 70
        expect(getQuantizedColorName(69, 100, 50)).toBe("Yellow")
        expect(getQuantizedColorName(70, 100, 50)).toBe("Green")

        // Green: h >= 70 && h < 160
        expect(getQuantizedColorName(159, 100, 50)).toBe("Green")
        expect(getQuantizedColorName(160, 100, 50)).toBe("Cyan")

        // Cyan: h >= 160 && h < 195
        expect(getQuantizedColorName(194, 100, 50)).toBe("Cyan")
        expect(getQuantizedColorName(195, 100, 50)).toBe("Blue")

        // Blue: h >= 195 && h < 250
        expect(getQuantizedColorName(249, 100, 50)).toBe("Blue")
        expect(getQuantizedColorName(250, 100, 50)).toBe("Purple")

        // Purple: h >= 250 && h < 290
        expect(getQuantizedColorName(289, 100, 50)).toBe("Purple")
        expect(getQuantizedColorName(290, 100, 50)).toBe("Pink")

        // Pink: h >= 290 && h < 345
        expect(getQuantizedColorName(344, 100, 50)).toBe("Pink")
      })
    })

    describe("setupImageSrc utility", () => {
      it("returns null and sets src directly for data URL", async () => {
        const img = { src: "" } as any
        const res = await setupImageSrc("data:image/png;base64,mock", img)
        expect(res).toBeNull()
        expect(img.src).toBe("data:image/png;base64,mock")
      })

      it("returns null and sets src directly for blob URL", async () => {
        const img = { src: "" } as any
        const res = await setupImageSrc("blob:mock-url", img)
        expect(res).toBeNull()
        expect(img.src).toBe("blob:mock-url")
      })
    })

    describe("filterByHue utility", () => {
      it("returns false for undefined color", () => {
        expect(filterByHue(undefined, 100)).toBe(false)
      })

      it("returns false for invalid color format", () => {
        expect(filterByHue("invalid", 100)).toBe(false)
      })

      it("returns false for neutral colors (low saturation or extreme lightness)", () => {
        // Gray (s < 15)
        expect(filterByHue("#808080", 120)).toBe(false)
        // White (l > 90)
        expect(filterByHue("#fdfdfd", 120)).toBe(false)
        // Black (l < 10)
        expect(filterByHue("#020202", 120)).toBe(false)
      })

      it("tests HSL boundary values strictly", () => {
        // s = 14% (< 15) -> false
        expect(filterByHue("#6d916d", 120)).toBe(false)
        // s = 16% (>= 15) -> true
        expect(filterByHue("#6b946b", 120)).toBe(true)

        // l = 91% (> 90) -> false
        expect(filterByHue("#d1ffd1", 120)).toBe(false)
        // l = 89% (<= 90) -> true
        expect(filterByHue("#c7ffc7", 120)).toBe(true)

        // l = 9% (< 10) -> false
        expect(filterByHue("#002e00", 120)).toBe(false)
        // l = 11% (>= 10) -> true
        expect(filterByHue("#003800", 120)).toBe(true)
      })

      it("checks hue difference bounds correctly and kills math sign mutations", () => {
        // Red is hue 0 (or 360). Target hue 15 => difference 15 (<= 25)
        expect(filterByHue("#ff0000", 15)).toBe(true)
        // Target hue 25 => difference 25 (<= 25)
        expect(filterByHue("#ff0000", 25)).toBe(true)
        // Target hue 26 => difference 26 (> 25)
        expect(filterByHue("#ff0000", 26)).toBe(false)

        // Target hue 350 => difference 10 (<= 25, wrap around 360)
        expect(filterByHue("#ff0000", 350)).toBe(true)
        // Target hue 335 => difference 25 (<= 25, wrap around 360)
        expect(filterByHue("#ff0000", 335)).toBe(true)
        // Target hue 334 => difference 26 (> 25, wrap around 360)
        expect(filterByHue("#ff0000", 334)).toBe(false)

        // Yellow is hue 60. Target hue 40 -> difference 20 (<= 25)
        expect(filterByHue("#ffff00", 40)).toBe(true)
        // Yellow is hue 60. Target hue 80 -> difference -20 (absolute 20 <= 25)
        expect(filterByHue("#ffff00", 80)).toBe(true)
      })
    })

    describe("shouldUseFallback utility", () => {
      it("returns true for empty string, icon paths, or when test environment requires fallback", () => {
        expect(shouldUseFallback("")).toBe(true)
        expect(shouldUseFallback("assets/icon.png")).toBe(true)
      })
    })

    describe("getFallbackColors utility", () => {
      it("returns correct fallback colors for rarity tiers", () => {
        const commonFallback = getFallbackColors("Common")
        expect(commonFallback.isFallback).toBe(true)
        expect(commonFallback.dominantName).toBe("Gray")

        const rareFallback = getFallbackColors("Rare")
        expect(rareFallback.isFallback).toBe(true)
        expect(rareFallback.dominantName).toBe("Blue")
      })
    })

    describe("setupImageSrc error handling", () => {
      it("handles fetch failure by setting direct URL and returning null", async () => {
        const originalFetch = global.fetch
        global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))
        const consoleWarnSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {})

        const img = { src: "" } as any
        const res = await setupImageSrc("http://example.com/image.png", img)

        expect(res).toBeNull()
        expect(img.src).toBe("http://example.com/image.png")
        expect(consoleWarnSpy).toHaveBeenCalled()

        global.fetch = originalFetch
        consoleWarnSpy.mockRestore()
      })

      it("handles fetch non-ok status by setting direct URL and returning null", async () => {
        const originalFetch = global.fetch
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404
        })
        const consoleWarnSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {})

        const img = { src: "" } as any
        const res = await setupImageSrc("http://example.com/image.png", img)

        expect(res).toBeNull()
        expect(img.src).toBe("http://example.com/image.png")

        global.fetch = originalFetch
        consoleWarnSpy.mockRestore()
      })
    })

    describe("rgbToHsl detailed branches", () => {
      it("tests max === r with g < b", () => {
        expect(rgbToHsl(255, 0, 128)).toEqual([330, 100, 50])
      })

      it("tests max === g", () => {
        expect(rgbToHsl(0, 255, 128)).toEqual([150, 100, 50])
      })

      it("tests max === b", () => {
        expect(rgbToHsl(128, 0, 255)).toEqual([270, 100, 50])
      })
    })

    describe("rgbToHex padding", () => {
      it("pads single digit hex numbers", () => {
        expect(rgbToHex(5, 10, 15)).toBe("#050a0f")
      })
    })

    describe("determineDominantAndAccent chromatic vs neutral weighting", () => {
      it("prioritizes chromatic colors over neutral ones via weighting", () => {
        const nameCounts = {
          White: { count: 10, rSum: 2550, gSum: 2550, bSum: 2550 },
          Red: { count: 5, rSum: 1275, gSum: 0, bSum: 0 }
        }
        const sorted = getSortedWeightedColors(nameCounts)
        expect(sorted[0].name).toBe("Red")
        expect(sorted[1].name).toBe("White")
      })

      it("respects 5% threshold boundary for selecting chromatic accent when dominant is neutral", () => {
        // total pixels = 100.
        // White: 83, Black: 12, Red: 5 (chromatic, 5% >= 5% threshold). Red should be selected.
        const nameCounts1 = {
          White: { count: 83, rSum: 21165, gSum: 21165, bSum: 21165 },
          Black: { count: 12, rSum: 0, gSum: 0, bSum: 0 },
          Red: { count: 5, rSum: 1275, gSum: 0, bSum: 0 }
        }
        const colors1 = determineDominantAndAccent(nameCounts1, "Common")
        expect(colors1.accentName).toBe("Red")

        // total pixels = 100.
        // White: 84, Black: 12, Red: 4 (chromatic, 4% < 5% threshold). Red is ignored, falls back to Black.
        const nameCounts2 = {
          White: { count: 84, rSum: 21420, gSum: 21420, bSum: 21420 },
          Black: { count: 12, rSum: 0, gSum: 0, bSum: 0 },
          Red: { count: 4, rSum: 1020, gSum: 0, bSum: 0 }
        }
        const colors2 = determineDominantAndAccent(nameCounts2, "Common")
        expect(colors2.accentName).toBe("Black")
      })
    })

    describe("setupImageSrc success scenario", () => {
      it("returns blob URL on successful fetch", async () => {
        const originalFetch = global.fetch
        const mockBlob = new Blob(["mock"], { type: "image/png" })
        const mockCreateObjectURL = vi
          .fn()
          .mockReturnValue("blob:successful-fetch")
        const originalCreateObjectURL = URL.createObjectURL
        URL.createObjectURL = mockCreateObjectURL

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          blob: vi.fn().mockResolvedValue(mockBlob)
        })

        const img = { src: "" } as any
        const res = await setupImageSrc("http://example.com/image.png", img)

        expect(res).toBe("blob:successful-fetch")
        expect(img.src).toBe("blob:successful-fetch")

        global.fetch = originalFetch
        URL.createObjectURL = originalCreateObjectURL
      })
    })

    describe("shouldUseFallback process env overrides", () => {
      it("returns correct fallback state depending on process.env settings", () => {
        const originalBypass = process.env.BYPASS_VITEST

        process.env.BYPASS_VITEST = "true"
        expect(shouldUseFallback("http://example.com/image.png")).toBe(false)

        process.env.BYPASS_VITEST = "false"
        expect(shouldUseFallback("http://example.com/image.png")).toBe(true)

        process.env.BYPASS_VITEST = originalBypass
      })

      it("checks empty string, assets paths, and normal URLs with bypass configurations", () => {
        const originalBypass = process.env.BYPASS_VITEST
        process.env.BYPASS_VITEST = "true"

        expect(shouldUseFallback("")).toBe(true)
        expect(shouldUseFallback("assets/icon.png")).toBe(true)
        expect(shouldUseFallback("/assets/icon.png")).toBe(true)
        expect(shouldUseFallback("my-assets/icon.png-suffix")).toBe(true)
        expect(shouldUseFallback("http://example.com/normal.png")).toBe(false)

        process.env.BYPASS_VITEST = originalBypass
      })
    })

    describe("setupImageSrc optimization and skip rules", () => {
      it("does not fetch for data or blob URLs", async () => {
        const originalFetch = global.fetch
        const fetchSpy = vi.fn()
        global.fetch = fetchSpy

        const img = { src: "" } as any
        await setupImageSrc("data:image/png;base64,mock", img)
        await setupImageSrc("blob:mock-url", img)

        expect(fetchSpy).not.toHaveBeenCalled()
        global.fetch = originalFetch
      })
    })

    describe("getFallbackColors edge cases", () => {
      it("defaults to Common fallback when rarity is undefined or empty", () => {
        const fallback1 = getFallbackColors(undefined)
        expect(fallback1.dominantHex).toBe("#64748b")

        const fallback2 = getFallbackColors("")
        expect(fallback2.dominantHex).toBe("#64748b")
      })
    })

    describe("determineDominantAndAccent with Black and Gray dominants", () => {
      it("handles dominant Black and respects 5% chromatic accent threshold", () => {
        // dominant is Black.
        // total pixels = 100.
        // Black: 83, White: 12, Red: 5 (chromatic, 5% >= 5% threshold). Red should be selected as accent.
        const nameCounts1 = {
          Black: { count: 83, rSum: 0, gSum: 0, bSum: 0 },
          White: { count: 12, rSum: 3060, gSum: 3060, bSum: 3060 },
          Red: { count: 5, rSum: 1275, gSum: 0, bSum: 0 }
        }
        const colors1 = determineDominantAndAccent(nameCounts1, "Common")
        expect(colors1.accentName).toBe("Red")

        // Black: 84, White: 12, Red: 4 (chromatic, 4% < 5% threshold). Red ignored, falls back to alternative dominant (White).
        const nameCounts2 = {
          Black: { count: 84, rSum: 0, gSum: 0, bSum: 0 },
          White: { count: 12, rSum: 3060, gSum: 3060, bSum: 3060 },
          Red: { count: 4, rSum: 1020, gSum: 0, bSum: 0 }
        }
        const colors2 = determineDominantAndAccent(nameCounts2, "Common")
        expect(colors2.accentName).toBe("White")
      })

      it("handles dominant Gray and respects 5% chromatic accent threshold", () => {
        // dominant is Gray.
        // total pixels = 100.
        // Gray: 83, Black: 12, Red: 5 (chromatic, 5% >= 5% threshold). Red should be selected.
        const nameCounts1 = {
          Gray: { count: 83, rSum: 10582, gSum: 10582, bSum: 10582 },
          Black: { count: 12, rSum: 0, gSum: 0, bSum: 0 },
          Red: { count: 5, rSum: 1275, gSum: 0, bSum: 0 }
        }
        const colors1 = determineDominantAndAccent(nameCounts1, "Common")
        expect(colors1.accentName).toBe("Red")

        // Gray: 84, Black: 12, Red: 4 (chromatic, 4% < 5% threshold). Red ignored, falls back to alternative dominant (Black).
        const nameCounts2 = {
          Gray: { count: 84, rSum: 10710, gSum: 10710, bSum: 10710 },
          Black: { count: 12, rSum: 0, gSum: 0, bSum: 0 },
          Red: { count: 4, rSum: 1020, gSum: 0, bSum: 0 }
        }
        const colors2 = determineDominantAndAccent(nameCounts2, "Common")
        expect(colors2.accentName).toBe("Black")
      })
    })

    describe("loadImageAndProcess with fully transparent image", () => {
      it("returns fallback colors when no pixels are visible (totalPixels === 0)", async () => {
        // Mock a 2x2 transparent canvas
        const originalCreateElement = document.createElement
        const mockContext = {
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({
            // 2x2 image => 4 pixels. 4 elements per pixel (r, g, b, a).
            // All alpha values are 0.
            data: new Uint8ClampedArray([
              255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 255, 0, 255, 255, 0, 0
            ])
          })
        }
        const mockCanvas = {
          getContext: vi.fn().mockReturnValue(mockContext),
          width: 2,
          height: 2
        }

        document.createElement = vi.fn().mockImplementation((tagName) => {
          if (tagName === "canvas") return mockCanvas
          return originalCreateElement.call(document, tagName)
        })

        // Use analyzeImageColors directly to trigger extractColorsFromImage
        const originalFetch = global.fetch
        // Mock fetch to successfully return a dummy blob to trigger load
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          blob: vi
            .fn()
            .mockResolvedValue(
              new Blob(["mock-image-data"], { type: "image/png" })
            )
        })

        const colors = await analyzeImageColors(
          "http://example.com/transparent.png",
          "Epic"
        )
        // Since all pixels are transparent, totalPixels should be 0, yielding Epic fallback (dominant purple #7c3aed)
        expect(colors.isFallback).toBe(true)
        expect(colors.dominantHex).toBe("#7c3aed")

        document.createElement = originalCreateElement
        global.fetch = originalFetch
      })
    })
  })
})
