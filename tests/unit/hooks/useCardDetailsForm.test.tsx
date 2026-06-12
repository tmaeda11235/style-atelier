import { useCardDetailsForm } from "@/hooks/useCardDetailsForm"
import type { StyleCard } from "@/lib/db-schema"
import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCard: StyleCard = {
  id: "card-uuid-1",
  name: "Original Name",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  promptSegments: [{ type: "text", value: "a test cat" }],
  parameters: { ar: "16:9" },
  masking: { isSrefHidden: false, isPHidden: false },
  tier: "Common",
  isFavorite: false,
  usageCount: 0,
  tags: ["test"],
  dominantColor: "#ffffff",
  thumbnailData: "https://example.com/thumb.png",
  images: ["https://example.com/thumb.png"],
  selectedThumbnails: ["https://example.com/thumb.png"],
  frameId: "default",
  genealogy: { generation: 1, parentIds: [] }
}

vi.mock("@/lib/db", () => ({
  db: {
    getCard: vi.fn()
  }
}))

vi.mock("@/lib/image-utils", () => ({
  createThumbnailDataUrl: vi
    .fn()
    .mockResolvedValue("data:image/png;base64,mocked")
}))

describe("useCardDetailsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("initializes with card values", () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useCardDetailsForm(mockCard, onSave))

    expect(result.current.name).toBe("Original Name")
    expect(result.current.tier).toBe("Common")
    expect(result.current.tags).toEqual(["test"])
  })

  it("updates states and handles save changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useCardDetailsForm(mockCard, onSave))

    act(() => {
      result.current.setName("New Name")
      result.current.setTier("Epic")
      result.current.setTags(["test", "new"])
    })

    expect(result.current.name).toBe("New Name")
    expect(result.current.tier).toBe("Epic")

    await act(async () => {
      await result.current.handleSaveChanges()
    })

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Name",
        tier: "Epic",
        tags: ["test", "new"],
        thumbnailData: "data:image/png;base64,mocked"
      })
    )
  })

  it("toggles thumbnails correctly", () => {
    const onSave = vi.fn()
    const cardWithMultipleImages: StyleCard = {
      ...mockCard,
      images: ["img1", "img2", "img3", "img4", "img5"],
      selectedThumbnails: ["img1"]
    }
    const { result } = renderHook(() =>
      useCardDetailsForm(cardWithMultipleImages, onSave)
    )

    expect(result.current.selectedThumbs).toEqual(["img1"])

    act(() => {
      result.current.handleToggleThumbnail("img2")
    })
    expect(result.current.selectedThumbs).toEqual(["img1", "img2"])

    // Toggle off
    act(() => {
      result.current.handleToggleThumbnail("img1")
    })
    expect(result.current.selectedThumbs).toEqual(["img2"])
  })

  it("tracks version history on changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useCardDetailsForm(mockCard, onSave))

    act(() => {
      result.current.setName("Changed Name")
    })

    await act(async () => {
      await result.current.handleSaveChanges()
    })

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Changed Name",
        versionHistory: expect.arrayContaining([
          expect.objectContaining({
            name: "Original Name",
            promptSegments: mockCard.promptSegments,
            parameters: mockCard.parameters
          })
        ])
      })
    )
  })

  it("rolls back to a previous version", () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useCardDetailsForm(mockCard, onSave))

    const oldVersion = {
      id: "v-1",
      timestamp: Date.now() - 10000,
      name: "Old Version Name",
      promptSegments: [{ type: "text", value: "old prompt" }],
      parameters: { ar: "1:1" }
    }

    act(() => {
      result.current.handleRollback(oldVersion)
    })

    expect(result.current.name).toBe("Old Version Name")
    expect(result.current.promptSegments).toEqual([
      { type: "text", value: "old prompt" }
    ])
    expect(result.current.parameters).toEqual({ ar: "1:1" })
  })
})
