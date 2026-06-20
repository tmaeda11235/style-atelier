import { useStyleCards } from "@/hooks/useStyleCards"
import { db } from "@/lib/db"
import {
  addStyleCard,
  deleteStyleCard,
  updateStyleCard
} from "@/lib/style-card-store"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Unmock the database to test real IndexedDB reactive behaviour with fake-indexeddb
vi.unmock("@/lib/db")
vi.unmock("@/hooks/src/lib/db")

describe("useStyleCards integration test", () => {
  beforeEach(async () => {
    await db.styleCards.clear()
  })

  it("should reactively update when cards are added, updated, or deleted", async () => {
    const { result } = renderHook(() => useStyleCards())

    // 1. Initial state
    expect(result.current).toEqual([])

    // 2. Add card with explicit id
    const cardId = "card-test-123"
    await act(async () => {
      await addStyleCard({
        id: cardId,
        name: "Neo Tokyo",
        tier: "Rare",
        parameters: { ar: "16:9" }
      } as any)
    })

    await waitFor(() => {
      expect(result.current.length).toBe(1)
      expect(result.current[0].name).toBe("Neo Tokyo")
    })

    // 3. Update card
    await act(async () => {
      await updateStyleCard(cardId, { name: "Neo Tokyo V2" })
    })

    await waitFor(() => {
      expect(result.current.length).toBe(1)
      expect(result.current[0].name).toBe("Neo Tokyo V2")
    })

    // 4. Delete card
    await act(async () => {
      await deleteStyleCard(cardId)
    })

    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })
})
