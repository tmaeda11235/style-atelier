import type {
  CustomCategory,
  HistoryItem,
  StyleCard,
  UserSettings
} from "./db-schema"
import { StyleAtelierDatabaseBase } from "./db-setup"
import { importBackupData } from "./db/import-ops"
import {
  deleteCategory,
  deleteStyleCardAndCleanup,
  mergeStyleCards
} from "./db/merge-ops"

export { upgradeToVersion8, upgradeToVersion10 } from "./db-setup"

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
    return this.styleCards.add(card)
  }

  async updateCard(id: string, changes: Partial<StyleCard>): Promise<number> {
    return this.styleCards.update(id, changes)
  }

  async putCard(card: StyleCard): Promise<string> {
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
}

export const db = new StyleAtelierDatabase()

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
