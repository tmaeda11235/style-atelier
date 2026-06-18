import React from "react"

import type { StyleCard } from "../../../shared/lib/db-schema"

interface CardSelectionViewProps {
  t: any
  libraryCards: StyleCard[]
  iconCardId: string
  handleSelectCard: (id: string, thumb: string) => void
}

export function CardSelectionView({
  t,
  libraryCards,
  iconCardId,
  handleSelectCard
}: CardSelectionViewProps) {
  if (libraryCards.length === 0) {
    return (
      <div>
        <p className="text-[11px] text-slate-500 mb-3">{t.clickToUseThumb}</p>
        <p className="text-xs text-slate-400 italic text-center py-6">
          {t.noCardsFound}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-3">{t.clickToUseThumb}</p>
      <div className="grid grid-cols-3 gap-2">
        {libraryCards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleSelectCard(card.id, card.thumbnailData)}
            className={`relative aspect-square cursor-pointer overflow-hidden rounded border transition-all ${
              iconCardId === card.id
                ? "border-blue-500 ring-2 ring-blue-100 shadow-sm"
                : "border-slate-200 hover:border-slate-400"
            }`}>
            <img
              src={card.thumbnailData}
              className="w-full h-full object-cover"
              alt={card.name}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] text-white font-bold px-1 py-0.5 bg-blue-500/80 rounded">
                {t.select}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
