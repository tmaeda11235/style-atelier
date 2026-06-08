import React from "react"
import iconUrl from "url:../../../assets/icon.png"

import type { RarityTier } from "../../lib/rarity-config"
import { IconButton } from "../atoms/IconButton"
import { RarityBadge } from "../atoms/RarityBadge"

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
  imageUrl?: string
  thumbnailImages?: string[]
  alt: string
  tier: RarityTier
  isPinned?: boolean
  onPinClick?: (e: React.MouseEvent) => void
  onDeleteClick?: (e: React.MouseEvent) => void
  onInjectClick?: (e: React.MouseEvent) => void
  onEditClick?: (e: React.MouseEvent) => void
  onShareClick?: (e: React.MouseEvent) => void
  size?: "sm" | "md" | "lg"
  className?: string
  category?: { id: string; name: string; iconEmoji?: string; iconUrl?: string }
  usageCount?: number
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

export function CardThumbnail({
  imageUrl,
  thumbnailImages,
  alt,
  tier,
  isPinned,
  onPinClick,
  onDeleteClick,
  onInjectClick,
  onEditClick,
  onShareClick,
  size = "md",
  className = "",
  category,
  usageCount,
  draggable,
  onDragStart,
  onDragEnd
}: CardThumbnailProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-full aspect-square",
    lg: "w-full h-48"
  }

  const imagesToRender = (
    thumbnailImages && thumbnailImages.length > 0
      ? thumbnailImages.slice(0, 4)
      : ([imageUrl].filter(Boolean) as string[])
  ).map((img) => (img === "assets/icon.png" ? iconUrl : img))

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative overflow-hidden rounded-lg group ${sizeClasses[size]} ${className}`}>
      {/* Category Icon */}
      {category && (
        <div
          className="absolute top-1.5 left-1.5 flex items-center justify-center bg-slate-900/60 border border-white/20 text-white rounded-full w-6 h-6 shadow-md z-10 overflow-hidden backdrop-blur-[2px]"
          title={`Category: ${category.name}`}>
          {category.iconUrl ? (
            <img
              src={category.iconUrl}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs leading-none">
              {category.iconEmoji || "🖼️"}
            </span>
          )}
        </div>
      )}

      {imagesToRender.length === 4 ? (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          <img
            src={imagesToRender[0]}
            alt={`${alt} - Thumbnail 1`}
            className="w-full h-full object-cover border-r border-b border-white/20 transition-transform group-hover:scale-105"
          />
          <img
            src={imagesToRender[1]}
            alt={`${alt} - Thumbnail 2`}
            className="w-full h-full object-cover border-b border-white/20 transition-transform group-hover:scale-105"
          />
          <img
            src={imagesToRender[2]}
            alt={`${alt} - Thumbnail 3`}
            className="w-full h-full object-cover border-r border-white/20 transition-transform group-hover:scale-105"
          />
          <img
            src={imagesToRender[3]}
            alt={`${alt} - Thumbnail 4`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : imagesToRender.length === 3 ? (
        <div className="grid grid-cols-3 w-full h-full">
          <div className="col-span-2 h-full">
            <img
              src={imagesToRender[0]}
              alt={`${alt} - Thumbnail 1`}
              className="w-full h-full object-cover border-r border-white/20 transition-transform group-hover:scale-105"
            />
          </div>
          <div className="grid grid-rows-2 h-full">
            <img
              src={imagesToRender[1]}
              alt={`${alt} - Thumbnail 2`}
              className="w-full h-full object-cover border-b border-white/20 transition-transform group-hover:scale-105"
            />
            <img
              src={imagesToRender[2]}
              alt={`${alt} - Thumbnail 3`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        </div>
      ) : imagesToRender.length === 2 ? (
        <div className="flex w-full h-full">
          <img
            src={imagesToRender[0]}
            alt={`${alt} - Thumbnail 1`}
            className="w-1/2 h-full object-cover border-r border-white/20 transition-transform group-hover:scale-105"
          />
          <img
            src={imagesToRender[1]}
            alt={`${alt} - Thumbnail 2`}
            className="w-1/2 h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <img
          src={imagesToRender[0] || iconUrl}
          alt={alt}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
      )}

      {/* Rarity Badge */}
      <RarityBadge tier={tier} className="absolute top-1 right-1" />

      {/* Usage Count Badge */}
      {usageCount !== undefined && (
        <div
          data-testid="usage-count-badge"
          className="absolute bottom-1.5 left-1.5 bg-slate-900/60 border border-white/20 text-white rounded px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-[2px] shadow-md z-10 select-none pointer-events-none">
          {usageCount} uses
        </div>
      )}

      {/* Actions */}
      <div className="absolute bottom-1 right-1 flex gap-1">
        {onInjectClick && (
          <IconButton
            variant="blue"
            size="sm"
            onClick={onInjectClick}
            className="shadow-md"
            title="Inject Prompt">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </IconButton>
        )}

        {onShareClick && (
          <IconButton
            variant="white"
            size="sm"
            onClick={onShareClick}
            className="shadow-md"
            title="Share Card"
            data-testid="share-card-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </IconButton>
        )}

        {onEditClick && (
          <IconButton
            variant="white"
            size="sm"
            onClick={onEditClick}
            className="shadow-md"
            title="Edit Card"
            data-testid="edit-card-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </IconButton>
        )}

        {onPinClick && (
          <IconButton
            variant={isPinned ? "yellow" : "white"}
            size="sm"
            onClick={onPinClick}
            className="shadow-md"
            title={isPinned ? "Workbenchから外す" : "Workbenchに送る"}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
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
            className="opacity-0 group-hover:opacity-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </IconButton>
        )}
      </div>
    </div>
  )
}
