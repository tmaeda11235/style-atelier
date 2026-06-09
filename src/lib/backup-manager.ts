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
  const cards = await db.styleCards.toArray()
  const categories = await db.categories.toArray()
  const settings = await db.userSettings.toArray()
  const history = await db.historyItems.toArray()

  // Exclude local image blobs in history items to keep backup lightweight
  const historyWithoutBlobs = history.map((item) => {
    const { localImageBlob: _, ...rest } = item
    return rest
  })

  let slotHistory: Record<string, string[]> | undefined = undefined
  try {
    slotHistory = await db.getAllSlotHistory()
  } catch (_e) {
    console.error("Failed to read slot history for backup:", _e)
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
  } catch {
    throw new Error("Invalid JSON format. Failed to parse backup file.")
  }

  const validation = validateBackupPayload(payload)
  if (!validation.isValid) {
    throw new Error(`Database validation failed: ${validation.error}`)
  }

  await db.importBackupData(payload.data, mode)
}
