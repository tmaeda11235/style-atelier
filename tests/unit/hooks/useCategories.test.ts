import { useCategories } from "@/hooks/useCategories"
import { db } from "@/lib/db"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => fn()
}))

vi.mock("@/lib/db", () => ({
  db: {
    getAllCategories: vi.fn()
  }
}))

describe("useCategories hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("useCategories fetches all categories from IndexedDB", () => {
    const mockCategories = [{ id: "1", name: "Category 1" }]
    vi.mocked(db.getAllCategories).mockReturnValue(mockCategories as any)

    const { result } = renderHook(() => useCategories())

    expect(result.current).toEqual(mockCategories)
    expect(db.getAllCategories).toHaveBeenCalled()
  })
})
