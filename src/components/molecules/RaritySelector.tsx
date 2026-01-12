import React from "react"
import { RARITY_CONFIG, RarityTier } from "../../lib/rarity-config"

/**
 * レアリティを選択するためのグリッドセレクター。
 *
 * @param {Object} props
 * @param {RarityTier} props.selected - 現在選択されているレアリティ
 * @param {(tier: RarityTier) => void} props.onSelect - 選択時のハンドラ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface RaritySelectorProps {
  selected: RarityTier
  onSelect: (tier: RarityTier) => void
  className?: string
}

export function RaritySelector({
  selected,
  onSelect,
  className = "",
}: RaritySelectorProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {(Object.keys(RARITY_CONFIG) as RarityTier[]).map((tier) => {
        const config = RARITY_CONFIG[tier]
        const isSelected = selected === tier
        return (
          <button
            key={tier}
            onClick={() => onSelect(tier)}
            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
              isSelected
                ? `${config.borderClass} ${config.bgClass} bg-opacity-10 ${config.glowClass}`
                : "border-slate-100 hover:border-slate-200"
            }`}
          >
            <span
              className={`text-xs font-black uppercase ${config.textClass} ${
                isSelected ? "" : "text-slate-400"
              }`}
            >
              {tier}
            </span>
            <div className={`w-full h-1 rounded-full ${config.bgClass}`} />
          </button>
        )
      })}
    </div>
  )
}