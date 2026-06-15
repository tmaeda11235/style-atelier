import { X } from "lucide-react"
import React from "react"

import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { CardThumbnail } from "../molecules/CardThumbnail"
import { PortionExtractorOverlay } from "./PortionExtractorOverlay"

interface WorkbenchCardProps {
  card: StyleCard
  idx: number
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

const WeightDisplay: React.FC<{
  weight: number | undefined
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onMouseDown: () => void
  onTouchStart: () => void
}> = ({ weight, onChange, onMouseDown, onTouchStart }) => (
  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 border border-slate-700 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center space-y-1 z-10">
    <span className="text-[8px] text-slate-300 font-mono font-bold">
      Weight: {(weight !== undefined ? weight : 1.0).toFixed(1)}
    </span>
    <input
      type="range"
      min="0.1"
      max="2.0"
      step="0.1"
      value={weight !== undefined ? weight : 1.0}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        onTouchStart()
      }}
      onChange={onChange}
      className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
    />
  </div>
)

const RemoveButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({
  onClick
}) => (
  <button
    onClick={onClick}
    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 rounded-full p-1 shadow-md z-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
    <X className="w-3 h-3 text-white" />
  </button>
)

const SelectedPortionExtractor: React.FC<{
  card: StyleCard
  setSelectedCardId: (id: string | null) => void
  updateCardWeight: (cardId: string, weight: number) => Promise<void>
  onStartWeightAdjustment?: () => void
  handleExtractPortion: (cardId: string, portionText: string) => Promise<void>
}> = ({
  card,
  setSelectedCardId,
  updateCardWeight,
  onStartWeightAdjustment,
  handleExtractPortion
}) => (
  <PortionExtractorOverlay
    card={card}
    onClose={(e) => {
      e.stopPropagation()
      setSelectedCardId(null)
    }}
    updateCardWeight={updateCardWeight}
    onStartWeightAdjustment={onStartWeightAdjustment}
    handleExtractPortion={handleExtractPortion}
  />
)

const InteractiveThumbnail: React.FC<{
  card: StyleCard
  isSelected: boolean
  setSelectedCardId: (id: string | null) => void
}> = ({ card, isSelected, setSelectedCardId }) => (
  <div
    onClick={() => setSelectedCardId(isSelected ? null : card.id)}
    className="relative cursor-pointer rounded-lg overflow-hidden border border-slate-800 shadow-lg group-hover:scale-105 transition-transform">
    <CardThumbnail
      imageUrl={card.thumbnailData}
      thumbnailImages={card.selectedThumbnails}
      alt={card.name}
      tier={card.tier}
      className="w-full aspect-square"
    />
  </div>
)

export const WorkbenchCard: React.FC<WorkbenchCardProps> = ({
  card,
  idx,
  selectedCardId,
  setSelectedCardId,
  toggleCardSelection,
  updateCardWeight,
  onStartWeightAdjustment,
  handleExtractPortion
}) => {
  const isSelected = selectedCardId === card.id
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleCardSelection(card.id)
  }
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    updateCardWeight(card.id, parseFloat(e.target.value))
  }

  return (
    <div
      className="relative group animate-in zoom-in-95 duration-200 w-28 animate-float-gentle"
      style={{ animationDelay: idx === 0 ? "0s" : "1.5s" }}>
      <InteractiveThumbnail
        card={card}
        isSelected={isSelected}
        setSelectedCardId={setSelectedCardId}
      />
      <RemoveButton onClick={handleRemove} />
      <WeightDisplay
        weight={card.weight}
        onChange={handleWeightChange}
        onMouseDown={onStartWeightAdjustment}
        onTouchStart={onStartWeightAdjustment}
      />
      {isSelected && (
        <SelectedPortionExtractor
          card={card}
          setSelectedCardId={setSelectedCardId}
          updateCardWeight={updateCardWeight}
          onStartWeightAdjustment={onStartWeightAdjustment}
          handleExtractPortion={handleExtractPortion}
        />
      )}
    </div>
  )
}
