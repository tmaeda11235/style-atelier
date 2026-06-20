import React from "react"

import type {
  PromptSegment,
  RecipeHistoryItem,
  StyleCard
} from "../../shared/lib/db-schema"
import { Cauldron } from "./Cauldron"
import { EvolutionSuccessModal } from "./EvolutionSuccessModal"
import { RecipeEditor } from "./RecipeEditor"
import { WorkbenchEmptyState } from "./WorkbenchEmptyState"
import { WorkbenchHeader } from "./WorkbenchHeader"

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
  handleSend: (val: string, label: string) => Promise<void> | void
  hasParams: boolean
  handleEvolve: () => Promise<void>
  handleMint: () => void
  handleInject: () => void
  isInjecting: boolean
  t: any
  i18n: any
  isDragOver: boolean
  setIsDragOver: (drag: boolean) => void
  toggleCardSelection: (id: string) => Promise<void> | void
  addLog?: (msg: string) => void
}

const RecipeSection: React.FC<RecipeSectionProps> = (props) => {
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    props.setIsDragOver(false)
    const cardId = e.dataTransfer.getData("cardId")
    if (cardId && !props.handCards.find((c) => c.id === cardId)) {
      await props.toggleCardSelection(cardId)
      props.addLog?.(`Card dragged and dropped to Workbench empty state`)
    }
  }

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
  return (
    <WorkbenchEmptyState
      t={props.t}
      isDragOver={props.isDragOver}
      setIsDragOver={props.setIsDragOver}
      onDrop={handleDrop}
    />
  )
}

interface WorkbenchViewProps {
  workbenchCards: StyleCard[]
  handCards: StyleCard[]
  clearWorkbench: () => void
  pickRandomCards: () => void
  toggleCardSelection: (id: string) => Promise<void> | void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  startWeightAdjustment?: () => Promise<void> | void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
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
  isShuffling?: boolean
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
  recipeHistory: RecipeHistoryItem[]
  handleRestoreRecipe: (recipe: RecipeHistoryItem) => void
  deleteRecipeHistory: (id: string) => void
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = (props) => {
  const {
    evolvedCardData,
    isEvolutionSuccessOpen,
    setIsEvolutionSuccessOpen,
    i18n
  } = props
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 space-y-4">
      <WorkbenchHeader {...props} />
      <Cauldron {...props} handleExtractPortion={props.handleExtract} />
      <div className="flex-1 overflow-y-auto pb-16">
        <RecipeSection {...props} />
      </div>
      {evolvedCardData && (
        <EvolutionSuccessModal
          isOpen={isEvolutionSuccessOpen}
          onClose={() => setIsEvolutionSuccessOpen(false)}
          cardName={evolvedCardData.name}
          thumbnailData={
            evolvedCardData.thumbnailPath || evolvedCardData.thumbnailData
          }
          selectedThumbnails={evolvedCardData.selectedThumbnails}
          oldTier={evolvedCardData.oldTier}
          newTier={evolvedCardData.newTier}
          translation={{
            title: i18n.workbench.evolutionSuccessTitle,
            desc: i18n.workbench.evolutionSuccessDesc,
            close: i18n.workbench.close
          }}
        />
      )}
    </div>
  )
}
