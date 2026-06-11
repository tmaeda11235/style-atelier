import React from "react"

import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { CardThumbnail } from "./CardThumbnail"

interface LibraryCardItemProps {
  card: StyleCard
  idx: number
  isEasyMode: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
  togglePin: (card: StyleCard, e: React.MouseEvent) => void
  advanceIfStep: (step: string) => void
  onOpenDetailCard: (card: StyleCard) => void
  handleCardClick: (card: StyleCard) => void
  setSharingCard: (card: StyleCard | null) => void
  categories: Array<{ id: string; name: string }>
  onQuickSend?: (card: StyleCard, e: React.MouseEvent) => void
}

const CardFooter = ({
  name,
  borderClass,
  bgClass
}: {
  name: string
  borderClass: string
  bgClass: string
}) => (
  <div className={`p-2 border-t ${borderClass} bg-opacity-5 ${bgClass}`}>
    <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
  </div>
)

interface LibraryCardThumbnailProps {
  card: StyleCard
  cardCategory?: { id: string; name: string }
  onPinClick: ((e: React.MouseEvent) => void) | undefined
  onQuickSendClick: ((e: React.MouseEvent) => void) | undefined
  onEditClick: (card: StyleCard) => void
  onInjectClick: (card: StyleCard) => void
  onShareClick: (card: StyleCard) => void
  onDragStart: (e: React.DragEvent) => void
}

function LibraryCardThumbnail({
  card,
  cardCategory,
  onPinClick,
  onQuickSendClick,
  onEditClick,
  onInjectClick,
  onShareClick,
  onDragStart
}: LibraryCardThumbnailProps) {
  return (
    <CardThumbnail
      imageUrl={card.thumbnailData}
      thumbnailImages={card.selectedThumbnails}
      alt={card.name}
      tier={card.tier}
      isPinned={card.isPinned}
      usageCount={card.usageCount}
      onPinClick={onPinClick}
      onQuickSendClick={onQuickSendClick}
      onEditClick={(e) => {
        e.stopPropagation()
        onEditClick(card)
      }}
      onInjectClick={(e) => {
        e.stopPropagation()
        onInjectClick(card)
      }}
      onShareClick={(e) => {
        e.stopPropagation()
        onShareClick(card)
      }}
      category={cardCategory}
      draggable={true}
      onDragStart={onDragStart}
    />
  )
}

export function LibraryCardItem(props: LibraryCardItemProps) {
  const config = RARITY_CONFIG[props.card.tier]
  const cardCategory = props.categories.find(
    (c) => c.id === props.card.category
  )

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "text/plain",
      buildPromptString(props.card.promptSegments, props.card.parameters)
    )
    e.dataTransfer.setData("cardId", props.card.id)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (props.isEasyMode) {
      props.onOpenSimpleWorkbench?.(props.card)
    } else {
      props.togglePin(props.card, e)
      props.advanceIfStep("card-to-hand")
    }
  }

  return (
    <div
      data-tutorial={props.idx === 0 ? "library-card" : undefined}
      onClick={handleClick}
      className={`group bg-white border-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-md active:scale-[0.98] ${
        config?.borderClass || "border-slate-200"
      } ${config?.glowClass || ""}`}>
      <LibraryCardThumbnail
        card={props.card}
        cardCategory={cardCategory}
        onPinClick={
          props.isEasyMode ? undefined : (e) => props.togglePin(props.card, e)
        }
        onQuickSendClick={
          props.isEasyMode || !props.onQuickSend
            ? undefined
            : (e) => {
                e.stopPropagation()
                props.onQuickSend?.(props.card, e)
              }
        }
        onEditClick={props.onOpenDetailCard}
        onInjectClick={props.handleCardClick}
        onShareClick={props.setSharingCard}
        onDragStart={handleDragStart}
      />
      <CardFooter
        name={props.card.name}
        borderClass={config.borderClass}
        bgClass={config.bgClass}
      />
    </div>
  )
}
