import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../../src/lib/db"
import {
  decryptSyncData,
  encryptSyncData,
  getLocalImagesMetadata,
  mergeIncomingSyncData,
  prepareOutgoingSyncData,
  readOpfsFileAsBlob,
  saveIncomingImage,
  scanLocalImages
} from "../../../src/lib/p2p-sync-manager"

// Mock migration-helpers
vi.mock("../../../src/shared/lib/db/migration-helpers", () => ({
  computeHash: vi.fn().mockResolvedValue("mock-hash"),
  listOpfsFiles: vi.fn().mockResolvedValue([
    {
      filePath: "images/cards/test-card-1.png",
      name: "test-card-1.png",
      handle: {
        getFile: vi
          .fn()
          .mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])]))
      }
    }
  ])
}))

// Mock navigator.storage
const mockFileHandle = {
  createWritable: vi.fn().mockResolvedValue({
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }),
  getFile: vi.fn().mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])])),
  move: vi.fn().mockResolvedValue(undefined)
}

const mockDirectoryHandle = {
  getDirectoryHandle: vi
    .fn()
    .mockImplementation(async () => mockDirectoryHandle),
  getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
  removeEntry: vi.fn().mockResolvedValue(undefined)
}

const mockGetDirectory = vi.fn().mockResolvedValue(mockDirectoryHandle)

if (typeof global.navigator === "undefined") {
  ;(global as any).navigator = {}
}
Object.defineProperty(global.navigator, "storage", {
  value: { getDirectory: mockGetDirectory },
  writable: true,
  configurable: true
})

describe("p2p-sync-manager", () => {
  beforeEach(async () => {
    // Clear mock database before each test
    await db.styleCards.clear()
    await db.categories.clear()
    await db.historyItems.clear()
    if (db.imageSyncStates) {
      await db.imageSyncStates.clear()
    }
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

  describe("OPFS Image operations", () => {
    beforeEach(async () => {
      await db.imageSyncStates.clear()
    })

    it("should read OPFS file as blob", async () => {
      const blob = await readOpfsFileAsBlob("images/cards/test-card-1.png")
      expect(blob).toBeInstanceOf(Blob)
      const buffer = await blob.arrayBuffer()
      expect(buffer.byteLength).toBe(3)
    })

    it("should save incoming image", async () => {
      const buffer = new Uint8Array([1, 2, 3]).buffer
      await saveIncomingImage(
        "images/cards/test-card-1.png",
        buffer,
        "mock-hash"
      )

      const meta = await getLocalImagesMetadata()
      expect(meta.length).toBe(1)
      expect(meta[0].filePath).toBe("images/cards/test-card-1.png")
      expect(meta[0].hash).toBe("mock-hash")
    })

    it("should scan local images and sync state", async () => {
      await scanLocalImages()
      const meta = await getLocalImagesMetadata()
      expect(meta.length).toBe(1)
      expect(meta[0].filePath).toBe("images/cards/test-card-1.png")
      expect(meta[0].hash).toBe("mock-hash")
    })

    it("should return early in scanLocalImages if images directory does not exist", async () => {
      const originalGetDirectoryHandle = mockDirectoryHandle.getDirectoryHandle
      mockDirectoryHandle.getDirectoryHandle = vi
        .fn()
        .mockRejectedValue(new Error("Not found"))

      try {
        await scanLocalImages()
        expect(true).toBe(true)
      } finally {
        mockDirectoryHandle.getDirectoryHandle = originalGetDirectoryHandle
      }
    })

    it("should handle changed hashes and deleted files during scanLocalImages", async () => {
      await db.imageSyncStates.put({
        filePath: "images/cards/test-card-1.png",
        cardId: "test-card-1",
        hash: "old-hash",
        syncStatus: "synced",
        updatedAt: Date.now()
      })

      await db.imageSyncStates.put({
        filePath: "images/cards/deleted-card.png",
        cardId: "deleted-card",
        hash: "some-hash",
        syncStatus: "synced",
        updatedAt: Date.now()
      })

      await db.imageSyncStates.put({
        filePath: "images/cards/pending-deleted-card.png",
        cardId: "pending-deleted-card",
        hash: "some-hash",
        syncStatus: "pending",
        updatedAt: Date.now()
      })

      await scanLocalImages()

      const state1 = await db.imageSyncStates.get(
        "images/cards/test-card-1.png"
      )
      expect(state1?.syncStatus).toBe("pending")

      const state2 = await db.imageSyncStates.get(
        "images/cards/deleted-card.png"
      )
      expect(state2?.syncStatus).toBe("deleted")

      const state3 = await db.imageSyncStates.get(
        "images/cards/pending-deleted-card.png"
      )
      expect(state3).toBeUndefined()
    })

    it("should fallback to direct write if atomic move fails during save", async () => {
      const originalMove = mockFileHandle.move
      mockFileHandle.move = vi.fn().mockRejectedValue(new Error("Move failed"))

      const buffer = new Uint8Array([9, 9, 9]).buffer
      await saveIncomingImage(
        "images/cards/fallback-card.png",
        buffer,
        "fallback-hash"
      )

      const meta = await getLocalImagesMetadata()
      expect(
        meta.some((m) => m.filePath === "images/cards/fallback-card.png")
      ).toBe(true)

      mockFileHandle.move = originalMove
    })
  })
})
