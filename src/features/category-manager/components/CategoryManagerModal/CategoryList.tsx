import { Edit2, Trash2 } from "lucide-react"
import React from "react"

import type { CustomCategory } from "../../../../shared/lib/db-schema"

interface CategoryListProps {
  t: any
  categories: CustomCategory[]
  systemCategoryIds: string[]
  handleStartEdit: (cat: CustomCategory) => void
  handleDelete: (id: string, name: string) => void
}

function CategoryItemInfo({
  cat,
  t,
  isSystem
}: {
  cat: CustomCategory
  t: any
  isSystem: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
        {cat.iconUrl ? (
          <img
            src={cat.iconUrl}
            className="w-full h-full object-cover"
            alt={cat.name}
          />
        ) : (
          <span className="text-sm leading-none">{cat.iconEmoji || "📁"}</span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-700 leading-tight">
          {cat.name}
        </p>
        {isSystem && (
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
            {t.systemDefault}
          </span>
        )}
      </div>
    </div>
  )
}

function CategoryItemActions({
  cat,
  t,
  handleStartEdit,
  handleDelete
}: {
  cat: CustomCategory
  t: any
  handleStartEdit: (cat: CustomCategory) => void
  handleDelete: (id: string, name: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleStartEdit(cat)}
        className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        title={t.editTooltip}>
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleDelete(cat.id, cat.name)}
        className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        title={t.deleteTooltip}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function CategoryItem({
  cat,
  t,
  systemCategoryIds,
  handleStartEdit,
  handleDelete
}: {
  cat: CustomCategory
  t: any
  systemCategoryIds: string[]
  handleStartEdit: (cat: CustomCategory) => void
  handleDelete: (id: string, name: string) => void
}) {
  const isSystem = systemCategoryIds.includes(cat.id)
  return (
    <div className="flex items-center justify-between p-2 border rounded-lg bg-white shadow-sm border-slate-100 hover:border-slate-200 transition-all">
      <CategoryItemInfo cat={cat} t={t} isSystem={isSystem} />
      {!isSystem && (
        <CategoryItemActions
          cat={cat}
          t={t}
          handleStartEdit={handleStartEdit}
          handleDelete={handleDelete}
        />
      )}
    </div>
  )
}

export function CategoryList({
  t,
  categories,
  systemCategoryIds,
  handleStartEdit,
  handleDelete
}: CategoryListProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500 mb-3">{t.listDescription}</p>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <CategoryItem
            key={cat.id}
            cat={cat}
            t={t}
            systemCategoryIds={systemCategoryIds}
            handleStartEdit={handleStartEdit}
            handleDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
