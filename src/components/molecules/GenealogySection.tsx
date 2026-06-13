import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import type { StyleCard } from "../../lib/db-schema"

interface GenealogySectionProps {
  card: StyleCard
  parents: (StyleCard | null)[]
  onCardSelect?: (cardId: string) => void
}

export function GenealogySection({
  card,
  parents,
  onCardSelect
}: GenealogySectionProps) {
  const { t } = useLanguage()
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.genealogy.title}
      </h3>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          {t.genealogy.generation}
        </span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold border border-blue-100">
          {t.genealogy.genLabel} {card.genealogy?.generation || 1}
        </span>
      </div>

      {/* Mutation Note */}
      {card.genealogy?.mutationNote && (
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-1">
            {t.genealogy.mutationNote}
          </span>
          <div className="text-xs bg-slate-50 text-slate-600 p-2.5 rounded border border-slate-100 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {card.genealogy.mutationNote}
          </div>
        </div>
      )}

      {/* Parent Cards */}
      {card.genealogy?.parentIds && card.genealogy.parentIds.length > 0 && (
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-2">
            {t.genealogy.parentCards}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {parents.map((parent, idx) => {
              const parentId = card.genealogy.parentIds[idx]
              if (!parent) {
                return (
                  <div
                    key={parentId || idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg text-slate-400 select-none opacity-60"
                    title={t.genealogy.deletedCardTitle}>
                    <div className="w-8 h-8 rounded bg-slate-200 border flex items-center justify-center text-xs">
                      {t.genealogy.trashEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">
                        {t.genealogy.deletedCard}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {t.genealogy.idLabel} {parentId.slice(0, 8)}
                        {"..."}
                      </p>
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={parent.id}
                  onClick={() => onCardSelect && onCardSelect(parent.id)}
                  className="flex items-center gap-2 p-2 bg-white hover:bg-slate-50 border hover:border-slate-300 rounded-lg text-left transition-all group w-full">
                  {parent.thumbnailData ? (
                    <img
                      src={parent.thumbnailData}
                      alt={parent.name}
                      className="w-8 h-8 rounded object-cover border border-slate-100 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-100 border flex items-center justify-center text-xs">
                      {t.genealogy.paletteEmoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {parent.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {t.genealogy.genLabel} {parent.genealogy?.generation || 1}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
