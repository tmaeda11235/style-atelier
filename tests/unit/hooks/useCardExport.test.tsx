import { LanguageProvider } from "@/contexts/LanguageContext"
import { useCardExport } from "@/hooks/useCardExport"
import { db } from "@/lib/db"
import type { StyleCard } from "@/lib/db-schema"
import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useCardExport", () => {
  const addLog = vi.fn()
  const showStatus = vi.fn()
  let clickSpy: any

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>{children}</LanguageProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset DB mock items
    ;(db as any).styleCards.__setItems([])
    ;(db as any).categories.__setItems([])

    // Spy on HTMLAnchorElement.prototype.click so we don't trigger actual navigation
    // and can assert it was called.
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {})
  })

  it("should initialize hook properly", () => {
    const { result } = renderHook(() => useCardExport({ addLog, showStatus }), {
      wrapper
    })

    expect(result.current.handleExportCSV).toBeDefined()
    expect(result.current.handleExportMarkdown).toBeDefined()
    expect(result.current.isExporting).toBe(false)
  })

  it("should query cards from DB and trigger CSV download", async () => {
    const mockCard: StyleCard = {
      id: "card-1",
      name: "Neon Test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: [{ type: "text", value: "cute cat" }],
      parameters: { ar: "16:9" },
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Rare",
      isFavorite: true,
      usageCount: 1,
      tags: ["tag1"],
      dominantColor: "#112233",
      thumbnailData: "data:image/png;base64,mock",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] }
    }

    ;(db as any).styleCards.__setItems([mockCard])

    const { result } = renderHook(() => useCardExport({ addLog, showStatus }), {
      wrapper
    })

    await act(async () => {
      await result.current.handleExportCSV()
    })

    expect(db.getAllCards).toHaveBeenCalled()
    expect(db.getAllCategories).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(addLog).toHaveBeenCalledWith(
      "Style cards exported to CSV successfully."
    )
    expect(showStatus).toHaveBeenCalledWith(expect.any(String), "success")
  })

  it("should query cards from DB and trigger Markdown ZIP download", async () => {
    const mockCard: StyleCard = {
      id: "card-2",
      name: "Fantasy Tree",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: [{ type: "text", value: "giant tree" }],
      parameters: {},
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Legendary",
      isFavorite: false,
      usageCount: 0,
      tags: [],
      dominantColor: "#112233",
      thumbnailData: "data:image/png;base64,mock",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] }
    }

    ;(db as any).styleCards.__setItems([mockCard])

    const { result } = renderHook(() => useCardExport({ addLog, showStatus }), {
      wrapper
    })

    await act(async () => {
      await result.current.handleExportMarkdown()
    })

    expect(db.getAllCards).toHaveBeenCalled()
    expect(db.getAllCategories).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(addLog).toHaveBeenCalledWith(
      "Style cards exported to Markdown ZIP successfully."
    )
    expect(showStatus).toHaveBeenCalledWith(expect.any(String), "success")
  })
})
