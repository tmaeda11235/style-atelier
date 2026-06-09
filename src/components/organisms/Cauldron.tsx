import { Sparkles } from "lucide-react"
import React from "react"

import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { WorkbenchCard } from "./WorkbenchCard"

interface CauldronProps {
  workbenchCards: StyleCard[]
  handCards: StyleCard[]
  isMixingMode: boolean
  isBlending: boolean
  isDragOver: boolean
  setIsDragOver: (drag: boolean) => void
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  toggleCardSelection: (id: string) => Promise<void> | void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
  addLog?: (msg: string) => void
  t: any
}

const CauldronBackground: React.FC = () => (
  <>
    <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-blue-500/5 blur-3xl pointer-events-none animate-pulse" />
  </>
)

const CauldronBubbles: React.FC = () => (
  <div className="absolute inset-x-0 bottom-2 flex justify-around pointer-events-none h-16 overflow-hidden">
    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-cauldron-bubble [animation-delay:0.2s]" />
    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-cauldron-bubble [animation-delay:0.8s]" />
    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-cauldron-bubble [animation-delay:0.8s]" />
    <div className="w-2 h-2 rounded-full bg-indigo-400/40 animate-cauldron-bubble [animation-delay:1.5s]" />
    <div className="w-1.5 h-1.5 rounded-full bg-teal-400/40 animate-cauldron-bubble [animation-delay:2.1s]" />
  </div>
)

const BlendingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 border-4 border-dashed border-teal-400 rounded-full animate-spin [animation-duration:2s]" />
      <div className="absolute inset-2 border border-purple-400 rounded-full animate-spin [animation-duration:4s] [animation-direction:reverse]" />
      <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
    </div>
    <span className="text-[10px] font-bold text-teal-300 mt-3 animate-pulse tracking-widest font-mono">
      ALCHEMY IN PROGRESS...
    </span>
  </div>
)

interface WorkbenchCardListProps {
  workbenchCards: StyleCard[]
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  toggleCardSelection: (id: string) => Promise<void> | void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
}

const WorkbenchCardList: React.FC<WorkbenchCardListProps> = ({
  workbenchCards,
  selectedCardId,
  setSelectedCardId,
  toggleCardSelection,
  updateCardWeight,
  handleExtractPortion
}) => (
  <>
    {workbenchCards.map((card, idx) => (
      <WorkbenchCard
        key={card.id}
        card={card}
        idx={idx}
        selectedCardId={selectedCardId}
        setSelectedCardId={setSelectedCardId}
        toggleCardSelection={toggleCardSelection}
        updateCardWeight={updateCardWeight}
        handleExtractPortion={handleExtractPortion}
      />
    ))}
  </>
)

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

interface CauldronDropZoneProps {
  isDragOver: boolean
  setIsDragOver: (drag: boolean) => void
  handCards: StyleCard[]
  toggleCardSelection: (id: string) => Promise<void> | void
  addLog?: (msg: string) => void
  t: any
}

const CauldronDropZone: React.FC<CauldronDropZoneProps> = ({
  isDragOver,
  setIsDragOver,
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
    className={`border-2 border-dashed rounded-lg flex items-center justify-center w-28 aspect-square text-[9px] text-center p-3 transition-all duration-300 ${
      isDragOver
        ? "border-blue-400 bg-blue-950/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105"
        : "border-slate-800 text-slate-600 bg-slate-900/20"
    }`}>
    {t.addPromptDesc}
  </div>
)

export const Cauldron: React.FC<CauldronProps> = ({
  workbenchCards,
  handCards,
  isMixingMode,
  isBlending,
  isDragOver,
  setIsDragOver,
  selectedCardId,
  setSelectedCardId,
  toggleCardSelection,
  updateCardWeight,
  handleExtractPortion,
  addLog,
  t
}) => {
  return (
    <div className="relative overflow-hidden bg-slate-950 p-6 rounded-2xl border-2 border-slate-800 min-h-[190px] flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]">
      <CauldronBackground />
      <CauldronBubbles />
      {isMixingMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-dashed border-indigo-500/20 animate-cauldron-spin pointer-events-none" />
      )}
      {isBlending && <BlendingOverlay />}

      <div className="flex items-center justify-center gap-6 z-10 w-full">
        <WorkbenchCardList
          workbenchCards={workbenchCards}
          selectedCardId={selectedCardId}
          setSelectedCardId={setSelectedCardId}
          toggleCardSelection={toggleCardSelection}
          updateCardWeight={updateCardWeight}
          handleExtractPortion={handleExtractPortion}
        />

        {workbenchCards.length < 2 && (
          <CauldronDropZone
            isDragOver={isDragOver}
            setIsDragOver={setIsDragOver}
            handCards={handCards}
            toggleCardSelection={toggleCardSelection}
            addLog={addLog}
            t={t}
          />
        )}
      </div>
    </div>
  )
}
