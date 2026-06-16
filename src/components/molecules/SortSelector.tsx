import React from "react"

interface SortSelectorProps {
  sortBy: string
  setSortBy: (val: any) => void
  expertFeatures: { rarity?: boolean }
  t: any
  disabled: boolean
}

export function SortSelector({
  sortBy,
  setSortBy,
  expertFeatures,
  t,
  disabled
}: SortSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
      <span className="font-semibold text-slate-500 dark:text-slate-400">
        {t.sortByLabel || "Sort:"}
      </span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        disabled={disabled}
        className="px-1.5 py-0.5 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer font-bold">
        <option value="custom">{t.sortBy?.custom || "Custom"}</option>
        <option value="newest">{t.sortBy?.newest || "Newest"}</option>
        <option value="oldest">{t.sortBy?.oldest || "Oldest"}</option>
        {expertFeatures.rarity && (
          <option value="rarity">{t.sortBy?.rarity || "Rarity"}</option>
        )}
        <option value="usage">{t.sortBy?.usage || "Usage"}</option>
        <option value="color">{t.sortBy?.color || "Color"}</option>
      </select>
    </div>
  )
}
