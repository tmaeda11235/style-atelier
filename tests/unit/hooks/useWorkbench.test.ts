import { useWorkbench } from "@/hooks/useWorkbench"
import { db } from "@/lib/db"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockHandCards: any[] = []
let mockDbCards: Record<string, any> = {}
let mockSlotHistory: Record<string, string[]> = {}

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    const fnStr = fn.toString()
    if (fnStr.includes("getAllSlotHistory")) {
      return mockSlotHistory
    }
    return mockHandCards
  }
}))

vi.mock("@/lib/db", () => ({
  db: {
    styleCards: {
      get: vi.fn().mockImplementation(async (id: string) => {
        if (id === "error-id") throw new Error("Mock database error")
        return mockDbCards[id]
      }),
      update: vi.fn().mockImplementation(async (id: string, updates: any) => {
        if (id === "error-id") throw new Error("Mock database error")
        if (mockDbCards[id]) {
          Object.assign(mockDbCards[id], updates)
        }
        return 1
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        if (id === "error-id") throw new Error("Mock database error")
        delete mockDbCards[id]
        return 1
      })
    },
    getAllSlotHistory: vi.fn().mockImplementation(() => mockSlotHistory),
    getAllCards: vi
      .fn()
      .mockImplementation(async () => Object.values(mockDbCards)),
    saveSlotHistory: vi
      .fn()
      .mockImplementation(async (label: string, values: string[]) => {
        if (label === "error-label") throw new Error("Mock save error")
        mockSlotHistory[label] = values
      }),
    addCard: vi.fn().mockImplementation(async (card: any) => {
      if (card.name === "error-card") throw new Error("Mock add error")
      const id = card.id || "new-card-id"
      mockDbCards[id] = card
      return id
    })
  }
}))

describe("useWorkbench hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandCards = []
    mockDbCards = {}
    mockSlotHistory = {}
  })

  it("should return empty arrays and empty prompt initially when there are no cards", () => {
    const { result } = renderHook(() => useWorkbench())

    expect(result.current.handCards).toEqual([])
    expect(result.current.workbenchCards).toEqual([])
    expect(result.current.selectedCardIds).toEqual([])
    expect(result.current.mergedPrompt).toBe("")
  })

  it("should return list of hand cards, workbench cards, and selected card IDs when cards are loaded", () => {
    const card1 = {
      id: "card-1",
      name: "Card 1",
      isPinned: true,
      promptSegments: [],
      parameters: {},
      masking: {}
    }
    const card2 = {
      id: "card-2",
      name: "Card 2",
      isPinned: true,
      promptSegments: [],
      parameters: {},
      masking: {}
    }
    mockHandCards = [card1, card2]

    const { result } = renderHook(() => useWorkbench())

    expect(result.current.handCards).toEqual([card1, card2])
    expect(result.current.workbenchCards).toEqual([card1, card2])
    expect(result.current.selectedCardIds).toEqual(["card-1", "card-2"])
  })

  describe("toggleCardSelection", () => {
    it("should unpin a pinned normal card", async () => {
      const card = {
        id: "card-1",
        isPinned: true,
        isVariable: false,
        promptSegments: [],
        parameters: {},
        masking: {}
      }
      mockDbCards["card-1"] = { ...card }
      mockHandCards = [mockDbCards["card-1"]]

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.toggleCardSelection("card-1")
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", {
        isPinned: false
      })
      expect(mockDbCards["card-1"].isPinned).toBe(false)
    })

    it("should pin an unpinned normal card", async () => {
      const card = {
        id: "card-1",
        isPinned: false,
        isVariable: false,
        promptSegments: [],
        parameters: {},
        masking: {}
      }
      mockDbCards["card-1"] = { ...card }

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.toggleCardSelection("card-1")
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", {
        isPinned: true
      })
      expect(mockDbCards["card-1"].isPinned).toBe(true)
    })

    it("should delete a variable card instead of updating isPinned", async () => {
      const card = {
        id: "var-1",
        isPinned: true,
        isVariable: true,
        promptSegments: [],
        parameters: {},
        masking: {}
      }
      mockDbCards["var-1"] = { ...card }
      mockHandCards = [mockDbCards["var-1"]]

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.toggleCardSelection("var-1")
      })

      expect(db.styleCards.delete).toHaveBeenCalledWith("var-1")
      expect(mockDbCards["var-1"]).toBeUndefined()
    })

    it("should do nothing if card is not found in db", async () => {
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.toggleCardSelection("non-existent")
      })

      expect(db.styleCards.update).not.toHaveBeenCalled()
      expect(db.styleCards.delete).not.toHaveBeenCalled()
    })

    it("should catch and log errors when db.styleCards.get fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.toggleCardSelection("error-id")
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to toggle card selection:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("clearWorkbench", () => {
    it("should unpin normal cards and delete variable cards", async () => {
      const normalCard = {
        id: "card-1",
        isPinned: true,
        isVariable: false,
        promptSegments: [],
        parameters: {},
        masking: {}
      }
      const variableCard = {
        id: "var-1",
        isPinned: true,
        isVariable: true,
        promptSegments: [],
        parameters: {},
        masking: {}
      }
      mockDbCards["card-1"] = { ...normalCard }
      mockDbCards["var-1"] = { ...variableCard }
      mockHandCards = [mockDbCards["card-1"], mockDbCards["var-1"]]

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.clearWorkbench()
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", {
        isPinned: false
      })
      expect(db.styleCards.delete).toHaveBeenCalledWith("var-1")
      expect(mockDbCards["card-1"].isPinned).toBe(false)
      expect(mockDbCards["var-1"]).toBeUndefined()
    })

    it("should do nothing if handCards is falsy", async () => {
      mockHandCards = null as any

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.clearWorkbench()
      })

      expect(db.styleCards.update).not.toHaveBeenCalled()
      expect(db.styleCards.delete).not.toHaveBeenCalled()
    })

    it("should catch and log errors when clear operation fails", async () => {
      const normalCard = {
        id: "error-id",
        isPinned: true,
        isVariable: false,
        promptSegments: [],
        parameters: {},
        masking: {}
      }
      mockDbCards["error-id"] = { ...normalCard }
      mockHandCards = [mockDbCards["error-id"]]

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.clearWorkbench()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to clear workbench:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("mergedPrompt", () => {
    it("should return empty string when hand cards are empty", () => {
      mockHandCards = []
      const { result } = renderHook(() => useWorkbench())
      expect(result.current.mergedPrompt).toBe("")
    })

    it("should join multiple prompts with commas", () => {
      mockHandCards = [
        {
          id: "1",
          promptSegments: [{ type: "text", value: "cyberpunk city" }],
          parameters: { ar: "16:9" },
          masking: {}
        },
        {
          id: "2",
          promptSegments: [{ type: "text", value: "neon light" }],
          parameters: {},
          masking: {}
        }
      ]

      const { result } = renderHook(() => useWorkbench())
      expect(result.current.mergedPrompt).toBe(
        "cyberpunk city, neon light --ar 16:9"
      )
    })

    it("should apply masking correctly (hiding sref and p parameters)", () => {
      mockHandCards = [
        {
          id: "1",
          promptSegments: [{ type: "text", value: "synthwave style" }],
          parameters: { sref: ["sref-123"], p: ["p-code"], ar: "4:3" },
          masking: { isSrefHidden: true, isPHidden: false }
        },
        {
          id: "2",
          promptSegments: [{ type: "text", value: "retro future" }],
          parameters: { sref: ["sref-456"], p: ["p-another"], ar: "16:9" },
          masking: { isSrefHidden: false, isPHidden: true }
        },
        {
          id: "3",
          promptSegments: [{ type: "text", value: "vaporwave aesthetic" }],
          parameters: { sref: ["sref-789"], p: ["p-vapor"], ar: "1:1" },
          masking: { isSrefHidden: true, isPHidden: true }
        }
      ]

      const { result } = renderHook(() => useWorkbench())

      expect(result.current.mergedPrompt).toBe(
        "synthwave style, retro future, vaporwave aesthetic --ar 4:3 --sref sref-456 --p p-code"
      )
    })
  })

  describe("slotHistory", () => {
    it("should return empty object initially", () => {
      const { result } = renderHook(() => useWorkbench())
      expect(result.current.slotHistory).toEqual({})
    })

    it("should return correct slot history from db", () => {
      mockSlotHistory = { "aspect-ratio": ["16:9", "1:1"] }
      const { result } = renderHook(() => useWorkbench())
      expect(result.current.slotHistory).toEqual({
        "aspect-ratio": ["16:9", "1:1"]
      })
    })

    it("should successfully save slot history", async () => {
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.saveSlotHistory("aspect-ratio", ["9:16"])
      })

      expect(db.saveSlotHistory).toHaveBeenCalledWith("aspect-ratio", ["9:16"])
      expect(mockSlotHistory["aspect-ratio"]).toEqual(["9:16"])
    })

    it("should handle error in saveSlotHistory", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.saveSlotHistory("error-label", ["9:16"])
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save slot history:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("addCard", () => {
    it("should add card successfully", async () => {
      const { result } = renderHook(() => useWorkbench())
      const card = { name: "New Card" }
      let addedId: string | undefined

      await act(async () => {
        addedId = await result.current.addCard(card)
      })

      expect(db.addCard).toHaveBeenCalledWith(card)
      expect(addedId).toBe("new-card-id")
      expect(mockDbCards["new-card-id"]).toEqual(card)
    })

    it("should throw error and log when addCard fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useWorkbench())
      const card = { name: "error-card" }

      await expect(
        act(async () => {
          await result.current.addCard(card)
        })
      ).rejects.toThrow("Mock add error")

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to add card:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("incrementCardUsage", () => {
    it("should increment card usage count when card exists", async () => {
      const card = { id: "card-1", usageCount: 5 }
      mockDbCards["card-1"] = { ...card }

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.incrementCardUsage("card-1")
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", {
        usageCount: 6
      })
      expect(mockDbCards["card-1"].usageCount).toBe(6)
    })

    it("should initialize usage count to 1 if card exists but has undefined usageCount", async () => {
      const card = { id: "card-1" }
      mockDbCards["card-1"] = { ...card }

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.incrementCardUsage("card-1")
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", {
        usageCount: 1
      })
      expect(mockDbCards["card-1"].usageCount).toBe(1)
    })

    it("should do nothing if card is not found", async () => {
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.incrementCardUsage("non-existent")
      })

      expect(db.styleCards.update).not.toHaveBeenCalled()
    })

    it("should handle error in incrementCardUsage", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.incrementCardUsage("error-id")
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to increment card usage:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("updateCardWeight", () => {
    it("should update card weight", async () => {
      const card = { id: "card-weight", weight: 1 }
      mockDbCards["card-weight"] = { ...card }

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.updateCardWeight("card-weight", 5)
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-weight", {
        weight: 5
      })
    })

    it("should handle error in updateCardWeight", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.updateCardWeight("error-id", 5)
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to update card weight:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("pickRandomCards", () => {
    it("should pick random cards and shuffle them", async () => {
      vi.useFakeTimers()

      const card = { id: "card-pick", isPinned: false, isVariable: false }
      mockDbCards["card-pick"] = { ...card }

      const { result } = renderHook(() => useWorkbench())

      let pickPromise: Promise<void> | undefined
      await act(async () => {
        pickPromise = result.current.pickRandomCards()
      })

      // Advance timers to trigger the interval and the timeout
      await act(async () => {
        await vi.runAllTimersAsync()
        await pickPromise
      })

      expect(db.styleCards.update).toHaveBeenCalledWith("card-pick", {
        isPinned: true
      })

      vi.useRealTimers()
    })

    it("should catch error in pickRandomCards", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const originalGetAllCards = db.getAllCards
      db.getAllCards = vi.fn().mockRejectedValue(new Error("Mock pick error"))

      const { result } = renderHook(() => useWorkbench())

      await act(async () => {
        await result.current.pickRandomCards()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to pick random cards with shuffle:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
      db.getAllCards = originalGetAllCards
    })
  })
})
