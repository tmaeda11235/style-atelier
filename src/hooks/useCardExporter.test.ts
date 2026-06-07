import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StyleCard } from "../lib/db-schema"
import { useCardExporter } from "./useCardExporter"

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

vi.mock("../lib/export-utils", () => ({
  exportCardAsImage: vi.fn().mockResolvedValue(undefined)
}))

describe("useCardExporter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("handles successful export", async () => {
    const { result } = renderHook(() =>
      useCardExporter(mockCard, "Original Name", "Common", [], {}, [], [], [])
    )

    expect(result.current.isExporting).toBe(false)
    expect(result.current.errorMessage).toBeNull()

    await act(async () => {
      await result.current.handleExportCard()
    })

    const { exportCardAsImage } = await import("../lib/export-utils")
    expect(exportCardAsImage).toHaveBeenCalled()
    expect(result.current.isExporting).toBe(false)
    expect(result.current.errorMessage).toBeNull()
  })

  it("handles export failure", async () => {
    const { exportCardAsImage } = await import("../lib/export-utils")
    vi.mocked(exportCardAsImage).mockRejectedValueOnce(
      new Error("Export failed")
    )

    const { result } = renderHook(() =>
      useCardExporter(mockCard, "Original Name", "Common", [], {}, [], [], [])
    )

    await act(async () => {
      await result.current.handleExportCard()
    })

    expect(result.current.errorMessage).toBe(
      "Failed to export card: Export failed"
    )
    expect(result.current.isExporting).toBe(false)
  })
})
