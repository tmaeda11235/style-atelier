import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useHand } from "./useHand"

let mockPinnedCards: any[] = []
let mockDbCards: Record<string, any> = {}

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    return mockPinnedCards
  }
}))

vi.mock("../lib/db", () => ({
  db: {
    getPinnedCards: vi.fn().mockImplementation(() => mockPinnedCards),
    getCard: vi.fn().mockImplementation(async (id: string) => {
      if (id === "error-id") throw new Error("Mock database error")
      return mockDbCards[id]
    }),
    deleteCard: vi.fn().mockImplementation(async (id: string) => {
      delete mockDbCards[id]
      return 1
    }),
    updateCard: vi.fn().mockImplementation(async (id: string, updates: any) => {
      if (mockDbCards[id]) {
        Object.assign(mockDbCards[id], updates)
      }
      return 1
    }),
    mergeStyleCards: vi
      .fn()
      .mockImplementation(async (repId, materials, consumeStates) => {
        return { id: repId }
      })
  }
}))

describe("useHand", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPinnedCards = []
    mockDbCards = {}
  })

  it("should return empty hand cards initially", () => {
    const { result } = renderHook(() => useHand())
    expect(result.current.pinnedCards).toEqual([])
  })

  it("should return pinned cards", () => {
    const card1 = { id: "card-1", name: "Card 1" }
    mockPinnedCards = [card1]
    const { result } = renderHook(() => useHand())
    expect(result.current.pinnedCards).toEqual([card1])
  })

  describe("unpinCard", () => {
    it("should delete card if it is a variable card", async () => {
      const card = { id: "var-1", isVariable: true }
      mockDbCards["var-1"] = card
      const { result } = renderHook(() => useHand())

      await act(async () => {
        await result.current.unpinCard("var-1")
      })

      expect(db.deleteCard).toHaveBeenCalledWith("var-1")
      expect(mockDbCards["var-1"]).toBeUndefined()
    })

    it("should update isPinned to false for a normal card", async () => {
      const card = { id: "card-1", isVariable: false, isPinned: true }
      mockDbCards["card-1"] = card
      const { result } = renderHook(() => useHand())

      await act(async () => {
        await result.current.unpinCard("card-1")
      })

      expect(db.updateCard).toHaveBeenCalledWith("card-1", { isPinned: false })
      expect(mockDbCards["card-1"].isPinned).toBe(false)
    })

    it("should catch and log error on failure", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useHand())

      await act(async () => {
        await result.current.unpinCard("error-id")
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to unpin card:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("clearHand", () => {
    it("should do nothing if pinnedCards is null/undefined", async () => {
      mockPinnedCards = null as any
      const { result } = renderHook(() => useHand())

      await act(async () => {
        await result.current.clearHand()
      })

      expect(db.deleteCard).not.toHaveBeenCalled()
      expect(db.updateCard).not.toHaveBeenCalled()
    })

    it("should delete variable cards and unpin normal cards", async () => {
      const normalCard = { id: "card-1", isVariable: false }
      const variableCard = { id: "var-1", isVariable: true }
      mockPinnedCards = [normalCard, variableCard]
      mockDbCards["card-1"] = { ...normalCard, isPinned: true }
      mockDbCards["var-1"] = { ...variableCard }

      const { result } = renderHook(() => useHand())

      await act(async () => {
        await result.current.clearHand()
      })

      expect(db.deleteCard).toHaveBeenCalledWith("var-1")
      expect(db.updateCard).toHaveBeenCalledWith("card-1", { isPinned: false })
      expect(mockDbCards["card-1"].isPinned).toBe(false)
      expect(mockDbCards["var-1"]).toBeUndefined()
    })

    it("should catch and log error on clear failure", async () => {
      const normalCard = { id: "card-1", isVariable: false }
      mockPinnedCards = [normalCard]
      // Trigger error in updateCard
      vi.mocked(db.updateCard).mockRejectedValueOnce(new Error("Update failed"))

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useHand())

      await act(async () => {
        await result.current.clearHand()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to clear hand:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("mergeCards", () => {
    it("should call db.mergeStyleCards and return merge result", async () => {
      const { result } = renderHook(() => useHand())
      const materials = [{ id: "mat-1" } as any]
      const consumeStates = { "mat-1": true }

      let mergeResult: any
      await act(async () => {
        mergeResult = await result.current.mergeCards(
          "rep-1",
          materials,
          consumeStates
        )
      })

      expect(db.mergeStyleCards).toHaveBeenCalledWith(
        "rep-1",
        materials,
        consumeStates
      )
      expect(mergeResult).toEqual({ id: "rep-1" })
    })
  })
})
