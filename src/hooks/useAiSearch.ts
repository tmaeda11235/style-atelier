import { useState } from "react"

import { useDebouncedSemanticSearch } from "./useDebouncedSemanticSearch"

interface UseAiSearchProps {
  categories: { id: string; name: string }[]
  setRarityFilter: (val: any) => void
  setCategoryFilter: (val: string) => void
  setColorFilter: (val: any) => void
  setSearchTag: (val: string) => void
  webLlmStatus: string
  t: any
  isAiSearch: boolean
  setIsAiSearch: (val: boolean) => void
}

export function useAiSearch(props: UseAiSearchProps) {
  const { isAiSearch, setIsAiSearch } = props
  const [aiSearchQuery, setAiSearchQuery] = useState("")

  const {
    isAiSearching,
    aiSearchError,
    extractedFilters,
    setExtractedFilters
  } = useDebouncedSemanticSearch({
    aiSearchQuery,
    isAiSearch,
    categories: props.categories,
    setRarityFilter: props.setRarityFilter,
    setCategoryFilter: props.setCategoryFilter,
    setColorFilter: props.setColorFilter,
    setSearchTag: props.setSearchTag,
    t: props.t
  })

  const handleToggleAiSearch = () => {
    if (isAiSearch) {
      setIsAiSearch(false)
      setAiSearchQuery("")
      props.setRarityFilter("All")
      props.setCategoryFilter("All")
      props.setColorFilter("All")
      props.setSearchTag("")
      setExtractedFilters(null)
    } else {
      setIsAiSearch(true)
    }
  }

  return {
    isAiSearch,
    aiSearchQuery,
    setAiSearchQuery,
    isAiSearching,
    aiSearchError,
    extractedFilters,
    handleToggleAiSearch
  }
}
