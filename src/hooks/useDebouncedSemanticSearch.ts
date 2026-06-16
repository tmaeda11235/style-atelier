import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

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
  webLlmStatus?: string
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
  language: string
  webLlmStatus?: string
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
        params.t,
        params.language,
        params.webLlmStatus
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
    params.t,
    params.setIsAiSearching,
    params.setAiSearchError,
    params.setExtractedFilters,
    params.language,
    params.webLlmStatus
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
  t: any,
  language: string,
  webLlmStatus?: string
) {
  setIsAiSearching(true)
  setAiSearchError(null)

  if (webLlmStatus !== "ready") {
    // Fallback immediately to standard keywords if model is not ready
    setExtractedFilters(null)
    setRarityFilter("All")
    setCategoryFilter("All")
    setColorFilter("All")
    setSearchTag(query)
    setIsAiSearching(false)
    return
  }

  try {
    const result = await parseSemanticQuery(query, categories, language)
    setExtractedFilters(result)
    applyFilters(
      result,
      categories,
      setRarityFilter,
      setCategoryFilter,
      setColorFilter,
      setSearchTag
    )
  } catch (err) {
    console.error(
      "Semantic query parsing failed, falling back to FlexSearch:",
      err
    )
    setAiSearchError(
      t.aiSearchError || "AI parsing error (falling back to keyword search)"
    )
    setExtractedFilters(null)
    setRarityFilter("All")
    setCategoryFilter("All")
    setColorFilter("All")
    setSearchTag(query)
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
    t: props.t,
    setIsAiSearching,
    setAiSearchError,
    setExtractedFilters,
    language: currentLanguage,
    webLlmStatus: props.webLlmStatus
  })

  return { isAiSearching, aiSearchError, extractedFilters, setExtractedFilters }
}
