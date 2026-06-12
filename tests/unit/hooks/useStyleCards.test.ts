import { usePinnedStyleCards, useStyleCards } from "@/hooks/useStyleCards"
import * as store from "@/lib/style-card-store"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn((fn) => fn())
}))

vi.mock("@/lib/style-card-store", () => ({
  getAllStyleCards: vi.fn(),
  getPinnedStyleCards: vi.fn()
}))

describe("useStyleCards hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("useStyleCards fetches all cards", () => {
    const mockCards = [{ id: "1", name: "Card 1" }]
    vi.mocked(store.getAllStyleCards).mockReturnValue(mockCards as any)

    const { result } = renderHook(() => useStyleCards())

    expect(result.current).toEqual(mockCards)
    expect(store.getAllStyleCards).toHaveBeenCalled()
  })

  it("usePinnedStyleCards fetches pinned cards", () => {
    const mockCards = [{ id: "1", name: "Card 1", isPinned: true }]
    vi.mocked(store.getPinnedStyleCards).mockReturnValue(mockCards as any)

    const { result } = renderHook(() => usePinnedStyleCards())

    expect(result.current).toEqual(mockCards)
    expect(store.getPinnedStyleCards).toHaveBeenCalled()
  })
})
