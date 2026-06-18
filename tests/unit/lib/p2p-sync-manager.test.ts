import { beforeEach, describe, expect, it } from "vitest"

import { db } from "../../../src/lib/db"
import {
  decryptSyncData,
  encryptSyncData,
  mergeIncomingSyncData,
  prepareOutgoingSyncData
} from "../../../src/lib/p2p-sync-manager"

describe("p2p-sync-manager", () => {
  beforeEach(async () => {
    // Clear mock database before each test
    await db.styleCards.clear()
    await db.categories.clear()
    await db.historyItems.clear()
  })

  describe("Encryption & Decryption", () => {
    it("should successfully encrypt and decrypt data with the correct key", async () => {
      const originalData = JSON.stringify({ hello: "p2p-sync-world" })
      const key = "super-secret-key"

      const encrypted = await encryptSyncData(originalData, key)
      expect(encrypted).toBeTypeOf("string")
      expect(encrypted.length).toBeGreaterThan(0)

      const decrypted = await decryptSyncData(encrypted, key)
      expect(decrypted).toEqual(originalData)
    })

    it("should throw an error when decrypting with an incorrect key", async () => {
      const originalData = JSON.stringify({ secret: "data" })
      const key = "key-1"
      const wrongKey = "key-2"

      const encrypted = await encryptSyncData(originalData, key)

      await expect(decryptSyncData(encrypted, wrongKey)).rejects.toThrow()
    })
  })

  describe("DB Export & Merge Integration", () => {
    it("should prepare payload and merge incoming cards/categories successfully", async () => {
      // 1. Seed some initial data
      await db.styleCards.add({
        id: "test-card-1",
        name: "Cyber Samurai",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [],
        rarity: "epic",
        imageUrl: "http://example.com/samurai.png",
        associatedJobIds: []
      } as any)

      await db.categories.add({
        id: "test-cat-1",
        name: "Characters",
        cardIds: ["test-card-1"],
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any)

      // 2. Prepare outgoing sync payload
      const payloadStr = await prepareOutgoingSyncData()
      expect(payloadStr).toContain("Cyber Samurai")
      expect(payloadStr).toContain("Characters")

      // 3. Clear database to simulate remote device merging
      await db.styleCards.clear()
      await db.categories.clear()

      // 4. Merge payload back into the empty database
      const mergeResult = await mergeIncomingSyncData(payloadStr)
      expect(mergeResult.success).toBe(true)
      expect(mergeResult.cardsCount).toBe(1)
      expect(mergeResult.categoriesCount).toBe(1)

      // 5. Verify data is restored in DB
      const cards = await db.getAllCards()
      expect(cards.length).toBe(1)
      expect(cards[0].name).toBe("Cyber Samurai")

      const categories = await db.getAllCategories()
      expect(categories.length).toBe(1)
      expect(categories[0].name).toBe("Characters")
    })
  })
})
