import React from "react"

const DEFAULT_ICON_EMOJI = "🖼️"

interface CategorySelectProps {
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  categoriesList: any[]
  t: any
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  selectedCategory,
  setSelectedCategory,
  categoriesList,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.categoryRequired}
    </label>
    <select
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="w-full text-xs border border-slate-200 rounded-xl bg-white p-2 h-9 font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
      {categoriesList.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.iconEmoji || DEFAULT_ICON_EMOJI}{" "}
          {(t.defaultCategories as Record<string, string>)[cat.id] || cat.name}
        </option>
      ))}
    </select>
  </div>
)
