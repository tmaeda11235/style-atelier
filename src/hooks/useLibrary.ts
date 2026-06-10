import type { AlertType } from "../components/molecules/ConnectionAlert"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import {
  useHandleCardClick,
  useMoveCardToCategory,
  useTogglePin
} from "./useLibraryActions"
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

  const moveCardToCategory = useMoveCardToCategory(categories, addLog)

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
