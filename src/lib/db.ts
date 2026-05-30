import Dexie, { type Table } from 'dexie';
import type { StyleCard, HistoryItem, UserSettings } from './db-schema';

export class StyleAtelierDatabase extends Dexie {
  styleCards!: Table<StyleCard, string>;
  historyItems!: Table<HistoryItem, string>;
  userSettings!: Table<UserSettings, string>;

  constructor() {
    super('StyleAtelierDatabase');
    this.version(5).stores({
      styleCards: 'id, name, createdAt, tier, isFavorite, isPinned, jobId',
      historyItems: 'id, timestamp',
      userSettings: 'userId',
    });
  }

  // TODO: Implement new data access methods
}

export const db = new StyleAtelierDatabase();