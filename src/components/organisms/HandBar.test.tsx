import {
  fireEvent,
  screen,
  render as tlRender,
  waitFor
} from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SettingsProvider } from "../../contexts/SettingsContext"
import { useHand } from "../../hooks/useHand"
import { db } from "../../lib/db"
import type { StyleCard } from "../../lib/db-schema"
import { HandBar } from "./HandBar"

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(ui, { wrapper: SettingsProvider, ...options })
}

vi.mock("../../hooks/useHand", () => ({
  useHand: vi.fn()
}))

describe("HandBar", () => {
  const mockNavigate = vi.fn()
  const mockOpenDetail = vi.fn()

  const card1: StyleCard = {
    id: "card-1",
    name: "Card One",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "prompt one" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    isPinned: true,
    usageCount: 2,
    dominantColor: "#ff0000",
    thumbnailData: "data:image/png;base64,abc",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  const card2: StyleCard = {
    id: "card-2",
    name: "Card Two",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "prompt two" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Rare",
    isFavorite: false,
    isPinned: true,
    usageCount: 3,
    dominantColor: "#00ff00",
    thumbnailData: "data:image/png;base64,def",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders empty state placeholder when no cards pinned", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    const { container } = render(
      <HandBar
        onNavigateToWorkbench={mockNavigate}
        onOpenDetailCard={mockOpenDetail}
      />
    )
    // Container element with id should exist but be empty
    const root = container.querySelector("#handbar-root")
    expect(root).toBeDefined()
    expect(screen.queryByText(/Workbench \(/)).toBeNull()
  })

  it("renders card list and title when cards are pinned", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <HandBar
        onNavigateToWorkbench={mockNavigate}
        onOpenDetailCard={mockOpenDetail}
      />
    )

    expect(screen.getByText("Workbench (1)")).toBeDefined()
    expect(screen.getByAltText("Card One")).toBeDefined()

    // Merge button should not render for 1 card
    expect(screen.queryByTestId("handbar-merge-btn")).toBeNull()
  })

  it("triggers detail modal callback on card click", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <HandBar
        onNavigateToWorkbench={mockNavigate}
        onOpenDetailCard={mockOpenDetail}
      />
    )

    const cardEl = screen.getByAltText("Card One")
    fireEvent.click(cardEl)

    expect(mockOpenDetail).toHaveBeenCalledWith(card1)
  })

  it("triggers navigate to workbench callback on trailing button click", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <HandBar
        onNavigateToWorkbench={mockNavigate}
        onOpenDetailCard={mockOpenDetail}
      />
    )

    const navBtn = screen.getByTestId("navigate-to-workbench-btn")
    fireEvent.click(navBtn)

    expect(mockNavigate).toHaveBeenCalled()
  })

  it("shows 'Merge Stack' button when 2+ cards are pinned, opens modal, and executes merge", async () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [card1, card2],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <HandBar
        onNavigateToWorkbench={mockNavigate}
        onOpenDetailCard={mockOpenDetail}
      />
    )

    // Verify Merge Stack button is present
    const mergeBtn = screen.getByTestId("handbar-merge-btn")
    expect(mergeBtn).toBeDefined()

    // Click it to open modal
    fireEvent.click(mergeBtn)
    expect(screen.getByText("Merge Card Stack")).toBeDefined()
    expect(screen.getAllByText("Card One")).toBeDefined()
    expect(screen.getAllByText("Card Two")).toBeDefined()

    // Execute merge (second Merge Stack button inside modal)
    const modalMergeBtns = screen.getAllByRole("button", {
      name: /Merge Stack/i
    })
    // The first is the trigger button in the main bar, the second is in the modal header, the third is in the modal footer.
    // Let's target the one in the footer
    const executeBtn = modalMergeBtns[modalMergeBtns.length - 1]
    fireEvent.click(executeBtn)

    await waitFor(() => {
      expect(db.mergeStyleCards).toHaveBeenCalledWith(
        "card-1",
        [card2],
        expect.objectContaining({ "card-2": true })
      )
    })
  })
})
