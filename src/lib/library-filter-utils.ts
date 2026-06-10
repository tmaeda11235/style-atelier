import type {
  ColorFilter,
  ModelFilter,
  RarityFilter,
  SortOption
} from "../hooks/useLibrary"
import type { StyleCardMetadata } from "../hooks/useLibraryData"
import { filterByHue, getColorNameFromHex, hexToHsl } from "./color-utils"

// Helper function to extract breadcrumbs
export function calculateBreadcrumbs(
  currentFolderId: string | null,
  categories: any[]
) {
  const list: { id: string | null; name: string }[] = [
    { id: null, name: "Home" }
  ]
  if (!currentFolderId) return list
  const path: { id: string; name: string }[] = []
  let curr = categories.find((c) => c.id === currentFolderId)
  while (curr) {
    path.unshift({ id: curr.id, name: curr.name })
    curr = curr.parentId
      ? categories.find((c) => c.id === curr.parentId)
      : undefined
  }
  return [...list, ...path]
}

// Helper to filter by model
export function applyModelFilter(
  cards: StyleCardMetadata[],
  modelFilter: ModelFilter
): StyleCardMetadata[] {
  if (modelFilter === "All") return cards
  return cards.filter((card) => {
    const v = card.version
    const n = card.niji
    if (modelFilter === "V6") {
      return v && (v.startsWith("6") || v === "6.0" || v === "6.1")
    }
    if (modelFilter === "V5") {
      return (
        v && (v.startsWith("5") || v === "5.0" || v === "5.1" || v === "5.2")
      )
    }
    if (modelFilter === "Niji 6") {
      return n && (n.startsWith("6") || n === "6")
    }
    if (modelFilter === "Niji 5") {
      return n && (n.startsWith("5") || n === "5")
    }
    return false
  })
}

// Helper to sort cards by color
export function getSortKey(hex: string) {
  if (!hex) return { isNeutral: true, h: 0, s: 0, l: 0 }
  try {
    const [h, s, l] = hexToHsl(hex)
    const isNeutral = l > 85 || l < 15 || s < 15
    return { isNeutral, h, s, l }
  } catch {
    return { isNeutral: true, h: 0, s: 0, l: 0 }
  }
}

export function compareByColor(
  a: StyleCardMetadata,
  b: StyleCardMetadata
): number {
  const keyA = getSortKey(a.dominantColor || "")
  const keyB = getSortKey(b.dominantColor || "")

  if (keyA.isNeutral && !keyB.isNeutral) return 1
  if (!keyA.isNeutral && keyB.isNeutral) return -1

  if (!keyA.isNeutral && !keyB.isNeutral) {
    if (keyA.h !== keyB.h) return keyA.h - keyB.h
    if (keyA.s !== keyB.s) return keyB.s - keyA.s
    return keyB.l - keyA.l
  }
  return keyB.l - keyA.l
}

export function sortCards(
  cards: StyleCardMetadata[],
  sortBy: SortOption
): StyleCardMetadata[] {
  return [...cards].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return b.createdAt - a.createdAt
      case "oldest":
        return a.createdAt - b.createdAt
      case "usage":
        return (b.usageCount || 0) - (a.usageCount || 0)
      case "rarity": {
        const weights = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 }
        return weights[b.tier] - weights[a.tier]
      }
      case "color":
        return compareByColor(a, b)
      default:
        return 0
    }
  })
}

export function applyColorFilterMeta(
  cards: StyleCardMetadata[],
  colorFilter: ColorFilter,
  colorHueFilter: number | null
): StyleCardMetadata[] {
  let result = cards
  if (colorFilter !== "All") {
    result = result.filter((card) => {
      if (!card.dominantColor) return false
      try {
        return getColorNameFromHex(card.dominantColor) === colorFilter
      } catch {
        return false
      }
    })
  }
  if (colorHueFilter !== null) {
    result = result.filter((card) =>
      filterByHue(card.dominantColor, colorHueFilter)
    )
  }
  return result
}

export function applyTextSearch(
  cards: StyleCardMetadata[],
  searchTag: string,
  flexsearchIndex: any
): StyleCardMetadata[] {
  if (!searchTag || !flexsearchIndex) return cards
  const query = searchTag.toLowerCase()
  const matchedIds = flexsearchIndex.search(query)
  const matchedSet = new Set(matchedIds)
  return cards.filter((card) => matchedSet.has(card.id))
}

export function filterAndSortMetaCards(
  allCardsMeta: StyleCardMetadata[] | undefined,
  searchTag: string,
  flexsearchIndex: any,
  rarityFilter: RarityFilter,
  modelFilter: ModelFilter,
  categoryFilter: string,
  colorFilter: ColorFilter,
  colorHueFilter: number | null,
  sortBy: SortOption,
  currentFolderId: string | null
): StyleCardMetadata[] {
  if (!allCardsMeta) return []
  let result = allCardsMeta.filter((card) => !card.isVariable)
  result = applyTextSearch(result, searchTag, flexsearchIndex)
  if (rarityFilter !== "All") {
    result = result.filter((card) => card.tier === rarityFilter)
  }
  result = applyModelFilter(result, modelFilter)

  const isSearching =
    searchTag !== "" ||
    rarityFilter !== "All" ||
    modelFilter !== "All" ||
    colorFilter !== "All"

  if (categoryFilter !== "All") {
    result = result.filter((card) => card.category === categoryFilter)
  } else if (!isSearching) {
    result = result.filter((card) => {
      return !currentFolderId
        ? !card.category
        : card.category === currentFolderId
    })
  }

  result = applyColorFilterMeta(result, colorFilter, colorHueFilter)
  return sortCards(result, sortBy)
}
