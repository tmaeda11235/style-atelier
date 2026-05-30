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
  images: ["https://example.com/thumb.png", "https://example.com/image2.png", "https://example.com/image3.png"],
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

  it("toggles and limits thumbnail selection to max 2 in queue order", () => {
    render(<CardDetailView {...defaultProps} />)

    const images = screen.getAllByRole("img")
    // Note: prompt editor bubbles or badges might also have images or we find them by tag name.
    // Let's filter image elements with alt tag matching "Card Image"
    const cardImages = images.filter((img) => img.getAttribute("alt")?.includes("Card Image"))
    expect(cardImages).toHaveLength(3)

    // Image 1 is currently selected ("1st")
    expect(screen.getByText("1st")).toBeDefined()

    // Click Image 2 to select it
    fireEvent.click(cardImages[1])
    expect(screen.getByText("2nd")).toBeDefined()

    // Click Image 3: since 1 and 2 are selected, 1 will be deselected, 2 becomes 1st, 3 becomes 2nd
    fireEvent.click(cardImages[2])
    
    // Let's check selection markers
    // Images selected now should be Image 2 ("1st") and Image 3 ("2nd")
    // Wait, the state updates locally inside component, let's verify if we see 1st and 2nd on correct index
    // Or we click Save and check the mock handler call args
    const saveButton = screen.getByText("Save")
    fireEvent.click(saveButton)

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedThumbnails: ["https://example.com/image2.png", "https://example.com/image3.png"],
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
