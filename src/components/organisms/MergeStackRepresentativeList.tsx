import React from "react"

import type { StyleCard } from "../../shared/lib/db-schema"
import { OpfsImage } from "../atoms/OpfsImage"

interface RepresentativeCardRowProps {
  card: StyleCard
  isBase: boolean
  onSelect: () => void
  usesText: string
}

const RepresentativeCardRow: React.FC<RepresentativeCardRowProps> = ({
  card,
  isBase,
  onSelect,
  usesText
}) => (
  <div
    onClick={onSelect}
    className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer ${
      isBase
        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 shadow-sm"
        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30"
    }`}>
    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border dark:border-slate-700 bg-white dark:bg-slate-800">
      <OpfsImage
        src={card.thumbnailPath || card.thumbnailData}
        className="w-full h-full object-cover"
        alt={card.name}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
        {card.name}
      </p>
      <p className="text-[10px] text-slate-400">{usesText}</p>
    </div>
    <div
      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
        isBase
          ? "border-blue-500 bg-blue-500"
          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
      }`}>
      {isBase && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  </div>
)

interface RepresentativeCardListProps {
  workbenchCards: StyleCard[]
  baseCardId: string
  onSelectBaseCard: (cardId: string) => void
  t: {
    uses: string
  }
}

export const RepresentativeCardList: React.FC<RepresentativeCardListProps> = ({
  workbenchCards,
  baseCardId,
  onSelectBaseCard,
  t
}) => (
  <div className="space-y-2">
    {workbenchCards.map((c) => (
      <RepresentativeCardRow
        key={c.id}
        card={c}
        isBase={c.id === baseCardId}
        onSelect={() => onSelectBaseCard(c.id)}
        usesText={t.uses.replace("{count}", String(c.usageCount || 0))}
      />
    ))}
  </div>
)
