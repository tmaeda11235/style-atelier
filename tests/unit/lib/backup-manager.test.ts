import { exportDatabase, importDatabase } from "@/lib/backup-manager"
import { db } from "@/lib/db"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock Dexie db
vi.mock("@/lib/db", () => {
  const mockTable = () => ({
    toArray: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined),
    bulkPut: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined)
  })
  return {
    db: {
      styleCards: mockTable(),
      categories: mockTable(),
      userSettings: mockTable(),
      historyItems: mockTable(),
      slotHistory: mockTable(),
      getAllCards: vi.fn().mockResolvedValue([]),
      getAllCategories: vi.fn().mockResolvedValue([]),
      getAllSlotHistory: vi.fn().mockResolvedValue({}),
      saveSlotHistory: vi.fn().mockResolvedValue(undefined),
      importBackupData: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn((mode, tables, cb) => cb())
    }
  }
})

describe("Backup Manager Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe("exportDatabase", () => {
    it("should serialize database tables, including logically deleted records, and exclude localImageBlob from historyItems", async () => {
      const mockCards = [
        { id: "card1", name: "Card 1" },
        { id: "card2", name: "Card 2 (Deleted)", isDeleted: true }
      ]
      const mockCategories = [
        { id: "cat1", name: "Category 1" },
        { id: "cat2", name: "Category 2 (Deleted)", isDeleted: true }
      ]
      const mockSettings = [{ userId: "user1", isPro: true }]
      const mockHistory = [
        {
          id: "hist1",
          fullCommand: "prompt 1",
          imageUrl: "url1",
          localImageBlob: new Blob()
        },
        { id: "hist2", fullCommand: "prompt 2", imageUrl: "url2" }
      ]

      vi.mocked(db.styleCards.toArray).mockResolvedValue(mockCards as any)
      vi.mocked(db.categories.toArray).mockResolvedValue(mockCategories as any)
      vi.mocked(db.userSettings.toArray).mockResolvedValue(mockSettings)
      vi.mocked(db.historyItems.toArray).mockResolvedValue(mockHistory)

      const json = await exportDatabase()
      const parsed = JSON.parse(json)

      expect(parsed.version).toBe(1)
      expect(parsed.exportedAt).toBeLessThanOrEqual(Date.now())
      expect(parsed.data.styleCards).toEqual(mockCards)
      expect(parsed.data.categories).toEqual(mockCategories)
      expect(parsed.data.userSettings).toEqual(mockSettings)

      // localImageBlob should be excluded
      expect(parsed.data.historyItems).toHaveLength(2)
      expect(parsed.data.historyItems[0]).not.toHaveProperty("localImageBlob")
      expect(parsed.data.historyItems[0].id).toBe("hist1")
      expect(parsed.data.historyItems[1].id).toBe("hist2")
    })

    it("should include slotHistory from IndexedDB in the exported payload", async () => {
      const mockSlotHistory = {
        subject: ["cat", "dog"],
        style: ["anime"]
      }
      vi.mocked(db.getAllSlotHistory).mockResolvedValue(mockSlotHistory)

      const json = await exportDatabase()
      const parsed = JSON.parse(json)

      expect(parsed.data.slotHistory).toEqual(mockSlotHistory)
    })
  })

  describe("importDatabase", () => {
    const mockStyleCard = {
      id: "card-123",
      name: "Mock Card",
      createdAt: 123456789,
      updatedAt: 123456789,
      promptSegments: [{ type: "text", value: "test command" }],
      parameters: { ar: "16:9" },
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Common",
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      tags: ["test"],
      category: "cat1",
      dominantColor: "#ffffff",
      thumbnailData: "data:image/png;base64,abc",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] }
    }

    const mockCustomCategory = {
      id: "cat1",
      name: "Category 1",
      createdAt: 123456789
    }

    const mockHistoryItem = {
      id: "hist-123",
      fullCommand: "full prompt",
      imageUrl: "http://example.com/img.png",
      timestamp: 123456789
    }

    const mockUserSettings = {
      userId: "user-123",
      isPro: false,
      unlockedSkins: [],
      branding: { enabled: false }
    }

    it("should merge payload data into tables using bulkPut without clearing", async () => {
      const mockPayload = {
        version: 1,
        exportedAt: 123456,
        data: {
          styleCards: [mockStyleCard],
          categories: [mockCustomCategory],
          userSettings: [mockUserSettings],
          historyItems: [mockHistoryItem]
        }
      }

      await importDatabase(JSON.stringify(mockPayload))

      expect(db.importBackupData).toHaveBeenCalledWith(
        mockPayload.data,
        "replace"
      )
    })

    it("should pass slotHistory to db.importBackupData", async () => {
      const incomingHistory = {
        subject: ["common", "incoming1", "incoming2"]
      }

      const mockPayload = {
        version: 1,
        exportedAt: 123456,
        data: {
          styleCards: [],
          categories: [],
          userSettings: [],
          historyItems: [],
          slotHistory: incomingHistory
        }
      }

      await importDatabase(JSON.stringify(mockPayload), "merge")

      expect(db.importBackupData).toHaveBeenCalledWith(
        mockPayload.data,
        "merge"
      )
    })

    it("should throw error if payload structure is invalid", async () => {
      const invalidPayload = { foo: "bar" }
      await expect(
        importDatabase(JSON.stringify(invalidPayload))
      ).rejects.toThrow()
    })

    it("should throw error if backup version is unsupported", async () => {
      const mockPayload = {
        version: 2,
        exportedAt: 123456,
        data: {
          styleCards: [],
          categories: [],
          userSettings: [],
          historyItems: []
        }
      }
      await expect(importDatabase(JSON.stringify(mockPayload))).rejects.toThrow(
        /version.*is not supported/
      )
    })

    it("should throw error if styleCards schema is invalid", async () => {
      const invalidStyleCard = {
        ...mockStyleCard,
        tier: "UnknownTier"
      }
      const mockPayload = {
        version: 1,
        exportedAt: 123456,
        data: {
          styleCards: [invalidStyleCard],
          categories: [],
          userSettings: [],
          historyItems: []
        }
      }
      await expect(importDatabase(JSON.stringify(mockPayload))).rejects.toThrow(
        /invalid tier/
      )
    })
  })
})
