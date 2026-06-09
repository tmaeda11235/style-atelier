import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useCategories } from "../../hooks/useCategories"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"
import { PromptBubbleEditor } from "./PromptBubbleEditor"

interface SimpleMintingViewProps {
  mintingItem: HistoryItem | null
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  suggestedKeywords: string[]
  selectedKeywords: string[]
  setSelectedKeywords: (keywords: string[]) => void
  customName: string
  setCustomName: (name: string) => void
  selectedCategory?: string
  setSelectedCategory?: (category: string) => void
}

/**
 * SimpleMintingView component
 * Streamlined, elegant card-creation view designed specifically for Easy Mode.
 * It features a minimal input form (Card Name, Prompt, and Category) to speed up card minting.
 */
export function SimpleMintingView({
  mintingItem,
  editedSegments,
  setEditedSegments,
  onCancelMinting,
  onSaveMintedCard,
  suggestedKeywords,
  selectedKeywords,
  setSelectedKeywords,
  customName,
  setCustomName,
  selectedCategory = "",
  setSelectedCategory = () => {}
}: SimpleMintingViewProps) {
  const categoriesList = useCategories()
  const { t } = useLanguage()
  const { advanceIfStep } = useTutorial()

  // Ensure a category is always selected if categories exist
  React.useEffect(() => {
    if (categoriesList.length > 0 && !selectedCategory) {
      setSelectedCategory(categoriesList[0].id)
    }
  }, [categoriesList, selectedCategory, setSelectedCategory])

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword))
    } else {
      setSelectedKeywords([...selectedKeywords, keyword])
    }
    advanceIfStep("title-input")
  }

  const currentName =
    selectedKeywords.length > 0
      ? `${selectedKeywords.join(" ")}${customName ? ` (${customName})` : ""}`
      : customName || t.minting.newCardDefault

  return (
    <div
      data-testid="simple-minting-view-container"
      className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight">
              {t.minting.quickCardCreator}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {t.minting.mintInstantly}
            </p>
          </div>
          <span className="text-xs bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">
            {t.minting.easyMode}
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mintingItem && (
            <>
              {/* Thumbnail Preview */}
              <div className="relative group rounded-xl overflow-hidden shadow-md border border-slate-100 aspect-video bg-slate-950">
                <img
                  src={mintingItem.imageUrl}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  alt={t.minting.preview}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
              </div>

              {/* Identity Form */}
              <div className="space-y-3">
                {/* Auto Name Suggestions */}
                {suggestedKeywords.length > 0 && (
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
                )}

                {/* Custom Card Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t.minting.cardName}
                  </label>
                  <Input
                    type="text"
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value)
                      advanceIfStep("title-input")
                    }}
                    placeholder={t.minting.enterCustomName}
                    className="h-9 text-xs focus-visible:ring-blue-600 rounded-xl"
                  />
                  <div className="mt-1.5 text-xs text-slate-500 font-medium">
                    {t.minting.preview}:{" "}
                    <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100/80 inline-block mt-0.5">
                      {currentName}
                    </span>
                  </div>
                </div>

                {/* Category Dropdown (Required) */}
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
                        {cat.iconEmoji || "🖼️"} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prompt Bubble Editor */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {t.minting.promptSegments}
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                  <PromptBubbleEditor
                    initialSegments={editedSegments}
                    onChange={setEditedSegments}
                    tier="Common"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={onCancelMinting}
            className="h-9 text-xs rounded-xl hover:bg-slate-200/50">
            {t.minting.cancel}
          </Button>
          <Button
            onClick={onSaveMintedCard}
            className="h-9 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 font-bold px-4">
            {t.minting.saveToLibrary}
          </Button>
        </div>
      </div>
    </div>
  )
}
