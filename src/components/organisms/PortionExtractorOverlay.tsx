import { X } from "lucide-react"
import React from "react"

import type { PromptSegment, StyleCard } from "../../lib/db-schema"

interface OverlayHeaderProps {
  onClose: (e: React.MouseEvent) => void
}

const OverlayHeader: React.FC<OverlayHeaderProps> = ({ onClose }) => (
  <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
    <span className="font-bold text-slate-300">Extract Portions</span>
    <button onClick={onClose} className="text-slate-400 hover:text-white">
      <X className="w-3 h-3" />
    </button>
  </div>
)

interface WeightSliderProps {
  weight: number | undefined
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const WeightSlider: React.FC<WeightSliderProps> = ({ weight, onChange }) => (
  <div className="flex flex-col space-y-0.5 border-b border-slate-800 pb-1.5">
    <div className="flex justify-between font-mono font-bold">
      <span className="text-slate-400">Weight</span>
      <span className="text-blue-400">
        {(weight !== undefined ? weight : 1.0).toFixed(1)}
      </span>
    </div>
    <input
      type="range"
      min="0.1"
      max="2.0"
      step="0.1"
      value={weight !== undefined ? weight : 1.0}
      onClick={(e) => e.stopPropagation()}
      onChange={onChange}
      className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
    />
  </div>
)

interface SegmentListProps {
  segments: PromptSegment[]
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
}

const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  handleExtractPortion
}) => (
  <div className="space-y-0.5">
    <span className="font-bold text-slate-400 block text-[8px]">
      Prompt Segments
    </span>
    {segments.map((seg, idx) => {
      const text =
        seg.type === "text" ? seg.value : `[${seg.type}] ${seg.label}`
      return (
        <div
          key={idx}
          className="flex justify-between items-center bg-slate-800/80 px-1 py-0.5 rounded hover:bg-slate-800 transition-colors">
          <span className="truncate flex-1 pr-1">{text}</span>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              await handleExtractPortion(text, [seg], {})
            }}
            className="text-[8px] bg-blue-600 hover:bg-blue-500 px-1 py-0.2 rounded font-bold text-white transition-colors">
            Extract
          </button>
        </div>
      )
    })}
  </div>
)

interface ParamListProps {
  parameters: any
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
}

const ParamList: React.FC<ParamListProps> = ({
  parameters,
  handleExtractPortion
}) => (
  <div className="space-y-0.5">
    <span className="font-bold text-slate-400 block text-[8px]">
      Parameters
    </span>
    {Object.entries(parameters).map(([key, val]) => {
      if (!val || (Array.isArray(val) && val.length === 0)) return null
      const labelText = `--${key} ${Array.isArray(val) ? val.join(" ") : val}`
      return (
        <div
          key={key}
          className="flex justify-between items-center bg-slate-800/80 px-1 py-0.5 rounded hover:bg-slate-800 transition-colors">
          <span className="truncate flex-1 pr-1">{labelText}</span>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              await handleExtractPortion(key.toUpperCase(), [], { [key]: val })
            }}
            className="text-[8px] bg-indigo-600 hover:bg-indigo-500 px-1 py-0.2 rounded font-bold text-white transition-colors">
            Extract
          </button>
        </div>
      )
    })}
  </div>
)

interface PortionExtractorOverlayProps {
  card: StyleCard
  onClose: (e: React.MouseEvent) => void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
}

export const PortionExtractorOverlay: React.FC<
  PortionExtractorOverlayProps
> = ({ card, onClose, updateCardWeight, handleExtractPortion }) => {
  const handleWeightRangeChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.stopPropagation()
    const val = parseFloat(e.target.value)
    await updateCardWeight(card.id, val)
  }

  return (
    <div className="absolute inset-0 bg-slate-900/95 border border-slate-700 rounded-lg text-white p-2 flex flex-col justify-between overflow-hidden z-20 transition-all text-[9px]">
      <OverlayHeader onClose={onClose} />
      <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-thin">
        <WeightSlider weight={card.weight} onChange={handleWeightRangeChange} />
        {card.promptSegments && card.promptSegments.length > 0 && (
          <SegmentList
            segments={card.promptSegments}
            handleExtractPortion={handleExtractPortion}
          />
        )}
        {card.parameters && Object.keys(card.parameters).length > 0 && (
          <ParamList
            parameters={card.parameters}
            handleExtractPortion={handleExtractPortion}
          />
        )}
      </div>
    </div>
  )
}
