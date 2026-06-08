import type { StyleAtelierDatabase } from "../db"
import type {
  CustomCategory,
  HistoryItem,
  StyleCard,
  UserSettings
} from "../db-schema"

export interface BackupData {
  styleCards: StyleCard[]
  categories: CustomCategory[]
  userSettings: UserSettings[]
  historyItems: HistoryItem[]
  slotHistory?: Record<string, string[]>
}

export async function importBackupData(
  db: StyleAtelierDatabase,
  data: BackupData,
  mode: "merge" | "replace" = "replace"
): Promise<void> {
  return db.transaction(
    "rw",
    [
      db.styleCards,
      db.categories,
      db.userSettings,
      db.historyItems,
      db.slotHistory
    ],
    async () => {
      if (mode === "replace") {
        await importBackupReplace(db, data)
      } else {
        await importBackupMerge(db, data)
      }
    }
  )
}

async function importBackupReplace(
  db: StyleAtelierDatabase,
  data: BackupData
): Promise<void> {
  await db.styleCards.clear()
  await db.categories.clear()
  await db.userSettings.clear()
  await db.historyItems.clear()
  await db.slotHistory.clear()

  if (data.styleCards && data.styleCards.length > 0) {
    await db.styleCards.bulkPut(data.styleCards)
  }
  if (data.categories && data.categories.length > 0) {
    await db.categories.bulkPut(data.categories)
  }
  if (data.userSettings && data.userSettings.length > 0) {
    await db.userSettings.bulkPut(data.userSettings)
  }
  if (data.historyItems && data.historyItems.length > 0) {
    await db.historyItems.bulkPut(data.historyItems)
  }
  if (data.slotHistory) {
    await importSlotHistoryReplace(db, data.slotHistory)
  }
}

async function importSlotHistoryReplace(
  db: StyleAtelierDatabase,
  slotHistory: Record<string, string[]>
): Promise<void> {
  const items = Object.entries(slotHistory).map(([label, values]) => ({
    label,
    values,
    updatedAt: Date.now()
  }))
  if (items.length > 0) {
    await db.slotHistory.bulkPut(items)
  }
}

async function importBackupMerge(
  db: StyleAtelierDatabase,
  data: BackupData
): Promise<void> {
  if (data.styleCards && data.styleCards.length > 0) {
    await mergeStyleCardsData(db, data.styleCards)
  }
  if (data.categories && data.categories.length > 0) {
    await mergeCategoriesData(db, data.categories)
  }
  if (data.userSettings && data.userSettings.length > 0) {
    await db.userSettings.bulkPut(data.userSettings)
  }
  if (data.historyItems && data.historyItems.length > 0) {
    await mergeHistoryItemsData(db, data.historyItems)
  }
  if (data.slotHistory) {
    await mergeSlotHistoryData(db, data.slotHistory)
  }
}

async function mergeStyleCardsData(
  db: StyleAtelierDatabase,
  incomingCards: StyleCard[]
): Promise<void> {
  const localCards = await db.styleCards.toArray()
  const localCardMap = new Map(localCards.map((c) => [c.id, c]))
  const toPut: StyleCard[] = []

  for (const incoming of incomingCards) {
    const local = localCardMap.get(incoming.id)
    if (!local) {
      toPut.push(incoming)
    } else {
      const incomingTime = incoming.updatedAt || incoming.createdAt || 0
      const localTime = local.updatedAt || local.createdAt || 0
      if (incomingTime >= localTime) {
        toPut.push(incoming)
      }
    }
  }
  if (toPut.length > 0) {
    await db.styleCards.bulkPut(toPut)
  }
}

async function mergeCategoriesData(
  db: StyleAtelierDatabase,
  incomingCategories: CustomCategory[]
): Promise<void> {
  const localCats = await db.categories.toArray()
  const localCatMap = new Map(localCats.map((c) => [c.id, c]))
  const toPut: CustomCategory[] = []

  for (const incoming of incomingCategories) {
    const local = localCatMap.get(incoming.id)
    if (!local) {
      toPut.push(incoming)
    } else {
      const incomingTime = incoming.updatedAt || incoming.createdAt || 0
      const localTime = local.updatedAt || local.createdAt || 0
      if (incomingTime >= localTime) {
        toPut.push(incoming)
      }
    }
  }
  if (toPut.length > 0) {
    await db.categories.bulkPut(toPut)
  }
}

async function mergeHistoryItemsData(
  db: StyleAtelierDatabase,
  incomingHistory: HistoryItem[]
): Promise<void> {
  const localHistory = await db.historyItems.toArray()
  const localHistoryMap = new Map(localHistory.map((h) => [h.id, h]))
  const toPut: HistoryItem[] = []

  for (const incoming of incomingHistory) {
    const local = localHistoryMap.get(incoming.id)
    if (!local) {
      toPut.push(incoming)
    } else {
      const incomingTime = incoming.timestamp || 0
      const localTime = local.timestamp || 0
      if (incomingTime >= localTime) {
        toPut.push(incoming)
      }
    }
  }
  if (toPut.length > 0) {
    await db.historyItems.bulkPut(toPut)
  }
}

async function mergeSlotHistoryData(
  db: StyleAtelierDatabase,
  incomingSlotHistory: Record<string, string[]>
): Promise<void> {
  for (const [label, incomingValues] of Object.entries(incomingSlotHistory)) {
    if (Array.isArray(incomingValues)) {
      const local = await db.slotHistory.get(label)
      const localValues = local ? local.values : []
      const merged = Array.from(
        new Set([...incomingValues, ...localValues])
      ).slice(0, 10)
      await db.slotHistory.put({
        label,
        values: merged,
        updatedAt: Date.now()
      })
    }
  }
}
