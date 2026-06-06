import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { CardDetailView } from "./CardDetailView"
import { useHand } from "../../hooks/useHand"
import type { StyleCard } from "../../lib/db-schema"

vi.mock("../../hooks/useHand", () => ({
  useHand: vi.fn(),
}))

vi.mock("../../lib/export-utils", () => ({
  exportCardAsImage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../../lib/db", () => ({
  db: {
    styleCards: {
      get: vi.fn(),
      update: vi.fn(),
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

const mockCard: StyleCard = {
  id: "card-uuid-1",
  name: "Cyber Punk Cyberpunk Style",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  promptSegments: [
    { type: "text", value: "a neon cyber punk cat" },
  ],
  parameters: { ar: "16:9" },
  masking: { isSrefHidden: false, isPHidden: false },
  tier: "Epic",
  isFavorite: false,
  usageCount: 0,
  tags: ["cyber", "neon"],
  dominantColor: "#ffffff",
  thumbnailData: "https://example.com/thumb.png",
  images: [
    "https://example.com/thumb.png",
    "https://example.com/image2.png",
    "https://example.com/image3.png",
    "https://example.com/image4.png",
    "https://example.com/image5.png"
  ],
  selectedThumbnails: ["https://example.com/thumb.png"],
  frameId: "default",
  genealogy: { generation: 1, parentIds: [] },
}

describe("CardDetailView", () => {
  const defaultProps = {
    card: mockCard,
    onClose: vi.fn(),
    onInject: vi.fn(),
    onSave: vi.fn(),
    setAlertType: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useHand).mockReturnValue({
      pinnedCards: [],
      unpinCard: vi.fn(),
      clearHand: vi.fn(),
    })
  })

  it("renders with style card info", () => {
    render(<CardDetailView {...defaultProps} />)

    expect(screen.getByText("Card Details")).toBeDefined()
    expect(screen.getByPlaceholderText("Card Name")).toBeDefined()
    expect(screen.getByDisplayValue("Cyber Punk Cyberpunk Style")).toBeDefined()
    expect(screen.getByText("cyber")).toBeDefined()
    expect(screen.getByText("neon")).toBeDefined()
  })

  it("toggles and limits thumbnail selection to max 4 in queue order", () => {
    render(<CardDetailView {...defaultProps} />)

    const images = screen.getAllByRole("img")
    const cardImages = images.filter((img) => img.getAttribute("alt")?.includes("Card Image"))
    expect(cardImages).toHaveLength(5)

    // Image 1 is currently selected ("1st")
    expect(screen.getByText("1st")).toBeDefined()

    // Click Image 2, 3, 4 to select them
    fireEvent.click(cardImages[1]) // becomes 2nd
    fireEvent.click(cardImages[2]) // becomes 3rd
    fireEvent.click(cardImages[3]) // becomes 4th
    
    expect(screen.getByText("2nd")).toBeDefined()
    expect(screen.getByText("3rd")).toBeDefined()
    expect(screen.getByText("4th")).toBeDefined()

    // Click Image 5: since 1, 2, 3, 4 are selected, 1 will be deselected, 2 becomes 1st, 3 becomes 2nd, 4 becomes 3rd, 5 becomes 4th
    fireEvent.click(cardImages[4])
    
    const saveButton = screen.getByText("Save")
    fireEvent.click(saveButton)

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedThumbnails: [
          "https://example.com/image2.png",
          "https://example.com/image3.png",
          "https://example.com/image4.png",
          "https://example.com/image5.png"
        ],
      })
    )
  })

  it("adds and removes tags correctly", () => {
    render(<CardDetailView {...defaultProps} />)

    // Add tag
    const tagInput = screen.getByPlaceholderText("Add new tag...")
    fireEvent.change(tagInput, { target: { value: "futuristic" } })
    fireEvent.submit(tagInput)

    // Remove tag
    const removeButtons = screen.getAllByText("×")
    fireEvent.click(removeButtons[0]) // remove first tag ("cyber")

    const saveButton = screen.getByText("Save")
    fireEvent.click(saveButton)

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["neon", "futuristic"],
      })
    )
  })

  it("triggers prompt injection on inject click", () => {
    render(<CardDetailView {...defaultProps} />)

    const injectButton = screen.getByText("Inject")
    fireEvent.click(injectButton)

    expect(defaultProps.onInject).toHaveBeenCalledWith("a neon cyber punk cat --ar 16:9")
  })

  it("triggers export utility on export click", async () => {
    render(<CardDetailView {...defaultProps} />)

    const exportButton = screen.getByTestId("export-card-button")
    
    await act(async () => {
      fireEvent.click(exportButton)
    })

    const { exportCardAsImage } = await import("../../lib/export-utils")
    expect(exportCardAsImage).toHaveBeenCalled()
  })

  it("renders genealogy details and triggers card selection on parent click", async () => {
    const mockParentCard: StyleCard = {
      id: "parent-uuid-1",
      name: "Parent Neo Cat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: [{ type: "text", value: "a parent cat" }],
      parameters: {},
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Common",
      isFavorite: false,
      usageCount: 0,
      tags: [],
      dominantColor: "#000000",
      thumbnailData: "https://example.com/parent-thumb.png",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] },
    }

    const mockCardWithGenealogy: StyleCard = {
      ...mockCard,
      id: "card-uuid-2",
      name: "Evolution Card",
      genealogy: {
        generation: 2,
        parentIds: ["parent-uuid-1", "non-existent-parent"],
        mutationNote: "Mixed with watercolor style",
      },
    }

    const { db } = await import("../../lib/db")
    vi.mocked(db.styleCards.get).mockImplementation(async (id) => {
      if (id === "parent-uuid-1") return mockParentCard
      return undefined
    })

    const onCardSelect = vi.fn()

    render(
      <CardDetailView
        {...defaultProps}
        card={mockCardWithGenealogy}
        onCardSelect={onCardSelect}
      />
    )

    // 世代が表示されていること
    expect(screen.getByText("Gen 2")).toBeDefined()

    // 変異メモが表示されていること
    expect(screen.getByText("Mixed with watercolor style")).toBeDefined()

    // 非同期で親カードがロードされるのを待つ
    const parentNameNode = await screen.findByText("Parent Neo Cat")
    expect(parentNameNode).toBeDefined()

    // 非表示の親カードのフォールバックが表示されていること
    const deletedCardNode = await screen.findByText("Deleted Card")
    expect(deletedCardNode).toBeDefined()

    // 親カードをクリックすると onCardSelect が呼ばれること
    fireEvent.click(parentNameNode)
    expect(onCardSelect).toHaveBeenCalledWith("parent-uuid-1")
  })

  it("does not show delete button if onDelete is not provided", () => {
    render(<CardDetailView {...defaultProps} onDelete={undefined} />)
    expect(screen.queryByTestId("delete-card-button")).toBeNull()
  })

  it("shows delete button, opens confirmation modal, and cancels properly", () => {
    const onDeleteMock = vi.fn().mockResolvedValue(undefined)
    render(<CardDetailView {...defaultProps} onDelete={onDeleteMock} />)

    const deleteButton = screen.getByTestId("delete-card-button")
    expect(deleteButton).toBeDefined()

    // Confirmation modal should not be visible initially
    expect(screen.queryByTestId("delete-confirm-modal")).toBeNull()

    // Click Delete -> should show confirm modal
    fireEvent.click(deleteButton)
    expect(screen.getByTestId("delete-confirm-modal")).toBeDefined()

    // Click cancel -> modal closes, onDelete not called
    const cancelButton = screen.getByTestId("delete-confirm-cancel-button")
    fireEvent.click(cancelButton)
    expect(screen.queryByTestId("delete-confirm-modal")).toBeNull()
    expect(onDeleteMock).not.toHaveBeenCalled()
  })

  it("calls onDelete when confirmed in modal", async () => {
    const onDeleteMock = vi.fn().mockResolvedValue(undefined)
    render(<CardDetailView {...defaultProps} onDelete={onDeleteMock} />)

    const deleteButton = screen.getByTestId("delete-card-button")
    fireEvent.click(deleteButton)

    const okButton = screen.getByTestId("delete-confirm-ok-button")
    await act(async () => {
      fireEvent.click(okButton)
    })

    expect(onDeleteMock).toHaveBeenCalledWith("card-uuid-1")
    expect(screen.queryByTestId("delete-confirm-modal")).toBeNull()
  })
})
