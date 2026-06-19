import React from "react"

import type { PromptSegment } from "../../../shared/lib/db-schema"
import { PromptBubbleEditor } from "../../organisms/PromptBubbleEditor"

const TIER_COMMON = "Common"

interface PromptEditorSectionProps {
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  t: any
}

export const PromptEditorSection: React.FC<PromptEditorSectionProps> = ({
  editedSegments,
  setEditedSegments,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.promptSegments}
    </label>
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
      <PromptBubbleEditor
        initialSegments={editedSegments}
        onChange={setEditedSegments}
        tier={TIER_COMMON}
      />
    </div>
  </div>
)
