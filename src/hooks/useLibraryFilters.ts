import { useLiveQuery } from "dexie-react-hooks"
import { useMemo, useState } from "react"

import { filterByHue, getColorNameFromHex, hexToHsl } from "../lib/color-utils"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import type {
  ColorFilter,
  ModelFilter,
  RarityFilter,
  SortOption
} from "./useLibrary"
import type { StyleCardMetadata } from "./useLibraryData"

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
function getSortKey(hex: string) {
  if (!hex) return { isNeutral: true, h: 0, s: 0, l: 0 }
  try {
    const [h, s, l] = hexToHsl(hex)
    const isNeutral = l > 85 || l < 15 || s < 15
    return { isNeutral, h, s, l }
  } catch {
    return { isNeutral: true, h: 0, s: 0, l: 0 }
  }
}

function compareByColor(a: StyleCardMetadata, b: StyleCardMetadata): number {
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

function applyColorFilterMeta(
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

function applyTextSearch(
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

function filterAndSortMetaCards(
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

function useVisibleCards(visibleIds: string[] | undefined) {
  return useLiveQuery(async () => {
    if (!visibleIds || visibleIds.length === 0) return []
    const cards = await db.styleCards.bulkGet(visibleIds)
    const idToCardMap = new Map<string, StyleCard>()
    cards.forEach((card) => {
      if (card && !card.isDeleted) idToCardMap.set(card.id, card)
    })
    return visibleIds
      .map((id) => idToCardMap.get(id))
      .filter((card): card is StyleCard => !!card)
  }, [visibleIds])
}

export function useLibraryFilterStates(pageSize = 12) {
  const [searchTag, setSearchTagState] = useState("")
  const [rarityFilter, setRarityFilterState] = useState<RarityFilter>("All")
  const [modelFilter, setModelFilterState] = useState<ModelFilter>("All")
  const [categoryFilter, setCategoryFilterState] = useState<string>("All")
  const [colorFilter, setColorFilterState] = useState<ColorFilter>("All")
  const [colorHueFilter, setColorHueFilterState] = useState<number | null>(null)
  const [sortBy, setSortByState] = useState<SortOption>("newest")
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [currentFolderId, setCurrentFolderIdState] = useState<string | null>(
    null
  )

  const resetPagination = () => setVisibleCount(pageSize)

  return {
    searchTag,
    setSearchTag: (v: string) => {
      setSearchTagState(v)
      resetPagination()
    },
    rarityFilter,
    setRarityFilter: (v: RarityFilter) => {
      setRarityFilterState(v)
      resetPagination()
    },
    modelFilter,
    setModelFilter: (v: ModelFilter) => {
      setModelFilterState(v)
      resetPagination()
    },
    categoryFilter,
    setCategoryFilter: (v: string) => {
      setCategoryFilterState(v)
      resetPagination()
    },
    colorFilter,
    setColorFilter: (v: ColorFilter) => {
      setColorFilterState(v)
      resetPagination()
    },
    colorHueFilter,
    setColorHueFilter: (v: number | null) => {
      setColorHueFilterState(v)
      resetPagination()
    },
    sortBy,
    setSortBy: (v: SortOption) => {
      setSortByState(v)
      resetPagination()
    },
    visibleCount,
    setVisibleCount,
    currentFolderId,
    setCurrentFolderId: (v: string | null) => {
      setCurrentFolderIdState(v)
      resetPagination()
    }
  }
}

export function useLibraryBreadcrumbs(
  currentFolderId: string | null,
  categories: any[],
  searchTag: string,
  rarityFilter: RarityFilter,
  colorFilter: ColorFilter
) {
  const breadcrumbs = useMemo(
    () => calculateBreadcrumbs(currentFolderId, categories),
    [currentFolderId, categories]
  )

  const currentSubfolders = useMemo(() => {
    const isSearching =
      searchTag !== "" || rarityFilter !== "All" || colorFilter !== "All"
    if (isSearching) return []
    return categories.filter((c) => {
      if (!currentFolderId) return !c.parentId
      return c.parentId === currentFolderId
    })
  }, [categories, currentFolderId, searchTag, rarityFilter, colorFilter])

  return { breadcrumbs, currentSubfolders }
}

export function useLibraryFilteredCards(
  allCardsMeta: StyleCardMetadata[] | undefined,
  flexsearchIndex: any,
  filterStates: ReturnType<typeof useLibraryFilterStates>,
  pageSize = 12
) {
  const filteredAndSortedMeta = useMemo(() => {
    return filterAndSortMetaCards(
      allCardsMeta,
      filterStates.searchTag,
      flexsearchIndex,
      filterStates.rarityFilter,
      filterStates.modelFilter,
      filterStates.categoryFilter,
      filterStates.colorFilter,
      filterStates.colorHueFilter,
      filterStates.sortBy,
      filterStates.currentFolderId
    )
  }, [
    allCardsMeta,
    flexsearchIndex,
    filterStates.searchTag,
    filterStates.rarityFilter,
    filterStates.modelFilter,
    filterStates.categoryFilter,
    filterStates.colorFilter,
    filterStates.colorHueFilter,
    filterStates.sortBy,
    filterStates.currentFolderId
  ])

  const visibleIds = useMemo(() => {
    return filteredAndSortedMeta
      .slice(0, filterStates.visibleCount)
      .map((card) => card.id)
  }, [filteredAndSortedMeta, filterStates.visibleCount])

  const visibleCards = useVisibleCards(visibleIds)
  const hasMore = filteredAndSortedMeta.length > filterStates.visibleCount
  const loadMore = () => filterStates.setVisibleCount((prev) => prev + pageSize)

  return {
    styleCards: visibleCards || [],
    hasMore,
    loadMore,
    totalMatchedCount: filteredAndSortedMeta.length
  }
}
