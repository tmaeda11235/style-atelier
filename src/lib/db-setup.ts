import Dexie, { type Table } from "dexie"

import type {
  CustomCategory,
  HistoryItem,
  SlotHistoryItem,
  StyleCard,
  UserSettings
} from "./db-schema"
import { createThumbnailDataUrl } from "./image-utils"

export class StyleAtelierDatabaseBase extends Dexie {
  styleCards!: Table<StyleCard, string>
  historyItems!: Table<HistoryItem, string>
  userSettings!: Table<UserSettings, string>
  categories!: Table<CustomCategory, string>
  slotHistory!: Table<SlotHistoryItem, string>

  constructor() {
    super("StyleAtelierDatabase")

    // Previous version
    this.version(5).stores({
      styleCards: "id, name, createdAt, tier, isFavorite, isPinned, jobId",
      historyItems: "id, timestamp",
      userSettings: "userId"
    })

    // Version 6: Add category index to styleCards and categories table
    this.version(6)
      .stores({
        styleCards:
          "id, name, createdAt, tier, isFavorite, isPinned, jobId, category",
        historyItems: "id, timestamp",
        userSettings: "userId",
        categories: "id, name, createdAt"
      })
      .upgrade((tx) => {
        const now = Date.now()
        return tx
          .table("categories")
          .bulkAdd([
            { id: "style", name: "Style", iconEmoji: "🎨", createdAt: now },
            {
              id: "character",
              name: "Character",
              iconEmoji: "👤",
              createdAt: now
            },
            {
              id: "landscape",
              name: "Landscape",
              iconEmoji: "🌲",
              createdAt: now
            },
            {
              id: "lighting",
              name: "Lighting",
              iconEmoji: "💡",
              createdAt: now
            },
            { id: "camera", name: "Camera", iconEmoji: "📷", createdAt: now },
            {
              id: "abstract",
              name: "Abstract",
              iconEmoji: "🌀",
              createdAt: now
            },
            { id: "other", name: "Other", iconEmoji: "📁", createdAt: now }
          ])
          .catch((err) => {
            console.warn("Failed to seed default categories:", err)
          })
      })

    // Version 7: Add associatedJobIds multiEntry index to styleCards
    this.version(7).stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt"
    })

    // Version 8: Migration to initialize associatedJobIds for existing cards
    this.version(8)
      .stores({
        styleCards:
          "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds",
        historyItems: "id, timestamp",
        userSettings: "userId",
        categories: "id, name, createdAt"
      })
      .upgrade(upgradeToVersion8)

    // Version 9: Add isDeleted index to styleCards and categories, and support category updatedAt
    this.version(9).stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt, isDeleted"
    })

    // Version 10: Compress existing large thumbnailData and category iconUrls using browser-image-compression
    this.version(10)
      .stores({
        styleCards:
          "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
        historyItems: "id, timestamp",
        userSettings: "userId",
        categories: "id, name, createdAt, isDeleted"
      })
      .upgrade(upgradeToVersion10)

    // Version 11: Add slotHistory table and migrate localStorage slot history to IndexedDB
    this.version(11)
      .stores({
        styleCards:
          "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
        historyItems: "id, timestamp",
        userSettings: "userId",
        categories: "id, name, createdAt, isDeleted",
        slotHistory: "label"
      })
      .upgrade(upgradeToVersion11)

    // Version 12: Add parentId index to categories for folder hierarchy support
    this.version(12).stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt, isDeleted, parentId",
      slotHistory: "label"
    })
  }
}

export function upgradeToVersion11(tx: any) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = window.localStorage.getItem("style_atelier_slot_history")
      if (stored) {
        const parsed = JSON.parse(stored)
        const items = Object.entries(parsed).map(([label, values]) => ({
          label,
          values: Array.isArray(values) ? values : [],
          updatedAt: Date.now()
        }))
        if (items.length > 0) {
          return tx
            .table("slotHistory")
            .bulkAdd(items)
            .catch((err: any) => {
              console.warn(
                "Failed to migrate slot history during version 11 upgrade:",
                err
              )
            })
        }
      }
    } catch (e) {
      console.warn(
        "Failed to parse localStorage slot history during upgrade:",
        e
      )
    }
  }
}

export function upgradeToVersion8(tx: any) {
  return tx
    .table("styleCards")
    .toCollection()
    .modify((card: any) => {
      if (!card.associatedJobIds) {
        card.associatedJobIds = card.jobId ? [card.jobId] : []
      }
    })
}

export async function upgradeToVersion10(tx: any) {
  const cardsTable = tx.table("styleCards")
  const categoriesTable = tx.table("categories")

  const cards = await cardsTable.toArray()
  for (const card of cards) {
    if (card.thumbnailData && card.thumbnailData.startsWith("data:image/")) {
      try {
        const compressed = await createThumbnailDataUrl(card.thumbnailData)
        if (compressed && compressed !== card.thumbnailData) {
          card.thumbnailData = compressed
          card.updatedAt = Date.now()
          await cardsTable.put(card)
        }
      } catch (err) {
        console.warn(
          `Failed to compress card thumbnail in migration for card ${card.id}:`,
          err
        )
      }
    }
  }

  const categories = await categoriesTable.toArray()
  for (const category of categories) {
    if (category.iconUrl && category.iconUrl.startsWith("data:image/")) {
      try {
        const compressed = await createThumbnailDataUrl(category.iconUrl)
        if (compressed && compressed !== category.iconUrl) {
          category.iconUrl = compressed
          category.updatedAt = Date.now()
          await categoriesTable.put(category)
        }
      } catch (err) {
        console.warn(
          `Failed to compress category icon in migration for category ${category.id}:`,
          err
        )
      }
    }
  }
}
