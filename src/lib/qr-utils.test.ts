import { describe, expect, it, vi } from "vitest"

import type { StyleCard } from "./db-schema"
import {
  compressCardData,
  decompressCardData,
  generateQRCodeUrl,
  readQRCodeFromImage
} from "./qr-utils"

let mockJsQrResult: any = { data: "mocked-qr-payload" }
vi.mock("jsqr", () => ({
  default: vi.fn().mockImplementation(() => mockJsQrResult)
}))

describe("qr-utils", () => {
  const mockCard: StyleCard = {
    id: "test-uuid-1234",
    name: "Neon Cyber Cat",
    createdAt: 1234567890,
    updatedAt: 1234567890,
    promptSegments: [
      { type: "text", value: "a beautiful neon cyber cat" },
      { type: "slot", label: "accessory", default: "with glasses" }
    ],
    parameters: {
      ar: "16:9",
      sref: ["https://cdn.midjourney.com/sref-1.png"],
      stylize: 250,
      raw: true
    },
    masking: {
      isSrefHidden: false,
      isPHidden: false
    },
    tier: "Rare",
    isFavorite: true,
    usageCount: 5,
    tags: ["cyberpunk", "neon", "cat"],
    dominantColor: "#FF00FF",
    accentColor: "#00FFFF",
    thumbnailData: "data:image/png;base64,heavythumbnaildatablahblah",
    frameId: "frame_holo_v1",
    genealogy: {
      generation: 1,
      parentIds: []
    },
    images: ["https://cdn.midjourney.com/original-image.png"]
  }

  describe("compressCardData and decompressCardData", () => {
    it("should compress and decompress card data successfully, maintaining key fields", () => {
      const compressed = compressCardData(mockCard)
      expect(typeof compressed).toBe("string")
      expect(compressed.length).toBeGreaterThan(0)

      // Verify that heavy visual data is not in the compressed payload (it shouldn't contain the raw thumbnailData string)
      expect(compressed).not.toContain("heavythumbnaildatablahblah")

      const decompressed = decompressCardData(compressed)

      expect(decompressed.id).toBe(mockCard.id)
      expect(decompressed.name).toBe(mockCard.name)
      expect(decompressed.promptSegments).toEqual(mockCard.promptSegments)
      expect(decompressed.parameters).toEqual(mockCard.parameters)
      expect(decompressed.tier).toBe(mockCard.tier)
      expect(decompressed.frameId).toBe(mockCard.frameId)
      expect(decompressed.dominantColor).toBe(mockCard.dominantColor)
      expect(decompressed.accentColor).toBe(mockCard.accentColor)

      // Original image URL should be preserved in images and selectedThumbnails
      expect(decompressed.images).toEqual([
        "https://cdn.midjourney.com/original-image.png"
      ])
      expect(decompressed.selectedThumbnails).toEqual([
        "https://cdn.midjourney.com/original-image.png"
      ])

      // Stripped properties should not be defined
      expect(decompressed.thumbnailData).toBeUndefined()
    })

    it("should respect masking configuration and delete hidden parameters during compression", () => {
      const maskedCard: StyleCard = {
        ...mockCard,
        parameters: {
          ...mockCard.parameters,
          p: ["personalization-code-123"]
        },
        masking: {
          isSrefHidden: true,
          isPHidden: true
        }
      }

      const compressed = compressCardData(maskedCard)
      const decompressed = decompressCardData(compressed)

      expect(decompressed.parameters?.sref).toBeUndefined()
      expect(decompressed.parameters?.p).toBeUndefined()
      expect(decompressed.parameters?.ar).toBe("16:9")
      expect(decompressed.parameters?.stylize).toBe(250)
      expect(decompressed.parameters?.raw).toBe(true)
    })

    it("should decompress card data from custom protocol URL formats", () => {
      const compressed = compressCardData(mockCard)
      const urls = [
        `web+styleatelier://import?data=${compressed}`,
        `web+style-atelier://import?data=${compressed}`,
        `style-atelier://import?data=${compressed}`
      ]

      for (const url of urls) {
        const decompressed = decompressCardData(url)
        expect(decompressed.id).toBe(mockCard.id)
        expect(decompressed.name).toBe(mockCard.name)
      }
    })

    it("should throw an error when decompressing invalid data", () => {
      expect(() => decompressCardData("invalid-base64-payload")).toThrow()
    })
  })

  describe("generateQRCodeUrl", () => {
    it("should generate a QR code data URL successfully", async () => {
      const compressed = compressCardData(mockCard)
      const qrDataUrl = await generateQRCodeUrl(compressed)

      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe("readQRCodeFromImage", () => {
    it("should successfully read QR code from image", async () => {
      mockJsQrResult = { data: "mocked-qr-payload" }

      // Mock FileReader
      class MockFileReader {
        onload: any
        readAsDataURL() {
          this.onload({ target: { result: "data:image/png;base64,mock" } })
        }
      }
      vi.stubGlobal("FileReader", MockFileReader)

      // Mock Image
      class MockImage {
        width = 100
        height = 100
        onload: any
        set src(val: string) {
          this.onload()
        }
      }
      vi.stubGlobal("Image", MockImage)

      // Mock canvas getContext
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        getImageData: vi
          .fn()
          .mockReturnValue({
            data: new Uint8ClampedArray([1, 2, 3]),
            width: 100,
            height: 100
          })
      })

      const mockFile = new File([""], "test.png", { type: "image/png" })
      const result = await readQRCodeFromImage(mockFile)
      expect(result).toBe("mocked-qr-payload")

      // Restore original getContext
      HTMLCanvasElement.prototype.getContext = originalGetContext
    })

    it("should return null if FileReader fails", async () => {
      class MockFileReaderFail {
        onerror: any
        readAsDataURL() {
          this.onerror()
        }
      }
      vi.stubGlobal("FileReader", MockFileReaderFail)

      const mockFile = new File([""], "test.png", { type: "image/png" })
      const result = await readQRCodeFromImage(mockFile)
      expect(result).toBeNull()
    })

    it("should return null if Image fails to load", async () => {
      class MockFileReader {
        onload: any
        readAsDataURL() {
          this.onload({ target: { result: "data:image/png;base64,mock" } })
        }
      }
      vi.stubGlobal("FileReader", MockFileReader)

      class MockImageFail {
        onerror: any
        set src(val: string) {
          this.onerror()
        }
      }
      vi.stubGlobal("Image", MockImageFail)

      const mockFile = new File([""], "test.png", { type: "image/png" })
      const result = await readQRCodeFromImage(mockFile)
      expect(result).toBeNull()
    })

    it("should return null if canvas context is not available", async () => {
      class MockFileReader {
        onload: any
        readAsDataURL() {
          this.onload({ target: { result: "data:image/png;base64,mock" } })
        }
      }
      vi.stubGlobal("FileReader", MockFileReader)

      class MockImage {
        onload: any
        set src(val: string) {
          this.onload()
        }
      }
      vi.stubGlobal("Image", MockImage)

      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null)

      const mockFile = new File([""], "test.png", { type: "image/png" })
      const result = await readQRCodeFromImage(mockFile)
      expect(result).toBeNull()

      HTMLCanvasElement.prototype.getContext = originalGetContext
    })

    it("should return null if jsQR cannot find QR code", async () => {
      mockJsQrResult = null

      class MockFileReader {
        onload: any
        readAsDataURL() {
          this.onload({ target: { result: "data:image/png;base64,mock" } })
        }
      }
      vi.stubGlobal("FileReader", MockFileReader)

      class MockImage {
        onload: any
        set src(val: string) {
          this.onload()
        }
      }
      vi.stubGlobal("Image", MockImage)

      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        getImageData: vi
          .fn()
          .mockReturnValue({
            data: new Uint8ClampedArray([1, 2, 3]),
            width: 100,
            height: 100
          })
      })

      const mockFile = new File([""], "test.png", { type: "image/png" })
      const result = await readQRCodeFromImage(mockFile)
      expect(result).toBeNull()

      HTMLCanvasElement.prototype.getContext = originalGetContext
    })
  })
})
