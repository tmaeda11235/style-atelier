import { useEffect, useState } from "react"

import {
  parseSemanticQuery,
  parseSemanticQueryFallback
} from "../lib/ai-search-utils"

interface DebouncedSemanticSearchProps {
  aiSearchQuery: string
  isAiSearch: boolean
  categories: { id: string; name: string }[]
  setRarityFilter: (val: any) => void
  setCategoryFilter: (val: string) => void
  setColorFilter: (val: any) => void
  setSearchTag: (val: string) => void
  webLlmStatus: string
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
  webLlmStatus: string
  _t: any
  setIsAiSearching: (val: boolean) => void
  setAiSearchError: (val: string | null) => void
  setExtractedFilters: (val: any) => void
  setIsFallbackMode: (val: boolean) => void
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
        params.webLlmStatus,
        params.setIsFallbackMode,
        params._t
      )
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.aiSearchQuery,
    params.isAiSearch,
    params.categories,
    params.setCategoryFilter,
    params.setColorFilter,
    params.setRarityFilter,
    params.setSearchTag,
    params._t,
    params.setIsAiSearching,
    params.setAiSearchError,
    params.setExtractedFilters,
    params.webLlmStatus,
    params.setIsFallbackMode
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
  webLlmStatus: string,
  setIsFallbackMode: (val: boolean) => void,
  _t: any
) {
  setIsAiSearching(true)
  setAiSearchError(null)

  let result
  let isFallback = webLlmStatus !== "ready"

  if (isFallback) {
    result = parseSemanticQueryFallback(query, categories)
  } else {
    try {
      result = await parseSemanticQuery(query, categories)
    } catch (err) {
      console.warn(
        "AI semantic search query parsing failed, using fallback:",
        err
      )
      isFallback = true
      result = parseSemanticQueryFallback(query, categories)
    }
  }

  setIsFallbackMode(isFallback)
  setExtractedFilters(result)
  applyFilters(
    result,
    setRarityFilter,
    setCategoryFilter,
    setColorFilter,
    setSearchTag
  )
  setIsAiSearching(false)
}

export function useDebouncedSemanticSearch(
  props: DebouncedSemanticSearchProps
) {
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiSearchError, setAiSearchError] = useState<string | null>(null)
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [extractedFilters, setExtractedFilters] = useState<{
    rarity: string
    category: string
    color: string
    query: string
  } | null>(null)

  useSemanticSearchEffect({
    isAiSearch: props.isAiSearch,
    aiSearchQuery: props.aiSearchQuery,
    categories: props.categories,
    setRarityFilter: props.setRarityFilter,
    setCategoryFilter: props.setCategoryFilter,
    setColorFilter: props.setColorFilter,
    setSearchTag: props.setSearchTag,
    webLlmStatus: props.webLlmStatus,
    _t: props.t,
    setIsAiSearching,
    setAiSearchError,
    setExtractedFilters,
    setIsFallbackMode
  })

  return {
    isAiSearching,
    aiSearchError,
    extractedFilters,
    setExtractedFilters,
    isFallbackMode
  }
}
