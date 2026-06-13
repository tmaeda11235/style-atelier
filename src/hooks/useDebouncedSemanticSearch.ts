import { useEffect, useState } from "react"

import { parseSemanticQuery } from "../lib/ai-search-utils"

interface DebouncedSemanticSearchProps {
  aiSearchQuery: string
  isAiSearch: boolean
  categories: { id: string; name: string }[]
  setRarityFilter: (val: any) => void
  setCategoryFilter: (val: string) => void
  setColorFilter: (val: any) => void
  setSearchTag: (val: string) => void
  t: any
}

type ExtractedFiltersState = {
  rarity: string
  category: string
  color: string
  query: string
} | null

export function useDebouncedSemanticSearch(
  props: DebouncedSemanticSearchProps
) {
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiSearchError, setAiSearchError] = useState<string | null>(null)
  const [extractedFilters, setExtractedFilters] =
    useState<ExtractedFiltersState>(null)

  const {
    aiSearchQuery: query,
    isAiSearch: isSearch,
    categories,
    setRarityFilter: setRarity,
    setCategoryFilter: setCategory,
    setColorFilter: setColor,
    setSearchTag: setTag,
    t
  } = props

  useEffect(() => {
    if (!isSearch) return setExtractedFilters(null)
    if (query.trim() === "") {
      resetFilters(setRarity, setCategory, setColor, setTag)
      return setExtractedFilters(null)
    }
    const timer = setTimeout(() => {
      executeSemanticSearch(
        query,
        categories,
        setExtractedFilters,
        setRarity,
        setCategory,
        setColor,
        setTag,
        setIsAiSearching,
        setAiSearchError,
        t
      )
    }, 600)
    return () => clearTimeout(timer)
  }, [query, isSearch, categories, setCategory, setColor, setRarity, setTag, t])

  return { isAiSearching, aiSearchError, extractedFilters, setExtractedFilters }
}

function resetFilters(
  setRarityFilter: (val: any) => void,
  setCategoryFilter: (val: string) => void,
  setColorFilter: (val: any) => void,
  setSearchTag: (val: string) => void
) {
  setRarityFilter("All")
  setCategoryFilter("All")
  setColorFilter("All")
  setSearchTag("")
}

function applyFilters(
  result: { rarity: string; category: string; color: string; query: string },
  setRarityFilter: (val: any) => void,
  setCategoryFilter: (val: string) => void,
  setColorFilter: (val: any) => void,
  setSearchTag: (val: string) => void
) {
  setRarityFilter(result.rarity)
  setCategoryFilter(result.category)
  setColorFilter(result.color)
  setSearchTag(result.query)
}

async function executeSemanticSearch(
  query: string,
  categories: { id: string; name: string }[],
  setExtractedFilters: (val: any) => void,
  setRarityFilter: (val: any) => void,
  setCategoryFilter: (val: string) => void,
  setColorFilter: (val: any) => void,
  setSearchTag: (val: string) => void,
  setIsAiSearching: (val: boolean) => void,
  setAiSearchError: (val: string | null) => void,
  t: any
) {
  setIsAiSearching(true)
  setAiSearchError(null)
  try {
    const result = await parseSemanticQuery(query, categories)
    setExtractedFilters(result)
    applyFilters(
      result,
      setRarityFilter,
      setCategoryFilter,
      setColorFilter,
      setSearchTag
    )
  } catch (err) {
    console.error(err)
    setAiSearchError(t.aiSearchError || "AI parsing error")
  } finally {
    setIsAiSearching(false)
  }
}
