import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LibraryTab } from "./LibraryTab"
import { useLibrary } from "../../hooks/useLibrary"
import type { StyleCard } from "../../lib/db-schema"
import { TutorialProvider } from "../../contexts/TutorialContext"

vi.mock("../../hooks/useLibrary", () => ({
  useLibrary: vi.fn(),
}))

vi.mock("../../lib/db", () => ({
  db: {
    styleCards: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue("card-123"),
      toArray: vi.fn().mockResolvedValue([]),
    },
    categories: {
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}))

vi.mock("../../lib/qr-utils", () => ({
  readQRCodeFromImage: vi.fn().mockResolvedValue("mock-payload"),
  decompressCardData: vi.fn().mockReturnValue({
    id: "card-123",
    name: "Imported Card",
    promptSegments: [{ type: "text", value: "imported cat" }],
    parameters: {},
    images: ["https://example.com/cdn.png"],
  }),
}))

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: vi.fn().mockResolvedValue(new Blob(["bytes"], { type: "image/png" })),
})

class MockFileReader {
  onloadend: () => void = () => {}
  result: string = "data:image/png;base64,mockbase64"
  readAsDataURL() {
    setTimeout(() => this.onloadend(), 0)
  }
}
global.FileReader = MockFileReader as any

const mockCards: StyleCard[] = [
  {
    id: "card-1",
    name: "Golden Dragon",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "a golden dragon" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Legendary",
    isFavorite: false,
    isPinned: false,
    usageCount: 12,
    tags: ["fantasy", "gold"],
    dominantColor: "#d4af37",
    thumbnailData: "data:image/png;base64,123",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] },
  },
]

describe("LibraryTab", () => {
  const mockOpenDetailCard = vi.fn()
  const mockAddLog = vi.fn()
  const mockSetAlertType = vi.fn()

  const defaultProps = {
    addLog: mockAddLog,
    setAlertType: mockSetAlertType,
    onOpenDetailCard: mockOpenDetailCard,
  }

  const mockTogglePin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLibrary).mockReturnValue({
      styleCards: mockCards,
      handleCardClick: vi.fn(),
      togglePin: mockTogglePin,
      searchTag: "",
      setSearchTag: vi.fn(),
      rarityFilter: "All",
      setRarityFilter: vi.fn(),
      categoryFilter: "All",
      setCategoryFilter: vi.fn(),
      sortBy: "newest",
      setSortBy: vi.fn(),
      allSrefs: [],
      categories: [],
    })
  })

  it("renders search field, filters, and cards", () => {
    render(<TutorialProvider><LibraryTab {...defaultProps} /></TutorialProvider>)
    expect(screen.getByPlaceholderText("Search by tag, name or sref...")).toBeDefined()
    expect(screen.getByText("Golden Dragon")).toBeDefined()
  })

  it("triggers togglePin when clicking the card itself", () => {
    render(<TutorialProvider><LibraryTab {...defaultProps} /></TutorialProvider>)
    const cardElement = screen.getByText("Golden Dragon").closest(".group")
    expect(cardElement).toBeDefined()
    
    fireEvent.click(cardElement!)
    expect(mockTogglePin).toHaveBeenCalledWith(mockCards[0], expect.any(Object))
  })

  it("triggers onOpenDetailCard when clicking the edit button on the card", () => {
    render(<TutorialProvider><LibraryTab {...defaultProps} /></TutorialProvider>)
    const editBtn = screen.getByTestId("edit-card-button")
    expect(editBtn).toBeDefined()
    
    fireEvent.click(editBtn)
    expect(mockOpenDetailCard).toHaveBeenCalledWith(mockCards[0])
    expect(mockTogglePin).not.toHaveBeenCalled()
  })

  it("handles dropping a card image and imports it", async () => {
    const { act } = await import("@testing-library/react")
    render(<TutorialProvider><LibraryTab {...defaultProps} /></TutorialProvider>)
    
    const container = screen.getByTestId("library-tab-container")
    
    // Simulate DragOver with files
    const dragOverEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        types: ["Files"],
      },
    }
    fireEvent.dragOver(container, dragOverEvent)
    expect(screen.getByText("Drop QR Card Image to Import")).toBeDefined()

    // Simulate Drop of an image file
    const mockFile = new File(["test"], "card.png", { type: "image/png" })
    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [mockFile],
      },
    }
    
    await act(async () => {
      fireEvent.drop(container, dropEvent)
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    const { db } = await import("../../lib/db")
    expect(db.styleCards.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "card-123",
        name: "Imported Card",
        thumbnailData: "data:image/png;base64,mockbase64",
      })
    )
    expect(mockAddLog).toHaveBeenCalledWith('Imported card "Imported Card" successfully!')
  })
})
