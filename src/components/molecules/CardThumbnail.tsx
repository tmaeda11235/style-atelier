import React from "react"
import { RarityBadge } from "../atoms/RarityBadge"
import { IconButton } from "../atoms/IconButton"
import { RarityTier } from "../../lib/rarity-config"

/**
 * カードのサムネイル画像、レアリティバッジ、ピン留めアクションを組み合わせたコンポーネント。
 *
 * @param {Object} props
 * @param {string} props.imageUrl - サムネイル画像のURL
 * @param {string} props.alt - 画像の代替テキスト
 * @param {RarityTier} props.tier - レアリティ
 * @param {boolean} [props.isPinned] - ピン留めされているかどうか
 * @param {() => void} [props.onPinClick] - ピン留めボタンクリック時のハンドラ
 * @param {() => void} [props.onDeleteClick] - 削除ボタンクリック時のハンドラ（オプション）
 * @param {string} [props.size='md'] - サムネイルのサイズ（'sm' | 'md' | 'lg'）
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface CardThumbnailProps {
  imageUrl: string
  alt: string
  tier: RarityTier
  isPinned?: boolean
  onPinClick?: (e: React.MouseEvent) => void
  onDeleteClick?: (e: React.MouseEvent) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function CardThumbnail({
  imageUrl,
  alt,
  tier,
  isPinned,
  onPinClick,
  onDeleteClick,
  size = "md",
  className = "",
}: CardThumbnailProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-full aspect-square",
    lg: "w-full h-48",
  }

  return (
    <div className={`relative overflow-hidden rounded-lg group ${sizeClasses[size]} ${className}`}>
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover transition-transform group-hover:scale-110"
      />
      
      {/* Rarity Badge */}
      <RarityBadge tier={tier} className="absolute top-1 right-1" />
      
      {/* Actions */}
      <div className="absolute bottom-1 right-1 flex gap-1">
        {onPinClick && (
          <IconButton
            variant={isPinned ? "yellow" : "white"}
            size="sm"
            onClick={onPinClick}
            className="shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </IconButton>
        )}
        
        {onDeleteClick && (
          <IconButton
            variant="slate"
            size="xs"
            onClick={onDeleteClick}
            className="opacity-0 group-hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </IconButton>
        )}
      </div>
    </div>
  )
}