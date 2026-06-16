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
      executeSemanticSearch({
        query: params.aiSearchQuery,
        categories: params.categories,
        setExtractedFilters: params.setExtractedFilters,
        setRarityFilter: params.setRarityFilter,
        setCategoryFilter: params.setCategoryFilter,
        setColorFilter: params.setColorFilter,
        setSearchTag: params.setSearchTag,
        setIsAiSearching: params.setIsAiSearching,
        setAiSearchError: params.setAiSearchError,
        webLlmStatus: params.webLlmStatus,
        setIsFallbackMode: params.setIsFallbackMode,
        language: params.language
      })
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
    params.setIsAiSearching,
    params.setAiSearchError,
    params.setExtractedFilters,
    params.webLlmStatus,
    params.setIsFallbackMode,
    params.language
  ])
}

interface ExecuteSemanticSearchParams {
  query: string
  categories: { id: string; name: string }[]
  setExtractedFilters: (val: any) => void
  setRarityFilter: (val: any) => void
  setCategoryFilter: (val: string) => void
  setColorFilter: (val: any) => void
  setSearchTag: (val: string) => void
  setIsAiSearching: (val: boolean) => void
  setAiSearchError: (val: string | null) => void
  webLlmStatus: string
  setIsFallbackMode: (val: boolean) => void
  language: string
}

async function executeSemanticSearch(params: ExecuteSemanticSearchParams) {
  const {
    query,
    categories,
    setExtractedFilters,
    setRarityFilter,
    setCategoryFilter,
    setColorFilter,
    setSearchTag,
    setIsAiSearching,
    setAiSearchError,
    webLlmStatus,
    setIsFallbackMode,
    language
  } = params

  setIsAiSearching(true)
  setAiSearchError(null)

  let result
  let isFallback = webLlmStatus !== "ready"

  if (isFallback) {
    result = parseSemanticQueryFallback(query, categories)
  } else {
    try {
      result = await parseSemanticQuery(query, categories, language)
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
    categories,
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
