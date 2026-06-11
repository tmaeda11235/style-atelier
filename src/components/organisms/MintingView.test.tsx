import { fireEvent, screen, render as tlRender } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SettingsProvider } from "../../contexts/SettingsContext"
import { TutorialProvider } from "../../contexts/TutorialContext"
import { useCategories } from "../../hooks/useCategories"
import { useHand } from "../../hooks/useHand"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import { MintingView } from "./MintingView"

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(ui, { wrapper: SettingsProvider, ...options })
}

vi.mock("../../hooks/useHand", () => ({
  useHand: vi.fn()
}))

vi.mock("../../hooks/useCategories", () => ({
  useCategories: vi.fn().mockReturnValue([])
}))

vi.mock("../../hooks/useAiMetadataGenerator", () => ({
  useAiMetadataGenerator: vi.fn().mockReturnValue({
    status: "idle",
    progress: 0,
    startDownload: vi.fn(),
    loading: false,
    error: null,
    result: null,
    setResult: vi.fn(),
    generateMetadata: vi.fn(),
    isModelReady: false
  })
}))

const mockMintingItem: HistoryItem = {
  id: "test-job-id",
  fullCommand: "a beautiful mountain scenery --ar 16:9",
  imageUrl: "https://example.com/image.png",
  timestamp: Date.now()
}

const mockSegments: PromptSegment[] = [
  { type: "text", value: "a beautiful mountain scenery" }
]

describe("MintingView", () => {
  const defaultProps = {
    mintingItem: mockMintingItem,
    editedSegments: mockSegments,
    setEditedSegments: vi.fn(),
    isSrefHidden: false,
    setIsSrefHidden: vi.fn(),
    isPHidden: false,
    setIsPHidden: vi.fn(),
    onCancelMinting: vi.fn(),
    onSaveMintedCard: vi.fn(),
    selectedRarity: "Common" as const,
    setSelectedRarity: vi.fn(),
    suggestedKeywords: ["mountain", "beautiful"],
    selectedKeywords: [],
    setSelectedKeywords: vi.fn(),
    customName: "",
    setCustomName: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders correctly with initial items", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <TutorialProvider>
        <MintingView {...defaultProps} />
      </TutorialProvider>
    )
    expect(screen.getByText("Mint New Card")).toBeDefined()
    expect(screen.getByRole("img")).toBeDefined()
    expect(screen.getByText("mountain")).toBeDefined()
    expect(screen.getByText("beautiful")).toBeDefined()
  })

  it("does not apply bottom padding when Hand has no cards", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <TutorialProvider>
        <MintingView {...defaultProps} />
      </TutorialProvider>
    )
    const container = screen.getByTestId("minting-view-container")
    expect(container.className).toContain(
      "absolute inset-0 bg-slate-50 z-20 flex flex-col"
    )
    expect(container.className).not.toContain("pb-[110px]")
  })

  it("applies bottom padding when Hand has pinned cards", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [
        {
          id: "card-1",
          name: "Test Card",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          promptSegments: [],
          parameters: {},
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Common",
          isFavorite: false,
          isPinned: true,
          usageCount: 0,
          tags: [],
          dominantColor: "#000000",
          thumbnailData: "data:image/png;base64,123",
          frameId: "default",
          genealogy: { generation: 1, parentIds: [] }
        }
      ],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <TutorialProvider>
        <MintingView {...defaultProps} />
      </TutorialProvider>
    )
    const container = screen.getByTestId("minting-view-container")
    expect(container.className).toContain("pb-[110px]")
  })

  it("handles interactions correctly", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    render(
      <TutorialProvider>
        <MintingView {...defaultProps} />
      </TutorialProvider>
    )

    // Keywords toggle interaction
    const keywordChip = screen.getByText("mountain")
    fireEvent.click(keywordChip)
    expect(defaultProps.setSelectedKeywords).toHaveBeenCalled()

    // Save and Cancel button click
    const saveButton = screen.getByText("Save Card")
    fireEvent.click(saveButton)
    expect(defaultProps.onSaveMintedCard).toHaveBeenCalled()

    const cancelButton = screen.getByText("Cancel")
    fireEvent.click(cancelButton)
    expect(defaultProps.onCancelMinting).toHaveBeenCalled()
  })

  it("renders read-only prompt bubbles when cardEditing is disabled", () => {
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [],
      unpinCard: vi.fn(),
      clearHand: vi.fn()
    })

    // To test with cardEditing disabled, we can temporarily modify localStorage
    localStorage.setItem(
      "style-atelier-expert-features",
      JSON.stringify({ cardEditing: false })
    )

    render(
      <TutorialProvider>
        <MintingView {...defaultProps} />
      </TutorialProvider>
    )

    // Verify PromptBubble is rendered (which renders as a span/div containing segment value)
    expect(screen.getByText("a beautiful mountain scenery")).toBeDefined()

    // Cleanup localStorage
    localStorage.removeItem("style-atelier-expert-features")
  })
})
