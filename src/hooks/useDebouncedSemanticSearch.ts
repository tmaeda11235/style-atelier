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
    params.t,
    params.setIsAiSearching,
    params.setAiSearchError,
    params.setExtractedFilters,
    params.language,
    params.webLlmStatus
  ])
}

function fallbackToKeywordSearch(p: EffectParams) {
  p.setExtractedFilters(null)
  p.setRarityFilter("All")
  p.setCategoryFilter("All")
  p.setColorFilter("All")
  p.setSearchTag(p.aiSearchQuery)
}

async function executeSemanticSearch(p: EffectParams) {
  p.setIsAiSearching(true)
  p.setAiSearchError(null)

  if (p.webLlmStatus !== "ready") {
    // Fallback immediately to standard keywords if model is not ready
    fallbackToKeywordSearch(p)
    p.setIsAiSearching(false)
    return
  }

  try {
    const result = await parseSemanticQuery(
      p.aiSearchQuery,
      p.categories,
      p.language
    )
    p.setExtractedFilters(result)
    applyFilters(
      result,
      p.categories,
      p.setRarityFilter,
      p.setCategoryFilter,
      p.setColorFilter,
      p.setSearchTag
    )
  } catch (err) {
    console.error(
      "Semantic query parsing failed, falling back to FlexSearch:",
      err
    )
    p.setAiSearchError(
      p.t.aiSearchError || "AI parsing error (falling back to keyword search)"
    )
    fallbackToKeywordSearch(p)
  } finally {
    p.setIsAiSearching(false)
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
