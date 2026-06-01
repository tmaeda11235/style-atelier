import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LibraryTab } from "./LibraryTab"
import { useLibrary } from "../../hooks/useLibrary"
import type { StyleCard } from "../../lib/db-schema"
import { TutorialProvider } from "../../contexts/TutorialContext"

vi.mock("../../hooks/useLibrary", () => ({
  useLibrary: vi.fn(),
}))

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

  it("opens ShareCardModal when clicking the share button on the card", () => {
    render(<TutorialProvider><LibraryTab {...defaultProps} /></TutorialProvider>)
    const shareBtn = screen.getByTestId("share-card-button")
    expect(shareBtn).toBeDefined()

    // Initially modal is not in document
    expect(screen.queryByText("Share Style Card")).toBeNull()

    // Click share button
    fireEvent.click(shareBtn)

    // Modal should now be in the document
    expect(screen.getByText("Share Style Card")).toBeDefined()
    expect(screen.getByText("Open Dedicated Image Page")).toBeDefined()
  })
})
