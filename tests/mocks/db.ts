/* eslint-disable */
import { vi } from "vitest"

import type {
  CustomCategory,
  HistoryItem,
  StyleCard,
  UserSettings
} from "../../src/shared/lib/db-schema"

class MockCollection<T> {
  private items: T[]

  constructor(items: T[]) {
    this.items = [...items]
  }

  toArray = vi.fn().mockImplementation(async () => {
    return this.items
  })

  first = vi.fn().mockImplementation(async () => {
    return this.items[0] || undefined
  })

  last = vi.fn().mockImplementation(async () => {
    return this.items[this.items.length - 1] || undefined
  })

  each = vi.fn().mockImplementation(async (callback: (item: T) => any) => {
    for (const item of this.items) {
      await callback(item)
    }
  })

  count = vi.fn().mockImplementation(async () => {
    return this.items.length
  })

  limit = vi.fn().mockImplementation((n: number) => {
    return new MockCollection(this.items.slice(0, n))
  })

  offset = vi.fn().mockImplementation((n: number) => {
    return new MockCollection(this.items.slice(n))
  })

  reverse = vi.fn().mockImplementation(() => {
    return new MockCollection([...this.items].reverse())
  })

  modify = vi.fn().mockImplementation(async (modifyFn: (item: any) => void) => {
    this.items.forEach(modifyFn)
  })
}

class MockTable<T extends Record<string, any>, Key = string> {
  private items: Map<any, T> = new Map()
  hooks: Record<string, any> = {}

  constructor(initialItems: T[] = []) {
    initialItems.forEach((item) => {
      const key = item.id || item.userId || item.timestamp || item.filePath
      this.items.set(key, item)
    })
  }

  __setItems(newItems: T[]) {
    this.items.clear()
    newItems.forEach((item) => {
      const key = item.id || item.userId || item.timestamp || item.filePath
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
      item.id ||
      item.userId ||
      item.timestamp ||
      item.filePath ||
      Math.random().toString()
    const newItem = { ...item }
    if (!newItem.id && !newItem.filePath && typeof newItem === "object") {
      ;(newItem as any).id = key
    }
    this.items.set(key, newItem)
    return key
  })

  put = vi.fn().mockImplementation(async (item: T) => {
    const key =
      item.id ||
      item.userId ||
      item.timestamp ||
      item.filePath ||
      Math.random().toString()
    const newItem = { ...item }
    if (!newItem.id && !newItem.filePath && typeof newItem === "object") {
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

  count = vi.fn().mockImplementation(async () => {
    return this.items.size
  })

  orderBy = vi.fn().mockImplementation((index: string) => {
    const sorted = Array.from(this.items.values()).sort((a: any, b: any) => {
      const valA = a[index] || 0
      const valB = b[index] || 0
      return valA > valB ? 1 : valA < valB ? -1 : 0
    })
    return new MockCollection(sorted)
  })

  bulkPut = vi.fn().mockImplementation(async (items: T[]) => {
    items.forEach((item) => {
      const key = item.id || item.userId || item.timestamp || item.filePath
      this.items.set(key, item)
    })
  })

  bulkAdd = vi.fn().mockImplementation(async (items: T[]) => {
    items.forEach((item) => {
      const key = item.id || item.userId || item.timestamp || item.filePath
      this.items.set(key, item)
    })
  })

  filter = vi.fn().mockImplementation((fn: (item: T) => boolean) => {
    const filtered = Array.from(this.items.values()).filter(fn)
    return new MockCollection(filtered)
  })

  where = vi.fn().mockImplementation((indexName: string) => {
    return {
      equals: (val: any) => {
        const matched = Array.from(this.items.values()).filter(
          (item: any) => item[indexName] === val
        )
        return new MockCollection(matched)
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
  parameterAliases = new MockTable<any>()
  parameterFolders = new MockTable<any>()
  recipeHistory = new MockTable<any>()
  imageSyncStates = new MockTable<any>()

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
    this.parameterAliases = new MockTable<any>([])
    this.parameterFolders = new MockTable<any>([])
    this.recipeHistory = new MockTable<any>([])
    this.imageSyncStates = new MockTable<any>([])
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
    await this.styleCards.delete(id)
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
    return this.categories.add(category)
  })

  updateCategory = vi
    .fn()
    .mockImplementation(
      async (id: string, changes: Partial<CustomCategory>) => {
        return this.categories.update(id, changes)
      }
    )

  deleteCategory = vi.fn().mockImplementation(async (id: string) => {
    await this.categories.delete(id)
  })

  mergeStyleCards = vi.fn()

  importBackupData = vi.fn()

  getSlotHistory = vi.fn().mockImplementation(async (label: string) => {
    const item = await this.slotHistory.get(label)
    return item ? item.values : undefined
  })

  saveSlotHistory = vi
    .fn()
    .mockImplementation(async (label: string, values: string[]) => {
      await this.slotHistory.put({ label, values })
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
      await this.styleCards.delete(cardId)
    })

  transaction = vi
    .fn()
    .mockImplementation(
      async (mode: string, tables: any[], callback: () => Promise<any>) => {
        return callback()
      }
    )

  // Parameter Alias & Folder Operations for Mock
  getParameterAlias = vi.fn().mockImplementation(async (id: string) => {
    return this.parameterAliases.get(id)
  })

  getAliasByValue = vi
    .fn()
    .mockImplementation(async (paramType: string, value: string) => {
      const list = await this.parameterAliases.toArray()
      return list.find(
        (a: any) => a.paramType === paramType && a.value === value
      )
    })

  getAllParameterAliases = vi.fn().mockImplementation(async () => {
    return this.parameterAliases.toArray()
  })

  saveParameterAlias = vi.fn().mockImplementation(async (alias: any) => {
    return this.parameterAliases.put(alias)
  })

  deleteParameterAlias = vi.fn().mockImplementation(async (id: string) => {
    await this.parameterAliases.delete(id)
  })

  getAllParameterFolders = vi.fn().mockImplementation(async () => {
    return this.parameterFolders.toArray()
  })

  addParameterFolder = vi.fn().mockImplementation(async (folder: any) => {
    const id = folder.id || Math.random().toString()
    await this.parameterFolders.add({ id, ...folder })
    return id
  })

  updateParameterFolder = vi
    .fn()
    .mockImplementation(async (id: string, name: string, parentId?: string) => {
      return this.parameterFolders.update(id, { name, parentId })
    })

  deleteParameterFolder = vi.fn().mockImplementation(async (id: string) => {
    await this.parameterFolders.delete(id)
  })

  addRecipeHistory = vi.fn().mockImplementation(async (recipe: any) => {
    return this.recipeHistory.add({
      id: Math.random().toString(),
      timestamp: Date.now(),
      ...recipe
    })
  })

  getRecipeHistory = vi.fn().mockImplementation(async () => {
    return this.recipeHistory.orderBy("timestamp").reverse().toArray()
  })

  clearRecipeHistory = vi.fn().mockImplementation(async () => {
    await this.recipeHistory.clear()
  })

  getUserSettings = vi
    .fn()
    .mockImplementation(async (): Promise<UserSettings> => {
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
    })

  updateUserSettings = vi
    .fn()
    .mockImplementation(
      async (changes: Partial<UserSettings>): Promise<void> => {
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
    )
}

export const db = new MockStyleAtelierDatabase()

export let mockDbError: Error | null = null
const mockDbErrorListeners = new Set<(err: Error) => void>()

export function addDbErrorListener(listener: (err: Error) => void) {
  mockDbErrorListeners.add(listener)
  if (mockDbError) {
    listener(mockDbError)
  }
  return () => {
    mockDbErrorListeners.delete(listener)
  }
}

export function getDbError(): Error | null {
  return mockDbError
}

export function clearDbErrorForTest(): void {
  mockDbError = null
}

export function setMockDbError(err: Error | null): void {
  mockDbError = err
  if (err) {
    mockDbErrorListeners.forEach((listener) => listener(err))
  }
}
