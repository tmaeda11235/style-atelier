import { act, renderHook } from "@testing-library/react"
import { useEffect, useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useHistory } from "./useHistory"

// Mock dexie-react-hooks to simulate reactively running queries when dependencies change
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: () => any, deps: any[]) => {
    const [val, setVal] = useState<any>(undefined)
    useEffect(() => {
      const res = fn()
      if (res instanceof Promise) {
        res.then(setVal)
      } else {
        setVal(res)
      }
    }, deps || [])
    return val
  }
}))

// Mock db
const mockToArray = vi.fn()
const mockLimit = vi.fn().mockReturnValue({ toArray: mockToArray })
const mockReverse = vi.fn().mockReturnValue({ limit: mockLimit })
const mockOrderBy = vi.fn().mockReturnValue({ reverse: mockReverse })
const mockCount = vi.fn().mockResolvedValue(0)
const mockPut = vi.fn()
const mockClear = vi.fn()
const mockUpdate = vi.fn()

vi.mock("../lib/db", () => ({
  db: {
    historyItems: {
      orderBy: (field: string) => mockOrderBy(field),
      count: () => mockCount(),
      put: (item: any) => mockPut(item),
      clear: () => mockClear(),
      update: (id: string, changes: any) => mockUpdate(id, changes)
    }
  }
}))

describe("useHistory hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToArray.mockResolvedValue([])
    mockLimit.mockReturnValue({ toArray: mockToArray })
    mockReverse.mockReturnValue({ limit: mockLimit })
    mockOrderBy.mockReturnValue({ reverse: mockReverse })
    mockCount.mockResolvedValue(0)
  })

  it("should query history items with an initial limit of 50", async () => {
    const { result } = renderHook(() => useHistory())

    // Wait for useEffect inside mocked useLiveQuery to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mockOrderBy).toHaveBeenCalledWith("timestamp")
    expect(mockReverse).toHaveBeenCalled()
    expect(mockLimit).toHaveBeenCalledWith(50)
    expect(mockToArray).toHaveBeenCalled()
  })

  it("should increase limit by 50 when loadMore is called", async () => {
    const { result } = renderHook(() => useHistory())

    // Wait for initial render and queries
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mockLimit).toHaveBeenCalledWith(50)

    // Call loadMore
    await act(async () => {
      result.current.loadMore()
    })

    // Wait for the dependencies to trigger query re-run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mockLimit).toHaveBeenLastCalledWith(100)
  })

  it("should reflect hasMore as true when count exceeds limit", async () => {
    // DB count is 60 (exceeds initial limit 50)
    mockCount.mockResolvedValue(60)

    const { result } = renderHook(() => useHistory())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(result.current.hasMore).toBe(true)

    // Increase limit to 100
    await act(async () => {
      result.current.loadMore()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    // count (60) is now <= limit (100), so hasMore should be false
    expect(result.current.hasMore).toBe(false)
  })

  it("should call put on db when addHistoryItem is called", async () => {
    mockPut.mockResolvedValue("new-id")
    const { result } = renderHook(() => useHistory())

    const item = { id: "1", timestamp: Date.now(), prompt: "test" } as any
    const res = await result.current.addHistoryItem(item)

    expect(res).toBe("new-id")
    expect(mockPut).toHaveBeenCalledWith(item)
  })

  it("should call clear on db when clearHistory is called", async () => {
    mockClear.mockResolvedValue(undefined)
    const { result } = renderHook(() => useHistory())

    await result.current.clearHistory()

    expect(mockClear).toHaveBeenCalled()
  })

  it("should call update on db when updateHistoryItem is called", async () => {
    mockUpdate.mockResolvedValue(1)
    const { result } = renderHook(() => useHistory())

    await result.current.updateHistoryItem("1", { rating: 5 })

    expect(mockUpdate).toHaveBeenCalledWith("1", { rating: 5 })
  })
})
