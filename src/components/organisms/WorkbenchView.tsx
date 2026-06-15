import { BookUp2, Dices } from "lucide-react"
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
  isShuffling?: boolean
  t: any
}

const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  workbenchCards,
  clearWorkbench,
  pickRandomCards,
  isShuffling,
  t
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
      <BookUp2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
      Workbench
    </h2>
    <div className="flex items-center gap-2">
      <button
        onClick={pickRandomCards}
        disabled={isShuffling}
        className={`flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full text-[10px] font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 cursor-pointer ${isShuffling ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Pick 1-3 random styles from library"
        id="workbench-gacha-btn"
        data-testid="workbench-gacha-btn"
        type="button">
        <Dices className={`w-3.5 h-3.5 ${isShuffling ? "animate-spin" : ""}`} />
        <span>{t.gachaPick || "Gacha Pick"}</span>
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
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = (props) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 space-y-4">
      <WorkbenchHeader
        workbenchCards={props.workbenchCards}
        clearWorkbench={props.clearWorkbench}
        pickRandomCards={props.pickRandomCards}
        isShuffling={props.isShuffling}
        t={props.t}
      />
      <Cauldron
        workbenchCards={props.workbenchCards}
        handCards={props.handCards}
        isMixingMode={props.isMixingMode}
        isBlending={props.isBlending}
        isShuffling={props.isShuffling}
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
        <EvolutionSuccessModalContainer
          isOpen={props.isEvolutionSuccessOpen}
          onClose={() => props.setIsEvolutionSuccessOpen(false)}
          evolvedCardData={props.evolvedCardData}
          i18n={props.i18n}
        />
      )}
    </div>
  )
}

const EvolutionSuccessModalContainer: React.FC<{
  isOpen: boolean
  onClose: () => void
  evolvedCardData: any
  i18n: any
}> = ({ isOpen, onClose, evolvedCardData, i18n }) => {
  return (
    <EvolutionSuccessModal
      isOpen={isOpen}
      onClose={onClose}
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
  )
}
