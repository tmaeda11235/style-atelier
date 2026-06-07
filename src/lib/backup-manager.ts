import { validateBackupPayload } from "./backup-validator"
import { db } from "./db"

export interface BackupPayload {
  version: number
  exportedAt: number
  data: {
    styleCards: any[]
    categories: any[]
    userSettings: any[]
    historyItems: any[]
    slotHistory?: Record<string, string[]>
  }
}

/**
 * Serialize Dexie database tables to a JSON string
 */
export async function exportDatabase(): Promise<string> {
  const cards = await db.getAllCards()
  const categories = await db.getAllCategories()
  const settings = await db.userSettings.toArray()
  const history = await db.historyItems.toArray()

  // Exclude local image blobs in history items to keep backup lightweight
  const historyWithoutBlobs = history.map((item) => {
    const { localImageBlob, ...rest } = item
    return rest
  })

  let slotHistory: Record<string, string[]> | undefined = undefined
  try {
    const stored = localStorage.getItem("style_atelier_slot_history")
    if (stored) {
      slotHistory = JSON.parse(stored)
    }
  } catch (e) {
    console.error("Failed to read slot history for backup:", e)
  }

  const payload: BackupPayload = {
    version: 1,
    exportedAt: Date.now(),
    data: {
      styleCards: cards,
      categories,
      userSettings: settings,
      historyItems: historyWithoutBlobs,
      slotHistory
    }
  }

  return JSON.stringify(payload)
}

function importSlotHistory(
  slotHistory: Record<string, string[]>,
  mode: "merge" | "replace"
): void {
  try {
    if (mode === "replace") {
      localStorage.setItem(
        "style_atelier_slot_history",
        JSON.stringify(slotHistory)
      )
      return
    }

    const stored = localStorage.getItem("style_atelier_slot_history")
    const existingHistory: Record<string, string[]> = stored
      ? JSON.parse(stored)
      : {}

    const mergedHistory: Record<string, string[]> = { ...existingHistory }

    for (const [key, incomingValues] of Object.entries(slotHistory)) {
      if (Array.isArray(incomingValues)) {
        const localValues = mergedHistory[key] || []
        const merged = Array.from(
          new Set([...incomingValues, ...localValues])
        ).slice(0, 10)
        mergedHistory[key] = merged
      }
    }

    localStorage.setItem(
      "style_atelier_slot_history",
      JSON.stringify(mergedHistory)
    )
  } catch (e) {
    console.error("Failed to restore/merge slot history:", e)
  }
}

/**
 * Clear existing IndexedDB tables and populate with imported JSON data
 */
export async function importDatabase(
  jsonData: string,
  mode: "merge" | "replace" = "replace"
): Promise<void> {
  let payload: any
  try {
    payload = JSON.parse(jsonData)
  } catch (e) {
    throw new Error("Invalid JSON format. Failed to parse backup file.")
  }

  const validation = validateBackupPayload(payload)
  if (!validation.isValid) {
    throw new Error(`Database validation failed: ${validation.error}`)
  }

  await db.importBackupData(payload.data, mode)

  if (payload.data.slotHistory) {
    importSlotHistory(payload.data.slotHistory, mode)
  }
}
