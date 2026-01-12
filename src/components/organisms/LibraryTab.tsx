import React from "react"
import { useLibrary } from "../../hooks/useLibrary"
import { RARITY_CONFIG } from "../../lib/rarity-config"

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
        <input
          type="text"
          placeholder="Search by tag, name or sref..."
          list="sref-options"
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <datalist id="sref-options">
          {allSrefs.map((url) => (
            <option key={url} value={url} />
          ))}
        </datalist>
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
            className={`group relative bg-white border-2 rounded-lg shadow-sm cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${
              config?.borderClass || "border-slate-200"
            } ${config?.glowClass || ""}`}
          >
            <div className="aspect-square w-full relative overflow-hidden">
              <img
                src={card.thumbnailData}
                alt={card.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              {/* Rarity Badge overlay */}
              <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm ${config.bgClass} ${config.textClass}`}>
                {card.tier}
              </div>
              {/* Pin Button */}
              <button
                onClick={(e) => togglePin(card, e)}
                className={`absolute bottom-1 right-1 p-1 rounded-full shadow-md transition-colors ${
                  card.isPinned ? "bg-yellow-400 text-white" : "bg-white/80 text-slate-400 hover:text-yellow-500"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={card.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
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