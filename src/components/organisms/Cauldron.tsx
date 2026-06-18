import { ArrowDown } from "lucide-react"
import React, { useEffect, useState } from "react"

import type { PromptSegment, StyleCard } from "../../shared/lib/db-schema"
import { AiRecipeAdviceSection } from "./AiRecipeAdviceSection"
import {
  BlendingOverlay,
  CauldronBackground,
  CauldronBubbles,
  ShufflingOverlay,
  WorkbenchCardList
} from "./CauldronSubcomponents"

interface CauldronProps {
  workbenchCards: StyleCard[]
  handCards: StyleCard[]
  isMixingMode: boolean
  isBlending: boolean
  isShuffling?: boolean
  isDragOver: boolean
  setIsDragOver: (drag: boolean) => void
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  toggleCardSelection: (id: string) => Promise<void> | void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  onStartWeightAdjustment?: () => Promise<void> | void
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
  addLog?: (msg: string) => void
  t: any
}

const handleCauldronDrop = async (
  e: React.DragEvent,
  handCards: StyleCard[],
  toggleCardSelection: (id: string) => Promise<void> | void,
  setIsDragOver: (drag: boolean) => void,
  addLog?: (msg: string) => void
) => {
  e.preventDefault()
  setIsDragOver(false)
  const cardId = e.dataTransfer.getData("cardId")
  if (cardId && !handCards.find((c) => c.id === cardId)) {
    await toggleCardSelection(cardId)
    addLog?.(`Card dragged and dropped to Workbench slot`)
  }
}

const getDropZoneClass = (isDragOver: boolean, isGlobalDragging: boolean) =>
  isDragOver
    ? "border-blue-400 bg-blue-950/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105 border-dashed"
    : isGlobalDragging
      ? "border-indigo-500/70 bg-indigo-950/20 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-pulse border-dashed"
      : "border-slate-800 text-slate-500 bg-slate-900/20 border-dashed hover:border-slate-700 hover:bg-slate-900/40"

const getInnerBorderClass = (isDragOver: boolean, isGlobalDragging: boolean) =>
  isDragOver
    ? "border-blue-400 text-blue-300"
    : isGlobalDragging
      ? "border-indigo-400 text-indigo-300"
      : "border-slate-700 text-slate-500"

const getArrowClass = (isDragOver: boolean, isGlobalDragging: boolean) =>
  isDragOver
    ? "text-blue-300 animate-bounce"
    : isGlobalDragging
      ? "text-indigo-300 animate-pulse"
      : "text-slate-600"

interface CauldronDropZoneProps {
  isDragOver: boolean
  setIsDragOver: (drag: boolean) => void
  isGlobalDragging: boolean
  handCards: StyleCard[]
  toggleCardSelection: (id: string) => Promise<void> | void
  addLog?: (msg: string) => void
  t: any
}

const CauldronDropZone: React.FC<CauldronDropZoneProps> = ({
  isDragOver,
  setIsDragOver,
  isGlobalDragging,
  handCards,
  toggleCardSelection,
  addLog,
  t
}) => (
  <div
    onDragOver={(e) => {
      e.preventDefault()
      setIsDragOver(true)
    }}
    onDragLeave={() => setIsDragOver(false)}
    onDrop={(e) =>
      handleCauldronDrop(
        e,
        handCards,
        toggleCardSelection,
        setIsDragOver,
        addLog
      )
    }
    className={`border-2 rounded-lg flex flex-col items-center justify-center w-28 aspect-square text-[9px] text-center p-3 transition-all duration-300 cursor-pointer ${getDropZoneClass(
      isDragOver,
      isGlobalDragging
    )}`}
    data-testid="cauldron-dropzone">
    <div className="flex flex-col items-center gap-1.5 pointer-events-none select-none">
      <div
        className={`relative w-8 h-10 border border-dashed rounded flex items-center justify-center transition-colors ${getInnerBorderClass(
          isDragOver,
          isGlobalDragging
        )}`}>
        <ArrowDown
          className={`w-3.5 h-3.5 ${getArrowClass(
            isDragOver,
            isGlobalDragging
          )}`}
        />
      </div>
      <span className="leading-tight font-medium">{t.addPromptDesc}</span>
    </div>
  </div>
)

const useGlobalDrag = (setIsDragOver: (drag: boolean) => void) => {
  const [isGlobalDragging, setIsGlobalDragging] = useState(false)

  useEffect(() => {
    const handleDragStart = () => {
      setIsGlobalDragging(true)
    }
    const handleDragEnd = () => {
      setIsGlobalDragging(false)
      setIsDragOver(false)
    }

    document.addEventListener("dragstart", handleDragStart)
    document.addEventListener("dragend", handleDragEnd)
    document.addEventListener("drop", handleDragEnd)

    return () => {
      document.removeEventListener("dragstart", handleDragStart)
      document.removeEventListener("dragend", handleDragEnd)
      document.removeEventListener("drop", handleDragEnd)
    }
  }, [setIsDragOver])

  return isGlobalDragging
}

interface CauldronContentProps extends CauldronProps {
  isGlobalDragging: boolean
}

const CauldronContent: React.FC<CauldronContentProps> = ({
  workbenchCards,
  handCards,
  selectedCardId,
  setSelectedCardId,
  toggleCardSelection,
  updateCardWeight,
  onStartWeightAdjustment,
  handleExtractPortion,
  isDragOver,
  setIsDragOver,
  isGlobalDragging,
  isShuffling,
  addLog,
  t
}) => (
  <div className="flex items-center justify-center gap-6 z-10 w-full">
    <div
      className={`flex items-center justify-center gap-6 transition-transform ${isShuffling ? "animate-gacha-shake blur-[0.3px]" : ""}`}>
      <WorkbenchCardList
        workbenchCards={workbenchCards}
        selectedCardId={selectedCardId}
        setSelectedCardId={setSelectedCardId}
        toggleCardSelection={toggleCardSelection}
        updateCardWeight={updateCardWeight}
        onStartWeightAdjustment={onStartWeightAdjustment}
        handleExtractPortion={handleExtractPortion}
      />
    </div>

    {!isShuffling && workbenchCards.length < 2 && (
      <CauldronDropZone
        isDragOver={isDragOver}
        setIsDragOver={setIsDragOver}
        isGlobalDragging={isGlobalDragging}
        handCards={handCards}
        toggleCardSelection={toggleCardSelection}
        addLog={addLog}
        t={t}
      />
    )}
  </div>
)

export const Cauldron: React.FC<CauldronProps> = (props) => {
  const isGlobalDragging = useGlobalDrag(props.setIsDragOver)
  const containerClass = `relative overflow-hidden bg-slate-950 p-6 rounded-2xl border-2 min-h-[190px] flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)] transition-all duration-500 ${
    props.isDragOver
      ? "border-blue-500/70 shadow-[inset_0_4px_20px_rgba(0,0,0,0.6),_0_0_20px_rgba(59,130,246,0.2)]"
      : isGlobalDragging
        ? "border-indigo-500/50 shadow-[inset_0_4px_20px_rgba(0,0,0,0.6),_0_0_15px_rgba(99,102,241,0.15)]"
        : "border-slate-800"
  }`

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className={containerClass}>
        <CauldronBackground
          isGlobalDragging={isGlobalDragging}
          isDragOver={props.isDragOver}
        />
        <CauldronBubbles />
        {props.isMixingMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-dashed border-indigo-500/20 animate-cauldron-spin pointer-events-none" />
        )}
        {props.isBlending && <BlendingOverlay />}
        {props.isShuffling && <ShufflingOverlay />}
        <CauldronContent {...props} isGlobalDragging={isGlobalDragging} />
      </div>
      {props.workbenchCards.length >= 2 && (
        <AiRecipeAdviceSection cards={props.workbenchCards} t={props.t} />
      )}
    </div>
  )
}
