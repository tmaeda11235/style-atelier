import { BookUp2, ChevronDown, Search, Tag } from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"

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

  const colorScrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = useCallback(() => {
    const el = colorScrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setShowLeftArrow(scrollLeft > 1)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }, [])

  useEffect(() => {
    const el = colorScrollRef.current
    if (el) {
      checkScroll()
      el.addEventListener("scroll", checkScroll)
      window.addEventListener("resize", checkScroll)

      const timer = setTimeout(checkScroll, 100)

      let resizeObserver: ResizeObserver | null = null
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          checkScroll()
        })
        resizeObserver.observe(el)
      }

      return () => {
        el.removeEventListener("scroll", checkScroll)
        window.removeEventListener("resize", checkScroll)
        clearTimeout(timer)
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
      }
    }
  }, [checkScroll, styleCards])

  const scrollColors = (direction: "left" | "right") => {
    const el = colorScrollRef.current
    if (el) {
      const scrollAmount = direction === "left" ? -100 : 100
      el.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

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
        <SearchField
          placeholder={t.searchPlaceholder || "Search by tag, name or sref..."}
          options={allSrefs}
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          className="text-xs"
        />
        <div className="flex gap-2">
          {expertFeatures.rarity && (
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as any)}
              className="flex-1 px-1 py-1 text-[10px] border rounded bg-white">
              <option value="All">{t.allRarities || "All Rarities"}</option>
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 px-1 py-1 text-[10px] border rounded bg-white">
            <option value="newest">{t.sortBy?.newest || "Newest"}</option>
            <option value="oldest">{t.sortBy?.oldest || "Oldest"}</option>
            {expertFeatures.rarity && (
              <option value="rarity">{t.sortBy?.rarity || "Rarity"}</option>
            )}
            <option value="usage">{t.sortBy?.usage || "Usage"}</option>
            <option value="color">{t.sortBy?.color || "Color"}</option>
          </select>
        </div>

        {/* Color Palette Filter */}
        <div className="flex gap-1 items-center mt-1.5 select-none w-full">
          <span className="text-[9px] text-slate-400 font-bold mr-1 flex-shrink-0">
            {t.colorLabel || "Color:"}
          </span>
          <div className="relative flex-1 flex items-center min-w-0">
            {showLeftArrow && (
              <button
                onClick={() => scrollColors("left")}
                className="absolute left-0 z-10 w-4 h-4 bg-white/95 text-slate-700 hover:text-slate-900 rounded-full flex items-center justify-center border border-slate-200 shadow hover:bg-slate-50 transition-colors text-[9px] font-bold"
                aria-label="Scroll left">
                ‹
              </button>
            )}
            <div
              ref={colorScrollRef}
              data-testid="color-scroll-container"
              className="flex gap-1 items-center overflow-x-auto pb-1 scrollbar-none w-full"
              style={{
                maskImage: `linear-gradient(to right, ${
                  showLeftArrow ? "transparent" : "white"
                } 0%, white 12px, white calc(100% - 12px), ${
                  showRightArrow ? "transparent" : "white"
                } 100%)`,
                WebkitMaskImage: `linear-gradient(to right, ${
                  showLeftArrow ? "transparent" : "white"
                } 0%, white 12px, white calc(100% - 12px), ${
                  showRightArrow ? "transparent" : "white"
                } 100%)`
              }}>
              {colorOptions.map((colorOpt) => {
                const isSelected = colorFilter === colorOpt.value
                return (
                  <button
                    key={colorOpt.value}
                    onClick={() => setColorFilter(colorOpt.value as any)}
                    className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all border relative ${
                      isSelected
                        ? "scale-110 ring-1.5 ring-blue-500 ring-offset-0.5"
                        : "hover:scale-105"
                    }`}
                    style={{
                      background: colorOpt.bg,
                      borderColor:
                        colorOpt.value === "White" ? "#cbd5e1" : "transparent"
                    }}
                    title={colorOpt.label}>
                    {isSelected && (
                      <span
                        className={`absolute inset-0 flex items-center justify-center text-[7px] font-black ${
                          colorOpt.value === "White" ||
                          colorOpt.value === "Yellow"
                            ? "text-slate-800"
                            : "text-white"
                        }`}>
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {showRightArrow && (
              <button
                onClick={() => scrollColors("right")}
                className="absolute right-0 z-10 w-4 h-4 bg-white/95 text-slate-700 hover:text-slate-900 rounded-full flex items-center justify-center border border-slate-200 shadow hover:bg-slate-50 transition-colors text-[9px] font-bold"
                aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter Row */}
      {expertFeatures.categories && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter("All")}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
              categoryFilter === "All"
                ? "bg-slate-800 border-slate-800 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
            {t.allCategories || "All"}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                categoryFilter === cat.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
              {cat.iconUrl ? (
                <img
                  src={cat.iconUrl}
                  className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
                  alt={cat.name}
                />
              ) : (
                <span className="text-[11px] leading-none">
                  {cat.iconEmoji || "🖼️"}
                </span>
              )}
              <span>{cat.name}</span>
            </button>
          ))}
          {/* Manage categories button */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 transition-colors flex-shrink-0"
            title={t.manageCategories || "Manage Categories"}>
            <Tag className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
