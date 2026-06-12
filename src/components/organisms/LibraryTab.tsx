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

function buildFilterProps(
  lib: any,
  isFiltersExpanded: boolean,
  setIsFiltersExpanded: (v: boolean) => void,
  expertFeatures: boolean,
  setIsCategoryModalOpen: (v: boolean) => void,
  t: any
) {
  return {
    isFiltersExpanded,
    setIsFiltersExpanded,
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
}

function SearchAndFilterSection({
  lib,
  isFiltersExpanded,
  setIsFiltersExpanded,
  expertFeatures,
  setIsCategoryModalOpen,
  t
}: {
  lib: any
  isFiltersExpanded: boolean
  setIsFiltersExpanded: (v: boolean) => void
  expertFeatures: boolean
  setIsCategoryModalOpen: (v: boolean) => void
  t: any
}) {
  const filterProps = buildFilterProps(
    lib,
    isFiltersExpanded,
    setIsFiltersExpanded,
    expertFeatures,
    setIsCategoryModalOpen,
    t
  )

  return (
    <>
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
        activeFiltersCount={lib.activeFiltersCount}
        sortBy={lib.sortBy}
        setSortBy={lib.setSortBy}
      />
      <LibraryFilterAccordion {...filterProps} />
    </>
  )
}

interface GridOrEmptySectionProps {
  lib: any
  isEasyMode?: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
  onOpenDetailCard: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
  setSharingCard: (card: StyleCard | null) => void
  t: any
}

function GridOrEmptySection({
  lib,
  isEasyMode,
  onOpenSimpleWorkbench,
  onOpenDetailCard,
  onNavigateToWorkbench,
  setSharingCard,
  t
}: GridOrEmptySectionProps) {
  const { advanceIfStep } = useTutorial()
  if (lib.styleCards.length > 0) {
    return (
      <CardsGrid
        styleCards={lib.styleCards}
        isEasyMode={isEasyMode}
        onOpenSimpleWorkbench={onOpenSimpleWorkbench}
        togglePin={lib.togglePin}
        advanceIfStep={advanceIfStep}
        onOpenDetailCard={onOpenDetailCard}
        handleCardClick={lib.handleCardClick}
        setSharingCard={setSharingCard}
        categories={lib.categories}
        handleQuickSend={async (card, e) => {
          if (!card.isPinned) await lib.togglePin(card, e)
          onNavigateToWorkbench?.()
        }}
        moveCardToCategory={lib.moveCardToCategory}
        hasMore={lib.hasMore}
        loadMore={lib.loadMore}
        t={t}
      />
    )
  }
  return (
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
  )
}

interface ModalsSectionProps {
  isCategoryModalOpen: boolean
  setIsCategoryModalOpen: (v: boolean) => void
  sharingCard: StyleCard | null
  setSharingCard: (card: StyleCard | null) => void
  addLog: (msg: string) => void
}

function ModalsSection({
  isCategoryModalOpen,
  setIsCategoryModalOpen,
  sharingCard,
  setSharingCard,
  addLog
}: ModalsSectionProps) {
  return (
    <>
      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryModalOpen(false)}
          addLog={addLog}
        />
      )}
      {sharingCard && (
        <ShareCardModal
          card={sharingCard}
          onClose={() => setSharingCard(null)}
          addLog={addLog}
        />
      )}
    </>
  )
}

export function LibraryTab(props: LibraryTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [sharingCard, setSharingCard] = useState<StyleCard | null>(null)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const { expertFeatures } = useSettings()
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab
  const lib = useLibrary(
    props.addLog,
    props.setAlertType,
    props.onNavigateToWorkbench
  )

  return (
    <div className="flex flex-col gap-4">
      <SearchAndFilterSection
        lib={lib}
        isFiltersExpanded={isFiltersExpanded}
        setIsFiltersExpanded={setIsFiltersExpanded}
        expertFeatures={expertFeatures}
        setIsCategoryModalOpen={setIsCategoryModalOpen}
        t={t}
      />
      <FolderExplorer
        breadcrumbs={lib.breadcrumbs}
        currentSubfolders={lib.currentSubfolders}
        setCurrentFolderId={lib.setCurrentFolderId}
        moveCardToCategory={lib.moveCardToCategory}
      />
      <GridOrEmptySection
        lib={lib}
        isEasyMode={props.isEasyMode}
        onOpenSimpleWorkbench={props.onOpenSimpleWorkbench}
        onOpenDetailCard={props.onOpenDetailCard}
        onNavigateToWorkbench={props.onNavigateToWorkbench}
        setSharingCard={setSharingCard}
        t={t}
      />
      <ModalsSection
        isCategoryModalOpen={isCategoryModalOpen}
        setIsCategoryModalOpen={setIsCategoryModalOpen}
        sharingCard={sharingCard}
        setSharingCard={setSharingCard}
        addLog={props.addLog}
      />
    </div>
  )
}
