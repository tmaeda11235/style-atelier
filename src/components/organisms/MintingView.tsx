import React from "react"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import { BubbleEditor } from "../bubble/BubbleEditor"

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
}: MintingViewProps) {
  return (
    <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col">
      <div className="p-4 bg-white shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Mint New Card</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {mintingItem && (
          <>
            <img src={mintingItem.imageUrl} className="w-full h-auto rounded-lg mb-4 shadow-md" />
            <BubbleEditor initialSegments={editedSegments} onChange={setEditedSegments} />
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
        <button
          onClick={onCancelMinting}
          className="px-4 py-2 text-sm text-slate-600 rounded-md hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          onClick={onSaveMintedCard}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600"
        >
          Save Card
        </button>
      </div>
    </div>
  )
}