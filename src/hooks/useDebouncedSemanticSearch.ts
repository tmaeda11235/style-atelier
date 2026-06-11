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

  useEffect(() => {
    if (!props.isAiSearch) return setExtractedFilters(null)
    if (props.aiSearchQuery.trim() === "") {
      props.setRarityFilter("All")
      props.setCategoryFilter("All")
      props.setColorFilter("All")
      props.setSearchTag("")
      return setExtractedFilters(null)
    }
    const run = async () => {
      setIsAiSearching(true)
      setAiSearchError(null)
      try {
        const result = await parseSemanticQuery(
          props.aiSearchQuery,
          props.categories
        )
        setExtractedFilters(result)
        props.setRarityFilter(result.rarity)
        props.setCategoryFilter(result.category)
        props.setColorFilter(result.color)
        props.setSearchTag(result.query)
      } catch (err) {
        console.error(err)
        setAiSearchError(props.t.aiSearchError || "AI parsing error")
      } finally {
        setIsAiSearching(false)
      }
    }
    const timer = setTimeout(run, 600)
    return () => clearTimeout(timer)
  }, [
    props.aiSearchQuery,
    props.isAiSearch,
    props.categories,
    props.setCategoryFilter,
    props.setColorFilter,
    props.setRarityFilter,
    props.setSearchTag
  ])

  return { isAiSearching, aiSearchError, extractedFilters, setExtractedFilters }
}
