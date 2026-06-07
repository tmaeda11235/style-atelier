import { describe, expect, it, vi } from "vitest"

import {
  seedDefaultCategories,
  StyleAtelierDatabase,
  upgradeToVersion8
} from "./db"

vi.unmock("./db")

describe("db utilities", () => {
  describe("upgradeToVersion8", () => {
    it("should initialize associatedJobIds for cards that lack it", async () => {
      let modifyCallback: ((card: any) => void) | null = null
      const mockModify = vi.fn((cb) => {
        modifyCallback = cb
        return Promise.resolve()
      })
      const mockToCollection = vi.fn().mockReturnValue({ modify: mockModify })
      const mockTable = vi
        .fn()
        .mockReturnValue({ toCollection: mockToCollection })
      const mockTx = { table: mockTable } as any

      await upgradeToVersion8(mockTx)

      expect(mockTable).toHaveBeenCalledWith("styleCards")
      expect(mockToCollection).toHaveBeenCalled()
      expect(mockModify).toHaveBeenCalled()
      expect(modifyCallback).toBeTypeOf("function")

      // Test case 1: card has jobId and no associatedJobIds
      const card1 = { jobId: "job-123" } as any
      modifyCallback!(card1)
      expect(card1.associatedJobIds).toEqual(["job-123"])

      // Test case 2: card has no jobId and no associatedJobIds
      const card2 = {} as any
      modifyCallback!(card2)
      expect(card2.associatedJobIds).toEqual([])

      // Test case 3: card already has associatedJobIds, should not be modified
      const card3 = { jobId: "job-123", associatedJobIds: ["job-abc"] } as any
      modifyCallback!(card3)
      expect(card3.associatedJobIds).toEqual(["job-abc"])
    })
  })

  describe("seedDefaultCategories", () => {
    it("should call bulkAdd on the categories table with the default categories", async () => {
      const mockCategories = {
        bulkAdd: vi.fn().mockResolvedValue(undefined)
      }
      const mockDb = {
        categories: mockCategories
      } as any

      await seedDefaultCategories(mockDb)

      expect(mockCategories.bulkAdd).toHaveBeenCalled()
      const calls = mockCategories.bulkAdd.mock.calls
      const categoriesPassed = calls[0][0]
      expect(categoriesPassed).toHaveLength(7)
      expect(categoriesPassed[0]).toMatchObject({
        id: "style",
        name: "Style",
        iconEmoji: "🎨"
      })
      expect(categoriesPassed[1]).toMatchObject({
        id: "character",
        name: "Character",
        iconEmoji: "👤"
      })
      expect(categoriesPassed[0].createdAt).toBeTypeOf("number")
    })
  })

  describe("deleteStyleCardAndCleanup", () => {
    it("should delete the card and clear category cover references if it is used as iconCardId", async () => {
      // Mock db implementation for this test case
      const mockCategories = [
        {
          id: "cat-1",
          name: "Cat 1",
          iconCardId: "card-delete-me",
          iconUrl: "data:image/png;..."
        },
        {
          id: "cat-2",
          name: "Cat 2",
          iconCardId: "card-keep-me",
          iconUrl: "data:image/png;..."
        }
      ]

      const mockCategoriesUpdate = vi.fn().mockResolvedValue(undefined)
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([mockCategories[0]])
      })

      const mockCard = {
        id: "card-delete-me",
        thumbnailData: "data:image/png;...",
        images: ["data:image/png;..."],
        selectedThumbnails: ["data:image/png;..."]
      }

      const mockGet = vi.fn().mockResolvedValue(mockCard)
      const mockCardsUpdate = vi.fn().mockResolvedValue(undefined)

      const mockDbInstance = {
        categories: {
          filter: mockFilter,
          update: mockCategoriesUpdate
        },
        styleCards: {
          get: mockGet,
          update: mockCardsUpdate
        },
        transaction: vi.fn(async (mode, tables, callback) => {
          return callback()
        })
      } as any

      // Call the method on our mocked DB instance
      await StyleAtelierDatabase.prototype.deleteStyleCardAndCleanup.call(
        mockDbInstance,
        "card-delete-me"
      )

      // Verify the transaction was called correctly
      expect(mockDbInstance.transaction).toHaveBeenCalledWith(
        "rw",
        [mockDbInstance.styleCards, mockDbInstance.categories],
        expect.any(Function)
      )

      // Verify category filter queried for the correct cardId
      expect(mockFilter).toHaveBeenCalled()
      const filterFn = mockFilter.mock.calls[0][0]
      expect(filterFn({ iconCardId: "card-delete-me" })).toBe(true)
      expect(filterFn({ iconCardId: "card-keep-me" })).toBe(false)

      // Verify category update cleared the references
      expect(mockCategoriesUpdate).toHaveBeenCalledWith("cat-1", {
        iconCardId: undefined,
        iconUrl: undefined,
        updatedAt: expect.any(Number)
      })

      // Verify card was soft deleted and heavy data cleared
      expect(mockGet).toHaveBeenCalledWith("card-delete-me")
      expect(mockCardsUpdate).toHaveBeenCalledWith("card-delete-me", {
        isDeleted: true,
        thumbnailData: "",
        images: [],
        selectedThumbnails: [],
        updatedAt: expect.any(Number)
      })
    })
  })
})
