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
}

export function useAiSearch(props: UseAiSearchProps) {
  const [isAiSearch, setIsAiSearch] = useState(false)
  const [aiSearchQuery, setAiSearchQuery] = useState("")
  const [aiWarningOpen, setAiWarningOpen] = useState(false)
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
    t: props.t,
    webLlmStatus: props.webLlmStatus
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
    aiWarningOpen,
    setAiWarningOpen,
    extractedFilters,
    handleToggleAiSearch
  }
}
