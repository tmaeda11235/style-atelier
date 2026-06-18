import { db } from "@/lib/db"
import { cleanupOrphanedImages, purgeDeletedRecords } from "@/lib/db/purge-ops"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Unmock the database to test real IndexedDB reactive behaviour with fake-indexeddb
vi.unmock("@/lib/db")
vi.unmock("@/lib/db/purge-ops")

// OPFS Mocks
class MockFileHandle {
  name: string
  constructor(name: string) {
    this.name = name
  }
}

class MockDirectoryHandle {
  kind = "directory" as const
  name: string
  files = new Map<string, MockFileHandle>()
  dirs = new Map<string, MockDirectoryHandle>()

  constructor(name = "") {
    this.name = name
  }

  getDirectoryHandle = vi
    .fn()
    .mockImplementation(
      async (name: string, options?: { create?: boolean }) => {
        if (!this.dirs.has(name)) {
          if (options?.create) {
            this.dirs.set(name, new MockDirectoryHandle(name))
          } else {
            const err = new Error("Directory not found")
            err.name = "NotFoundError"
            throw err
          }
        }
        return this.dirs.get(name)!
      }
    )

  removeEntry = vi.fn().mockImplementation(async (name: string) => {
    if (!this.files.has(name) && !this.dirs.has(name)) {
      const err = new Error("Entry not found")
      err.name = "NotFoundError"
      throw err
    }
    this.files.delete(name)
    this.dirs.delete(name)
  })

  values = vi.fn().mockImplementation(() => {
    const allEntries = [...this.dirs.values(), ...this.files.values()]
    let index = 0
    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            if (index < allEntries.length) {
              const value = allEntries[index++]
              const kind =
                (value as any).files !== undefined ? "directory" : "file"
              ;(value as any).kind = kind
              return { value, done: false }
            }
            return { done: true }
          }
        }
      }
    } as any
  })
}

describe("purge-ops tests", () => {
  const originalNavigator = global.navigator

  beforeEach(async () => {
    await db.styleCards.clear()
    await db.categories.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true
    })
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

  describe("cleanupOrphanedImages", () => {
    it("should prune orphaned OPFS images and keep referenced images", async () => {
      const rootDir = new MockDirectoryHandle()
      const mockGetDirectory = vi.fn().mockResolvedValue(rootDir)
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const imagesDir = new MockDirectoryHandle("images")
      rootDir.dirs.set("images", imagesDir)
      const cardsDir = new MockDirectoryHandle("cards")
      imagesDir.dirs.set("cards", cardsDir)
      const categoriesDir = new MockDirectoryHandle("categories")
      imagesDir.dirs.set("categories", categoriesDir)

      // Add image files to OPFS mock
      cardsDir.files.set("active.png", new MockFileHandle("active.png"))
      cardsDir.files.set("orphaned.png", new MockFileHandle("orphaned.png"))
      categoriesDir.files.set(
        "active-cat.png",
        new MockFileHandle("active-cat.png")
      )
      categoriesDir.files.set(
        "orphaned-cat.png",
        new MockFileHandle("orphaned-cat.png")
      )

      // Add corresponding IndexedDB cards and categories
      // One card is active referencing 'images/cards/active.png'
      await db.styleCards.add(
        mockStyleCard("active-card", {
          thumbnailPath: "images/cards/active.png",
          isDeleted: false
        })
      )
      // One card is soft-deleted referencing 'images/cards/orphaned.png'
      await db.styleCards.add(
        mockStyleCard("deleted-card", {
          thumbnailPath: "images/cards/orphaned.png",
          isDeleted: true
        })
      )
      // One category is active referencing 'images/categories/active-cat.png'
      await db.categories.add(
        mockCategory("active-cat", "Active Cat", {
          coverImagePath: "images/categories/active-cat.png",
          isDeleted: false
        })
      )

      await cleanupOrphanedImages(db)

      expect(cardsDir.files.has("active.png")).toBe(true)
      expect(cardsDir.files.has("orphaned.png")).toBe(false)
      expect(categoriesDir.files.has("active-cat.png")).toBe(true)
      expect(categoriesDir.files.has("orphaned-cat.png")).toBe(false)
    })
  })
})
