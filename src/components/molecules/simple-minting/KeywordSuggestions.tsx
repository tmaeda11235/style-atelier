import React from "react"

interface KeywordSuggestionsProps {
  suggestedKeywords: string[]
  selectedKeywords: string[]
  toggleKeyword: (kw: string) => void
  t: any
}

export const KeywordSuggestions: React.FC<KeywordSuggestionsProps> = ({
  suggestedKeywords,
  selectedKeywords,
  toggleKeyword,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.quickKeywords}
    </label>
    <div className="flex flex-wrap gap-1">
      {suggestedKeywords.map((kw, i) => {
        const isSelected = selectedKeywords.includes(kw)
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggleKeyword(kw)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-150 ${
              isSelected
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}>
            {kw}
          </button>
        )
      })}
    </div>
  </div>
)
