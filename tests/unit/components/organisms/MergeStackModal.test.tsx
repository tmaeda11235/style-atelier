import { MergeStackModal } from "@/components/organisms/MergeStackModal"
import type { StyleCard } from "@/shared/lib/db-schema"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mockCards: StyleCard[] = [
  {
    id: "card-1",
    name: "Base Card A",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    usageCount: 5,
    tags: [],
    dominantColor: "#ff0000",
    thumbnailData: "data:image/png;base64,abc",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  },
  {
    id: "card-2",
    name: "Material Card B",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Rare",
    isFavorite: false,
    usageCount: 3,
    tags: [],
    dominantColor: "#0000ff",
    thumbnailData: "data:image/png;base64,def",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }
]

describe("MergeStackModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <MergeStackModal
        isOpen={false}
        onClose={vi.fn()}
        workbenchCards={mockCards}
        onExecuteMerge={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders card list and allows interaction when isOpen is true", async () => {
    const mockClose = vi.fn()
    const mockMerge = vi.fn().mockResolvedValue(undefined)

    render(
      <MergeStackModal
        isOpen={true}
        onClose={mockClose}
        workbenchCards={mockCards}
        onExecuteMerge={mockMerge}
      />
    )

    expect(screen.getByText("Merge Card Stack")).toBeDefined()
    expect(screen.getAllByText("Base Card A").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Material Card B").length).toBeGreaterThan(0)

    // Toggle representative card
    const radioContainers = screen.getAllByText(/Uses:/)
    expect(radioContainers).toHaveLength(2)

    // Consume toggling
    const consumeBtn = screen.getByRole("button", { name: "Consume" })
    expect(consumeBtn).toBeDefined()

    // Trigger merge stack click
    const mergeBtn = screen.getByRole("button", { name: "Merge Stack" })
    await act(async () => {
      fireEvent.click(mergeBtn)
    })

    expect(mockMerge).toHaveBeenCalledWith("card-1", { "card-2": true })
  })
})
