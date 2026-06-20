import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sendCardToNotion } from "../../../../src/lib/notion/client"
import { notionSyncQueueManager } from "../../../../src/lib/notion/queue"

// Mock sendCardToNotion
vi.mock("../../../../src/lib/notion/client", () => ({
  sendCardToNotion: vi.fn(),
  getNotionCredentials: vi.fn(),
  archiveCardInNotion: vi.fn()
}))

// Mock computeHash
vi.mock("../../../../src/shared/lib/db/migration-helpers", () => ({
  computeHash: vi.fn().mockResolvedValue("mock-hash-val")
}))

// Hoisted table mocks
const {
  mockQueueTable,
  mockSyncStatesTable,
  mockGetCard,
  mockStyleCardsTable
} = vi.hoisted(() => {
  return {
    mockQueueTable: {
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn()
    },
    mockSyncStatesTable: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    },
    mockGetCard: vi.fn(),
    mockStyleCardsTable: {
      get: vi.fn()
    }
  }
})

vi.mock("../../../../src/lib/db", () => {
  return {
    db: {
      notionSyncQueue: mockQueueTable,
      notionSyncStates: mockSyncStatesTable,
      styleCards: mockStyleCardsTable,
      getCard: mockGetCard,
      transaction: vi.fn((_mode, _tables, cb) => cb())
    }
  }
})

describe("NotionSyncQueueManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    notionSyncQueueManager.stop()
  })

  it("should enqueue a card and start processing", async () => {
    mockQueueTable.get.mockResolvedValue(null)
    mockQueueTable.put.mockResolvedValue(undefined)
    mockGetCard.mockResolvedValue({ id: "card-1" })
    mockStyleCardsTable.get.mockResolvedValue({ id: "card-1" })
    vi.mocked(sendCardToNotion).mockResolvedValue({ pageId: "page-123" })

    // Setup queue table mock for processLoop
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce({
        cardId: "card-1",
        retryCount: 0,
        status: "pending"
      })
      .mockResolvedValueOnce(null) // end loop
    mockQueueTable.where.mockReturnValue({
      anyOf: vi.fn().mockReturnValue({
        first: mockFirst
      })
    })

    await notionSyncQueueManager.enqueue("card-1")

    expect(mockQueueTable.put).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: "card-1",
        status: "pending",
        retryCount: 0
      })
    )

    // Fast-forward timers to run the async processLoop
    await vi.runAllTimersAsync()

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "processing"
      })
    )
    expect(sendCardToNotion).toHaveBeenCalledWith({ id: "card-1" })
    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "completed"
      })
    )
    expect(mockSyncStatesTable.put).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: "card-1",
        notionPageId: "page-123",
        lastSyncedHash: "mock-hash-val"
      })
    )
  })

  it("should retry on failure and eventually mark as failed", async () => {
    mockQueueTable.get.mockResolvedValue(null)
    mockGetCard.mockResolvedValue({ id: "card-1" })
    mockStyleCardsTable.get.mockResolvedValue({ id: "card-1" })
    vi.mocked(sendCardToNotion).mockRejectedValue(new Error("API Error"))

    // 1st attempt: starts at retryCount: 0
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce({
        cardId: "card-1",
        retryCount: 0,
        status: "pending"
      }) // Attempt 1
      .mockResolvedValueOnce({
        cardId: "card-1",
        retryCount: 1,
        status: "pending"
      }) // Attempt 2
      .mockResolvedValueOnce({
        cardId: "card-1",
        retryCount: 2,
        status: "pending"
      }) // Attempt 3 (Max retries reached -> failed)
      .mockResolvedValueOnce(null) // end loop

    mockQueueTable.where.mockReturnValue({
      anyOf: vi.fn().mockReturnValue({
        first: mockFirst
      })
    })

    await notionSyncQueueManager.enqueue("card-1")
    await vi.runAllTimersAsync()

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "pending", // retryable, goes back to pending
        retryCount: 1,
        error: "API Error"
      })
    )

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "pending",
        retryCount: 2
      })
    )

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "failed", // max retries (3) reached
        retryCount: 3
      })
    )
  })

  it("should resume processing when resume is called", async () => {
    // Mock resume: search for status='processing' and reset to 'pending'
    const mockProcessingArray = [{ cardId: "card-1", status: "processing" }]
    mockQueueTable.where.mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockProcessingArray)
      }),
      anyOf: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null) // stop processLoop early
      })
    })

    await notionSyncQueueManager.resume()

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "pending"
      })
    )
  })

  it("should not re-enqueue if already pending", async () => {
    mockQueueTable.get.mockResolvedValue({
      cardId: "card-1",
      status: "pending"
    })

    await notionSyncQueueManager.enqueue("card-1")

    expect(mockQueueTable.put).not.toHaveBeenCalled()
  })

  it("should complete immediately if hash matches lastSyncedHash", async () => {
    mockQueueTable.get.mockResolvedValue(null)
    mockStyleCardsTable.get.mockResolvedValue({ id: "card-1" })
    mockSyncStatesTable.get.mockResolvedValue({
      cardId: "card-1",
      lastSyncedHash: "mock-hash-val"
    })

    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce({
        cardId: "card-1",
        retryCount: 0,
        status: "pending"
      })
      .mockResolvedValueOnce(null)

    mockQueueTable.where.mockReturnValue({
      anyOf: vi.fn().mockReturnValue({
        first: mockFirst
      })
    })

    await notionSyncQueueManager.enqueue("card-1")
    await vi.runAllTimersAsync()

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "completed"
      })
    )
    expect(sendCardToNotion).not.toHaveBeenCalled()
  })

  it("should retry or fail if archive fails", async () => {
    mockQueueTable.get.mockResolvedValue(null)
    mockStyleCardsTable.get.mockResolvedValue({ id: "card-1", isDeleted: true })
    mockSyncStatesTable.get.mockResolvedValue({
      cardId: "card-1",
      notionPageId: "page-123"
    })
    const { archiveCardInNotion } = await import("@/lib/notion/client")
    vi.mocked(archiveCardInNotion).mockRejectedValue(
      new Error("Archive API Error")
    )

    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce({
        cardId: "card-1",
        retryCount: 0,
        status: "pending"
      })
      .mockResolvedValueOnce(null)

    mockQueueTable.where.mockReturnValue({
      anyOf: vi.fn().mockReturnValue({
        first: mockFirst
      })
    })

    await notionSyncQueueManager.enqueue("card-1")
    await vi.runAllTimersAsync()

    expect(mockQueueTable.update).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({
        status: "pending",
        retryCount: 1,
        error: "Archive API Error"
      })
    )
  })
})
