import { describe, it, expect, vi, beforeEach } from "vitest"
import { useMinting } from "./useMinting"
import { db } from "../lib/db"
import { renderHook, act } from "@testing-library/react"

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      put: vi.fn().mockResolvedValue("card-id"),
    },
  },
}))

vi.mock("../lib/color-utils", () => ({
  analyzeImageColors: vi.fn().mockResolvedValue({
    dominantHex: "#ff0000",
    accentHex: "#00ff00",
    dominantName: "Red",
    accentName: "Green",
  }),
}))

describe("useMinting hook", () => {
  const mockAddLog = vi.fn()
  const mockSetActiveTab = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize associatedJobIds with jobId when minting from a history item", async () => {
    const { result } = renderHook(() => useMinting(mockAddLog, mockSetActiveTab))

    const mockItem = {
      id: "job-123",
      fullCommand: "a beautiful sunset --ar 16:9",
      imageUrl: "https://example.com/sunset.png",
      timestamp: Date.now(),
    }

    // Start minting from a history item
    act(() => {
      result.current.handleStartMinting(mockItem)
    })

    // Wait for color analysis to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Save minted card
    await act(async () => {
      await result.current.handleSaveMintedCard()
    })

    expect(db.styleCards.put).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-123",
        associatedJobIds: ["job-123"],
      })
    )
  })

  it("should initialize associatedJobIds as empty array and inherit images when minting a variation without history item", async () => {
    const { result } = renderHook(() => useMinting(mockAddLog, mockSetActiveTab))

    const mockBase = {
      promptSegments: [{ type: "text" as const, value: "variation prompt" }],
      parameters: {},
      genealogy: { generation: 2, parentIds: ["parent-1"] },
      thumbnailData: "parent-thumb.png",
      images: ["parent-image-1.png", "parent-image-2.png"],
      selectedThumbnails: ["parent-thumb.png"],
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
        selectedThumbnails: ["parent-thumb.png"],
      })
    )
  })
})
