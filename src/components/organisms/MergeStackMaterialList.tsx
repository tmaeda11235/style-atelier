import React from "react"

import type { StyleCard } from "../../shared/lib/db-schema"
import { OpfsImage } from "../atoms/OpfsImage"

interface MaterialCardRowProps {
  card: StyleCard
  isConsumed: boolean
  onToggle: () => void
  usesText: string
  consumeText: string
  keepText: string
}

const MaterialCardRow: React.FC<MaterialCardRowProps> = ({
  card,
  isConsumed,
  onToggle,
  usesText,
  consumeText,
  keepText
}) => (
  <div
    data-testid={`material-row-${card.id}`}
    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20 gap-3">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border bg-white">
        <OpfsImage
          src={card.thumbnailPath || card.thumbnailData}
          className="w-full h-full object-cover"
          alt={card.name}
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
          {card.name}
        </p>
        <p className="text-[9px] text-slate-400">{usesText}</p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${
          isConsumed
            ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/50"
            : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
        }`}>
        {isConsumed ? consumeText : keepText}
      </button>
    </div>
  </div>
)

interface MaterialCardListProps {
  workbenchCards: StyleCard[]
  baseCardId: string
  consumeStates: Record<string, boolean>
  onToggleConsume: (cardId: string) => void
  t: {
    usesToTransfer: string
    consume: string
    keep: string
  }
}

export const MaterialCardList: React.FC<MaterialCardListProps> = ({
  workbenchCards,
  baseCardId,
  consumeStates,
  onToggleConsume,
  t
}) => {
  const materials = workbenchCards.filter((c) => c.id !== baseCardId)
  if (materials.length === 0) return null

  return (
    <div className="space-y-2">
      {materials.map((c) => (
        <MaterialCardRow
          key={c.id}
          card={c}
          isConsumed={consumeStates[c.id] ?? true}
          onToggle={() => onToggleConsume(c.id)}
          usesText={t.usesToTransfer.replace(
            "{count}",
            String(c.usageCount || 0)
          )}
          consumeText={t.consume}
          keepText={t.keep}
        />
      ))}
    </div>
  )
}
