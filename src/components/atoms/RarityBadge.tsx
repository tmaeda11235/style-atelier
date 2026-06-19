import { type VariantProps } from "class-variance-authority"
import React from "react"

import { RARITY_CONFIG, type RarityTier } from "../../lib/rarity-config"
import { cn, extractLayoutClasses } from "../../lib/utils"
import { rarityBadgeVariants } from "./RarityBadge.variants"

/**
 * カードのレアリティを表示するバッジコンポーネント。
 *
 * @param {Object} props
 * @param {RarityTier} props.tier - レアリティ（Common, Rare, Epic, Legendary）
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
export interface RarityBadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof rarityBadgeVariants>, "tier"> {
  tier: RarityTier
}

export function RarityBadge({
  tier,
  className = "",
  ...props
}: RarityBadgeProps) {
  if (!RARITY_CONFIG[tier]) return null

  const layoutClassName = extractLayoutClasses(className)

  return (
    <div
      className={cn(rarityBadgeVariants({ tier }), layoutClassName)}
      data-testid="rarity-badge"
      {...props}>
      {tier}
    </div>
  )
}
