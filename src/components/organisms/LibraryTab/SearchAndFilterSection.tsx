import React from "react"

import { LibraryFilterAccordion } from "../LibraryFilterAccordion"
import { LibrarySearchBar } from "../LibrarySearchBar"

interface SearchAndFilterSectionProps {
  lib: any
  isFiltersExpanded: boolean
  setIsFiltersExpanded: (v: boolean) => void
  expertFeatures: boolean
  setIsCategoryModalOpen: (v: boolean) => void
  t: any
}

function buildFilterProps(
  lib: any,
  isFiltersExpanded: boolean,
  setIsFiltersExpanded: (v: boolean) => void,
  expertFeatures: boolean,
  setIsCategoryModalOpen: (v: boolean) => void,
  t: any
) {
  return {
    isFiltersExpanded,
    setIsFiltersExpanded,
    expertFeatures,
    rarityFilter: lib.rarityFilter,
    setRarityFilter: lib.setRarityFilter,
    modelFilter: lib.modelFilter,
    setModelFilter: lib.setModelFilter,
    sortBy: lib.sortBy,
    setSortBy: lib.setSortBy,
    colorFilter: lib.colorFilter,
    setColorFilter: lib.setColorFilter,
    colorHueFilter: lib.colorHueFilter,
    setColorHueFilter: lib.setColorHueFilter,
    colorLabel: t.colorLabel,
    modelLabel: t.modelLabel,
    modelOptions: t.models,
    styleCardsCount: lib.styleCards?.length || 0,
    categoryFilter: lib.categoryFilter,
    setCategoryFilter: lib.setCategoryFilter,
    categories: lib.categories,
    setIsCategoryModalOpen,
    allCategoriesLabel: t.allCategories,
    manageCategoriesTitle: t.manageCategories,
    allRaritiesLabel: t.allRarities,
    sortByNewestLabel: t.sortBy?.newest,
    sortByOldestLabel: t.sortBy?.oldest,
    sortByRarityLabel: t.sortBy?.rarity,
    sortByUsageLabel: t.sortBy?.usage,
    sortByColorLabel: t.sortBy?.color,
    moveCardToCategory: lib.moveCardToCategory
  }
}

export function SearchAndFilterSection({
  lib,
  isFiltersExpanded,
  setIsFiltersExpanded,
  expertFeatures,
  setIsCategoryModalOpen,
  t
}: SearchAndFilterSectionProps) {
  const filterProps = buildFilterProps(
    lib,
    isFiltersExpanded,
    setIsFiltersExpanded,
    expertFeatures,
    setIsCategoryModalOpen,
    t
  )

  return (
    <>
      <LibrarySearchBar
        categories={lib.categories}
        allSrefs={lib.allSrefs}
        searchTag={lib.searchTag}
        setSearchTag={lib.setSearchTag}
        setRarityFilter={lib.setRarityFilter}
        setCategoryFilter={lib.setCategoryFilter}
        setColorFilter={lib.setColorFilter}
        isFiltersExpanded={isFiltersExpanded}
        setIsFiltersExpanded={setIsFiltersExpanded}
        activeFiltersCount={lib.activeFiltersCount}
        sortBy={lib.sortBy}
        setSortBy={lib.setSortBy}
        isAiSearch={lib.isAiSearch}
        setIsAiSearch={lib.setIsAiSearch}
      />
      <LibraryFilterAccordion {...filterProps} />
    </>
  )
}
