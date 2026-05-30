import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CardDetailView } from "./CardDetailView"
import { useHand } from "../../hooks/useHand"
import type { StyleCard } from "../../lib/db-schema"

vi.mock("../../hooks/useHand", () => ({
  useHand: vi.fn(),
}))

vi.mock("../../lib/db", () => ({
  db: {
    styleCards: {
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
})
