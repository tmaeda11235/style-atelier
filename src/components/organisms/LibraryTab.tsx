import React from "react"
import { useLibrary } from "../../hooks/useLibrary"
import { RARITY_CONFIG } from "../../lib/rarity-config"

interface LibraryTabProps {
  addLog: (msg: string) => void
}

export function LibraryTab({ addLog }: LibraryTabProps) {
  const { styleCards, handleCardClick } = useLibrary(addLog)

  return (
    <div className="grid grid-cols-2 gap-3">
      {styleCards?.map((card) => (
        <div
          key={card.id}
          onClick={() => handleCardClick(card)}
          className={`bg-white border-2 rounded-lg shadow-sm cursor-pointer overflow-hidden transition-all ${
            RARITY_CONFIG[card.tier]?.borderClass || "border-slate-200"
          } ${RARITY_CONFIG[card.tier]?.glowClass || ""}`}
        >
          <img
            src={card.thumbnailData}
            alt={card.name}
            className="aspect-square w-full object-cover rounded-t-lg"
          />
          <div className="p-2">
            <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}