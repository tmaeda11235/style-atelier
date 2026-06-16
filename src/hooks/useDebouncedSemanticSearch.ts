import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

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
  setIsAiSearching: (val: boolean) => void
  setAiSearchError: (val: string | null) => void
  setExtractedFilters: (val: any) => void
  setIsFallbackMode: (val: boolean) => void
  language: string
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
  categories: { id: string; name: string }[],
  setRarityFilter: (val: any) => void,
  setCategoryFilter: (val: string) => void,
  setColorFilter: (val: any) => void,
  setSearchTag: (val: string) => void
) {
  setRarityFilter(result.rarity)

  let targetCategoryId = "All"
  if (result.category !== "All") {
    const found = categories.find(
      (c) => c.name.toLowerCase() === result.category.toLowerCase()
    )
    if (found) {
      targetCategoryId = found.id
    }
  }
  setCategoryFilter(targetCategoryId)
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
      executeSemanticSearch(params)
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
    params.setIsAiSearching,
    params.setAiSearchError,
    params.setExtractedFilters,
    params.webLlmStatus,
    params.setIsFallbackMode,
    params.language
  ])
}

async function executeSemanticSearch(p: EffectParams) {
  p.setIsAiSearching(true)
  p.setAiSearchError(null)

  let result
  let isFallback = p.webLlmStatus !== "ready"

  if (isFallback) {
    result = parseSemanticQueryFallback(p.aiSearchQuery, p.categories)
  } else {
    try {
      result = await parseSemanticQuery(
        p.aiSearchQuery,
        p.categories,
        p.language
      )
    } catch (err) {
      console.warn(
        "AI semantic search query parsing failed, using fallback:",
        err
      )
      isFallback = true
      result = parseSemanticQueryFallback(p.aiSearchQuery, p.categories)
    }
  }

  p.setIsFallbackMode(isFallback)
  p.setExtractedFilters(result)
  applyFilters(
    result,
    p.categories,
    p.setRarityFilter,
    p.setCategoryFilter,
    p.setColorFilter,
    p.setSearchTag
  )
  p.setIsAiSearching(false)
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

  const { i18n } = useTranslation()
  const currentLanguage = i18n.language

  useSemanticSearchEffect({
    isAiSearch: props.isAiSearch,
    aiSearchQuery: props.aiSearchQuery,
    categories: props.categories,
    setRarityFilter: props.setRarityFilter,
    setCategoryFilter: props.setCategoryFilter,
    setColorFilter: props.setColorFilter,
    setSearchTag: props.setSearchTag,
    webLlmStatus: props.webLlmStatus,
    t: props.t,
    setIsAiSearching,
    setAiSearchError,
    setExtractedFilters,
    setIsFallbackMode,
    language: currentLanguage
  })

  return {
    isAiSearching,
    aiSearchError,
    extractedFilters,
    setExtractedFilters,
    isFallbackMode
  }
}
