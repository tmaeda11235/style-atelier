import React, { useState } from "react"
import { useLibrary } from "../../hooks/useLibrary"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { SearchField } from "../molecules/SearchField"
import { CardThumbnail } from "../molecules/CardThumbnail"
import type { StyleCard } from "../../lib/db-schema"
import { Plus } from "lucide-react"
import { CategoryManagerModal } from "./CategoryManagerModal"
import { ShareCardModal } from "./ShareCardModal"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"
import { useTutorial } from "../../contexts/TutorialContext"

interface LibraryTabProps {
  addLog: (msg: string) => void
  setAlertType: (type: AlertType) => void
  onOpenDetailCard: (card: StyleCard) => void
}

export function LibraryTab({ addLog, setAlertType, onOpenDetailCard }: LibraryTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [sharingCard, setSharingCard] = useState<StyleCard | null>(null)
  const { advanceIfStep } = useTutorial()

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
    sortBy,
    setSortBy,
    allSrefs,
    categories,
  } = useLibrary(addLog, setAlertType)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <SearchField
          placeholder="Search by tag, name or sref..."
          options={allSrefs}
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          className="text-xs"
        />
        <div className="flex gap-2">
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as any)}
            className="flex-1 px-1 py-1 text-[10px] border rounded bg-white"
          >
            <option value="All">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 px-1 py-1 text-[10px] border rounded bg-white"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="rarity">Rarity</option>
            <option value="usage">Usage</option>
          </select>
        </div>
      </div>

      {/* Category Horizontal Filter Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCategoryFilter("All")}
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
            categoryFilter === "All"
              ? "bg-slate-800 border-slate-800 text-white shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
              categoryFilter === cat.id
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {cat.iconUrl ? (
              <img
                src={cat.iconUrl}
                className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
                alt={cat.name}
              />
            ) : (
              <span className="text-[11px] leading-none">{cat.iconEmoji || "🖼️"}</span>
            )}
            <span>{cat.name}</span>
          </button>
        ))}
        {/* Add custom category button */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 transition-colors flex-shrink-0"
          title="Add Custom Category"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3" data-tutorial="library-card-grid">
        {styleCards?.map((card, idx) => {
          const config = RARITY_CONFIG[card.tier]
          const cardCategory = categories.find((c) => c.id === card.category)
          return (
            <div
              key={card.id}
              data-tutorial={idx === 0 ? "library-card" : undefined}
              onClick={(e) => {
                togglePin(card, e)
                advanceIfStep("card-to-hand")
              }}
              className={`group bg-white border-2 rounded-lg shadow-sm cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${config?.borderClass || "border-slate-200"
                } ${config?.glowClass || ""}`}
            >
              <CardThumbnail
                imageUrl={card.thumbnailData}
                thumbnailImages={card.selectedThumbnails}
                alt={card.name}
                tier={card.tier}
                isPinned={card.isPinned}
                usageCount={card.usageCount}
                onPinClick={(e) => togglePin(card, e)}
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
              />
              <div className={`p-2 border-t ${config.borderClass} bg-opacity-5 ${config.bgClass}`}>
                <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
              </div>
            </div>
          )
        })}
      </div>

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