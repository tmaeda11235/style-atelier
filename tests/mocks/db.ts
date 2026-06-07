/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { vi } from "vitest"

import type {
  CustomCategory,
  HistoryItem,
  StyleCard,
  UserSettings
} from "../../src/lib/db-schema"

class MockTable<T extends { id: string } | any, Key = string> {
  private items: Map<any, T> = new Map()
  hooks: Record<string, any> = {}

  constructor(initialItems: T[] = []) {
    initialItems.forEach((item) => {
      const key = item.id || item.userId || item.timestamp
      this.items.set(key, item)
    })
  }

  __setItems(newItems: T[]) {
    this.items.clear()
    newItems.forEach((item) => {
      const key = item.id || item.userId || item.timestamp
      this.items.set(key, item)
    })
  }

  __getItems(): T[] {
    return Array.from(this.items.values())
  }

  get = vi.fn().mockImplementation(async (key: any) => {
    return this.items.get(key)
  })

  toArray = vi.fn().mockImplementation(async () => {
    return Array.from(this.items.values())
  })

  add = vi.fn().mockImplementation(async (item: T) => {
    const key =
      item.id || item.userId || item.timestamp || Math.random().toString()
    const newItem = { ...item }
    if (!newItem.id && typeof newItem === "object") {
      ;(newItem as any).id = key
    }
    this.items.set(key, newItem)
    return key
  })

  put = vi.fn().mockImplementation(async (item: T) => {
    const key =
      item.id || item.userId || item.timestamp || Math.random().toString()
    const newItem = { ...item }
    if (!newItem.id && typeof newItem === "object") {
      ;(newItem as any).id = key
    }
    this.items.set(key, newItem)
    return key
  })

  update = vi.fn().mockImplementation(async (key: any, changes: Partial<T>) => {
    const item = this.items.get(key)
    if (!item) return 0
    const updated = { ...item, ...changes }
    this.items.set(key, updated)
    return 1
  })

  delete = vi.fn().mockImplementation(async (key: any) => {
    this.items.delete(key)
  })

  clear = vi.fn().mockImplementation(async () => {
    this.items.clear()
  })

  bulkPut = vi.fn().mockImplementation(async (items: T[]) => {
    items.forEach((item) => {
      const key = item.id || item.userId || item.timestamp
      this.items.set(key, item)
    })
  })

  bulkAdd = vi.fn().mockImplementation(async (items: T[]) => {
    items.forEach((item) => {
      const key = item.id || item.userId || item.timestamp
      this.items.set(key, item)
    })
  })

  filter = vi.fn().mockImplementation((fn: (item: T) => boolean) => {
    const filtered = Array.from(this.items.values()).filter(fn)
    return {
      toArray: async () => filtered
    }
  })

  where = vi.fn().mockImplementation((indexName: string) => {
    return {
      equals: (val: any) => {
        const matched = Array.from(this.items.values()).filter(
          (item: any) => item[indexName] === val
        )
        return {
          first: async () => matched[0] || undefined,
          toArray: async () => matched,
          modify: async (modifyFn: (item: any) => void) => {
            matched.forEach((item) => {
              modifyFn(item)
              const key = item.id || item.userId || item.timestamp
              this.items.set(key, item)
            })
          }
        }
      }
    }
  })

  hook = vi.fn().mockImplementation((name: string, callback: any) => {
    this.hooks[name] = callback
  })
}

export class MockStyleAtelierDatabase {
  styleCards = new MockTable<StyleCard>()
  categories = new MockTable<CustomCategory>()
  historyItems = new MockTable<HistoryItem>()
  userSettings = new MockTable<UserSettings>()
  slotHistory = new MockTable<any>()

  constructor() {
    this.reset()
  }

  reset() {
    this.styleCards = new MockTable<StyleCard>([])
    this.categories = new MockTable<CustomCategory>([
      { id: "style", name: "Style", iconEmoji: "🎨", createdAt: Date.now() },
      {
        id: "character",
        name: "Character",
        iconEmoji: "👤",
        createdAt: Date.now()
      },
      {
        id: "landscape",
        name: "Landscape",
        iconEmoji: "🌲",
        createdAt: Date.now()
      },
      {
        id: "lighting",
        name: "Lighting",
        iconEmoji: "💡",
        createdAt: Date.now()
      },
      { id: "camera", name: "Camera", iconEmoji: "📷", createdAt: Date.now() },
      {
        id: "abstract",
        name: "Abstract",
        iconEmoji: "🌀",
        createdAt: Date.now()
      },
      { id: "other", name: "Other", iconEmoji: "📁", createdAt: Date.now() }
    ])
    this.historyItems = new MockTable<HistoryItem>([])
    this.userSettings = new MockTable<UserSettings>([])
    this.slotHistory = new MockTable<any>([])
  }

  // StyleCard Operations
  getCard = vi.fn().mockImplementation(async (id: string) => {
    const card = await this.styleCards.get(id)
    if (card && card.isDeleted) return undefined
    return card
  })

  getAllCards = vi.fn().mockImplementation(async () => {
    return (await this.styleCards.toArray()).filter((card) => !card.isDeleted)
  })

  getPinnedCards = vi.fn().mockImplementation(async () => {
    return (await this.styleCards.toArray()).filter(
      (card) => !card.isDeleted && !!card.isPinned
    )
  })

  getCardByJobId = vi.fn().mockImplementation(async (jobId: string) => {
    const cards = await this.styleCards.toArray()
    const card = cards.find(
      (c) => c.jobId === jobId || c.associatedJobIds?.includes(jobId)
    )
    if (card && card.isDeleted) return undefined
    return card
  })

  addCard = vi.fn().mockImplementation(async (card: StyleCard) => {
    return this.styleCards.add(card)
  })

  updateCard = vi
    .fn()
    .mockImplementation(async (id: string, changes: Partial<StyleCard>) => {
      return this.styleCards.update(id, changes)
    })

  putCard = vi.fn().mockImplementation(async (card: StyleCard) => {
    return this.styleCards.put(card)
  })

  deleteCard = vi.fn().mockImplementation(async (id: string) => {
    await this.deleteStyleCardAndCleanup(id)
  })

  // Category Operations
  getAllCategories = vi.fn().mockImplementation(async () => {
    return (await this.categories.toArray()).filter((cat) => !cat.isDeleted)
  })

  getCategory = vi.fn().mockImplementation(async (id: string) => {
    const cat = await this.categories.get(id)
    if (cat && cat.isDeleted) return undefined
    return cat
  })

  addCategory = vi.fn().mockImplementation(async (category: CustomCategory) => {
    return this.categories.add({
      ...category,
      updatedAt: category.updatedAt || category.createdAt
    })
  })

  updateCategory = vi
    .fn()
    .mockImplementation(
      async (id: string, changes: Partial<CustomCategory>) => {
        return this.categories.update(id, {
          ...changes,
          updatedAt: Date.now()
        })
      }
    )

  deleteCategory = vi.fn().mockImplementation(async (id: string) => {
    await this.categories.update(id, { isDeleted: true, updatedAt: Date.now() })
    const cards = await this.styleCards.toArray()
    for (const card of cards) {
      if (card.category === id) {
        await this.styleCards.update(card.id, {
          category: undefined,
          updatedAt: Date.now()
        })
      }
    }
  })

  mergeStyleCards = vi
    .fn()
    .mockImplementation(
      async (
        representativeId: string,
        materials: StyleCard[],
        consumeStates: Record<string, boolean>
      ) => {
        const rep = await this.styleCards.get(representativeId)
        if (!rep) throw new Error("Representative card not found")

        const mergedImages = [...(rep.images || [])]
        if (rep.thumbnailData && !mergedImages.includes(rep.thumbnailData)) {
          mergedImages.push(rep.thumbnailData)
        }

        const mergedJobIds = [...(rep.associatedJobIds || [])]
        if (rep.jobId && !mergedJobIds.includes(rep.jobId)) {
          mergedJobIds.push(rep.jobId)
        }

        let extraUsageCount = 0

        for (const mat of materials) {
          if (mat.images && mat.images.length > 0) {
            mat.images.forEach((img) => {
              if (!mergedImages.includes(img)) mergedImages.push(img)
            })
          } else if (
            mat.thumbnailData &&
            !mergedImages.includes(mat.thumbnailData)
          ) {
            mergedImages.push(mat.thumbnailData)
          }

          if (mat.jobId && !mergedJobIds.includes(mat.jobId)) {
            mergedJobIds.push(mat.jobId)
          }
          if (mat.associatedJobIds && mat.associatedJobIds.length > 0) {
            mat.associatedJobIds.forEach((jid) => {
              if (!mergedJobIds.includes(jid)) mergedJobIds.push(jid)
            })
          }

          const isConsumed = consumeStates[mat.id]
          if (isConsumed) {
            extraUsageCount += mat.usageCount || 0
            await this.deleteStyleCardAndCleanup(mat.id)
          }
        }

        await this.styleCards.update(representativeId, {
          images: mergedImages,
          associatedJobIds: mergedJobIds,
          usageCount: (rep.usageCount || 0) + extraUsageCount,
          updatedAt: Date.now()
        })
      }
    )

  importBackupData = vi
    .fn()
    .mockImplementation(
      async (data: any, mode: "merge" | "replace" = "replace") => {
        if (mode === "replace") {
          await this.styleCards.clear()
          await this.categories.clear()
          await this.userSettings.clear()
          await this.historyItems.clear()
          await this.slotHistory.clear()
        }
        if (data.styleCards) await this.styleCards.bulkPut(data.styleCards)
        if (data.categories) await this.categories.bulkPut(data.categories)
        if (data.userSettings)
          await this.userSettings.bulkPut(data.userSettings)
        if (data.historyItems)
          await this.historyItems.bulkPut(data.historyItems)
        if (data.slotHistory && mode === "replace") {
          const items = Object.entries(data.slotHistory).map(
            ([label, values]) => ({
              label,
              values,
              updatedAt: Date.now()
            })
          )
          await this.slotHistory.bulkPut(items)
        }
      }
    )

  getSlotHistory = vi.fn().mockImplementation(async (label: string) => {
    const item = await this.slotHistory.get(label)
    return item ? item.values : undefined
  })

  saveSlotHistory = vi
    .fn()
    .mockImplementation(async (label: string, values: string[]) => {
      await this.slotHistory.put({ label, values, updatedAt: Date.now() })
    })

  getAllSlotHistory = vi.fn().mockImplementation(async () => {
    const list = await this.slotHistory.toArray()
    const res: Record<string, string[]> = {}
    list.forEach((item) => {
      res[item.label] = item.values
    })
    return res
  })

  deleteStyleCardAndCleanup = vi
    .fn()
    .mockImplementation(async (cardId: string) => {
      const cats = await this.categories.toArray()
      for (const cat of cats) {
        if (cat.iconCardId === cardId) {
          await this.categories.update(cat.id, {
            iconCardId: undefined,
            iconUrl: undefined,
            updatedAt: Date.now()
          })
        }
      }
      const card = await this.styleCards.get(cardId)
      if (card) {
        await this.styleCards.update(cardId, {
          isDeleted: true,
          thumbnailData: "",
          images: [],
          selectedThumbnails: [],
          updatedAt: Date.now()
        })
      }
    })

  transaction = vi
    .fn()
    .mockImplementation(
      async (mode: string, tables: any[], callback: () => Promise<any>) => {
        return callback()
      }
    )
}

export const db = new MockStyleAtelierDatabase()
