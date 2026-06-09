import type { AlertType } from "../components/molecules/ConnectionAlert"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { useHandleCardClick, useTogglePin } from "./useLibraryActions"
import { useLibraryData } from "./useLibraryData"
import {
  useLibraryBreadcrumbs,
  useLibraryFilteredCards,
  useLibraryFilterStates
} from "./useLibraryFilters"

export type SortOption = "newest" | "oldest" | "rarity" | "usage" | "color"
export type RarityFilter = "All" | StyleCard["tier"]
export type ModelFilter = "All" | "V6" | "V5" | "Niji 6" | "Niji 5"
export type ColorFilter =
  | "All"
  | "Red"
  | "Orange"
  | "Yellow"
  | "Green"
  | "Cyan"
  | "Blue"
  | "Purple"
  | "Pink"
  | "Brown"
  | "White"
  | "Black"
  | "Gray"

export function useLibrary(
  addLog: (msg: string) => void,
  setAlertType: (type: AlertType) => void,
  onNavigateToWorkbench?: () => void
) {
  const { allCardsMeta, categories, flexsearchIndex, allSrefs } =
    useLibraryData()

  const filterStates = useLibraryFilterStates()
  const { breadcrumbs, currentSubfolders } = useLibraryBreadcrumbs(
    filterStates.currentFolderId,
    categories,
    filterStates.searchTag,
    filterStates.rarityFilter,
    filterStates.colorFilter
  )

  const filtered = useLibraryFilteredCards(
    allCardsMeta,
    flexsearchIndex,
    filterStates
  )

  const togglePin = useTogglePin(allCardsMeta, addLog, setAlertType)
  const handleCardClick = useHandleCardClick(
    allCardsMeta,
    addLog,
    setAlertType,
    onNavigateToWorkbench
  )

  const moveCardToCategory = async (
    cardId: string,
    categoryId: string | null
  ) => {
    try {
      await db.updateCard(cardId, { category: categoryId || undefined })
      const catName = categoryId
        ? categories.find((c) => c.id === categoryId)?.name || "Folder"
        : "Root"
      addLog(`Moved card to "${catName}".`)
    } catch (err) {
      console.error("Failed to move card:", err)
    }
  }

  return {
    ...filterStates,
    ...filtered,
    breadcrumbs,
    currentSubfolders,
    moveCardToCategory,
    togglePin,
    handleCardClick,
    allCards: allCardsMeta,
    categories,
    allSrefs
  }
}
