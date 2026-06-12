import { HistoryCard } from "@/components/molecules/HistoryCard"
import { db } from "@/lib/db"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("HistoryCard", () => {
  const mockOnMintClick = vi.fn()
  const mockItem = {
    id: "job-123",
    fullCommand: "sunset over Tokyo cyberpunk style",
    imageUrl: "https://example.com/cdn/job-123.png",
    timestamp: 1234567
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // fetch mocking
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi
        .fn()
        .mockResolvedValue(new Blob(["bytes"], { type: "image/png" }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders with CDN image and triggers fetch when localImageBlob is absent", async () => {
    const mockOnImageCached = vi.fn()
    render(
      <HistoryCard
        item={mockItem}
        onMintClick={mockOnMintClick}
        onImageCached={mockOnImageCached}
      />
    )

    // Verify initial render with CDN imageUrl
    const img = screen.getByRole("img")
    expect(img.getAttribute("src")).toBe("https://example.com/cdn/job-123.png")
    expect(screen.getByText("sunset over Tokyo cyberpunk style")).toBeDefined()

    // Verify fetch and callback have been called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/cdn/job-123.png"
      )
      expect(mockOnImageCached).toHaveBeenCalledWith(
        "job-123",
        expect.any(Blob)
      )
    })
  })

  it("renders with local object URL when localImageBlob is present", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" })
    const itemWithBlob = {
      ...mockItem,
      localImageBlob: mockBlob
    }

    render(<HistoryCard item={itemWithBlob} onMintClick={mockOnMintClick} />)

    const img = screen.getByRole("img")
    expect(img.getAttribute("src")).toBe("blob:http://localhost/mock-uuid")
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("revokes object URL on unmount", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" })
    const itemWithBlob = {
      ...mockItem,
      localImageBlob: mockBlob
    }

    const { unmount } = render(
      <HistoryCard item={itemWithBlob} onMintClick={mockOnMintClick} />
    )

    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/mock-uuid"
    )
  })

  it("calls onMintClick when Mint Card button is clicked", () => {
    render(<HistoryCard item={mockItem} onMintClick={mockOnMintClick} />)

    const button = screen.getByRole("button", { name: "Mint Card" })
    fireEvent.click(button)

    expect(mockOnMintClick).toHaveBeenCalledWith(mockItem)
  })
})
