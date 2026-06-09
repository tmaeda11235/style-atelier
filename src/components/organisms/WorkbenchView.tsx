import { BookUp2 } from "lucide-react"
import React from "react"

import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import { Cauldron } from "./Cauldron"
import { EvolutionSuccessModal } from "./EvolutionSuccessModal"
import { RecipeEditor } from "./RecipeEditor"
import { WorkbenchEmptyState } from "./WorkbenchEmptyState"

interface WorkbenchHeaderProps {
  workbenchCards: StyleCard[]
  clearWorkbench: () => void
  t: any
}

const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  workbenchCards,
  clearWorkbench,
  t
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
      <BookUp2 className="w-5 h-5 text-blue-500" />
      Workbench
    </h2>
    {workbenchCards.length > 0 && (
      <Button
        variant="ghost"
        size="sm"
        onClick={clearWorkbench}
        className="text-slate-400 hover:text-slate-600">
        {t.clearAll}
      </Button>
    )}
  </div>
)

interface RecipeSectionProps {
  isEvolutionMode: boolean
  isMixingMode: boolean
  targetCard: StyleCard | undefined
  canEvolveTarget: boolean | undefined
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
  handleSend: (val: string, label: string) => Promise<void>
  hasParams: boolean
  handleEvolve: () => Promise<void>
  handleMint: () => void
  handleInject: () => void
  isInjecting: boolean
  t: any
  i18n: any
}

const RecipeSection: React.FC<RecipeSectionProps> = (props) => {
  if (props.isEvolutionMode || props.isMixingMode) {
    return (
      <RecipeEditor
        {...props}
        handleMintVariation={props.handleMint}
        handleSendToWorkbench={props.handleSend}
        handleInjectPrompt={props.handleInject}
      />
    )
  }
  return <WorkbenchEmptyState t={props.t} />
}

interface WorkbenchViewProps {
  workbenchCards: StyleCard[]
  handCards: StyleCard[]
  clearWorkbench: () => void
  toggleCardSelection: (id: string) => Promise<void> | void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  handleExtract: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
  handleSend: (val: string, label: string) => Promise<void> | void
  handleEvolve: () => Promise<void>
  handleMint: () => void
  handleInject: () => void
  isMixingMode: boolean
  isBlending: boolean
  isDragOver: boolean
  setIsDragOver: (drag: boolean) => void
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  isEvolutionMode: boolean
  targetCard: StyleCard | undefined
  canEvolveTarget: boolean | undefined
  expertFeatures: any
  editedSegments: PromptSegment[]
  setEditedSegments: (seg: PromptSegment[]) => void
  editedParams: any
  setEditedParams: (p: any) => void
  slots: any[]
  slotValues: Record<string, string>
  handleSlotValueChange: (label: string, value: string) => void
  slotHistory: any
  hasParams: boolean
  isInjecting: boolean
  isEvolutionSuccessOpen: boolean
  setIsEvolutionSuccessOpen: (open: boolean) => void
  evolvedCardData: any
  t: any
  i18n: any
  addLog?: (msg: string) => void
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = (props) => {
  return (
    <div className="flex flex-col h-full bg-white text-slate-900 p-4 space-y-4">
      <WorkbenchHeader
        workbenchCards={props.workbenchCards}
        clearWorkbench={props.clearWorkbench}
        t={props.t}
      />
      <Cauldron
        workbenchCards={props.workbenchCards}
        handCards={props.handCards}
        isMixingMode={props.isMixingMode}
        isBlending={props.isBlending}
        isDragOver={props.isDragOver}
        setIsDragOver={props.setIsDragOver}
        selectedCardId={props.selectedCardId}
        setSelectedCardId={props.setSelectedCardId}
        toggleCardSelection={props.toggleCardSelection}
        updateCardWeight={props.updateCardWeight}
        handleExtractPortion={props.handleExtract}
        addLog={props.addLog}
        t={props.t}
      />
      <div className="flex-1 overflow-y-auto">
        <RecipeSection {...props} />
      </div>
      {props.evolvedCardData && (
        <EvolutionSuccessModal
          isOpen={props.isEvolutionSuccessOpen}
          onClose={() => props.setIsEvolutionSuccessOpen(false)}
          cardName={props.evolvedCardData.name}
          thumbnailData={props.evolvedCardData.thumbnailData}
          selectedThumbnails={props.evolvedCardData.selectedThumbnails}
          oldTier={props.evolvedCardData.oldTier}
          newTier={props.evolvedCardData.newTier}
          translation={{
            title: props.i18n.workbench.evolutionSuccessTitle,
            desc: props.i18n.workbench.evolutionSuccessDesc,
            close: props.i18n.workbench.close
          }}
        />
      )}
    </div>
  )
}
