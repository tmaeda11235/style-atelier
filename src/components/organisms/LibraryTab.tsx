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
            </div>
            <div className={`p-2 border-t ${config.borderClass} bg-opacity-5 ${config.bgClass}`}>
              <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}