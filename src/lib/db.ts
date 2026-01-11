import Dexie, { type Table } from 'dexie';

export interface StyleCard {
  id?: number;
  imageUrl: string;
  prompt: string;
  jobId?: string;
  source?: string;
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

  async addStyleCard(card: Omit<StyleCard, 'id' | 'createdAt'>) {
    return this.styleCards.add({
      ...card,
      createdAt: new Date()
    });
  }
}

export const db = new StyleAtelierDatabase();