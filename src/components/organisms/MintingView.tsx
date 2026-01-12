import React from "react"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import { BubbleEditor } from "../bubble/BubbleEditor"
import { RarityTier } from "../../lib/rarity-config"
import { RaritySelector } from "../molecules/RaritySelector"
import { KeywordChip } from "../molecules/KeywordChip"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"

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
}: MintingViewProps) {
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
    <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col">
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

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Custom Name / Note</label>
                <Input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Add details..."
                />
              </div>
            </div>

            <BubbleEditor initialSegments={editedSegments} onChange={setEditedSegments} tier={selectedRarity} />

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