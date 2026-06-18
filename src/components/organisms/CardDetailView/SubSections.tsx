import { AlertCircle, X } from "lucide-react"
import React from "react"

import { Button } from "../../atoms/Button"
import { HelpTooltip } from "../../atoms/HelpTooltip"
import { PromptBubble } from "../../molecules/PromptBubble"
import { RaritySelector } from "../../molecules/RaritySelector"
import type { PromptSegment } from "../../shared/lib/db-schema"
import { PromptBubbleEditor } from "../PromptBubbleEditor"

const CHAR_CLOSE = "✕"

export function HeaderSection({ t, onClose }: { t: any; onClose: () => void }) {
  return (
    <div className="p-4 bg-white shadow-sm flex items-center justify-between border-b">
      <h2 className="text-lg font-bold text-slate-800">{t.cardDetail.title}</h2>
      <Button
        variant="ghost"
        size="xs"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600">
        <X className="w-5 h-5" />
      </Button>
    </div>
  )
}

export function AlertsSection({
  t,
  showRollbackNotice,
  setShowRollbackNotice,
  errorMessage
}: {
  t: any
  showRollbackNotice: boolean
  setShowRollbackNotice: (v: boolean) => void
  errorMessage: string | null
}) {
  return (
    <>
      {showRollbackNotice && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-start gap-1.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{t.cardDetail.rollbackNotice}</span>
          <button
            onClick={() => setShowRollbackNotice(false)}
            className="text-amber-500 hover:text-amber-700 font-bold ml-1">
            {CHAR_CLOSE}
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[11px] flex items-start gap-1.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </>
  )
}

export function PromptRecipeSection({
  t,
  expertFeatures,
  promptSegments,
  setPromptSegments,
  tier
}: {
  t: any
  expertFeatures: any
  promptSegments: PromptSegment[]
  setPromptSegments: (v: PromptSegment[]) => void
  tier: any
}) {
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.cardDetail.promptRecipe}
      </h3>
      {expertFeatures.cardEditing ? (
        <PromptBubbleEditor
          initialSegments={promptSegments}
          onChange={setPromptSegments}
          tier={tier}
        />
      ) : (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[50px] items-start content-start">
          {promptSegments.map((segment, index) => (
            <PromptBubble
              key={index}
              segment={segment}
              tier={segment.type === "text" ? undefined : tier}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SealingOptionsSection({
  t,
  expertFeatures,
  isSrefHidden,
  setIsSrefHidden,
  isPHidden,
  setIsPHidden
}: {
  t: any
  expertFeatures: any
  isSrefHidden: boolean
  setIsSrefHidden: (v: boolean) => void
  isPHidden: boolean
  setIsPHidden: (v: boolean) => void
}) {
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.cardDetail.sealingOptions}
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="detail-hide-sref"
            checked={isSrefHidden}
            onChange={(e) => setIsSrefHidden(e.target.checked)}
            disabled={!expertFeatures.cardEditing}
          />
          <label htmlFor="detail-hide-sref" className="text-xs text-slate-600">
            {t.cardDetail.hideSref}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="detail-hide-p"
            checked={isPHidden}
            onChange={(e) => setIsPHidden(e.target.checked)}
            disabled={!expertFeatures.cardEditing}
          />
          <label htmlFor="detail-hide-p" className="text-xs text-slate-600">
            {t.cardDetail.hideP}
          </label>
        </div>
      </div>
    </div>
  )
}

export function RaritySection({
  t,
  expertFeatures,
  tier,
  setTier
}: {
  t: any
  expertFeatures: any
  tier: any
  setTier: (v: any) => void
}) {
  if (!expertFeatures.rarity) {
    return null
  }
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
      <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.cardDetail.rarityFrame}
        <HelpTooltip content={t.helpTooltips.rarity} position="top-left" />
      </h3>
      <RaritySelector selected={tier} onSelect={setTier} />
    </div>
  )
}
