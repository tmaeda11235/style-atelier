import { ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useAiSearch } from "../../hooks/useAiSearch"
import { useWebLlm } from "../../hooks/useWebLlm"
import { AiWarningModal } from "../molecules/AiWarningModal"
import { ExtractedFiltersDisplay } from "../molecules/ExtractedFiltersDisplay"
import { SearchField } from "../molecules/SearchField"

interface LibrarySearchBarProps {
  categories: { id: string; name: string }[]
  allSrefs: string[]
  searchTag: string
  setSearchTag: (val: string) => void
  setRarityFilter: (val: any) => void
  setCategoryFilter: (val: string) => void
  setColorFilter: (val: any) => void
  isFiltersExpanded: boolean
  setIsFiltersExpanded: (val: boolean) => void
  activeFiltersCount: number
}

function FilterToggleBtn({
  isFiltersExpanded,
  activeFiltersCount,
  onClick,
  disabled,
  t
}: {
  isFiltersExpanded: boolean
  activeFiltersCount: number
  onClick: () => void
  disabled: boolean
  t: any
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 cursor-pointer ${
        isFiltersExpanded || activeFiltersCount > 0
          ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
      title="Toggle filters"
      id="toggle-filters-btn"
      data-testid="toggle-filters-btn"
      disabled={disabled}>
      <SlidersHorizontal className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">
        {t.filtersToggleLabel || "Filters"}
      </span>
      {activeFiltersCount > 0 && (
        <span className="flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-extrabold text-white bg-indigo-600 dark:bg-indigo-500 rounded-full">
          {activeFiltersCount}
        </span>
      )}
      <ChevronDown
        className={`w-3 h-3 transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`}
      />
    </button>
  )
}

function AiSearchToggleBtn({
  isAiSearch,
  onClick,
  title
}: {
  isAiSearch: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
        isAiSearch
          ? "bg-gradient-to-r from-purple-500 to-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20 scale-105"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:text-indigo-500 hover:border-indigo-200"
      }`}
      title={title}
      id="ai-search-toggle-btn"
      data-testid="ai-search-toggle-btn">
      <Sparkles className={`w-4 h-4 ${isAiSearch ? "animate-pulse" : ""}`} />
    </button>
  )
}

interface SearchInputWrapperProps {
  isAiSearch: boolean
  aiSearchQuery: string
  searchTag: string
  allSrefs: string[]
  setAiSearchQuery: (val: string) => void
  setSearchTag: (val: string) => void
  t: any
}

function SearchInputWrapper({
  isAiSearch,
  aiSearchQuery,
  searchTag,
  allSrefs,
  setAiSearchQuery,
  setSearchTag,
  t
}: SearchInputWrapperProps) {
  return (
    <div className="flex-1 min-w-0">
      <SearchField
        placeholder={
          isAiSearch
            ? t.aiSearchPlaceholder || "Ask AI: 'legendary cyberpunk'..."
            : t.searchPlaceholder || "Search by tag, name or sref..."
        }
        options={isAiSearch ? [] : allSrefs}
        value={isAiSearch ? aiSearchQuery : searchTag}
        onChange={(e) =>
          isAiSearch
            ? setAiSearchQuery(e.target.value)
            : setSearchTag(e.target.value)
        }
        className="text-xs"
        id="library-search-input"
      />
    </div>
  )
}

export function LibrarySearchBar(props: LibrarySearchBarProps) {
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab
  const { status: webLlmStatus } = useWebLlm()
  const {
    isAiSearch,
    aiSearchQuery,
    setAiSearchQuery,
    isAiSearching,
    aiSearchError,
    aiWarningOpen,
    setAiWarningOpen,
    extractedFilters,
    handleToggleAiSearch
  } = useAiSearch({
    categories: props.categories,
    setRarityFilter: props.setRarityFilter,
    setCategoryFilter: props.setCategoryFilter,
    setColorFilter: props.setColorFilter,
    setSearchTag: props.setSearchTag,
    webLlmStatus,
    t
  })

  return (
    <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex gap-2 items-center">
        <AiSearchToggleBtn
          isAiSearch={isAiSearch}
          onClick={handleToggleAiSearch}
          title={t.aiSearchToggle || "AI Semantic Search"}
        />
        <SearchInputWrapper
          isAiSearch={isAiSearch}
          aiSearchQuery={aiSearchQuery}
          searchTag={props.searchTag}
          allSrefs={props.allSrefs}
          setAiSearchQuery={setAiSearchQuery}
          setSearchTag={props.setSearchTag}
          t={t}
        />
        <FilterToggleBtn
          isFiltersExpanded={props.isFiltersExpanded}
          activeFiltersCount={props.activeFiltersCount}
          onClick={() => props.setIsFiltersExpanded(!props.isFiltersExpanded)}
          disabled={isAiSearch}
          t={t}
        />
      </div>
      {isAiSearch && (
        <ExtractedFiltersDisplay
          extractedFilters={extractedFilters}
          isAiSearching={isAiSearching}
          aiSearchError={aiSearchError}
          t={t}
        />
      )}
      {aiWarningOpen && (
        <AiWarningModal
          onClose={() => setAiWarningOpen(false)}
          t={t}
          i18nSettings={i18n.settings}
        />
      )}
    </div>
  )
}
