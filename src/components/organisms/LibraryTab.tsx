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
  const [dragOverFolderId, setDragOverFolderId] = useState<
    string | null | undefined
  >(undefined)
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
    colorHueFilter,
    setColorHueFilter,
    sortBy,
    setSortBy,
    allSrefs,
    categories,
    allCards,
    hasMore,
    loadMore,
    currentFolderId,
    setCurrentFolderId,
    breadcrumbs,
    currentSubfolders,
    moveCardToCategory
  } = useLibrary(addLog, setAlertType, onNavigateToWorkbench)

  const activeFiltersCount = [
    rarityFilter !== "All",
    modelFilter !== "All",
    categoryFilter !== "All",
    colorFilter !== "All" || colorHueFilter !== null,
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
          modelFilter={modelFilter}
          setModelFilter={setModelFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          colorFilter={colorFilter}
          setColorFilter={setColorFilter}
          colorHueFilter={colorHueFilter}
          setColorHueFilter={setColorHueFilter}
          colorOptions={colorOptions}
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

      {/* Explorer Breadcrumbs */}
      <div
        data-testid="breadcrumbs"
        className="flex items-center flex-wrap gap-1 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1
          const isOver = dragOverFolderId === crumb.id
          return (
            <React.Fragment key={crumb.id || "root"}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              <span
                onClick={() => setCurrentFolderId(crumb.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragOverFolderId(crumb.id)
                }}
                onDragLeave={() => setDragOverFolderId(undefined)}
                onDrop={async (e) => {
                  e.preventDefault()
                  setDragOverFolderId(undefined)
                  const cardId = e.dataTransfer.getData("cardId")
                  if (cardId) {
                    await moveCardToCategory(cardId, crumb.id)
                  }
                }}
                className={`cursor-pointer px-1.5 py-0.5 rounded transition-all font-semibold ${
                  isLast
                    ? "text-slate-800 font-bold bg-slate-100"
                    : "text-blue-600 hover:bg-blue-50"
                } ${isOver ? "bg-blue-100 ring-2 ring-blue-400 scale-105" : ""}`}>
                {crumb.name}
              </span>
            </React.Fragment>
          )
        })}
      </div>

      {/* Explorer Folders (Subfolders) */}
      {currentSubfolders.length > 0 && (
        <div
          data-testid="subfolders-grid"
          className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-200 border-dashed">
          {currentSubfolders.map((folder) => {
            const isOver = dragOverFolderId === folder.id
            return (
              <div
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragOverFolderId(folder.id)
                }}
                onDragLeave={() => setDragOverFolderId(undefined)}
                onDrop={async (e) => {
                  e.preventDefault()
                  setDragOverFolderId(undefined)
                  const cardId = e.dataTransfer.getData("cardId")
                  if (cardId) {
                    await moveCardToCategory(cardId, folder.id)
                  }
                }}
                className={`relative flex flex-col items-center justify-center p-3 rounded-lg border bg-white shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 active:scale-95 ${
                  isOver
                    ? "border-blue-500 ring-4 ring-blue-100 bg-blue-50/50 scale-105"
                    : "border-slate-200"
                }`}>
                {/* Folder Icon / Image Preview */}
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner mb-1.5 flex-shrink-0">
                  {folder.iconUrl ? (
                    <img
                      src={folder.iconUrl}
                      className="w-full h-full object-cover"
                      alt={folder.name}
                    />
                  ) : (
                    <span className="text-lg leading-none">
                      {folder.iconEmoji || "📁"}
                    </span>
                  )}
                </div>
                {/* Folder Name */}
                <span className="text-[10px] font-bold text-slate-700 text-center truncate w-full px-1">
                  {folder.name}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {(styleCards !== undefined && styleCards.length > 0) ||
      currentSubfolders.length > 0 ? (
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
                      e.dataTransfer.setData("cardId", card.id)
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
