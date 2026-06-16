import { useMinting } from "@/hooks/useMinting"
import { analyzeImageColors } from "@/lib/color-utils"
import { db } from "@/lib/db"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    styleCards: {
      put: vi.fn().mockResolvedValue("card-id")
    }
  }
}))

vi.mock("@/lib/color-utils", () => ({
  analyzeImageColors: vi.fn()
}))

describe("useMinting hook", () => {
  const mockAddLog = vi.fn()
  const mockSetActiveTab = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(analyzeImageColors).mockResolvedValue({
      dominantHex: "#ff0000",
      accentHex: "#00ff00",
      dominantName: "Red",
      accentName: "Green",
      isFallback: false
    })
  })

  it("should initialize associatedJobIds with jobId when minting from a history item", async () => {
    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      timestamp: Date.now()
    }

    // Start minting from a history item
    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    // Wait for color analysis to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Save minted card
    await act(async () => {
      await result.current.handleSaveMintedCard()
    })

    expect(db.styleCards.put).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-123",
        associatedJobIds: ["job-123"],
        thumbnailData: expect.stringContaining("data:image/png;base64,")
      })
    )
  })

  it("should initialize associatedJobIds as empty array and inherit images when minting a variation without history item", async () => {
    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    const mockBase = {
      promptSegments: [{ type: "text" as const, value: "variation prompt" }],
      parameters: {},
      genealogy: { generation: 2, parentIds: ["parent-1"] },
      thumbnailData: "parent-thumb.png",
      images: ["parent-image-1.png", "parent-image-2.png"],
      selectedThumbnails: ["parent-thumb.png"]
    }

    // Start variation minting
    act(() => {
      result.current.handleStartVariationMinting(mockBase)
    })

    // Save minted card
    await act(async () => {
      await result.current.handleSaveMintedCard()
    })

    expect(db.styleCards.put).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: undefined,
        associatedJobIds: [],
        thumbnailData: "parent-thumb.png",
        images: ["parent-image-1.png", "parent-image-2.png"],
        selectedThumbnails: ["parent-thumb.png"]
      })
    )
  })

  it("should convert localImageBlob to base64 thumbnail if present", async () => {
    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    const mockBlob = new Blob(["mock content"], { type: "image/png" })
    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      localImageBlob: mockBlob,
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await act(async () => {
      await result.current.handleSaveMintedCard()
    })

    expect(db.styleCards.put).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnailData: expect.stringContaining("data:image/png;base64,")
      })
    )
  })

  it("should fall back to rarity-specific theme colors and set isColorFallback to true if color extraction fails", async () => {
    vi.mocked(analyzeImageColors).mockResolvedValue({
      dominantHex: "#64748b",
      accentHex: "#94a3b8",
      dominantName: "Gray",
      accentName: "Gray",
      isFallback: true
    })

    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.detectedDominantColor).toBe("#64748b")
    expect(result.current.detectedAccentColor).toBe("#94a3b8")
    expect(result.current.isColorFallback).toBe(true)
  })

  it("should dynamically update fallback colors when selected rarity changes if color extraction has failed", async () => {
    vi.mocked(analyzeImageColors).mockResolvedValue({
      dominantHex: "#64748b",
      accentHex: "#94a3b8",
      dominantName: "Gray",
      accentName: "Gray",
      isFallback: true
    })

    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.detectedDominantColor).toBe("#64748b")
    expect(result.current.isColorFallback).toBe(true)

    // Change rarity to Legendary
    act(() => {
      result.current.setSelectedRarity("Legendary")
    })

    expect(result.current.detectedDominantColor).toBe("#d97706") // Amber 600
    expect(result.current.detectedAccentColor).toBe("#fbbf24") // Amber 400
  })

  it("should keep custom extracted colors when selected rarity changes if color extraction was successful", async () => {
    vi.mocked(analyzeImageColors).mockResolvedValue({
      dominantHex: "#ff0000",
      accentHex: "#00ff00",
      dominantName: "Red",
      accentName: "Green",
      isFallback: false
    })

    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.detectedDominantColor).toBe("#ff0000")
    expect(result.current.isColorFallback).toBe(false)

    // Change rarity to Legendary
    act(() => {
      result.current.setSelectedRarity("Legendary")
    })

    // Colors should remain unchanged
    expect(result.current.detectedDominantColor).toBe("#ff0000")
    expect(result.current.detectedAccentColor).toBe("#00ff00")
  })

  it("should auto-determine and select card rarity based on prompt complexity on start", async () => {
    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab)
    )

    // Common prompt case (low score)
    const mockCommonItem = {
      id: "job-common",
      fullCommand: "dog",
      imageUrl: "https://example.com/dog.png",
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockCommonItem)
    })

    expect(result.current.selectedRarity).toBe("Common")

    // Legendary prompt case: complex with parameters, keywords, and high quality prompts
    const mockLegendaryItem = {
      id: "job-legendary",
      fullCommand:
        "a hyperrealistic photorealistic masterpiece of a cyberpunk street, ultra-detailed, cinematic, octane render, neon glow --ar 16:9 --stylize 750 --chaos 50 --weird 10 --sref https://sref.url/1 https://sref.url/2 --cref https://cref.url/1 --v 6.0",
      imageUrl: "https://example.com/cyberpunk.png",
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockLegendaryItem)
    })

    expect(result.current.selectedRarity).toBe("Legendary")
  })

  it("should trigger setAlertType with 'db_error' when database write fails on save", async () => {
    const mockSetAlertType = vi.fn()
    const { result } = renderHook(() =>
      useMinting(mockAddLog, mockSetActiveTab, mockSetAlertType)
    )

    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      timestamp: Date.now()
    }

    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Mock db.styleCards.put to throw an error
    vi.mocked(db.styleCards.put).mockRejectedValueOnce(
      new Error("QuotaExceededError")
    )

    // Save minted card
    await act(async () => {
      await result.current.handleSaveMintedCard()
    })

    expect(mockSetAlertType).toHaveBeenCalledWith("db_error")
  })
})
