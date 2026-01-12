import React from "react"
import { RARITY_CONFIG, RarityTier } from "../../lib/rarity-config"

/**
 * カードのレアリティを表示するバッジコンポーネント。
 * RARITY_CONFIGに基づいたスタイルを自動的に適用します。
 *
 * @param {Object} props
 * @param {RarityTier} props.tier - レアリティ（Common, Rare, Epic, Legendary）
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface RarityBadgeProps {
  tier: RarityTier
  className?: string
}

export function RarityBadge({ tier, className = "" }: RarityBadgeProps) {
  const config = RARITY_CONFIG[tier]
  
  if (!config) return null

  return (
    <div
      className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm ${config.bgClass} ${config.textClass} ${className}`}
    >
      {tier}
    </div>
  )
}