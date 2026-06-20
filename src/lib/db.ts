/* eslint-disable max-lines */
import type {
  CustomCategory,
  HistoryItem,
  ParameterAlias,
  ParameterFolder,
  RecipeHistoryItem,
  StyleCard,
  UserSettings
} from "../shared/lib/db-schema"
import { StyleAtelierDatabaseBase } from "./db-setup"
import {
  addParameterFolder,
  deleteParameterFolder,
  generateUUID,
  saveParameterAlias
} from "./db/alias-ops"
import { importBackupData } from "./db/import-ops"
import {
  deleteCategory,
  deleteStyleCardAndCleanup,
  mergeStyleCards
} from "./db/merge-ops"
import { processCardChangesOpfs, processCardOpfs } from "./db/opfs-helpers"

export {
  upgradeToVersion8,
  upgradeToVersion10,
  upgradeToVersion20
} from "./db-setup"

export class StyleAtelierDatabase extends StyleAtelierDatabaseBase {
  // --- StyleCard Operations ---

  async getCard(id: string): Promise<StyleCard | undefined> {
    const card = await this.styleCards.get(id)
    if (card && card.isDeleted) return undefined
    return card
  }

  getAllCards(): Promise<StyleCard[]> {
    return this.styleCards.filter((card) => !card.isDeleted).toArray()
  }

  getPinnedCards(): Promise<StyleCard[]> {
    return this.styleCards
      .filter((card) => !card.isDeleted && !!card.isPinned)
      .toArray()
  }

  async getCardByJobId(jobId: string): Promise<StyleCard | undefined> {
    let card = await this.styleCards.where("jobId").equals(jobId).first()
    if (!card) {
      card = await this.styleCards
        .where("associatedJobIds")
        .equals(jobId)
        .first()
    }
    if (card && card.isDeleted) return undefined
    return card
  }

  async addCard(card: StyleCard): Promise<string> {
    await processCardOpfs(card)
    return this.styleCards.add(card)
  }

  async updateCard(id: string, changes: Partial<StyleCard>): Promise<number> {
    await processCardChangesOpfs(id, changes)
    return this.styleCards.update(id, changes)
  }

  async putCard(card: StyleCard): Promise<string> {
    await processCardOpfs(card)
    return this.styleCards.put(card)
  }

  async deleteCard(id: string): Promise<void> {
    await this.deleteStyleCardAndCleanup(id)
  }

  // --- Category Operations ---

  getAllCategories(): Promise<CustomCategory[]> {
    return this.categories.filter((cat) => !cat.isDeleted).toArray()
  }

  async getCategory(id: string): Promise<CustomCategory | undefined> {
    const cat = await this.categories.get(id)
    if (cat && cat.isDeleted) return undefined
    return cat
  }

  async addCategory(category: CustomCategory): Promise<string> {
    return this.categories.add({
      ...category,
      updatedAt: category.updatedAt || category.createdAt
    })
  }

  async updateCategory(
    id: string,
    changes: Partial<CustomCategory>
  ): Promise<number> {
    return this.categories.update(id, {
      ...changes,
      updatedAt: Date.now()
    })
  }

  async deleteCategory(id: string): Promise<void> {
    return deleteCategory(this, id)
  }

  // --- SlotHistory Operations ---

  async getSlotHistory(label: string): Promise<string[]> {
    const item = await this.slotHistory.get(label)
    return item ? item.values : []
  }

  async saveSlotHistory(label: string, values: string[]): Promise<void> {
    await this.slotHistory.put({
      label,
      values,
      updatedAt: Date.now()
    })
  }

  async getAllSlotHistory(): Promise<Record<string, string[]>> {
    const items = await this.slotHistory.toArray()
    const history: Record<string, string[]> = {}
    for (const item of items) {
      history[item.label] = item.values
    }
    return history
  }

  async mergeStyleCards(
    representativeId: string,
    materials: StyleCard[],
    consumeStates: Record<string, boolean>
  ): Promise<void> {
    return mergeStyleCards(this, representativeId, materials, consumeStates)
  }

  async importBackupData(
    data: {
      styleCards: StyleCard[]
      categories: CustomCategory[]
      userSettings: UserSettings[]
      historyItems: HistoryItem[]
      slotHistory?: Record<string, string[]>
    },
    mode: "merge" | "replace" = "replace"
  ): Promise<void> {
    return importBackupData(this, data, mode)
  }

  async deleteStyleCardAndCleanup(cardId: string): Promise<void> {
    return deleteStyleCardAndCleanup(this, cardId)
  }

  // --- ParameterAlias Operations ---

  async getParameterAlias(id: string): Promise<ParameterAlias | undefined> {
    return this.parameterAliases.get(id)
  }

  async getAliasByValue(
    paramType: string,
    value: string
  ): Promise<ParameterAlias | undefined> {
    return this.parameterAliases
      .where("paramType")
      .equals(paramType)
      .filter((alias) => alias.value === value)
      .first()
  }

  getAllParameterAliases(): Promise<ParameterAlias[]> {
    return this.parameterAliases.toArray()
  }

  async saveParameterAlias(
    alias: Omit<ParameterAlias, "id" | "createdAt" | "updatedAt"> & {
      id?: string
    }
  ): Promise<string> {
    return saveParameterAlias(this, alias)
  }

  async deleteParameterAlias(id: string): Promise<void> {
    await this.parameterAliases.delete(id)
  }

  // --- ParameterFolder Operations ---

  getAllParameterFolders(): Promise<ParameterFolder[]> {
    return this.parameterFolders.toArray()
  }

  async addParameterFolder(
    folder: Omit<ParameterFolder, "id" | "createdAt"> & { id?: string }
  ): Promise<string> {
    return addParameterFolder(this, folder)
  }

  async updateParameterFolder(
    id: string,
    name: string,
    parentId?: string
  ): Promise<number> {
    return this.parameterFolders.update(id, { name, parentId })
  }

  async deleteParameterFolder(id: string): Promise<void> {
    return deleteParameterFolder(this, id)
  }

  // --- RecipeHistory Operations ---

  async getRecipeHistory(): Promise<RecipeHistoryItem[]> {
    return this.recipeHistory.orderBy("timestamp").reverse().toArray()
  }

  async addRecipeHistory(
    recipe: Omit<RecipeHistoryItem, "id" | "timestamp"> & {
      id?: string
      timestamp?: number
    }
  ): Promise<string> {
    const id = recipe.id || generateUUID()
    const timestamp = recipe.timestamp || Date.now()

    // Enforce max 50 items
    const count = await this.recipeHistory.count()
    if (count >= 50) {
      const oldest = await this.recipeHistory.orderBy("timestamp").first()
      if (oldest) {
        await this.recipeHistory.delete(oldest.id)
      }
    }

    await this.recipeHistory.add({
      ...recipe,
      id,
      timestamp
    } as RecipeHistoryItem)
    return id
  }

  async deleteRecipeHistory(id: string): Promise<void> {
    await this.recipeHistory.delete(id)
  }

  // --- UserSettings Operations ---

  async getUserSettings(): Promise<UserSettings> {
    const all = await this.userSettings.toArray()
    if (all.length > 0) {
      return all[0]
    }
    const defaultSettings: UserSettings = {
      userId: "default-user",
      isPro: false,
      unlockedSkins: [],
      branding: {
        enabled: false,
        socialDisplayType: "none"
      }
    }
    await this.userSettings.add(defaultSettings)
    return defaultSettings
  }

  async updateUserSettings(changes: Partial<UserSettings>): Promise<void> {
    const current = await this.getUserSettings()
    await this.userSettings.put({
      ...current,
      ...changes,
      branding: {
        ...current.branding,
        ...changes.branding
      }
    })
  }
}

export const db = new StyleAtelierDatabase()

let dbError: Error | null = null
const dbErrorListeners = new Set<(err: Error) => void>()

export function addDbErrorListener(listener: (err: Error) => void) {
  dbErrorListeners.add(listener)
  if (dbError) {
    listener(dbError)
  }
  return () => {
    dbErrorListeners.delete(listener)
  }
}

export function getDbError(): Error | null {
  return dbError
}

export function setMockDbError(err: Error): void {
  dbError = err
  dbErrorListeners.forEach((listener) => listener(dbError!))
}

export function clearDbErrorForTest(): void {
  dbError = null
}

if (typeof window !== "undefined") {
  ;(window as any).__triggerDbErrorForTest = (message: string) => {
    dbError = new Error(message)
    dbErrorListeners.forEach((listener) => listener(dbError!))
  }
  ;(window as any).__clearDbErrorForTest = () => {
    dbError = null
    dbErrorListeners.forEach((listener) => listener(null as any))
  }
}

// 明示的なオープン処理とエラーキャッチ
db.open().catch((err) => {
  console.error("Failed to open IndexedDB:", err)
  dbError = err instanceof Error ? err : new Error(String(err))
  dbErrorListeners.forEach((listener) => listener(dbError!))
})

async function setupNotionSync() {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
    return
  }
  try {
    const { notionSyncQueueManager } = await import("./notion/queue")
    const { getNotionCredentials } = await import("./notion/client")

    db.styleCards.hook("creating", function (primKey, obj, transaction) {
      transaction.on("complete", () => {
        getNotionCredentials().then((creds) => {
          if (creds && !obj.isDeleted) {
            notionSyncQueueManager.enqueue(obj.id)
          }
        })
      })
    })

    db.styleCards.hook("updating", function (mods, primKey, obj, transaction) {
      transaction.on("complete", () => {
        getNotionCredentials().then((creds) => {
          if (creds) {
            db.getCard(primKey).then((updatedCard) => {
              if (updatedCard && !updatedCard.isDeleted) {
                notionSyncQueueManager.enqueue(primKey)
              }
            })
          }
        })
      })
    })
  } catch (error) {
    console.error("Failed to setup Notion sync hooks:", error)
  }
}

async function runReadyHook() {
  try {
    const { purgeDeletedRecords, cleanupOrphanedImages } =
      await import("./db/purge-ops")
    const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days
    await purgeDeletedRecords(db, thresholdMs)
    await cleanupOrphanedImages(db)
  } catch (error) {
    console.error(
      "Failed to purge deleted records or run GC on ready hook:",
      error
    )
  }

  // Notion Sync Queue resume
  try {
    const { notionSyncQueueManager } = await import("./notion/queue")
    await notionSyncQueueManager.resume()
  } catch (error) {
    console.error("Failed to resume Notion sync queue:", error)
  }

  // Hook StyleCard creation and updates to enqueue to Notion sync
  await setupNotionSync()
}

// Register startup hook for purging deleted records older than 60 days
db.on("ready", () => {
  // Run asynchronously without blocking the database open operation (avoids deadlock in tests)
  setTimeout(runReadyHook, 0)
})

export async function seedDefaultCategories(
  targetDb: StyleAtelierDatabase = db
) {
  const now = Date.now()
  await targetDb.categories.bulkAdd([
    { id: "style", name: "Style", iconEmoji: "🎨", createdAt: now },
    { id: "character", name: "Character", iconEmoji: "👤", createdAt: now },
    { id: "landscape", name: "Landscape", iconEmoji: "🌲", createdAt: now },
    { id: "lighting", name: "Lighting", iconEmoji: "💡", createdAt: now },
    { id: "camera", name: "Camera", iconEmoji: "📷", createdAt: now },
    { id: "abstract", name: "Abstract", iconEmoji: "🌀", createdAt: now },
    { id: "other", name: "Other", iconEmoji: "📁", createdAt: now }
  ])
}
