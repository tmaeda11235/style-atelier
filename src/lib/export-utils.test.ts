import { describe, it, expect, vi, beforeEach } from "vitest"
import type { StyleCard } from "./db-schema"

vi.mock("./qr-utils", () => ({
  compressCardData: vi.fn().mockReturnValue("mocked-compressed-data"),
  generateQRCodeUrl: vi.fn().mockResolvedValue("data:image/png;base64,mockedqrcode"),
}))

// Mock assets/icon.png
vi.mock("url:../../assets/icon.png", () => ({
  default: "mock-icon-url"
}))

// Mock Image and onload/onerror
const mockImageInstances: any[] = [];
global.Image = class {
  src = ""
  crossOrigin = ""
  constructor() {
    mockImageInstances.push(this);
  }
} as any

const mockCard: StyleCard = {
  id: "card-uuid-1",
  name: "Test Card",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  promptSegments: [{ type: "text", value: "test prompt" }],
  parameters: {},
  masking: { isSrefHidden: false, isPHidden: false },
  tier: "Common",
  isFavorite: false,
  usageCount: 0,
  tags: [],
  dominantColor: "#112233",
  thumbnailData: "data:image/png;base64,mockimage",
  images: ["data:image/png;base64,mockimage"],
}

const mockCtx = {
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  clip: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
}

describe("export-utils", () => {
  let originalGetContext: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockImageInstances.length = 0
    vi.restoreAllMocks()
    originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx)
  })

  it("throws error if canvas 2D context is not available", async () => {
    const { renderCardToCanvas } = await import("./export-utils")
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null)

    await expect(renderCardToCanvas(mockCard)).rejects.toThrow(
      "Could not get 2D context for canvas"
    )

    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it("throws error if image loading fails completely", async () => {
    const { renderCardToCanvas } = await import("./export-utils")
    const promise = renderCardToCanvas(mockCard)

    await vi.waitFor(() => expect(mockImageInstances.length).toBeGreaterThan(0))
    mockImageInstances[0].onerror(new Error("Image network error"))

    await expect(promise).rejects.toThrow("Failed to draw artwork to canvas")
  })

  it("throws error if QR code generation fails", async () => {
    const { renderCardToCanvas } = await import("./export-utils")
    const { generateQRCodeUrl } = await import("./qr-utils")
    vi.mocked(generateQRCodeUrl).mockRejectedValueOnce(new Error("QR generation failed"))

    const promise = renderCardToCanvas(mockCard)

    await vi.waitFor(() => expect(mockImageInstances.length).toBeGreaterThan(0))
    mockImageInstances[0].onload()

    await expect(promise).rejects.toThrow("Failed to generate QR code: QR generation failed")
  })
})
