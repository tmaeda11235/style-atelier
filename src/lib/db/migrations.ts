/* eslint-disable max-lines */
import Dexie from "dexie"

import {
  computeHash,
  deleteOpfsFile,
  listOpfsFiles,
  saveBase64ToOpfs
} from "../../shared/lib/db/migration-helpers"
import { createThumbnailDataUrl } from "../image-utils"

export function setupMigrations(db: Dexie) {
  setupVersions5To9(db)
  setupVersions10To13(db)
  setupVersions14OrHigher(db)
  setupVersions17OrHigher(db)
  setupVersions19OrHigher(db)
}
function setupVersions5To9(db: Dexie) {
  // Version 5: Previous version
  db.version(5).stores({
    styleCards: "id, name, createdAt, tier, isFavorite, isPinned, jobId",
    historyItems: "id, timestamp",
    userSettings: "userId"
  })

  // Version 6: Add category index to styleCards and categories table
  db.version(6)
    .stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt"
    })
    .upgrade(upgradeToVersion6)

  // Version 7: Add associatedJobIds multiEntry index to styleCards
  db.version(7).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt"
  })

  // Version 8: Migration to initialize associatedJobIds for existing cards
  db.version(8)
    .stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt"
    })
    .upgrade(upgradeToVersion8)

  // Version 9: Add isDeleted index to styleCards and categories, and support category updatedAt
  db.version(9).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt, isDeleted"
  })
}

function setupVersions10To13(db: Dexie) {
  // Version 10: Compress existing large thumbnailData and category iconUrls using browser-image-compression
  db.version(10)
    .stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt, isDeleted"
    })
    .upgrade(upgradeToVersion10)

  // Version 11: Add slotHistory table and migrate localStorage slot history to IndexedDB
  db.version(11)
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
  db.version(12).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt, isDeleted, parentId",
    slotHistory: "label"
  })

  // Version 13: Add parameterAliases and parameterFolders tables
  db.version(13).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt, isDeleted, parentId",
    slotHistory: "label",
    parameterAliases: "id, paramType, value, alias, folderId",
    parameterFolders: "id, name, parentId"
  })
}

function setupVersions14OrHigher(db: Dexie) {
  // Version 14: Add recipeHistory table
  db.version(14).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt, isDeleted, parentId",
    slotHistory: "label",
    parameterAliases: "id, paramType, value, alias, folderId",
    parameterFolders: "id, name, parentId",
    recipeHistory: "id, timestamp"
  })

  // Version 15: Migrate styleCard thumbnailData and category coverImageUrl to OPFS
  db.version(15)
    .stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt, isDeleted, parentId",
      slotHistory: "label",
      parameterAliases: "id, paramType, value, alias, folderId",
      parameterFolders: "id, name, parentId",
      recipeHistory: "id, timestamp"
    })
    .upgrade(upgradeToVersion15)
  // Version 16: Add imageSyncStates table for incremental Google Drive sync
  db.version(16)
    .stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt, isDeleted, parentId",
      slotHistory: "label",
      parameterAliases: "id, paramType, value, alias, folderId",
      parameterFolders: "id, name, parentId",
      recipeHistory: "id, timestamp",
      imageSyncStates: "filePath, cardId, categoryId, syncStatus"
    })
    .upgrade(upgradeToVersion16)
}

function setupVersions17OrHigher(db: Dexie) {
  // Version 17: Add notionSyncStates table for Notion sync metadata
  db.version(17).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt, isDeleted, parentId",
    slotHistory: "label",
    parameterAliases: "id, paramType, value, alias, folderId",
    parameterFolders: "id, name, parentId",
    recipeHistory: "id, timestamp",
    imageSyncStates: "filePath, cardId, categoryId, syncStatus",
    notionSyncStates: "cardId, notionPageId, lastSyncedAt"
  })

  // Version 18: Add notionSyncQueue table for throttling and resume-sync
  db.version(18).stores({
    styleCards:
      "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
    historyItems: "id, timestamp",
    userSettings: "userId",
    categories: "id, name, createdAt, isDeleted, parentId",
    slotHistory: "label",
    parameterAliases: "id, paramType, value, alias, folderId",
    parameterFolders: "id, name, parentId",
    recipeHistory: "id, timestamp",
    imageSyncStates: "filePath, cardId, categoryId, syncStatus",
    notionSyncStates: "cardId, notionPageId, lastSyncedAt",
    notionSyncQueue: "cardId, status"
  })
}

export function upgradeToVersion6(tx: any) {
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
    .catch((err: any) => {
      console.warn("Failed to seed default categories:", err)
    })
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

async function compressCardThumbnail(card: any, cardsTable: any) {
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

async function compressCategoryIcon(category: any, categoriesTable: any) {
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

export async function upgradeToVersion10(tx: any) {
  const cardsTable = tx.table("styleCards")
  const categoriesTable = tx.table("categories")

  const cards = await cardsTable.toArray()
  for (const card of cards) {
    await compressCardThumbnail(card, cardsTable)
  }

  const categories = await categoriesTable.toArray()
  for (const category of categories) {
    await compressCategoryIcon(category, categoriesTable)
  }
}

async function migrateSingleCard(
  card: any,
  cardsTable: any,
  writtenOpfsPaths: string[]
) {
  if (card.thumbnailData && !card.thumbnailPath) {
    const thumbnailPath = `images/cards/${card.id}.png`
    await Dexie.waitFor(saveBase64ToOpfs(thumbnailPath, card.thumbnailData))
    writtenOpfsPaths.push(thumbnailPath)
    card.thumbnailPath = thumbnailPath
    delete card.thumbnailData
    card.updatedAt = Date.now()
    await cardsTable.put(card)
  }
}

async function migrateSingleCategory(
  category: any,
  categoriesTable: any,
  writtenOpfsPaths: string[]
) {
  if (category.coverImageUrl && !category.coverImagePath) {
    const coverImagePath = `images/categories/${category.id}.png`
    await Dexie.waitFor(
      saveBase64ToOpfs(coverImagePath, category.coverImageUrl)
    )
    writtenOpfsPaths.push(coverImagePath)
    category.coverImagePath = coverImagePath
    delete category.coverImageUrl
    category.updatedAt = Date.now()
    await categoriesTable.put(category)
  }
}

export async function upgradeToVersion15(tx: any) {
  const cardsTable = tx.table("styleCards")
  const categoriesTable = tx.table("categories")

  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    console.warn(
      "OPFS is not supported in this environment. Skipping migration of thumbnails to OPFS."
    )
    return
  }

  const cards = await cardsTable.toArray()
  const categories = await categoriesTable.toArray()
  const writtenOpfsPaths: string[] = []

  try {
    for (const card of cards) {
      await migrateSingleCard(card, cardsTable, writtenOpfsPaths)
    }
    for (const category of categories) {
      await migrateSingleCategory(category, categoriesTable, writtenOpfsPaths)
    }
  } catch (err) {
    console.error(
      "Migration to version 14 failed, rolling back written OPFS files:",
      err
    )
    // Rollback: Delete all files written during this migration attempt
    for (const filePath of writtenOpfsPaths) {
      try {
        await Dexie.waitFor(deleteOpfsFile(filePath))
      } catch (cleanupErr) {
        console.warn(
          `Failed to delete OPFS file during rollback: ${filePath}`,
          cleanupErr
        )
      }
    }
    // Re-throw to abort Dexie transaction
    throw err
  }
}

async function populateImageSyncStates(syncStatesTable: any) {
  try {
    const root = await navigator.storage.getDirectory()
    let imagesDir: FileSystemDirectoryHandle
    try {
      imagesDir = await root.getDirectoryHandle("images", { create: false })
    } catch {
      // "images" directory doesn't exist, nothing to migrate
      return
    }

    const fileEntries = await listOpfsFiles(imagesDir, "images")
    const records = []

    for (const entry of fileEntries) {
      const file = await entry.handle.getFile()
      const buf = await file.arrayBuffer()
      const hash = await computeHash(buf)

      let cardId: string | undefined
      let categoryId: string | undefined

      // Detect if it is a card or category image
      // e.g. "images/cards/uuid.png"
      const parts = entry.filePath.split("/")
      if (parts.length >= 3) {
        const type = parts[1] // "cards" or "categories"
        const nameWithExt = parts[2]
        const id = nameWithExt.replace(/\.[^/.]+$/, "") // remove extension

        if (type === "cards") {
          cardId = id
        } else if (type === "categories") {
          categoryId = id
        }
      }

      records.push({
        filePath: entry.filePath,
        cardId,
        categoryId,
        hash,
        syncStatus: "pending" as const,
        updatedAt: file.lastModified || Date.now()
      })
    }

    if (records.length > 0) {
      await syncStatesTable.bulkAdd(records)
    }
  } catch (err) {
    console.warn("Failed to populate imageSyncStates during migration:", err)
  }
}

export async function upgradeToVersion16(tx: any) {
  const syncStatesTable = tx.table("imageSyncStates")

  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }

  await Dexie.waitFor(populateImageSyncStates(syncStatesTable))
}

function setupVersions19OrHigher(db: Dexie) {
  // Version 19: Add clipSettings to styleCards (no index changes, but version bump for new schema fields)
  db.version(19)
    .stores({
      styleCards:
        "id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted",
      historyItems: "id, timestamp",
      userSettings: "userId",
      categories: "id, name, createdAt, isDeleted, parentId",
      slotHistory: "label",
      parameterAliases: "id, paramType, value, alias, folderId",
      parameterFolders: "id, name, parentId",
      recipeHistory: "id, timestamp",
      imageSyncStates: "filePath, cardId, categoryId, syncStatus",
      notionSyncStates: "cardId, notionPageId, lastSyncedAt",
      notionSyncQueue: "cardId, status"
    })
    .upgrade(upgradeToVersion19)
}

export async function upgradeToVersion19(_tx: any) {
  // clipSettings is optional, so no data migration is strictly required.
  // We resolve the promise to complete the version upgrade.
  return Promise.resolve()
}
