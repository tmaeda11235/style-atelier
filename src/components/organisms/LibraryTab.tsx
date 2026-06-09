import { BookUp2, ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useLibrary } from "../../hooks/useLibrary"
import type { StyleCard } from "../../lib/db-schema"
import { type AlertType } from "../molecules/ConnectionAlert"
import { LibraryCardItem } from "../molecules/LibraryCardItem"
import { SearchField } from "../molecules/SearchField"
import { CategoryManagerModal } from "./CategoryManagerModal"
import { FolderExplorer } from "./FolderExplorer"
import { LibraryFilterAccordion } from "./LibraryFilterAccordion"
import { ShareCardModal } from "./ShareCardModal"

interface LibraryTabProps {
  addLog: (msg: string) => void
  setAlertType: (type: AlertType) => void
  onOpenDetailCard: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
  isEasyMode?: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
}

export function LibraryTab({
  addLog,
  setAlertType,
  onOpenDetailCard,
  onNavigateToWorkbench,
  isEasyMode = false,
  onOpenSimpleWorkbench
}: LibraryTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [sharingCard, setSharingCard] = useState<StyleCard | null>(null)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const { advanceIfStep } = useTutorial()

  const { expertFeatures } = useSettings()
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab

  const {
    styleCards,
    handleCardClick,
    togglePin,
    searchTag,
    setSearchTag,
    rarityFilter,
    setRarityFilter,
    modelFilter,
    setModelFilter,
    categoryFilter,
    setCategoryFilter,
    colorFilter,
    setColorFilter,
    sortBy,
    setSortBy,
    allSrefs,
    categories,
    allCards,
    hasMore,
    loadMore,
    setCurrentFolderId,
    breadcrumbs,
    currentSubfolders,
    moveCardToCategory
  } = useLibrary(addLog, setAlertType, onNavigateToWorkbench)

  const activeFiltersCount = [
    rarityFilter !== "All",
    modelFilter !== "All",
    categoryFilter !== "All",
    colorFilter !== "All",
    sortBy !== "newest"
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0">
            <SearchField
              placeholder={
                t.searchPlaceholder || "Search by tag, name or sref..."
              }
              options={allSrefs}
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              className="text-xs"
            />
          </div>
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 cursor-pointer ${
              isFiltersExpanded || activeFiltersCount > 0
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Toggle filters"
            id="toggle-filters-btn"
            data-testid="toggle-filters-btn">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {t.filtersToggleLabel || "Filters"}
            </span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-extrabold text-white bg-indigo-600 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isFiltersExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Collapsible Accordion Container */}
        <LibraryFilterAccordion
          isFiltersExpanded={isFiltersExpanded}
          expertFeatures={expertFeatures}
          rarityFilter={rarityFilter}
          setRarityFilter={setRarityFilter}
          modelFilter={modelFilter}
          setModelFilter={setModelFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          colorFilter={colorFilter}
          setColorFilter={setColorFilter}
          colorLabel={t.colorLabel}
          modelLabel={t.modelLabel}
          modelOptions={t.models}
          styleCardsCount={styleCards?.length || 0}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          setIsCategoryModalOpen={setIsCategoryModalOpen}
          allCategoriesLabel={t.allCategories}
          manageCategoriesTitle={t.manageCategories}
          allRaritiesLabel={t.allRarities}
          sortByNewestLabel={t.sortBy?.newest}
          sortByOldestLabel={t.sortBy?.oldest}
          sortByRarityLabel={t.sortBy?.rarity}
          sortByUsageLabel={t.sortBy?.usage}
          sortByColorLabel={t.sortBy?.color}
        />
      </div>

      {/* Folder Explorer */}
      <FolderExplorer
        breadcrumbs={breadcrumbs}
        currentSubfolders={currentSubfolders}
        setCurrentFolderId={setCurrentFolderId}
        moveCardToCategory={moveCardToCategory}
      />

      {(styleCards !== undefined && styleCards.length > 0) ||
      currentSubfolders.length > 0 ? (
        <>
          <div
            className="grid grid-cols-2 gap-3"
            data-tutorial="library-card-grid">
            {styleCards.map((card, idx) => (
              <LibraryCardItem
                key={card.id}
                card={card}
                idx={idx}
                isEasyMode={isEasyMode}
                onOpenSimpleWorkbench={onOpenSimpleWorkbench}
                togglePin={togglePin}
                advanceIfStep={advanceIfStep}
                onOpenDetailCard={onOpenDetailCard}
                handleCardClick={handleCardClick}
                setSharingCard={setSharingCard}
                categories={categories}
              />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg text-xs transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-indigo-500/20 duration-200 border border-white/10"
              id="library-load-more-btn"
              data-testid="show-more-button">
              {t.showMore || t.loadMore || "Load More"}
            </button>
          )}
        </>
      ) : styleCards !== undefined ? (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed backdrop-blur-sm animate-in fade-in duration-300">
          {allCards !== undefined &&
          allCards.filter((c) => !c.isVariable).length === 0 ? (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <BookUp2 className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {t.emptyTitle}
              </h3>
              <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                {t.emptyDesc}
              </p>
            </>
          ) : searchTag !== "" ||
            rarityFilter !== "All" ||
            colorFilter !== "All" ||
            categoryFilter !== "All" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <Search className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {t.notFoundTitle}
              </h3>
              <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed mb-4">
                {t.notFoundDesc}
              </p>
              <button
                onClick={() => {
                  setSearchTag("")
                  setRarityFilter("All")
                  setModelFilter("All")
                  setCategoryFilter("All")
                  setColorFilter("All")
                }}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-sm">
                {t.clearFilters}
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <BookUp2 className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {t.emptyTitle || "Empty Folder"}
              </h3>
              <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                {t.emptyDesc || "No style cards in this folder."}
              </p>
            </>
          )}
        </div>
      ) : null}

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
    </div>
  )
}
