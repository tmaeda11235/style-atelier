import Dexie, { type Table } from 'dexie';
import type { StyleCard, HistoryItem, UserSettings, CustomCategory } from './db-schema';

export class StyleAtelierDatabase extends Dexie {
  styleCards!: Table<StyleCard, string>;
  historyItems!: Table<HistoryItem, string>;
  userSettings!: Table<UserSettings, string>;
  categories!: Table<CustomCategory, string>;

  constructor() {
    super('StyleAtelierDatabase');
    
    // Previous version
    this.version(5).stores({
      styleCards: 'id, name, createdAt, tier, isFavorite, isPinned, jobId',
      historyItems: 'id, timestamp',
      userSettings: 'userId',
    });

    // Version 6: Add category index to styleCards and categories table
    this.version(6).stores({
      styleCards: 'id, name, createdAt, tier, isFavorite, isPinned, jobId, category',
      historyItems: 'id, timestamp',
      userSettings: 'userId',
      categories: 'id, name, createdAt',
    }).upgrade(tx => {
      const now = Date.now();
      return tx.table('categories').bulkAdd([
        { id: 'style', name: 'Style', iconEmoji: '🎨', createdAt: now },
        { id: 'character', name: 'Character', iconEmoji: '👤', createdAt: now },
        { id: 'landscape', name: 'Landscape', iconEmoji: '🌲', createdAt: now },
        { id: 'lighting', name: 'Lighting', iconEmoji: '💡', createdAt: now },
        { id: 'camera', name: 'Camera', iconEmoji: '📷', createdAt: now },
        { id: 'abstract', name: 'Abstract', iconEmoji: '🌀', createdAt: now },
        { id: 'other', name: 'Other', iconEmoji: '📁', createdAt: now },
      ]).catch(err => {
        console.warn("Failed to seed default categories:", err);
      });
    });

    // Version 7: Add associatedJobIds multiEntry index to styleCards
    this.version(7).stores({
      styleCards: 'id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds',
      historyItems: 'id, timestamp',
      userSettings: 'userId',
      categories: 'id, name, createdAt',
    });

    // Version 8: Migration to initialize associatedJobIds for existing cards
    this.version(8).stores({
      styleCards: 'id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds',
      historyItems: 'id, timestamp',
      userSettings: 'userId',
      categories: 'id, name, createdAt',
    }).upgrade(upgradeToVersion8);

    // Version 9: Add isDeleted index to styleCards and categories, and support category updatedAt
    this.version(9).stores({
      styleCards: 'id, name, createdAt, tier, isFavorite, isPinned, jobId, category, *associatedJobIds, isDeleted',
      historyItems: 'id, timestamp',
      userSettings: 'userId',
      categories: 'id, name, createdAt, isDeleted',
    });
  }

  // --- StyleCard Operations ---

  async getCard(id: string): Promise<StyleCard | undefined> {
    const card = await this.styleCards.get(id);
    if (card && card.isDeleted) return undefined;
    return card;
  }

  async getAllCards(): Promise<StyleCard[]> {
    return this.styleCards.filter(card => !card.isDeleted).toArray();
  }

  async getPinnedCards(): Promise<StyleCard[]> {
    return this.styleCards.filter(card => !card.isDeleted && !!card.isPinned).toArray();
  }

  async getCardByJobId(jobId: string): Promise<StyleCard | undefined> {
    let card = await this.styleCards.where("jobId").equals(jobId).first();
    if (!card) {
      card = await this.styleCards.where("associatedJobIds").equals(jobId).first();
    }
    if (card && card.isDeleted) return undefined;
    return card;
  }

  async addCard(card: StyleCard): Promise<string> {
    return this.styleCards.add(card);
  }

  async updateCard(id: string, changes: Partial<StyleCard>): Promise<number> {
    return this.styleCards.update(id, changes);
  }

  async putCard(card: StyleCard): Promise<string> {
    return this.styleCards.put(card);
  }

  async deleteCard(id: string): Promise<void> {
    await this.deleteStyleCardAndCleanup(id);
  }

  // --- Category Operations ---

  async getAllCategories(): Promise<CustomCategory[]> {
    return this.categories.filter(cat => !cat.isDeleted).toArray();
  }

  async getCategory(id: string): Promise<CustomCategory | undefined> {
    const cat = await this.categories.get(id);
    if (cat && cat.isDeleted) return undefined;
    return cat;
  }

  async addCategory(category: CustomCategory): Promise<string> {
    return this.categories.add({
      ...category,
      updatedAt: category.updatedAt || category.createdAt
    });
  }

  async updateCategory(id: string, changes: Partial<CustomCategory>): Promise<number> {
    return this.categories.update(id, {
      ...changes,
      updatedAt: Date.now()
    });
  }

  async deleteCategory(id: string): Promise<void> {
    return this.transaction("rw", [this.styleCards, this.categories], async () => {
      // 1. カテゴリーを論理削除し、更新日時を設定
      await this.categories.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      // 2. このカテゴリーを参照しているカードの参照を解除し、カードの更新日時も設定
      await this.styleCards.where("category").equals(id).modify(card => {
        delete card.category;
        card.updatedAt = Date.now();
      });
    });
  }

  async mergeStyleCards(
    representativeId: string,
    materials: StyleCard[],
    consumeStates: Record<string, boolean>
  ): Promise<void> {
    return this.transaction("rw", [this.styleCards, this.categories], async () => {
      const representative = await this.styleCards.get(representativeId);
      if (!representative) throw new Error("Representative card not found");

      const mergedImages = [...(representative.images || [])];
      if (representative.thumbnailData && !mergedImages.includes(representative.thumbnailData)) {
        mergedImages.push(representative.thumbnailData);
      }

      const mergedJobIds = [...(representative.associatedJobIds || [])];
      if (representative.jobId && !mergedJobIds.includes(representative.jobId)) {
        mergedJobIds.push(representative.jobId);
      }

      let extraUsageCount = 0;

      for (const mat of materials) {
        if (mat.images && mat.images.length > 0) {
          mat.images.forEach(img => {
            if (!mergedImages.includes(img)) mergedImages.push(img);
          });
        } else if (mat.thumbnailData && !mergedImages.includes(mat.thumbnailData)) {
          mergedImages.push(mat.thumbnailData);
        }

        if (mat.jobId && !mergedJobIds.includes(mat.jobId)) {
          mergedJobIds.push(mat.jobId);
        }
        if (mat.associatedJobIds && mat.associatedJobIds.length > 0) {
          mat.associatedJobIds.forEach(jid => {
            if (!mergedJobIds.includes(jid)) mergedJobIds.push(jid);
          });
        }

        const isConsumed = consumeStates[mat.id];
        if (isConsumed) {
          extraUsageCount += (mat.usageCount || 0);
          await this.deleteStyleCardAndCleanup(mat.id);
        }
      }

      await this.styleCards.update(representativeId, {
        images: mergedImages,
        associatedJobIds: mergedJobIds,
        usageCount: (representative.usageCount || 0) + extraUsageCount,
        updatedAt: Date.now()
      });
    });
  }

  async importBackupData(
    data: {
      styleCards: StyleCard[];
      categories: CustomCategory[];
      userSettings: UserSettings[];
      historyItems: HistoryItem[];
    },
    mode: 'merge' | 'replace' = 'replace'
  ): Promise<void> {
    return this.transaction("rw", [this.styleCards, this.categories, this.userSettings, this.historyItems], async () => {
      if (mode === 'replace') {
        await this.styleCards.clear();
        await this.categories.clear();
        await this.userSettings.clear();
        await this.historyItems.clear();

        if (data.styleCards && data.styleCards.length > 0) {
          await this.styleCards.bulkPut(data.styleCards);
        }
        if (data.categories && data.categories.length > 0) {
          await this.categories.bulkPut(data.categories);
        }
        if (data.userSettings && data.userSettings.length > 0) {
          await this.userSettings.bulkPut(data.userSettings);
        }
        if (data.historyItems && data.historyItems.length > 0) {
          await this.historyItems.bulkPut(data.historyItems);
        }
      } else {
        if (data.styleCards && data.styleCards.length > 0) {
          const localCards = await this.styleCards.toArray();
          const localCardMap = new Map(localCards.map(c => [c.id, c]));
          const toPut: StyleCard[] = [];

          for (const incoming of data.styleCards) {
            const local = localCardMap.get(incoming.id);
            if (!local) {
              toPut.push(incoming);
            } else {
              const incomingTime = incoming.updatedAt || incoming.createdAt || 0;
              const localTime = local.updatedAt || local.createdAt || 0;
              if (incomingTime >= localTime) {
                toPut.push(incoming);
              }
            }
          }
          if (toPut.length > 0) {
            await this.styleCards.bulkPut(toPut);
          }
        }

        if (data.categories && data.categories.length > 0) {
          const localCats = await this.categories.toArray();
          const localCatMap = new Map(localCats.map(c => [c.id, c]));
          const toPut: CustomCategory[] = [];

          for (const incoming of data.categories) {
            const local = localCatMap.get(incoming.id);
            if (!local) {
              toPut.push(incoming);
            } else {
              const incomingTime = incoming.updatedAt || incoming.createdAt || 0;
              const localTime = local.updatedAt || local.createdAt || 0;
              if (incomingTime >= localTime) {
                toPut.push(incoming);
              }
            }
          }
          if (toPut.length > 0) {
            await this.categories.bulkPut(toPut);
          }
        }

        if (data.userSettings && data.userSettings.length > 0) {
          await this.userSettings.bulkPut(data.userSettings);
        }

        if (data.historyItems && data.historyItems.length > 0) {
          const localHistory = await this.historyItems.toArray();
          const localHistoryMap = new Map(localHistory.map(h => [h.id, h]));
          const toPut: HistoryItem[] = [];

          for (const incoming of data.historyItems) {
            const local = localHistoryMap.get(incoming.id);
            if (!local) {
              toPut.push(incoming);
            } else {
              const incomingTime = incoming.timestamp || 0;
              const localTime = local.timestamp || 0;
              if (incomingTime >= localTime) {
                toPut.push(incoming);
              }
            }
          }
          if (toPut.length > 0) {
            await this.historyItems.bulkPut(toPut);
          }
        }
      }
    });
  }

  async deleteStyleCardAndCleanup(cardId: string) {
    return this.transaction("rw", [this.styleCards, this.categories], async () => {
      // 1. categories で iconCardId === cardId を持つものをクリーンアップ
      const affectedCategories = await this.categories
        .filter((cat) => cat.iconCardId === cardId)
        .toArray();
      for (const cat of affectedCategories) {
        await this.categories.update(cat.id, {
          iconCardId: undefined,
          iconUrl: undefined,
          updatedAt: Date.now()
        });
      }
      // 2. styleCards から物理削除せず論理削除し、重い画像情報をクリア
      const card = await this.styleCards.get(cardId);
      if (card) {
        await this.styleCards.update(cardId, {
          isDeleted: true,
          thumbnailData: "",
          images: [],
          selectedThumbnails: [],
          updatedAt: Date.now()
        });
      }
    });
  }
}

export const db = new StyleAtelierDatabase();

export function upgradeToVersion8(tx: any) {
  return tx.table('styleCards').toCollection().modify((card: any) => {
    if (!card.associatedJobIds) {
      card.associatedJobIds = card.jobId ? [card.jobId] : [];
    }
  });
}

export async function seedDefaultCategories(targetDb: StyleAtelierDatabase = db) {
  const now = Date.now();
  await targetDb.categories.bulkAdd([
    { id: 'style', name: 'Style', iconEmoji: '🎨', createdAt: now },
    { id: 'character', name: 'Character', iconEmoji: '👤', createdAt: now },
    { id: 'landscape', name: 'Landscape', iconEmoji: '🌲', createdAt: now },
    { id: 'lighting', name: 'Lighting', iconEmoji: '💡', createdAt: now },
    { id: 'camera', name: 'Camera', iconEmoji: '📷', createdAt: now },
    { id: 'abstract', name: 'Abstract', iconEmoji: '🌀', createdAt: now },
    { id: 'other', name: 'Other', iconEmoji: '📁', createdAt: now },
  ]);
}