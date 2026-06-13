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
    aiSearchQuery,
    isAiSearch,
    categories,
    setRarityFilter,
    setCategoryFilter,
    setColorFilter,
    setSearchTag,
    t
  } = props

  useEffect(() => {
    if (!isAiSearch) return setExtractedFilters(null)
    if (aiSearchQuery.trim() === "") {
      resetFilters(
        setRarityFilter,
        setCategoryFilter,
        setColorFilter,
        setSearchTag
      )
      return setExtractedFilters(null)
    }
    const timer = setTimeout(() => {
      executeSemanticSearch(
        aiSearchQuery,
        categories,
        setExtractedFilters,
        setRarityFilter,
        setCategoryFilter,
        setColorFilter,
        setSearchTag,
        setIsAiSearching,
        setAiSearchError,
        t
      )
    }, 600)
    return () => clearTimeout(timer)
  }, [
    aiSearchQuery,
    isAiSearch,
    categories,
    setCategoryFilter,
    setColorFilter,
    setRarityFilter,
    setSearchTag,
    t
  ])

  return { isAiSearching, aiSearchError, extractedFilters, setExtractedFilters }
}
