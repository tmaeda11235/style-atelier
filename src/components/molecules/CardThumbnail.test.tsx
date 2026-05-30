import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CardThumbnail } from "./CardThumbnail"

describe("CardThumbnail", () => {
  it("renders a single thumbnail when imageUrl is provided", () => {
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Common"
      />
    )

    const img = screen.getByRole("img")
    expect(img).toBeDefined()
    expect(img.getAttribute("src")).toBe("https://example.com/one.png")
    expect(img.getAttribute("alt")).toBe("Test Card")
  })

  it("renders two thumbnails side-by-side when thumbnailImages has 2 images", () => {
    const images = ["https://example.com/one.png", "https://example.com/two.png"]
    render(
      <CardThumbnail
        thumbnailImages={images}
        alt="Test Card"
        tier="Rare"
      />
    )

    const imgs = screen.getAllByRole("img")
    expect(imgs).toHaveLength(2)
    expect(imgs[0].getAttribute("src")).toBe("https://example.com/one.png")
    expect(imgs[0].getAttribute("alt")).toBe("Test Card - Thumbnail 1")
    expect(imgs[1].getAttribute("src")).toBe("https://example.com/two.png")
    expect(imgs[1].getAttribute("alt")).toBe("Test Card - Thumbnail 2")
  })

  it("renders three thumbnails in column-split layout when thumbnailImages has 3 images", () => {
    const images = ["https://example.com/one.png", "https://example.com/two.png", "https://example.com/three.png"]
    render(
      <CardThumbnail
        thumbnailImages={images}
        alt="Test Card"
        tier="Rare"
      />
    )

    const imgs = screen.getAllByRole("img")
    expect(imgs).toHaveLength(3)
    expect(imgs[0].getAttribute("src")).toBe("https://example.com/one.png")
    expect(imgs[0].getAttribute("alt")).toBe("Test Card - Thumbnail 1")
    expect(imgs[1].getAttribute("src")).toBe("https://example.com/two.png")
    expect(imgs[1].getAttribute("alt")).toBe("Test Card - Thumbnail 2")
    expect(imgs[2].getAttribute("src")).toBe("https://example.com/three.png")
    expect(imgs[2].getAttribute("alt")).toBe("Test Card - Thumbnail 3")
  })

  it("renders four thumbnails in 2x2 grid layout when thumbnailImages has 4 images", () => {
    const images = ["https://example.com/one.png", "https://example.com/two.png", "https://example.com/three.png", "https://example.com/four.png"]
    render(
      <CardThumbnail
        thumbnailImages={images}
        alt="Test Card"
        tier="Rare"
      />
    )

    const imgs = screen.getAllByRole("img")
    expect(imgs).toHaveLength(4)
    expect(imgs[0].getAttribute("src")).toBe("https://example.com/one.png")
    expect(imgs[0].getAttribute("alt")).toBe("Test Card - Thumbnail 1")
    expect(imgs[1].getAttribute("src")).toBe("https://example.com/two.png")
    expect(imgs[1].getAttribute("alt")).toBe("Test Card - Thumbnail 2")
    expect(imgs[2].getAttribute("src")).toBe("https://example.com/three.png")
    expect(imgs[2].getAttribute("alt")).toBe("Test Card - Thumbnail 3")
    expect(imgs[3].getAttribute("src")).toBe("https://example.com/four.png")
    expect(imgs[3].getAttribute("alt")).toBe("Test Card - Thumbnail 4")
  })

  it("falls back to single imageUrl if thumbnailImages has only 1 image", () => {
    const images = ["https://example.com/one.png"]
    render(
      <CardThumbnail
        imageUrl="https://example.com/fallback.png"
        thumbnailImages={images}
        alt="Test Card"
        tier="Common"
      />
    )

    const img = screen.getByRole("img")
    expect(img).toBeDefined()
    expect(img.getAttribute("src")).toBe("https://example.com/one.png")
  })

  it("calls onPinClick when pin button is clicked", () => {
    const mockOnPinClick = vi.fn()
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Epic"
        isPinned={false}
        onPinClick={mockOnPinClick}
      />
    )

    const buttons = screen.getAllByRole("button")
    // Find the pin button (the only button in this case since onDeleteClick and onInjectClick are undefined)
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(mockOnPinClick).toHaveBeenCalled()
  })

  it("calls onInjectClick when inject button is clicked", () => {
    const mockOnInjectClick = vi.fn()
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Legendary"
        onInjectClick={mockOnInjectClick}
      />
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(mockOnInjectClick).toHaveBeenCalled()
  })

  it("renders category icon emoji when provided", () => {
    const category = { id: "style", name: "Style", iconEmoji: "🎨" }
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Common"
        category={category}
      />
    )
    expect(screen.getByText("🎨")).toBeDefined()
  })

  it("renders category custom icon image when provided", () => {
    const category = { id: "custom", name: "Custom", iconUrl: "data:image/png;base64,icon_data" }
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Common"
        category={category}
      />
    )
    const categoryImg = screen.getAllByRole("img").find(img => img.getAttribute("src") === "data:image/png;base64,icon_data")
    expect(categoryImg).toBeDefined()
  })

  it("renders usage count badge when usageCount is provided", () => {
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Common"
        usageCount={5}
      />
    )
    const usageBadge = screen.getByTestId("usage-count-badge")
    expect(usageBadge).toBeDefined()
    expect(usageBadge.textContent).toBe("5 uses")
  })

  it("calls onEditClick when edit button is clicked", () => {
    const mockOnEditClick = vi.fn()
    render(
      <CardThumbnail
        imageUrl="https://example.com/one.png"
        alt="Test Card"
        tier="Common"
        onEditClick={mockOnEditClick}
      />
    )
    const editBtn = screen.getByTestId("edit-card-button")
    expect(editBtn).toBeDefined()
    fireEvent.click(editBtn)
    expect(mockOnEditClick).toHaveBeenCalledTimes(1)
  })
})
