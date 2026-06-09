import { Tag } from "lucide-react"
import React from "react"

import { ColorPaletteFilter } from "../molecules/ColorPaletteFilter"
import { ModelFiltersRow } from "../molecules/ModelFiltersRow"

interface LibraryFilterAccordionProps {
  isFiltersExpanded: boolean
  expertFeatures: {
    rarity?: boolean
    categories?: boolean
  }
  rarityFilter: string
  setRarityFilter: (rarity: any) => void
  modelFilter: string
  setModelFilter: (model: string) => void
  modelLabel?: string
  modelOptions?: {
    all: string
    v6: string
    v5: string
    niji6: string
    niji5: string
  }
  sortBy: string
  setSortBy: (sort: any) => void
  colorFilter: string
  setColorFilter: (color: any) => void
  colorOptions: Array<{ value: string; label: string; bg: string }>
  colorLabel?: string
  styleCardsCount: number
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  categories: Array<{
    id: string
    name: string
    iconUrl?: string
    iconEmoji?: string
  }>
  setIsCategoryModalOpen: (open: boolean) => void
  allCategoriesLabel?: string
  manageCategoriesTitle?: string
  allRaritiesLabel?: string
  sortByNewestLabel?: string
  sortByOldestLabel?: string
  sortByRarityLabel?: string
  sortByUsageLabel?: string
  sortByColorLabel?: string
}
interface RaritySortFiltersProps {
  expertFeatures: { rarity?: boolean }
  rarityFilter: string
  setRarityFilter: (rarity: any) => void
  sortBy: string
  setSortBy: (sort: any) => void
  allRaritiesLabel: string
  sortByNewestLabel: string
  sortByOldestLabel: string
  sortByRarityLabel: string
  sortByUsageLabel: string
  sortByColorLabel: string
}
export function RaritySortFilters({
  expertFeatures,
  rarityFilter,
  setRarityFilter,
  sortBy,
  setSortBy,
  allRaritiesLabel,
  sortByNewestLabel,
  sortByOldestLabel,
  sortByRarityLabel,
  sortByUsageLabel,
  sortByColorLabel
}: RaritySortFiltersProps) {
  return (
    <div className="flex gap-2">
      {expertFeatures.rarity && (
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value as any)}
          className="flex-1 px-1 py-1 text-[10px] border rounded bg-white">
          <option value="All">{allRaritiesLabel}</option>
          <option value="Common">Common</option>
          <option value="Rare">Rare</option>
          <option value="Epic">Epic</option>
          <option value="Legendary">Legendary</option>
        </select>
      )}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
        className="flex-1 px-1 py-1 text-[10px] border rounded bg-white">
        <option value="newest">{sortByNewestLabel}</option>
        <option value="oldest">{sortByOldestLabel}</option>
        {expertFeatures.rarity && (
          <option value="rarity">{sortByRarityLabel}</option>
        )}
        <option value="usage">{sortByUsageLabel}</option>
        <option value="color">{sortByColorLabel}</option>
      </select>
    </div>
  )
}
interface CategoryFilterButtonProps {
  cat: { id: string; name: string; iconUrl?: string; iconEmoji?: string }
  isSelected: boolean
  onClick: () => void
}
export function CategoryFilterButton({
  cat,
  isSelected,
  onClick
}: CategoryFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
        isSelected
          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
      }`}>
      {cat.iconUrl ? (
        <img
          src={cat.iconUrl}
          className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
          alt={cat.name}
        />
      ) : (
        <span className="text-[11px] leading-none">
          {cat.iconEmoji || "🖼️"}
        </span>
      )}
      <span>{cat.name}</span>
    </button>
  )
}
interface CategoryFiltersRowProps {
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  categories: Array<{
    id: string
    name: string
    iconUrl?: string
    iconEmoji?: string
  }>
  setIsCategoryModalOpen: (open: boolean) => void
  allCategoriesLabel: string
  manageCategoriesTitle: string
}
export function CategoryFiltersRow(props: CategoryFiltersRowProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-0.5 scrollbar-none">
      <button
        onClick={() => props.setCategoryFilter("All")}
        className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
          props.categoryFilter === "All"
            ? "bg-slate-800 border-slate-800 text-white shadow-sm"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
        }`}>
        {props.allCategoriesLabel}
      </button>
      {props.categories.map((cat) => (
        <CategoryFilterButton
          key={cat.id}
          cat={cat}
          isSelected={props.categoryFilter === cat.id}
          onClick={() => props.setCategoryFilter(cat.id)}
        />
      ))}
      <button
        onClick={() => props.setIsCategoryModalOpen(true)}
        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 transition-colors flex-shrink-0"
        title={props.manageCategoriesTitle}>
        <Tag className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
function RarityAndModelFilters(props: LibraryFilterAccordionProps) {
  const {
    expertFeatures,
    allRaritiesLabel = "All Rarities",
    sortByNewestLabel = "Newest",
    sortByOldestLabel = "Oldest",
    sortByRarityLabel = "Rarity",
    sortByUsageLabel = "Usage",
    sortByColorLabel = "Color"
  } = props

  return (
    <>
      <RaritySortFilters
        expertFeatures={expertFeatures}
        rarityFilter={props.rarityFilter}
        setRarityFilter={props.setRarityFilter}
        sortBy={props.sortBy}
        setSortBy={props.setSortBy}
        allRaritiesLabel={allRaritiesLabel}
        sortByNewestLabel={sortByNewestLabel}
        sortByOldestLabel={sortByOldestLabel}
        sortByRarityLabel={sortByRarityLabel}
        sortByUsageLabel={sortByUsageLabel}
        sortByColorLabel={sortByColorLabel}
      />
      <ModelFiltersRow
        modelFilter={props.modelFilter}
        setModelFilter={props.setModelFilter}
        modelLabel={props.modelLabel}
        modelOptions={props.modelOptions}
      />
    </>
  )
}

function ColorAndCategoryFilters(props: LibraryFilterAccordionProps) {
  const {
    expertFeatures,
    allCategoriesLabel = "All",
    manageCategoriesTitle = "Manage Categories"
  } = props

  return (
    <>
      <ColorPaletteFilter
        colorFilter={props.colorFilter}
        setColorFilter={props.setColorFilter}
        colorOptions={props.colorOptions}
        colorLabel={props.colorLabel}
        styleCardsCount={props.styleCardsCount}
      />
      {expertFeatures.categories && (
        <CategoryFiltersRow
          categoryFilter={props.categoryFilter}
          setCategoryFilter={props.setCategoryFilter}
          categories={props.categories}
          setIsCategoryModalOpen={props.setIsCategoryModalOpen}
          allCategoriesLabel={allCategoriesLabel}
          manageCategoriesTitle={manageCategoriesTitle}
        />
      )}
    </>
  )
}

export function LibraryFilterAccordion(props: LibraryFilterAccordionProps) {
  const { isFiltersExpanded } = props
  return (
    <div
      className="transition-all duration-300 ease-in-out overflow-hidden flex flex-col gap-2.5"
      style={{
        maxHeight: isFiltersExpanded ? "500px" : "0px",
        opacity: isFiltersExpanded ? 1 : 0,
        pointerEvents: isFiltersExpanded ? "auto" : "none",
        marginTop: isFiltersExpanded ? "4px" : "0px"
      }}
      data-testid="filters-accordion">
      <RarityAndModelFilters {...props} />
      <ColorAndCategoryFilters {...props} />
    </div>
  )
}
