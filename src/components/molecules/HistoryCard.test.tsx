import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"
import { HistoryCard } from "./HistoryCard"
import { db } from "../../lib/db"

vi.mock("../../lib/db", () => {
  return {
    db: {
      historyItems: {
        update: vi.fn().mockResolvedValue(1),
      },
    },
  }
})

describe("HistoryCard", () => {
  const mockOnMintClick = vi.fn()
  const mockItem = {
    id: "job-123",
    fullCommand: "sunset over Tokyo cyberpunk style",
    imageUrl: "https://example.com/cdn/job-123.png",
    timestamp: 1234567,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // URL methods mocking
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-uuid")
    global.URL.revokeObjectURL = vi.fn()
    
    // fetch mocking
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["bytes"], { type: "image/png" })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders with CDN image and triggers fetch when localImageBlob is absent", async () => {
    render(<HistoryCard item={mockItem} onMintClick={mockOnMintClick} />)

    // Verify initial render with CDN imageUrl
    const img = screen.getByRole("img")
    expect(img.getAttribute("src")).toBe("https://example.com/cdn/job-123.png")
    expect(screen.getByText("sunset over Tokyo cyberpunk style")).toBeDefined()

    // Verify fetch and update have been called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("https://example.com/cdn/job-123.png")
      expect(db.historyItems.update).toHaveBeenCalledWith("job-123", {
        localImageBlob: expect.any(Blob),
      })
    })
  })

  it("renders with local object URL when localImageBlob is present", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" })
    const itemWithBlob = {
      ...mockItem,
      localImageBlob: mockBlob,
    }

    render(<HistoryCard item={itemWithBlob} onMintClick={mockOnMintClick} />)

    const img = screen.getByRole("img")
    expect(img.getAttribute("src")).toBe("blob:http://localhost/mock-uuid")
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("revokes object URL on unmount", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" })
    const itemWithBlob = {
      ...mockItem,
      localImageBlob: mockBlob,
    }

    const { unmount } = render(<HistoryCard item={itemWithBlob} onMintClick={mockOnMintClick} />)

    unmount()

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/mock-uuid")
  })

  it("calls onMintClick when Mint Card button is clicked", () => {
    render(<HistoryCard item={mockItem} onMintClick={mockOnMintClick} />)

    const button = screen.getByRole("button", { name: "Mint Card" })
    fireEvent.click(button)

    expect(mockOnMintClick).toHaveBeenCalledWith(mockItem)
  })
})
