import React from "react"

import type { PromptSegment, StyleCard } from "../../shared/lib/db-schema"
import { RecipeForm } from "./RecipeForm"
import { SlotVariablesSection } from "./SlotVariablesSection"

interface RecipeEditorProps {
  isEvolutionMode: boolean
  isMixingMode: boolean
  targetCard: StyleCard | undefined
  canEvolveTarget: boolean | undefined
  t: any
  i18n: any
  expertFeatures: any
  editedSegments: PromptSegment[]
  setEditedSegments: (seg: PromptSegment[]) => void
  editedParams: any
  setEditedParams: (p: any) => void
  slots: any[]
  slotValues: Record<string, string>
  handleSlotValueChange: (label: string, value: string) => void
  slotHistory: any
  handCards: StyleCard[]
  handleSendToWorkbench: (val: string, label: string) => Promise<void>
  hasParams: boolean
  handleEvolve: () => Promise<void>
  handleMintVariation: () => void
  handleInjectPrompt: () => void
  isInjecting: boolean
}

export const RecipeEditor: React.FC<RecipeEditorProps> = (props) => {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 editor-container text-slate-800 dark:text-slate-200">
        <RecipeForm {...props} />
        {props.expertFeatures.slot && (
          <SlotVariablesSection
            slots={props.slots}
            slotValues={props.slotValues}
            onSlotValueChange={props.handleSlotValueChange}
            slotHistory={props.slotHistory}
            handCards={props.handCards}
            onSendToWorkbench={props.handleSendToWorkbench}
          />
        )}
      </div>
    </div>
  )
}
