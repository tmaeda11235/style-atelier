import React from "react"
import type { PromptSegment } from "../../lib/db-schema"
import { cn } from "../../lib/utils"
import { RARITY_CONFIG, RarityTier } from "../../lib/rarity-config"
import { X } from "lucide-react"

/**
 * プロンプトのセグメント（テキスト、スロット、チップ）を視覚的に表現するバブルコンポーネント。
 * レアリティ設定がある場合は、そのスタイルを適用します。
 *
 * @param {Object} props
 * @param {PromptSegment} props.segment - プロンプトのセグメントデータ
 * @param {() => void} props.onClick - クリック時のハンドラ
 * @param {RarityTier} [props.tier] - 適用するレアリティ
 */
interface PromptBubbleProps {
  segment: PromptSegment
  onClick?: () => void
  onRemove?: () => void
  tier?: RarityTier
  className?: string
}

export const PromptBubble: React.FC<PromptBubbleProps> = ({
  segment,
  onClick,
  onRemove,
  tier,
  className,
}) => {
  const rarityConfig = tier ? RARITY_CONFIG[tier] : null

  const bubbleClasses = cn(
    "group px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-2 border-2 shrink-0 select-none",
    {
      "cursor-pointer hover:scale-105 active:scale-95": !!onClick,
      "bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent":
        segment.type === "text" && !rarityConfig,
      "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100":
        segment.type === "slot" && !rarityConfig,
      "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100":
        segment.type === "chip" && !rarityConfig,
      [rarityConfig?.bgClass || ""]: !!rarityConfig,
      [rarityConfig?.textClass || ""]: !!rarityConfig,
      [rarityConfig?.borderClass || ""]: !!rarityConfig,
      [rarityConfig?.glowClass || ""]: !!rarityConfig,
    },
    className
  )

  const renderContent = () => {
    switch (segment.type) {
      case "text":
        return (
          <div className="flex items-center gap-1">
            <span className="max-w-[150px] truncate">{segment.value}</span>
            {onClick && (
              <span className="text-[8px] uppercase opacity-0 group-hover:opacity-40 font-bold ml-1 transition-opacity">
                To Slot
              </span>
            )}
          </div>
        )
      case "slot":
        return (
          <div className="flex items-center gap-1">
            <span className="max-w-[120px] truncate">{segment.label}</span>
            <span className="text-[10px] uppercase opacity-50 font-bold">Slot</span>
            {onClick && (
              <span className="text-[8px] uppercase opacity-0 group-hover:opacity-40 font-bold ml-1 transition-opacity">
                To Text
              </span>
            )}
          </div>
        )
      case "chip":
        return (
          <div className="flex items-center gap-1">
            <span className="max-w-[120px] truncate">{segment.kind}</span>
            <span className="text-[10px] uppercase opacity-50 font-bold">Card</span>
          </div>
        )
    }
  }

  return (
    <div className={bubbleClasses} onClick={onClick}>
      {renderContent()}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}