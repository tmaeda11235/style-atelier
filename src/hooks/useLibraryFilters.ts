import { useLiveQuery } from "dexie-react-hooks"
import { useMemo, useState } from "react"

import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import {
  calculateBreadcrumbs,
  filterAndSortMetaCards
} from "../lib/library-filter-utils"
import type {
  ColorFilter,
  ModelFilter,
  RarityFilter,
  SortOption
} from "./useLibrary"
import type { StyleCardMetadata } from "./useLibraryData"

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
  const wrap =
    <T>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T) => {
      setter(v)
      resetPagination()
    }

  return {
    searchTag,
    setSearchTag: wrap(setSearchTagState),
    rarityFilter,
    setRarityFilter: wrap(setRarityFilterState),
    modelFilter,
    setModelFilter: wrap(setModelFilterState),
    categoryFilter,
    setCategoryFilter: wrap(setCategoryFilterState),
    colorFilter,
    setColorFilter: wrap(setColorFilterState),
    colorHueFilter,
    setColorHueFilter: wrap(setColorHueFilterState),
    sortBy,
    setSortBy: wrap(setSortByState),
    visibleCount,
    setVisibleCount,
    currentFolderId,
    setCurrentFolderId: wrap(setCurrentFolderIdState)
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
