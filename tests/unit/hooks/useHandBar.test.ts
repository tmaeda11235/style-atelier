import { LanguageProvider } from "@/contexts/LanguageContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { useHand } from "@/hooks/useHand"
import { useHandBar } from "@/hooks/useHandBar"
import type { StyleCard } from "@/shared/lib/db-schema"
import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/useHand", () => ({
  useHand: vi.fn()
}))

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    SettingsProvider,
    null,
    React.createElement(LanguageProvider, null, children)
  )

describe("useHandBar hook", () => {
  const card1: StyleCard = {
    id: "card-1",
    name: "Card One",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    isPinned: true,
    usageCount: 2,
    dominantColor: "#ff0000",
    thumbnailData: "",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  const card2: StyleCard = {
    id: "card-2",
    name: "Card Two",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Rare",
    isFavorite: false,
    isPinned: true,
    usageCount: 3,
    dominantColor: "#00ff00",
    thumbnailData: "",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("should initialize with default states", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1],
      unpinCard: vi.fn(),
      clearHand: vi.fn(),
      mergeCards: vi.fn()
    } as any)

    const { result } = renderHook(() => useHandBar(), { wrapper })

    expect(result.current.pinnedCards).toEqual([card1])
    expect(result.current.isCollapsed).toBe(false)
    expect(result.current.isMergeOpen).toBe(false)
  })

  it("should toggle collapse state and store in localStorage", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1],
      unpinCard: vi.fn(),
      clearHand: vi.fn(),
      mergeCards: vi.fn()
    } as any)

    const { result } = renderHook(() => useHandBar(), { wrapper })

    act(() => {
      result.current.toggleCollapse()
    })

    expect(result.current.isCollapsed).toBe(true)
    expect(localStorage.getItem("handbar_collapsed")).toBe("true")

    act(() => {
      result.current.toggleCollapse()
    })

    expect(result.current.isCollapsed).toBe(false)
    expect(localStorage.getItem("handbar_collapsed")).toBe("false")
  })

  it("should auto-expand when pinned cards count increases", () => {
    const pinnedCards = [card1]
    const useHandMock = vi.mocked(useHand).mockReturnValue({
      pinnedCards,
      unpinCard: vi.fn(),
      clearHand: vi.fn(),
      mergeCards: vi.fn()
    } as any)

    localStorage.setItem("handbar_collapsed", "true")

    const { result, rerender } = renderHook(() => useHandBar(), { wrapper })
    expect(result.current.isCollapsed).toBe(true)

    useHandMock.mockReturnValue({
      pinnedCards: [card1, card2],
      unpinCard: vi.fn(),
      clearHand: vi.fn(),
      mergeCards: vi.fn()
    } as any)

    rerender()

    expect(result.current.isCollapsed).toBe(false)
  })

  it("should call mergeCards and close modal on merge execution", async () => {
    const mockMergeCards = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1, card2],
      unpinCard: vi.fn(),
      clearHand: vi.fn(),
      mergeCards: mockMergeCards
    } as any)

    const { result } = renderHook(() => useHandBar(), { wrapper })

    act(() => {
      result.current.setIsMergeOpen(true)
    })
    expect(result.current.isMergeOpen).toBe(true)

    const consumeStates = { "card-2": true }
    await act(async () => {
      await result.current.handleExecuteMerge("card-1", consumeStates)
    })

    expect(mockMergeCards).toHaveBeenCalledWith(
      "card-1",
      [card2],
      consumeStates
    )
    expect(result.current.isMergeOpen).toBe(false)
  })
})
