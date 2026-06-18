import { BookUp2, Search } from "lucide-react"
import React from "react"

import type { StyleCard } from "../../shared/lib/db-schema"

interface EmptyStateProps {
  allCards: StyleCard[] | undefined
  searchTag: string
  rarityFilter: string
  modelFilter: string
  categoryFilter: string
  colorFilter: string
  setSearchTag: (v: string) => void
  setRarityFilter: (v: string) => void
  setModelFilter: (v: string) => void
  setCategoryFilter: (v: string) => void
  setColorFilter: (v: string) => void
  t: any
}

function NoCardsState({ t }: { t: any }) {
  return (
    <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
        <BookUp2 className="w-6 h-6 text-slate-500 dark:text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        {t.emptyTitle || "Empty Folder"}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
        {t.emptyDesc || "No style cards in this folder."}
      </p>
    </div>
  )
}

function FilterNoResultsState({ t, onClear }: { t: any; onClear: () => void }) {
  return (
    <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
        <Search className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        {t.notFoundTitle}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed mb-4">
        {t.notFoundDesc}
      </p>
      <button
        onClick={onClear}
        className="px-3 py-1.5 text-xs font-bold bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-md transition-colors shadow-sm">
        {t.clearFilters}
      </button>
    </div>
  )
}

export function EmptyState(props: EmptyStateProps) {
  const isFilterActive =
    props.searchTag !== "" ||
    props.rarityFilter !== "All" ||
    props.modelFilter !== "All" ||
    props.categoryFilter !== "All" ||
    props.colorFilter !== "All"

  if (
    props.allCards !== undefined &&
    props.allCards.filter((c) => !c.isVariable).length === 0
  ) {
    return <NoCardsState t={props.t} />
  }

  if (isFilterActive) {
    return (
      <FilterNoResultsState
        t={props.t}
        onClear={() => {
          props.setSearchTag("")
          props.setRarityFilter("All")
          props.setModelFilter("All")
          props.setCategoryFilter("All")
          props.setColorFilter("All")
        }}
      />
    )
  }

  return <NoCardsState t={props.t} />
}
