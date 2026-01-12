import React from "react"
import { useLibrary } from "../../hooks/useLibrary"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { SearchField } from "../molecules/SearchField"
import { CardThumbnail } from "../molecules/CardThumbnail"

interface LibraryTabProps {
  addLog: (msg: string) => void
}

export function LibraryTab({ addLog }: LibraryTabProps) {
  const {
    styleCards,
    handleCardClick,
    togglePin,
    searchTag,
    setSearchTag,
    rarityFilter,
    setRarityFilter,
    sortBy,
    setSortBy,
    allSrefs,
  } = useLibrary(addLog)

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters */}
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

      <div className="grid grid-cols-2 gap-3">
        {styleCards?.map((card) => {
          const config = RARITY_CONFIG[card.tier]
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`group bg-white border-2 rounded-lg shadow-sm cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${
                config?.borderClass || "border-slate-200"
              } ${config?.glowClass || ""}`}
            >
              <CardThumbnail
                imageUrl={card.thumbnailData}
                alt={card.name}
                tier={card.tier}
                isPinned={card.isPinned}
                onPinClick={(e) => togglePin(card, e)}
              />
              <div className={`p-2 border-t ${config.borderClass} bg-opacity-5 ${config.bgClass}`}>
                <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}