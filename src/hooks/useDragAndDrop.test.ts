import { describe, it, expect, vi, beforeEach } from "vitest"
import { useDragAndDrop } from "./useDragAndDrop"
import { db } from "../lib/db"
import { renderHook, act } from "@testing-library/react"

vi.mock("../lib/db", () => {
  const mockWhere = {
    equals: vi.fn().mockReturnThis(),
    first: vi.fn(),
  }
  return {
    db: {
      historyItems: {
        put: vi.fn(),
      },
      styleCards: {
        where: vi.fn(() => mockWhere),
        update: vi.fn(),
      },
    },
  }
})

describe("useDragAndDrop", () => {
  const mockAddLog = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should handle drag over and drag leave correctly", () => {
    const { result } = renderHook(() => useDragAndDrop(mockAddLog))

    expect(result.current.isDragging).toBe(false)

    const dummyEvent = { preventDefault: vi.fn() } as any
    act(() => {
      result.current.handleDragOver(dummyEvent)
    })
    expect(result.current.isDragging).toBe(true)
    expect(dummyEvent.preventDefault).toHaveBeenCalled()

    act(() => {
      result.current.handleDragLeave()
    })
    expect(result.current.isDragging).toBe(false)
  })

  it("should save history item when dropping a new image (no matching jobId)", async () => {
    const { result } = renderHook(() => useDragAndDrop(mockAddLog))

    // Mock DB: style card not found
    const styleCardsWhere = db.styleCards.where("jobId")
    vi.mocked((styleCardsWhere as any).first).mockResolvedValue(null)
    vi.mocked(db.historyItems.put).mockResolvedValue("test-job-id")

    const mockItem = {
      id: "test-job-id",
      fullCommand: "test prompt",
      imageUrl: "https://example.com/img.png",
      timestamp: 1234567,
    }

    const dummyEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify(mockItem)),
      },
    } as any

    let returnedItem: any
    await act(async () => {
      returnedItem = await result.current.handleDrop(dummyEvent)
    })

    expect(db.styleCards.where).toHaveBeenCalledWith("jobId")
    expect(db.historyItems.put).toHaveBeenCalledWith(mockItem)
    expect(result.current.droppedItem).toEqual({ id: "test-job-id", isMerged: false })
    expect(returnedItem).toEqual(mockItem)
  })

  it("should append image to existing StyleCard when matching jobId exists", async () => {
    const { result } = renderHook(() => useDragAndDrop(mockAddLog))

    const mockExistingCard = {
      id: "card-uuid-123",
      name: "Cool Card",
      jobId: "test-job-id",
      images: ["https://example.com/first.png"],
      thumbnailData: "https://example.com/first.png",
    }

    // Mock DB: style card found
    const styleCardsWhere = db.styleCards.where("jobId")
    vi.mocked((styleCardsWhere as any).first).mockResolvedValue(mockExistingCard)
    vi.mocked(db.styleCards.update).mockResolvedValue(1)

    const mockItem = {
      id: "test-job-id",
      fullCommand: "test prompt",
      imageUrl: "https://example.com/second.png",
      timestamp: 1234567,
    }

    const dummyEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify(mockItem)),
      },
    } as any

    let returnedItem: any
    await act(async () => {
      returnedItem = await result.current.handleDrop(dummyEvent)
    })

    expect(db.styleCards.where).toHaveBeenCalledWith("jobId")
    expect(db.styleCards.update).toHaveBeenCalledWith("card-uuid-123", {
      images: ["https://example.com/first.png", "https://example.com/second.png"],
      updatedAt: expect.any(Number),
    })
    expect(db.historyItems.put).not.toHaveBeenCalled()
    expect(result.current.droppedItem).toEqual({
      id: "card-uuid-123",
      name: "Cool Card",
      isMerged: true,
    })
    expect(returnedItem).toEqual(mockItem)
  })
})
