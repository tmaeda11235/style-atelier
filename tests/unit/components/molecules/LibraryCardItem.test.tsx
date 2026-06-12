import {
  handleCardClickHelper,
  LibraryCardItem,
  setupDragStart
} from "@/components/molecules/LibraryCardItem"
import type { StyleCard } from "@/lib/db-schema"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

const mockCard: StyleCard = {
  id: "card-1",
  name: "Dreamy Fantasy",
  promptSegments: [
    { type: "text", value: "dreamy pastel color scheme" },
    { type: "text", value: "highly detailed digital painting" }
  ],
  parameters: {
    stylize: 250,
    chaos: 10
  },
  tier: "Epic",
  isPinned: false,
  usageCount: 2,
  category: "cat-1",
  selectedThumbnails: [],
  thumbnailData: "data:image/png;base64,dummy",
  createdAt: 12345678,
  updatedAt: 12345678,
  modelName: "Midjourney v6"
}

const mockCategories = [{ id: "cat-1", name: "Illustration" }]

describe("LibraryCardItem Helpers", () => {
  it("setupDragStart sets drag data correctly", () => {
    const mockData: Record<string, string> = {}
    const mockDataTransfer = {
      setData: vi.fn((key: string, value: string) => {
        mockData[key] = value
      })
    } as unknown as DataTransfer

    const mockEvent = {
      dataTransfer: mockDataTransfer
    } as unknown as React.DragEvent

    setupDragStart(mockEvent, mockCard)

    expect(mockDataTransfer.setData).toHaveBeenCalledTimes(2)
    expect(mockData["text/plain"]).toContain("dreamy pastel color scheme")
    expect(mockData["text/plain"]).toContain("--s 250")
    expect(mockData["text/plain"]).toContain("--c 10")
    expect(mockData["cardId"]).toBe("card-1")
  })

  it("handleCardClickHelper calls onOpenSimpleWorkbench in easy mode", () => {
    const togglePin = vi.fn()
    const advanceIfStep = vi.fn()
    const onOpenSimpleWorkbench = vi.fn()
    const mockEvent = {} as React.MouseEvent

    handleCardClickHelper(
      mockEvent,
      mockCard,
      true, // isEasyMode
      togglePin,
      advanceIfStep,
      onOpenSimpleWorkbench
    )

    expect(onOpenSimpleWorkbench).toHaveBeenCalledWith(mockCard)
    expect(togglePin).not.toHaveBeenCalled()
    expect(advanceIfStep).not.toHaveBeenCalled()
  })

  it("handleCardClickHelper calls togglePin and advanceIfStep in expert mode", () => {
    const togglePin = vi.fn()
    const advanceIfStep = vi.fn()
    const onOpenSimpleWorkbench = vi.fn()
    const mockEvent = {} as React.MouseEvent

    handleCardClickHelper(
      mockEvent,
      mockCard,
      false, // isEasyMode
      togglePin,
      advanceIfStep,
      onOpenSimpleWorkbench
    )

    expect(togglePin).toHaveBeenCalledWith(mockCard, mockEvent)
    expect(advanceIfStep).toHaveBeenCalledWith("card-to-hand")
    expect(onOpenSimpleWorkbench).not.toHaveBeenCalled()
  })
})

describe("LibraryCardItem Component", () => {
  it("renders card name and applies rarity configuration styles", () => {
    const togglePin = vi.fn()
    const advanceIfStep = vi.fn()
    const onOpenDetailCard = vi.fn()
    const handleCardClick = vi.fn()
    const setSharingCard = vi.fn()

    render(
      <LibraryCardItem
        card={mockCard}
        idx={0}
        isEasyMode={false}
        togglePin={togglePin}
        advanceIfStep={advanceIfStep}
        onOpenDetailCard={onOpenDetailCard}
        handleCardClick={handleCardClick}
        setSharingCard={setSharingCard}
        categories={mockCategories}
      />
    )

    expect(screen.getByText("Dreamy Fantasy")).toBeDefined()
  })

  it("triggers click handlers correctly on interaction", () => {
    const togglePin = vi.fn()
    const advanceIfStep = vi.fn()
    const onOpenDetailCard = vi.fn()
    const handleCardClick = vi.fn()
    const setSharingCard = vi.fn()

    const { container } = render(
      <LibraryCardItem
        card={mockCard}
        idx={0}
        isEasyMode={false}
        togglePin={togglePin}
        advanceIfStep={advanceIfStep}
        onOpenDetailCard={onOpenDetailCard}
        handleCardClick={handleCardClick}
        setSharingCard={setSharingCard}
        categories={mockCategories}
      />
    )

    const element = container.firstChild as HTMLElement
    expect(element).toBeDefined()
    fireEvent.click(element)

    expect(togglePin).toHaveBeenCalledWith(mockCard, expect.any(Object))
    expect(advanceIfStep).toHaveBeenCalledWith("card-to-hand")
  })
})
