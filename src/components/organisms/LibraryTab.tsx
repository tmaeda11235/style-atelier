import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useLibrary } from "../../hooks/useLibrary"
import type { StyleCard } from "../../lib/db-schema"
import { type AlertType } from "../molecules/ConnectionAlert"
import { CardsGrid } from "./CardsGrid"
import { CategoryManagerModal } from "./CategoryManagerModal"
import { EmptyState } from "./EmptyState"
import { FolderExplorer } from "./FolderExplorer"
import { LibraryFilterAccordion } from "./LibraryFilterAccordion"
import { LibrarySearchBar } from "./LibrarySearchBar"
import { ShareCardModal } from "./ShareCardModal"

interface LibraryTabProps {
  addLog: (msg: string) => void
  setAlertType: (type: AlertType) => void
  onOpenDetailCard: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
  isEasyMode?: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
}

export function LibraryTab(props: LibraryTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [sharingCard, setSharingCard] = useState<StyleCard | null>(null)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const { advanceIfStep } = useTutorial()
  const { expertFeatures } = useSettings()
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab
  const lib = useLibrary(
    props.addLog,
    props.setAlertType,
    props.onNavigateToWorkbench
  )

  const activeFiltersCount = [
    lib.rarityFilter !== "All",
    lib.modelFilter !== "All",
    lib.categoryFilter !== "All",
    lib.colorFilter !== "All" || lib.colorHueFilter !== null,
    lib.sortBy !== "newest"
  ].filter(Boolean).length

  const filterAccordionProps = {
    isFiltersExpanded,
    expertFeatures,
    rarityFilter: lib.rarityFilter,
    setRarityFilter: lib.setRarityFilter,
    modelFilter: lib.modelFilter,
    setModelFilter: lib.setModelFilter,
    sortBy: lib.sortBy,
    setSortBy: lib.setSortBy,
    colorFilter: lib.colorFilter,
    setColorFilter: lib.setColorFilter,
    colorHueFilter: lib.colorHueFilter,
    setColorHueFilter: lib.setColorHueFilter,
    colorLabel: t.colorLabel,
    modelLabel: t.modelLabel,
    modelOptions: t.models,
    styleCardsCount: lib.styleCards?.length || 0,
    categoryFilter: lib.categoryFilter,
    setCategoryFilter: lib.setCategoryFilter,
    categories: lib.categories,
    setIsCategoryModalOpen,
    allCategoriesLabel: t.allCategories,
    manageCategoriesTitle: t.manageCategories,
    allRaritiesLabel: t.allRarities,
    sortByNewestLabel: t.sortBy?.newest,
    sortByOldestLabel: t.sortBy?.oldest,
    sortByRarityLabel: t.sortBy?.rarity,
    sortByUsageLabel: t.sortBy?.usage,
    sortByColorLabel: t.sortBy?.color
  }

  return (
    <div className="flex flex-col gap-4">
      <LibrarySearchBar
        categories={lib.categories}
        allSrefs={lib.allSrefs}
        searchTag={lib.searchTag}
        setSearchTag={lib.setSearchTag}
        setRarityFilter={lib.setRarityFilter}
        setCategoryFilter={lib.setCategoryFilter}
        setColorFilter={lib.setColorFilter}
        isFiltersExpanded={isFiltersExpanded}
        setIsFiltersExpanded={setIsFiltersExpanded}
        activeFiltersCount={activeFiltersCount}
      />
      <LibraryFilterAccordion {...filterAccordionProps} />
      <FolderExplorer
        breadcrumbs={lib.breadcrumbs}
        currentSubfolders={lib.currentSubfolders}
        setCurrentFolderId={lib.setCurrentFolderId}
        moveCardToCategory={lib.moveCardToCategory}
      />
      {lib.styleCards.length > 0 ? (
        <CardsGrid
          styleCards={lib.styleCards}
          isEasyMode={props.isEasyMode}
          onOpenSimpleWorkbench={props.onOpenSimpleWorkbench}
          togglePin={lib.togglePin}
          advanceIfStep={advanceIfStep}
          onOpenDetailCard={props.onOpenDetailCard}
          handleCardClick={lib.handleCardClick}
          setSharingCard={setSharingCard}
          categories={lib.categories}
          handleQuickSend={async (card, e) => {
            if (!card.isPinned) await lib.togglePin(card, e)
            props.onNavigateToWorkbench?.()
          }}
          moveCardToCategory={lib.moveCardToCategory}
          hasMore={lib.hasMore}
          loadMore={lib.loadMore}
          t={t}
        />
      ) : (
        <EmptyState
          allCards={lib.allCards}
          searchTag={lib.searchTag}
          rarityFilter={lib.rarityFilter}
          modelFilter={lib.modelFilter}
          categoryFilter={lib.categoryFilter}
          colorFilter={lib.colorFilter}
          setSearchTag={lib.setSearchTag}
          setRarityFilter={lib.setRarityFilter}
          setModelFilter={lib.setModelFilter}
          setCategoryFilter={lib.setCategoryFilter}
          setColorFilter={lib.setColorFilter}
          t={t}
        />
      )}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryModalOpen(false)}
          addLog={props.addLog}
        />
      )}
      {sharingCard && (
        <ShareCardModal
          card={sharingCard}
          onClose={() => setSharingCard(null)}
          addLog={props.addLog}
        />
      )}
    </div>
  )
}
