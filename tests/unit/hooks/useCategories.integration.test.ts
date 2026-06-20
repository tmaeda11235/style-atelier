import { useCategories } from "@/hooks/useCategories"
import { db } from "@/lib/db"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Unmock the database to test real IndexedDB reactive behaviour with fake-indexeddb
vi.unmock("@/lib/db")
vi.unmock("@/hooks/src/lib/db")

describe("useCategories integration test", () => {
  beforeEach(async () => {
    await db.categories.clear()
  })

  it("should reactively update when categories are added or deleted", async () => {
    const { result } = renderHook(() => useCategories())

    // 1. Initial state
    expect(result.current).toEqual([])

    // 2. Add category
    let categoryId: string = ""
    await act(async () => {
      categoryId = await db.addCategory({
        id: "cyberpunk",
        name: "Cyberpunk"
      } as any)
    })

    await waitFor(() => {
      expect(result.current.length).toBe(1)
      expect(result.current[0].name).toBe("Cyberpunk")
    })

    // 3. Delete category
    await act(async () => {
      await db.deleteCategory(categoryId)
    })

    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })
})
