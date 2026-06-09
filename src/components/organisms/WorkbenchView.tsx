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
  pickRandomCards: () => void
  t: any
}

const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  workbenchCards,
  clearWorkbench,
  pickRandomCards,
  t
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
      <BookUp2 className="w-5 h-5 text-blue-500" />
      Workbench
    </h2>
    <div className="flex items-center gap-2">
      <button
        onClick={pickRandomCards}
        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full text-[10px] font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
        title="Pick 1-3 random styles from library"
        id="workbench-gacha-btn"
        data-testid="workbench-gacha-btn"
        type="button">
        <span>🔮</span>
        <span>Gacha Pick</span>
      </button>
      {workbenchCards.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearWorkbench}
          className="text-slate-400 hover:text-slate-600 text-[10px] h-6 px-2">
          {t.clearAll || "Clear"}
        </Button>
      )}
    </div>
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
  pickRandomCards: () => void
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
        pickRandomCards={props.pickRandomCards}
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
