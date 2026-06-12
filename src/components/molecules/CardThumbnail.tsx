import React from "react"

import type { RarityTier } from "../../lib/rarity-config"
import { RarityBadge } from "../atoms/RarityBadge"
import { CardThumbnailActions } from "./CardThumbnailActions"
import { CardThumbnailImages } from "./CardThumbnailImages"

interface CardThumbnailProps {
  imageUrl?: string
  thumbnailImages?: string[]
  alt: string
  tier: RarityTier
  isPinned?: boolean
  onPinClick?: (e: React.MouseEvent) => void
  onQuickSendClick?: (e: React.MouseEvent) => void
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

function CategoryIcon({
  category
}: {
  category: CardThumbnailProps["category"]
}) {
  if (!category) return null
  return (
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
  )
}

export function CardThumbnail(props: CardThumbnailProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-full aspect-square",
    lg: "w-full h-48"
  }
  const size = props.size || "md"

  return (
    <div
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      className={`relative overflow-hidden rounded-lg group card-thumbnail-container ${sizeClasses[size]} ${props.className || ""}`}>
      <CategoryIcon category={props.category} />
      <CardThumbnailImages
        imageUrl={props.imageUrl}
        thumbnailImages={props.thumbnailImages}
        alt={props.alt}
      />
      <RarityBadge tier={props.tier} className="absolute top-1 right-1" />
      {props.usageCount !== undefined && (
        <div
          data-testid="usage-count-badge"
          className="absolute bottom-1.5 left-1.5 bg-slate-900/60 border border-white/20 text-white rounded px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-[2px] shadow-md z-10 select-none pointer-events-none">
          {props.usageCount} uses
        </div>
      )}
      <CardThumbnailActions
        isPinned={props.isPinned}
        onPinClick={props.onPinClick}
        onQuickSendClick={props.onQuickSendClick}
        onDeleteClick={props.onDeleteClick}
        onInjectClick={props.onInjectClick}
        onEditClick={props.onEditClick}
        onShareClick={props.onShareClick}
      />
    </div>
  )
}
