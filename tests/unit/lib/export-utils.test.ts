import { db } from "@/lib/db"
import type { StyleCard } from "@/lib/db-schema"
import { renderCardToCanvas } from "@/lib/export-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/qr-utils", () => ({
  compressCardData: vi.fn().mockReturnValue("mocked-compressed-data"),
  generateQRCodeUrl: vi
    .fn()
    .mockResolvedValue("data:image/png;base64,mockedqrcode"),
  insertMetadataToPng: vi.fn().mockImplementation((pngBytes) => pngBytes)
}))

// Mock assets/icon.png
vi.mock("url:../../assets/icon.png", () => ({
  default: "mock-icon-url"
}))

const originalImage = global.Image
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
const originalGetContext = HTMLCanvasElement.prototype.getContext

describe("export-utils", () => {
  let createdObjectURLs: string[] = []
  const mockImageInstances: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    createdObjectURLs = []
    mockImageInstances.length = 0

    URL.createObjectURL = vi.fn((_blob: Blob) => {
      const url = `blob:mock-url-${createdObjectURLs.length}`
      createdObjectURLs.push(url)
      return url
    })
    URL.revokeObjectURL = vi.fn()

    const mockContext = {
      fillRect: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      clip: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      drawImage: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 })
    }

    HTMLCanvasElement.prototype.getContext = vi.fn((contextId) => {
      if (contextId === "2d") {
        return mockContext
      }
      return null
    }) as any

    global.Image = class {
      _src: string = ""
      crossOrigin: string = ""
      onload: (() => void) | null = null
      onerror: ((err: any) => void) | null = null

      constructor() {
        mockImageInstances.push(this)
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }

      set src(val: string) {
        this._src = val
      }
      get src() {
        return this._src
      }
    } as any
  })

  afterEach(() => {
    global.Image = originalImage
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  const baseCard: StyleCard = {
    id: "card-uuid",
    name: "Test Card",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "A beautiful landscape" }],
    parameters: { ar: "16:9" },
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    usageCount: 0,
    tags: [],
    dominantColor: "#123456",
    thumbnailData: "data:image/png;base64,mockbase64",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  // --- HEAD Tests ---
  it("throws error if canvas 2D context is not available", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null)

    await expect(renderCardToCanvas(baseCard)).rejects.toThrow(
      "Could not get 2D context for canvas"
    )
  })

  it("throws error if image loading fails completely", async () => {
    // Override default constructor automatic resolve by clearing load trigger or forcing error
    global.Image = class {
      _src = ""
      crossOrigin = ""
      onload = null
      onerror = null
      constructor() {
        mockImageInstances.push(this)
      }
      set src(val) {
        this._src = val
      }
      get src() {
        return this._src
      }
    } as any

    const promise = renderCardToCanvas(baseCard)

    await vi.waitFor(() => expect(mockImageInstances.length).toBeGreaterThan(0))
    if (mockImageInstances[0].onerror) {
      mockImageInstances[0].onerror(new Error("Image network error"))
    }

    await expect(promise).rejects.toThrow("Failed to draw artwork to canvas")
  })

  it("throws error if QR code generation fails", async () => {
    const { generateQRCodeUrl } = await import("@/lib/qr-utils")
    vi.mocked(generateQRCodeUrl).mockRejectedValueOnce(
      new Error("QR generation failed")
    )

    // Override default constructor to just register instances without auto onload
    global.Image = class {
      _src = ""
      crossOrigin = ""
      onload = null
      onerror = null
      constructor() {
        mockImageInstances.push(this)
      }
      set src(val) {
        this._src = val
      }
      get src() {
        return this._src
      }
    } as any

    const promise = renderCardToCanvas(baseCard)

    await vi.waitFor(() => expect(mockImageInstances.length).toBeGreaterThan(0))
    if (mockImageInstances[0].onload) {
      mockImageInstances[0].onload()
    }

    await expect(promise).rejects.toThrow(
      "Failed to generate QR code: QR generation failed"
    )
  })

  // --- main Tests ---
  it("should prioritize local thumbnailData and skip external CDN loading when only 1 thumbnail is needed", async () => {
    const spyGet = vi.spyOn(db.historyItems, "get").mockResolvedValue(undefined)

    const imageLoadSources: string[] = []
    global.Image = class {
      _src: string = ""
      crossOrigin: string = ""
      onload: (() => void) | null = null
      onerror: ((err: any) => void) | null = null

      set src(val: string) {
        this._src = val
        imageLoadSources.push(val)
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
      get src() {
        return this._src
      }
    } as any

    const card: StyleCard = {
      ...baseCard,
      thumbnailData: "data:image/png;base64,mockbase64",
      selectedThumbnails: ["https://cdn.midjourney.com/image.png"]
    }

    await renderCardToCanvas(card)

    expect(imageLoadSources).toContain("data:image/png;base64,mockbase64")
    expect(imageLoadSources).not.toContain(
      "https://cdn.midjourney.com/image.png"
    )
    expect(spyGet).not.toHaveBeenCalled()
  })

  it("should resolve cached localImageBlob from db.historyItems when grid layout is required and use Object URL", async () => {
    const mockBlob = new Blob(["mock"], { type: "image/png" })
    const spyGet = vi.spyOn(db.historyItems, "get").mockResolvedValue({
      id: "job-1",
      fullCommand: "",
      imageUrl: "https://cdn.midjourney.com/image1.png",
      localImageBlob: mockBlob,
      timestamp: Date.now()
    })

    const imageLoadSources: string[] = []
    global.Image = class {
      _src: string = ""
      crossOrigin: string = ""
      onload: (() => void) | null = null
      onerror: ((err: any) => void) | null = null

      set src(val: string) {
        this._src = val
        imageLoadSources.push(val)
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
      get src() {
        return this._src
      }
    } as any

    const card: StyleCard = {
      ...baseCard,
      thumbnailData: "data:image/png;base64,mockbase64",
      selectedThumbnails: [
        "https://cdn.midjourney.com/image1.png",
        "https://cdn.midjourney.com/image2.png"
      ],
      associatedJobIds: ["job-1"]
    }

    await renderCardToCanvas(card)

    expect(imageLoadSources).toContain("blob:mock-url-0")
    expect(imageLoadSources).toContain("https://cdn.midjourney.com/image2.png")
    expect(spyGet).toHaveBeenCalledWith("job-1")
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url-0")
  })

  describe("exportCardAsImage", () => {
    it("creates an anchor tag and triggers a click to download the card", async () => {
      const { exportCardAsImage } = await import("@/lib/export-utils")

      const mockAnchor = {
        download: "",
        href: "",
        click: vi.fn()
      }

      const spyCreateElement = vi
        .spyOn(document, "createElement")
        .mockImplementation((tagName) => {
          if (tagName === "a") {
            return mockAnchor as any
          }
          // Fallback to default element creation
          return Document.prototype.createElement.call(document, tagName)
        })

      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = vi
        .fn()
        .mockReturnValue("data:image/png;base64,mockedcanvaspng")

      try {
        await exportCardAsImage(baseCard)

        expect(mockAnchor.click).toHaveBeenCalled()
        expect(mockAnchor.download).toContain("Test_Card_")
        expect(mockAnchor.download).toContain(".png")
        expect(mockAnchor.href).toContain("blob:mock-url-")
      } finally {
        spyCreateElement.mockRestore()
        HTMLCanvasElement.prototype.toDataURL = originalToDataURL
      }
    })
  })
})
