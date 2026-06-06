import { describe, it, expect, vi, beforeEach } from "vitest"
import { useLibrary } from "./useLibrary"
import { db } from "../lib/db"
import { renderHook, act } from "@testing-library/react"

let mockStyleCards: any[] = []
let mockCategories: any[] = []

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    const fnStr = fn.toString()
    if (fnStr.includes("categories")) {
      return mockCategories
    }
    return mockStyleCards
  }
}))

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      update: vi.fn().mockResolvedValue(1),
      toArray: vi.fn().mockImplementation(async () => mockStyleCards),
    },
    categories: {
      toArray: vi.fn().mockImplementation(async () => mockCategories),
    },
    updateCard: vi.fn().mockResolvedValue(1),
    getAllCards: vi.fn().mockImplementation(async () => mockStyleCards),
    getAllCategories: vi.fn().mockImplementation(async () => mockCategories),
  },
}))

// Mock chrome API
global.chrome = {
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
} as any

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
    const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType))
    
    const mockCard = {
      id: "card-123",
      name: "Test Card",
      isPinned: false,
      usageCount: 4,
      parameters: {},
      masking: {},
      promptSegments: [],
    } as any

    await act(async () => {
      await result.current.togglePin(mockCard, { stopPropagation: vi.fn() } as any)
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      isPinned: true,
      usageCount: 5,
    })
  })

  it("should NOT increment usageCount when toggling pin to remove from hand", async () => {
    const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType))
    
    const mockCard = {
      id: "card-123",
      name: "Test Card",
      isPinned: true,
      usageCount: 4,
      parameters: {},
      masking: {},
      promptSegments: [],
    } as any

    await act(async () => {
      await result.current.togglePin(mockCard, { stopPropagation: vi.fn() } as any)
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      isPinned: false,
    })
  })

  it("should increment usageCount when prompt is successfully injected", async () => {
    const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType))
    
    const mockCard = {
      id: "card-123",
      name: "Test Card",
      isPinned: false,
      usageCount: 2,
      parameters: {},
      masking: {},
      promptSegments: [{ type: "text", value: "hello" }],
    } as any

    await act(async () => {
      result.current.handleCardClick(mockCard)
    })

    expect(chrome.tabs.query).toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "INJECT_PROMPT",
      prompt: "hello",
    })

    // Wait for the async message response chain to finish and call db update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      usageCount: 3,
    })
  })

  it("should pin card and call onNavigateToWorkbench if card has slot variables", async () => {
    const mockNavigate = vi.fn()
    const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType, mockNavigate))

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
      ],
    } as any

    await act(async () => {
      result.current.handleCardClick(mockCard)
    })

    expect(chrome.tabs.query).not.toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()

    expect(db.updateCard).toHaveBeenCalledWith("card-slots", {
      isPinned: true,
    })

    expect(mockNavigate).toHaveBeenCalled()
    expect(mockAddLog).toHaveBeenCalledWith('Redirected to Workbench to fill slot variables for "Card with Slots".')
  })

  it("should call onNavigateToWorkbench but NOT pin card if card with slot variables is already pinned", async () => {
    const mockNavigate = vi.fn()
    const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType, mockNavigate))

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
      ],
    } as any

    await act(async () => {
      result.current.handleCardClick(mockCard)
    })

    expect(chrome.tabs.query).not.toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()

    expect(db.updateCard).not.toHaveBeenCalled()

    expect(mockNavigate).toHaveBeenCalled()
    expect(mockAddLog).toHaveBeenCalledWith('Redirected to Workbench to fill slot variables for "Pinned Card with Slots".')
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
      const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType))
      
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
      const { result } = renderHook(() => useLibrary(mockAddLog, mockSetAlertType))
      
      act(() => {
        result.current.setSortBy("color")
      })
      expect(result.current.styleCards[0].name).toBe("Red Card")
      expect(result.current.styleCards[1].name).toBe("Blue Card")
      expect(result.current.styleCards[2].name).toBe("Gray Card")
    })
  })
})
