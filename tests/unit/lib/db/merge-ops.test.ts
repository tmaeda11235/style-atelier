import { db } from "@/lib/db"
import {
  deleteCategory,
  deleteStyleCardAndCleanup,
  mergeStyleCards
} from "@/lib/db/merge-ops"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Unmock the database to test real IndexedDB reactive behaviour with fake-indexeddb
vi.unmock("@/lib/db")
vi.unmock("@/lib/db/merge-ops")

describe("merge-ops tests", () => {
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
    images: ["image-" + id],
    jobId: "job-" + id,
    associatedJobIds: ["assoc-job-" + id],
    ...overrides
  })

  const mockCategory = (id: string, name: string, overrides?: any) => ({
    id,
    name,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides
  })

  describe("deleteStyleCardAndCleanup", () => {
    it("should soft delete card and clean up referencing categories", async () => {
      // Setup style card
      await db.styleCards.add(mockStyleCard("card-1"))

      // Setup category referencing card-1 as icon
      await db.categories.add(
        mockCategory("cat-1", "Category 1", {
          iconCardId: "card-1",
          iconUrl: "thumb-card-1"
        })
      )

      await deleteStyleCardAndCleanup(db, "card-1")

      // Verify style card is soft deleted and assets cleared
      const card = await db.styleCards.get("card-1")
      expect(card).toBeDefined()
      expect(card?.isDeleted).toBe(true)
      expect(card?.thumbnailData).toBe("")
      expect(card?.images).toEqual([])
      expect(card?.selectedThumbnails).toEqual([])

      // Verify category cleared reference to card-1
      const category = await db.categories.get("cat-1")
      expect(category).toBeDefined()
      expect(category?.iconCardId).toBeUndefined()
      expect(category?.iconUrl).toBeUndefined()
    })
  })

  describe("deleteCategory", () => {
    it("should soft delete category and remove it from associated style cards", async () => {
      // Setup category
      await db.categories.add(mockCategory("cat-1", "Category 1"))

      // Setup style cards: one in cat-1, one in other cat
      await db.styleCards.add(mockStyleCard("card-1", { category: "cat-1" }))
      await db.styleCards.add(
        mockStyleCard("card-2", { category: "cat-other" })
      )

      await deleteCategory(db, "cat-1")

      // Verify category is soft deleted
      const category = await db.categories.get("cat-1")
      expect(category).toBeDefined()
      expect(category?.isDeleted).toBe(true)

      // Verify card-1 no longer belongs to cat-1
      const card1 = await db.styleCards.get("card-1")
      expect(card1).toBeDefined()
      expect(card1?.category).toBeUndefined()

      // Verify card-2 is unaffected
      const card2 = await db.styleCards.get("card-2")
      expect(card2).toBeDefined()
      expect(card2?.category).toBe("cat-other")
    })
  })

  describe("mergeStyleCards", () => {
    it("should merge images, job IDs, and usage count from material cards", async () => {
      // Setup representative card
      await db.styleCards.add(
        mockStyleCard("card-rep", {
          usageCount: 5,
          images: ["img-rep-1"],
          thumbnailData: "thumb-rep",
          jobId: "job-rep",
          associatedJobIds: ["job-rep-assoc"]
        })
      )

      // Setup materials
      const mat1 = mockStyleCard("mat-1", {
        usageCount: 2,
        images: ["img-mat1-1"],
        thumbnailData: "thumb-mat1",
        jobId: "job-mat1",
        associatedJobIds: ["job-mat1-assoc"]
      })
      const mat2 = mockStyleCard("mat-2", {
        usageCount: 3,
        images: [], // No images, should fallback to thumbnailData
        thumbnailData: "thumb-mat2",
        jobId: "job-mat2"
      })
      await db.styleCards.bulkPut([mat1, mat2])

      // Merge: mat1 is consumed, mat2 is not consumed
      const consumeStates = {
        "mat-1": true,
        "mat-2": false
      }

      await mergeStyleCards(db, "card-rep", [mat1, mat2], consumeStates)

      // Verify representative card
      const rep = await db.styleCards.get("card-rep")
      expect(rep).toBeDefined()

      // Images merged: rep images ("img-rep-1"), rep thumb ("thumb-rep"), mat1 images ("img-mat1-1"), mat2 thumb ("thumb-mat2" fallback)
      expect(rep?.images).toEqual(
        expect.arrayContaining([
          "img-rep-1",
          "thumb-rep",
          "img-mat1-1",
          "thumb-mat2"
        ])
      )

      // Job IDs merged
      expect(rep?.associatedJobIds).toEqual(
        expect.arrayContaining([
          "job-rep-assoc",
          "job-rep",
          "job-mat1",
          "job-mat1-assoc",
          "job-mat2"
        ])
      )

      // Usage count: rep (5) + consumed mat1 (2) = 7. (mat2 not consumed, so 3 is not added)
      expect(rep?.usageCount).toBe(7)

      // Verify materials
      const mat1Db = await db.styleCards.get("mat-1")
      expect(mat1Db?.isDeleted).toBe(true) // Consumed -> deleted

      const mat2Db = await db.styleCards.get("mat-2")
      expect(mat2Db?.isDeleted).toBeFalsy() // Not consumed -> not deleted
    })

    it("should throw error if representative card is not found", async () => {
      const mat1 = mockStyleCard("mat-1")
      await expect(
        mergeStyleCards(db, "non-existent", [mat1], {})
      ).rejects.toThrow("Representative card not found")
    })
  })
})
