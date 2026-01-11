import Dexie, { type Table } from 'dexie';

export interface StyleCard {
  id?: number;
  imageUrl: string;
  prompt: string;
  createdAt: Date;
}

export class StyleAtelierDatabase extends Dexie {
  styleCards!: Table<StyleCard>;

  constructor() {
    super('StyleAtelierDatabase');
    this.version(1).stores({
      styleCards: '++id, createdAt' // Primary key and indexed props
    });
  }
}

export const db = new StyleAtelierDatabase();