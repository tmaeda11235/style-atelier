import React from "react"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import { PromptBubbleEditor } from "./PromptBubbleEditor"
import type { RarityTier } from "../../lib/rarity-config"
import { RaritySelector } from "../molecules/RaritySelector"
import { KeywordChip } from "../molecules/KeywordChip"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"
import { useHand } from "../../hooks/useHand"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../../lib/db"

interface MintingViewProps {
  mintingItem: HistoryItem | null
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  isSrefHidden: boolean
  setIsSrefHidden: (hidden: boolean) => void
  isPHidden: boolean
  setIsPHidden: (hidden: boolean) => void
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  selectedRarity: RarityTier
  setSelectedRarity: (rarity: RarityTier) => void
  // Auto-naming props
  suggestedKeywords: string[]
  selectedKeywords: string[]
  setSelectedKeywords: (keywords: string[]) => void
  customName: string
  setCustomName: (name: string) => void
  // Custom Category, Tags, and Colors props
  selectedCategory?: string
  setSelectedCategory?: (category: string) => void
  customTags?: string[]
  setCustomTags?: (tags: string[]) => void
  detectedDominantColor?: string
  detectedAccentColor?: string
  detectedColorTags?: string[]
}

export function MintingView({
  mintingItem,
  editedSegments,
  setEditedSegments,
  isSrefHidden,
  setIsSrefHidden,
  isPHidden,
  setIsPHidden,
  onCancelMinting,
  onSaveMintedCard,
  selectedRarity,
  setSelectedRarity,
  suggestedKeywords,
  selectedKeywords,
  setSelectedKeywords,
  customName,
  setCustomName,
  selectedCategory = "",
  setSelectedCategory = () => {},
  customTags = [],
  setCustomTags = () => {},
  detectedDominantColor = "#ffffff",
  detectedAccentColor = "#ffffff",
  detectedColorTags = [],
}: MintingViewProps) {
  const { pinnedCards } = useHand()
  const hasPinnedCards = pinnedCards.length > 0

  const categoriesList = useLiveQuery(() => db.categories.toArray()) || []

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword))
    } else {
      setSelectedKeywords([...selectedKeywords, keyword])
    }
  }

  const currentName =
    selectedKeywords.length > 0
      ? `${selectedKeywords.join(" ")}${customName ? ` (${customName})` : ""}`
      : customName || "New Card"

  return (
    <div
      data-testid="minting-view-container"
      className={`absolute inset-0 bg-slate-50 z-20 flex flex-col ${hasPinnedCards ? "pb-[110px]" : ""}`}
    >
      <div className="p-4 bg-white shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Mint New Card</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {mintingItem && (
          <>
            <img src={mintingItem.imageUrl} className="w-full h-auto rounded-lg mb-4 shadow-md" />

            <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider">Card Identity</h3>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Preview Name</label>
                <div className="p-2 bg-slate-100 rounded border text-sm font-bold text-slate-800 min-h-[2.5rem] flex items-center">
                  {currentName}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-2">Select Keywords</label>
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map((kw, i) => (
                    <KeywordChip
                      key={i}
                      label={kw}
                      isSelected={selectedKeywords.includes(kw)}
                      onClick={() => toggleKeyword(kw)}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Custom Name / Note</label>
                <Input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Add details..."
                />
              </div>

              {/* Category Dropdown */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-sm border rounded bg-white p-2"
                >
                  <option value="">No Category</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.iconEmoji || "🖼️"} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Tags Section */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Custom Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {customTags.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-100"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => setCustomTags(customTags.filter((tag) => tag !== t))}
                        className="text-blue-400 hover:text-red-500 text-[10px]"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {customTags.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No custom tags added.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    id="custom-tag-input"
                    placeholder="Press enter to add..."
                    className="text-xs py-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const input = e.currentTarget
                        const trimmed = input.value.trim().toLowerCase()
                        if (trimmed && !customTags.includes(trimmed)) {
                          setCustomTags([...customTags, trimmed])
                          input.value = ""
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      const input = document.getElementById("custom-tag-input") as HTMLInputElement
                      if (input) {
                        const trimmed = input.value.trim().toLowerCase()
                        if (trimmed && !customTags.includes(trimmed)) {
                          setCustomTags([...customTags, trimmed])
                          input.value = ""
                        }
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Dominant and Accent Color Palette preview */}
              <div className="mb-2">
                <label className="block text-xs font-medium text-slate-500 mb-2">Detected Palette</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: detectedDominantColor }}
                      title="Dominant Color"
                    />
                    <span className="text-xs font-bold text-slate-700">Dominant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: detectedAccentColor }}
                      title="Accent Color"
                    />
                    <span className="text-xs font-bold text-slate-700">Accent</span>
                  </div>
                  {detectedColorTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {detectedColorTags.map((colName, i) => (
                        <span
                          key={i}
                          className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold"
                        >
                          🎨 {colName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <PromptBubbleEditor initialSegments={editedSegments} onChange={setEditedSegments} tier={selectedRarity} />

            <div className="mt-6 p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider">Rarity & Frame</h3>
              <RaritySelector
                selected={selectedRarity}
                onSelect={setSelectedRarity}
              />
            </div>
          </>
        )}
        <div className="mt-4 p-4 border rounded-lg bg-white">
          <h3 className="text-sm font-bold mb-2">Sealing Options</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hide-sref"
              checked={isSrefHidden}
              onChange={(e) => setIsSrefHidden(e.target.checked)}
            />
            <label htmlFor="hide-sref" className="text-sm">
              Hide --sref when sharing
            </label>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="hide-p"
              checked={isPHidden}
              onChange={(e) => setIsPHidden(e.target.checked)}
            />
            <label htmlFor="hide-p" className="text-sm">
              Hide --p when sharing
            </label>
          </div>
        </div>
      </div>
      <div className="p-4 bg-white shadow-t-sm flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onCancelMinting}
        >
          Cancel
        </Button>
        <Button
          onClick={onSaveMintedCard}
        >
          Save Card
        </Button>
      </div>
    </div>
  )
}