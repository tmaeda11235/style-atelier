import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useLibrary } from "./useLibrary"

let mockStyleCards: any[] = []
let mockCategories: any[] = []

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any, deps: any[] = []) => {
    const fnStr = fn.toString().toLowerCase()
    if (fnStr.includes("categories")) {
      return mockCategories
    }
    if (fnStr.includes("bulkget")) {
      const visibleIds = deps[0]
      if (!visibleIds || visibleIds.length === 0) return []
      const idToCard = new Map(mockStyleCards.map((c) => [c.id, c]))
      return visibleIds
        .map((id: string) => idToCard.get(id))
        .filter((c: any) => !!c && !c.isDeleted)
    }
    return mockStyleCards
  }
}))

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      update: vi.fn().mockResolvedValue(1),
      toArray: vi.fn().mockImplementation(async () => mockStyleCards),
      bulkGet: vi.fn().mockImplementation(async (ids: string[]) => {
        const idToCard = new Map(mockStyleCards.map((c) => [c.id, c]))
        return ids.map((id) => idToCard.get(id))
      })
    },
    categories: {
      toArray: vi.fn().mockImplementation(async () => mockCategories)
    },
    updateCard: vi.fn().mockResolvedValue(1),
    getAllCards: vi.fn().mockImplementation(async () => mockStyleCards),
    getAllCategories: vi.fn().mockImplementation(async () => mockCategories)
  }
}))

describe("useLibrary hook", () => {
  const mockAddLog = vi.fn()
  const mockSetAlertType = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(chrome.tabs.query).mockImplementation((query, callback) => {
      callback([{ id: 1 }])
    })
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })
  })

  it("should increment usageCount when toggling pin (adding to hand)", async () => {
    const { result } = renderHook(() =>
      useLibrary(mockAddLog, mockSetAlertType)
    )

    const mockCard = {
      id: "card-123",
      name: "Test Card",
      isPinned: false,
      usageCount: 4,
      parameters: {},
      masking: {},
      promptSegments: []
    } as any

    await act(async () => {
      await result.current.togglePin(mockCard, {
        stopPropagation: vi.fn()
      } as any)
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      isPinned: true,
      usageCount: 5
    })
  })

  it("should NOT increment usageCount when toggling pin to remove from hand", async () => {
    const { result } = renderHook(() =>
      useLibrary(mockAddLog, mockSetAlertType)
    )

    const mockCard = {
      id: "card-123",
      name: "Test Card",
      isPinned: true,
      usageCount: 4,
      parameters: {},
      masking: {},
      promptSegments: []
    } as any

    await act(async () => {
      await result.current.togglePin(mockCard, {
        stopPropagation: vi.fn()
      } as any)
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      isPinned: false
    })
  })

  it("should increment usageCount when prompt is successfully injected", async () => {
    const { result } = renderHook(() =>
      useLibrary(mockAddLog, mockSetAlertType)
    )

    const mockCard = {
      id: "card-123",
      name: "Test Card",
      isPinned: false,
      usageCount: 2,
      parameters: {},
      masking: {},
      promptSegments: [{ type: "text", value: "hello" }]
    } as any

    await act(async () => {
      result.current.handleCardClick(mockCard)
    })

    expect(chrome.tabs.query).toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "INJECT_PROMPT",
      prompt: "hello"
    })

    // Wait for the async message response chain to finish and call db update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      usageCount: 3
    })
  })

  it("should pin card and call onNavigateToWorkbench if card has slot variables", async () => {
    const mockNavigate = vi.fn()
    const { result } = renderHook(() =>
      useLibrary(mockAddLog, mockSetAlertType, mockNavigate)
    )

    const mockCard = {
      id: "card-slots",
      name: "Card with Slots",
      isPinned: false,
      usageCount: 2,
      parameters: {},
      masking: {},
      promptSegments: [
        { type: "text", value: "a photo of a " },
        { type: "slot", label: "subject", default: "cat" }
      ]
    } as any

    await act(async () => {
      result.current.handleCardClick(mockCard)
    })

    expect(chrome.tabs.query).not.toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()

    expect(db.updateCard).toHaveBeenCalledWith("card-slots", {
      isPinned: true
    })

    expect(mockNavigate).toHaveBeenCalled()
    expect(mockAddLog).toHaveBeenCalledWith(
      'Redirected to Workbench to fill slot variables for "Card with Slots".'
    )
  })

  it("should call onNavigateToWorkbench but NOT pin card if card with slot variables is already pinned", async () => {
    const mockNavigate = vi.fn()
    const { result } = renderHook(() =>
      useLibrary(mockAddLog, mockSetAlertType, mockNavigate)
    )

    const mockCard = {
      id: "card-slots-pinned",
      name: "Pinned Card with Slots",
      isPinned: true,
      usageCount: 2,
      parameters: {},
      masking: {},
      promptSegments: [
        { type: "text", value: "a photo of a " },
        { type: "slot", label: "subject", default: "cat" }
      ]
    } as any

    await act(async () => {
      result.current.handleCardClick(mockCard)
    })

    expect(chrome.tabs.query).not.toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()

    expect(db.updateCard).not.toHaveBeenCalled()

    expect(mockNavigate).toHaveBeenCalled()
    expect(mockAddLog).toHaveBeenCalledWith(
      'Redirected to Workbench to fill slot variables for "Pinned Card with Slots".'
    )
  })

  describe("filtering and sorting by dominantColor", () => {
    beforeEach(() => {
      mockStyleCards = [
        {
          id: "1",
          name: "Red Card",
          dominantColor: "#ff0000",
          tier: "Rare",
          createdAt: 100,
          usageCount: 2,
          isVariable: false,
          parameters: {},
          tags: ["fire"]
        },
        {
          id: "2",
          name: "Blue Card",
          dominantColor: "#0000ff",
          tier: "Common",
          createdAt: 200,
          usageCount: 1,
          isVariable: false,
          parameters: {},
          tags: ["water"]
        },
        {
          id: "3",
          name: "Gray Card",
          dominantColor: "#808080",
          tier: "Legendary",
          createdAt: 150,
          usageCount: 5,
          isVariable: false,
          parameters: {},
          tags: ["stone"]
        }
      ]
      mockCategories = []
    })

    it("filters cards by dominantColor", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      expect(result.current.styleCards).toHaveLength(3)

      act(() => {
        result.current.setColorFilter("Red")
      })
      expect(result.current.styleCards).toHaveLength(1)
      expect(result.current.styleCards[0].name).toBe("Red Card")

      act(() => {
        result.current.setColorFilter("Blue")
      })
      expect(result.current.styleCards).toHaveLength(1)
      expect(result.current.styleCards[0].name).toBe("Blue Card")
    })

    it("sorts cards by color", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      act(() => {
        result.current.setSortBy("color")
      })
      expect(result.current.styleCards[0].name).toBe("Red Card")
      expect(result.current.styleCards[1].name).toBe("Blue Card")
      expect(result.current.styleCards[2].name).toBe("Gray Card")
    })
  })

  describe("pinning limit", () => {
    beforeEach(() => {
      mockStyleCards = Array.from({ length: 7 }, (_, i) => ({
        id: `card-pinned-${i}`,
        name: `Pinned Card ${i}`,
        isPinned: true,
        usageCount: 1,
        isVariable: false,
        parameters: {},
        tags: []
      }))
    })

    it("should set alert type to hand_full and not update db when toggling pin and limit is reached", async () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      const mockCard = {
        id: "card-new",
        name: "New Card",
        isPinned: false,
        usageCount: 0,
        parameters: {},
        masking: {},
        promptSegments: []
      } as any

      await act(async () => {
        await result.current.togglePin(mockCard, {
          stopPropagation: vi.fn()
        } as any)
      })

      expect(mockSetAlertType).toHaveBeenCalledWith("hand_full")
      expect(db.updateCard).not.toHaveBeenCalled()
    })

    it("should set alert type to hand_full and not update db when handleCardClick has slots and limit is reached", async () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      const mockCard = {
        id: "card-slots-new",
        name: "New Card with Slots",
        isPinned: false,
        usageCount: 0,
        parameters: {},
        masking: {},
        promptSegments: [
          { type: "text", value: "a photo of a " },
          { type: "slot", label: "subject", default: "cat" }
        ]
      } as any

      await act(async () => {
        result.current.handleCardClick(mockCard)
      })

      expect(mockSetAlertType).toHaveBeenCalledWith("hand_full")
      expect(db.updateCard).not.toHaveBeenCalled()
    })
  })

  describe("FlexSearch & pagination", () => {
    beforeEach(() => {
      mockStyleCards = Array.from({ length: 15 }, (_, i) => ({
        id: `card-${i}`,
        name: `Card ${i} name`,
        tags: [`tag-${i}`],
        parameters: { sref: [`sref-${i}`] },
        tier: "Common",
        createdAt: 1000 + i,
        usageCount: 0,
        isDeleted: 0,
        isVariable: false
      }))
    })

    it("should initialize with default visibleCount of 12 and limit card results", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      expect(result.current.styleCards).toHaveLength(12)
      expect(result.current.hasMore).toBe(true)
    })

    it("should load more cards when calling loadMore", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      expect(result.current.styleCards).toHaveLength(12)

      act(() => {
        result.current.loadMore()
      })

      expect(result.current.styleCards).toHaveLength(15)
      expect(result.current.hasMore).toBe(false)
    })

    it("should search and match cards using FlexSearch query indexing", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      act(() => {
        result.current.setSearchTag("Card 5")
      })

      expect(result.current.styleCards.length).toBeGreaterThan(0)
      expect(result.current.styleCards[0].id).toBe("card-5")
    })
  })

  describe("Explorer drill-down and card movement", () => {
    beforeEach(() => {
      mockCategories = [
        { id: "root-cat", name: "Root Cat" },
        { id: "child-cat", name: "Child Cat", parentId: "root-cat" },
        { id: "nested-cat", name: "Nested Cat", parentId: "child-cat" }
      ]
      mockStyleCards = [
        {
          id: "card-root",
          name: "Root Card",
          category: undefined,
          isVariable: false,
          parameters: {}
        },
        {
          id: "card-in-root-cat",
          name: "Card in Root Cat",
          category: "root-cat",
          isVariable: false,
          parameters: {}
        },
        {
          id: "card-in-child-cat",
          name: "Card in Child Cat",
          category: "child-cat",
          isVariable: false,
          parameters: {}
        }
      ]
    })

    it("should initialize at root with correct breadcrumbs and top-level categories", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      expect(result.current.currentFolderId).toBeNull()
      expect(result.current.breadcrumbs).toEqual([{ id: null, name: "Home" }])
      // only root-cat has parentId === undefined
      expect(result.current.currentSubfolders).toHaveLength(1)
      expect(result.current.currentSubfolders[0].id).toBe("root-cat")
      // only card-root has no category
      expect(result.current.styleCards).toHaveLength(1)
      expect(result.current.styleCards[0].id).toBe("card-root")
    })

    it("should handle drill-down navigation and build multi-level breadcrumbs", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      act(() => {
        result.current.setCurrentFolderId("child-cat")
      })

      expect(result.current.currentFolderId).toBe("child-cat")
      expect(result.current.breadcrumbs).toEqual([
        { id: null, name: "Home" },
        { id: "root-cat", name: "Root Cat" },
        { id: "child-cat", name: "Child Cat" }
      ])
      // subfolder of child-cat is nested-cat
      expect(result.current.currentSubfolders).toHaveLength(1)
      expect(result.current.currentSubfolders[0].id).toBe("nested-cat")
      // cards in child-cat
      expect(result.current.styleCards).toHaveLength(1)
      expect(result.current.styleCards[0].id).toBe("card-in-child-cat")
    })

    it("should ignore directory level and search flatly across all categories when search query is active", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      // even when in child-cat, searching will return cards flatly
      act(() => {
        result.current.setCurrentFolderId("child-cat")
        result.current.setSearchTag("Card")
      })

      // currentSubfolders is cleared during search
      expect(result.current.currentSubfolders).toHaveLength(0)
      // all matches are returned
      expect(result.current.styleCards.length).toBeGreaterThan(1)
    })

    it("should invoke db update on moveCardToCategory", async () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      await act(async () => {
        await result.current.moveCardToCategory("card-root", "child-cat")
      })

      expect(db.updateCard).toHaveBeenCalledWith("card-root", {
        category: "child-cat"
      })
      expect(mockAddLog).toHaveBeenCalledWith('Moved card to "Child Cat".')
    })
  })

  describe("filtering by model version", () => {
    beforeEach(() => {
      mockStyleCards = [
        {
          id: "m1",
          name: "V6 Card",
          version: "6",
          parameters: {},
          tier: "Common",
          createdAt: 100,
          usageCount: 0,
          isVariable: false
        },
        {
          id: "m2",
          name: "V5 Card",
          version: "5.2",
          parameters: {},
          tier: "Common",
          createdAt: 101,
          usageCount: 0,
          isVariable: false
        },
        {
          id: "m3",
          name: "Niji 6 Card",
          niji: "6",
          parameters: {},
          tier: "Common",
          createdAt: 102,
          usageCount: 0,
          isVariable: false
        },
        {
          id: "m4",
          name: "Niji 5 Card",
          niji: "5",
          parameters: {},
          tier: "Common",
          createdAt: 103,
          usageCount: 0,
          isVariable: false
        },
        {
          id: "m5",
          name: "Generic Card",
          parameters: {},
          tier: "Common",
          createdAt: 104,
          usageCount: 0,
          isVariable: false
        }
      ]
      mockCategories = []
    })

    it("filters cards by model version V6", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      expect(result.current.styleCards).toHaveLength(5)

      act(() => {
        result.current.setModelFilter("V6")
      })
      expect(result.current.styleCards).toHaveLength(1)
      expect(result.current.styleCards[0].name).toBe("V6 Card")
    })

    it("filters cards by model version Niji 6", () => {
      const { result } = renderHook(() =>
        useLibrary(mockAddLog, mockSetAlertType)
      )

      act(() => {
        result.current.setModelFilter("Niji 6")
      })
      expect(result.current.styleCards).toHaveLength(1)
      expect(result.current.styleCards[0].name).toBe("Niji 6 Card")
    })
  })
})
