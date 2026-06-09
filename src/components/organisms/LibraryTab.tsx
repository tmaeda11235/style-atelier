import {
  BookUp2,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Tag
} from "lucide-react"
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useLibrary } from "../../hooks/useLibrary"
import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { CardThumbnail } from "../molecules/CardThumbnail"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"
import { SearchField } from "../molecules/SearchField"
import { CategoryManagerModal } from "./CategoryManagerModal"
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
    loadMore
  } = useLibrary(addLog, setAlertType, onNavigateToWorkbench)

  const activeFiltersCount = [
    rarityFilter !== "All",
    categoryFilter !== "All",
    colorFilter !== "All",
    sortBy !== "newest"
  ].filter(Boolean).length

  const colorOptions = [
    {
      value: "All",
      label: t.colors?.all || "All Colors",
      bg: "linear-gradient(45deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)"
    },
    { value: "Red", label: t.colors?.red || "Red", bg: "#ef4444" },
    { value: "Orange", label: t.colors?.orange || "Orange", bg: "#f97316" },
    { value: "Yellow", label: t.colors?.yellow || "Yellow", bg: "#eab308" },
    { value: "Green", label: t.colors?.green || "Green", bg: "#22c55e" },
    { value: "Cyan", label: t.colors?.cyan || "Cyan", bg: "#06b6d4" },
    { value: "Blue", label: t.colors?.blue || "Blue", bg: "#3b82f6" },
    { value: "Purple", label: t.colors?.purple || "Purple", bg: "#a855f7" },
    { value: "Pink", label: t.colors?.pink || "Pink", bg: "#ec4899" },
    { value: "Brown", label: t.colors?.brown || "Brown", bg: "#78350f" },
    { value: "White", label: t.colors?.white || "White", bg: "#ffffff" },
    { value: "Gray", label: t.colors?.gray || "Gray", bg: "#6b7280" },
    { value: "Black", label: t.colors?.black || "Black", bg: "#09090b" }
  ]

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
          sortBy={sortBy}
          setSortBy={setSortBy}
          colorFilter={colorFilter}
          setColorFilter={setColorFilter}
          colorOptions={colorOptions}
          colorLabel={t.colorLabel}
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

      {styleCards !== undefined && styleCards.length > 0 ? (
        <>
          <div
            className="grid grid-cols-2 gap-3"
            data-tutorial="library-card-grid">
            {styleCards.map((card, idx) => {
              const config = RARITY_CONFIG[card.tier]
              const cardCategory = categories.find(
                (c) => c.id === card.category
              )
              return (
                <div
                  key={card.id}
                  data-tutorial={idx === 0 ? "library-card" : undefined}
                  onClick={(e) => {
                    if (isEasyMode) {
                      onOpenSimpleWorkbench?.(card)
                    } else {
                      togglePin(card, e)
                      advanceIfStep("card-to-hand")
                    }
                  }}
                  className={`group bg-white border-2 rounded-lg shadow-sm cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    config?.borderClass || "border-slate-200"
                  } ${config?.glowClass || ""}`}>
                  <CardThumbnail
                    imageUrl={card.thumbnailData}
                    thumbnailImages={card.selectedThumbnails}
                    alt={card.name}
                    tier={card.tier}
                    isPinned={card.isPinned}
                    usageCount={card.usageCount}
                    onPinClick={
                      isEasyMode ? undefined : (e) => togglePin(card, e)
                    }
                    onEditClick={(e) => {
                      e.stopPropagation()
                      onOpenDetailCard(card)
                    }}
                    onInjectClick={(e) => {
                      e.stopPropagation()
                      handleCardClick(card)
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation()
                      setSharingCard(card)
                    }}
                    category={cardCategory}
                    draggable={true}
                    onDragStart={(e) => {
                      const text = buildPromptString(
                        card.promptSegments,
                        card.parameters
                      )
                      e.dataTransfer.setData("text/plain", text)
                    }}
                  />
                  <div
                    className={`p-2 border-t ${config.borderClass} bg-opacity-5 ${config.bgClass}`}>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {card.name}
                    </p>
                  </div>
                </div>
              )
            })}
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
          ) : (
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
                  setCategoryFilter("All")
                  setColorFilter("All")
                }}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-sm">
                {t.clearFilters}
              </button>
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
