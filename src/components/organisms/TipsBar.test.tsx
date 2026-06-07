import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider } from "../../contexts/LanguageContext"
import { SettingsProvider } from "../../contexts/SettingsContext"
import { TipsBar } from "./TipsBar"

// Mock the useHand hook to avoid database dependencies
const mockPinnedCards = vi.fn().mockReturnValue([])
vi.mock("../../hooks/useHand", () => ({
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
    expect(screen.getByText("Next →")).toBeDefined()
  })

  it("cycles through tips when Next button is clicked", () => {
    renderTipsBar()

    expect(screen.getByText(/Use Stack to merge multiple cards/i)).toBeDefined()

    const nextBtn = screen.getByText("Next →")

    // Click next -> should show second tip
    fireEvent.click(nextBtn)
    expect(screen.getByText(/Convert prompt segments to Slots/i)).toBeDefined()

    // Click next -> third tip
    fireEvent.click(nextBtn)
    expect(screen.getByText(/Add custom tags to cards/i)).toBeDefined()
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
})
