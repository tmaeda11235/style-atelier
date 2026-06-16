import { Sparkles } from "lucide-react"
import React from "react"

import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { WorkbenchCard } from "./WorkbenchCard"

interface CauldronBackgroundProps {
  isGlobalDragging: boolean
  isDragOver: boolean
}

export const CauldronBackground: React.FC<CauldronBackgroundProps> = ({
  isGlobalDragging,
  isDragOver
}) => (
  <>
    <div
      className={`absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] transition-all duration-500 pointer-events-none ${
        isDragOver
          ? "from-blue-900/40 via-slate-950 to-slate-950"
          : isGlobalDragging
            ? "from-indigo-900/30 via-slate-950 to-slate-950"
            : "from-indigo-950/40 via-slate-950 to-slate-950"
      }`}
    />
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-500 ${
        isDragOver
          ? "w-64 h-64 bg-blue-500/15 blur-3xl"
          : isGlobalDragging
            ? "w-56 h-56 bg-indigo-500/10 blur-3xl animate-pulse"
            : "w-48 h-48 bg-blue-500/5 blur-3xl animate-pulse"
      }`}
    />
  </>
)

export const CauldronBubbles: React.FC = () => (
  <div className="absolute inset-x-0 bottom-2 flex justify-around pointer-events-none h-16 overflow-hidden">
    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-cauldron-bubble [animation-delay:0.2s]" />
    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-cauldron-bubble [animation-delay:0.8s]" />
    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-cauldron-bubble [animation-delay:0.8s]" />
    <div className="w-2 h-2 rounded-full bg-indigo-400/40 animate-cauldron-bubble [animation-delay:1.5s]" />
    <div className="w-1.5 h-1.5 rounded-full bg-teal-400/40 animate-cauldron-bubble [animation-delay:2.1s]" />
  </div>
)

export const BlendingOverlay: React.FC = () => (
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

export const ShufflingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px] flex flex-col items-center justify-center z-50 animate-in fade-in duration-200">
    <div className="relative w-20 h-20 flex items-center justify-center">
      <div className="absolute inset-0 border-4 border-dashed border-violet-400 rounded-full animate-spin [animation-duration:1.5s]" />
      <div className="absolute inset-2 border border-indigo-400 rounded-full animate-spin [animation-duration:3s] [animation-direction:reverse]" />
      <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
    </div>
    <span className="text-[10px] font-bold text-violet-300 mt-3 animate-pulse tracking-widest font-mono">
      SHUFFLING RECIPE...
    </span>
  </div>
)

interface WorkbenchCardListProps {
  workbenchCards: StyleCard[]
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
}

export const WorkbenchCardList: React.FC<WorkbenchCardListProps> = ({
  workbenchCards,
  selectedCardId,
  setSelectedCardId,
  toggleCardSelection,
  updateCardWeight,
  onStartWeightAdjustment,
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
        onStartWeightAdjustment={onStartWeightAdjustment}
        handleExtractPortion={handleExtractPortion}
      />
    ))}
  </>
)
