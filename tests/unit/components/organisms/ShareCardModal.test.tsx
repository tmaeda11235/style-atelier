import { ShareCardModal } from "@/components/organisms/ShareCardModal"
import type { StyleCard } from "@/lib/db-schema"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/export-utils", () => ({
  exportCardAsImage: vi.fn(),
  renderCardToCanvas: vi.fn()
}))

vi.mock("@/contexts/SettingsContext", () => ({
  useSettings: () => ({
    includeBrandLogo: true,
    alwaysEnglishLogoText: false
  })
}))

const mockClipboardWrite = vi.fn()

const mockCard: StyleCard = {
  id: "card-uuid-1",
  name: "Neon Dragon",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  promptSegments: [{ type: "text", value: "a neon dragon" }],
  parameters: { sref: "12345" },
  masking: { isSrefHidden: false, isPHidden: false },
  tier: "Legendary",
  isFavorite: false,
  usageCount: 0,
  tags: [],
  dominantColor: "#00ff00",
  thumbnailData: "https://example.com/thumb.png",
  images: ["https://example.com/thumb.png"]
}

describe("ShareCardModal", () => {
  const defaultProps = {
    card: mockCard,
    onClose: vi.fn(),
    addLog: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("navigator", {
      clipboard: {
        write: mockClipboardWrite
      }
    })
    vi.stubGlobal(
      "ClipboardItem",
      vi.fn().mockImplementation(function (obj: any) {
        return obj
      })
    )
  })

  it("renders card summary", () => {
    render(<ShareCardModal {...defaultProps} />)
    expect(screen.getByText("Share Style Card")).toBeDefined()
    expect(screen.getByText("Neon Dragon")).toBeDefined()
    expect(screen.getByText("Tier: Legendary")).toBeDefined()
    expect(screen.getByText("Sref ID: 12345")).toBeDefined()
  })

  it("handles copy to clipboard success", async () => {
    const { renderCardToCanvas } = await import("@/lib/export-utils")
    const mockCanvas = {
      toBlob: vi.fn((callback) => callback(new Blob()))
    }
    vi.mocked(renderCardToCanvas).mockResolvedValue(mockCanvas as any)
    mockClipboardWrite.mockResolvedValue(undefined)

    render(<ShareCardModal {...defaultProps} />)

    const copyButton = screen.getByTestId("share-copy-button")
    await act(async () => {
      fireEvent.click(copyButton)
    })

    await vi.waitFor(() => {
      expect(mockClipboardWrite).toHaveBeenCalled()
    })

    expect(renderCardToCanvas).toHaveBeenCalledWith(mockCard, {
      includeBrandLogo: true,
      brandLogoText: "Minted with Style Atelier 🔮"
    })
    expect(defaultProps.addLog).toHaveBeenCalledWith(
      'Copied card "Neon Dragon" to clipboard.'
    )
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it("displays error message if copy to clipboard fails", async () => {
    const { renderCardToCanvas } = await import("@/lib/export-utils")
    vi.mocked(renderCardToCanvas).mockRejectedValue(
      new Error("Canvas render failed")
    )

    render(<ShareCardModal {...defaultProps} />)

    const copyButton = screen.getByTestId("share-copy-button")
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(
      screen.getByText(
        "Failed to copy image to clipboard: Canvas render failed"
      )
    ).toBeDefined()
  })

  it("handles download success", async () => {
    const { exportCardAsImage } = await import("@/lib/export-utils")
    vi.mocked(exportCardAsImage).mockResolvedValue(undefined)

    render(<ShareCardModal {...defaultProps} />)

    const downloadButton = screen.getByTestId("share-download-button")
    await act(async () => {
      fireEvent.click(downloadButton)
    })

    expect(exportCardAsImage).toHaveBeenCalledWith(mockCard, {
      includeBrandLogo: true,
      brandLogoText: "Minted with Style Atelier 🔮"
    })
    expect(defaultProps.addLog).toHaveBeenCalledWith(
      'Downloaded card "Neon Dragon" as PNG.'
    )
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it("displays error message if download fails", async () => {
    const { exportCardAsImage } = await import("@/lib/export-utils")
    vi.mocked(exportCardAsImage).mockRejectedValue(
      new Error("Download blocked")
    )

    render(<ShareCardModal {...defaultProps} />)

    const downloadButton = screen.getByTestId("share-download-button")
    await act(async () => {
      fireEvent.click(downloadButton)
    })

    expect(
      screen.getByText("Failed to download image: Download blocked")
    ).toBeDefined()
  })
})
