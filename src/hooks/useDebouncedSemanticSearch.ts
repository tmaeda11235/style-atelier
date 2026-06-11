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

interface EffectParams {
  isAiSearch: boolean
  aiSearchQuery: string
  categories: { id: string; name: string }[]
  setRarityFilter: (val: any) => void
  setCategoryFilter: (val: string) => void
  setColorFilter: (val: any) => void
  setSearchTag: (val: string) => void
  t: any
  setIsAiSearching: (val: boolean) => void
  setAiSearchError: (val: string | null) => void
  setExtractedFilters: (val: any) => void
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

function useSemanticSearchEffect(params: EffectParams) {
  useEffect(() => {
    if (!params.isAiSearch) return params.setExtractedFilters(null)
    if (params.aiSearchQuery.trim() === "") {
      resetFilters(
        params.setRarityFilter,
        params.setCategoryFilter,
        params.setColorFilter,
        params.setSearchTag
      )
      return params.setExtractedFilters(null)
    }
    const timer = setTimeout(() => {
      executeSemanticSearch(
        params.aiSearchQuery,
        params.categories,
        params.setExtractedFilters,
        params.setRarityFilter,
        params.setCategoryFilter,
        params.setColorFilter,
        params.setSearchTag,
        params.setIsAiSearching,
        params.setAiSearchError,
        params.t
      )
    }, 600)
    return () => clearTimeout(timer)
  }, [
    params.aiSearchQuery,
    params.isAiSearch,
    params.categories,
    params.setCategoryFilter,
    params.setColorFilter,
    params.setRarityFilter,
    params.setSearchTag,
    params.t,
    params.setIsAiSearching,
    params.setAiSearchError,
    params.setExtractedFilters
  ])
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

export function useDebouncedSemanticSearch(
  props: DebouncedSemanticSearchProps
) {
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiSearchError, setAiSearchError] = useState<string | null>(null)
  const [extractedFilters, setExtractedFilters] = useState<{
    rarity: string
    category: string
    color: string
    query: string
  } | null>(null)

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

  useSemanticSearchEffect({
    isAiSearch,
    aiSearchQuery,
    categories,
    setRarityFilter,
    setCategoryFilter,
    setColorFilter,
    setSearchTag,
    t,
    setIsAiSearching,
    setAiSearchError,
    setExtractedFilters
  })

  return { isAiSearching, aiSearchError, extractedFilters, setExtractedFilters }
}
