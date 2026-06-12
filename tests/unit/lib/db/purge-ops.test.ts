import { db } from "@/lib/db"
import { purgeDeletedRecords } from "@/lib/db/purge-ops"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Unmock the database to test real IndexedDB reactive behaviour with fake-indexeddb
vi.unmock("@/lib/db")
vi.unmock("@/lib/db/purge-ops")

describe("purge-ops tests", () => {
  beforeEach(async () => {
    await db.styleCards.clear()
    await db.categories.clear()
  })

  const mockStyleCard = (id: string, overrides?: any) => ({
    id,
    name: `Card ${id}`,
    createdAt: 1000,
    updatedAt: 1000,
    promptSegments: [],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common" as const,
    isFavorite: false,
    usageCount: 0,
    tags: [],
    dominantColor: "#ffffff",
    thumbnailData: "thumb-" + id,
    frameId: "",
    genealogy: { generation: 1, parentIds: [] },
    ...overrides
  })

  const mockCategory = (id: string, name: string, overrides?: any) => ({
    id,
    name,
    createdAt: 1000,
    ...overrides
  })

  it("should physically purge only soft-deleted records older than thresholdMs", async () => {
    const now = Date.now()
    const thresholdMs = 5000 // 5 seconds
    const oldTime = now - 6000 // older than threshold
    const newTime = now - 1000 // newer than threshold

    // --- Setup styleCards ---
    // 1. Soft deleted + old -> should be purged
    const cardPurged = mockStyleCard("card-purged", {
      isDeleted: true,
      updatedAt: oldTime
    })
    // 2. Soft deleted + new -> should be kept
    const cardKeptDeleted = mockStyleCard("card-kept-deleted", {
      isDeleted: true,
      updatedAt: newTime
    })
    // 3. Active + old -> should be kept
    const cardKeptActiveOld = mockStyleCard("card-kept-active-old", {
      isDeleted: false,
      updatedAt: oldTime
    })
    // 4. Active + new -> should be kept
    const cardKeptActiveNew = mockStyleCard("card-kept-active-new", {
      isDeleted: false,
      updatedAt: newTime
    })

    await db.styleCards.bulkAdd([
      cardPurged,
      cardKeptDeleted,
      cardKeptActiveOld,
      cardKeptActiveNew
    ])

    // --- Setup categories ---
    // 1. Soft deleted + old -> should be purged
    const catPurged = mockCategory("cat-purged", "Cat Purged", {
      isDeleted: true,
      updatedAt: oldTime
    })
    // 2. Soft deleted + new -> should be kept
    const catKeptDeleted = mockCategory(
      "cat-kept-deleted",
      "Cat Kept Deleted",
      { isDeleted: true, updatedAt: newTime }
    )
    // 3. Soft deleted + old (relying on createdAt fallback) -> should be purged
    const catPurgedFallback = mockCategory(
      "cat-purged-fallback",
      "Cat Purged Fallback",
      { isDeleted: true, createdAt: oldTime }
    )
    // 4. Soft deleted + new (relying on createdAt fallback) -> should be kept
    const catKeptDeletedFallback = mockCategory(
      "cat-kept-deleted-fallback",
      "Cat Kept Fallback",
      { isDeleted: true, createdAt: newTime }
    )
    // 5. Active + old -> should be kept
    const catKeptActive = mockCategory("cat-kept-active", "Cat Kept Active", {
      isDeleted: false,
      updatedAt: oldTime
    })

    await db.categories.bulkAdd([
      catPurged,
      catKeptDeleted,
      catPurgedFallback,
      catKeptDeletedFallback,
      catKeptActive
    ])

    // Run purge
    await purgeDeletedRecords(db, thresholdMs)

    // --- Verify styleCards ---
    const remainingCards = await db.styleCards.toArray()
    const remainingCardIds = remainingCards.map((c) => c.id)

    expect(remainingCardIds).not.toContain("card-purged")
    expect(remainingCardIds).toContain("card-kept-deleted")
    expect(remainingCardIds).toContain("card-kept-active-old")
    expect(remainingCardIds).toContain("card-kept-active-new")

    // --- Verify categories ---
    const remainingCategories = await db.categories.toArray()
    const remainingCategoryIds = remainingCategories.map((c) => c.id)

    expect(remainingCategoryIds).not.toContain("cat-purged")
    expect(remainingCategoryIds).toContain("cat-kept-deleted")
    expect(remainingCategoryIds).not.toContain("cat-purged-fallback")
    expect(remainingCategoryIds).toContain("cat-kept-deleted-fallback")
    expect(remainingCategoryIds).toContain("cat-kept-active")
  })
})
