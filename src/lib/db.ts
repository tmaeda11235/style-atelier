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
    this.version(2).stores({
      styleCards: '++id, createdAt, jobId, imageUrl'
    });
  }

  async addStyleCard(card: Omit<StyleCard, 'id' | 'createdAt'>) {
    // Check for duplicates
    if (card.jobId) {
      const existing = await this.styleCards.where('jobId').equals(card.jobId).first();
      if (existing) {
        console.log(`Duplicate found by jobId: ${card.jobId}`);
        return existing.id;
      }
    } else if (card.imageUrl) {
      const existing = await this.styleCards.where('imageUrl').equals(card.imageUrl).first();
      if (existing) {
        console.log(`Duplicate found by imageUrl: ${card.imageUrl}`);
        return existing.id;
      }
    }

    return this.styleCards.add({
      ...card,
      createdAt: new Date()
    });
  }
}

export const db = new StyleAtelierDatabase();