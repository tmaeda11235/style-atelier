import { describe, it, expect, vi, beforeEach } from "vitest"
import { useDragAndDrop } from "./useDragAndDrop"
import { db } from "../lib/db"
import { renderHook, act } from "@testing-library/react"
import iconUrl from "url:../../assets/icon.png"

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
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue("imported-card-id"),
      },
    },
  }
})

vi.mock("../lib/qr-utils", () => ({
  readQRCodeFromImage: vi.fn().mockResolvedValue("mock-payload"),
  decompressCardData: vi.fn().mockReturnValue({
    id: "imported-card-id",
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
    expect(db.historyItems.put).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockItem,
        localImageBlob: expect.any(Blob),
      })
    )
    expect(result.current.droppedItem).toEqual({ id: "test-job-id", isMerged: false })
    expect(returnedItem).toEqual(
      expect.objectContaining({
        ...mockItem,
        localImageBlob: expect.any(Blob),
      })
    )
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

    // Mock DB: style card found on first call
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

  it("should append image to existing StyleCard when matching associatedJobIds exists", async () => {
    const { result } = renderHook(() => useDragAndDrop(mockAddLog))

    const mockExistingCard = {
      id: "card-uuid-456",
      name: "Associated Card",
      jobId: "other-job-id",
      associatedJobIds: ["test-job-id"],
      images: ["https://example.com/first.png"],
      thumbnailData: "https://example.com/first.png",
    }

    // Mock DB: first call (jobId) returns null, second call (associatedJobIds) returns card
    const styleCardsWhere = db.styleCards.where("jobId")
    vi.mocked((styleCardsWhere as any).first)
      .mockResolvedValueOnce(null) // for jobId search
      .mockResolvedValueOnce(mockExistingCard) // for associatedJobIds search
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
    expect(db.styleCards.where).toHaveBeenCalledWith("associatedJobIds")
    expect(db.styleCards.update).toHaveBeenCalledWith("card-uuid-456", {
      images: ["https://example.com/first.png", "https://example.com/second.png"],
      updatedAt: expect.any(Number),
    })
    expect(db.historyItems.put).not.toHaveBeenCalled()
    expect(result.current.droppedItem).toEqual({
      id: "card-uuid-456",
      name: "Associated Card",
      isMerged: true,
    })
    expect(returnedItem).toEqual(mockItem)
  })

  describe("File Drag & Drop", () => {
    it("should handle drag over with files correctly", () => {
      const { result } = renderHook(() => useDragAndDrop(mockAddLog))

      expect(result.current.isDraggingFile).toBe(false)

      const dummyEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          types: ["Files"],
        },
      } as any
      act(() => {
        result.current.handleDragOver(dummyEvent)
      })
      expect(result.current.isDraggingFile).toBe(true)
      expect(result.current.isDragging).toBe(false)
    })

    it("should process image drop, read QR, fetch image, and save to IndexedDB", async () => {
      const { result } = renderHook(() => useDragAndDrop(mockAddLog))

      const mockFile = new File(["test"], "card.png", { type: "image/png" })
      const dummyEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as any

      let returnVal: any
      await act(async () => {
        returnVal = await result.current.handleDrop(dummyEvent)
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(db.styleCards.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "imported-card-id",
          name: "Imported Card",
          thumbnailData: "data:image/png;base64,mockbase64",
          associatedJobIds: [],
        })
      )
      expect(mockAddLog).toHaveBeenCalledWith('Imported card "Imported Card" successfully!')
      expect(returnVal).toEqual({ id: "imported-card-id", isImport: true })
    })

    it("should prioritize JSON data over file import when both are present", async () => {
      const { result } = renderHook(() => useDragAndDrop(mockAddLog))

      const mockExistingCard = {
        id: "card-uuid-123",
        name: "Cool Card",
        jobId: "test-job-id",
        images: ["https://example.com/first.png"],
        thumbnailData: "https://example.com/first.png",
      }

      const styleCardsWhere = db.styleCards.where("jobId")
      vi.mocked((styleCardsWhere as any).first).mockResolvedValue(mockExistingCard)
      vi.mocked(db.styleCards.update).mockResolvedValue(1)

      const mockItem = {
        id: "test-job-id",
        fullCommand: "test prompt",
        imageUrl: "https://example.com/second.png",
        timestamp: 1234567,
      }

      const dummyFile = new File(["test"], "card.png", { type: "image/png" })
      const dummyEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          types: ["Files", "application/json"],
          files: [dummyFile],
          getData: vi.fn().mockReturnValue(JSON.stringify(mockItem)),
        },
      } as any

      let returnVal: any
      await act(async () => {
        returnVal = await result.current.handleDrop(dummyEvent)
      })

      expect(db.styleCards.update).toHaveBeenCalled()
      expect(returnVal).toEqual(mockItem)
    })

    it("should use placeholder icon when artwork fetch fails", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any)

      const { result } = renderHook(() => useDragAndDrop(mockAddLog))

      const mockFile = new File(["test"], "card.png", { type: "image/png" })
      const dummyEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as any

      let returnVal: any
      await act(async () => {
        returnVal = await result.current.handleDrop(dummyEvent)
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(db.styleCards.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "imported-card-id",
          name: "Imported Card",
          thumbnailData: iconUrl,
        })
      )
      expect(mockAddLog).toHaveBeenCalledWith('Imported card "Imported Card" successfully!')
      expect(returnVal).toEqual({ id: "imported-card-id", isImport: true })
    })

    it("should use placeholder icon when no CDN URL is present in card metadata", async () => {
      const { decompressCardData } = await import("../lib/qr-utils")
      vi.mocked(decompressCardData).mockReturnValueOnce({
        id: "imported-card-id",
        name: "Imported Card",
        promptSegments: [{ type: "text", value: "imported cat" }],
        parameters: {},
        images: [],
      })

      const { result } = renderHook(() => useDragAndDrop(mockAddLog))

      const mockFile = new File(["test"], "card.png", { type: "image/png" })
      const dummyEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as any

      let returnVal: any
      await act(async () => {
        returnVal = await result.current.handleDrop(dummyEvent)
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(db.styleCards.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "imported-card-id",
          name: "Imported Card",
          thumbnailData: iconUrl,
        })
      )
      expect(mockAddLog).toHaveBeenCalledWith('Imported card "Imported Card" successfully!')
      expect(returnVal).toEqual({ id: "imported-card-id", isImport: true })
    })
  })
})
