import React from "react"

interface ExtractedFiltersDisplayProps {
  extractedFilters: {
    rarity: string
    category: string
    color: string
    query: string
  } | null
  isAiSearching: boolean
  isEngineInitializing?: boolean
  aiSearchError: string | null
  t: any
}

function FilterBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-semibold text-[9px]">
      {label}: {value}
    </span>
  )
}

interface ExtractedFiltersBadgesProps {
  extractedFilters: {
    rarity: string
    category: string
    color: string
    query: string
  }
  showNone: boolean
  t: any
}

function ExtractedFiltersBadges({
  extractedFilters,
  showNone,
  t
}: ExtractedFiltersBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-950/50">
      <span className="font-bold text-indigo-600 dark:text-indigo-400">
        {t.aiSearchExtractedFilters || "Extracted Filters"}:
      </span>
      {extractedFilters.rarity !== "All" && (
        <FilterBadge label="Rarity" value={extractedFilters.rarity} />
      )}
      {extractedFilters.category !== "All" && (
        <FilterBadge label="Category" value={extractedFilters.category} />
      )}
      {extractedFilters.color !== "All" && (
        <FilterBadge label="Color" value={extractedFilters.color} />
      )}
      {extractedFilters.query !== "" && (
        <FilterBadge label="Keyword" value={`"${extractedFilters.query}"`} />
      )}
      {showNone && (
        <span className="italic text-slate-400 text-[9px]">None</span>
      )}
    </div>
  )
}

export function ExtractedFiltersDisplay(props: ExtractedFiltersDisplayProps) {
  const {
    extractedFilters,
    isAiSearching,
    isEngineInitializing,
    aiSearchError,
    t
  } = props
  const showNone =
    extractedFilters &&
    extractedFilters.rarity === "All" &&
    extractedFilters.category === "All" &&
    extractedFilters.color === "All" &&
    extractedFilters.query === ""
  return (
    <div className="flex flex-col gap-1.5 px-1 py-0.5 animate-in fade-in duration-200">
      {isEngineInitializing && (
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-medium">
          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>
            {t.aiEngineInitializing ||
              "Initializing AI engine (this may take a few seconds)..."}
          </span>
        </div>
      )}
      {!isEngineInitializing && isAiSearching && (
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-medium">
          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>{t.aiSearchAnalyzing || "AI parsing query..."}</span>
        </div>
      )}
      {aiSearchError && (
        <div className="text-[10px] text-red-500 font-medium">
          {aiSearchError}
        </div>
      )}
      {extractedFilters && (
        <ExtractedFiltersBadges
          extractedFilters={extractedFilters}
          showNone={showNone}
          t={t}
        />
      )}
    </div>
  )
}
