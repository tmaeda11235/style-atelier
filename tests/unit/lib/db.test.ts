import {
  seedDefaultCategories,
  StyleAtelierDatabase,
  upgradeToVersion8,
  upgradeToVersion10
} from "@/lib/db"
import { upgradeToVersion11 } from "@/lib/db-setup"
import { describe, expect, it, vi } from "vitest"

vi.unmock("@/lib/db")

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

  describe("upgradeToVersion10", () => {
    it("should compress large base64 thumbnails and category iconUrls", async () => {
      const mockCards = [
        {
          id: "card-1",
          thumbnailData: "data:image/png;base64,large-image-data..."
        },
        { id: "card-2", thumbnailData: "" }
      ]
      const mockCategories = [
        { id: "cat-1", iconUrl: "data:image/png;base64,large-image-data..." },
        { id: "cat-2", iconEmoji: "🎨" }
      ]

      const mockCardsPut = vi.fn().mockResolvedValue(undefined)
      const mockCategoriesPut = vi.fn().mockResolvedValue(undefined)

      const mockCardsTable = {
        toArray: vi.fn().mockResolvedValue(mockCards),
        put: mockCardsPut
      }
      const mockCategoriesTable = {
        toArray: vi.fn().mockResolvedValue(mockCategories),
        put: mockCategoriesPut
      }

      const mockTable = vi.fn((tableName) => {
        if (tableName === "styleCards") return mockCardsTable
        if (tableName === "categories") return mockCategoriesTable
        return null
      })

      const mockTx = { table: mockTable } as any

      await upgradeToVersion10(mockTx)

      expect(mockTable).toHaveBeenCalledWith("styleCards")
      expect(mockTable).toHaveBeenCalledWith("categories")
      expect(mockCardsPut).toHaveBeenCalled()
      expect(mockCategoriesPut).toHaveBeenCalled()

      expect(mockCards[0].thumbnailData).toContain("data:image/png;base64,")
      expect(mockCategories[0].iconUrl).toContain("data:image/png;base64,")
    })
  })

  describe("upgradeToVersion11", () => {
    it("should migrate slot history from localStorage to slotHistory table", async () => {
      const mockSlotHistory = {
        subject: ["item1", "item2"]
      }
      localStorage.setItem(
        "style_atelier_slot_history",
        JSON.stringify(mockSlotHistory)
      )

      const mockBulkAdd = vi.fn().mockReturnValue({
        catch: vi.fn().mockImplementation((cb) => {
          cb(new Error("mock error"))
        })
      })
      const mockTable = vi.fn().mockReturnValue({
        bulkAdd: mockBulkAdd
      })
      const mockTx = { table: mockTable } as any

      await upgradeToVersion11(mockTx)

      expect(mockTable).toHaveBeenCalledWith("slotHistory")
      expect(mockBulkAdd).toHaveBeenCalledWith([
        {
          label: "subject",
          values: ["item1", "item2"],
          updatedAt: expect.any(Number)
        }
      ])
    })

    it("should handle empty localStorage or invalid JSON gracefully", async () => {
      localStorage.removeItem("style_atelier_slot_history")
      const mockTx = { table: vi.fn() } as any
      await upgradeToVersion11(mockTx)
      expect(mockTx.table).not.toHaveBeenCalled()

      localStorage.setItem("style_atelier_slot_history", "invalid JSON")
      await upgradeToVersion11(mockTx)
      expect(mockTx.table).not.toHaveBeenCalled()
    })
  })

  describe("seedDefaultCategories", () => {
    it("should call bulkPut on the categories table with the default categories", async () => {
      const mockCategories = {
        bulkPut: vi.fn().mockResolvedValue(undefined)
      }
      const mockDb = {
        categories: mockCategories
      } as any

      await seedDefaultCategories(mockDb)

      expect(mockCategories.bulkPut).toHaveBeenCalled()
      const calls = mockCategories.bulkPut.mock.calls
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

  describe("importBackupData", () => {
    it("should replace slotHistory table with incoming values in replace mode", async () => {
      const mockSlotHistoryClear = vi.fn().mockResolvedValue(undefined)
      const mockSlotHistoryBulkPut = vi.fn().mockResolvedValue(undefined)

      const mockDbInstance = {
        styleCards: { clear: vi.fn(), bulkPut: vi.fn() },
        categories: { clear: vi.fn(), bulkPut: vi.fn() },
        userSettings: { clear: vi.fn(), bulkPut: vi.fn() },
        historyItems: { clear: vi.fn(), bulkPut: vi.fn() },
        slotHistory: {
          clear: mockSlotHistoryClear,
          bulkPut: mockSlotHistoryBulkPut
        },
        transaction: vi.fn(async (mode, tables, callback) => {
          return callback()
        })
      } as any

      const mockData = {
        styleCards: [],
        categories: [],
        userSettings: [],
        historyItems: [],
        slotHistory: {
          subject: ["cat", "dog"]
        }
      }

      await StyleAtelierDatabase.prototype.importBackupData.call(
        mockDbInstance,
        mockData,
        "replace"
      )

      expect(mockSlotHistoryClear).toHaveBeenCalled()
      expect(mockSlotHistoryBulkPut).toHaveBeenCalled()
      const putItems = mockSlotHistoryBulkPut.mock.calls[0][0]
      expect(putItems).toHaveLength(1)
      expect(putItems[0]).toMatchObject({
        label: "subject",
        values: ["cat", "dog"],
        updatedAt: expect.any(Number)
      })
    })

    it("should merge slotHistory in merge mode, eliminating duplicates and capping at 10 items", async () => {
      const mockSlotHistoryGet = vi.fn((label) => {
        if (label === "subject") {
          return Promise.resolve({
            label: "subject",
            values: ["1", "2", "3", "4", "5", "6", "7", "8"],
            updatedAt: 100
          })
        }
        return Promise.resolve(undefined)
      })
      const mockSlotHistoryPut = vi.fn().mockResolvedValue(undefined)

      const mockDbInstance = {
        styleCards: { toArray: vi.fn().mockResolvedValue([]) },
        categories: { toArray: vi.fn().mockResolvedValue([]) },
        userSettings: { bulkPut: vi.fn().mockResolvedValue([]) },
        historyItems: { toArray: vi.fn().mockResolvedValue([]) },
        slotHistory: { get: mockSlotHistoryGet, put: mockSlotHistoryPut },
        transaction: vi.fn(async (mode, tables, callback) => {
          return callback()
        })
      } as any

      const mockData = {
        styleCards: [],
        categories: [],
        userSettings: [],
        historyItems: [],
        slotHistory: {
          subject: ["9", "10", "11", "12", "13", "1"], // '1' is duplicate
          artist: ["picasso"]
        }
      }

      await StyleAtelierDatabase.prototype.importBackupData.call(
        mockDbInstance,
        mockData,
        "merge"
      )

      expect(mockSlotHistoryGet).toHaveBeenCalledWith("subject")
      expect(mockSlotHistoryGet).toHaveBeenCalledWith("artist")

      expect(mockSlotHistoryPut).toHaveBeenCalledTimes(2)
      // Verify subject merge
      const subjectPut = mockSlotHistoryPut.mock.calls.find(
        (call: any) => call[0].label === "subject"
      )[0]
      expect(subjectPut.values).toEqual([
        "9",
        "10",
        "11",
        "12",
        "13",
        "1",
        "2",
        "3",
        "4",
        "5"
      ]) // "1" duplicate removed, "6", "7", "8" sliced out since cap is 10
      expect(subjectPut.values).toHaveLength(10)

      // Verify artist merge (brand new label)
      const artistPut = mockSlotHistoryPut.mock.calls.find(
        (call: any) => call[0].label === "artist"
      )[0]
      expect(artistPut.values).toEqual(["picasso"])
    })
  })

  describe("StyleAtelierDatabase methods", () => {
    it("getCard should return card if not deleted", async () => {
      const card = { id: "1", isDeleted: false }
      const mockDbInstance = {
        styleCards: {
          get: vi.fn().mockResolvedValue(card)
        }
      } as any
      const result = await StyleAtelierDatabase.prototype.getCard.call(
        mockDbInstance,
        "1"
      )
      expect(result).toBe(card)
    })

    it("getCard should return undefined if card is deleted", async () => {
      const card = { id: "1", isDeleted: true }
      const mockDbInstance = {
        styleCards: {
          get: vi.fn().mockResolvedValue(card)
        }
      } as any
      const result = await StyleAtelierDatabase.prototype.getCard.call(
        mockDbInstance,
        "1"
      )
      expect(result).toBeUndefined()
    })

    it("getCard should return undefined if card not found", async () => {
      const mockDbInstance = {
        styleCards: {
          get: vi.fn().mockResolvedValue(undefined)
        }
      } as any
      const result = await StyleAtelierDatabase.prototype.getCard.call(
        mockDbInstance,
        "1"
      )
      expect(result).toBeUndefined()
    })

    it("getAllCards should filter out deleted cards", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(["card1", "card2"])
      })
      const mockDbInstance = {
        styleCards: {
          filter: mockFilter
        }
      } as any
      const result =
        await StyleAtelierDatabase.prototype.getAllCards.call(mockDbInstance)
      expect(result).toEqual(["card1", "card2"])
      expect(mockFilter).toHaveBeenCalled()
      const filterFn = mockFilter.mock.calls[0][0]
      expect(filterFn({ isDeleted: false })).toBe(true)
      expect(filterFn({ isDeleted: true })).toBe(false)
    })

    it("getPinnedCards should filter out deleted cards and only return pinned ones", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(["card1"])
      })
      const mockDbInstance = {
        styleCards: {
          filter: mockFilter
        }
      } as any
      const result =
        await StyleAtelierDatabase.prototype.getPinnedCards.call(mockDbInstance)
      expect(result).toEqual(["card1"])
      expect(mockFilter).toHaveBeenCalled()
      const filterFn = mockFilter.mock.calls[0][0]
      expect(filterFn({ isDeleted: false, isPinned: true })).toBe(true)
      expect(filterFn({ isDeleted: true, isPinned: true })).toBe(false)
      expect(filterFn({ isDeleted: false, isPinned: false })).toBe(false)
    })

    it("getCardByJobId should find card by jobId or associatedJobIds", async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValue({ id: "card1", isDeleted: false })
      const mockEquals = vi.fn().mockReturnValue({ first: mockFirst })
      const mockWhere = vi.fn().mockReturnValue({ equals: mockEquals })
      const mockDbInstance = {
        styleCards: {
          where: mockWhere
        }
      } as any

      const result = await StyleAtelierDatabase.prototype.getCardByJobId.call(
        mockDbInstance,
        "job-1"
      )
      expect(result).toEqual({ id: "card1", isDeleted: false })
      expect(mockWhere).toHaveBeenCalledWith("jobId")
      expect(mockEquals).toHaveBeenCalledWith("job-1")
    })

    it("getCardByJobId fallback should query associatedJobIds", async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(undefined) // first call (jobId)
        .mockResolvedValueOnce({ id: "card2", isDeleted: false }) // second call (associatedJobIds)
      const mockEquals = vi.fn().mockReturnValue({ first: mockFirst })
      const mockWhere = vi.fn().mockReturnValue({ equals: mockEquals })
      const mockDbInstance = {
        styleCards: {
          where: mockWhere
        }
      } as any

      const result = await StyleAtelierDatabase.prototype.getCardByJobId.call(
        mockDbInstance,
        "job-1"
      )
      expect(result).toEqual({ id: "card2", isDeleted: false })
      expect(mockWhere).toHaveBeenCalledWith("jobId")
      expect(mockWhere).toHaveBeenCalledWith("associatedJobIds")
    })

    it("getCardByJobId should return undefined if card is deleted", async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValue({ id: "card1", isDeleted: true })
      const mockEquals = vi.fn().mockReturnValue({ first: mockFirst })
      const mockWhere = vi.fn().mockReturnValue({ equals: mockEquals })
      const mockDbInstance = {
        styleCards: {
          where: mockWhere
        }
      } as any

      const result = await StyleAtelierDatabase.prototype.getCardByJobId.call(
        mockDbInstance,
        "job-1"
      )
      expect(result).toBeUndefined()
    })

    it("addCard, updateCard, putCard, deleteCard wrappers should delegate to IndexedDB tables", async () => {
      const mockAdd = vi.fn().mockResolvedValue("new-id")
      const mockUpdate = vi.fn().mockResolvedValue(1)
      const mockPut = vi.fn().mockResolvedValue("put-id")
      const mockCleanup = vi.fn().mockResolvedValue(undefined)

      const mockDbInstance = {
        styleCards: {
          add: mockAdd,
          update: mockUpdate,
          put: mockPut
        },
        deleteStyleCardAndCleanup: mockCleanup
      } as any

      const card = { id: "1" } as any
      expect(
        await StyleAtelierDatabase.prototype.addCard.call(mockDbInstance, card)
      ).toBe("new-id")
      expect(
        await StyleAtelierDatabase.prototype.updateCard.call(
          mockDbInstance,
          "1",
          { name: "New" }
        )
      ).toBe(1)
      expect(
        await StyleAtelierDatabase.prototype.putCard.call(mockDbInstance, card)
      ).toBe("put-id")

      await StyleAtelierDatabase.prototype.deleteCard.call(mockDbInstance, "1")
      expect(mockCleanup).toHaveBeenCalledWith("1")
    })

    it("getAllCategories should filter deleted categories", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(["cat1"])
      })
      const mockDbInstance = {
        categories: {
          filter: mockFilter
        }
      } as any
      const result =
        await StyleAtelierDatabase.prototype.getAllCategories.call(
          mockDbInstance
        )
      expect(result).toEqual(["cat1"])
      expect(mockFilter).toHaveBeenCalled()
      const filterFn = mockFilter.mock.calls[0][0]
      expect(filterFn({ isDeleted: false })).toBe(true)
      expect(filterFn({ isDeleted: true })).toBe(false)
    })

    it("getCategory should return category if not deleted", async () => {
      const cat = { id: "1", isDeleted: false }
      const mockDbInstance = {
        categories: {
          get: vi.fn().mockResolvedValue(cat)
        }
      } as any
      const result = await StyleAtelierDatabase.prototype.getCategory.call(
        mockDbInstance,
        "1"
      )
      expect(result).toBe(cat)
    })

    it("getCategory should return undefined if category is deleted or not found", async () => {
      const cat = { id: "1", isDeleted: true }
      const mockDbInstance = {
        categories: {
          get: vi.fn().mockResolvedValue(cat)
        }
      } as any
      expect(
        await StyleAtelierDatabase.prototype.getCategory.call(
          mockDbInstance,
          "1"
        )
      ).toBeUndefined()

      const mockDbInstanceNull = {
        categories: {
          get: vi.fn().mockResolvedValue(undefined)
        }
      } as any
      expect(
        await StyleAtelierDatabase.prototype.getCategory.call(
          mockDbInstanceNull,
          "1"
        )
      ).toBeUndefined()
    })

    it("addCategory and updateCategory should add/update and set timestamp", async () => {
      const mockAdd = vi.fn().mockResolvedValue("new-cat")
      const mockUpdate = vi.fn().mockResolvedValue(1)
      const mockDbInstance = {
        categories: {
          add: mockAdd,
          update: mockUpdate
        }
      } as any

      const cat = { id: "1", name: "Style", createdAt: 123 } as any
      await StyleAtelierDatabase.prototype.addCategory.call(mockDbInstance, cat)
      expect(mockAdd).toHaveBeenCalledWith({
        id: "1",
        name: "Style",
        createdAt: 123,
        updatedAt: 123
      })

      await StyleAtelierDatabase.prototype.updateCategory.call(
        mockDbInstance,
        "1",
        { name: "Style2" }
      )
      expect(mockUpdate).toHaveBeenCalledWith("1", {
        name: "Style2",
        updatedAt: expect.any(Number)
      })
    })

    it("getSlotHistory and saveSlotHistory should manage values correctly", async () => {
      const mockGet = vi.fn().mockResolvedValue({ values: ["a", "b"] })
      const mockPut = vi.fn().mockResolvedValue(undefined)
      const mockDbInstance = {
        slotHistory: {
          get: mockGet,
          put: mockPut
        }
      } as any

      const result = await StyleAtelierDatabase.prototype.getSlotHistory.call(
        mockDbInstance,
        "subject"
      )
      expect(result).toEqual(["a", "b"])

      await StyleAtelierDatabase.prototype.saveSlotHistory.call(
        mockDbInstance,
        "subject",
        ["c"]
      )
      expect(mockPut).toHaveBeenCalledWith({
        label: "subject",
        values: ["c"],
        updatedAt: expect.any(Number)
      })
    })

    it("getSlotHistory should return empty array if not found", async () => {
      const mockDbInstance = {
        slotHistory: {
          get: vi.fn().mockResolvedValue(undefined)
        }
      } as any
      const result = await StyleAtelierDatabase.prototype.getSlotHistory.call(
        mockDbInstance,
        "subject"
      )
      expect(result).toEqual([])
    })

    it("getAllSlotHistory should return key-value map of histories", async () => {
      const mockToArray = vi.fn().mockResolvedValue([
        { label: "subject", values: ["a"] },
        { label: "artist", values: ["b"] }
      ])
      const mockDbInstance = {
        slotHistory: {
          toArray: mockToArray
        }
      } as any
      const result =
        await StyleAtelierDatabase.prototype.getAllSlotHistory.call(
          mockDbInstance
        )
      expect(result).toEqual({
        subject: ["a"],
        artist: ["b"]
      })
    })
  })
})
