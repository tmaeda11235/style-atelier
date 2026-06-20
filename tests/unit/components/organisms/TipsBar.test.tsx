import { TipsBar } from "@/components/organisms/TipsBar"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the useHand hook to avoid database dependencies
const mockPinnedCards = vi.fn().mockReturnValue([])
vi.mock("@/hooks/useHand", () => ({
  useHand: () => ({
    pinnedCards: mockPinnedCards(),
    unpinCard: vi.fn(),
    clearHand: vi.fn()
  })
}))

// Wrap with context providers
const renderTipsBar = () => {
  return render(
    <LanguageProvider>
      <SettingsProvider>
        <TipsBar />
      </SettingsProvider>
    </LanguageProvider>
  )
}

describe("TipsBar", () => {
  beforeEach(() => {
    localStorage.clear()
    mockPinnedCards.mockReturnValue([])
    vi.clearAllMocks()
  })

  it("renders tips bar with the first tip by default", () => {
    renderTipsBar()

    // Default language mock is en-US in vitest.setup.ts, so English tips should show up
    expect(screen.getByText(/Use Stack to merge multiple cards/i)).toBeDefined()
    expect(screen.queryByText("Next →")).toBeNull()
  })

  it("cycles through tips automatically", () => {
    vi.useFakeTimers()
    renderTipsBar()

    expect(screen.getByText(/Use Stack to merge multiple cards/i)).toBeDefined()

    // Advance timers by 8 seconds to trigger the auto-cycle
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByText(/Convert prompt segments to Slots/i)).toBeDefined()

    // Advance another 8 seconds
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByText(/Add custom tags to cards/i)).toBeDefined()

    vi.useRealTimers()
  })

  it("does not render when showTipsBar is disabled", () => {
    // Disable tips bar in localStorage
    localStorage.setItem("style-atelier-show-tips-bar", "false")

    renderTipsBar()

    expect(screen.queryByText(/Use Stack to merge multiple cards/i)).toBeNull()
    expect(screen.queryByText("Next →")).toBeNull()
  })

  it("applies bottom-[92px] class when hand has pinned cards", () => {
    // Mock pinned cards in hand
    mockPinnedCards.mockReturnValue([{ id: "card-1" }])

    const { container } = renderTipsBar()

    const tipsBarDiv = container.querySelector("#tips-bar")
    expect(tipsBarDiv).not.toBeNull()
    expect(tipsBarDiv?.className).toContain("bottom-[92px]")
    expect(tipsBarDiv?.className).not.toContain("bottom-0")
  })

  it("applies bottom-0 class when hand is empty", () => {
    mockPinnedCards.mockReturnValue([])

    const { container } = renderTipsBar()

    const tipsBarDiv = container.querySelector("#tips-bar")
    expect(tipsBarDiv).not.toBeNull()
    expect(tipsBarDiv?.className).toContain("bottom-0")
    expect(tipsBarDiv?.className).not.toContain("bottom-[92px]")
  })

  it("renders tips bar text with formatting classes but no title attribute", () => {
    const { container } = renderTipsBar()

    const tipText = container.querySelector("#tips-bar-text")
    expect(tipText).not.toBeNull()
    expect(tipText?.className).toContain("whitespace-normal")
    expect(tipText?.className).toContain("break-words")
    expect(tipText?.className).not.toContain("truncate")
    expect(tipText?.getAttribute("title")).toBeNull()
  })
})
