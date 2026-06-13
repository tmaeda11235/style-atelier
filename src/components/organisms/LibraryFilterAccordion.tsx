import { Tag, X } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { ColorPaletteFilter } from "../molecules/ColorPaletteFilter"
import { HueSliderFilter } from "../molecules/HueSliderFilter"
import { ModelFiltersRow } from "../molecules/ModelFiltersRow"

interface LibraryFilterAccordionProps {
  isFiltersExpanded: boolean
  setIsFiltersExpanded: (open: boolean) => void
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
  colorHueFilter: number | null
  setColorHueFilter: (hue: number | null) => void
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
  allRaritiesLabel: string
}

export function RaritySortFilters({
  expertFeatures,
  rarityFilter,
  setRarityFilter,
  allRaritiesLabel
}: RaritySortFiltersProps) {
  if (!expertFeatures.rarity) return null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
        Rarity
      </span>
      <select
        value={rarityFilter}
        onChange={(e) => setRarityFilter(e.target.value as any)}
        className="w-full px-2 py-1.5 text-[11px] font-bold border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
        <option value="All">{allRaritiesLabel}</option>
        <option value="Common">Common</option>
        <option value="Rare">Rare</option>
        <option value="Epic">Epic</option>
        <option value="Legendary">Legendary</option>
      </select>
    </div>
  )
}

export function CategoryFilterButton({
  cat,
  isSelected,
  onClick
}: {
  cat: { id: string; name: string; iconUrl?: string; iconEmoji?: string }
  isSelected: boolean
  onClick: () => void
}) {
  const { t } = useLanguage()
  const displayName =
    (t.defaultCategories as Record<string, string>)[cat.id] || cat.name

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
          alt={displayName}
        />
      ) : (
        <span className="text-[11px] leading-none">
          {cat.iconEmoji || "🖼️"}
        </span>
      )}
      <span>{displayName}</span>
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
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
        Category
      </span>
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
    </div>
  )
}

function RarityAndModelFilters(props: LibraryFilterAccordionProps) {
  const { expertFeatures, allRaritiesLabel = "All Rarities" } = props

  return (
    <div className="flex flex-col gap-4">
      <RaritySortFilters
        expertFeatures={expertFeatures}
        rarityFilter={props.rarityFilter}
        setRarityFilter={props.setRarityFilter}
        allRaritiesLabel={allRaritiesLabel}
      />
      <ModelFiltersRow
        modelFilter={props.modelFilter}
        setModelFilter={props.setModelFilter}
        modelLabel={props.modelLabel}
        modelOptions={props.modelOptions}
      />
    </div>
  )
}

interface ColorAndCategoryFiltersProps extends LibraryFilterAccordionProps {
  colorOptions: Array<{ value: string; label: string; bg: string }>
}

function ColorAndCategoryFilters(props: ColorAndCategoryFiltersProps) {
  const {
    expertFeatures,
    allCategoriesLabel = "All",
    manageCategoriesTitle = "Manage Categories",
    colorOptions
  } = props

  return (
    <div className="flex flex-col gap-4">
      <ColorPaletteFilter
        colorFilter={props.colorFilter}
        setColorFilter={(color) => {
          props.setColorFilter(color)
          props.setColorHueFilter(null)
        }}
        colorOptions={colorOptions}
        colorLabel={props.colorLabel}
        styleCardsCount={props.styleCardsCount}
      />

      <HueSliderFilter
        colorHueFilter={props.colorHueFilter}
        setColorHueFilter={props.setColorHueFilter}
        setColorFilter={props.setColorFilter}
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
    </div>
  )
}

function getColorOptions(t: any) {
  return [
    {
      value: "All",
      label: t.colors?.all || "All Colors",
      bg: "linear-gradient(45deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)"
    },
    { value: "Red", label: t.colors?.red || "Red", bg: "#ef4444" },
    { value: "Orange", label: t.colors?.orange || "Orange", bg: "#f97316" },
    { value: "Yellow", label: t.colors?.yellow || "Yellow", bg: "#eab308" },
    { value: "Green", label: t.colors?.green || "Green", bg: "#22c55e" },
    { value: "Cyan", label: t.colors?.cyan || "Cyan", bg: "#06b6d4" },
    { value: "Blue", label: t.colors?.blue || "Blue", bg: "#3b82f6" },
    { value: "Purple", label: t.colors?.purple || "Purple", bg: "#a855f7" },
    { value: "Pink", label: t.colors?.pink || "Pink", bg: "#ec4899" },
    { value: "Brown", label: t.colors?.brown || "Brown", bg: "#78350f" },
    { value: "White", label: t.colors?.white || "White", bg: "#ffffff" },
    { value: "Gray", label: t.colors?.gray || "Gray", bg: "#6b7280" },
    { value: "Black", label: t.colors?.black || "Black", bg: "#09090b" }
  ]
}

export function LibraryFilterAccordion(props: LibraryFilterAccordionProps) {
  const { isFiltersExpanded, setIsFiltersExpanded } = props
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab

  const colorOptions = getColorOptions(t)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300 ease-in-out"
      style={{
        opacity: isFiltersExpanded ? 1 : 0,
        pointerEvents: isFiltersExpanded ? "auto" : "none",
        maxHeight: isFiltersExpanded ? "500px" : "0px" // Retain for E2E tests compatibility
      }}
      data-testid="filters-accordion">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] cursor-pointer"
        onClick={() => setIsFiltersExpanded(false)}
      />

      {/* Slide-up Modal Sheet */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] transition-transform duration-300 ease-out z-10"
        style={{
          transform: isFiltersExpanded ? "translateY(0)" : "translateY(100%)"
        }}>
        {/* Visual Drag Handle */}
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-2.5 flex-shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 dark:border-slate-850 flex-shrink-0">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            {t.filtersTitle || "Detailed Filters"}
          </h3>
          <button
            onClick={() => setIsFiltersExpanded(false)}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            data-testid="close-filters-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filters Body */}
        <div className="overflow-y-auto p-4 flex flex-col gap-5 pb-8">
          <RarityAndModelFilters {...props} />
          <ColorAndCategoryFilters {...props} colorOptions={colorOptions} />
        </div>
      </div>
    </div>
  )
}
