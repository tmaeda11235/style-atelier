import { Tag } from "lucide-react"
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"

function useCategoryDrop(
  categoryId: string | null,
  moveCardToCategory?: (
    cardId: string,
    categoryId: string | null
  ) => Promise<void>
) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const cardId = e.dataTransfer.getData("cardId")
    if (cardId && moveCardToCategory) {
      await moveCardToCategory(cardId, categoryId)
    }
  }

  return {
    isOver,
    dragProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  }
}

export function CategoryFilterButton({
  cat,
  isSelected,
  onClick,
  moveCardToCategory
}: {
  cat: { id: string; name: string; iconUrl?: string; iconEmoji?: string }
  isSelected: boolean
  onClick: () => void
  moveCardToCategory?: (
    cardId: string,
    categoryId: string | null
  ) => Promise<void>
}) {
  const { isOver, dragProps } = useCategoryDrop(cat.id, moveCardToCategory)
  const { t } = useLanguage()
  const displayName =
    (t.defaultCategories as Record<string, string>)[cat.id] || cat.name

  const emojiText = cat.iconEmoji || t.parameterArrayEditor.imageEmoji
  const imageOrEmoji = cat.iconUrl ? (
    <img
      src={cat.iconUrl}
      className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
      alt={displayName}
    />
  ) : (
    <span className="text-[11px] leading-none">{emojiText}</span>
  )

  const isOverStyle = isOver
    ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900 bg-blue-50 dark:bg-blue-950 scale-105"
    : ""

  return (
    <button
      onClick={onClick}
      {...dragProps}
      data-testid={`category-filter-btn-${cat.id}`}
      className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
        isSelected
          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
          : "bg-surface border-border-primary text-text-secondary hover:border-border-primary/80 hover:bg-surface-hover"
      } ${isOverStyle}`}>
      {imageOrEmoji}
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
  moveCardToCategory?: (
    cardId: string,
    categoryId: string | null
  ) => Promise<void>
}

export function CategoryFiltersRow(props: CategoryFiltersRowProps) {
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab
  const { isOver: isOverAll, dragProps: dragPropsAll } = useCategoryDrop(
    null,
    props.moveCardToCategory
  )

  const isOverStyle = isOverAll
    ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900 bg-blue-50 dark:bg-blue-950 scale-105"
    : ""

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
        {t.category}
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-0.5 scrollbar-none">
        <button
          onClick={() => props.setCategoryFilter("All")}
          {...dragPropsAll}
          data-testid="category-filter-btn-all"
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
            props.categoryFilter === "All"
              ? "bg-text-primary border-text-primary text-surface shadow-sm"
              : "bg-surface border-border-primary text-text-secondary hover:border-border-primary/80 hover:bg-surface-hover"
          } ${isOverStyle}`}>
          {props.allCategoriesLabel}
        </button>
        {props.categories.map((cat) => (
          <CategoryFilterButton
            key={cat.id}
            cat={cat}
            isSelected={props.categoryFilter === cat.id}
            onClick={() => props.setCategoryFilter(cat.id)}
            moveCardToCategory={props.moveCardToCategory}
          />
        ))}
        <button
          onClick={() => props.setIsCategoryModalOpen(true)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-dashed border-border-primary transition-colors flex-shrink-0"
          title={props.manageCategoriesTitle}>
          <Tag className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
