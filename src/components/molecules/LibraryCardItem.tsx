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
  cardSlotThemeClass?: string
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

export function setupDragStart(e: React.DragEvent, card: StyleCard) {
  e.dataTransfer.setData(
    "text/plain",
    buildPromptString(card.promptSegments, card.parameters)
  )
  e.dataTransfer.setData("cardId", card.id)
}

export function handleCardClickHelper(
  e: React.MouseEvent,
  card: StyleCard,
  isEasyMode: boolean,
  togglePin: (card: StyleCard, e: React.MouseEvent) => void,
  advanceIfStep: (step: string) => void,
  onOpenSimpleWorkbench?: (card: StyleCard) => void
) {
  if (isEasyMode) {
    onOpenSimpleWorkbench?.(card)
  } else {
    togglePin(card, e)
    advanceIfStep("card-to-hand")
  }
}

export function LibraryCardItem(props: LibraryCardItemProps) {
  const config = RARITY_CONFIG[props.card.tier]
  const cardCategory = props.categories.find(
    (c) => c.id === props.card.category
  )

  return (
    <div
      data-tutorial={props.idx === 0 ? "library-card" : undefined}
      onClick={(e) =>
        handleCardClickHelper(
          e,
          props.card,
          props.isEasyMode,
          props.togglePin,
          props.advanceIfStep,
          props.onOpenSimpleWorkbench
        )
      }
      className={`group bg-white border-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98] ${
        props.cardSlotThemeClass
          ? props.cardSlotThemeClass
          : `${config?.borderClass || "border-slate-200"} ${config?.glowClass || ""}`
      }`}>
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
        onDragStart={(e) => setupDragStart(e, props.card)}
      />
      <CardFooter
        name={props.card.name}
        borderClass={config.borderClass}
        bgClass={config.bgClass}
      />
    </div>
  )
}
