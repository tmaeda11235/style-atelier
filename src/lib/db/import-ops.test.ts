import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../db"
import { importBackupData, type BackupData } from "./import-ops"

// Unmock the database to test real IndexedDB reactive behaviour with fake-indexeddb
vi.unmock("../db")
vi.unmock("./import-ops")

describe("import-ops tests", () => {
  beforeEach(async () => {
    await db.styleCards.clear()
    await db.categories.clear()
    await db.userSettings.clear()
    await db.historyItems.clear()
    await db.slotHistory.clear()
  })

  const mockStyleCard = (id: string, name: string, time: number) => ({
    id,
    name,
    createdAt: time,
    updatedAt: time,
    promptSegments: [],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common" as const,
    isFavorite: false,
    usageCount: 0,
    tags: [],
    dominantColor: "#ffffff",
    thumbnailData: "",
    frameId: "",
    genealogy: { generation: 1, parentIds: [] }
  })

  const mockCategory = (id: string, name: string, time: number) => ({
    id,
    name,
    createdAt: time,
    updatedAt: time
  })

  const mockHistoryItem = (id: string, timestamp: number) => ({
    id,
    fullCommand: "test command",
    imageUrl: "http://example.com/image.png",
    timestamp
  })

  const mockBackupData: BackupData = {
    styleCards: [mockStyleCard("card-1", "Card 1", 1000)],
    categories: [mockCategory("cat-1", "Cat 1", 1000)],
    userSettings: [
      {
        userId: "user-1",
        isPro: true,
        unlockedSkins: [],
        branding: { enabled: false }
      }
    ],
    historyItems: [mockHistoryItem("hist-1", 1000)],
    slotHistory: {
      "slot-1": ["val1", "val2"]
    }
  }

  describe("replace mode", () => {
    it("should clear current database and load backup data", async () => {
      // Setup initial data
      await db.styleCards.add(mockStyleCard("card-old", "Old Card", 500))
      await db.categories.add(mockCategory("cat-old", "Old Cat", 500))

      // Import in replace mode
      await importBackupData(db, mockBackupData, "replace")

      // Verify old data is gone
      const cards = await db.styleCards.toArray()
      expect(cards.length).toBe(1)
      expect(cards[0].id).toBe("card-1")

      const categories = await db.categories.toArray()
      expect(categories.length).toBe(1)
      expect(categories[0].id).toBe("cat-1")

      const userSettings = await db.userSettings.toArray()
      expect(userSettings.length).toBe(1)
      expect(userSettings[0].userId).toBe("user-1")

      const history = await db.historyItems.toArray()
      expect(history.length).toBe(1)
      expect(history[0].id).toBe("hist-1")

      const slots = await db.slotHistory.toArray()
      expect(slots.length).toBe(1)
      expect(slots[0].label).toBe("slot-1")
      expect(slots[0].values).toEqual(["val1", "val2"])
    })
  })

  describe("merge mode", () => {
    it("should merge and resolve conflicts by timestamps", async () => {
      // Setup initial data
      // card-1 is older in DB, card-2 is newer in DB, card-3 is only in DB
      await db.styleCards.bulkPut([
        mockStyleCard("card-1", "Old Card 1 Local", 500),
        mockStyleCard("card-2", "New Card 2 Local", 2000),
        mockStyleCard("card-3", "Card 3 Local", 1000)
      ])

      // cat-1 is older in DB, cat-2 is newer in DB
      await db.categories.bulkPut([
        mockCategory("cat-1", "Old Cat 1 Local", 500),
        mockCategory("cat-2", "New Cat 2 Local", 2000)
      ])

      // hist-1 is older in DB, hist-2 is newer in DB
      await db.historyItems.bulkPut([
        mockHistoryItem("hist-1", 500),
        mockHistoryItem("hist-2", 2000)
      ])

      // slot-1 has some values
      await db.slotHistory.put({
        label: "slot-1",
        values: ["valA", "valB"],
        updatedAt: 500
      })

      // Incoming backup data
      const incomingBackup: BackupData = {
        styleCards: [
          mockStyleCard("card-1", "New Card 1 Backup", 1500), // Newer -> overwrite
          mockStyleCard("card-2", "Old Card 2 Backup", 1000), // Older -> skip
          mockStyleCard("card-4", "New Card 4 Backup", 1000) // New -> add
        ],
        categories: [
          mockCategory("cat-1", "New Cat 1 Backup", 1500), // Newer -> overwrite
          mockCategory("cat-2", "Old Cat 2 Backup", 1000), // Older -> skip
          mockCategory("cat-3", "New Cat 3 Backup", 1000) // New -> add
        ],
        userSettings: [
          {
            userId: "user-1",
            isPro: true,
            unlockedSkins: [],
            branding: { enabled: true }
          }
        ],
        historyItems: [
          mockHistoryItem("hist-1", 1500), // Newer -> overwrite
          mockHistoryItem("hist-2", 1000), // Older -> skip
          mockHistoryItem("hist-3", 1000) // New -> add
        ],
        slotHistory: {
          "slot-1": ["valB", "valC"] // Merge values -> valB, valC, valA
        }
      }

      await importBackupData(db, incomingBackup, "merge")

      // Verify Style Cards
      const cardMap = new Map(
        (await db.styleCards.toArray()).map((c) => [c.id, c])
      )
      expect(cardMap.size).toBe(4)
      expect(cardMap.get("card-1")?.name).toBe("New Card 1 Backup")
      expect(cardMap.get("card-2")?.name).toBe("New Card 2 Local")
      expect(cardMap.get("card-3")?.name).toBe("Card 3 Local")
      expect(cardMap.get("card-4")?.name).toBe("New Card 4 Backup")

      // Verify Categories
      const catMap = new Map(
        (await db.categories.toArray()).map((c) => [c.id, c])
      )
      expect(catMap.size).toBe(3)
      expect(catMap.get("cat-1")?.name).toBe("New Cat 1 Backup")
      expect(catMap.get("cat-2")?.name).toBe("New Cat 2 Local")
      expect(catMap.get("cat-3")?.name).toBe("New Cat 3 Backup")

      // Verify User Settings (always bulkPut-ed in merge mode)
      const userSettings = await db.userSettings.toArray()
      expect(userSettings.length).toBe(1)
      expect(userSettings[0].branding.enabled).toBe(true)

      // Verify History
      const histMap = new Map(
        (await db.historyItems.toArray()).map((h) => [h.id, h])
      )
      expect(histMap.size).toBe(3)
      expect(histMap.get("hist-1")?.timestamp).toBe(1500)
      expect(histMap.get("hist-2")?.timestamp).toBe(2000)
      expect(histMap.get("hist-3")?.timestamp).toBe(1000)

      // Verify Slot History
      const slot = await db.slotHistory.get("slot-1")
      expect(slot).toBeDefined()
      // should contain valB, valC, valA (unique, max 10)
      expect(slot?.values).toEqual(
        expect.arrayContaining(["valA", "valB", "valC"])
      )
      expect(slot?.values.length).toBe(3)
    })
  })
})
