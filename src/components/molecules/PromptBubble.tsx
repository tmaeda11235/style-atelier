import { X } from "lucide-react"
import React from "react"

import { RARITY_CONFIG, type RarityTier } from "../../lib/rarity-config"
import { cn } from "../../lib/utils"
import type { PromptSegment } from "../../shared/lib/db-schema"

/**
 * プロンプトのセグメント（テキスト、スロット、チップ）を視覚的に表現するバブルコンポーネント。
 * レアリティ設定がある場合は、そのスタイルを適用します。
 */
interface PromptBubbleProps {
  segment: PromptSegment
  onClick?: () => void
  onRemove?: () => void
  tier?: RarityTier
  className?: string
  enableSlotAction?: boolean
}

const PromptBubbleText: React.FC<{
  value: string
  onClick?: () => void
  enableSlotAction?: boolean
}> = ({ value, onClick, enableSlotAction }) => (
  <div className="flex items-center gap-1">
    <span className="max-w-[150px] truncate">{value}</span>
    {onClick && enableSlotAction && (
      <span className="text-[8px] uppercase opacity-0 group-hover:opacity-40 font-bold ml-1 transition-opacity">
        To Slot
      </span>
    )}
  </div>
)

const PromptBubbleSlot: React.FC<{
  label?: string
  onClick?: () => void
}> = ({ label, onClick }) => (
  <div className="flex items-center gap-1">
    <span className="max-w-[120px] truncate">{label}</span>
    <span className="text-[10px] uppercase opacity-50 font-bold">Slot</span>
    {onClick && (
      <span className="text-[8px] uppercase opacity-0 group-hover:opacity-40 font-bold ml-1 transition-opacity">
        To Text
      </span>
    )}
  </div>
)

const PromptBubbleChip: React.FC<{
  kind?: string
}> = ({ kind }) => (
  <div className="flex items-center gap-1">
    <span className="max-w-[120px] truncate">{kind}</span>
    <span className="text-[10px] uppercase opacity-50 font-bold">Card</span>
  </div>
)

const getBubbleClasses = (
  type: string,
  onClick?: () => void,
  tier?: RarityTier,
  className?: string
) => {
  const rarityConfig = tier ? RARITY_CONFIG[tier] : null
  return cn(
    "group px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-2 border-2 shrink-0 select-none",
    {
      "cursor-pointer hover:scale-105 active:scale-95": !!onClick,
      "bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent":
        type === "text" && !rarityConfig,
      "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100":
        type === "slot" && !rarityConfig,
      "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100":
        type === "chip" && !rarityConfig,
      [rarityConfig?.bgClass || ""]: !!rarityConfig,
      [rarityConfig?.textClass || ""]: !!rarityConfig,
      [rarityConfig?.borderClass || ""]: !!rarityConfig,
      [rarityConfig?.glowClass || ""]: !!rarityConfig
    },
    className
  )
}

export const PromptBubble: React.FC<PromptBubbleProps> = ({
  segment,
  onClick,
  onRemove,
  tier,
  className,
  enableSlotAction = false
}) => {
  const bubbleClasses = getBubbleClasses(segment.type, onClick, tier, className)

  return (
    <div className={bubbleClasses} onClick={onClick}>
      {segment.type === "text" && (
        <PromptBubbleText
          value={segment.value || ""}
          onClick={onClick}
          enableSlotAction={enableSlotAction}
        />
      )}
      {segment.type === "slot" && (
        <PromptBubbleSlot label={segment.label} onClick={onClick} />
      )}
      {segment.type === "chip" && <PromptBubbleChip kind={segment.kind} />}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
