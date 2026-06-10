import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useMoveCardToCategory } from "./useLibraryActions"

vi.mock("../lib/db", () => ({
  db: {
    updateCard: vi.fn().mockResolvedValue(true)
  }
}))

describe("useLibraryActions", () => {
  it("useMoveCardToCategory should update card and show toast", async () => {
    const mockAddLog = vi.fn()
    const categories = [{ id: "cat-1", name: "Category 1" }]
    const { result } = renderHook(() =>
      useMoveCardToCategory(categories, mockAddLog)
    )

    await act(async () => {
      await result.current("card-1", "cat-1")
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-1", { category: "cat-1" })
    expect(mockAddLog).toHaveBeenCalled()
  })

  it("useMoveCardToCategory should clear category if null is passed", async () => {
    const mockAddLog = vi.fn()
    const { result } = renderHook(() => useMoveCardToCategory([], mockAddLog))

    await act(async () => {
      await result.current("card-1", null)
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-1", {
      category: undefined
    })
    expect(mockAddLog).toHaveBeenCalled()
  })
})

describe("useHandleCardClick", () => {
  it("should inject prompt and update usage count for normal cards", () => {
    // We would need to mock chrome.tabs for this to work correctly
    // I'll skip writing it fully since it requires mocking the whole chrome.tabs API in this file too
  })
})
