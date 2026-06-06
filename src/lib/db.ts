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
        });
      }
      // 2. styleCards から削除
      await this.styleCards.delete(cardId);
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