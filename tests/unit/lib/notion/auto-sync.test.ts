import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../../../src/lib/db"
import {
  computeCardHash,
  isNotionSyncActive,
  syncCardToNotion
} from "../../../../src/lib/notion/auto-sync"
import * as notionClient from "../../../../src/lib/notion/client"
import type { StyleCard } from "../../../../src/shared/lib/db-schema"

vi.unmock("../../../../src/lib/db")

describe("Notion Auto Sync", () => {
  const originalChrome = (global as any).chrome

  beforeEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    await db.styleCards.clear()
    await db.notionSyncStates.clear()
  })

  afterEach(() => {
    ;(global as any).chrome = originalChrome
  })

  describe("isNotionSyncActive", () => {
    it("should return true when license status is valid", () => {
      localStorage.setItem("style-atelier-license-status", "valid")
      expect(isNotionSyncActive()).toBe(true)
    })

    it("should return false when license status is not valid", () => {
      localStorage.setItem("style-atelier-license-status", "unlicensed")
      expect(isNotionSyncActive()).toBe(false)
    })
  })

  describe("computeCardHash", () => {
    it("should return consistent hash for same card content", async () => {
      const card: StyleCard = {
        id: "card-1",
        name: "Test Card",
        createdAt: 100,
        updatedAt: 100,
        promptSegments: [],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common",
        isFavorite: false,
        usageCount: 0,
        tags: [],
        frameId: "default",
        dominantColor: "#000000",
        genealogy: { generation: 1, parentIds: [] }
      }
      const hash1 = await computeCardHash(card)
      const hash2 = await computeCardHash(card)
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 hex is 64 chars
    })
  })

  describe("syncCardToNotion", () => {
    const card: StyleCard = {
      id: "card-1",
      name: "Test Card",
      createdAt: 100,
      updatedAt: 100,
      promptSegments: [],
      parameters: {},
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Common",
      isFavorite: false,
      usageCount: 0,
      tags: [],
      frameId: "default",
      dominantColor: "#000000",
      genealogy: { generation: 1, parentIds: [] }
    }

    const mockCredentials = {
      apiKey: "secret-key",
      databaseId: "db-id"
    }

    it("should do nothing if license is not active", async () => {
      localStorage.setItem("style-atelier-license-status", "unlicensed")
      const sendSpy = vi.spyOn(notionClient, "sendCardToNotion")

      await syncCardToNotion(card)
      expect(sendSpy).not.toHaveBeenCalled()
    })

    it("should do nothing if credentials are missing", async () => {
      localStorage.setItem("style-atelier-license-status", "valid")
      vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(null)
      const sendSpy = vi.spyOn(notionClient, "sendCardToNotion")

      await syncCardToNotion(card)
      expect(sendSpy).not.toHaveBeenCalled()
    })

    it("should send new card and save state if not synced yet", async () => {
      localStorage.setItem("style-atelier-license-status", "valid")
      vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(
        mockCredentials
      )
      const sendSpy = vi
        .spyOn(notionClient, "sendCardToNotion")
        .mockResolvedValue({ pageId: "notion-page-123" })

      await syncCardToNotion(card)

      expect(sendSpy).toHaveBeenCalledWith(card, mockCredentials)

      const syncState = await db.notionSyncStates.get(card.id)
      expect(syncState).toBeDefined()
      expect(syncState?.notionPageId).toBe("notion-page-123")
      expect(syncState?.lastSyncedHash).toBe(await computeCardHash(card))
    })

    it("should update card if already synced but content changed", async () => {
      localStorage.setItem("style-atelier-license-status", "valid")
      vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(
        mockCredentials
      )

      // Save initial sync state
      await db.notionSyncStates.put({
        cardId: card.id,
        notionPageId: "notion-page-123",
        lastSyncedAt: 50,
        lastSyncedHash: "old-hash"
      })

      const updateSpy = vi
        .spyOn(notionClient, "updateCardInNotion")
        .mockResolvedValue(undefined)

      await syncCardToNotion(card)

      expect(updateSpy).toHaveBeenCalledWith(
        "notion-page-123",
        card,
        mockCredentials
      )

      const syncState = await db.notionSyncStates.get(card.id)
      expect(syncState?.lastSyncedHash).toBe(await computeCardHash(card))
    })

    it("should skip syncing if card is already synced and hash matches", async () => {
      localStorage.setItem("style-atelier-license-status", "valid")
      vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(
        mockCredentials
      )

      const currentHash = await computeCardHash(card)
      await db.notionSyncStates.put({
        cardId: card.id,
        notionPageId: "notion-page-123",
        lastSyncedAt: 50,
        lastSyncedHash: currentHash
      })

      const sendSpy = vi.spyOn(notionClient, "sendCardToNotion")
      const updateSpy = vi.spyOn(notionClient, "updateCardInNotion")

      await syncCardToNotion(card)

      expect(sendSpy).not.toHaveBeenCalled()
      expect(updateSpy).not.toHaveBeenCalled()
    })

    it("should catch and log error on sync failure without throwing", async () => {
      localStorage.setItem("style-atelier-license-status", "valid")
      vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(
        mockCredentials
      )
      vi.spyOn(notionClient, "sendCardToNotion").mockRejectedValue(
        new Error("Network Error")
      )

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await expect(syncCardToNotion(card)).resolves.toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to sync card to Notion"),
        expect.any(Error)
      )
    })
  })
})
