import { describe, it, expect, vi, beforeEach } from "vitest"
import { useLibrary } from "./useLibrary"
import { db } from "../lib/db"
import { renderHook, act } from "@testing-library/react"

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    return []
  }
}))

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      update: vi.fn().mockResolvedValue(1),
      toArray: vi.fn().mockResolvedValue([]),
    },
    categories: {
      toArray: vi.fn().mockResolvedValue([]),
    },
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

    expect(db.styleCards.update).toHaveBeenCalledWith("card-123", {
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

    expect(db.styleCards.update).toHaveBeenCalledWith("card-123", {
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

    expect(db.styleCards.update).toHaveBeenCalledWith("card-123", {
      usageCount: 3,
    })
  })
})
